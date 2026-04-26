/**
 * Live price fetcher - shared types
 *
 * Every store fetcher implements StoreFetcher interface.
 * SSE events emit StoreUpdate structures to the client.
 */

export type StoreLiveData = {
  price: number;
  original_price: number | null;          // strike-through if shown
  currency: string;                        // "TRY"
  in_stock: boolean;
  stock_count: number | null;
  shipping_price: number | null;
  free_shipping: boolean;
  seller_name: string | null;
  seller_rating?: number | null;
  seller_review_count?: number | null;
  installment_hint: string | null;         // "12 taksit" — short summary
  campaign_hint: string | null;            // "5000 TL üstü %10 indirim"
  affiliate_url: string | null;
  fetched_at: string;                      // ISO timestamp
};

/**
 * Context passed to every fetcher.
 *
 * Fetchers may use sourceUrl directly (preferred — stored at ingest time)
 * or fall back to constructing URLs from sourceProductId + a known pattern.
 *
 * PttAVM uses sourceUrl exclusively. MediaMarkt and Trendyol may reconstruct
 * URL from sourceProductId when sourceUrl is missing.
 */
export type FetchContext = {
  sourceProductId: string;
  sourceUrl: string | null;
};

export type StoreFetcher = {
  source: string;
  fetch: (ctx: FetchContext) => Promise<StoreLiveData>;
  timeoutMs: number;
  rpmLimit: number;
};

export type Listing = {
  id: string;
  product_id: string;
  source: string;
  source_product_id: string;
  source_url: string | null;
  affiliate_url?: string | null;
  store_id: string | null;
  price: number;
  is_active: boolean;
  in_stock?: boolean | null;
  last_seen?: string | null;
};

export type SsePriceEvent = {
  type: "price";
  listing_id: string;
  source: string;
  data: StoreLiveData;
};

export type SseErrorEvent = {
  type: "error";
  listing_id: string;
  source: string;
  error: string;
};

export type SseDoneEvent = {
  type: "done";
  total_stores: number;
  successful: number;
  failed: number;
  duration_ms: number;
};

export type SseEvent = SsePriceEvent | SseErrorEvent | SseDoneEvent;

export type FetchResult =
  | { ok: true; data: StoreLiveData }
  | { ok: false; error: string };

export type FetchOptions = {
  globalTimeoutMs?: number;
  forceFresh?: boolean;
  cacheTtlMs?: number;
};
