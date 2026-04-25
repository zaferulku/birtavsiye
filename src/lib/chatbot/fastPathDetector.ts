/**
 * Fast Path Detector
 *
 * Kullanıcı mesajının "spesifik ürün araması" mı yoksa "niyet tabanlı açıklama"
 * mı oldşnu tespit eder.
 *
 * - Fast path: Kısa, spesifik, marka+model içeren sorgular ş direkt vector search
 *   (LLM çşısı yok, ~1 saniye response)
 *
 * - Slow path: Uzun, açıklayıcı, özellik belirten sorgular ş full RAG akışı
 *   (KB retrieval + intent parser + hybrid search, ~3 saniye response)
 *
 * Karar kriterleri heuristik. Yanlış gider ise fallback güvenli:
 *   - Fast path tespit edilip ürün bulunamazsa ş slow path'e yeniden düş
 *   - Slow path her zaman çalışır (daha yavaş ama daha akıllı)
 */

export type QueryParserResult = {
  category?: string | null;
  brand?: string | null;
  model_family?: string | null;
  variant_storage?: string | null;
  variant_color?: string | null;
  price_min?: number | null;
  price_max?: number | null;
  keywords: string[];
  confidence: number;  // 0-1, parser'ın ne kadar emin olduğu
};

export type PathDecision = {
  path: "fast" | "slow";
  reason: string;
  confidence: number;
};

// ============================================================================
// Karar fonksiyonu
// ============================================================================

/**
 * Kullanıcı mesajı + kural tabanlı parser sonucuna bakarak hangi akışa
 * yönlendirecşmize karar verir.
 */
export function detectPath(
  message: string,
  parsed: QueryParserResult
): PathDecision {
  const normalized = message.trim().toLowerCase();
  const length = message.length;

  // ===== Güçlü fast path sinyalleri =====
  // Bunlardan biri varsa ş direkt fast path

  // Sinyal 1: Marka + model birlikte tespit edildi
  // "iPhone 15", "Samsung S24", "Xiaomi Redmi Note 12" gibi
  if (parsed.brand && parsed.model_family) {
    return {
      path: "fast",
      reason: "brand_and_model_detected",
      confidence: 0.95,
    };
  }

  // Sinyal 2: Marka + varyant (renk/depolama) → SLOW path
  // "siyah iphone", "iPhone 256GB" — variant filtreleme smart_search v2'de
  // yapılıyor; fast path direct vector match'i renk/storage'a bakmıyor.
  if (parsed.brand && (parsed.variant_storage || parsed.variant_color)) {
    return {
      path: "slow",
      reason: "brand_and_variant_needs_filter",
      confidence: 0.9,
    };
  }

  // Sinyal 2b: Raw mesajda renk veya storage kelimesi → SLOW path
  // (parseQuery yakalamamış olabilir; smart_search v2 variant filter gerek)
  if (hasVariantKeyword(normalized)) {
    return {
      path: "slow",
      reason: "variant_keyword_in_message",
      confidence: 0.85,
    };
  }

  // Sinyal 3: Model numarası pattern'i (alfanumeric, ör "A52s", "278550 EI")
  // Bu genelde kullanıcının spesifik bir ürünü aradş anlamına gelir
  if (hasModelNumberPattern(normalized)) {
    return {
      path: "fast",
      reason: "model_number_pattern",
      confidence: 0.85,
    };
  }

  // ===== Güçlü slow path sinyalleri =====
  // Bunlardan biri varsa ş slow path (RAG)

  // Sinyal 1: Özellik/niyet kelimeleri
  // "kokulu", "desenli", "şekerli", "tatlı", "şr", "hafif" vb.
  if (hasDescriptiveWords(normalized)) {
    return {
      path: "slow",
      reason: "descriptive_words_detected",
      confidence: 0.9,
    };
  }

  // Sinyal 2: Konuşma başlatma kelimeleri
  // "arıyorum", "öneri", "ne alsam", "hediye", "tavsiye eder misin"
  if (hasConversationalIntent(normalized)) {
    return {
      path: "slow",
      reason: "conversational_intent",
      confidence: 0.85,
    };
  }

  // Sinyal 3: şok uzun mesaj (detaylı açıklama)
  if (length > 80) {
    return {
      path: "slow",
      reason: "long_descriptive_message",
      confidence: 0.75,
    };
  }

  // ===== Heuristik karar =====

  // Kısa + parser güçlü güvenli ş fast path
  if (length < 50 && parsed.confidence >= 0.7) {
    return {
      path: "fast",
      reason: "short_and_parser_confident",
      confidence: 0.8,
    };
  }

  // Kategori tespit edildi ama başka detay yok
  // "ayakkabı", "telefon" gibi tek kelimeler ş slow path (netleştirici gerek)
  if (parsed.category && parsed.keywords.length <= 1 && !parsed.brand) {
    return {
      path: "slow",
      reason: "category_only_needs_clarification",
      confidence: 0.7,
    };
  }

  // Belirsiz durum ş slow path (varsayılan güvenli)
  return {
    path: "slow",
    reason: "ambiguous_default_to_slow",
    confidence: 0.5,
  };
}

// ============================================================================
// Pattern detector'lar
// ============================================================================

/**
 * Model numarası pattern'i tespit et.
 * Örnek: "A52s", "S24", "278550 EI", "M3 Pro", "Note 12"
 */
/**
 * Renk veya storage keyword'ü içeriyorsa varyant filtresi gerekir.
 * smart_search v2 variant_color_patterns + variant_storage_patterns kullanır.
 */
function hasVariantKeyword(text: string): boolean {
  const colors = [
    "siyah", "beyaz", "gri", "mavi", "kırmızı", "yeşil", "sarı",
    "pembe", "mor", "turuncu", "kahve", "lacivert", "bordo",
    "altın", "gümüş", "krem", "bej", "şeffaf", "lila", "mat",
    "black", "white", "blue", "red", "green", "yellow",
    "pink", "purple", "gold", "silver",
    "jet", "rose",
  ];
  const storagePatterns = [
    /\b\d+\s?gb\b/i,
    /\b\d+\s?tb\b/i,
    /\b\d+\s?mb\b/i,
  ];
  const colorPattern = new RegExp(
    `\\b(${colors.map(escapeRegex).join("|")})\\b`,
    "i"
  );
  if (colorPattern.test(text)) return true;
  return storagePatterns.some((p) => p.test(text));
}

function hasModelNumberPattern(text: string): boolean {
  // Büyük harf + sayı kombinasyonu (en az 2 karakter)
  const patterns = [
    /\b[a-z]{1,3}\d{2,}\b/i,           // A52, M3, S24
    /\b[a-z]{1,3}\s?\d{2,}\s?[a-z]{1,3}\b/i,  // 278550 EI
    /\bmodel\s*\d+\b/i,                 // Model 123
    /\bnote\s*\d+\b/i,                  // Note 12
    /\bpro\s*max\b/i,                   // Pro Max
  ];
  return patterns.some((p) => p.test(text));
}

/**
 * Betimleyici kelimeler ş slow path tetikleyici.
 * Bu kelimeler "niyet" sinyali; kullanıcı özellik bazlı arıyor.
 */
function hasDescriptiveWords(text: string): boolean {
  const descriptive = [
    // Koku / tat
    "kokulu", "kokan", "koku",
    "şekerli", "tatlı", "acı", "ekşi",
    "lavanta", "vanilya", "çiçek", "misk", "tarçın",

    // Desen / görsel
    "desenli", "desen", "puantiyeli", "çizgili", "kareli",
    "çiçekli", "ekoseli", "düz", "soyut",

    // Sıfatlar
    "şr", "hafif", "büyük", "küçük", "uzun", "kısa",
    "yumuşak", "sert", "ince", "kalın",
    "sessiz", "güçlü", "hızlı", "yavaş",
    "ucuz", "pahalı", "uygun",

    // Tarz
    "klasik", "modern", "vintage", "retro", "minimal",
    "casual", "şık", "sporty", "elegant",
    "sıcak", "soğuk",

    // Kullanım amacı
    "hediye", "düğün", "parti", "iş", "spor", "okul",
    "yaz", "kış", "günlük", "akşam",

    // Özel durumlar
    "hassas", "alerjik", "vegan", "organik", "doğal",
    "glutensiz", "şekersiz", "laktozsuz",

    // Kaşlşırma
    "gibi", "benzer", "ama değil", "yerine",

    // Belirsizlik
    "bir şey", "bir şeyler", "sence",
  ];

  return descriptive.some((word) => {
    // Kelime sınırlarıyla eşleştir (substring değil)
    const pattern = new RegExp(`\\b${escapeRegex(word)}\\b`, "i");
    return pattern.test(text);
  });
}

/**
 * Konuşma tarzı niyet ş slow path tetikleyici.
 */
function hasConversationalIntent(text: string): boolean {
  const phrases = [
    "arıyorum", "arıyordum",
    "öneri", "önerir misin", "önerebilir",
    "tavsiye",
    "ne alsam", "ne al",
    "hangi", "hangisi",
    "olur mu", "olabilir mi",
    "nasıl olur",
    "yardım", "yardımcı",
    "için uygun",
    "lazım", "ihtiyacım",
  ];

  return phrases.some((phrase) => text.includes(phrase));
}

// ============================================================================
// Helper
// ============================================================================

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ============================================================================
// Testing helpers (export for unit tests)
// ============================================================================

export const _internal = {
  hasModelNumberPattern,
  hasDescriptiveWords,
  hasConversationalIntent,
};
