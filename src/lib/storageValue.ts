export function normalizeStorageValue(value: string | null | undefined): string | null {
  if (!value) return null;

  const normalized = value
    .toUpperCase()
    .replace(/İ/g, "I")
    .replace(/\s+/g, " ")
    .trim();

  const matches = Array.from(normalized.matchAll(/(\d+(?:[.,]\d+)?)\s*(TB|GB|MB)/g));
  if (matches.length === 0) {
    return normalized.replace(/([A-Z]{2})$/g, " $1").trim();
  }

  const parsed = matches
    .map((match) => ({
      amount: Number(match[1].replace(",", ".")),
      unit: match[2],
    }))
    .filter((item) => Number.isFinite(item.amount) && item.amount > 0)
    .sort((left, right) => toStorageRank(right.amount, right.unit) - toStorageRank(left.amount, left.unit))[0];

  if (!parsed) return normalized;

  const amountLabel = Number.isInteger(parsed.amount)
    ? String(parsed.amount)
    : String(parsed.amount).replace(".", ",");

  return `${amountLabel} ${parsed.unit}`;
}

export function compareStorageValues(left: string, right: string): number {
  return toStorageSortValue(right) - toStorageSortValue(left) || left.localeCompare(right, "tr");
}

function toStorageSortValue(value: string): number {
  const match = value.match(/(\d+(?:[.,]\d+)?)\s*(TB|GB|MB)/);
  if (!match) return 0;
  return toStorageRank(Number(match[1].replace(",", ".")), match[2]);
}

function toStorageRank(amount: number, unit: string): number {
  const multiplier = unit === "TB" ? 1024 * 1024 : unit === "GB" ? 1024 : 1;
  return amount * multiplier;
}
