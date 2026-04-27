import { cleanProductTitle } from "./productTitle";

type DiscoveryProductLike = {
  title?: string | null;
  description?: string | null;
  brand?: string | null;
  model_family?: string | null;
  variant_storage?: string | null;
  variant_color?: string | null;
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
  const storage = (product.variant_storage ?? "").trim();
  const color = (product.variant_color ?? "").trim();
  const cleanedTitle = cleanProductTitle(product.title);

  // Eğer model_family anlamlıysa: brand + family + variant detayları (storage/color)
  // Detay sayfasındaki gibi tam ürün başlığı liste'de de görünsün.
  if (family && hasMeaningfulModelFamily(family)) {
    const normalizedFamily = normalizeDiscoveryText(family);
    const normalizedBrand = normalizeDiscoveryText(brand);

    const parts: string[] = [];
    // Family brand'le başlamıyorsa brand'i de ekle
    if (includeBrand && brand && !(normalizedBrand && normalizedFamily.startsWith(normalizedBrand))) {
      parts.push(brand);
    }
    parts.push(family);
    if (storage) parts.push(storage);
    if (color) parts.push(color);

    return parts.join(" ").trim();
  }

  if (cleanedTitle) return cleanedTitle;
  if (includeBrand && brand && family) return `${brand} ${family}`.trim();
  return brand || family || "";
}
