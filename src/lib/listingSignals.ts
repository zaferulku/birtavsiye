export type ListingSignal = {
  price?: number | string | null;
  source?: string | null;
  is_active?: boolean | null;
  in_stock?: boolean | null;
  last_seen?: string | null;
};

export type NormalizedListingSignal = {
  price: number;
  source: string | null;
  last_seen: string | null;
};

export function sourceTrustScore(source: string | null | undefined): number {
  if (!source) return 0;
  if (source === "mediamarkt") return 100;
  if (source === "vatan") return 80;
  if (source === "trendyol" || source === "hepsiburada") return 70;
  if (source === "amazon") return 60;
  if (source === "n11") return 50;
  if (source === "pttavm") return 20;
  return 40;
}

export function getActiveListings(
  listings: ListingSignal[] | null | undefined,
  sourceFilter?: string | null
): NormalizedListingSignal[] {
  return (listings ?? [])
    .filter(
      (listing) =>
        listing.is_active !== false &&
        listing.in_stock !== false &&
        (!sourceFilter || listing.source === sourceFilter)
    )
    .map((listing) => ({
      price: Number(listing.price),
      source: listing.source ?? null,
      last_seen: listing.last_seen ?? null,
    }))
    .filter((listing) => Number.isFinite(listing.price) && listing.price > 0);
}

export function getLowestActiveListing(
  listings: ListingSignal[] | null | undefined,
  sourceFilter?: string | null
): NormalizedListingSignal | null {
  const active = getActiveListings(listings, sourceFilter);
  if (active.length === 0) return null;

  return active.reduce((best, current) => (current.price < best.price ? current : best), active[0]);
}

export function getLowestActivePrice(
  listings: ListingSignal[] | null | undefined,
  sourceFilter?: string | null
): number | null {
  return getLowestActiveListing(listings, sourceFilter)?.price ?? null;
}

export function getUniqueActiveSources(
  listings: ListingSignal[] | null | undefined,
  sourceFilter?: string | null
): string[] {
  return [
    ...new Set(
      getActiveListings(listings, sourceFilter)
        .map((listing) => listing.source)
        .filter(Boolean)
    ),
  ] as string[];
}

export function getActiveOfferCount(
  listings: ListingSignal[] | null | undefined,
  sourceFilter?: string | null
): number {
  const sources = getUniqueActiveSources(listings, sourceFilter);
  if (sources.length > 0) return sources.length;
  return getActiveListings(listings, sourceFilter).length;
}

export function getFreshestSeenAt(
  listings: ListingSignal[] | null | undefined,
  sourceFilter?: string | null
): string | null {
  const active = getActiveListings(listings, sourceFilter);
  const values = active
    .map((listing) => listing.last_seen)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => right.localeCompare(left));

  return values[0] ?? null;
}

export function getBestSourceTrust(
  listings: ListingSignal[] | null | undefined,
  sourceFilter?: string | null
): number {
  const sources = getUniqueActiveSources(listings, sourceFilter);
  return sources.length > 0 ? Math.max(...sources.map((source) => sourceTrustScore(source))) : 0;
}

export function formatFreshnessLabel(value: string | null): string {
  if (!value) return "Bilinmiyor";

  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));

  if (diffMinutes < 60) return `${Math.max(diffMinutes, 1)} dk once`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} sa once`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} gun once`;

  return new Date(value).toLocaleDateString("tr-TR");
}
