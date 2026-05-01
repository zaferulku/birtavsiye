/**
 * Trendyol live price fetcher
 *
 * Trendyol has a semi-public product API used by their own frontend.
 * Not officially documented; may change without notice.
 *
 * STATUS: Interface-compliant but URL/endpoint is a placeholder.
 * TODO: Align with existing batch scraper at scripts/scrapers/trendyol.
 *   - If listing has source_url, prefer HTML path (stable).
 *   - Otherwise construct API URL from sourceProductId.
 */

import type { StoreFetcher, StoreLiveData, FetchContext, SearchContext } from "./types";

const TIMEOUT_MS = 5000;

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
];

function pickUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export async function fetchTrendyol(ctx: FetchContext): Promise<StoreLiveData> {
  if (ctx.sourceUrl) {
    try {
      return await fetchTrendyolHtml(ctx.sourceUrl);
    } catch (err: any) {
      const msg = String(err?.message || err).toLowerCase();
      if (msg.includes("rate") || msg.includes("block")) throw err;
    }
  }

  return await fetchTrendyolApi(ctx.sourceProductId);
}

async function fetchTrendyolHtml(url: string): Promise<StoreLiveData> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": pickUA(),
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "tr-TR,tr;q=0.9",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      if (response.status === 404) throw new Error("not_found");
      if (response.status === 429) throw new Error("rate_limited");
      if (response.status === 403) throw new Error("blocked");
      throw new Error(`html_http_${response.status}`);
    }

    const html = await response.text();
    return parseTrendyolHtml(html);
  } catch (err: any) {
    if (err.name === "AbortError") throw new Error("html_timeout");
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseTrendyolHtml(html: string): StoreLiveData {
  const jsonLdMatches = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );

  for (const match of jsonLdMatches) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const candidates = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of candidates) {
        const type = item?.["@type"];
        const isProduct =
          type === "Product" || (Array.isArray(type) && type.includes("Product"));
        if (!isProduct) continue;

        const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
        if (!offers) continue;

        const price = parseNumber(offers.price);
        if (price === null) continue;

        return {
          price,
          original_price: parseNumber(offers.highPrice) ?? null,
          currency: parseString(offers.priceCurrency) ?? "TRY",
          in_stock: String(offers.availability ?? "").toLowerCase().includes("instock"),
          stock_count: null,
          shipping_price: null,
          free_shipping: /ücretsiz\s*kargo|kargo\s*bedava/i.test(html),
          seller_name: parseString(offers.seller?.name),
          installment_hint: null,
          campaign_hint: null,
          affiliate_url: null,
          fetched_at: new Date().toISOString(),
        };
      }
    } catch {
      continue;
    }
  }

  const stateMatch = html.match(
    /__PRODUCT_DETAIL_APP_INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});/
  );
  if (stateMatch) {
    try {
      const state = JSON.parse(stateMatch[1]);
      const product = state?.product ?? state?.productDetail;
      if (product) {
        const price = parseNumber(
          product?.price?.sellingPrice ?? product?.price?.discounted ?? product?.sellingPrice
        );
        if (price !== null) {
          return {
            price,
            original_price: parseNumber(
              product?.price?.originalPrice ?? product?.originalPrice
            ),
            currency: "TRY",
            in_stock: Boolean(product?.stock?.isAvailable ?? product?.isAvailable ?? true),
            stock_count: parseNumber(product?.stock?.quantity),
            shipping_price: null,
            free_shipping: Boolean(product?.freeCargo ?? product?.freeShipping),
            seller_name: parseString(product?.merchant?.name ?? product?.seller?.name),
            installment_hint: null,
            campaign_hint: null,
            affiliate_url: null,
            fetched_at: new Date().toISOString(),
          };
        }
      }
    } catch {
      /* fall through */
    }
  }

  throw new Error("no_price_in_html");
}

async function fetchTrendyolApi(sourceProductId: string): Promise<StoreLiveData> {
  const url = `https://api.trendyol.com/webproductgw/api/productDetail/${encodeURIComponent(sourceProductId)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": pickUA(),
        Accept: "application/json",
        "Accept-Language": "tr-TR,tr;q=0.9",
      },
    });

    if (!response.ok) {
      if (response.status === 404) throw new Error("not_found");
      if (response.status === 429) throw new Error("rate_limited");
      if (response.status === 403) throw new Error("blocked");
      throw new Error(`api_http_${response.status}`);
    }

    const data = await response.json();
    const result = data?.result ?? data?.data ?? data;

    const price = parseNumber(
      result?.price?.sellingPrice ??
        result?.price?.discounted ??
        result?.sellingPrice ??
        result?.price
    );

    if (price === null) throw new Error("no_price_in_api");

    const originalPrice = parseNumber(
      result?.price?.originalPrice ?? result?.originalPrice
    );
    const inStock =
      result?.stock?.isAvailable ??
      result?.isAvailable ??
      (parseNumber(result?.stock?.quantity) ?? 0) > 0;

    return {
      price,
      original_price: originalPrice && originalPrice > price ? originalPrice : null,
      currency: "TRY",
      in_stock: Boolean(inStock),
      stock_count: parseNumber(result?.stock?.quantity),
      shipping_price: null,
      free_shipping: Boolean(result?.freeCargo ?? result?.freeShipping),
      seller_name: parseString(result?.merchant?.name ?? result?.seller?.name),
      installment_hint: null,
      campaign_hint: null,
      affiliate_url: null,
      fetched_at: new Date().toISOString(),
    };
  } catch (err: any) {
    if (err.name === "AbortError") throw new Error("api_timeout");
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseNumber(v: unknown): number | null {
  if (typeof v === "number" && !isNaN(v)) return v;
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (!trimmed) return null;
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      const n = parseFloat(trimmed);
      return isNaN(n) ? null : n;
    }
    let n = trimmed.replace(/[^\d.,\-]/g, "");
    if (n.includes(",") && n.includes(".")) {
      const lastComma = n.lastIndexOf(",");
      const lastDot = n.lastIndexOf(".");
      if (lastComma > lastDot) n = n.replace(/\./g, "").replace(",", ".");
      else n = n.replace(/,/g, "");
    } else if (n.includes(",")) {
      const parts = n.split(",");
      if (parts.length === 2 && parts[1].length <= 2) n = n.replace(",", ".");
      else n = n.replace(/,/g, "");
    }
    const parsed = parseFloat(n);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

function parseString(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

// ────────────────────────────────────────────────────────────────────────
// Search-by-title (discover flow)
// ────────────────────────────────────────────────────────────────────────
async function searchTrendyol(ctx: SearchContext): Promise<StoreLiveData | null> {
  const query = [ctx.brand, ctx.title].filter(Boolean).join(" ").trim();
  if (!query) return null;
  const searchUrl = `https://www.trendyol.com/sr?q=${encodeURIComponent(query)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let searchHtml: string;
  try {
    const res = await fetch(searchUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": pickUA(),
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "tr-TR,tr;q=0.9",
        Referer: "https://www.trendyol.com/",
      },
      redirect: "follow",
    });
    if (!res.ok) return null;
    searchHtml = await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }

  // Trendyol search result anchors: /<slug>-p-<numericId> or full URL
  const hrefMatch =
    searchHtml.match(/href=["'](https?:\/\/(?:www\.)?trendyol\.com\/[^"']*-p-\d+[^"']*)["']/i) ??
    searchHtml.match(/href=["'](\/[^"']*-p-\d+[^"']*)["']/i);
  if (!hrefMatch) return null;

  let productUrl = hrefMatch[1];
  if (productUrl.startsWith("/")) productUrl = `https://www.trendyol.com${productUrl}`;

  try {
    const data = await fetchTrendyolHtml(productUrl);
    return { ...data, affiliate_url: productUrl };
  } catch {
    return null;
  }
}

export const trendyolFetcher: StoreFetcher = {
  source: "trendyol",
  fetch: fetchTrendyol,
  searchByTitle: searchTrendyol,
  timeoutMs: TIMEOUT_MS,
  rpmLimit: 30,
};
