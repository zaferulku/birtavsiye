/**
 * Intent Parser Prompt Template
 *
 * Llama 3.3 70B için yapılandırılmış niyet çıkarma prompt'u.
 *
 * Hedef: Kullanıcının Türkçe doğal dil mesajını ve KB bilgi chunklarını
 * alıp, DB araması için yapılandırılmış bir JSON niyet üretir.
 *
 * Model: NVIDIA NIM Llama 3.3 70B (primary), Groq Llama 70B (fallback)
 *
 * Prompt stratejisi:
 *   1. System prompt: rol + format kuralları
 *   2. User prompt: KB context + kullanıcı mesajı + şema örnş
 *   3. Response: Pure JSON (markdown yok)
 */

import { KNOWN_BRANDS_TR } from "../data/known-brands";

// ============================================================================
// Types
// ============================================================================

export type KnowledgeChunk = {
  source: string;
  title: string | null;
  topic: string | null;
  content: string;
  similarity: number;
};

export type StructuredIntent = {
  // Kategori (DB taksonomisiyle uyumlu olmalı)
  category_slug: string | null;

  // Semantik anahtar kelimeler (embedding/vector search için)
  semantic_keywords: string[];

  // Katı filtreler (JSONB @> kontrolü için)
  must_have_specs: Record<string, string[] | string | number>;

  // Tercih edilen (nice-to-have, skoring boost için)
  nice_to_have_specs: Record<string, string[] | string | number>;

  // Fiyat aralığı
  price_range: {
    min: number | null;
    max: number | null;
  };

  // Marka filtresi
  brand_filter: string[];

  // Parser'ın kendi güveni
  confidence: number;  // 0-1

  // Kısa açıklama (debug + LLM'in ne anladşnı görmek için)
  reasoning: string;

  // Özel durumlar
  is_too_vague: boolean;     // "bir şey öner" gibi netleştirici gerektiren
  is_off_topic: boolean;     // "saat kaç", "sen kimsin" gibi alakasız
};

// ============================================================================
// System prompt (LLM rolünü tanımlar)
// ============================================================================

export const INTENT_PARSER_SYSTEM_PROMPT = `Sen bir Türkçe e-ticaret arama asistanısın. Kullanıcının doğal dildeki ürün arama niyetini yapılandırılmış JSON'a çeviriyorsun.

GÖREV:
- Kullanıcı mesajını oku
- Verilen bilgi kaynaklarını (sözlük) kullan
- Standart JSON formatında niyet çıkar

KURALLAR:
- Sadece JSON döndür, açıklama yazma, markdown kullanma
- Bilmedşn/belirsiz alanlar için null veya boş array kullan
- category_slug mutlaka verilen taksonomiden seç veya null bırak
- Tahmin yapma ş emin değilsen confidence'ı düşük tut
- Türkçe kelimeleri İngilizce'ye çevirme (brand hariç)
- must_have ile nice_to_have ayrımı önemli: must_have kesin gereken, nice_to_have tercih

ÖZEL DURUMLAR:
- Çok genel sorgu ("bir şey öner") → is_too_vague: true
- Alakasız sorgu ("saat kaç") → is_off_topic: true
- Spesifik ürün adı → category_slug + brand + semantic_keywords doldur

KRİTİK KURAL — RENK VS KATEGORİ AYRIMI:
- "kahve" başlı başına bir kategori/ürün, RENK DEĞİL
- "kahverengi" = renk; "kahve" = ürün/kategori
- "kahve makinesi", "kahve çekirdeği", "filtre kahve" = kategori
- Renk olarak SADECE şunlar geçerlidir:
  beyaz, siyah, kırmızı, mavi, yeşil, mor, sarı, pembe, kahverengi,
  bej, bordo, gri, lacivert, turkuaz, krem, altın, gümüş, bronz, inox
- YANLIŞ: semantic_keywords'a "kahve" rengi olarak koyma
- DOĞRU: category_slug: "kahve" (veya alt-kategori), semantic_keywords: ["kahve"]

ÖNEMLİ VAGUE KURALI:
- Tek kelime kategori adı ("telefon", "laptop", "ayakkabı", "deodorant", "buzdolabı", "kulaklık")
  VAGUE DEĞİLDİR → kategori sorgusu olarak yorumla:
  * category_slug: ilgili kategori
  * semantic_keywords: [aynı kelime + ilgili kavramlar]
  * is_too_vague: false
- Sadece şunlar VAGUE'dir:
  * Tek kelime ama ürünle alakasız: "merhaba", "test", "evet", "hadi"
  * Çok soyut: "bir şey", "öneri", "yardım"
- Önceki konuşmayla anlam kazanan kısa mesaj VAGUE DEĞİLDİR:
  Örnek: önceki "telefon" → şimdi "Apple" → kombine: Apple telefon arama

ÇIKTI FORMATI:
{
  "category_slug": "string veya null",
  "semantic_keywords": ["kelime1", "kelime2"],
  "must_have_specs": {"field": ["value1", "value2"]},
  "nice_to_have_specs": {"field": ["value1"]},
  "price_range": {"min": null, "max": null},
  "brand_filter": [],
  "confidence": 0.0-1.0,
  "reasoning": "kısa açıklama",
  "is_too_vague": false,
  "is_off_topic": false
}`;

// ============================================================================
// User prompt builder
// ============================================================================

/**
 * Kullanıcıya gönderecşmiz prompt'u oluşturur.
 *
 * @param message Kullanıcı mesajı
 * @param knowledgeChunks KB'den gelen ilgili bilgi parçaları
 * @param categoryTaxonomy Geçerli kategori slug'larının listesi
 */
export function buildIntentParserPrompt(
  message: string,
  knowledgeChunks: KnowledgeChunk[],
  categoryTaxonomy: string[],
  conversationHistory: Array<{ role: string; content: string }> = [],
  exampleContext = "(ilgili örnek konuşma bulunamadı)",
  categoryKnowledgeNote: string | null = null
): string {
  const kbContext = formatKnowledgeContext(knowledgeChunks);
  const taxonomySample = formatTaxonomy(categoryTaxonomy);

  // Önceki konuşma context'i (proaktif sohbet için)
  const historyContext = conversationHistory.length > 0
    ? `\nÖNCEKİ KONUŞMA:\n${conversationHistory
        .map(m => `${m.role === 'user' ? 'Kullanıcı' : 'Sen'}: ${m.content}`)
        .join('\n')}\n`
    : '';

  return `GEÇERLİ KATEGORİLER (category_slug için bunlardan seç):
${taxonomySample}

BİLGİ KAYNAKLARI (konuyla ilgili Türkçe sözlük):
${kbContext}

${categoryKnowledgeNote ? `KATEGORI BILGI NOTU:\n${categoryKnowledgeNote}\n` : ""}

BENZER ÖRNEK KONUŞMALAR:
${exampleContext}
${historyContext}
YENİ KULLANICI MESAJI:
"${message}"

Önceki konuşmayı dikkate alarak kullanıcının niyetini çıkar. Eğer önceki
mesajlar bağlam veriyorsa (örn: "telefon" sonra "Apple"), bunu birleştir.

ÖRNEKLERİ NASIL KULLAN:
- Örneklerdeki kalıpları ezber gibi kopyalama; niyet mantığını çıkar.
- Kullanıcı daraltıyorsa "refine", filtre kaldırıyorsa/genişletiyorsa "broaden",
  önceki konuyu bırakıp yeni ürüne geçiyorsa "reset" mantığıyla düşün.
- "sort_only" durumunda kategori ve filtreleri koruyup sadece sıralama niyetini anla.

GÖREV:
Yukarıdaki bilgiyi kullanarak kullanıcının arama niyetini çıkar. Bilgi
kaynakları sana koku aileleri, moda desenleri gibi Türkçe domain bilgisini
sağlar ş kullanıcı "lavanta kokulu" dedşnde KB sana "lavanta çiçeksi
ailenin notasıdır" bilgisini verir.

ÖRNEK DÜŞÜNCE SÜRECİ:
- Kullanıcı: "lavanta kokulu şekerli deodorant"
- KB: "lavanta çiçeksi, vanilya tatlı oriental, şekerli = vanilya/tonka"
- şıktı: category_slug="kozmetik.deodorant", semantic_keywords=["lavanta",
  "vanilya", "çiçeksi", "oriental"], must_have={ana_notalar: ["lavanta"]},
  nice_to_have={ana_notalar: ["vanilya"]}

JSON cevabını ver:`;
}

/**
 * KB chunk'larını prompt'a uygun formatta string'e çevir.
 * Her chunk başlık + içerik özeti.
 */
function formatKnowledgeContext(chunks: KnowledgeChunk[]): string {
  if (chunks.length === 0) {
    return "(ilgili bilgi bulunamadı)";
  }

  return chunks
    .map((c, i) => {
      const title = c.title || c.topic || "Bilgi";
      // İçerş 500 karakterle sınırla (prompt kısa tutmak için)
      const content = c.content.length > 500
        ? c.content.slice(0, 497) + "..."
        : c.content;
      return `[${i + 1}] ${title}:\n${content}`;
    })
    .join("\n\n");
}

/**
 * Kategori taksonomisini prompt'a uygun formatta yaz.
 * Tüm 161 leaf'i listelemek uzun olur ş en yaygın 20-30'u yeter.
 */
function formatTaxonomy(categories: string[]): string {
  // İlk 30 kategoriyi al (sort_order'a göre zaten sıralı gelmeli)
  const sample = categories.slice(0, 30);
  return sample.map((c) => `- ${c}`).join("\n");
}

// ============================================================================
// Response parsing
// ============================================================================

/**
 * LLM'in response'unu parse et. JSON valid değilse güvenli default dön.
 */
export function parseIntentResponse(rawResponse: string): StructuredIntent {
  // JSON blşnu bul (LLM bazen markdown wrap edebilir)
  const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    return makeFallbackIntent("LLM response'da JSON bulunamadı");
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    // Schema dşulama
    return validateAndNormalize(parsed);
  } catch (err) {
    return makeFallbackIntent(`JSON parse hatası: ${String(err).slice(0, 100)}`);
  }
}

/**
 * Parse edilmiş objeyi beklenen şemaya göre dşula ve normalize et.
 */
function validateAndNormalize(raw: unknown): StructuredIntent {
  const source = isObject(raw) ? raw : {};
  const priceRange = isObject(source.price_range) ? source.price_range : {};
  const normalized: StructuredIntent = {
    category_slug: typeof source.category_slug === "string" ? source.category_slug : null,
    semantic_keywords: Array.isArray(source.semantic_keywords)
      ? source.semantic_keywords.filter((k: unknown): k is string => typeof k === "string").slice(0, 10)
      : [],
    must_have_specs: normalizeSpecRecord(source.must_have_specs),
    nice_to_have_specs: normalizeSpecRecord(source.nice_to_have_specs),
    price_range: {
      min: typeof priceRange.min === "number" ? priceRange.min : null,
      max: typeof priceRange.max === "number" ? priceRange.max : null,
    },
    brand_filter: Array.isArray(source.brand_filter)
      ? source.brand_filter.filter((b: unknown): b is string => typeof b === "string").slice(0, 5)
      : [],
    confidence: typeof source.confidence === "number"
      ? Math.max(0, Math.min(1, source.confidence))
      : 0.5,
    reasoning: typeof source.reasoning === "string"
      ? source.reasoning.slice(0, 200)
      : "",
    is_too_vague: source.is_too_vague === true,
    is_off_topic: source.is_off_topic === true,
  };
  return enrichBrandFilterFromKeywords(normalized);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function normalizeSpecRecord(
  value: unknown
): Record<string, string[] | string | number> {
  if (!isObject(value)) return {};

  const normalized: Record<string, string[] | string | number> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string" || typeof entry === "number") {
      normalized[key] = entry;
      continue;
    }
    if (Array.isArray(entry)) {
      const values = entry.filter((item): item is string => typeof item === "string");
      if (values.length > 0) {
        normalized[key] = values;
      }
    }
  }
  return normalized;
}

function enrichBrandFilterFromKeywords(intent: StructuredIntent): StructuredIntent {
  const existing = new Set((intent.brand_filter || []).map((b) => b.toLowerCase()));
  const additions: string[] = [];

  for (const kw of intent.semantic_keywords || []) {
    const kwLower = String(kw).toLowerCase().trim();
    if (!kwLower) continue;
    for (const brand of KNOWN_BRANDS_TR) {
      if (kwLower === brand.toLowerCase() && !existing.has(brand.toLowerCase())) {
        additions.push(brand);
        existing.add(brand.toLowerCase());
      }
    }
  }

  if (additions.length === 0) return intent;

  return {
    ...intent,
    brand_filter: [...(intent.brand_filter || []), ...additions].slice(0, 5),
  };
}

/**
 * Parse başarısız oldşnda dönen güvenli default.
 * Bu durumda chatbot slow path'i atlayıp keyword search'e dşr.
 */
function makeFallbackIntent(reason: string): StructuredIntent {
  return {
    category_slug: null,
    semantic_keywords: [],
    must_have_specs: {},
    nice_to_have_specs: {},
    price_range: { min: null, max: null },
    brand_filter: [],
    confidence: 0,
    reasoning: `Intent parser fallback: ${reason}`,
    is_too_vague: true,
    is_off_topic: false,
  };
}

// ============================================================================
// Exports
// ============================================================================

export const _internal = {
  formatKnowledgeContext,
  formatTaxonomy,
  validateAndNormalize,
  makeFallbackIntent,
};
