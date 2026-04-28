/**
 * Conversation state — turlar arası "akıllı carry-over".
 *
 * Felsefe:
 *   - "Filter biriktirme" YOK (yapışıyordu).
 *   - "Intent diff" VAR — yeni mesaj önceki intent ile karşılaştırılır.
 *
 * Karar matrisi:
 *   USER eyleyen          → STATE değişimi
 *   ─────────────────────────────────────────────────────────────
 *   yeni dimension ekler  → AND (samsung'a "kırmızı" ekle)
 *   aynı dim'i değiştirir → REPLACE (kırmızı → mavi)
 *   dim'i çıkartır        → REMOVE ("renk farketmez", "marka önemli değil")
 *   kategori değişir      → RESET (telefon → laptop = tertemiz başla)
 *   single word kategori  → KEEP_CATEGORY_DROP_FILTERS ("telefon" → kategori
 *                            kalsın, brand/color sıfırla — alternatife bakıyor)
 *   shortcut chip         → preserveCategoryOnly (popüler / tavsiye)
 */

import type { IntentType } from "./intentTypes";

export interface ConversationState {
  /** Üst-düzey niyet — "product_search" varsayılan (mevcut akış). */
  intent_type: IntentType;
  category_slug: string | null;
  brand_filter: string[];
  variant_color_patterns: string[];
  variant_storage_patterns: string[];
  price_min: number | null;
  price_max: number | null;
  /** Son turda hangi dimension'lar set edildi — diff için */
  last_set_dimensions: string[];
  /** Kaç turdur aynı kategoride — "alternatife bak" sinyali için */
  turn_count_in_category: number;
}

export function emptyState(): ConversationState {
  return {
    intent_type: "product_search",
    category_slug: null,
    brand_filter: [],
    variant_color_patterns: [],
    variant_storage_patterns: [],
    price_min: null,
    price_max: null,
    last_set_dimensions: [],
    turn_count_in_category: 0,
  };
}

export interface RawIntent {
  /** Heuristic/LLM ile tespit edilmiş intent_type — eksikse product_search varsayılır. */
  intent_type?: IntentType;
  category_slug?: string | null;
  brand_filter?: string[];
  variant_color_patterns?: string[];
  variant_storage_patterns?: string[];
  price_min?: number | null;
  price_max?: number | null;
  raw_query?: string;
  keywords?: string[];
}

const CATEGORY_KEYWORDS = new Set([
  "telefon", "akilli telefon", "smartphone", "phone",
  "laptop", "dizustu", "notebook",
  "tablet",
  "televizyon", "tv",
  "kahve makinesi", "kahve makinasi",
  "bulasik makinesi", "camasir makinesi",
  "fon", "sac kurutma",
  "akilli saat", "smartwatch",
  "kulaklik", "kulaklık",
  "kamera", "fotograf makinesi",
  "klima",
  "buzdolabi", "firin",
]);

const REMOVAL_PHRASES = [
  "farketmez", "fark etmez", "fark etmiyor", "önemli değil", "onemli degil",
  "her şey", "her sey", "hepsini", "tümü", "tumu",
  "marka önemli değil", "renk farketmez", "fiyat önemli değil",
];

function normalize(s: string): string {
  return (s ?? "").toLowerCase()
    .replace(/ı/g, "i").replace(/İ/g, "i")
    .replace(/ş/g, "s").replace(/ğ/g, "g")
    .replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c")
    .trim();
}

function isSingleWordCategory(msg: string): boolean {
  const norm = normalize(msg);
  if (norm.split(/\s+/).length > 3) return false;
  for (const kw of CATEGORY_KEYWORDS) {
    if (norm === normalize(kw)) return true;
  }
  return false;
}

function detectRemoval(msg: string): { brand?: boolean; color?: boolean; price?: boolean } {
  const norm = normalize(msg);
  const out: { brand?: boolean; color?: boolean; price?: boolean } = {};
  for (const phrase of REMOVAL_PHRASES) {
    if (norm.includes(normalize(phrase))) {
      if (norm.includes("marka")) out.brand = true;
      if (norm.includes("renk")) out.color = true;
      if (norm.includes("fiyat") || norm.includes("butce")) out.price = true;
      if (Object.keys(out).length === 0) out.color = true;
    }
  }
  return out;
}

export function mergeIntent(
  prev: ConversationState,
  rawIntent: RawIntent,
  userMessage: string,
  intentHint?: { category_slug?: string | null } | null,
): { next: ConversationState; action: string } {
  // 0. INTENT TYPE DEĞİŞTİ — non-product mesajlar için filters'ı KORU
  // (kullanıcı "merhaba" deyip sonra "telefon" derse, telefon araması için
  //  state baştan başlamasın — sadece intent_type "greeting" olarak işaretlensin.)
  const newIntentType = rawIntent.intent_type ?? "product_search";
  if (newIntentType !== "product_search") {
    return {
      next: {
        ...prev,
        intent_type: newIntentType,
      },
      action: `intent_type_${newIntentType}`,
    };
  }

  // intent_type === "product_search" — mevcut tüm logic devam:
  // Eğer prev.intent_type non-product idiyse, şimdi product_search'e geçilir.
  const baseIntentType: IntentType = "product_search";

  const newCategory = intentHint?.category_slug ?? rawIntent.category_slug ?? null;
  if (newCategory && prev.category_slug && newCategory !== prev.category_slug) {
    return {
      next: { ...emptyState(), category_slug: newCategory, turn_count_in_category: 1 },
      action: "category_changed_reset",
    };
  }
  const msgNorm = normalize(userMessage);
  const isShortcut = /^(en populer|hepsini goster|tavsiye ver|yeni arama)/i.test(msgNorm);
  if (isShortcut) {
    return {
      next: {
        ...emptyState(),
        category_slug: prev.category_slug ?? newCategory,
        turn_count_in_category: prev.turn_count_in_category + 1,
      },
      action: "shortcut_keep_category",
    };
  }
  if (
    isSingleWordCategory(userMessage) &&
    prev.category_slug &&
    (newCategory === prev.category_slug || !newCategory)
  ) {
    return {
      next: {
        ...emptyState(),
        category_slug: prev.category_slug,
        turn_count_in_category: prev.turn_count_in_category + 1,
      },
      action: "single_word_widen",
    };
  }
  const removals = detectRemoval(userMessage);
  if (Object.keys(removals).length > 0) {
    const next = {
      ...prev,
      intent_type: baseIntentType,
      turn_count_in_category: prev.turn_count_in_category + 1,
    };
    if (removals.brand) next.brand_filter = [];
    if (removals.color) next.variant_color_patterns = [];
    if (removals.price) { next.price_min = null; next.price_max = null; }
    next.category_slug = newCategory ?? prev.category_slug;
    return { next, action: "user_requested_removal" };
  }
  const setDimensions: string[] = [];
  const next: ConversationState = {
    intent_type: baseIntentType,
    category_slug: newCategory ?? prev.category_slug,
    brand_filter: prev.brand_filter,
    variant_color_patterns: prev.variant_color_patterns,
    variant_storage_patterns: prev.variant_storage_patterns,
    price_min: prev.price_min,
    price_max: prev.price_max,
    last_set_dimensions: [],
    turn_count_in_category:
      newCategory && newCategory !== prev.category_slug
        ? 1
        : prev.turn_count_in_category + 1,
  };
  if (rawIntent.brand_filter?.length) { next.brand_filter = rawIntent.brand_filter; setDimensions.push("brand"); }
  if (rawIntent.variant_color_patterns?.length) { next.variant_color_patterns = rawIntent.variant_color_patterns; setDimensions.push("color"); }
  if (rawIntent.variant_storage_patterns?.length) { next.variant_storage_patterns = rawIntent.variant_storage_patterns; setDimensions.push("storage"); }
  if (rawIntent.price_min != null) { next.price_min = rawIntent.price_min; setDimensions.push("price_min"); }
  if (rawIntent.price_max != null) { next.price_max = rawIntent.price_max; setDimensions.push("price_max"); }
  next.last_set_dimensions = setDimensions;
  return { next, action: setDimensions.length > 0 ? "merge_with_new_dims" : "no_new_dims_keep" };
}

export function rebuildStateFromHistory(
  history: Array<{ role: string; content: string; meta?: Partial<ConversationState> }>,
): ConversationState {
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    if (m.role === "assistant" && m.meta?.category_slug !== undefined) {
      return { ...emptyState(), ...m.meta };
    }
  }
  return emptyState();
}
