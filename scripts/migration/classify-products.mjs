// =============================================================================
// scripts/migration/classify-products.mjs
// Batch Product Classifier — backup'tan ürünleri alıp yeni yapıya işler
//
// AKIŞ:
//   1. backup_20260422_products'tan ürünleri oku (batched)
//   2. Her ürünü classifier pipeline'dan geçir (cache → Gemini → log)
//   3. products tablosuna canonical insert (dedup)
//   4. listings tablosuna fiyat bağla (backup_20260422_prices'tan)
//
// KULLANIM:
//   # DRY-RUN (sadece 50 ürün, DB'ye yazma)
//   node --env-file=.env.local scripts/migration/classify-products.mjs --dry-run --limit=50
//
//   # Faz 1 (elektronik öncelikli, sınırlı)
//   node --env-file=.env.local scripts/migration/classify-products.mjs --faz=1
//
//   # Tam batch
//   node --env-file=.env.local scripts/migration/classify-products.mjs --all
//
// PROGRESS:
//   Her 10 üründe bir konsola yazar (hız, kalan, ETA)
// =============================================================================

import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { createHash } from "crypto";

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const LIMIT = parseInt(args.find(a => a.startsWith("--limit="))?.split("=")[1] ?? "0") || null;
const FAZ = parseInt(args.find(a => a.startsWith("--faz="))?.split("=")[1] ?? "0") || null;
const ALL = args.includes("--all");

if (!DRY_RUN && !FAZ && !ALL) {
  console.error("HATA: --dry-run, --faz=1|2, veya --all kullan");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Env kontrol
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

for (const [name, val] of [
  ["NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL],
  ["SUPABASE_SERVICE_ROLE_KEY", SERVICE_KEY],
  ["GEMINI_API_KEY", GEMINI_KEY],
]) {
  if (!val) {
    console.error(`HATA: ${name} tanımlı değil`);
    process.exit(1);
  }
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const genAI = new GoogleGenerativeAI(GEMINI_KEY);

// ---------------------------------------------------------------------------
// Classification konfigürasyonu
// ---------------------------------------------------------------------------

// Model fallback zinciri — Gemini ailesi (native JSON) + Gemma fallback (text + extractJSON)
// Öncelik: kaliteli+kısıtlı → bol+daha az kaliteli
const LIMITS = {
  "gemini-flash-lite-latest": { rpm: 13, rpd: 450 },
  "gemini-2.0-flash":         { rpm: 13, rpd: 180 },
  "gemini-2.5-flash-lite":    { rpm: 9,  rpd: 18 },
  "gemma-3-27b-it":           { rpm: 28, rpd: 13000 },
};
const MODEL_CHAIN = Object.keys(LIMITS);

// Runtime kullanım sayacı — bu run içinde her modele kaç istek attık
const usageCount = new Map();
let currentModelIdx = 0;

// Ardışık 429 sayacı — hesabı korumak için threshold'da durdur
let consecutive429 = 0;
const MAX_CONSECUTIVE_429 = 3;

// Faz 1 kategorileri — ücretli (hızlı)
const FAZ_1_ROOT_SLUGS = ["elektronik", "beyaz-esya", "kucuk-ev-aletleri"];

// Rate limiting — tüm modeller Gemini, en yavaş limitin altında kal
const DELAY_BETWEEN_REQUESTS_MS = 4700;

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,;:!?()'"]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .trim();
}

function hashTitle(title) {
  return createHash("sha256").update(normalizeTitle(title)).digest("hex").substring(0, 32);
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u")
    .replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 80);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  return `${h}s ${m % 60}d ${s % 60}sn`;
}

// ---------------------------------------------------------------------------
// Kategorileri yükle
// ---------------------------------------------------------------------------

async function loadCategories(faz = null) {
  let query = sb
    .from("categories")
    .select("id, slug, name, keywords, exclude_keywords, related_brands, parent_id")
    .eq("is_active", true)
    .eq("is_leaf", true);

  const { data, error } = await query;
  if (error) throw new Error(`Kategori yüklenemedi: ${error.message}`);

  // Faz 1 filtreleme — sadece elektronik/beyaz-esya/kucuk-ev-aletleri altındakiler
  if (faz === 1) {
    // Önce root ID'leri al
    const { data: roots } = await sb
      .from("categories")
      .select("id")
      .in("slug", FAZ_1_ROOT_SLUGS);

    const rootIds = new Set((roots ?? []).map(r => r.id));
    return (data ?? []).filter(c => rootIds.has(c.parent_id));
  }

  return data ?? [];
}

// Ürünleri yükle — Faz 1'de keyword ile ön-filtre uygulanır (gereksiz Gemini çağrısı azaltmak için)
// Supabase server max-rows = 1000 olduğundan 1000'lik chunk'larla pagination yapıyoruz
async function loadProductsForFaz(fazArg, limitArg) {
  const FAZ_1_KEYWORDS = [
    "telefon", "iphone", "galaxy", "samsung", "xiaomi", "huawei",
    "laptop", "notebook", "macbook", "tablet", "ipad",
    "tv", "televizyon", "monitor", "monitör",
    "kulaklık", "hoparlör", "kamera", "drone",
    "akıllı saat", "watch", "fitbit",
    "playstation", "xbox", "nintendo", "konsol",
    "buzdolabı", "çamaşır", "bulaşık", "fırın", "ocak", "mikrodalga",
    "kurutma", "klima", "aspiratör", "davlumbaz",
    "süpürge", "kahve", "airfryer", "fritöz", "tost",
    "ütü", "blender", "mikser", "saç kurutma", "saç düzleştirici",
    "tıraş", "epilatör", "diş fırçası",
  ];

  const applyFilters = (q) => {
    if (fazArg === 1 && !limitArg) {
      const orClauses = FAZ_1_KEYWORDS.map(kw => `title.ilike.%${kw}%`).join(",");
      q = q.or(orClauses);
    }
    return q;
  };

  // Eğer limit varsa tek seferde çek
  if (limitArg) {
    const q = applyFilters(sb.from("backup_20260422_products").select("*")).limit(limitArg);
    const { data, error } = await q;
    if (error) throw new Error(`Ürün yüklenemedi: ${error.message}`);
    return data ?? [];
  }

  // Limit yoksa → pagination ile tümünü çek (1000'lik batch)
  const PAGE_SIZE = 1000;
  const all = [];
  let offset = 0;
  while (true) {
    const q = applyFilters(sb.from("backup_20260422_products").select("*"))
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    const { data, error } = await q;
    if (error) throw new Error(`Ürün yüklenemedi (offset ${offset}): ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
    console.log(`  ...pagination: ${all.length} ürün yüklendi (devam ediyor)`);
  }
  return all;
}

// ---------------------------------------------------------------------------
// Gemini ile sınıflandır
// ---------------------------------------------------------------------------

function buildPrompt(categories) {
  const list = categories
    .map(c => {
      const kw = c.keywords?.slice(0, 5).join(", ") ?? "";
      return `- ${c.slug} (${c.name})${kw ? " — " + kw : ""}`;
    })
    .join("\n");

  return `Sen birtavsiye.net'in ürün sınıflandırma uzmanısın. Türk e-ticaret ürünlerini KESIN kategorilere ayırırsın.

KATEGORİLER (SADECE BUNLARDAN SEÇ):
${list}
- uncategorized (yukarıdakilerden hiçbiri uymuyorsa)
- rejected (2. el, outlet, defolu, yenilenmiş, hasarlı)

KRITIK KURALLAR:

1. ÜRÜN TÜRÜ ÖNCELİKLI:
   - "Lenovo 110-15ISK Batarya" → bilgisayar-bilesenleri (laptop bataryası, telefon değil!)
   - "iPhone 15 Pil" → telefon-yedek-parca (telefon bataryası)
   - "Samsung Galaxy S8 Ekran Koruyucu" → ekran-koruyucu
   - "GoPro için Ekran Koruyucu" → ekran-koruyucu
   - "Macbook için Şarj Kablosu" → sarj-kablo

2. MODEL KODLARI KATEGORI İPUCU:
   - "80UD", "110-15ISK" → LAPTOP model kodu (bilgisayar-bilesenleri veya laptop)
   - "A3089", "SM-G960" → TELEFON model kodu
   - "NVR-8032" → GÜVENLİK KAMERASI model kodu
   Model koduna dikkat et, ürün türünü belirler.

3. AKSESUAR VS ANA ÜRÜN:
   - "kılıf", "koruyucu", "şarj", "kablo", "tutucu", "stand", "için", "uyumlu" → AKSESUAR kategorisi
   - Ana ürün kategorisine ATMA
   - Örnek: "iPhone için kılıf" → telefon-kilifi (akilli-telefon değil!)

4. BRAND NORMALIZATION:
   - "apple" → "Apple" (kanonik)
   - "Samsung Samsung" → "Samsung"
   - "Space Apple" → "Apple" (space generic kelime, filtreleyin)
   - Generic kelime (Büyük, Yeni, Super) brand DEĞİL → brand: null
   - Sadece listedeki gerçek markaları kullan, uydurma

5. VARYANT ÇIKARMA:
   - "128GB", "256GB", "1TB" → variant_storage
   - "Siyah", "Beyaz", "Mavi" (renk) → variant_color
   - "S", "M", "L", "42", "44" (kıyafet beden) → variant_size

6. RED KRİTERLERİ:
   - "2. el", "2.el", "ikinci el", "kullanılmış" → rejected
   - "outlet", "defolu", "hasarlı", "teşhir", "yenilenmiş", "refurbished" → rejected
   - reject_reason'a hangi pattern eşleşti yaz

7. UNCATEGORIZED:
   - Emin değilsen → uncategorized (yanlış kategori verme!)
   - Cerrahi maske, ilaç, vitamin gibi ürünler → uncategorized
   - confidence 0.0

ÖRNEKLER:

Input: "Alfa %100 Deri Damatlık Erkek Ayakkabı 7 Cm Gizli Topuklu Bo"
Output: {
  "category_slug": "erkek-ayakkabi-klasik",
  "brand": "Alfa",
  "canonical_title": "Alfa Deri Damatlık Erkek Klasik Ayakkabı",
  "confidence": 0.9,
  "quality_score": 0.85
}

Input: "Lenovo 110-15ISK 80UD Batarya Lenovo Pil"
Output: {
  "category_slug": "bilgisayar-bilesenleri",
  "brand": "Lenovo",
  "model_family": "IdeaPad 110",
  "canonical_title": "Lenovo IdeaPad 110-15ISK 80UD Laptop Bataryası",
  "confidence": 0.95,
  "quality_score": 0.9
}

Input: "GoPro Hero 6 ile Uyumlu Darbe Emici Ekran Koruyucu"
Output: {
  "category_slug": "ekran-koruyucu",
  "brand": "GoPro",
  "canonical_title": "GoPro Hero 6 Uyumlu Darbe Emici Ekran Koruyucu",
  "confidence": 0.9,
  "quality_score": 0.85
}

Input: "Büyük Beden Çiçek Fiyonklu Taşlı Kapri Kollu Pamuklu Kışlık Kadın Bluz"
Output: {
  "category_slug": "kadin-giyim-ust",
  "brand": null,
  "canonical_title": "Büyük Beden Çiçek Fiyonklu Kapri Kollu Kadın Bluz",
  "variant_size": "Büyük Beden",
  "confidence": 0.85,
  "quality_score": 0.8
}

JSON ÇIKIŞ FORMATI:
{
  "category_slug": "seçilen slug",
  "brand": "kanonik marka veya null",
  "canonical_title": "temizlenmiş başlık",
  "model_family": "marka + model veya null",
  "variant_storage": "128GB veya null",
  "variant_color": "Siyah veya null",
  "variant_size": "M veya null",
  "confidence": 0.0-1.0,
  "quality_score": 0.0-1.0,
  "reject_reason": "red nedeni veya null"
}

Yukarıdaki kurallara UY, kategoriyi ürün TÜRÜNE göre seç (model koduna, "için" ifadesine dikkat et).`;
}

const SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    category_slug: { type: SchemaType.STRING },
    brand: { type: SchemaType.STRING },
    canonical_title: { type: SchemaType.STRING },
    model_family: { type: SchemaType.STRING, nullable: true },
    variant_storage: { type: SchemaType.STRING, nullable: true },
    variant_color: { type: SchemaType.STRING, nullable: true },
    confidence: { type: SchemaType.NUMBER },
    quality_score: { type: SchemaType.NUMBER },
    reject_reason: { type: SchemaType.STRING, nullable: true },
  },
  required: ["category_slug", "brand", "canonical_title", "confidence", "quality_score"],
};

// JSON extractor — markdown fence'li ya da serbest metindeki JSON'u ayıklar
// Gemini native JSON için gereksiz; Gemma gibi text-only modellerde çağrılır
function extractJSON(text) {
  // 1) ```json { ... } ``` fence
  const block = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (block) return JSON.parse(block[1]);
  // 2) Direkt JSON
  try { return JSON.parse(text); } catch {}
  // 3) İlk { ... } bloğunu al
  const match = text.match(/\{[\s\S]*?\}/);
  if (match) return JSON.parse(match[0]);
  throw new Error("No JSON: " + text.substring(0, 150));
}

// Mevcut modeli seç + kota aşıldıysa bir sonrakine ilerlet
function pickCurrentModel() {
  while (currentModelIdx < MODEL_CHAIN.length) {
    const name = MODEL_CHAIN[currentModelIdx];
    const limit = LIMITS[name];
    const used = usageCount.get(name) || 0;
    // Proactive switch: %90 kotaya yaklaştığında atla
    if (used >= Math.floor(limit.rpd * 0.9)) {
      console.log(`  [switch] ${name} kotası yaklaşık dolu (${used}/${limit.rpd}) → sonraki modele geç`);
      currentModelIdx++;
      continue;
    }
    return name;
  }
  return null; // Tüm modeller bitti
}

async function classifyWithGemini(input, systemPrompt) {
  const prompt = `ÜRÜN:
title: ${input.title}
brand (güvenilmez): ${input.brand ?? "-"}
source: ${input.source ?? "-"}

Sınıflandır.`;

  // Her ürün için model seçimi (quota'ya göre dinamik)
  while (true) {
    const modelName = pickCurrentModel();
    if (!modelName) throw new Error("Tüm modeller tükendi (kota + 404)");

    const isGemma = modelName.startsWith("gemma");

    // Gemma systemInstruction DESTEKLEMIYOR (400 "Developer instruction not enabled")
    // → systemPrompt'u user prompt'a prepend ediyoruz
    const finalPrompt = isGemma
      ? `${systemPrompt}\n\nCevabını SADECE JSON formatında ver, markdown veya açıklama ekleme.\n\n--- ÜRÜN ---\n${prompt}`
      : prompt;

    const modelConfig = {
      model: modelName,
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 512,
      },
    };
    // Gemini native JSON schema + systemInstruction destekliyor, Gemma desteklemiyor
    if (!isGemma) {
      modelConfig.systemInstruction = systemPrompt;
      modelConfig.generationConfig.responseMimeType = "application/json";
      modelConfig.generationConfig.responseSchema = SCHEMA;
    }

    const model = genAI.getGenerativeModel(modelConfig);

    const maxAttempts = 3;
    let lastErr = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await model.generateContent(finalPrompt);
        const text = result.response.text();
        const parsed = isGemma ? extractJSON(text) : JSON.parse(text);
        const usage = result.response.usageMetadata;
        usageCount.set(modelName, (usageCount.get(modelName) || 0) + 1);
        consecutive429 = 0; // Başarılı → ardışık 429 sayacı sıfırla
        return {
          data: parsed,
          tokens: (usage?.promptTokenCount ?? 0) + (usage?.candidatesTokenCount ?? 0),
          modelUsed: modelName,
        };
      } catch (e) {
        lastErr = e;
        const msg = e.message || String(e);

        // 400 capability issue (ör. Gemma "Developer instruction not enabled")
        // → model bu session'da kullanılamaz, blacklist + sıradaki
        if (/400/.test(msg) && /(Developer instruction|is not enabled|not supported)/i.test(msg)) {
          console.log(`  ${modelName} 400 capability issue: session'da blacklist (${msg.substring(0, 80)})`);
          currentModelIdx++;
          break;
        }

        // 429/quota → bu model kotaya takıldı, blacklist + sıradaki modele geç
        if (/429|RESOURCE_EXHAUSTED|quota/i.test(msg)) {
          consecutive429++;
          console.log(`  ${modelName} 429 aldı (ardışık ${consecutive429}/${MAX_CONSECUTIVE_429}), blacklist. Sıradaki modele geçiliyor.`);
          if (consecutive429 >= MAX_CONSECUTIVE_429) {
            console.log(`\n🔴 ARDIŞIK ${MAX_CONSECUTIVE_429} ADET 429. Script duruyor, hesabı koru.`);
            console.log("=== Son durum ===");
            console.log("Model kullanımı:", Object.fromEntries(usageCount));
            process.exit(1);
          }
          currentModelIdx++;
          break; // attempt loop'u kır, dış while'ta sonraki model seçilecek
        }

        // 404 → model adı hatalı, sıradaki modele geç
        if (/404|not found/i.test(msg)) {
          console.log(`  ${modelName} 404 (model bulunamadı). Sıradaki modele geçiliyor.`);
          currentModelIdx++;
          break;
        }

        // 503/504/UNAVAILABLE/overload → Google taraflı geçici yük. 10s bekle, aynı modelle tekrar
        if (/503|504|UNAVAILABLE|overload/i.test(msg) && attempt < maxAttempts) {
          console.log(`  ${modelName} 503/504 overload. 10 saniye bekle + yeniden dene (${attempt}/${maxAttempts}).`);
          await sleep(10000);
          continue;
        }

        // 500 → kısa sürede geçmesi muhtemel, 3s bekle
        if (/500/.test(msg) && attempt < maxAttempts) {
          await sleep(3000);
          continue;
        }

        // Non-retriable → throw
        throw e;
      }
    }
    // Bu noktaya düştüysek modelden switch olduk, while başa dön
    if (currentModelIdx >= MODEL_CHAIN.length) throw lastErr ?? new Error("modeller tükendi");
  }
}

// ---------------------------------------------------------------------------
// Cache check
// ---------------------------------------------------------------------------

async function checkCache(titleHash) {
  const { data } = await sb
    .from("categorization_cache")
    .select("*")
    .eq("title_hash", titleHash)
    .maybeSingle();
  return data;
}

async function upsertCache(titleHash, normalizedTitle, result) {
  await sb.from("categorization_cache").upsert(
    {
      title_hash: titleHash,
      normalized_title: normalizedTitle,
      brand: result.brand,
      category_slug: result.category_slug,
      model_family: result.model_family,
      variant_storage: result.variant_storage,
      variant_color: result.variant_color,
      confidence: result.confidence,
      method: "gemini",
    },
    { onConflict: "title_hash" }
  );
}

// ---------------------------------------------------------------------------
// Karar logla
// ---------------------------------------------------------------------------

async function logDecision(titleHash, input, output, method, latencyMs, tokens, modelUsed) {
  await sb.from("agent_decisions").insert({
    agent_name: "category-classifier",
    input_hash: titleHash,
    input_data: input,
    output_data: { ...output, _model: modelUsed ?? "unknown" },
    confidence: output.confidence ?? 0,
    method,
    latency_ms: latencyMs,
    tokens_used: tokens,
  });
}

// ---------------------------------------------------------------------------
// Canonical product'a yaz (dedup)
// ---------------------------------------------------------------------------

async function upsertCanonicalProduct(result, categoryId, originalProduct) {
  // Dedup key
  const dedupKey = {
    brand: result.brand,
    model_family: result.model_family ?? "",
    variant_storage: result.variant_storage ?? "",
    variant_color: result.variant_color ?? "",
  };

  // Var mı?
  let query = sb.from("products").select("id").eq("brand", dedupKey.brand).eq("is_active", true);

  if (dedupKey.model_family) query = query.eq("model_family", dedupKey.model_family);
  else query = query.is("model_family", null);

  if (dedupKey.variant_storage) query = query.eq("variant_storage", dedupKey.variant_storage);
  else query = query.is("variant_storage", null);

  if (dedupKey.variant_color) query = query.eq("variant_color", dedupKey.variant_color);
  else query = query.is("variant_color", null);

  const { data: existing } = await query.maybeSingle();

  if (existing) return { id: existing.id, created: false };

  // Yeni kayıt
  const slug = slugify(`${result.brand}-${result.model_family ?? ""}-${result.variant_storage ?? ""}-${result.variant_color ?? ""}`);

  const { data: newProduct, error } = await sb
    .from("products")
    .insert({
      title: result.canonical_title,
      slug: slug + "-" + Date.now().toString(36).substring(4), // unique suffix
      category_id: categoryId,
      brand: result.brand,
      model_family: result.model_family,
      variant_storage: result.variant_storage,
      variant_color: result.variant_color,
      image_url: originalProduct.image_url,
      images: originalProduct.images,
      specs: originalProduct.specs || {},
      description: originalProduct.description,
      icecat_id: originalProduct.icecat_id,
      // products.confidence kolonu yok — confidence'ı quality_score'a merge et
      quality_score: result.confidence > 0 ? result.confidence : result.quality_score,
      is_verified: result.confidence >= 0.9,
      classified_by: "gemini",
      classified_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) throw new Error(`Product insert failed: ${error.message}`);
  return { id: newProduct.id, created: true };
}

// ---------------------------------------------------------------------------
// Listing ekle (fiyat bilgisi backup'tan)
// ---------------------------------------------------------------------------

async function addListing(productId, originalProduct) {
  // Eski prices tablosundan fiyat bilgisini çek
  const { data: oldPrice } = await sb
    .from("backup_20260422_prices")
    .select("price, store_id, url, in_stock, affiliate_url")
    .eq("product_id", originalProduct.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!oldPrice) return null;

  // source, source_title vs bilgiler
  const source = originalProduct.source ?? "unknown";
  const sourceUrl = originalProduct.source_url ?? oldPrice.url ?? "";

  const { data: listing, error } = await sb
    .from("listings")
    .upsert(
      {
        product_id: productId,
        store_id: oldPrice.store_id,
        source: source,
        source_product_id: originalProduct.id, // eski UUID
        source_url: sourceUrl,
        source_title: originalProduct.title,
        price: oldPrice.price,
        in_stock: oldPrice.in_stock ?? true,
        affiliate_url: oldPrice.affiliate_url,
      },
      { onConflict: "source,source_product_id" }
    )
    .select("id")
    .maybeSingle();

  if (error && !error.message.includes("duplicate")) {
    console.warn(`Listing insert warning: ${error.message}`);
  }
  return listing?.id ?? null;
}

// ---------------------------------------------------------------------------
// Ürün işleme ana fonksiyonu
// ---------------------------------------------------------------------------

async function processProduct(product, categories, systemPrompt, categorySlugMap) {
  const titleHash = hashTitle(product.title);
  const normalizedTitle = normalizeTitle(product.title);
  const inputData = { title: product.title, brand: product.brand, source: product.source };
  const startTime = Date.now();

  // CACHE CHECK
  const cached = await checkCache(titleHash);
  if (cached) {
    const result = {
      category_slug: cached.category_slug,
      brand: cached.brand,
      canonical_title: cached.normalized_title,
      model_family: cached.model_family,
      variant_storage: cached.variant_storage,
      variant_color: cached.variant_color,
      confidence: cached.confidence,
      quality_score: 0.8,
    };
    await logDecision(titleHash, inputData, result, "cache", Date.now() - startTime, 0, "cache");
    // Cache hit sayacı
    await sb.from("categorization_cache").update({
      hit_count: (cached.hit_count ?? 0) + 1,
      last_hit: new Date().toISOString(),
    }).eq("id", cached.id);
    return { result, fromCache: true, tokens: 0 };
  }

  // GEMINI
  const { data: result, tokens, modelUsed } = await classifyWithGemini(
    { title: product.title, brand: product.brand, source: product.source },
    systemPrompt
  );
  const latencyMs = Date.now() - startTime;

  // Validate category
  if (!categorySlugMap.has(result.category_slug) && result.category_slug !== "uncategorized" && result.category_slug !== "rejected") {
    console.warn(`Invalid category "${result.category_slug}" → uncategorized`);
    result.category_slug = "uncategorized";
    result.confidence = 0;
  }

  await logDecision(titleHash, inputData, result, "gemini", latencyMs, tokens, modelUsed);

  // Cache'le (güvenilirse)
  if (result.confidence >= 0.7 && result.category_slug !== "uncategorized" && result.category_slug !== "rejected") {
    await upsertCache(titleHash, normalizedTitle, result);
  }

  return { result, fromCache: false, tokens, modelUsed };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=".repeat(60));
  console.log("BATCH PRODUCT CLASSIFIER");
  console.log("=".repeat(60));
  console.log(`Mode: ${DRY_RUN ? "DRY-RUN" : FAZ ? `FAZ ${FAZ}` : "ALL"}`);
  if (LIMIT) console.log(`Limit: ${LIMIT}`);
  console.log("");

  // Kategorileri yükle
  console.log("📂 Kategoriler yükleniyor...");
  const categories = await loadCategories(FAZ === 1 ? 1 : null);
  console.log(`  ${categories.length} leaf kategori yüklendi\n`);

  const categorySlugMap = new Map(categories.map(c => [c.slug, c.id]));
  const systemPrompt = buildPrompt(categories);

  // Ürünleri yükle
  console.log("📦 Ürünler yükleniyor (backup_20260422_products)...");
  const products = await loadProductsForFaz(FAZ, LIMIT);
  console.log(`  ${products.length} ürün yüklendi\n`);

  if (products.length === 0) {
    console.log("Ürün yok. Çıkılıyor.");
    return;
  }

  // Processing stats
  const stats = {
    total: products.length,
    processed: 0,
    cached: 0,
    gemini: 0,
    created: 0,
    dedup: 0,
    rejected: 0,
    uncategorized: 0,
    errors: 0,
    totalTokens: 0,
    startTime: Date.now(),
  };

  console.log("🚀 İşlem başlıyor...\n");

  for (const product of products) {
    try {
      const { result, fromCache, tokens, modelUsed } = await processProduct(
        product,
        categories,
        systemPrompt,
        categorySlugMap
      );

      stats.processed++;
      stats.totalTokens += tokens;
      if (fromCache) stats.cached++;
      else stats.gemini++;

      // Rejected ise products'a yazma
      if (result.category_slug === "rejected") {
        stats.rejected++;
      } else if (result.category_slug === "uncategorized") {
        stats.uncategorized++;
      } else if (!DRY_RUN) {
        // DB'ye yaz
        const categoryId = categorySlugMap.get(result.category_slug);
        if (!categoryId) {
          stats.uncategorized++;
        } else {
          const { id: productId, created } = await upsertCanonicalProduct(result, categoryId, product);
          if (created) stats.created++;
          else stats.dedup++;

          // Listing ekle
          await addListing(productId, product);
        }
      }

      // Progress — her 20 üründe bir
      if (stats.processed % 20 === 0 || stats.processed === stats.total) {
        const elapsed = Date.now() - stats.startTime;
        const rate = stats.processed / (elapsed / 1000);
        const remaining = (stats.total - stats.processed) / rate;
        console.log(
          `[${stats.processed}/${stats.total}] ` +
          `${rate.toFixed(1)} ürün/sn · ` +
          `cache: ${stats.cached} · gemini: ${stats.gemini} · ` +
          `yeni: ${stats.created} · dedup: ${stats.dedup} · ` +
          `red: ${stats.rejected} · ETA: ${formatDuration(remaining * 1000)}`
        );
      }

      // Rate limiting — model'e göre dinamik (Gemma hızlı, Gemini daha yavaş)
      if (!fromCache) {
        const delay = modelUsed?.startsWith("gemma") ? 2200 : 4700;
        await sleep(delay);
      }
    } catch (e) {
      stats.errors++;
      console.error(`  ✗ [${product.id}] ${product.title?.substring(0, 60)}: ${e.message?.substring(0, 200)}`);
      if (stats.errors >= 10) {
        console.error("\n🔴 10 hata birikti. Durduruyorum.");
        break;
      }
    }
  }

  // Final rapor
  const totalTime = Date.now() - stats.startTime;
  console.log("\n" + "=".repeat(60));
  console.log(DRY_RUN ? "DRY-RUN TAMAMLANDI" : "BATCH TAMAMLANDI");
  console.log("=".repeat(60));
  console.log(`Toplam ürün:      ${stats.total}`);
  console.log(`İşlenen:          ${stats.processed}`);
  console.log(`Cache hit:        ${stats.cached}`);
  console.log(`Gemini çağrısı:   ${stats.gemini}`);
  console.log(`Yeni ürün (canonical): ${stats.created}`);
  console.log(`Dedup (var olan): ${stats.dedup}`);
  console.log(`Reddedilen:       ${stats.rejected}`);
  console.log(`Uncategorized:    ${stats.uncategorized}`);
  console.log(`Hata:             ${stats.errors}`);
  console.log(`Toplam token:     ${stats.totalTokens.toLocaleString()}`);
  console.log(`Süre:             ${formatDuration(totalTime)}`);
  console.log(`Ortalama hız:     ${(stats.processed / (totalTime / 1000)).toFixed(1)} ürün/sn`);

  // Maliyet tahmini (Gemini 2.0 Flash: $0.075/1M input, $0.30/1M output)
  // Yaklaşık input:output = 3:1 diyelim
  const inputTokens = stats.totalTokens * 0.75;
  const outputTokens = stats.totalTokens * 0.25;
  const cost = (inputTokens / 1_000_000) * 0.075 + (outputTokens / 1_000_000) * 0.30;
  console.log(`Tahmini maliyet:  $${cost.toFixed(4)}`);

  if (DRY_RUN) {
    console.log("\n⚠️  DRY-RUN modunda DB'ye yazma yapılmadı.");
    console.log("Sonuçları onaylarsan: --faz=1 veya --all ile gerçek batch çalıştır.");
  }
}

main().catch(err => {
  console.error("\n🔴 FATAL:", err.message);
  console.error(err.stack);
  process.exit(1);
});
