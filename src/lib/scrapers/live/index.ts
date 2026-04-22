/**
 * Live price orchestrator
 *
 * For a given product_id, fetches current prices from all its active listings
 * in parallel. Each store fetch goes through rate-limit check + cache +
 * in-flight dedupe. Results are persisted to listings/price_history and
 * streamed to the caller via a callback (used by SSE endpoint).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { rateLimiter } from "./rate-limiter";
import { fetchWithDedupe, cacheGet, cacheSet, cacheKey } from "./cache";
import type {
  StoreFetcher,
  StoreLiveData,
  Listing,
  SseEvent,
  FetchOptions,
  FetchContext,
} from "./types";
import { pttavmFetcher } from "./pttavm";
import { mediamarktFetcher } from "./mediamarkt";
import { trendyolFetcher } from "./trendyol";

const FETCHERS: Record<string, StoreFetcher> = {
  pttavm: pttavmFetcher,
  mediamarkt: mediamarktFetcher,
  trendyol: trendyolFetcher,
};

export function isSourceSupported(source: string): boolean {
  return source in FETCHERS;
}

type EmitFn = (event: SseEvent) => void;

export async function fetchLivePricesForProduct(
  supabase: SupabaseClient,
  productId: string,
  emit: EmitFn,
  options: FetchOptions = {}
): Promise<void> {
  const globalTimeoutMs = options.globalTimeoutMs ?? 5000;
  const forceFresh = options.forceFresh ?? false;

  const startTime = Date.now();

  const { data: listings, error } = await supabase
    .from("listings")
    .select("id, product_id, source, source_product_id, source_url, store_id, price, is_active")
    .eq("product_id", productId)
    .eq("is_active", true);

  if (error) {
    console.error("[live-prices] Failed to load listings:", error);
    emit({
      type: "done",
      total_stores: 0,
      successful: 0,
      failed: 0,
      duration_ms: Date.now() - startTime,
    });
    return;
  }

  if (!listings || listings.length === 0) {
    emit({
      type: "done",
      total_stores: 0,
      successful: 0,
      failed: 0,
      duration_ms: Date.now() - startTime,
    });
    return;
  }

  let successful = 0;
  let failed = 0;

  const tasks = listings.map((listing) =>
    fetchOneListing(listing, emit, forceFresh, options.cacheTtlMs)
      .then((outcome) => {
        if (outcome.ok) {
          successful++;
          return persistListing(supabase, listing, outcome.data);
        } else {
          failed++;
        }
      })
      .catch((err) => {
        failed++;
        console.error(`[live-prices] Task failed for ${listing.source}:`, err);
      })
  );

  await Promise.race([
    Promise.allSettled(tasks),
    sleep(globalTimeoutMs),
  ]);

  emit({
    type: "done",
    total_stores: listings.length,
    successful,
    failed,
    duration_ms: Date.now() - startTime,
  });
}

type FetchOutcome =
  | { ok: true; data: StoreLiveData }
  | { ok: false; error: string };

async function fetchOneListing(
  listing: Listing,
  emit: EmitFn,
  forceFresh: boolean,
  cacheTtlMs?: number
): Promise<FetchOutcome> {
  const { source, source_product_id, source_url, id: listingId } = listing;
  const fetcher = FETCHERS[source];

  if (!fetcher) {
    emit({
      type: "error",
      listing_id: listingId,
      source,
      error: `unsupported_source: ${source}`,
    });
    return { ok: false, error: "unsupported_source" };
  }

  // Cache key prefers URL when available (per-listing freshness for URL-based stores)
  const key = cacheKey(source, source_url ?? source_product_id);

  if (!forceFresh) {
    const cached = cacheGet(key);
    if (cached) {
      emit({ type: "price", listing_id: listingId, source, data: cached });
      return { ok: true, data: cached };
    }
  }

  if (!rateLimiter.tryConsume(source)) {
    emit({
      type: "error",
      listing_id: listingId,
      source,
      error: "rate_limited",
    });
    return { ok: false, error: "rate_limited" };
  }

  const ctx: FetchContext = {
    sourceProductId: source_product_id,
    sourceUrl: source_url,
  };

  try {
    const data = await fetchWithDedupe(key, () => fetcher.fetch(ctx));
    cacheSet(key, data, cacheTtlMs);
    emit({ type: "price", listing_id: listingId, source, data });
    return { ok: true, data };
  } catch (err: any) {
    const errorMsg = String(err?.message || err).slice(0, 120);
    emit({
      type: "error",
      listing_id: listingId,
      source,
      error: errorMsg,
    });
    return { ok: false, error: errorMsg };
  }
}

async function persistListing(
  supabase: SupabaseClient,
  listing: Listing,
  data: StoreLiveData
): Promise<void> {
  const priceChanged = listing.price !== data.price;

  try {
    const nowIso = new Date().toISOString();
    const updatePayload: Record<string, any> = {
      price: data.price,
      original_price: data.original_price,
      in_stock: data.in_stock,
      stock_count: data.stock_count,
      shipping_price: data.shipping_price,
      free_shipping: data.free_shipping,
      seller_name: data.seller_name,
      affiliate_url: data.affiliate_url,
      last_seen: nowIso,
      updated_at: nowIso,
    };
    if (priceChanged) {
      updatePayload.last_price_change = nowIso;
    }

    const { error: updateError } = await supabase
      .from("listings")
      .update(updatePayload)
      .eq("id", listing.id);

    if (updateError) {
      console.error(`[live-prices] Update failed for ${listing.id}:`, updateError);
      return;
    }

    if (priceChanged) {
      await supabase.from("price_history").insert({
        listing_id: listing.id,
        price: listing.price,
        recorded_at: nowIso,
      });
    }

    await supabase.from("agent_decisions").insert({
      agent_name: "live-price-fetcher",
      input_hash: `${listing.source}:${listing.source_product_id}`,
      input_data: { listing_id: listing.id, source: listing.source },
      output_data: {
        price: data.price,
        price_changed: priceChanged,
        in_stock: data.in_stock,
      },
      method: "live_fetch",
      latency_ms: null,
      confidence: 1.0,
    });
  } catch (err) {
    console.error(`[live-prices] Persistence failed for ${listing.id}:`, err);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
