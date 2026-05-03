export function extractWarrantyInfo(html: string): { duration: string | null; label: string | null } {
  const normalized = normalizeWarrantyText(html);
  const duration = extractWarrantyDuration(normalized);
  const label = extractWarrantyLabel(normalized);
  return { duration, label };
}

function extractWarrantyLabel(text: string): string | null {
  if (/apple\s+turkiye\s+garantili/.test(text)) {
    return "Apple Turkiye Garantili";
  }
  if (/ithalatci\s+garantili/.test(text)) {
    return "Ithalatci Garantili";
  }
  if (/distributor\s+garantili/.test(text)) {
    return "Distributor Garantili";
  }
  if (/resmi\s+uretici\s+garantili/.test(text)) {
    return "Resmi Uretici Garantili";
  }
  return null;
}

function extractWarrantyDuration(text: string): string | null {
  const monthMatch =
    text.match(/\b(\d{1,2})\s*(?:ay|aylik)\b(?:[^.]{0,80})?\bgaranti(?:li)?\b/) ??
    text.match(/\bgaranti(?:li)?\b(?:[^.]{0,80})?\b(\d{1,2})\s*(?:ay|aylik)\b/);
  if (monthMatch) {
    return `${monthMatch[1]} ay`;
  }

  const yearMatch =
    text.match(/\b(\d{1,2})\s*(?:yil|yillik)\b(?:[^.]{0,80})?\bgaranti(?:li)?\b/) ??
    text.match(/\bgaranti(?:li)?\b(?:[^.]{0,80})?\b(\d{1,2})\s*(?:yil|yillik)\b/);
  if (yearMatch) {
    return `${Number(yearMatch[1]) * 12} ay`;
  }

  return null;
}

function normalizeWarrantyText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&(uuml|uuml);/gi, "u")
    .replace(/&(ouml);/gi, "o")
    .replace(/&(ccedil);/gi, "c")
    .replace(/&(scedil);/gi, "s")
    .replace(/&(gbreve);/gi, "g")
    .replace(/&amp;/gi, " ")
    .replace(/[ıİ]/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\r\n\t]+/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
