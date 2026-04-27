import type { SupabaseClient } from "@supabase/supabase-js";

type SpecMap = Record<string, string>;

type ExistingProductRow = {
  id: string;
  title: string;
  slug: string | null;
  brand: string | null;
  category_id: string | null;
  model_code: string | null;
  model_family: string | null;
  variant_storage: string | null;
  variant_color: string | null;
  image_url: string | null;
  specs: Record<string, unknown> | null;
};

export type ProductIdentity = {
  originalTitle: string;
  brand: string;
  slug: string;
  canonicalTitle: string;
  modelCode: string | null;
  modelFamily: string | null;
  variantStorage: string | null;
  variantColor: string | null;
};

type InferIdentityInput = {
  title: string;
  brand?: string | null;
  specs?: SpecMap | null;
};

type ResolveExistingProductInput = {
  sb: SupabaseClient;
  identity: ProductIdentity;
  categoryId?: string;
};

type BuildUpdatePayloadInput = {
  existing: ExistingProductRow;
  identity: ProductIdentity;
  imageUrl?: string | null;
  specs?: SpecMap | null;
};

type BuildCreatePayloadInput = {
  identity: ProductIdentity;
  categoryId: string;
  imageUrl?: string | null;
  specs?: SpecMap | null;
};

const PRODUCT_FIELDS =
  "id, title, slug, brand, category_id, model_code, model_family, variant_storage, variant_color, image_url, specs";

// Brand alias: title'da X geçerse brand = Y kabul et
// Örn. "iPhone 17 Pro" başlığı → brand=Apple, "Galaxy S25" → Samsung
const BRAND_TITLE_ALIASES: Array<[RegExp, string]> = [
  [/\biphone\b/i, "Apple"],
  [/\bipad\b/i, "Apple"],
  [/\bmacbook\b/i, "Apple"],
  [/\bairpods\b/i, "Apple"],
  [/\bapple watch\b/i, "Apple"],
  [/\bgalaxy (s|a|z|note|tab|watch|buds)\b/i, "Samsung"],
  [/\bredmi\b/i, "Xiaomi"],
  [/\bpoco\b/i, "Xiaomi"],
  [/\bpixel\b/i, "Google"],
  [/\bthinkpad\b|\bideapad\b|\byoga (slim|pro|book)\b|\blegion\b/i, "Lenovo"],
  [/\brog\b|\btuf\b|\bvivobook\b|\bzenbook\b|\bexpertbook\b/i, "Asus"],
  [/\bomen\b|\bvictus\b|\bpavilion\b|\belitebook\b|\bprobook\b|\bzbook\b/i, "HP"],
  [/\bnitro\b|\baspire\b|\btravelmate\b|\bpredator\b/i, "Acer"],
];

const KNOWN_BRANDS = [
  "Apple",
  "Google",
  "Samsung",
  "Xiaomi",
  "Redmi",
  "Poco",
  "Huawei",
  "Honor",
  "Lenovo",
  "HP",
  "Dell",
  "Asus",
  "Acer",
  "MSI",
  "Monster",
  "Casper",
  "Vestel",
  "Beko",
  "Arcelik",
  "Ar\u00e7elik",
  "Grundig",
  "Philips",
  "Bosch",
  "Siemens",
  "Dyson",
  "Tefal",
  "Patriot",
  "JBL",
  "Targus",
  "Garmin",
  "Sony",
  "LG",
  "MediaMarkt",
  "PttAVM",
  "Vatan",
  "Trendyol",
  "Hepsiburada",
];

const COLOR_ALIASES: Array<[string, string]> = [
  // iPhone 17 (2025) renkleri
  ["sis mavisi", "Sis Mavisi"],
  ["mist blue", "Sis Mavisi"],
  ["kozmik turuncu", "Kozmik Turuncu"],
  ["cosmic orange", "Kozmik Turuncu"],
  ["lavanta", "Lavanta"],
  ["lavender", "Lavanta"],
  ["adacayi", "Ada\u00e7ay\u0131"],
  ["sage", "Ada\u00e7ay\u0131"],
  // iPhone 17 Pro renkleri
  ["natural titanium", "Nat\u00fcrel Titanyum"],
  ["dogal titanyum", "Nat\u00fcrel Titanyum"],
  ["white titanium", "Beyaz Titanyum"],
  ["black titanium", "Siyah Titanyum"],
  ["desert titanium", "\u00c7\u00f6l Titanyum"],
  ["blue titanium", "Mavi Titanyum"],
  ["space gray", "Uzay Grisi"],
  ["space grey", "Uzay Grisi"],
  ["midnight black", "Gece Siyah\u0131"],
  ["deep purple", "Derin Mor"],
  ["deep blue", "Derin Mavi"],
  ["jet black", "Parlak Siyah"],
  ["pearl white", "\u0130nci Beyaz\u0131"],
  ["rose gold", "G\u00fcl Alt\u0131n\u0131"],
  ["starlight", "Y\u0131ld\u0131z I\u015f\u0131\u011f\u0131"],
  ["midnight", "Gece Yar\u0131s\u0131"],
  ["graphite", "Grafit"],
  ["silver", "G\u00fcm\u00fc\u015f"],
  ["gold", "Alt\u0131n"],
  ["black", "Siyah"],
  ["white", "Beyaz"],
  ["grey", "Gri"],
  ["gray", "Gri"],
  ["blue", "Mavi"],
  ["green", "Ye\u015fil"],
  ["red", "K\u0131rm\u0131z\u0131"],
  ["purple", "Mor"],
  ["pink", "Pembe"],
  ["yellow", "Sar\u0131"],
  ["orange", "Turuncu"],
  ["beige", "Bej"],
  ["brown", "Kahverengi"],
  ["navy", "Lacivert"],
  ["khaki", "Haki"],
  ["titanyum", "Titanyum"],
  ["siyah", "Siyah"],
  ["beyaz", "Beyaz"],
  ["gri", "Gri"],
  ["mavi", "Mavi"],
  ["yesil", "Ye\u015fil"],
  ["kirmizi", "K\u0131rm\u0131z\u0131"],
  ["mor", "Mor"],
  ["pembe", "Pembe"],
  ["sari", "Sar\u0131"],
  ["turuncu", "Turuncu"],
  ["bej", "Bej"],
  ["kahve", "Kahverengi"],
  ["lacivert", "Lacivert"],
];

const MODEL_FAMILY_OVERRIDES: Record<string, string[]> = {
  Apple: [
    "iPhone 17 Pro Max",
    "iPhone 17 Pro",
    "iPhone 17 Plus",
    "iPhone 17",
    "iPhone 16 Pro Max",
    "iPhone 16 Pro",
    "iPhone 16 Plus",
    "iPhone 16e",
    "iPhone 16",
    "iPhone 15 Pro Max",
    "iPhone 15 Pro",
    "iPhone 15 Plus",
    "iPhone 15",
    "iPhone 14 Pro Max",
    "iPhone 14 Pro",
    "iPhone 14 Plus",
    "iPhone 14",
    "iPhone 13 Pro Max",
    "iPhone 13 Pro",
    "iPhone 13 mini",
    "iPhone 13",
    "iPhone 12 Pro Max",
    "iPhone 12 Pro",
    "iPhone 12 mini",
    "iPhone 12",
    "iPhone 11 Pro Max",
    "iPhone 11 Pro",
    "iPhone 11",
    "iPhone SE",
    "MacBook Air",
    "MacBook Pro",
    "iPad Air",
    "iPad Pro",
    "iPad mini",
    "Apple Watch Ultra",
    "Apple Watch Series",
  ],
  Samsung: [
    "Galaxy S26 Ultra",
    "Galaxy S25 Ultra",
    "Galaxy S24 Ultra",
    "Galaxy S23 Ultra",
    "Galaxy S26 Plus",
    "Galaxy S25 Plus",
    "Galaxy S24 Plus",
    "Galaxy S23 Plus",
    "Galaxy S26 FE",
    "Galaxy S25 FE",
    "Galaxy S24 FE",
    "Galaxy S23 FE",
    "Galaxy S26",
    "Galaxy S25",
    "Galaxy S24",
    "Galaxy S23",
    "Galaxy S22",
    "Galaxy A55",
    "Galaxy A54",
    "Galaxy A53",
    "Galaxy A35",
    "Galaxy A34",
    "Galaxy A26",
    "Galaxy A25",
    "Galaxy A24",
    "Galaxy A15",
    "Galaxy A14",
    "Galaxy A13",
    "Galaxy A12",
    "Galaxy A07",
    "Galaxy A06",
    "Galaxy A05",
    "Galaxy Z Fold",
    "Galaxy Z Flip",
  ],
  Xiaomi: [
    "Redmi Note 14 Pro Plus",
    "Redmi Note 14 Pro",
    "Redmi Note 14",
    "Redmi Note 13 Pro Plus",
    "Redmi Note 13 Pro",
    "Redmi Note 13",
    "Redmi 14C",
    "Redmi 13C",
    "Redmi 12C",
    "Xiaomi 15 Pro",
    "Xiaomi 15",
    "Xiaomi 14 Pro",
    "Xiaomi 14",
    "Poco X7 Pro",
    "Poco X6 Pro",
    "Poco F6 Pro",
    "Poco F6",
    "Poco M6",
  ],
  Huawei: [
    "Mate X6",
    "Mate 60 Pro Plus",
    "Mate 60 Pro",
    "Mate 60",
    "Pura 80 Ultra",
    "Pura 80 Pro Plus",
    "Pura 80 Pro",
    "Pura 80",
    "Pura 70 Ultra",
    "Pura 70 Pro Plus",
    "Pura 70 Pro",
    "Pura 70",
    "Nova 14 Pro",
    "Nova 14",
    "Nova 13 Pro",
    "Nova 13",
  ],
};

const GENERIC_TITLE_PHRASES = [
  "akilli telefon",
  "cep telefonu",
  "smartphone",
  "telefon",
  "notebook",
  "dizustu",
  "laptop",
  "tablet",
  "smart tv",
  "televizyon",
  "kulaklik",
  "wireless",
  "kablosuz",
  "uygulamali",
  "dokunmatik",
  "oled",
  "amoled",
  "led",
  "lcd",
  "uhd",
  "4k",
  "8k",
  "5g",
  "4g",
  "wifi",
  "bluetooth",
];

const FAMILY_STOPWORDS = new Set([
  "akilli",
  "telefon",
  "telefonu",
  "cep",
  "notebook",
  "dizustu",
  "laptop",
  "tablet",
  "tv",
  "televizyon",
  "smart",
  "wireless",
  "kablosuz",
  "uygulamali",
  "dokunmatik",
  "oled",
  "amoled",
  "led",
  "lcd",
  "uhd",
  "ram",
  "ssd",
  "hdd",
  "in",
  "inc",
  "inch",
  "fps",
  "mah",
  "mp",
  "hz",
  "cm",
  "mm",
  "tws",
]);

function transliterate(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0131/g, "i")
    .replace(/\u0130/g, "I");
}

function normalizeText(text: string | null | undefined): string {
  return transliterate(text ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCompact(text: string | null | undefined): string {
  return normalizeText(text).replace(/\s+/g, "");
}

function toSlug(text: string): string {
  return transliterate(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

function titleizeSegment(value: string): string {
  const lower = value.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function dedupeBrandPrefix(brand: string): string {
  const parts = brand.split(/\s+/).filter(Boolean);
  if (parts.length >= 2 && normalizeText(parts[0]) === normalizeText(parts[1])) {
    return parts.slice(0, 1).join(" ");
  }
  return parts.join(" ");
}

function extractBrand(title: string, brandHint?: string | null): string {
  const rawHint = dedupeBrandPrefix((brandHint ?? "").trim());
  if (rawHint) {
    const matchedBrand = KNOWN_BRANDS.find(
      (brand) => normalizeText(brand) === normalizeText(rawHint)
    );
    if (matchedBrand) return matchedBrand;
    if (rawHint.length >= 2) {
      return rawHint
        .split(/\s+/)
        .map((part) => titleizeSegment(part))
        .join(" ");
    }
  }

  const normalizedTitle = normalizeText(title);
  for (const brand of KNOWN_BRANDS.sort((left, right) => right.length - left.length)) {
    const normalizedBrand = normalizeText(brand);
    if (normalizedTitle.startsWith(`${normalizedBrand} `) || normalizedTitle === normalizedBrand) {
      return brand;
    }
  }

  // Brand alias: title içinde tanınan model anahtarı varsa brand'a yönlendir
  // ("iPhone 17 512 Gb Sis Mavisi" → Apple, "Galaxy S25" → Samsung)
  for (const [pattern, brand] of BRAND_TITLE_ALIASES) {
    if (pattern.test(title)) return brand;
  }

  const firstToken = title.split(/\s+/).find(Boolean) ?? "Unknown";
  return titleizeSegment(transliterate(firstToken));
}

function extractSpecValue(specs: SpecMap | null | undefined, patterns: RegExp[]): string | null {
  if (!specs) return null;
  for (const [rawKey, rawValue] of Object.entries(specs)) {
    const key = normalizeText(rawKey);
    if (!patterns.some((pattern) => pattern.test(key))) continue;
    const value = String(rawValue ?? "").trim();
    if (value) return value;
  }
  return null;
}

function isStorageLikeToken(value: string): boolean {
  return /^(\d{1,4})(gb|tb|mb)$/i.test(value);
}

function normalizeModelCodeCandidate(value: string | null | undefined): string | null {
  const compact = transliterate(value ?? "")
    .toUpperCase()
    .replace(/[()[\]{}]/g, " ")
    .split(/[,;|]+/)[0]
    ?.replace(/\s+/g, "")
    .replace(/[^A-Z0-9/-]+/g, "")
    .trim();

  if (!compact) return null;
  if (compact.length < 4) return null;
  if (isStorageLikeToken(compact)) return null;
  if (/^\d{4,}$/.test(compact)) return null;
  if (!/[A-Z]/.test(compact) || !/\d/.test(compact)) return null;
  if (/^(4K|8K|4G|5G|WIFI\d*|DDR\d)$/i.test(compact)) return null;

  return compact;
}

function extractModelCode(title: string, specs?: SpecMap | null): string | null {
  const specCode = extractSpecValue(specs, [
    /\bmpn\b/i,
    /\bsku\b/i,
    /\bmodel\b/i,
    /\bmodel kod\b/i,
    /\bmodel no\b/i,
    /\bmodel numarasi\b/i,
    /\burun kod\b/i,
    /\bstok kod\b/i,
    /\bparca numarasi\b/i,
    /\bpart number\b/i,
    /\bproduct code\b/i,
    /\bmanufacturer code\b/i,
  ]);
  const normalizedSpecCode = normalizeModelCodeCandidate(specCode);
  if (normalizedSpecCode) return normalizedSpecCode;

  const tokens = title
    .replace(/[()]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  for (const token of tokens) {
    const cleaned = normalizeModelCodeCandidate(token);
    if (cleaned) return cleaned;
  }

  return null;
}

function extractVariantStorage(title: string, specs?: SpecMap | null): string | null {
  const explicitSpecValue = extractSpecValue(specs, [
    /\bhafiza\b/i,
    /\bdepolama\b/i,
    /\bstorage\b/i,
    /\bkapasite\b/i,
    /\bssd\b/i,
    /\bhdd\b/i,
    /\bdisk\b/i,
    /\brom\b/i,
  ]);

  const sources = [explicitSpecValue, title].filter((value): value is string => Boolean(value));
  const matches: Array<{ value: string; size: number; score: number }> = [];

  for (const source of sources) {
    const iterator = source.matchAll(/\b(\d{1,4})\s*(tb|gb|mb)\b/gi);
    for (const match of iterator) {
      const size = Number(match[1]);
      const unit = match[2].toUpperCase();
      if (!Number.isFinite(size)) continue;
      if (unit === "MB") continue;

      const value = `${size}${unit}`;
      const multiplier = unit === "TB" ? 1024 : 1;
      const score = size * multiplier;
      matches.push({ value, size, score });
    }
  }

  if (matches.length === 0) return null;

  const explicitMatch = matches.find(({ value }) => explicitSpecValue?.toUpperCase().includes(value.toUpperCase()));
  if (explicitMatch) return explicitMatch.value;

  const titleContext = normalizeText(title);
  const hasStorageContext =
    /\b(ssd|hdd|nvme|depolama|hafiza|storage|rom|disk|drive|iphone|galaxy|redmi|xiaomi|telefon|phone|tablet|ipad|macbook|laptop|notebook|usb|flash)\b/i.test(
      titleContext
    );

  const filtered = matches
    .sort((left, right) => right.score - left.score)
    .filter((match, index, list) => index === list.findIndex((item) => item.value === match.value))
    .filter((match) => match.size >= 32 || matches.length > 1 || hasStorageContext);

  return filtered[0]?.value ?? null;
}

function extractVariantColor(title: string, specs?: SpecMap | null): string | null {
  const sources = [extractSpecValue(specs, [/\brenk\b/i, /\bcolor\b/i]), title]
    .filter((value): value is string => Boolean(value))
    .map((value) => normalizeText(value));

  const aliases = [...COLOR_ALIASES].sort((left, right) => right[0].length - left[0].length);
  for (const source of sources) {
    for (const [alias, canonical] of aliases) {
      const normalizedAlias = normalizeText(alias);
      if (
        source === normalizedAlias ||
        source.startsWith(`${normalizedAlias} `) ||
        source.endsWith(` ${normalizedAlias}`) ||
        source.includes(` ${normalizedAlias} `)
      ) {
        return canonical;
      }
    }
  }

  return null;
}

function stripKnownPhrases(value: string): string {
  let working = value;

  for (const phrase of GENERIC_TITLE_PHRASES) {
    const pattern = new RegExp(`\\b${phrase.replace(/\s+/g, "\\s+")}\\b`, "gi");
    working = working.replace(pattern, " ");
  }

  for (const [alias] of COLOR_ALIASES) {
    const pattern = new RegExp(`\\b${alias.replace(/\s+/g, "\\s+")}\\b`, "gi");
    working = working.replace(pattern, " ");
  }

  working = working
    .replace(/\b\d{1,4}\s*(GB|TB|MB)\b/gi, " ")
    .replace(/\b(4|6|8|12|16|24|32)\s*GB\s*RAM\b/gi, " ")
    .replace(/\b\d{1,3}\s*(INC|INCH|IN)\b/gi, " ")
    .replace(/\b\d{1,4}\s*(HZ|FPS|MP|MAH|CM|MM|W)\b/gi, " ")
    .replace(/[(),/|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return working;
}

function normalizeFamilyToken(token: string): string {
  const cleaned = token.replace(/[^A-Za-z0-9-]/g, "");
  return cleaned.replace(/-\d{2,4}(GB|TB)[A-Za-z0-9-]*$/i, "");
}

function extractModelFamily(title: string, brand: string, modelCode: string | null): string | null {
  const overrides = MODEL_FAMILY_OVERRIDES[brand];
  if (overrides) {
    const lowerTitle = title.toLowerCase();
    const matched = overrides
      .slice()
      .sort((left, right) => right.length - left.length)
      .find((family) => lowerTitle.includes(family.toLowerCase()));

    if (matched) return matched;
  }

  let working = stripKnownPhrases(title);
  const brandPattern = new RegExp(`^${brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+`, "i");
  working = working.replace(brandPattern, "").trim();
  if (modelCode) {
    const modelCodePattern = new RegExp(`\\b${modelCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    working = working.replace(modelCodePattern, " ").replace(/\s+/g, " ").trim();
  }

  const tokens = working.split(/\s+/).filter(Boolean);
  const familyTokens: string[] = [];

  for (const rawToken of tokens) {
    const normalized = normalizeText(rawToken);
    if (!normalized) continue;
    if (FAMILY_STOPWORDS.has(normalized)) break;
    if (/^\d{2,4}$/.test(normalized)) {
      if (familyTokens.length === 0) continue;
      familyTokens.push(rawToken);
      if (familyTokens.length >= 4) break;
      continue;
    }
    if (/^\d{1,4}(gb|tb|mb)$/.test(normalized)) break;

    const cleaned = normalizeFamilyToken(rawToken);
    if (!cleaned) continue;
    familyTokens.push(cleaned);
    if (familyTokens.length >= 4) break;
  }

  const family = familyTokens.join(" ").replace(/\s+/g, " ").trim();
  if (!family || family.length < 2) return null;
  return family;
}

function buildCanonicalTitle(
  originalTitle: string,
  brand: string,
  modelFamily: string | null,
  modelCode: string | null,
  variantStorage: string | null,
  variantColor: string | null
): string {
  const titleStem = modelFamily ?? modelCode;
  if (!titleStem) return originalTitle.trim();

  return [brand, titleStem, variantStorage, variantColor].filter(Boolean).join(" ");
}

function normalizeVariantMatch(existingValue: string | null, incomingValue: string | null): boolean {
  if (!incomingValue) return true;
  if (!existingValue) return false;
  return normalizeCompact(existingValue) === normalizeCompact(incomingValue);
}

function normalizeVariantCompatible(existingValue: string | null, incomingValue: string | null): boolean {
  if (!incomingValue) return true;
  if (!existingValue) return true;
  return normalizeCompact(existingValue) === normalizeCompact(incomingValue);
}

function hasRandomSlugSuffix(slug: string | null | undefined): boolean {
  return /-[a-z0-9]{4,6}$/i.test(slug ?? "");
}

function isStructuredExistingTitle(candidate: ExistingProductRow): boolean {
  const composed = [
    candidate.brand,
    candidate.model_family,
    candidate.variant_storage,
    candidate.variant_color,
  ]
    .filter(Boolean)
    .map((part) => normalizeText(part))
    .join(" ")
    .trim();

  if (!composed) return false;
  return normalizeText(candidate.title) === composed;
}

function getVariantScore(existingValue: string | null, incomingValue: string | null): number {
  if (!incomingValue) return existingValue ? 0 : 2;
  if (!existingValue) return 4;
  return normalizeCompact(existingValue) === normalizeCompact(incomingValue) ? 12 : -40;
}

function getCandidateScore(
  candidate: ExistingProductRow,
  identity: ProductIdentity,
  categoryId?: string
): number {
  let score = 0;

  if (categoryId && candidate.category_id === categoryId) score += 40;
  if (normalizeCompact(candidate.brand) === normalizeCompact(identity.brand)) score += 10;
  if (normalizeCompact(candidate.slug) === normalizeCompact(identity.slug)) score += 30;
  if (normalizeCompact(candidate.title) === normalizeCompact(identity.canonicalTitle)) score += 20;
  if (
    identity.modelCode &&
    normalizeCompact(candidate.model_code) === normalizeCompact(identity.modelCode)
  ) {
    score += 35;
  }
  if (
    identity.modelFamily &&
    normalizeCompact(candidate.model_family) === normalizeCompact(identity.modelFamily)
  ) {
    score += 20;
  }

  score += getVariantScore(candidate.variant_storage, identity.variantStorage);
  score += getVariantScore(candidate.variant_color, identity.variantColor);

  if (candidate.image_url) score += 4;
  if (candidate.model_code) score += 4;
  if (candidate.model_family) score += 3;
  if (isStructuredExistingTitle(candidate)) score += 5;
  if (candidate.slug && !hasRandomSlugSuffix(candidate.slug)) score += 3;

  return score;
}

function compareCandidateRank(
  left: ExistingProductRow,
  right: ExistingProductRow,
  identity: ProductIdentity,
  categoryId?: string
): number {
  const scoreDiff = getCandidateScore(right, identity, categoryId) - getCandidateScore(left, identity, categoryId);
  if (scoreDiff !== 0) return scoreDiff;

  const leftCompleteness = [
    left.image_url,
    left.model_code,
    left.model_family,
    left.variant_storage,
    left.variant_color,
  ].filter(Boolean).length;
  const rightCompleteness = [
    right.image_url,
    right.model_code,
    right.model_family,
    right.variant_storage,
    right.variant_color,
  ].filter(Boolean).length;
  if (rightCompleteness !== leftCompleteness) return rightCompleteness - leftCompleteness;

  return left.id.localeCompare(right.id);
}

function chooseSingleCandidate(
  candidates: ExistingProductRow[],
  identity: ProductIdentity,
  categoryId?: string
): ExistingProductRow | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const sameCategory = categoryId
    ? candidates.filter((candidate) => candidate.category_id === categoryId)
    : [];
  if (sameCategory.length === 1) return sameCategory[0];

  const slugMatch = candidates.filter(
    (candidate) => normalizeCompact(candidate.slug) === normalizeCompact(identity.slug)
  );
  if (slugMatch.length === 1) return slugMatch[0];

  const ranked = [...candidates].sort((left, right) =>
    compareCandidateRank(left, right, identity, categoryId)
  );
  const best = ranked[0];
  if (!best) return null;

  if (getCandidateScore(best, identity, categoryId) <= 0) {
    return null;
  }

  // Deterministically prefer the strongest existing canonical candidate so new syncs
  // do not keep opening fresh duplicates for the same product identity.
  return best;
}

export function inferProductIdentity(input: InferIdentityInput): ProductIdentity {
  const brand = extractBrand(input.title, input.brand);
  const modelCode = extractModelCode(input.title, input.specs);
  const variantStorage = extractVariantStorage(input.title, input.specs);
  const variantColor = extractVariantColor(input.title, input.specs);
  const modelFamily = extractModelFamily(input.title, brand, modelCode);
  const canonicalTitle = buildCanonicalTitle(
    input.title,
    brand,
    modelFamily,
    modelCode,
    variantStorage,
    variantColor
  );

  return {
    originalTitle: input.title.trim(),
    brand,
    slug: toSlug(canonicalTitle),
    canonicalTitle,
    modelCode,
    modelFamily,
    variantStorage,
    variantColor,
  };
}

export async function resolveExistingProduct({
  sb,
  identity,
  categoryId,
}: ResolveExistingProductInput): Promise<ExistingProductRow | null> {
  if (identity.modelCode) {
    const { data: byModelCode } = await sb
      .from("products")
      .select(PRODUCT_FIELDS)
      .ilike("brand", identity.brand)
      .eq("model_code", identity.modelCode)
      .limit(5);

    const resolvedByModelCode = chooseSingleCandidate(
      (byModelCode ?? []) as ExistingProductRow[],
      identity,
      categoryId
    );
    if (resolvedByModelCode) return resolvedByModelCode;
  }

  const { data: bySlug } = await sb
    .from("products")
    .select(PRODUCT_FIELDS)
    .eq("slug", identity.slug)
    .limit(2);
  if (bySlug && bySlug.length === 1) {
    return bySlug[0] as ExistingProductRow;
  }

  if (!identity.modelFamily) return null;

  const { data: familyCandidates } = await sb
    .from("products")
    .select(PRODUCT_FIELDS)
    .ilike("brand", identity.brand)
    .ilike("model_family", identity.modelFamily)
    .limit(25);

  const typedCandidates = (familyCandidates ?? []) as ExistingProductRow[];
  if (typedCandidates.length === 0) return null;

  const strictMatches = typedCandidates.filter(
    (candidate) =>
      normalizeVariantMatch(candidate.variant_storage, identity.variantStorage) &&
      normalizeVariantMatch(candidate.variant_color, identity.variantColor)
  );
  const strictResolved = chooseSingleCandidate(strictMatches, identity, categoryId);
  if (strictResolved) return strictResolved;

  const compatibleMatches = typedCandidates.filter(
    (candidate) =>
      normalizeVariantCompatible(candidate.variant_storage, identity.variantStorage) &&
      normalizeVariantCompatible(candidate.variant_color, identity.variantColor)
  );
  const compatibleResolved = chooseSingleCandidate(compatibleMatches, identity, categoryId);
  if (compatibleResolved) return compatibleResolved;

  if (!identity.variantStorage && !identity.variantColor) {
    return chooseSingleCandidate(typedCandidates, identity, categoryId);
  }

  return null;
}

function mergeSpecs(
  existingSpecs: Record<string, unknown> | null | undefined,
  incomingSpecs: SpecMap | null | undefined
): Record<string, unknown> | null {
  const safeExisting = existingSpecs && typeof existingSpecs === "object" ? { ...existingSpecs } : {};
  let changed = false;

  for (const [key, value] of Object.entries(incomingSpecs ?? {})) {
    const nextValue = typeof value === "string" ? value.trim() : value;
    if (!nextValue) continue;
    if (!(key in safeExisting) || safeExisting[key] == null || safeExisting[key] === "") {
      safeExisting[key] = nextValue;
      changed = true;
    }
  }

  if (!changed) return null;
  return safeExisting;
}

export function buildProductUpdatePayload({
  existing,
  identity,
  imageUrl,
  specs,
}: BuildUpdatePayloadInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (identity.brand && (!existing.brand || normalizeText(existing.brand) === normalizeText(identity.brand))) {
    if (existing.brand !== identity.brand) payload.brand = identity.brand;
  }
  if (!existing.slug && identity.slug) payload.slug = identity.slug;
  if (!existing.title || existing.title.trim().length < 5) payload.title = identity.canonicalTitle;
  if (!existing.image_url && imageUrl) payload.image_url = imageUrl;
  if (!existing.model_code && identity.modelCode) payload.model_code = identity.modelCode;
  if (!existing.model_family && identity.modelFamily) payload.model_family = identity.modelFamily;
  if (!existing.variant_storage && identity.variantStorage) payload.variant_storage = identity.variantStorage;
  if (!existing.variant_color && identity.variantColor) payload.variant_color = identity.variantColor;

  const mergedSpecs = mergeSpecs(existing.specs, specs);
  if (mergedSpecs) payload.specs = mergedSpecs;

  return payload;
}

export function buildProductCreatePayload({
  identity,
  categoryId,
  imageUrl,
  specs,
}: BuildCreatePayloadInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    title: identity.canonicalTitle,
    slug: identity.slug,
    brand: identity.brand,
    category_id: categoryId,
  };

  if (imageUrl) payload.image_url = imageUrl;
  if (identity.modelCode) payload.model_code = identity.modelCode;
  if (identity.modelFamily) payload.model_family = identity.modelFamily;
  if (identity.variantStorage) payload.variant_storage = identity.variantStorage;
  if (identity.variantColor) payload.variant_color = identity.variantColor;
  if (specs && Object.keys(specs).length > 0) payload.specs = specs;

  return payload;
}
