export type CategorySpecFilterParam =
  | "ram"
  | "batarya"
  | "yil"
  | "mobil"
  | "ekran"
  | "cozunurluk"
  | "yenileme";

export type CategorySpecFilterConfig = {
  param: CategorySpecFilterParam;
  label: string;
  keys: string[];
  searchable?: boolean;
  sort: "numeric" | "alpha";
};

export const CATEGORY_SPEC_FILTERS: CategorySpecFilterConfig[] = [
  { param: "ram", label: "Ram Kapasitesi", keys: ["RAM Kapasitesi", "RAM", "Ram", "Bellek"], sort: "numeric" },
  { param: "batarya", label: "Batarya Kapasitesi", keys: ["Batarya Kapasitesi", "Batarya", "Pil", "Battery"], sort: "numeric" },
  { param: "yil", label: "Cikis Yili", keys: ["Cikis Yili", "Çıkış Yılı", "Yil", "Yıl"], sort: "numeric" },
  { param: "mobil", label: "Mobil Erisim Teknolojisi", keys: ["Mobil Erisim Teknolojisi", "Mobil Erişim Teknolojisi", "Mobil Telefon Standardi", "Ağ Teknolojisi"], sort: "alpha" },
  { param: "ekran", label: "Ekran Boyutu", keys: ["Ekran Boyutu", "Ekran Boyutu (inc)", "Ekran boyutu cm / inc"], sort: "numeric" },
  { param: "cozunurluk", label: "Ekran Cozunurlugu", keys: ["Ekran Cozunurlugu", "Çözünürlük", "Cozunurluk"], sort: "numeric" },
  { param: "yenileme", label: "Ekran Yenileme Hizi", keys: ["Ekran Yenileme Hizi", "Yenileme Hizi", "Refresh Rate"], sort: "numeric" },
];

function transliterate(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0131/g, "i")
    .replace(/\u0130/g, "I");
}

export function normalizeFilterValue(value: string | null | undefined): string {
  return transliterate(value ?? "")
    .replace(/^:+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKey(value: string): string {
  return transliterate(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractSpecFilterValue(
  specs: Record<string, unknown> | null | undefined,
  keys: string[]
): string | null {
  if (!specs || typeof specs !== "object") return null;

  const normalizedKeys = new Set(keys.map((key) => normalizeKey(key)));
  for (const [key, rawValue] of Object.entries(specs)) {
    if (!normalizedKeys.has(normalizeKey(key))) continue;
    const cleaned = normalizeFilterValue(String(rawValue ?? ""));
    if (cleaned) return cleaned;
  }

  return null;
}

export function sortFilterValues(values: string[], mode: "numeric" | "alpha"): string[] {
  const unique = Array.from(new Set(values.filter(Boolean)));
  if (mode === "alpha") {
    return unique.sort((left, right) => left.localeCompare(right, "tr"));
  }

  const numberOf = (value: string): number => {
    const match = value.replace(",", ".").match(/(\d+(?:\.\d+)?)/);
    return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
  };

  return unique.sort((left, right) => {
    const leftNumber = numberOf(left);
    const rightNumber = numberOf(right);
    if (leftNumber !== rightNumber) return leftNumber - rightNumber;
    return left.localeCompare(right, "tr");
  });
}
