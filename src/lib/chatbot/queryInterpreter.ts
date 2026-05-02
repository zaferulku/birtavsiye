import { KNOWN_BRANDS_TR } from "../data/known-brands";
import type { CategoryRef } from "../search/queryParser";

type PreviousSearchState = {
  category_slug?: string | null;
  brand_filter?: string[];
  variant_color_patterns?: string[];
  variant_storage_patterns?: string[];
  sort_by?: string | null;
} | null;

export type QueryCorrection = {
  from: string;
  to: string;
  kind: "brand" | "category" | "color" | "term";
};

export type ChatQueryInterpretation = {
  originalMessage: string;
  correctedMessage: string;
  searchMessage: string;
  queryTokens: string[];
  corrections: QueryCorrection[];
  shortQueryKind:
    | "none"
    | "single_word"
    | "two_word"
    | "sort_only"
    | "contextual_refine"
    | "category_reset";
  usedContextCategory: boolean;
  usedContextBrand: boolean;
  accessoryHint: boolean;
};

type LexiconEntry = {
  canonical: string;
  normalized: string;
  kind: QueryCorrection["kind"];
};

const COLOR_TERMS = [
  "siyah",
  "beyaz",
  "kirmizi",
  "mavi",
  "yesil",
  "sari",
  "pembe",
  "mor",
  "gri",
  "lacivert",
  "bordo",
  "bej",
  "krem",
  "kahverengi",
  "turuncu",
  "altin",
  "gumus",
  "bronz",
  "titanyum",
  "rose",
  "gold",
  "silver",
  "black",
  "white",
  "blue",
  "red",
  "green",
  "yellow",
  "pink",
  "purple",
  "gray",
  "grey",
  "brown",
  "orange",
] as const;

const COMMON_QUERY_TERMS = [
  "telefon",
  "akilli",
  "laptop",
  "notebook",
  "tablet",
  "kulaklik",
  "monitor",
  "televizyon",
  "saat",
  "kamera",
  "parfum",
  "deodorant",
  "serum",
  "ruj",
  "buzdolabi",
  "camasir",
  "makinesi",
  "klima",
  "elbise",
  "sneaker",
  "ayakkabi",
  "mont",
  "gomlek",
  "tisort",
  "pantolon",
  "etek",
  "kapak",
  "kilif",
  "sarj",
  "aksesuar",
  "uygun",
  "ucuz",
  "premium",
  "tavsiye",
  "oner",
  "populer",
  "stokta",
  "yorum",
  "kamera",
  "oyun",
  "pil",
  "performans",
  "kirmizi",
  "mavi",
  "siyah",
  "beyaz",
  "pro",
  "max",
  "plus",
  "ultra",
  "mini",
  "iphone",
  "galaxy",
  "redmi",
  "macbook",
  "airpods",
  "ipad",
  "watch",
  "dyson",
] as const;

const SORT_ONLY_PATTERNS = [
  /\ben populer\b/i,
  /\ben ucuz\b/i,
  /\ben dusuk fiyat\b/i,
  /\ben cok yorum\b/i,
  /\ben yuksek puan\b/i,
  /\bstokta olanlar\b/i,
  /\btavsiye ver\b/i,
  /\btelefon tavsiye\b/i,
  /\bfiyat performans\b/i,
] as const;

const ACCESSORY_HINTS = [
  "aksesuar",
  "kilif",
  "kapak",
  "sarj",
  "kablo",
  "kulaklik",
  "kayis",
  "adaptör",
  "adaptor",
] as const;

const FILLER_TOKENS = new Set([
  "olsun",
  "olsunlar",
  "goster",
  "gosterir",
  "gostersene",
  "ver",
  "verir",
  "versene",
  "istiyorum",
  "bakarim",
  "bakalim",
  "var",
  "varmi",
  "mi",
  "mu",
  "midir",
  "mudur",
  "da",
  "de",
  "biraz",
]);

const CATEGORY_ANCHORS: Record<string, string> = {
  "telefon": "akilli telefon",
  "akilli-telefon": "akilli telefon",
  "akilli-saat": "akilli saat",
  "laptop": "laptop",
  "tablet": "tablet",
  "kulaklik": "kulaklik",
  "televizyon": "televizyon",
  "monitor": "monitor",
  "kahve-makinesi": "kahve makinesi",
  "kedi-mamasi": "kedi mamasi",
  "kopek-mamasi": "kopek mamasi",
  "kedi-kumu": "kedi kumu",
  "robot-supurge": "robot supurge",
  "supurge": "supurge",
  "klima": "klima",
  "parfum": "parfum",
  "deodorant": "deodorant",
  "serum-ampul": "serum",
  "buzdolabi": "buzdolabi",
  "camasir-makinesi": "camasir makinesi",
  "bulasik-makinesi": "bulasik makinesi",
  "erkek-giyim-ust": "erkek giyim",
  "erkek-giyim-alt": "erkek giyim",
  "kadin-giyim-ust": "kadin giyim",
  "kadin-giyim-alt": "kadin giyim",
  "kadin-elbise": "elbise",
};

const FALLBACK_CATEGORY_MENTIONS = [
  "akilli telefon",
  "cep telefonu",
  "telefon",
  "laptop",
  "notebook",
  "tablet",
  "akilli saat",
  "kulaklik",
  "televizyon",
  "tv",
  "monitor",
  "kahve makinesi",
  "parfum",
  "deodorant",
  "serum",
  "robot supurge",
  "supurge",
  "klima",
  "kedi mamasi",
  "kopek mamasi",
  "kedi kumu",
] as const;

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0131/g, "i")
    .replace(/\u0130/g, "i")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitWords(value: string): string[] {
  return normalizeText(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function buildLexicon(categories: CategoryRef[]): LexiconEntry[] {
  const entries = new Map<string, LexiconEntry>();

  const addEntry = (candidate: string, kind: QueryCorrection["kind"]) => {
    const normalized = normalizeText(candidate);
    if (!normalized || normalized.length < 3) return;
    if (entries.has(normalized)) return;
    entries.set(normalized, {
      canonical: normalized,
      normalized,
      kind,
    });
  };

  for (const brand of KNOWN_BRANDS_TR) {
    for (const token of splitWords(brand)) {
      addEntry(token, "brand");
    }
  }

  for (const category of categories) {
    for (const token of splitWords(category.name)) {
      addEntry(token, "category");
    }
    for (const token of splitWords(category.slug.replace(/-/g, " "))) {
      addEntry(token, "category");
    }
  }

  for (const color of COLOR_TERMS) {
    addEntry(color, "color");
  }

  for (const term of COMMON_QUERY_TERMS) {
    addEntry(term, "term");
  }

  return Array.from(entries.values());
}

function getEditDistance(left: string, right: string): number {
  if (left === right) return 0;
  if (!left) return right.length;
  if (!right) return left.length;

  const prev = new Array<number>(right.length + 1);
  const curr = new Array<number>(right.length + 1);

  for (let j = 0; j <= right.length; j += 1) {
    prev[j] = j;
  }

  for (let i = 1; i <= left.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost
      );
    }
    for (let j = 0; j <= right.length; j += 1) {
      prev[j] = curr[j];
    }
  }

  return prev[right.length];
}

function getMaxDistance(token: string): number {
  if (token.length <= 4) return 1;
  if (token.length <= 7) return 2;
  return 3;
}

function correctToken(
  token: string,
  lexicon: LexiconEntry[]
): QueryCorrection | null {
  if (token.length < 4) return null;
  if (/^\d+$/.test(token)) return null;

  const normalized = normalizeText(token);
  if (!normalized) return null;
  if (lexicon.some((entry) => entry.normalized === normalized)) {
    return null;
  }

  let best: LexiconEntry | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  let secondBestDistance = Number.POSITIVE_INFINITY;

  for (const entry of lexicon) {
    if (Math.abs(entry.normalized.length - normalized.length) > 2) continue;
    if (entry.normalized[0] !== normalized[0]) continue;

    const distance = getEditDistance(normalized, entry.normalized);
    if (distance < bestDistance) {
      secondBestDistance = bestDistance;
      bestDistance = distance;
      best = entry;
      continue;
    }
    if (distance < secondBestDistance) {
      secondBestDistance = distance;
    }
  }

  if (!best) return null;
  if (bestDistance > getMaxDistance(normalized)) return null;
  if (secondBestDistance === bestDistance) return null;

  return {
    from: token,
    to: best.canonical,
    kind: best.kind,
  };
}

function resolveCategoryAnchor(
  categorySlug: string | null | undefined,
  categories: CategoryRef[]
): string | null {
  if (!categorySlug) return null;
  if (CATEGORY_ANCHORS[categorySlug]) return CATEGORY_ANCHORS[categorySlug];

  const normalizedSlug = normalizeText(categorySlug);
  if (normalizedSlug.includes("pet shop kedi mama")) return "kedi mamasi";
  if (normalizedSlug.includes("pet shop kopek mama")) return "kopek mamasi";
  if (normalizedSlug.includes("pet shop kedi kum")) return "kedi kumu";

  const slugLeaf = categorySlug.split("/").filter(Boolean).pop() ?? categorySlug;
  if (CATEGORY_ANCHORS[slugLeaf]) return CATEGORY_ANCHORS[slugLeaf];

  const category = categories.find((entry) => entry.slug === categorySlug);
  if (!category) {
    return normalizeText(slugLeaf.replace(/[/_-]+/g, " "));
  }

  const normalizedName = normalizeText(category.name);
  const normalizedLeaf = normalizeText(slugLeaf.replace(/-/g, " "));

  if (!normalizedName || normalizedName === "siniflandirilmamis") {
    return normalizedLeaf;
  }

  if (normalizedLeaf && !normalizedName.includes(normalizedLeaf)) {
    return normalizedLeaf;
  }

  return normalizedName;
}

function detectCategoryMention(message: string, categories: CategoryRef[]): boolean {
  const normalized = normalizeText(message);
  if (!normalized) return false;

  return (
    FALLBACK_CATEGORY_MENTIONS.some((phrase) => normalized.includes(phrase)) ||
    categories.some((category) => {
      const name = normalizeText(category.name);
      const slugText = normalizeText(category.slug.replace(/-/g, " "));
      return normalized.includes(name) || normalized.includes(slugText);
    })
  );
}

function detectBrandMention(message: string): boolean {
  const normalized = normalizeText(message);
  if (!normalized) return false;
  return KNOWN_BRANDS_TR.some((brand) =>
    splitWords(brand).some((token) => normalized.includes(token))
  );
}

function detectColorMention(tokens: string[]): boolean {
  return tokens.some((token) => COLOR_TERMS.includes(token as (typeof COLOR_TERMS)[number]));
}

function detectStorageMention(message: string): boolean {
  return /\b\d+\s?(gb|tb|mb)\b/i.test(message);
}

function detectAccessoryHint(tokens: string[]): boolean {
  return tokens.some((token) =>
    ACCESSORY_HINTS.includes(token as (typeof ACCESSORY_HINTS)[number])
  );
}

function detectSortOnly(message: string): boolean {
  return SORT_ONLY_PATTERNS.some((pattern) => pattern.test(normalizeText(message)));
}

function isCategoryResetQuery(tokens: string[], message: string, categories: CategoryRef[]): boolean {
  return tokens.length <= 2 && detectCategoryMention(message, categories) && !detectBrandMention(message);
}

export function interpretChatQuery(options: {
  message: string;
  categories: CategoryRef[];
  previousState?: PreviousSearchState;
}): ChatQueryInterpretation {
  const { message, categories, previousState = null } = options;

  const lexicon = buildLexicon(categories);
  const rawTokens = splitWords(message);
  const corrections: QueryCorrection[] = [];
  const correctedTokens = rawTokens.map((token) => {
    const correction = correctToken(token, lexicon);
    if (!correction) return token;
    corrections.push(correction);
    return correction.to;
  });

  const correctedMessage = correctedTokens.join(" ").trim() || normalizeText(message);
  const correctedWordList = splitWords(correctedMessage);
  const shortTokenCount = correctedWordList.length;
  const sortOnly = detectSortOnly(correctedMessage);
  const categoryMentioned = detectCategoryMention(correctedMessage, categories);
  const brandMentioned = detectBrandMention(correctedMessage);
  const colorMentioned = detectColorMention(correctedWordList);
  const storageMentioned = detectStorageMention(correctedMessage);
  const accessoryHint = detectAccessoryHint(correctedWordList);
  const previousBrand = previousState?.brand_filter?.[0] ?? null;
  const categoryAnchor = resolveCategoryAnchor(previousState?.category_slug, categories);

  const compactedTokens =
    shortTokenCount <= 3 || sortOnly || accessoryHint
      ? correctedWordList.filter((token) => !FILLER_TOKENS.has(token))
      : correctedWordList;
  const compactedMessage =
    compactedTokens.join(" ").trim() || correctedMessage;

  let usedContextCategory = false;
  let usedContextBrand = false;
  let searchParts = compactedMessage ? [compactedMessage] : [];

  const shouldCarryCategory =
    Boolean(categoryAnchor) &&
    !categoryMentioned &&
    (shortTokenCount <= 2 || sortOnly || accessoryHint);

  if (shouldCarryCategory && categoryAnchor) {
    searchParts.push(categoryAnchor);
    usedContextCategory = true;
  }

  const shouldCarryBrand =
    Boolean(previousBrand) &&
    !brandMentioned &&
    !isCategoryResetQuery(correctedWordList, correctedMessage, categories) &&
    (colorMentioned || storageMentioned || sortOnly || accessoryHint);

  if (shouldCarryBrand && previousBrand) {
    searchParts.unshift(normalizeText(previousBrand));
    usedContextBrand = true;
  }

  searchParts = unique(searchParts.filter(Boolean));

  let shortQueryKind: ChatQueryInterpretation["shortQueryKind"] = "none";
  if (sortOnly) shortQueryKind = "sort_only";
  else if (isCategoryResetQuery(correctedWordList, correctedMessage, categories)) {
    shortQueryKind = "category_reset";
  } else if (usedContextCategory || usedContextBrand) {
    shortQueryKind = "contextual_refine";
  } else if (shortTokenCount === 1) {
    shortQueryKind = "single_word";
  } else if (shortTokenCount === 2) {
    shortQueryKind = "two_word";
  }

  return {
    originalMessage: message,
    correctedMessage,
    searchMessage: searchParts.join(" ").trim() || correctedMessage || message,
    queryTokens: correctedWordList,
    corrections,
    shortQueryKind,
    usedContextCategory,
    usedContextBrand,
    accessoryHint,
  };
}
