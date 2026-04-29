/**
 * Türkçe text normalization — kelime eşleştirme için tam ASCII lowercase üretir.
 *
 * Neden gerekli:
 *   "İç".toLowerCase() V8'de "i̇ç" (i + combining dot above) döner.
 *   .includes("ic") gibi substring kontrolleri başarısız olur.
 *   NFD ile combining diacritics'leri sil + ı/ş/ğ/ü/ö/ç ASCII karşılığı.
 *
 * Kullanım — TÜM Türkçe substring/regex eşleştirme öncesinde bu fonksiyon
 * çağrılmalı. categorizeFromTitle, productIdentity, migrate scripts, vb.
 *
 * @example
 *   trNormalize("SAMSUNG Galaxy A25 İç Speaker SM-A226B")
 *   // → "samsung galaxy a25 ic speaker sm-a226b"
 */
export function trNormalize(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .trim();
}

/**
 * Word-boundary substring match. Türkçe normalize ile ASCII'ye çevirir,
 * sonra `(?:^|\W)keyword` regex ile başlangıç boundary kontrol eder.
 *
 * Türkçe ek alan kelimeler matchlenir ("kılıf" → "kılıfı"),
 * substring false-match'ler engellenir ("omen" → "Homend" matchlemez).
 *
 * @example
 *   trMatchKeyword("SAMSUNG Galaxy A25 İç Speaker", "ic speaker") // true
 *   trMatchKeyword("Apple iPhone Kılıfı", "kılıf")                 // true
 *   trMatchKeyword("Homend Coffeebreak", "omen")                   // false
 */
export function trMatchKeyword(text: string, keyword: string): boolean {
  const haystack = trNormalize(text);
  const needle = trNormalize(keyword);
  if (!needle) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|\\W)${escaped}`, "i").test(haystack);
}

/**
 * URL slug üretimi — title'dan SEO-dostu slug yaratır.
 *
 * @example
 *   trSlug("Apple iPhone 17 Pro Max 512GB Sis Mavisi")
 *   // → "apple-iphone-17-pro-max-512gb-sis-mavisi"
 */
export function trSlug(text: string | null | undefined, maxLen = 100): string {
  return trNormalize(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, maxLen);
}
