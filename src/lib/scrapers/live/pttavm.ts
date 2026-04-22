/**
 * PttAVM live price fetcher.
 * NOTE: Endpoint + response shape are best-effort. Verify against existing
 * batch scraper and align field extraction if they differ.
 */

import type { StoreFetcher, StoreLiveData } from "./types";

const PTTAVM_BASE_URL = "https://api.pttavm.com";
const TIMEOUT_MS = 4000;

export async function fetchPttavm(sourceProductId: string): Promise<StoreLiveData> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = `${PTTAVM_BASE_URL}/product/${encodeURIComponent(sourceProductId)}`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": pickUserAgent(),
        Accept: "application/json",
        "Accept-Language": "tr-TR,tr;q=0.9",
      },
    });

    if (!response.ok) {
      if (response.status === 404) throw new Error(`Product not found: ${sourceProductId}`);
      if (response.status === 429) throw new Error("rate_limited");
      throw new Error(`HTTP ${response.status}`);
    }

    const raw = await response.json();
    return parsePttavmResponse(raw);
  } catch (err: any) {
    if (err.name === "AbortError") throw new Error("timeout");
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

function parsePttavmResponse(raw: any): StoreLiveData {
  const price = numberOrNull(raw?.price ?? raw?.salePrice ?? raw?.currentPrice);
  if (price === null) throw new Error("no_price_in_response");

  return {
    price,
    original_price: numberOrNull(raw?.originalPrice ?? raw?.listPrice),
    currency: "TRY",
    in_stock: parseBoolean(raw?.inStock ?? raw?.available ?? (raw?.stock > 0)),
    stock_count: numberOrNull(raw?.stockCount ?? raw?.stock),
    shipping_price: numberOrNull(raw?.shippingPrice),
    free_shipping: parseBoolean(raw?.freeShipping),
    seller_name: stringOrNull(raw?.seller?.name ?? raw?.sellerName),
    installment_hint: extractInstallmentHint(raw),
    campaign_hint: extractCampaignHint(raw),
    affiliate_url: null,
    fetched_at: new Date().toISOString(),
  };
}

function numberOrNull(v: unknown): number | null {
  if (typeof v === "number" && !isNaN(v)) return v;
  if (typeof v === "string") {
    const parsed = parseFloat(v.replace(/[^\d.,-]/g, "").replace(",", "."));
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

function stringOrNull(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

function parseBoolean(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v > 0;
  if (typeof v === "string") {
    const s = v.toLowerCase();
    return s === "true" || s === "1" || s === "yes" || s === "evet" || s === "var";
  }
  return false;
}

function extractInstallmentHint(raw: any): string | null {
  const options = raw?.installmentOptions ?? raw?.installments;
  if (!Array.isArray(options) || options.length === 0) return null;
  const maxMonths = Math.max(...options.map((o: any) => numberOrNull(o?.months ?? o?.count) ?? 0));
  return maxMonths > 0 ? `${maxMonths} taksit` : null;
}

function extractCampaignHint(raw: any): string | null {
  const campaigns = raw?.activeCampaigns ?? raw?.campaigns ?? raw?.promotions;
  if (!Array.isArray(campaigns) || campaigns.length === 0) return null;
  const first = campaigns[0];
  const text = stringOrNull(first?.description ?? first?.title ?? first?.text);
  if (!text) return null;
  return text.length > 80 ? text.slice(0, 77) + "..." : text;
}

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:122.0) Gecko/20100101 Firefox/122.0",
];

function pickUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export const pttavmFetcher: StoreFetcher = {
  source: "pttavm",
  fetch: fetchPttavm,
  timeoutMs: TIMEOUT_MS,
  rpmLimit: 60,
};
