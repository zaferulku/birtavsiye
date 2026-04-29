export function cleanProductTitle(title: string | null | undefined): string {
  const value = (title ?? "").trim();
  if (!value) return "";

  return value
    // Multi-segment SKU code: "WD123/AB-CD" gibi
    .replace(/\s+[A-Z0-9]{5,}(?:[/-][A-Z0-9]{2,})+$/g, "")
    // Single-segment SKU code: en az 6 karakter, içinde rakam ZORUNLU (yoksa
    // SAMSUNG gibi marka isimleri silinmesin). Örn: MTP23TU, WD12345AB.
    .replace(/\s+(?=[A-Z0-9]*\d)[A-Z][A-Z0-9]{5,}$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Türkçe + İngilizce renk sözlüğü (compound renkler dahil)
const COLOR_DICTIONARY: Array<{ canonical: string; pattern: RegExp }> = [
  { canonical: "siyah", pattern: /\b(siyah|jet siyah|gece siyahı|space gray|space grey)\b/i },
  { canonical: "beyaz", pattern: /\b(beyaz|inci beyazı|kar beyazı|starlight)\b/i },
  { canonical: "kırmızı", pattern: /\b(kırmızı|kirmizi|red|kızıl|product red)\b/i },
  { canonical: "mavi", pattern: /\b(mavi|gece mavisi|deniz mavisi|açık mavi|koyu mavi|navy|teal|kobalt)\b/i },
  { canonical: "yeşil", pattern: /\b(yeşil|yesil|orman yeşili|açık yeşil|koyu yeşil|alpine green|mint)\b/i },
  { canonical: "sarı", pattern: /\b(sarı|sari|altın sarısı|yellow|gold|altın)\b/i },
  { canonical: "pembe", pattern: /\b(pembe|toz pembe|açık pembe|pink|rose)\b/i },
  { canonical: "mor", pattern: /\b(mor|lavanta|kobalt mor|deep purple|purple|violet)\b/i },
  { canonical: "turuncu", pattern: /\b(turuncu|orange)\b/i },
  { canonical: "gri", pattern: /\b(gri|gray|grey|graphite|titan|titanyum)\b/i },
  { canonical: "kahverengi", pattern: /\b(kahverengi|brown|taba|bej|krem)\b/i },
  { canonical: "turkuaz", pattern: /\b(turkuaz|cyan)\b/i },
];

/**
 * Title'dan canonical renk cikar.
 *   "Samsung Galaxy A26 256GB Pembe" → "pembe"
 *   "iPhone 16 Plus Kobalt Mor"      → "mor"
 *   "MacBook Air Space Gray"         → "siyah"
 *   "Vacuum Cleaner"                 → null
 */
export function extractColorFromTitle(title: string | null | undefined): string | null {
  const text = (title ?? "").trim();
  if (!text) return null;

  for (const { canonical, pattern } of COLOR_DICTIONARY) {
    if (pattern.test(text)) return canonical;
  }
  return null;
}
