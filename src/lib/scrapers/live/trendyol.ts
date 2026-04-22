/**
 * Trendyol live price fetcher.
 * Tries API first (fast, structured). Falls back to HTML parsing if API fails.
 * Endpoint URLs + response shapes are best-effort; verify vs existing batch scraper.
 */

import type { StoreFetcher, StoreLiveData } from "./types";

const TIMEOUT_MS = 4000;

function buildTrendyolApiUrl(sourceProductId: string): string {
  return `https://api.trendyol.com/webproductgw/api/productDetail/${encodeURIComponent(sourceProductId)}`;
}

function buildTrendyolPageUrl(sourceProductId: string): string {
  return `https://www.trendyol.com/sr?pi=${encodeURIComponent(sourceProductId)}`;
}

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
];

function pickUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export async function fetchTrendyol(sourceProductId: string): Promise<StoreLiveData> {
  try {
    return await fetchTrendyolApi(sourceProductId);
  } catch (err: any) {
    const msg = String(err?.message || err).toLowerCase();
    if (msg.includes("rate") || msg.includes("block") || msg.includes("403")) throw err;
    return await fetchTrendyolHtml(sourceProductId);
  }
}

async function fetchTrendyolApi(sourceProductId: string): Promise<StoreLiveData> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(buildTrendyolApiUrl(sourceProductId), {
      signal: controller.signal,
      headers: {
        "User-Agent": pickUA(),
        Accept: "application/json",
        "Accept-Language": "tr-TR,tr;q=0.9",
        "x-storefront-id": "1",
        "x-application-id": "1",
      },
    });

    if (!response.ok) {
      if (response.status === 404) throw new Error("not_found");
      if (response.status === 429) throw new Error("rate_limited");
      if (response.status === 403) throw new Error("blocked");
      throw new Error(`api_http_${response.status}`);
    }

    const data = await response.json();
    return parseTrendyolApiResponse(data);
  } catch (err: any) {
    if (err.name === "AbortError") throw new Error("api_timeout");
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseTrendyolApiResponse(data: any): StoreLiveData {
  const result = data?.result ?? data?.data ?? data;

  const price = parseNumber(
    result?.price?.sellingPrice ??
      result?.price?.discounted ??
      result?.sellingPrice ??
      result?.discountedPrice ??
      result?.price
  );
  if (price === null) throw new Error("no_price_in_api");

  const originalPrice = parseNumber(
    result?.price?.originalPrice ?? result?.originalPrice ?? result?.listPrice
  );

  const inStock =
    result?.stock?.isAvailable ??
    result?.isAvailable ??
    (parseNumber(result?.stock?.quantity) !== null && (result?.stock?.quantity ?? 0) > 0);

  const sellerName = parseString(
    result?.merchant?.name ?? result?.seller?.name ?? result?.merchantName
  );

  const installments = result?.installmentOptions ?? result?.installments ?? [];
  let installmentHint: string | null = null;
  if (Array.isArray(installments) && installments.length > 0) {
    const maxMonths = Math.max(
      ...installments
        .map((i: any) => parseNumber(i?.count ?? i?.months))
        .filter((n: any): n is number => typeof n === "number")
    );
    if (maxMonths > 0) installmentHint = `${maxMonths} taksit`;
  }

  const campaigns = result?.campaigns ?? result?.promotions ?? [];
  let campaignHint: string | null = null;
  if (Array.isArray(campaigns) && campaigns.length > 0) {
    const text = parseString(campaigns[0]?.name ?? campaigns[0]?.description);
    campaignHint = text ? truncate(text, 80) : null;
  }

  const freeShipping =
    result?.freeCargo ?? result?.freeShipping ?? result?.shippingInfo?.isFree ?? false;

  return {
    price,
    original_price: originalPrice && originalPrice > price ? originalPrice : null,
    currency: "TRY",
    in_stock: Boolean(inStock),
    stock_count: parseNumber(result?.stock?.quantity),
    shipping_price: parseNumber(result?.shippingPrice),
    free_shipping: Boolean(freeShipping),
    seller_name: sellerName,
    installment_hint: installmentHint,
    campaign_hint: campaignHint,
    affiliate_url: null,
    fetched_at: new Date().toISOString(),
  };
}

async function fetchTrendyolHtml(sourceProductId: string): Promise<StoreLiveData> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(buildTrendyolPageUrl(sourceProductId), {
      signal: controller.signal,
      headers: {
        "User-Agent": pickUA(),
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "tr-TR,tr;q=0.9",
      },
      redirect: "follow",
    });

    if (!response.ok) {
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
  const stateMatch = html.match(
    /__PRODUCT_DETAIL_APP_INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});/
  );

  if (stateMatch) {
    try {
      const state = JSON.parse(stateMatch[1]);
      const product = state?.product ?? state?.productDetail;
      if (product) return parseTrendyolApiResponse({ result: product });
    } catch {
      /* fall through */
    }
  }

  const priceMatch = html.match(/"discountedPrice"\s*:\s*(\d+(?:\.\d+)?)/);
  if (!priceMatch) throw new Error("no_price_in_html");
  const price = parseNumber(priceMatch[1]);
  if (price === null) throw new Error("invalid_price");

  const originalMatch = html.match(/"originalPrice"\s*:\s*(\d+(?:\.\d+)?)/);
  const originalPrice = originalMatch ? parseNumber(originalMatch[1]) : null;

  const inStock = !/tükendi|stokta\s*yok|sold\s*out/i.test(html);

  return {
    price,
    original_price: originalPrice && originalPrice > price ? originalPrice : null,
    currency: "TRY",
    in_stock: inStock,
    stock_count: null,
    shipping_price: null,
    free_shipping: /ücretsiz\s*kargo|kargo\s*bedava/i.test(html),
    seller_name: null,
    installment_hint: null,
    campaign_hint: null,
    affiliate_url: null,
    fetched_at: new Date().toISOString(),
  };
}

function parseNumber(v: unknown): number | null {
  if (typeof v === "number" && !isNaN(v)) return v;
  if (typeof v === "string") {
    let n = v.replace(/[^\d.,]/g, "");
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

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

export const trendyolFetcher: StoreFetcher = {
  source: "trendyol",
  fetch: fetchTrendyol,
  timeoutMs: TIMEOUT_MS,
  rpmLimit: 30,
};
