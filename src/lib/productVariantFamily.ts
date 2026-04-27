type VariantFamilySeed = {
  brand?: string | null;
  modelFamily?: string | null;
  title?: string | null;
};

const COLOR_TOKENS = [
  "siyah",
  "beyaz",
  "gri",
  "mavi",
  "yesil",
  "kirmizi",
  "mor",
  "pembe",
  "sari",
  "turuncu",
  "bej",
  "kahverengi",
  "lacivert",
  "gumus",
  "silver",
  "black",
  "white",
  "gray",
  "grey",
  "blue",
  "green",
  "red",
  "purple",
  "pink",
  "yellow",
  "orange",
  "beige",
  "brown",
  "navy",
  "gold",
  "grafit",
  "graphite",
];

const NOISE_TOKENS = [
  "akilli telefon",
  "cep telefonu",
  "tablet",
  "turkiye garantili",
  "apple turkiye garantili",
  "samsung turkiye garantili",
  "wifi",
  "wi fi",
  "5g",
  "4g",
];

function transliterate(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0131/g, "i")
    .replace(/\u0130/g, "I");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeSpace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function stripBrandPrefix(source: string, brand: string | null | undefined): string {
  const normalizedBrand = normalizeSpace(
    transliterate(brand ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
  );

  if (!normalizedBrand) return source;

  const patterns = [
    new RegExp(`^${escapeRegExp(normalizedBrand)}\\s+`, "i"),
    new RegExp(`^${escapeRegExp(normalizedBrand)}\\s+${escapeRegExp(normalizedBrand)}\\s+`, "i"),
  ];

  let next = source;
  for (const pattern of patterns) {
    next = next.replace(pattern, "");
  }
  return next;
}

export function buildVariantFamilyKey(seed: VariantFamilySeed): string {
  const source = seed.modelFamily?.trim() || seed.title?.trim() || "";
  if (!source) return "";

  let normalized = transliterate(source)
    .toLowerCase()
    .replace(/\b\d+(?:[.,]\d+)?\s?(gb|tb|mb)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ");

  normalized = stripBrandPrefix(normalized, seed.brand);

  for (const token of COLOR_TOKENS) {
    normalized = normalized.replace(new RegExp(`\\b${escapeRegExp(token)}\\b`, "gi"), " ");
  }

  for (const token of NOISE_TOKENS) {
    normalized = normalized.replace(new RegExp(`\\b${escapeRegExp(token)}\\b`, "gi"), " ");
  }

  return normalizeSpace(normalized);
}

export function isSameVariantFamily(base: VariantFamilySeed, candidate: VariantFamilySeed): boolean {
  const baseKey = buildVariantFamilyKey(base);
  const candidateKey = buildVariantFamilyKey(candidate);

  if (!baseKey || !candidateKey) return false;
  if (baseKey === candidateKey) return true;

  return baseKey.startsWith(candidateKey) || candidateKey.startsWith(baseKey);
}
