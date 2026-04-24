import type { ListingState, StoreLiveData } from "@/lib/scrapers/live/useLivePrices";

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
  fallback_url?: string | null;
};

export type MergedOfferRow = {
  listing_id: string;
  source: string;
  store: StoreDefinition | null;
  state: ListingState;
  displayPrice: number | null;
  totalPrice: number | null;
  isCached: boolean;
  fallback_url: string | null;
};

export function formatTL(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function computeTotal(data: StoreLiveData): number {
  return data.price + (data.shipping_price && !data.free_shipping ? data.shipping_price : 0);
}

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
        fallback_url: initialListing.fallback_url ?? null,
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
