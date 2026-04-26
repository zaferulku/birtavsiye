export function cleanProductTitle(title: string | null | undefined): string {
  const value = (title ?? "").trim();
  if (!value) return "";

  return value
    .replace(/\s+[A-Z0-9]{5,}(?:[/-][A-Z0-9]{2,})+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
