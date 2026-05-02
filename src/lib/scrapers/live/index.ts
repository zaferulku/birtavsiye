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
import {
  dedupeClusterListingsBySource,
  resolveProductClusterIdsByProductId,
} from "@/lib/productCluster";
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
import { hepsiburadaFetcher } from "./hepsiburada";
import { amazonTrFetcher } from "./amazon-tr";
import { n11Fetcher } from "./n11";

const FETCHERS: Record<string, StoreFetcher> = {
  pttavm: pttavmFetcher,
  mediamarkt: mediamarktFetcher,
  trendyol: trendyolFetcher,
  hepsiburada: hepsiburadaFetcher,
  "amazon-tr": amazonTrFetcher,
  n11: n11Fetcher,
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
  const clusterProductIds = await resolveProductClusterIdsByProductId(supabase, productId);

  const { data: listings, error } = await supabase
    .from("listings")
    .select("id, product_id, source, source_product_id, source_url, affiliate_url, store_id, price, is_active, in_stock, last_seen")
    .in("product_id", clusterProductIds)
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

  const uniqueListings = dedupeClusterListingsBySource((listings as Listing[] | null) ?? []);

  if (uniqueListings.length === 0) {
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

  const tasks: Promise<unknown>[] = uniqueListings.map((listing) =>
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

  // Discover augmentation: mevcut listing'i olmayan mağazalarda title+brand
  // araması yap. Synthetic event ("listing_id: discover:{source}") emit et,
  // DB'ye yazma. Orphan ürünler için diğer pazaryeri fiyatlarını gösterir.
  let discoverAttempts = 0;
  if (options.discover) {
    const existingSources = new Set(uniqueListings.map((l) => l.source));
    const missingSources = Object.keys(FETCHERS).filter(
      (s) => !existingSources.has(s) && !!FETCHERS[s].searchByTitle
    );
    if (missingSources.length > 0) {
      const { data: prod } = await supabase
        .from("products")
        .select("title, brand")
        .eq("id", productId)
        .maybeSingle();
      const title = (prod as { title?: string; brand?: string } | null)?.title ?? null;
      const brand = (prod as { title?: string; brand?: string } | null)?.brand ?? null;
      if (title) {
        for (const source of missingSources) {
          discoverAttempts++;
          tasks.push(
            discoverOneSource(source, { title, brand }, emit)
              .then((outcome) => {
                if (outcome.ok) successful++;
                else failed++;
              })
              .catch((err) => {
                failed++;
                console.error(`[live-prices] Discover failed for ${source}:`, err);
              })
          );
        }
      }
    }
  }

  await Promise.race([
    Promise.allSettled(tasks),
    sleep(globalTimeoutMs),
  ]);

  emit({
    type: "done",
    total_stores: uniqueListings.length + discoverAttempts,
    successful,
    failed,
    duration_ms: Date.now() - startTime,
  });
}

async function discoverOneSource(
  source: string,
  ctx: { title: string; brand: string | null },
  emit: EmitFn
): Promise<FetchOutcome> {
  const fetcher = FETCHERS[source];
  if (!fetcher?.searchByTitle) {
    return { ok: false, error: "no_search_support" };
  }

  if (!rateLimiter.tryConsume(source)) {
    emit({
      type: "error",
      listing_id: `discover:${source}`,
      source,
      error: "rate_limited",
    });
    return { ok: false, error: "rate_limited" };
  }

  const key = cacheKey(`discover:${source}`, `${ctx.brand ?? ""}|${ctx.title}`);
  const cached = cacheGet(key);
  if (cached) {
    emit({ type: "price", listing_id: `discover:${source}`, source, data: cached });
    return { ok: true, data: cached };
  }

  try {
    const data = await fetchWithDedupe(key, async () => {
      const result = await fetcher.searchByTitle!(ctx);
      if (!result) throw new Error("no_match");
      return result;
    });
    cacheSet(key, data);
    emit({ type: "price", listing_id: `discover:${source}`, source, data });
    return { ok: true, data };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message.slice(0, 120) : String(err).slice(0, 120);
    emit({
      type: "error",
      listing_id: `discover:${source}`,
      source,
      error: errorMsg,
    });
    return { ok: false, error: errorMsg };
  }
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
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message.slice(0, 120) : String(err).slice(0, 120);
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
    const updatePayload: {
      price: number;
      original_price: number | null;
      in_stock: boolean;
      stock_count: number | null;
      shipping_price: number | null;
      free_shipping: boolean;
      seller_name: string | null;
      affiliate_url: string | null;
      last_seen: string;
      updated_at: string;
      last_price_change?: string;
    } = {
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

    // price_history Migration 025b log_price_change trigger ile yazılır
    // (Bonus: trigger devraldığında NEW.price = data.price olur — buradaki
    // listing.price ↔ data.price karışıklığı otomatik düzelir.)

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
