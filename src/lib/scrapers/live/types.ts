/**
 * Live price fetcher - shared types
 */

export type StoreLiveData = {
  price: number;
  original_price: number | null;
  currency: string;
  in_stock: boolean;
  stock_count: number | null;
  shipping_price: number | null;
  free_shipping: boolean;
  seller_name: string | null;
  installment_hint: string | null;
  campaign_hint: string | null;
  affiliate_url: string | null;
  fetched_at: string;
};

export type StoreFetcher = {
  source: string;
  fetch: (sourceProductId: string) => Promise<StoreLiveData>;
  timeoutMs: number;
  rpmLimit: number;
};

export type Listing = {
  id: string;
  product_id: string;
  source: string;
  source_product_id: string;
  source_url: string | null;
  store_id: string | null;
  price: number;
  is_active: boolean;
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
