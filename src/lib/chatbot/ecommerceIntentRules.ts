import { KNOWN_BRANDS_TR } from "../data/known-brands";
import type { ConversationState, MergeAction, RawIntent } from "./conversationState";
import type { IntentType } from "./intentTypes";

export type EcommerceProductType =
  | "phone"
  | "phone_case"
  | "charger"
  | "laptop"
  | "laptop_bag"
  | "mouse"
  | "mouse_pad"
  | "coffee"
  | "filter_coffee"
  | "coffee_machine"
  | "filter_coffee_machine"
  | "airfryer"
  | "fryer_oil"
  | "yoga_mat"
  | "door_mat"
  | "gaming_chair"
  | "gaming_laptop"
  | "perfume"
  | "shoes"
  | "matte_lipstick";

export type EcommerceContextCommand =
  | "none"
  | "cheaper"
  | "more_expensive"
  | "more_results"
  | "dislike";

export type EcommerceSearchAuditState = {
  activeIntent: IntentType;
  category: string | null;
  productType: EcommerceProductType | null;
  brand: string | null;
  color: string | null;
  priceRange: { min: number | null; max: number | null };
  filters: {
    storage: string | null;
    features: string[];
    command: EcommerceContextCommand;
    exactProduct: boolean;
    model: string | null;
  };
  sort: string | null;
  searchQuery: string;
  searchAction: { type: "search"; href: string };
  shouldResetContext: boolean;
  shouldKeepContext: boolean;
};

export type EcommerceContextualIntent = {
  rawIntentPatch: Partial<RawIntent>;
  productType: EcommerceProductType | null;
  categorySlug: string | null;
  brand: string | null;
  color: string | null;
  storage: string | null;
  features: string[];
  priceRange: { min: number | null; max: number | null };
  sortBy: string | null;
  command: EcommerceContextCommand;
  model: string | null;
  exactProduct: boolean;
  shouldResetContext: boolean;
  shouldKeepContext: boolean;
  searchQuery: string;
  explicitProductMention: boolean;
};

type ProductTypeRule = {
  id: EcommerceProductType;
  label: string;
  categorySlug: string;
  phrases: string[];
  priority?: number;
};

const PRODUCT_TYPE_RULES: ProductTypeRule[] = [
  {
    id: "filter_coffee_machine",
    label: "filtre kahve makinesi",
    categorySlug: "kucuk-ev-aletleri/mutfak/kahve-makinesi",
    phrases: ["filtre kahve makinesi", "filtre kahve makinasi"],
    priority: 90,
  },
  {
    id: "coffee_machine",
    label: "kahve makinesi",
    categorySlug: "kucuk-ev-aletleri/mutfak/kahve-makinesi",
    phrases: ["kahve makinesi", "kahve makinasi", "kahve makineleri", "kahve makinelerini", "espresso makinesi", "kapsullu kahve makinesi"],
    priority: 80,
  },
  {
    id: "filter_coffee",
    label: "filtre kahve",
    categorySlug: "supermarket/kahve/filtre-kahve",
    phrases: ["filtre kahve"],
    priority: 75,
  },
  {
    id: "coffee",
    label: "kahve",
    categorySlug: "supermarket/gida-icecek/kahve",
    phrases: ["cekirdek kahve", "turk kahvesi", "granul kahve", "espresso", "kahve"],
    priority: 50,
  },
  {
    id: "phone_case",
    label: "telefon kilifi",
    categorySlug: "elektronik/telefon/kilif",
    phrases: ["telefon kilifi", "telefon kilif", "telefon kiliflari", "telefon kılıfları", "cep telefonu kilifi", "iphone kilifi", "samsung kilifi", "kilif", "kılıf"],
    priority: 90,
  },
  {
    id: "charger",
    label: "sarj aleti",
    categorySlug: "elektronik/telefon/sarj-kablo",
    phrases: ["sarj aleti", "sarj cihazi", "hizli sarj", "telefon sarj aleti", "adaptör", "adaptor", "kablo"],
    priority: 85,
  },
  {
    id: "gaming_laptop",
    label: "oyuncu laptopu",
    categorySlug: "elektronik/bilgisayar-tablet/laptop",
    phrases: ["oyuncu laptopu", "gaming laptop", "oyun laptopu"],
    priority: 88,
  },
  {
    id: "phone",
    label: "telefon",
    categorySlug: "akilli-telefon",
    phrases: ["akilli telefon", "cep telefonu", "telefon", "telefonlar", "telefonlari", "telefonları", "smartphone", "iphone", "galaxy", "redmi"],
    priority: 60,
  },
  {
    id: "laptop_bag",
    label: "laptop cantasi",
    categorySlug: "elektronik/telefon/aksesuar/laptop-cantasi",
    phrases: ["laptop cantasi", "notebook cantasi", "bilgisayar cantasi"],
    priority: 88,
  },
  {
    id: "laptop",
    label: "laptop",
    categorySlug: "laptop",
    phrases: ["dizustu bilgisayar", "dizustu", "notebook", "laptop", "macbook"],
    priority: 60,
  },
  {
    id: "mouse_pad",
    label: "mouse pad",
    categorySlug: "elektronik/telefon/aksesuar/mouse-pad",
    phrases: ["mouse pad", "mousepad", "oyuncu mouse pad"],
    priority: 88,
  },
  {
    id: "mouse",
    label: "mouse",
    categorySlug: "elektronik/bilgisayar-tablet/bilesenler/cevre-birim/mouse",
    phrases: ["oyuncu mouse", "gaming mouse", "mouse", "fare"],
    priority: 60,
  },
  {
    id: "fryer_oil",
    label: "fritoz yagi",
    categorySlug: "supermarket/konserve-sos/zeytinyagi",
    phrases: ["fritoz yagi", "fritöz yağı", "kizartma yagi", "kızartma yağı"],
    priority: 88,
  },
  {
    id: "airfryer",
    label: "airfryer",
    categorySlug: "kucuk-ev-aletleri/mutfak/airfryer",
    phrases: ["airfryer", "hava fritozu", "hava fritözü", "fritoz makinesi", "fritöz makinesi"],
    priority: 70,
  },
  {
    id: "door_mat",
    label: "kapi mati",
    categorySlug: "ev-yasam/temizlik/cop-torbasi-temizlik-araclari/paspas",
    phrases: ["kapi mati", "kapı matı", "kapi paspasi", "kapı paspası", "paspas"],
    priority: 86,
  },
  {
    id: "yoga_mat",
    label: "yoga mati",
    categorySlug: "spor-outdoor/fitness/yoga-pilates",
    phrases: ["yoga mati", "yoga matı", "pilates mati", "pilates matı", "mat"],
    priority: 65,
  },
  {
    id: "gaming_chair",
    label: "oyuncu koltugu",
    categorySlug: "elektronik/oyun/konsol/oyuncu-koltuk",
    phrases: ["oyuncu koltugu", "oyuncu koltuğu", "gaming koltuk"],
    priority: 88,
  },
  {
    id: "perfume",
    label: "parfum",
    categorySlug: "parfum",
    phrases: ["parfum", "parfüm", "edp", "edt"],
    priority: 55,
  },
  {
    id: "shoes",
    label: "ayakkabi",
    categorySlug: "moda/erkek-ayakkabi/sneaker",
    phrases: ["ayakkabi", "ayakkabı", "sneaker", "spor ayakkabi", "spor ayakkabı"],
    priority: 55,
  },
  {
    id: "matte_lipstick",
    label: "mat ruj",
    categorySlug: "kozmetik/makyaj/ruj",
    phrases: ["mat ruj", "mat likit ruj"],
    priority: 92,
  },
];

PRODUCT_TYPE_RULES.sort((left, right) => {
  const leftPhraseLength = Math.max(...left.phrases.map((phrase) => normalizeEcommerceText(phrase).length));
  const rightPhraseLength = Math.max(...right.phrases.map((phrase) => normalizeEcommerceText(phrase).length));
  return (right.priority ?? 0) - (left.priority ?? 0) || rightPhraseLength - leftPhraseLength;
});

const COLOR_ALIASES: Record<string, string> = {
  beyaz: "Beyaz",
  siyah: "Siyah",
  kirmizi: "Kırmızı",
  kırmızı: "Kırmızı",
  mavi: "Mavi",
  yesil: "Yeşil",
  yeşil: "Yeşil",
  sari: "Sarı",
  sarı: "Sarı",
  pembe: "Pembe",
  mor: "Mor",
  gri: "Gri",
  lacivert: "Lacivert",
  bordo: "Bordo",
  bej: "Bej",
  krem: "Krem",
  kahverengi: "Kahverengi",
  turuncu: "Turuncu",
  gold: "Altın",
  altin: "Altın",
  altın: "Altın",
  gumus: "Gümüş",
  gümüş: "Gümüş",
  titanyum: "Titanyum",
  inox: "Inox",
  seffaf: "Şeffaf",
  şeffaf: "Şeffaf",
};

const DEFAULT_PRODUCT_TYPE_BY_CATEGORY: Record<string, EcommerceProductType> = {
  "kucuk-ev-aletleri/mutfak/kahve-makinesi": "coffee_machine",
};

const CONTEXTUAL_FILLERS = new Set([
  "olsun",
  "olan",
  "olanlar",
  "goster",
  "göster",
  "gostersene",
  "göstersene",
  "istiyorum",
  "isterim",
  "sec",
  "seç",
  "sectim",
  "seçtim",
  "tarafina",
  "tarafına",
  "gecelim",
  "geçelim",
  "bakalim",
  "bakalım",
]);

export function normalizeEcommerceText(value: string | null | undefined): string {
  return (value ?? "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9\s/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasPhrase(normalizedMessage: string, phrase: string): boolean {
  const normalizedPhrase = normalizeEcommerceText(phrase);
  if (!normalizedPhrase) return false;
  if (normalizedPhrase === "mat") return normalizedMessage === "mat";
  const re = new RegExp(`(?:^|\\s)${escapeRegExp(normalizedPhrase)}(?:\\s|$)`, "i");
  return re.test(normalizedMessage);
}

function findProductType(message: string): ProductTypeRule | null {
  const normalized = normalizeEcommerceText(message);
  if (!normalized) return null;

  let best: { rule: ProductTypeRule; score: number } | null = null;
  for (const rule of PRODUCT_TYPE_RULES) {
    for (const phrase of rule.phrases) {
      if (!hasPhrase(normalized, phrase)) continue;
      const score = normalizeEcommerceText(phrase).length + (rule.priority ?? 0);
      if (!best || score > best.score) {
        best = { rule, score };
      }
    }
  }
  return best?.rule ?? null;
}

export function findProductTypeByCategory(categorySlug: string | null | undefined): ProductTypeRule | null {
  if (!categorySlug) return null;
  const normalizedCategory = normalizeEcommerceText(categorySlug);
  const defaultType = DEFAULT_PRODUCT_TYPE_BY_CATEGORY[normalizedCategory];
  if (defaultType) {
    return PRODUCT_TYPE_RULES.find((rule) => rule.id === defaultType) ?? null;
  }
  return (
    PRODUCT_TYPE_RULES.find((rule) => normalizeEcommerceText(rule.categorySlug) === normalizedCategory) ??
    PRODUCT_TYPE_RULES.find((rule) => normalizedCategory.endsWith(`/${normalizeEcommerceText(rule.categorySlug).split("/").pop()}`)) ??
    null
  );
}

function detectBrand(message: string): string | null {
  const normalized = normalizeEcommerceText(message);
  if (!normalized) return null;
  if (/\biphone\b|\bipad\b|\bmacbook\b|\bapple watch\b/.test(normalized)) return "Apple";
  if (/\bgalaxy\b/.test(normalized)) return "Samsung";

  const brands = [...KNOWN_BRANDS_TR].sort((left, right) => right.length - left.length);
  for (const brand of brands) {
    const normalizedBrand = normalizeEcommerceText(brand);
    if (!normalizedBrand || normalizedBrand.length < 2) continue;
    const re = new RegExp(`(?:^|\\s)${escapeRegExp(normalizedBrand)}(?:\\s|$)`, "i");
    if (re.test(normalized)) return brand;
  }
  return null;
}

function hasExplicitBrandCue(message: string): boolean {
  return /\bmarka|markasi|markası|brand\b/i.test(normalizeEcommerceText(message));
}

function isColorBrandCollision(brand: string | null, color: string | null): boolean {
  return Boolean(brand && color && normalizeEcommerceText(brand) === normalizeEcommerceText(color));
}

function detectColor(message: string): string | null {
  const words = normalizeEcommerceText(message).split(/\s+/).filter(Boolean);
  for (const word of words) {
    const color = COLOR_ALIASES[word];
    if (color) return color;
  }
  return null;
}

function detectStorage(message: string): string | null {
  const match = normalizeEcommerceText(message).match(/\b(\d{1,4})\s*(gb|tb|mb)\b/i);
  if (!match) return null;
  return `${Number(match[1])}${match[2].toUpperCase()}`;
}

function detectModel(message: string): string | null {
  const normalized = normalizeEcommerceText(message);
  const iphone = normalized.match(/\biphone\s+\d{1,2}\s*(?:pro\s*max|pro|max|plus|mini)?\b/i);
  if (iphone) return titleCaseModel(iphone[0]);
  const galaxy = normalized.match(/\bgalaxy\s+[a-z]\d{1,3}\s*(?:ultra|plus|fe)?\b/i);
  if (galaxy) return titleCaseModel(galaxy[0]);
  const macbook = normalized.match(/\bmacbook\s*(?:air|pro)?\s*(?:m\d)?\b/i);
  if (macbook) return titleCaseModel(macbook[0]);
  return null;
}

function titleCaseModel(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => {
      if (/^iphone$/i.test(part)) return "iPhone";
      if (/^ipad$/i.test(part)) return "iPad";
      if (/^macbook$/i.test(part)) return "MacBook";
      if (/^(pro|max|plus|mini|ultra|air|fe)$/i.test(part)) {
        return part.slice(0, 1).toUpperCase() + part.slice(1).toLowerCase();
      }
      return part.toUpperCase();
    })
    .join(" ");
}

function detectFeatures(message: string): string[] {
  const normalized = normalizeEcommerceText(message);
  const features = new Set<string>();
  if (/\bpro\b/.test(normalized)) features.add("pro");
  if (/\bultra\b/.test(normalized)) features.add("ultra");
  if (/\bmax\b/.test(normalized)) features.add("max");
  if (/\boyun|gaming|fps\b/.test(normalized)) features.add("oyun");
  if (/\bofis|is icin|iş için\b/.test(normalized)) features.add("ofis");
  if (/\bkablosuz|wireless\b/.test(normalized)) features.add("kablosuz");
  if (/\banc|gurultu onleyici|noise cancelling\b/.test(normalized)) features.add("anc");
  if (/\bespresso\b/.test(normalized)) features.add("espresso");
  if (/\bkapsul|kapsullu\b/.test(normalized)) features.add("kapsul");
  if (/\bfiltre\b/.test(normalized)) features.add("filtre");
  return Array.from(features);
}

function parseAmount(raw: string, scale: string | undefined, fallbackScale: string | undefined): number {
  const amount = Number(raw.replace(",", ".").replace(/\./g, ""));
  if (!Number.isFinite(amount)) return 0;
  const normalizedScale = normalizeEcommerceText(scale || fallbackScale);
  if (normalizedScale === "k" || normalizedScale === "bin") return Math.round(amount * 1000);
  return Math.round(amount);
}

function scaleSmallRangeIfNeeded(min: number, max: number, scaleHint: string | undefined): { min: number; max: number } {
  const normalizedScale = normalizeEcommerceText(scaleHint);
  if ((normalizedScale === "k" || normalizedScale === "bin") && min < 1000 && max < 1000) {
    return { min: min * 1000, max: max * 1000 };
  }
  return { min, max };
}

export function extractEcommercePriceRange(message: string): { min: number | null; max: number | null } {
  const normalized = normalizeEcommerceText(message);
  let min: number | null = null;
  let max: number | null = null;

  const range = normalized.match(
    /\b(\d+(?:[.,]\d+)?)\s*(k|bin)?\s*(?:-|–|—|ile)\s*(\d+(?:[.,]\d+)?)\s*(k|bin)?\s*(?:tl|lira)?\s*(?:arasi|arasinda)?\b/i,
  );
  if (range) {
    const scaleHint = range[2] || range[4];
    const scaled = scaleSmallRangeIfNeeded(
      parseAmount(range[1], range[2], scaleHint),
      parseAmount(range[3], range[4], scaleHint),
      scaleHint,
    );
    min = Math.min(scaled.min, scaled.max);
    max = Math.max(scaled.min, scaled.max);
  }

  if (max == null) {
    const maxMatch = normalized.match(/\b(?:en fazla|max|butcem|butce)?\s*(\d+(?:[.,]\d+)?)\s*(k|bin)?\s*(?:tl|lira)?\s*(?:alti|altinda|kadar|gecmesin|ustune cikmasin)\b/i);
    if (maxMatch) max = parseAmount(maxMatch[1], maxMatch[2], undefined);
  }

  if (min == null) {
    const minMatch = normalized.match(/\b(?:en az|min)?\s*(\d+(?:[.,]\d+)?)\s*(k|bin)?\s*(?:tl|lira)?\s*(?:ustu|uzeri|altina inmesin)\b/i);
    if (minMatch) min = parseAmount(minMatch[1], minMatch[2], undefined);
  }

  return { min, max };
}

function detectCommand(message: string): EcommerceContextCommand {
  const normalized = normalizeEcommerceText(message);
  if (/\b(daha ucuz|pahali geldi|pahalı geldi|ucuzlat|butceyi dusur|bütçeyi düşür)\b/.test(normalized)) {
    return "cheaper";
  }
  if (/\b(daha pahali|daha pahalı|ust modele|üst modele|bir tik ust|bir tık üst)\b/.test(normalized)) {
    return "more_expensive";
  }
  if (/\b(begenmedim|beğenmedim|hosuma gitmedi|hoşuma gitmedi)\b/.test(normalized)) {
    return "dislike";
  }
  if (/\b(baska|başka|diger|diğer|alternatif|devamini|devamını)\b/.test(normalized)) {
    return "more_results";
  }
  return "none";
}

function detectSortBy(message: string): string | null {
  const normalized = normalizeEcommerceText(message);
  if (/\ben ucuz|fiyata gore artan|fiyat artan\b/.test(normalized)) return "price_asc";
  if (/\ben pahali|fiyata gore azalan|fiyat azalan\b/.test(normalized)) return "price_desc";
  if (/\ben populer|en popüler|cok satan|çok satan|en cok satan\b/.test(normalized)) return "best_value";
  if (/\ben iyi puan|yuksek puan|yüksek puan\b/.test(normalized)) return "rating";
  return null;
}

function getRelativePriceRange(
  prev: ConversationState | null | undefined,
  command: EcommerceContextCommand,
): { min: number | null; max: number | null } {
  if (command !== "cheaper" && command !== "more_expensive") {
    return { min: null, max: null };
  }

  const prevMin = prev?.price_min ?? null;
  const prevMax = prev?.price_max ?? null;

  if (command === "cheaper") {
    if (prevMin != null && prevMax != null) {
      return {
        min: Math.max(0, Math.round((prevMin * 0.6) / 1000) * 1000),
        max: prevMin,
      };
    }
    if (prevMax != null) {
      return { min: null, max: Math.max(0, Math.round((prevMax * 0.75) / 1000) * 1000) };
    }
    return { min: null, max: null };
  }

  if (prevMin != null && prevMax != null) {
    const width = Math.max(prevMax - prevMin, Math.round(prevMax * 0.35));
    return { min: prevMax, max: prevMax + width };
  }
  if (prevMax != null) {
    return { min: prevMax, max: Math.round((prevMax * 1.5) / 1000) * 1000 };
  }
  return { min: null, max: null };
}

function categoryMatches(left: string | null | undefined, right: string | null | undefined): boolean {
  if (!left || !right) return false;
  const normalizedLeft = normalizeEcommerceText(left);
  const normalizedRight = normalizeEcommerceText(right);
  const rightLeaf = normalizedRight.split("/").pop();
  return normalizedLeft === normalizedRight || Boolean(rightLeaf && normalizedLeft.endsWith(`/${rightLeaf}`));
}

function isExactProductIntent(message: string, model: string | null, storage: string | null, brand: string | null): boolean {
  if (!model) return false;
  if (storage) return true;
  if (!brand) return false;
  return normalizeEcommerceText(message).split(/\s+/).filter(Boolean).length >= 3;
}

function compactSearchParts(parts: Array<string | null | undefined>): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    const normalized = normalizeEcommerceText(part);
    if (!normalized || CONTEXTUAL_FILLERS.has(normalized)) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(part!.replace(/\s+/g, " ").trim());
  }
  return out.join(" ").replace(/\s+/g, " ").trim();
}

function buildSearchQuery(options: {
  message: string;
  prev: ConversationState | null | undefined;
  product: ProductTypeRule | null;
  brand: string | null;
  color: string | null;
  storage: string | null;
  features: string[];
  model: string | null;
  exactProduct: boolean;
  command: EcommerceContextCommand;
  clearBrand: boolean;
  clearColor: boolean;
  clearStorage: boolean;
  shouldKeepContext: boolean;
}): string {
  if (options.exactProduct) return options.message.trim();

  const prevProduct = findProductTypeByCategory(options.prev?.category_slug);
  const activeProduct = options.product ?? (options.shouldKeepContext ? prevProduct : null);
  const activeBrand = options.brand ?? (options.shouldKeepContext && !options.clearBrand ? options.prev?.brand_filter?.[0] ?? null : null);
  const activeColor = options.color ?? (options.shouldKeepContext && !options.clearColor ? options.prev?.variant_color_patterns?.[0] ?? null : null);
  const activeStorage = options.storage ?? (options.shouldKeepContext && !options.clearStorage ? options.prev?.variant_storage_patterns?.[0] ?? null : null);

  const meaningfulMessage = normalizeEcommerceText(options.message)
    .split(/\s+/)
    .filter((token) => token && !CONTEXTUAL_FILLERS.has(token))
    .join(" ");
  const messageAddsOnlyCommand =
    options.command !== "none" &&
    !options.product &&
    !options.brand &&
    !options.color &&
    !options.storage &&
    options.features.length === 0;
  const shouldAppendMessage =
    options.command === "none" &&
    !options.product &&
    !options.brand &&
    !options.color &&
    !options.storage &&
    options.features.length === 0;
  const featureParts = options.features.filter((feature) => {
    if (!activeProduct?.label) return true;
    return !hasPhrase(normalizeEcommerceText(activeProduct.label), feature);
  });

  return compactSearchParts([
    activeBrand,
    activeColor,
    options.model,
    activeProduct?.label,
    activeStorage,
    ...featureParts,
    messageAddsOnlyCommand ? "alternatif" : shouldAppendMessage ? meaningfulMessage : null,
  ]);
}

export function buildSearchActionHref(query: string): string {
  return `/ara?q=${encodeURIComponent(query.trim())}`;
}

export function resolveContextualEcommerceIntent(options: {
  message: string;
  previousState?: ConversationState | null;
}): EcommerceContextualIntent {
  const { message, previousState = null } = options;
  const product = findProductType(message);
  const prevProduct = findProductTypeByCategory(previousState?.category_slug);
  const color = detectColor(message);
  const detectedBrand = detectBrand(message);
  const brand =
    isColorBrandCollision(detectedBrand, color) && !hasExplicitBrandCue(message)
      ? null
      : detectedBrand;
  const storage = detectStorage(message);
  const model = detectModel(message);
  const features = detectFeatures(message);
  const absolutePrice = extractEcommercePriceRange(message);
  const sortBy = detectSortBy(message);
  const command = detectCommand(message);
  const relativePrice = getRelativePriceRange(previousState, command);
  const priceRange = {
    min: absolutePrice.min ?? relativePrice.min,
    max: absolutePrice.max ?? relativePrice.max,
  };
  const exactProduct = isExactProductIntent(message, model, storage, brand);

  const explicitProductMention = product !== null;
  const hasContextualSignal =
    brand !== null ||
    color !== null ||
    storage !== null ||
    features.length > 0 ||
    sortBy !== null ||
    command !== "none" ||
    priceRange.min !== null ||
    priceRange.max !== null;
  const shouldResetContext =
    Boolean(product?.categorySlug && previousState?.category_slug) &&
    !categoryMatches(previousState?.category_slug, product?.categorySlug);
  const shouldKeepContext =
    Boolean(previousState?.category_slug) &&
    !shouldResetContext &&
    (!explicitProductMention || categoryMatches(previousState?.category_slug, product?.categorySlug)) &&
    hasContextualSignal;

  const clearBrand =
    (command === "more_results" && !brand) ||
    (command === "dislike" && !brand);
  const clearColor =
    (command === "more_results" && !color) ||
    (command === "dislike" && !color);
  const clearStorage =
    (command === "more_results" && !storage) ||
    (command === "dislike" && !storage);

  const categorySlug =
    product?.categorySlug ??
    (shouldKeepContext ? previousState?.category_slug ?? null : null);
  const productType = product?.id ?? (shouldKeepContext ? prevProduct?.id ?? null : null);
  const searchQuery = buildSearchQuery({
    message,
    prev: previousState,
    product,
    brand,
    color,
    storage,
    features,
    model,
    exactProduct,
    command,
    clearBrand,
    clearColor,
    clearStorage,
    shouldKeepContext,
  }) || message.trim();

  const rawIntentPatch: Partial<RawIntent> = {};
  if (categorySlug) rawIntentPatch.category_slug = categorySlug;
  if (brand) rawIntentPatch.brand_filter = [brand];
  if (color) rawIntentPatch.variant_color_patterns = [color];
  if (storage) rawIntentPatch.variant_storage_patterns = [storage];
  if (features.length > 0) rawIntentPatch.features = features;
  if (priceRange.min !== null) rawIntentPatch.price_min = priceRange.min;
  if (priceRange.max !== null) rawIntentPatch.price_max = priceRange.max;
  if (sortBy) rawIntentPatch.sort_by = sortBy;
  if (clearBrand) rawIntentPatch.clear_brand_filter = true;
  if (clearColor) rawIntentPatch.clear_color_filter = true;
  if (clearStorage) rawIntentPatch.clear_storage_filter = true;
  rawIntentPatch.raw_query = searchQuery;

  return {
    rawIntentPatch,
    productType,
    categorySlug,
    brand,
    color,
    storage,
    features,
    priceRange,
    sortBy,
    command,
    model,
    exactProduct,
    shouldResetContext,
    shouldKeepContext,
    searchQuery,
    explicitProductMention,
  };
}

export function buildEcommerceSearchAudit(options: {
  message: string;
  previousState?: ConversationState | null;
  nextState: ConversationState;
  mergeAction: MergeAction;
  contextualIntent: EcommerceContextualIntent;
}): EcommerceSearchAuditState {
  const { previousState = null, nextState, mergeAction, contextualIntent } = options;
  const nextProduct =
    contextualIntent.productType ??
    findProductTypeByCategory(nextState.category_slug)?.id ??
    null;
  const searchQuery = contextualIntent.searchQuery || options.message.trim();

  return {
    activeIntent: nextState.intent_type,
    category: nextState.category_slug,
    productType: nextProduct,
    brand: nextState.brand_filter[0] ?? null,
    color: nextState.variant_color_patterns[0] ?? null,
    priceRange: {
      min: nextState.price_min ?? null,
      max: nextState.price_max ?? null,
    },
    filters: {
      storage: nextState.variant_storage_patterns[0] ?? null,
      features: nextState.features ?? [],
      command: contextualIntent.command,
      exactProduct: contextualIntent.exactProduct,
      model: contextualIntent.model,
    },
    sort: nextState.sort_by ?? null,
    searchQuery,
    searchAction: { type: "search", href: buildSearchActionHref(searchQuery) },
    shouldResetContext: mergeAction === "category_changed_reset" || contextualIntent.shouldResetContext,
    shouldKeepContext:
      contextualIntent.shouldKeepContext ||
      (
        previousState?.category_slug != null &&
        nextState.category_slug === previousState.category_slug &&
        mergeAction !== "category_changed_reset"
      ),
  };
}
