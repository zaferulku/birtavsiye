/**
 * Suggestion Builder — Chatbot daraltıcı sohbet için chip butonları üretir.
 *
 * Karar mantığı:
 * 1. 3+ chip turundan sonra chip kapat (sonsuz döngü önleme)
 * 2. Terminator phrase ("hepsini göster", "yeni arama") → chip kapat
 * 3. Vague intent (kategori yok) → kategori chip'leri
 * 4. "Tavsiye ver" → 3 segment detay chip'leri
 * 5. "En popüler" → daraltıcı follow-up chip'leri
 * 6. Ürün ≤6 → chip yok, direkt göster
 * 7. Marka belirsiz → marka + shortcut chip'leri
 * 8. Bütçe belirsiz → bütçe chip'leri
 * 9. Hepsi belli → chip yok
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { StructuredIntent } from "./intentParser";
import type { ProductForResponse } from "./generateResponse";

// ============================================================================
// Types
// ============================================================================

export type Suggestion = {
  label: string;
  value: string;
  type: "shortcut" | "brand" | "price" | "category" | "freetext";
  icon?: string;
  /** Backward compat — eski chip'ler için korundu */
  categorySlug?: string;
  intentHint?: {
    category_slug?: string | null;
    brand_filter?: string[];
    variant_color_patterns?: string[];
    variant_storage_patterns?: string[];
    price_min?: number | null;
    price_max?: number | null;
    mode?: "extend" | "replace" | "reset";
  };
};

export type SuggestionContext = {
  userMessage: string;
  intent: StructuredIntent | null;
  products: ProductForResponse[];
  conversationHistory: Array<{ role: string; content: string }>;
  sb?: SupabaseClient | null;
  categoryId?: string | null;
  categorySlug?: string | null;
};

// ============================================================================
// Public entry
// ============================================================================

export async function buildSuggestions(
  ctx: SuggestionContext
): Promise<Suggestion[] | null> {
  const { intent, products, conversationHistory, userMessage } = ctx;

  // 1. Sonsuz döngü engelleme
  if (countChipTurns(conversationHistory) >= 3) return null;

  // 2. Terminator phrase
  if (isTerminator(userMessage)) return null;

  // 3. Vague intent → kategori chip'leri (sadece ürün YOKSA)
  // Ürün döndüyse kategori biliniyor demektir, marka chip'lerine düş.
  if ((intent?.is_too_vague || !intent?.category_slug) && products.length === 0) {
    return buildCategorySuggestions();
  }

  // 4. "Tavsiye ver" → segment detay
  if (wasRecommendationRequested(userMessage)) {
    return buildRecommendationDetailSuggestions(products);
  }

  // 5. "En popüler" → daraltıcı follow-up
  if (wasPopularRequested(userMessage)) {
    return buildPopularFollowUpSuggestions(intent, products, userMessage);
  }

  // 6. Tek ürün/sıfır → chip yok (kullanıcı zaten istediğini buldu).
  // 2+ ürün → daraltma sun.
  if (products.length <= 1) return null;

  // 7. Marka belirsiz
  if (!intent?.brand_filter || intent.brand_filter.length === 0) {
    return await buildBrandSuggestions(ctx, intent);
  }

  // 8. Bütçe belirsiz
  if (intent && !intent.price_range?.max && !intent.price_range?.min) {
    return buildPriceSuggestions(intent, userMessage);
  }

  // 9. Hepsi belli
  return null;
}

// ============================================================================
// Helpers
// ============================================================================

const TERMINATOR_PHRASES = [
  "hepsini göster",
  "fark etmez",
  "yeni arama",
  "bütçe önemli değil",
  "hepsi olur",
];

function isTerminator(message: string): boolean {
  const lower = message.toLowerCase();
  return TERMINATOR_PHRASES.some((p) => lower.includes(p));
}

const PROMPT_PHRASES = [
  "hangi marka",
  "hangi fiyat",
  "hangi bütçe",
  "hangi kategori",
  "hangi tip",
];

function countChipTurns(history: Array<{ role: string; content: string }>): number {
  return history.filter(
    (m) =>
      m.role === "assistant" &&
      PROMPT_PHRASES.some((p) => m.content.toLowerCase().includes(p))
  ).length;
}

function wasRecommendationRequested(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("tavsiye ver") || lower.includes("öner");
}

function wasPopularRequested(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("en popüler") || lower.includes("populer");
}

// ============================================================================
// Suggestion builders
// ============================================================================

function buildCategorySuggestions(): Suggestion[] {
  return [
    { label: "Telefon", value: "telefon", type: "category", icon: "📱", categorySlug: "akilli-telefon" },
    { label: "Laptop", value: "laptop", type: "category", icon: "💻", categorySlug: "laptop" },
    { label: "Tablet", value: "tablet", type: "category", icon: "📲", categorySlug: "tablet" },
    { label: "Akıllı saat", value: "akıllı saat", type: "category", icon: "⌚", categorySlug: "akilli-saat" },
    { label: "Beyaz eşya", value: "beyaz eşya", type: "category", icon: "🧊", categorySlug: "buzdolabi" },
  ];
}

async function buildBrandSuggestions(
  ctx: SuggestionContext,
  _intent: StructuredIntent | null
): Promise<Suggestion[]> {
  const baseValue = ctx.userMessage;

  // Top markalar — sb varsa kategoriden, yoksa products'tan
  let topBrands: string[] = [];

  // categorySlug üzerinden kategori-bazlı top markalar (Header'daki
  // marka çeşitliliği için DB'den çek)
  if (ctx.sb && (ctx.categoryId || ctx.categorySlug)) {
    try {
      let query = ctx.sb
        .from("products")
        .select("brand, category:categories!inner(slug)")
        .eq("is_active", true)
        .not("brand", "is", null)
        .limit(500);

      if (ctx.categoryId) {
        query = query.eq("category_id", ctx.categoryId);
      } else if (ctx.categorySlug) {
        query = query.eq("categories.slug", ctx.categorySlug);
      }

      const { data } = await query;

      if (data) {
        const counts: Record<string, number> = {};
        for (const r of data) {
          const b = (r as { brand?: string | null }).brand;
          if (b && b !== "null") counts[b] = (counts[b] || 0) + 1;
        }
        topBrands = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([b]) => b);
      }
    } catch {
      // ignore, use fallback below
    }
  }

  if (topBrands.length === 0) {
    const counts: Record<string, number> = {};
    for (const p of ctx.products) {
      if (p.brand && p.brand !== "null") {
        counts[p.brand] = (counts[p.brand] || 0) + 1;
      }
    }
    topBrands = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([b]) => b);
  }

  const categorySlug = ctx.categorySlug ?? null;
  const out: Suggestion[] = [
    {
      label: "En popüler",
      value: `${baseValue} en popüler`,
      type: "shortcut",
      icon: "🔥",
      intentHint: { category_slug: categorySlug, mode: "reset" },
    },
    {
      label: "Tavsiye ver",
      value: `${baseValue} tavsiye ver`,
      type: "shortcut",
      icon: "✨",
      intentHint: { category_slug: categorySlug, mode: "reset" },
    },
    ...topBrands.map(
      (brand): Suggestion => ({
        label: brand,
        value: `${baseValue} ${brand}`,
        type: "brand",
        intentHint: { category_slug: categorySlug, brand_filter: [brand], mode: "extend" },
      })
    ),
    { label: "Hepsini göster", value: `${baseValue} hepsini göster`, type: "shortcut" },
  ];

  return out;
}

function buildPriceSuggestions(
  intent: StructuredIntent,
  userMessage: string
): Suggestion[] {
  const ranges = priceRangesForCategory(intent.category_slug);
  const baseValue = userMessage;

  return [
    ...ranges.map(
      (r): Suggestion => ({
        label: r.label,
        value: `${baseValue} ${r.label}`,
        type: "price",
        icon: "💰",
      })
    ),
    { label: "Fark etmez", value: `${baseValue} fark etmez bütçe`, type: "shortcut" },
  ];
}

function priceRangesForCategory(slug: string | null): Array<{ label: string }> {
  const map: Record<string, Array<{ label: string }>> = {
    "akilli-telefon": [
      { label: "5-15 bin TL" },
      { label: "15-30 bin TL" },
      { label: "30-60 bin TL" },
      { label: "60 bin TL üstü" },
    ],
    laptop: [
      { label: "15-30 bin TL" },
      { label: "30-50 bin TL" },
      { label: "50-80 bin TL" },
      { label: "80 bin TL üstü" },
    ],
    "akilli-saat": [
      { label: "1-5 bin TL" },
      { label: "5-15 bin TL" },
      { label: "15-30 bin TL" },
      { label: "30 bin TL üstü" },
    ],
    tablet: [
      { label: "5-15 bin TL" },
      { label: "15-30 bin TL" },
      { label: "30-60 bin TL" },
      { label: "60 bin TL üstü" },
    ],
  };
  return (
    map[slug || ""] || [
      { label: "1-5 bin TL" },
      { label: "5-15 bin TL" },
      { label: "15-50 bin TL" },
      { label: "50 bin TL üstü" },
    ]
  );
}

function buildRecommendationDetailSuggestions(
  products: ProductForResponse[]
): Suggestion[] {
  if (products.length < 3) {
    return [
      { label: "Başka seçenek", value: "başka seçenek göster", type: "shortcut", icon: "🔄" },
    ];
  }

  const sorted = [...products].sort((a, b) => (a.min_price || 0) - (b.min_price || 0));
  const economic = sorted[Math.max(0, Math.floor(sorted.length * 0.2))];
  const balance = sorted[Math.max(0, Math.floor(sorted.length * 0.5))];
  const premium = sorted[Math.max(0, Math.floor(sorted.length * 0.8))];

  const items: Suggestion[] = [];
  if (economic) {
    items.push({
      label: "Ekonomik detay",
      value: `${economic.title} hakkında detay`,
      type: "freetext",
      icon: "💰",
    });
  }
  if (balance && balance !== economic) {
    items.push({
      label: "Denge detay",
      value: `${balance.title} hakkında detay`,
      type: "freetext",
      icon: "⭐",
    });
  }
  if (premium && premium !== balance && premium !== economic) {
    items.push({
      label: "Premium detay",
      value: `${premium.title} hakkında detay`,
      type: "freetext",
      icon: "🚀",
    });
  }
  items.push({
    label: "Başka seçenek",
    value: "başka seçenek göster",
    type: "shortcut",
    icon: "🔄",
  });

  return items;
}

function buildPopularFollowUpSuggestions(
  intent: StructuredIntent | null,
  products: ProductForResponse[],
  userMessage: string
): Suggestion[] {
  const counts: Record<string, number> = {};
  for (const p of products) {
    if (p.brand && p.brand !== "null") {
      counts[p.brand] = (counts[p.brand] || 0) + 1;
    }
  }
  const topBrands = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([b]) => b);

  const baseValue = intent?.semantic_keywords?.join(" ") || userMessage;

  return [
    ...topBrands.map(
      (brand): Suggestion => ({
        label: `${brand} ile daralt`,
        value: `${baseValue} ${brand}`,
        type: "brand",
      })
    ),
    {
      label: "Bütçeye göre",
      value: `${baseValue} bütçeye göre`,
      type: "shortcut",
      icon: "💰",
    },
    { label: "Yeni arama", value: "yeni arama", type: "shortcut" },
  ];
}
