import { cleanProductTitle } from "./productTitle";

type DiscoveryProductLike = {
  title?: string | null;
  description?: string | null;
  brand?: string | null;
  model_family?: string | null;
};

function normalizeDiscoveryText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0131/g, "i")
    .replace(/\u0130/g, "I")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const HIDDEN_DISCOVERY_PATTERNS = [
  /\byenilenmis\b/,
  /\brefurbished\b/,
  /\brenewed\b/,
  /\boutlet\b/,
  /\b2\s*\.?\s*el\b/,
  /\bikinci\s*el\b/,
  /\bpre\s*owned\b/,
  /\bused\b/,
  /\bteshir\b/,
];

export function shouldHideDiscoveryProduct(product: DiscoveryProductLike): boolean {
  const haystack = normalizeDiscoveryText(
    [product.title, product.description].filter(Boolean).join(" ")
  );

  if (!haystack) return false;
  return HIDDEN_DISCOVERY_PATTERNS.some((pattern) => pattern.test(haystack));
}

export function hasMeaningfulModelFamily(modelFamily: string | null | undefined): boolean {
  const value = (modelFamily ?? "").trim();
  if (!value) return false;
  return /[A-Za-zÇĞİIÖŞÜçğıöşü]/.test(value);
}

export function getDiscoveryProductLabel(
  product: DiscoveryProductLike,
  options?: { includeBrand?: boolean }
): string {
  const includeBrand = options?.includeBrand ?? true;
  const family = (product.model_family ?? "").trim();
  const brand = (product.brand ?? "").trim();
  const cleanedTitle = cleanProductTitle(product.title);

  if (family && hasMeaningfulModelFamily(family)) {
    const normalizedFamily = normalizeDiscoveryText(family);
    const normalizedBrand = normalizeDiscoveryText(brand);
    if (normalizedBrand && normalizedFamily.startsWith(normalizedBrand)) {
      return family;
    }
    if (includeBrand && brand) return `${brand} ${family}`.trim();
    return family;
  }

  if (cleanedTitle) return cleanedTitle;
  if (includeBrand && brand && family) return `${brand} ${family}`.trim();
  return brand || family || "";
}
