import { trNormalize } from "@/lib/turkishNormalize";

const COLOR_PHRASES = [
  "ada cayi",
  "antrasit",
  "bej",
  "beyaz",
  "black",
  "blue",
  "bordo",
  "bronze",
  "brown",
  "col beji",
  "deniz mavisi",
  "derin mavi",
  "dogal titanyum",
  "gold",
  "grafit",
  "gray",
  "green",
  "gri",
  "gumus",
  "kirmizi",
  "kobalt",
  "koyu mavi",
  "koyu yesil",
  "lacivert",
  "lavanta",
  "mavi",
  "midnight",
  "mor",
  "natural titanium",
  "pembe",
  "pink",
  "purple",
  "red",
  "rose",
  "sari",
  "sarı",
  "siyah",
  "silver",
  "space gray",
  "starlight",
  "titanyum",
  "turuncu",
  "uzay grisi",
  "white",
  "yesil",
];

const NORMALIZED_COLOR_PHRASES = Array.from(new Set(COLOR_PHRASES.map((color) => normalizeForSearch(color))))
  .sort((left, right) => right.length - left.length);

export function normalizeForSearch(value: string | null | undefined): string {
  return trNormalize(value)
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function splitNormalizedSearchTerms(query: string | null | undefined): string[] {
  return Array.from(
    new Set(
      normalizeForSearch(query)
        .split(/\s+/)
        .map((part) => part.trim())
        .filter((part) => part.length >= 2)
    )
  ).slice(0, 8);
}

export function splitRawSearchTerms(query: string | null | undefined): string[] {
  return Array.from(
    new Set(
      (query ?? "")
        .trim()
        .split(/\s+/)
        .map((part) => part.trim())
        .filter((part) => part.length >= 2)
    )
  ).slice(0, 8);
}

export function stripColorTermsFromQuery(query: string | null | undefined): string {
  let normalized = normalizeForSearch(query);
  if (!normalized) return "";

  let changed = true;
  while (changed) {
    changed = false;
    for (const color of NORMALIZED_COLOR_PHRASES) {
      if (normalized === color) {
        return "";
      }

      if (normalized.endsWith(` ${color}`)) {
        normalized = normalized.slice(0, -color.length - 1).trim();
        changed = true;
        break;
      }
    }
  }

  return normalized;
}

export function simplifySearchQueryForMatching(query: string | null | undefined): string {
  return stripColorTermsFromQuery(query).replace(/\s+/g, " ").trim();
}
