#!/usr/bin/env node
/**
 * scripts/classify-backup-to-canonical.mjs
 *
 * FAZ 1 — Backup'tan Canonical'a LLM-Based Classifier
 *
 * AMAÇ:
 *   backup_20260422_products (43,176 satır) ürünlerini Gemini ile
 *   sınıflandır, brand temizle, model_family çıkar, kategori ata,
 *   sonra aktif products tablosuna ekle.
 *
 * AKIŞ:
 *   1. Backup'tan batch al (henüz işlenmemiş, products'ta yok)
 *   2. Her ürün için Gemini'ye sor (kategori + brand + model + confidence)
 *   3. Validate (kategori gerçekten var mı, confidence yeterli mi)
 *   4. products tablosuna upsert (slug çakışırsa skip)
 *   5. agent_decisions'a log
 *   6. Resume: kaldığı yerden devam (idempotent)
 *
 * KULLANIM:
 *   node --env-file=.env.local scripts/classify-backup-to-canonical.mjs
 *   node --env-file=.env.local scripts/classify-backup-to-canonical.mjs --limit 100
 *   node --env-file=.env.local scripts/classify-backup-to-canonical.mjs --dry-run
 *   node --env-file=.env.local scripts/classify-backup-to-canonical.mjs --min-confidence 0.6
 *
 * RATE LIMIT:
 *   Free tier 1500 RPD, güvenli RPM=10 (model'e göre değişir)
 *   ~43K ürün × 1 LLM call = ~29 gün (free tier'da)
 *   Multi-key veya paid tier ile daha hızlı olabilir
 *
 * MULTI-MODEL FALLBACK CHAIN:
 *   gemini-flash-lite-latest (primary, hızlı, ucuz)
 *   gemini-2.0-flash (fallback)
 *
 * NOT: gemma-3-27b-it kaldırıldı — JSON mode desteklemiyor (400 errors).
 * Her çağrıda fail edip rate-limit harcıyordu.
 *
 * BRAND POLICY: AGRESİF
 *   Gemini her ürün için brand'i de doğrular/düzeltir.
 *   Backup'taki kirli brand'ler (Galaxy, Orjinal, Color, Hiking vb.)
 *   gerçek brand ile değiştirilir.
 */

import { createClient } from "@supabase/supabase-js";

// ============================================================================
// Config
// ============================================================================

const BATCH_SIZE = 50;          // Her batch'te kaç ürün
const RPM_LIMIT = 10;           // Dakikada max çağrı
const MIN_CONFIDENCE = 0.5;     // Bu altı reddet
const PROGRESS_INTERVAL = 10;   // Her N üründe progress log

// Model fallback chain
const MODEL_CHAIN = [
  { name: "gemini-flash-lite-latest", maxRetries: 2 },
  { name: "gemini-2.0-flash", maxRetries: 1 },
  // gemma-3-27b-it kaldırıldı: JSON mode desteklemiyor, 400 errors
];

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ============================================================================
// CLI args
// ============================================================================

const args = process.argv.slice(2);
const argLimit = parseInt(getArg("--limit", "0"), 10);
const argDryRun = args.includes("--dry-run");
const argMinConfidence = parseFloat(getArg("--min-confidence", String(MIN_CONFIDENCE)));
const argResume = !args.includes("--no-resume");

function getArg(flag, defaultVal) {
  const idx = args.indexOf(flag);
  if (idx >= 0 && idx + 1 < args.length) return args[idx + 1];
  return defaultVal;
}

// ============================================================================
// Rate limiter
// ============================================================================

const callTimestamps = [];

async function rateLimit() {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  while (callTimestamps.length > 0 && callTimestamps[0] < oneMinuteAgo) {
    callTimestamps.shift();
  }
  if (callTimestamps.length >= RPM_LIMIT) {
    const waitMs = callTimestamps[0] + 60000 - now + 100;
    console.log(`  [rate-limit] ${(waitMs/1000).toFixed(1)}s bekle...`);
    await new Promise(r => setTimeout(r, waitMs));
    return rateLimit();
  }
  callTimestamps.push(now);
}

// ============================================================================
// Categories cache
// ============================================================================

let _categories = null;

async function loadCategories() {
  if (_categories) return _categories;
  const { data, error } = await sb
    .from("categories")
    .select("id, slug, name, parent_id, is_leaf")
    .eq("is_active", true);
  if (error) throw new Error(`Categories: ${error.message}`);
  _categories = data;
  return data;
}

function buildCategoryTaxonomyForPrompt(categories) {
  // Sadece leaf kategorileri prompt'a ver, hierarchical yapı kısa kalsın
  const leafs = categories.filter(c => c.is_leaf);
  return leafs.map(c => `- ${c.slug}: ${c.name}`).join("\n");
}

// ============================================================================
// Gemini call
// ============================================================================

async function callGemini(model, prompt) {
  await rateLimit();
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,        // Deterministik
      maxOutputTokens: 400,
      responseMimeType: "application/json",
    },
  };
  
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`${model} ${res.status}: ${errText.slice(0, 200)}`);
  }
  
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error(`${model}: Empty response`);
  
  return text;
}

async function callGeminiWithFallback(prompt) {
  let lastError = null;
  for (const { name, maxRetries } of MODEL_CHAIN) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const text = await callGemini(name, prompt);
        return { text, model: name };
      } catch (err) {
        lastError = err;
        // 429 (rate limit) → bekle, retry
        if (String(err).includes("429")) {
          await new Promise(r => setTimeout(r, 5000 * (attempt + 1)));
          continue;
        }
        // 5xx → retry
        if (/50\d/.test(String(err))) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        // Diğer hatalar: sonraki modele geç
        break;
      }
    }
  }
  throw lastError || new Error("All models failed");
}

// ============================================================================
// Prompt
// ============================================================================

const SYSTEM_INSTRUCTIONS = `Sen bir ürün sınıflandırma asistanısın. Türkçe e-ticaret sitelerinden çekilen 
ürün başlıklarını analiz edip yapısal veri çıkarıyorsun.

Görevin: Ürün için doğru kategori, marka, model ailesi, varyant bilgilerini çıkarmak.

ÖNEMLİ KURALLAR:
- Kategori MUTLAKA verilen taksonomiden seç. Listede olmayanı seçme.
- Brand: GERÇEK üretici markası (Apple, Samsung, Lenovo, vs.)
  YANLIŞ: "Galaxy" (model adı), "Orjinal" (sıfat), "Color" (özellik), "Hiking" (kategori)
  DOĞRU: Title'dan gerçek üretici markasını çıkar
- model_family: Ana ürün ailesi adı (iPhone 15, Galaxy S24, vs.). Genel kelime DEĞİL.
  YANLIŞ: "Ayakkabı", "Ekran Koruyucu", "Kişiye Özel"
  DOĞRU: "Air Force 1", "iPhone 15", null (eğer model belli değilse)
- variant_color: Renk varsa Türkçe (Siyah, Beyaz, Mavi). Birden fazlaysa virgülle.
- variant_storage: Depolama varsa "256GB" formatında.
- confidence: 0-1 arası, ne kadar emin olduğun.

Yanıtı SADECE JSON olarak ver, başka açıklama yapma.`;

function buildPrompt(product, categoryTaxonomy) {
  return `${SYSTEM_INSTRUCTIONS}

KATEGORİLER:
${categoryTaxonomy}

ÜRÜN:
Title: ${product.title}
Mevcut brand: ${product.brand || "(yok)"}
Mevcut category_id: ${product.category_id || "(yok)"}

Bu ürün için JSON çıktı ver:
{
  "category_slug": "akilli-telefon",
  "brand": "Apple",
  "model_family": "iPhone 15",
  "variant_color": "Siyah",
  "variant_storage": "256GB",
  "confidence": 0.95,
  "reasoning": "kısa açıklama"
}

Eğer kategori belirsizse veya ürün anlamsızsa: confidence < 0.4 ver.`;
}

// ============================================================================
// Validate Gemini response
// ============================================================================

function parseAndValidate(text, categories, product) {
  let parsed;
  try {
    // JSON mode'dayız ama yine de güvenlik için parse
    parsed = JSON.parse(text);
  } catch {
    // Bazen LLM markdown ile sarıyor
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return { valid: false, reason: "no_json" };
    try { parsed = JSON.parse(match[0]); }
    catch { return { valid: false, reason: "invalid_json" }; }
  }
  
  // Kategori validate (gerçekten var mı?)
  const category = categories.find(c => c.slug === parsed.category_slug);
  if (!category) {
    return { valid: false, reason: "unknown_category", parsed };
  }
  if (!category.is_leaf) {
    return { valid: false, reason: "not_leaf_category", parsed };
  }
  
  // Confidence threshold
  const confidence = Number(parsed.confidence) || 0;
  if (confidence < argMinConfidence) {
    return { valid: false, reason: "low_confidence", parsed, confidence };
  }
  
  // Brand boş olamaz (varsa)
  if (parsed.brand && typeof parsed.brand !== "string") {
    return { valid: false, reason: "invalid_brand", parsed };
  }
  
  return {
    valid: true,
    data: {
      category_id: category.id,
      category_slug: category.slug,
      brand: parsed.brand || null,
      model_family: parsed.model_family || null,
      variant_color: parsed.variant_color || null,
      variant_storage: parsed.variant_storage || null,
      confidence,
      reasoning: parsed.reasoning || null,
    },
  };
}

// ============================================================================
// Slug generation (duplicate kontrolü için)
// ============================================================================

function makeSlug(title, brand) {
  const base = (brand ? brand + " " : "") + title;
  return base
    .toLowerCase()
    .replace(/[ğ]/g, "g").replace(/[ü]/g, "u").replace(/[ş]/g, "s")
    .replace(/[ı]/g, "i").replace(/[ö]/g, "o").replace(/[ç]/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

// ============================================================================
// Already processed check (resume support)
// ============================================================================

async function getProcessedBackupIds() {
  // agent_decisions'tan bu script'in işlediği backup ID'lerini al
  const { data, error } = await sb
    .from("agent_decisions")
    .select("input_data")
    .eq("agent_name", "faz1-classifier")
    .limit(50000); // safety
  
  if (error) {
    console.warn("Resume check failed:", error.message);
    return new Set();
  }
  
  const ids = new Set();
  for (const r of data || []) {
    const id = r.input_data?.backup_id;
    if (id) ids.add(id);
  }
  return ids;
}

// ============================================================================
// Main loop
// ============================================================================

async function main() {
  console.log("=== FAZ 1 — Backup'tan Canonical'a Classifier ===");
  console.log(`Dry run: ${argDryRun}`);
  console.log(`Min confidence: ${argMinConfidence}`);
  console.log(`Limit: ${argLimit || "yok (tümü)"}`);
  console.log(`Resume: ${argResume}`);
  console.log("");
  
  // Categories yükle
  console.log("Categories yükleniyor...");
  const categories = await loadCategories();
  const taxonomy = buildCategoryTaxonomyForPrompt(categories);
  console.log(`  ${categories.length} kategori (${categories.filter(c => c.is_leaf).length} leaf)`);
  console.log("");
  
  // Resume: zaten işlenmiş ID'leri al
  let processedIds = new Set();
  if (argResume) {
    console.log("Resume kontrolü...");
    processedIds = await getProcessedBackupIds();
    console.log(`  Daha önce işlenmiş: ${processedIds.size}`);
    console.log("");
  }
  
  // Stats
  const stats = {
    total: 0,
    success: 0,
    skipped_processed: 0,
    skipped_low_confidence: 0,
    skipped_invalid: 0,
    skipped_duplicate: 0,
    failed: 0,
    elapsed_ms: 0,
  };
  
  const startTime = Date.now();
  let offset = 0;
  
  while (true) {
    if (argLimit > 0 && stats.total >= argLimit) {
      console.log(`Limit (${argLimit}) ulaşıldı, duruyor.`);
      break;
    }
    
    // Batch al
    const { data: batch, error } = await sb
      .from("backup_20260422_products")
      .select("id, title, brand, category_id, specs, image_url, source, source_url, model_code, model_family, variant_storage, variant_color, description")
      .order("id", { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);
    
    if (error) {
      console.error("Batch fetch error:", error.message);
      break;
    }
    
    if (!batch || batch.length === 0) {
      console.log("Tüm batch'ler işlendi.");
      break;
    }
    
    console.log(`\n--- Batch (offset ${offset}, ${batch.length} ürün) ---`);
    
    for (const product of batch) {
      stats.total++;
      
      // Resume kontrolü
      if (processedIds.has(product.id)) {
        stats.skipped_processed++;
        continue;
      }
      
      // Gemini call
      let llmResult;
      try {
        const prompt = buildPrompt(product, taxonomy);
        const response = await callGeminiWithFallback(prompt);
        llmResult = parseAndValidate(response.text, categories, product);
      } catch (err) {
        console.error(`  ✗ ${product.id}: LLM call failed - ${err.message}`);
        stats.failed++;
        continue;
      }
      
      // Invalid → log + skip
      if (!llmResult.valid) {
        if (llmResult.reason === "low_confidence") {
          stats.skipped_low_confidence++;
        } else {
          stats.skipped_invalid++;
        }
        
        if (!argDryRun) {
          await sb.from("agent_decisions").insert({
            agent_name: "faz1-classifier",
            input_data: { backup_id: product.id, title: product.title?.slice(0, 100) },
            output_data: { reason: llmResult.reason, parsed: llmResult.parsed },
            method: "rejected",
            confidence: llmResult.confidence || 0,
          });
        }
        continue;
      }
      
      // Duplicate kontrolü (slug bazlı)
      const slug = makeSlug(product.title, llmResult.data.brand);
      const { data: existing } = await sb
        .from("products")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      
      if (existing) {
        stats.skipped_duplicate++;
        continue;
      }
      
      // Canonical'a yaz
      if (!argDryRun) {
        const insertData = {
          title: product.title,
          slug,
          brand: llmResult.data.brand,
          category_id: llmResult.data.category_id,
          description: product.description,
          specs: product.specs,
          image_url: product.image_url,
          model_code: product.model_code,
          model_family: llmResult.data.model_family,
          variant_storage: llmResult.data.variant_storage,
          variant_color: llmResult.data.variant_color,
          is_active: true,
          // Audit alanları (Faz 1)
          classified_at: new Date().toISOString(),
          classified_by: "faz1-classifier",
          quality_score: llmResult.data.confidence,
          // embedding NULL — sonra backfill-embeddings.mjs ile doldurulacak
        };
        
        const { error: insertErr } = await sb
          .from("products")
          .insert(insertData);
        
        if (insertErr) {
          // Slug çakışma vs.
          if (insertErr.message.includes("duplicate") || insertErr.code === "23505") {
            stats.skipped_duplicate++;
            continue;
          }
          console.error(`  ✗ ${product.id}: insert failed - ${insertErr.message}`);
          stats.failed++;
          continue;
        }
        
        await sb.from("agent_decisions").insert({
          agent_name: "faz1-classifier",
          input_data: { backup_id: product.id, title: product.title?.slice(0, 100) },
          output_data: { ...llmResult.data, slug },
          method: "accepted",
          confidence: llmResult.data.confidence,
        });
      }
      
      stats.success++;
      
      // Progress log
      if (stats.total % PROGRESS_INTERVAL === 0) {
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = stats.total / elapsed;
        console.log(`  [${stats.total}] ✓${stats.success} ✗${stats.failed} skip:${stats.skipped_processed + stats.skipped_low_confidence + stats.skipped_invalid + stats.skipped_duplicate} | ${rate.toFixed(1)}/sn`);
      }
    }
    
    offset += BATCH_SIZE;
  }
  
  stats.elapsed_ms = Date.now() - startTime;
  
  console.log("\n=== TAMAMLANDI ===");
  console.log(`Toplam:                ${stats.total}`);
  console.log(`Başarılı (eklendi):    ${stats.success}`);
  console.log(`Atlandı (zaten var):   ${stats.skipped_processed}`);
  console.log(`Atlandı (düşük conf):  ${stats.skipped_low_confidence}`);
  console.log(`Atlandı (invalid):     ${stats.skipped_invalid}`);
  console.log(`Atlandı (duplicate):   ${stats.skipped_duplicate}`);
  console.log(`Başarısız:             ${stats.failed}`);
  console.log(`Süre:                  ${(stats.elapsed_ms / 1000 / 60).toFixed(1)} dk`);
  
  if (argDryRun) {
    console.log("\n⚠ DRY RUN — Hiçbir veri yazılmadı.");
  }
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
