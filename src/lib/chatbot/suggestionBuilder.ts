import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getNextCategoryFlowStep,
  type FlowStepDefinition,
} from "./categoryFlow";
import type { StructuredIntent } from "./intentParser";
import type { ProductForResponse } from "./generateResponse";

export type Suggestion = {
  label: string;
  value: string;
  type:
    | "shortcut"
    | "brand"
    | "price"
    | "category"
    | "freetext"
    | "storage"
    | "attribute";
  icon?: string;
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
  flowMessage?: string | null;
  intent: StructuredIntent | null;
  products: ProductForResponse[];
  conversationHistory: Array<{ role: string; content: string }>;
  sb?: SupabaseClient | null;
  categoryId?: string | null;
  categorySlug?: string | null;
  hasBrand?: boolean;
  hasPricePreference?: boolean;
};

const TERMINATOR_PHRASES = [
  "hepsini goster",
  "fark etmez",
  "yeni arama",
  "butce onemli degil",
  "hepsi olur",
];

const PROMPT_PHRASES = [
  "hangi marka",
  "hafiza kac gb",
  "depolama kac gb",
  "butce araligin ne olsun",
  "nasil bir koku istiyorsun",
  "cilt tipi nasil olsun",
  "kapasite ne olsun",
  "kac btu olsun",
  "beden ne olsun",
  "numara kac olsun",
  "renk tercihin var mi",
  "kulaklik tipi nasil olsun",
  "televizyon kac inc olsun",
  "monitor kac inc olsun",
  "hangi tip olsun",
  "supurge tipi nasil olsun",
  "kum tipi nasil olsun",
  "ne tur ariyorsun",
  "hangi alan icin bakiyorsun",
  "otomotiv urununde oncelik ne olsun",
  "bu urunu daha cok hangi alanda kullanacaksin",
  "daha cok hangi kullanim icin bakiyorsun",
];

export async function buildSuggestions(
  ctx: SuggestionContext
): Promise<Suggestion[] | null> {
  const { intent, products, conversationHistory, userMessage } = ctx;
  const flowMessage = ctx.flowMessage?.trim() || userMessage;

  if (countChipTurns(conversationHistory) >= 3) return null;
  if (isTerminator(userMessage)) return null;

  if ((intent?.is_too_vague || !intent?.category_slug) && products.length === 0) {
    return buildCategorySuggestions();
  }

  if (wasRecommendationRequested(userMessage)) {
    return buildRecommendationDetailSuggestions(products);
  }

  if (wasPopularRequested(userMessage)) {
    return buildPopularFollowUpSuggestions(intent, products, userMessage);
  }

  if (products.length === 0) return null;

  // P6.10 fix (2026-05-02): 1 ürün edge case — kullanıcı çıkmaza girmesin.
  // Aktif filtreyi gevşeten "broaden" chip'leri (filter remove via intentHint reset).
  if (products.length === 1) {
    const chips: Suggestion[] = [];
    const mustHaveCount = intent?.must_have_specs
      ? Object.keys(intent.must_have_specs).length
      : 0;
    if (mustHaveCount > 0) {
      chips.push({
        label: "Diğer renk/varyantlar",
        value: "varyantları göster",
        type: "shortcut",
        icon: "🎨",
        intentHint: {
          variant_color_patterns: [],
          variant_storage_patterns: [],
          mode: "reset",
        },
      });
    }
    if ((intent?.brand_filter?.length ?? 0) > 0) {
      chips.push({
        label: "Markaları genişlet",
        value: "tüm markalar",
        type: "shortcut",
        icon: "🏷️",
        intentHint: { brand_filter: [], mode: "reset" },
      });
    }
    if (intent?.price_range.min != null || intent?.price_range.max != null) {
      chips.push({
        label: "Fiyat aralığını genişlet",
        value: "fiyat genişlet",
        type: "shortcut",
        icon: "💰",
        intentHint: { price_min: null, price_max: null, mode: "reset" },
      });
    }
    // Hiç aktif filter yoksa ama 1 ürün → genel broaden fallback
    if (chips.length === 0) {
      chips.push({
        label: "Başka seçenek göster",
        value: "baska secenek goster",
        type: "shortcut",
        icon: "🔁",
      });
    }
    return chips;
  }

  const nextStep = getNextCategoryFlowStep({
    categorySlug: intent?.category_slug ?? ctx.categorySlug ?? null,
    userMessage: flowMessage,
    hasBrand:
      typeof ctx.hasBrand === "boolean"
        ? ctx.hasBrand
        : (intent?.brand_filter?.length ?? 0) > 0,
    hasPricePreference:
      typeof ctx.hasPricePreference === "boolean"
        ? ctx.hasPricePreference
        : intent?.price_range.min != null || intent?.price_range.max != null,
  });

  if (!nextStep) return null;

  if (nextStep.key === "brand") {
    return await buildBrandSuggestions(ctx);
  }

  if (nextStep.key === "budget") {
    return buildPriceSuggestions(intent, userMessage);
  }

  return buildAttributeSuggestions(ctx, intent, nextStep);
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .trim();
}

function isUsableBrand(value: string | null | undefined): value is string {
  if (!value) return false;
  const normalized = normalize(value);
  if (!normalized) return false;
  if (["null", "best", "undefined", "unknown", "yok"].includes(normalized)) {
    return false;
  }
  if (/^\d+$/.test(normalized)) return false;
  return /[a-z]/i.test(value);
}

function getLeafCategorySlug(slug: string | null | undefined): string {
  if (!slug) return "";
  const normalized = normalize(slug);
  const parts = normalized.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? normalized;
}

function isTerminator(message: string): boolean {
  const lower = normalize(message);
  return TERMINATOR_PHRASES.some((phrase) => lower.includes(phrase));
}

function countChipTurns(history: Array<{ role: string; content: string }>): number {
  return history.filter(
    (entry) =>
      entry.role === "assistant" &&
      PROMPT_PHRASES.some((phrase) => normalize(entry.content).includes(phrase))
  ).length;
}

function wasRecommendationRequested(message: string): boolean {
  const lower = normalize(message);
  return lower.includes("tavsiye ver") || lower.includes("oner") || lower.includes("öner");
}

function wasPopularRequested(message: string): boolean {
  const lower = normalize(message);
  return lower.includes("en populer") || lower.includes("en populer");
}

function buildCategorySuggestions(): Suggestion[] {
  return [
    { label: "Telefon", value: "telefon", type: "category", icon: "📱", categorySlug: "akilli-telefon" },
    { label: "Laptop", value: "laptop", type: "category", icon: "💻", categorySlug: "laptop" },
    { label: "Kulaklik", value: "kulaklik", type: "category", icon: "🎧", categorySlug: "kulaklik" },
    { label: "TV", value: "televizyon", type: "category", icon: "📺", categorySlug: "televizyon" },
    { label: "Kahve makinesi", value: "kahve makinesi", type: "category", icon: "☕", categorySlug: "kahve-makinesi" },
    { label: "Parfum", value: "parfum", type: "category", icon: "🌸", categorySlug: "parfum" },
  ];
}

async function buildBrandSuggestions(
  ctx: SuggestionContext
): Promise<Suggestion[]> {
  const baseValue = ctx.userMessage;
  const categorySlug = ctx.categorySlug ?? null;
  let topBrands: string[] = [];

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
        for (const row of data) {
          const brand = (row as { brand?: string | null }).brand;
          if (isUsableBrand(brand)) {
            counts[brand] = (counts[brand] || 0) + 1;
          }
        }
        topBrands = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([brand]) => brand);
      }
    } catch {
      // fallback below
    }
  }

  if (topBrands.length === 0) {
    const counts: Record<string, number> = {};
    for (const product of ctx.products) {
      if (isUsableBrand(product.brand)) {
        counts[product.brand] = (counts[product.brand] || 0) + 1;
      }
    }
    topBrands = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([brand]) => brand);
  }

  return [
    ...topBrands.map(
      (brand): Suggestion => ({
        label: brand,
        value: `${baseValue} ${brand}`,
        type: "brand",
        intentHint: {
          category_slug: categorySlug,
          brand_filter: [brand],
          mode: "extend",
        },
      })
    ),
    {
      label: "En populer",
      value: `${baseValue} en populer`,
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
    {
      label: "Hepsini goster",
      value: `${baseValue} hepsini goster`,
      type: "shortcut",
      intentHint: { category_slug: categorySlug, mode: "reset" },
    },
  ];
}

function buildAttributeSuggestions(
  ctx: SuggestionContext,
  intent: StructuredIntent | null,
  step: FlowStepDefinition
): Suggestion[] {
  const baseValue = ctx.userMessage;
  const categorySlug = intent?.category_slug ?? ctx.categorySlug ?? null;

  return [
    ...step.options.map(
      (option): Suggestion => ({
        label: option,
        value: `${baseValue} ${option}`,
        type: step.key === "storage" ? "storage" : "attribute",
        icon: step.icon,
        intentHint: {
          category_slug: categorySlug,
          brand_filter: intent?.brand_filter ?? [],
          ...(step.key === "storage"
            ? { variant_storage_patterns: [option] }
            : step.key === "color"
              ? { variant_color_patterns: [option] }
              : {}),
          mode: "extend",
        },
      })
    ),
    {
      label: "Fark etmez",
      value: `${baseValue} fark etmez`,
      type: "shortcut",
      intentHint: {
        category_slug: categorySlug,
        brand_filter: intent?.brand_filter ?? [],
        mode: "extend",
      },
    },
  ];
}

function buildPriceSuggestions(
  intent: StructuredIntent | null,
  userMessage: string
): Suggestion[] {
  const ranges = priceRangesForCategory(intent?.category_slug ?? null);
  const baseValue = userMessage;

  return [
    ...ranges.map(
      (range): Suggestion => ({
        label: range.label,
        value: `${baseValue} ${range.label}`,
        type: "price",
        icon: "💰",
      })
    ),
    { label: "Fark etmez", value: `${baseValue} butce fark etmez`, type: "shortcut" },
  ];
}

function priceRangesForCategory(slug: string | null): Array<{ label: string }> {
  const leaf = getLeafCategorySlug(slug);
  const map: Record<string, Array<{ label: string }>> = {
    "akilli-telefon": [
      { label: "5-15 bin TL" },
      { label: "15-30 bin TL" },
      { label: "30-60 bin TL" },
      { label: "60 bin TL ustu" },
    ],
    laptop: [
      { label: "15-30 bin TL" },
      { label: "30-50 bin TL" },
      { label: "50-80 bin TL" },
      { label: "80 bin TL ustu" },
    ],
    tablet: [
      { label: "5-15 bin TL" },
      { label: "15-30 bin TL" },
      { label: "30-60 bin TL" },
      { label: "60 bin TL ustu" },
    ],
    "akilli-saat": [
      { label: "1-5 bin TL" },
      { label: "5-15 bin TL" },
      { label: "15-30 bin TL" },
      { label: "30 bin TL ustu" },
    ],
    kulaklik: [
      { label: "1-3 bin TL" },
      { label: "3-7 bin TL" },
      { label: "7-15 bin TL" },
      { label: "15 bin TL ustu" },
    ],
    televizyon: [
      { label: "10-25 bin TL" },
      { label: "25-50 bin TL" },
      { label: "50-100 bin TL" },
      { label: "100 bin TL ustu" },
    ],
    monitor: [
      { label: "5-10 bin TL" },
      { label: "10-20 bin TL" },
      { label: "20-40 bin TL" },
      { label: "40 bin TL ustu" },
    ],
    parfum: [
      { label: "500-1.500 TL" },
      { label: "1.500-3.000 TL" },
      { label: "3.000 TL ustu" },
    ],
    deodorant: [
      { label: "0-300 TL" },
      { label: "300-700 TL" },
      { label: "700 TL ustu" },
    ],
    "kahve-makinesi": [
      { label: "2-7 bin TL" },
      { label: "7-15 bin TL" },
      { label: "15-30 bin TL" },
      { label: "30 bin TL ustu" },
    ],
    airfryer: [
      { label: "2-5 bin TL" },
      { label: "5-10 bin TL" },
      { label: "10-20 bin TL" },
      { label: "20 bin TL ustu" },
    ],
    "robot-supurge": [
      { label: "5-10 bin TL" },
      { label: "10-20 bin TL" },
      { label: "20-35 bin TL" },
      { label: "35 bin TL ustu" },
    ],
    buzdolabi: [
      { label: "15-30 bin TL" },
      { label: "30-50 bin TL" },
      { label: "50-80 bin TL" },
      { label: "80 bin TL ustu" },
    ],
    "camasir-makinesi": [
      { label: "10-20 bin TL" },
      { label: "20-35 bin TL" },
      { label: "35-60 bin TL" },
      { label: "60 bin TL ustu" },
    ],
    "bulasik-makinesi": [
      { label: "10-20 bin TL" },
      { label: "20-35 bin TL" },
      { label: "35-60 bin TL" },
      { label: "60 bin TL ustu" },
    ],
    klima: [
      { label: "15-25 bin TL" },
      { label: "25-40 bin TL" },
      { label: "40-60 bin TL" },
      { label: "60 bin TL ustu" },
    ],
    elbise: [
      { label: "500-1.500 TL" },
      { label: "1.500-3.000 TL" },
      { label: "3.000-7.000 TL" },
      { label: "7.000 TL ustu" },
    ],
    ayakkabi: [
      { label: "1-3 bin TL" },
      { label: "3-6 bin TL" },
      { label: "6-12 bin TL" },
      { label: "12 bin TL ustu" },
    ],
    sneaker: [
      { label: "1-3 bin TL" },
      { label: "3-6 bin TL" },
      { label: "6-12 bin TL" },
      { label: "12 bin TL ustu" },
    ],
    canta: [
      { label: "500-1.500 TL" },
      { label: "1.500-3.000 TL" },
      { label: "3.000-7.000 TL" },
      { label: "7.000 TL ustu" },
    ],
    mama: [
      { label: "0-500 TL" },
      { label: "500-1.000 TL" },
      { label: "1.000-2.000 TL" },
      { label: "2.000 TL ustu" },
    ],
    kum: [
      { label: "0-300 TL" },
      { label: "300-700 TL" },
      { label: "700-1.500 TL" },
      { label: "1.500 TL ustu" },
    ],
    kahve: [
      { label: "0-300 TL" },
      { label: "300-700 TL" },
      { label: "700-1.500 TL" },
      { label: "1.500 TL ustu" },
    ],
  };

  return (
    map[leaf] || [
      { label: "1-5 bin TL" },
      { label: "5-15 bin TL" },
      { label: "15-50 bin TL" },
      { label: "50 bin TL ustu" },
    ]
  );
}

function buildRecommendationDetailSuggestions(
  products: ProductForResponse[]
): Suggestion[] {
  if (products.length < 3) {
    return [
      { label: "Baska secenek", value: "baska secenek goster", type: "shortcut", icon: "🔁" },
    ];
  }

  const sorted = [...products].sort((a, b) => (a.min_price || 0) - (b.min_price || 0));
  const economic = sorted[Math.max(0, Math.floor(sorted.length * 0.2))];
  const balance = sorted[Math.max(0, Math.floor(sorted.length * 0.5))];
  const premium = sorted[Math.max(0, Math.floor(sorted.length * 0.8))];
  const suggestions: Suggestion[] = [];

  if (economic) {
    suggestions.push({
      label: "Ekonomik detay",
      value: `${economic.title} hakkinda detay`,
      type: "freetext",
      icon: "💰",
    });
  }
  if (balance && balance !== economic) {
    suggestions.push({
      label: "Denge detay",
      value: `${balance.title} hakkinda detay`,
      type: "freetext",
      icon: "⭐",
    });
  }
  if (premium && premium !== balance && premium !== economic) {
    suggestions.push({
      label: "Premium detay",
      value: `${premium.title} hakkinda detay`,
      type: "freetext",
      icon: "🚀",
    });
  }

  suggestions.push({
    label: "Baska secenek",
    value: "baska secenek goster",
    type: "shortcut",
    icon: "🔁",
  });

  return suggestions;
}

function buildPopularFollowUpSuggestions(
  intent: StructuredIntent | null,
  products: ProductForResponse[],
  userMessage: string
): Suggestion[] {
  const counts: Record<string, number> = {};
  for (const product of products) {
    if (isUsableBrand(product.brand)) {
      counts[product.brand] = (counts[product.brand] || 0) + 1;
    }
  }

  const topBrands = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([brand]) => brand);

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
      label: "Butceye gore",
      value: `${baseValue} butceye gore`,
      type: "shortcut",
      icon: "💰",
    },
    { label: "Yeni arama", value: "yeni arama", type: "shortcut" },
  ];
}
