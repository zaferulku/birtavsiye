// =============================================================================
// src/lib/search/queryParser.ts
// Lokal Query Parser — LLM'siz, hızlı, offline
//
// GÖREVLER:
//   "beyaz telefon"            → {category_slugs: ["akilli-telefon"], color: "Beyaz"}
//   "1000 tl altı laptop"      → {category_slugs: ["laptop"], price_max: 1000}
//   "apple iphone 15"          → {brand: "Apple", model: "iPhone 15"}
//   "arçelik buzdolabı"        → {brand: "Arçelik", category_slugs: ["buzdolabi"]}
//
// PRENSİP: Bu parser %100 bağımsız. LLM yok, API yok, hata kaynağı yok.
//          Başarısızsa boş döner (null values). Çağıran taraf fallback'e geçer.
// =============================================================================

import { KNOWN_BRANDS_TR } from "../data/known-brands";

export type ParsedQuery = {
  // Ana filtreler
  category_slugs: string[] | null;  // ["akilli-telefon"] → match_products'a geçer
  brand: string | null;             // "Apple" → normalize edilmiş
  color: string | null;             // "Beyaz"
  storage: string | null;           // "128GB"
  price_min: number | null;         // TL
  price_max: number | null;         // TL

  // Arama query'si için kelimeler (keyword search için)
  keywords: string[];                // Kategori/brand/fiyat çıkarıldıktan sonra kalan

  // Debug bilgisi
  matched_patterns: string[];       // Hangi pattern'ler eşleşti
};

export type CategoryRef = {
  id: string;
  slug: string;
  name: string;
  keywords: string[] | null;
  exclude_keywords: string[] | null;
  related_brands: string[] | null;
};

// =============================================================================
// Turkish normalization
// =============================================================================

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/\s+/g, " ")
    .trim();
}

// =============================================================================
// Color dictionary (Türkçe)
// =============================================================================

const COLORS: Record<string, string> = {
  beyaz: "Beyaz",
  siyah: "Siyah",
  kirmizi: "Kırmızı",
  kırmızı: "Kırmızı",
  mavi: "Mavi",
  yesil: "Yeşil",
  yeşil: "Yeşil",
  sari: "Sarı",
  sarı: "Sarı",
  mor: "Mor",
  pembe: "Pembe",
  turuncu: "Turuncu",
  gri: "Gri",
  kahverengi: "Kahverengi",
  // Note: bare "kahve" deliberately NOT mapped — it's a category/product
  // ("kahve makinesi", "filtre kahve"), not a color. Use "kahverengi" for color.
  lacivert: "Lacivert",
  bordo: "Bordo",
  altın: "Altın",
  altin: "Altın",
  gümüş: "Gümüş",
  gumus: "Gümüş",
  bronz: "Bronz",
  titanyum: "Titanyum",
  bej: "Bej",
  krem: "Krem",
  fıstık: "Fıstık Yeşili",
  fistik: "Fıstık Yeşili",
};

// =============================================================================
// Storage patterns (GB/TB)
// =============================================================================

const STORAGE_RE = /\b(\d+)\s*(gb|tb)\b/i;

function extractStorage(query: string): string | null {
  const m = query.match(STORAGE_RE);
  if (!m) return null;
  const size = parseInt(m[1]);
  const unit = m[2].toUpperCase();
  return `${size}${unit}`;
}

// =============================================================================
// Price patterns (TL / Lira)
// =============================================================================

function extractPrice(query: string): { min: number | null; max: number | null; remaining: string } {
  let remaining = query;
  let min: number | null = null;
  let max: number | null = null;

  // P6.19: 'bin' çarpanı yardımcı — match içinde 'bin' geçiyorsa ×1000.
  const numFromMatch = (numStr: string, hasBin: boolean): number => {
    const n = parseInt(numStr.replace(/\./g, ""));
    return hasBin ? n * 1000 : n;
  };

  // "X TL altı" / "X TL'nin altında" / "X bin altı"
  const maxRe = /(\d+(?:\.\d{3})*)\s*(bin)?\s*(?:tl|lira|₺)?(?:'?nin?\s+)?\s*(?:altı|altında|alt)/i;
  const maxM = query.match(maxRe);
  if (maxM) {
    max = numFromMatch(maxM[1], Boolean(maxM[2]));
    remaining = remaining.replace(maxM[0], "").trim();
  }

  // "X TL üstü" / "X TL'nin üstünde" / "X bin üzeri"
  const minRe = /(\d+(?:\.\d{3})*)\s*(bin)?\s*(?:tl|lira|₺)?(?:'?nin?\s+)?\s*(?:üstü|üstünde|üst|üzeri)/i;
  const minM = query.match(minRe);
  if (minM) {
    min = numFromMatch(minM[1], Boolean(minM[2]));
    remaining = remaining.replace(minM[0], "").trim();
  }

  // P6.19: "X bine kadar" / "X TL'ye kadar"
  if (max === null) {
    const kadarRe = /(\d+(?:\.\d{3})*)\s*(bin)?\s*(?:tl|lira|₺)?(?:'?ye)?\s*kadar/i;
    const kadarM = query.match(kadarRe);
    if (kadarM) {
      max = numFromMatch(kadarM[1], Boolean(kadarM[2]));
      remaining = remaining.replace(kadarM[0], "").trim();
    }
  }

  // P6.19: "max X TL" / "en fazla X bin"
  if (max === null) {
    const maxKwRe = /(?:max|en\s+fazla)\s+(\d+(?:\.\d{3})*)\s*(bin)?\s*(?:tl|lira|₺)?/i;
    const maxKwM = query.match(maxKwRe);
    if (maxKwM) {
      max = numFromMatch(maxKwM[1], Boolean(maxKwM[2]));
      remaining = remaining.replace(maxKwM[0], "").trim();
    }
  }

  // P6.19: "min X TL" / "en az X bin"
  if (min === null) {
    const minKwRe = /(?:min|en\s+az)\s+(\d+(?:\.\d{3})*)\s*(bin)?\s*(?:tl|lira|₺)?/i;
    const minKwM = query.match(minKwRe);
    if (minKwM) {
      min = numFromMatch(minKwM[1], Boolean(minKwM[2]));
      remaining = remaining.replace(minKwM[0], "").trim();
    }
  }

  // "X TL ile Y TL arası"
  const rangeRe = /(\d+(?:\.\d{3})*)\s*(?:tl|lira|₺)?\s*ile\s*(\d+(?:\.\d{3})*)\s*(?:tl|lira|₺)?\s*aras/i;
  const rangeM = query.match(rangeRe);
  if (rangeM) {
    min = parseInt(rangeM[1].replace(/\./g, ""));
    max = parseInt(rangeM[2].replace(/\./g, ""));
    remaining = remaining.replace(rangeM[0], "").trim();
  }

  // "X-Y bin TL" / "X-Y bin lira" / "1-3 bin TL aralığında" — bin = ×1000
  // Önce dene (specific), sonra plain dash. Sadece henüz min/max yoksa apply.
  if (min === null && max === null) {
    const binRangeRe = /(\d+(?:\.\d{3})*)\s*[-–—]\s*(\d+(?:\.\d{3})*)\s*bin\s*(?:tl|lira|₺)?/i;
    const binM = query.match(binRangeRe);
    if (binM) {
      const a = parseInt(binM[1].replace(/\./g, "")) * 1000;
      const b = parseInt(binM[2].replace(/\./g, "")) * 1000;
      if (a < b) {
        min = a;
        max = b;
        remaining = remaining.replace(binM[0], "").trim();
      }
    }
  }

  // "X-Y TL" / "X TL-Y TL" plain dash range (bin yok)
  if (min === null && max === null) {
    const dashRe = /(\d+(?:\.\d{3})*)\s*(?:tl|lira|₺)?\s*[-–—]\s*(\d+(?:\.\d{3})*)\s*(?:tl|lira|₺)/i;
    const dashM = query.match(dashRe);
    if (dashM) {
      const a = parseInt(dashM[1].replace(/\./g, ""));
      const b = parseInt(dashM[2].replace(/\./g, ""));
      if (a < b) {
        min = a;
        max = b;
        remaining = remaining.replace(dashM[0], "").trim();
      }
    }
  }

  return { min, max, remaining };
}

// =============================================================================
// Category detection (YAML keywords'e bakarak)
// =============================================================================

// Migration 011 sonrası categories tablosunda keywords henüz boş olan slug'lar
// için static fallback. parseQuery DB keywords + bu map'i birlikte kullanır.
// rev: standalone scan (cache-bağımsız) — Tur 3 Fix 1.
// TUR 4: giyim eklendi — erkek-giyim-ust, erkek-giyim-alt, kadin-giyim-*, kadin-elbise.
const STATIC_CATEGORY_KEYWORDS: Record<string, string[]> = {
  "kahve": ["kahve", "turk kahvesi", "filtre kahve", "espresso", "cekirdek kahve", "granul kahve"],
  "spor-cantasi": ["spor cantasi", "gym cantasi", "fitness cantasi", "antrenman cantasi"],
  "icecek": ["icecek", "mesrubat", "soda", "gazoz", "kola"],
  // Giyim — cache-bağımsız fallback (LLM dotted slug korumalı)
  "erkek-giyim-ust": ["erkek tisort", "erkek tişört", "erkek gomlek", "erkek gömlek", "erkek kazak", "erkek sweatshirt", "erkek polo"],
  "erkek-giyim-alt": ["erkek pantolon", "erkek jean", "erkek esofman", "erkek şort"],
  "kadin-giyim-ust": ["kadin tisort", "kadın tişört", "kadin bluz", "kadın bluz", "kadin gomlek", "bayan tisort", "bayan bluz"],
  "kadin-giyim-alt": ["kadin pantolon", "kadın pantolon", "kadin jean", "kadin tayt"],
  "kadin-elbise": ["kadin elbise", "kadın elbise", "abiye"],
};

const CHATBOT_FALLBACK_CATEGORY_PHRASES: Array<{
  slug: string;
  phrases: string[];
}> = [
  {
    slug: "telefon",
    phrases: [
      "akilli telefon",
      "cep telefonu",
      "telefon",
      "iphone",
      "galaxy",
      "redmi",
      "xiaomi",
      "vivo",
      "oppo",
      "honor",
      "poco",
      "realme",
    ],
  },
  {
    slug: "laptop",
    phrases: ["dizustu bilgisayar", "notebook", "laptop", "macbook"],
  },
  {
    slug: "tablet",
    phrases: ["ipad", "tablet"],
  },
  {
    slug: "akilli-saat",
    phrases: ["akilli saat", "smartwatch", "watch"],
  },
  {
    slug: "kulaklik",
    phrases: ["airpods", "kulak ici", "kulak ustu", "kulaklik"],
  },
  {
    slug: "televizyon",
    phrases: ["smart tv", "televizyon", "tv"],
  },
  {
    slug: "monitor",
    phrases: ["oyuncu monitoru", "monitör", "monitor"],
  },
  {
    slug: "kahve-makinesi",
    phrases: [
      "kahve makinasi",
      "kahve makinesi",
      "espresso makinesi",
      "filtre kahve makinesi",
      "kapsullu kahve makinesi",
      "kapsullu kahve makinasi",
    ],
  },
  {
    slug: "parfum",
    phrases: ["parfum", "parfüm"],
  },
  {
    slug: "deodorant",
    phrases: ["deodorant"],
  },
  {
    slug: "serum-ampul",
    phrases: ["serum", "ampul serum", "cilt serumu"],
  },
  {
    slug: "robot-supurge",
    phrases: ["robot supurge", "robot süpürge"],
  },
  {
    slug: "supurge",
    phrases: ["dikey supurge", "torbasiz supurge", "supurge", "süpürge"],
  },
  {
    slug: "klima",
    phrases: ["klima"],
  },
  {
    slug: "kedi-mamasi",
    phrases: ["kedi mamasi", "kedi maması"],
  },
  {
    slug: "kopek-mamasi",
    phrases: ["kopek mamasi", "köpek maması"],
  },
  {
    slug: "kedi-kumu",
    phrases: ["kedi kumu"],
  },
];

function extractCategories(
  query: string,
  categories: CategoryRef[]
): { slugs: string[]; matchedWords: Set<string> } {
  const normalizedQuery = normalize(query);
  const matchedSlugs: { slug: string; score: number }[] = [];
  const matchedWords = new Set<string>();

  // 1) DB-bağımsız static keyword scan — DAIMA çalışır (cache'ten bağımsız).
  // Aşağıdaki DB loop ile çakışma olursa son aşamadaki dedupe handle eder.
  for (const [slug, keywords] of Object.entries(STATIC_CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      const normKw = normalize(kw);
      const re = new RegExp(`\\b${escapeRegExp(normKw)}\\b`, "i");
      if (re.test(normalizedQuery)) {
        score += normKw.length;
        matchedWords.add(normKw);
      }
    }
    if (score > 0) {
      matchedSlugs.push({ slug, score });
    }
  }

  for (const entry of CHATBOT_FALLBACK_CATEGORY_PHRASES) {
    let score = 0;
    for (const phrase of entry.phrases) {
      const normPhrase = normalize(phrase);
      const re = new RegExp(`\\b${escapeRegExp(normPhrase)}\\b`, "i");
      if (re.test(normalizedQuery)) {
        score += normPhrase.length + 10;
        matchedWords.add(normPhrase);
        for (const token of normPhrase.split(/\s+/)) {
          if (token) matchedWords.add(token);
        }
      }
    }
    if (score > 0) {
      matchedSlugs.push({ slug: entry.slug, score });
    }
  }

  for (const cat of categories) {
    const dbKeywords = cat.keywords ?? [];
    const staticKeywords = STATIC_CATEGORY_KEYWORDS[cat.slug] ?? [];
    const slugParts = cat.slug.split("/");
    const leafSlug = slugParts[slugParts.length - 1] ?? cat.slug;
    const slugKeywords = [
      cat.name,
      leafSlug.replace(/-/g, " "),
      cat.slug.replace(/[/-]/g, " "),
    ];
    const allKeywords = [...dbKeywords, ...staticKeywords, ...slugKeywords];
    if (allKeywords.length === 0) continue;

    let score = 0;
    for (const kw of allKeywords) {
      const normKw = normalize(kw);
      // Tam kelime olarak mı geçiyor (kelime sınırlarıyla)
      const re = new RegExp(`\\b${escapeRegExp(normKw)}\\b`, "i");
      if (re.test(normalizedQuery)) {
        // Daha uzun keyword → daha yüksek skor
        score += normKw.length;
        matchedWords.add(normKw);
      }
    }

    // Exclude keywords kontrolü
    if (cat.exclude_keywords) {
      for (const exc of cat.exclude_keywords) {
        const normExc = normalize(exc);
        const re = new RegExp(`\\b${escapeRegExp(normExc)}\\b`, "i");
        if (re.test(normalizedQuery)) {
          score -= normExc.length * 2; // Penalty 2x
        }
      }
    }

    if (score > 0) {
      matchedSlugs.push({ slug: cat.slug, score });
    }
  }

  // Aynı slug iki yerden de geldi (static + DB) → en yüksek score'u tut
  const bestPerSlug = new Map<string, number>();
  for (const m of matchedSlugs) {
    const existing = bestPerSlug.get(m.slug);
    if (existing === undefined || m.score > existing) {
      bestPerSlug.set(m.slug, m.score);
    }
  }
  const dedupedMatches = Array.from(bestPerSlug.entries()).map(([slug, score]) => ({ slug, score }));

  // En yüksek skordan aşağı sırala, top 2'yi al
  dedupedMatches.sort((a, b) => b.score - a.score);
  const topSlugs = dedupedMatches.slice(0, 2).map(m => m.slug);

  return { slugs: topSlugs, matchedWords };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// =============================================================================
// Brand detection
// =============================================================================

function extractBrand(
  query: string,
  categories: CategoryRef[]
): string | null {
  const normalizedQuery = normalize(query);

  // Brand source = DB-driven (categories.related_brands) ∪ static
  // KNOWN_BRANDS_TR. DB takes precedence implicitly via Set semantics; the
  // static list backfills brands not yet wired into categories.related_brands
  // (e.g. Prima, Huggies, Nescafé) so the parser doesn't go blind on them.
  const allBrands = new Set<string>();
  for (const cat of categories) {
    for (const b of cat.related_brands ?? []) {
      allBrands.add(b);
    }
  }
  for (const b of KNOWN_BRANDS_TR) {
    allBrands.add(b);
  }

  // En uzun marka adından başla (false positive önleme: "Samsung Galaxy" → Samsung yakalansın, "Mi" → Xiaomi false positive olmasın)
  const sortedBrands = Array.from(allBrands).sort((a, b) => b.length - a.length);

  for (const brand of sortedBrands) {
    const normBrand = normalize(brand);
    const re = new RegExp(`\\b${escapeRegExp(normBrand)}\\b`, "i");
    if (re.test(normalizedQuery)) {
      return brand; // Canonical formunu döndür
    }
  }

  return null;
}

// =============================================================================
// Color detection
// =============================================================================

function extractColor(query: string): string | null {
  const normalizedQuery = normalize(query);
  const words = normalizedQuery.split(/\s+/);

  for (const w of words) {
    if (COLORS[w]) return COLORS[w];
  }

  return null;
}

// =============================================================================
// Main parser
// =============================================================================

export function parseQuery(
  query: string,
  categories: CategoryRef[]
): ParsedQuery {
  const patterns: string[] = [];

  // 1. Fiyat (önce çıkarılsın, temizlenmiş query diğer parser'lara gitsin)
  const { min, max, remaining: afterPrice } = extractPrice(query);
  if (min !== null) patterns.push(`price_min=${min}`);
  if (max !== null) patterns.push(`price_max=${max}`);

  // 2. Depolama (GB/TB)
  const storage = extractStorage(afterPrice);
  if (storage) patterns.push(`storage=${storage}`);

  // 3. Renk
  const color = extractColor(afterPrice);
  if (color) patterns.push(`color=${color}`);

  // 4. Marka
  const brand = extractBrand(afterPrice, categories);
  if (brand) patterns.push(`brand=${brand}`);

  // 5. Kategori
  const { slugs, matchedWords } = extractCategories(afterPrice, categories);
  if (slugs.length > 0) patterns.push(`category=${slugs.join(",")}`);

  // 6. Kalan anahtar kelimeler (stopword + eşleşen kategori kelimeleri çıkarılmış)
  const STOPWORDS = new Set([
    "bir","bu","şu","ne","nasil","nasıl","nedir","midir","mi","mu","mı","mü",
    "en","ucuz","pahali","pahalı","uygun","iyi","kotu","kötü","guzel","güzel",
    "hangi","hangisi","kac","kaç","kadar",
    "icin","için","ile","gibi","olan","var","yok","tl","lira",
    "adet","yeni","eski","alti","altı","ustunde","üstünde"
  ]);

  const keywords = normalize(afterPrice)
    .split(/\s+/)
    .filter(w => w.length >= 2)
    .filter(w => !STOPWORDS.has(w))
    .filter(w => !matchedWords.has(w))
    .filter(w => w !== normalize(color ?? "") && w !== normalize(brand ?? ""))
    .slice(0, 5);

  return {
    category_slugs: slugs.length > 0 ? slugs : null,
    brand,
    color,
    storage,
    price_min: min,
    price_max: max,
    keywords,
    matched_patterns: patterns,
  };
}
