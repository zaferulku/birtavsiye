import type { ListingState, StoreLiveData } from "@/lib/scrapers/live/useLivePrices";
import { sourceTrustScore } from "@/lib/listingSignals";

export type StoreDefinition = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
};

export type InitialListing = {
  listing_id: string;
  source: string;
  cached_price: number | null;
  last_seen?: string | null;
  fallback_url?: string | null;
  warranty_type?: string | null;
};

export type MergedOfferRow = {
  listing_id: string;
  source: string;
  store: StoreDefinition | null;
  state: ListingState;
  displayPrice: number | null;
  totalPrice: number | null;
  isCached: boolean;
  last_seen: string | null;
  fallback_url: string | null;
  warranty_type: string | null;
};

export function formatTL(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function getMarketplaceLogoUrl(source: string | null | undefined, explicitLogoUrl?: string | null) {
  if (explicitLogoUrl) return explicitLogoUrl;

  switch ((source ?? "").toLowerCase()) {
    case "pttavm":
      return "https://www.google.com/s2/favicons?sz=64&domain_url=https://www.pttavm.com";
    case "mediamarkt":
      return "https://www.google.com/s2/favicons?sz=64&domain_url=https://www.mediamarkt.com.tr";
    case "trendyol":
      return "https://www.google.com/s2/favicons?sz=64&domain_url=https://www.trendyol.com";
    case "hepsiburada":
      return "https://www.google.com/s2/favicons?sz=64&domain_url=https://www.hepsiburada.com";
    case "amazon":
      return "https://www.google.com/s2/favicons?sz=64&domain_url=https://www.amazon.com.tr";
    case "n11":
      return "https://www.google.com/s2/favicons?sz=64&domain_url=https://www.n11.com";
    case "vatan":
      return "https://www.google.com/s2/favicons?sz=64&domain_url=https://www.vatanbilgisayar.com";
    case "teknosa":
      return "https://www.google.com/s2/favicons?sz=64&domain_url=https://www.teknosa.com";
    default:
      return null;
  }
}

export function computeTotal(data: StoreLiveData): number {
  return data.price + (data.shipping_price && !data.free_shipping ? data.shipping_price : 0);
}

export function normalizeSellerRating(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const normalized = value <= 5 ? value * 2 : value;
  return Math.max(0, Math.min(10, normalized));
}

export function formatSellerRating(value: number | null | undefined): string {
  const normalized = normalizeSellerRating(value);
  if (normalized === null) return "-";
  return normalized.toFixed(1);
}

export function formatWarrantyTypeLabel(value: string | null | undefined): string | null {
  switch ((value ?? "").trim().toLowerCase()) {
    case "apple_tr":
      return "Apple Turkiye Garantili";
    case "ithalatci":
      return "Ithalatci Garantili";
    case "distri":
      return "Distributor Garantili";
    default:
      return value?.trim() ? value.trim() : null;
  }
}

// Re-export (ProductBestOfferCard ./offerUtils üzerinden alıyor)
export { sourceTrustScore };

export function mergeOfferRows(
  initialListings: InitialListing[],
  liveListings: Record<string, ListingState>,
  stores: Record<string, StoreDefinition>
): MergedOfferRow[] {
  return initialListings
    .map((initialListing) => {
      const liveState = liveListings[initialListing.listing_id];
      const liveData = liveState?.data ?? null;

      return {
        listing_id: initialListing.listing_id,
        source: initialListing.source,
        store: stores[initialListing.source] ?? null,
        state:
          liveState ??
          {
            listing_id: initialListing.listing_id,
            source: initialListing.source,
            status: "pending",
            data: null,
            error: null,
          },
        displayPrice: liveData?.price ?? initialListing.cached_price,
        totalPrice: liveData ? computeTotal(liveData) : initialListing.cached_price,
        isCached: !liveState,
        last_seen: initialListing.last_seen ?? null,
        fallback_url: initialListing.fallback_url ?? null,
        warranty_type: initialListing.warranty_type ?? null,
      } satisfies MergedOfferRow;
    })
    .sort((left, right) => {
      const leftInStock = left.state.data?.in_stock !== false;
      const rightInStock = right.state.data?.in_stock !== false;
      if (leftInStock !== rightInStock) return leftInStock ? -1 : 1;

      const leftPrice = left.totalPrice ?? Number.POSITIVE_INFINITY;
      const rightPrice = right.totalPrice ?? Number.POSITIVE_INFINITY;
      return leftPrice - rightPrice;
    });
}

export function pickBestOffer(rows: MergedOfferRow[]): MergedOfferRow | null {
  return (
    rows.find((row) => row.state.data?.in_stock !== false && row.totalPrice !== null) ??
    rows.find((row) => row.displayPrice !== null) ??
    null
  );
}
