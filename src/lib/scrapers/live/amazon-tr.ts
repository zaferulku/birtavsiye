/**
 * Amazon TR live price fetcher
 *
 * URL pattern: https://www.amazon.com.tr/dp/{ASIN} or full canonical URL.
 *
 * Strategy:
 *   1. URL-based fetch: HTML regex around .a-offscreen / data-a-offscreen /
 *      legacy priceblock_ourprice (JSON-LD coverage on Amazon is partial)
 *   2. searchByTitle: /s?k=<title>, parse first .s-result-item ASIN, fetch detail
 *
 * Anti-bot: Amazon serves CAPTCHA/410/503 from datacenter IPs frequently.
 * Local dev/home IP usually OK; cloud IPs typically blocked. Discover path
 * may fail silently (returns null) — by design.
 */

import type {
  StoreFetcher,
  StoreLiveData,
  FetchContext,
  SearchContext,
} from "./types";

const TIMEOUT_MS = 5000;

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0",
];

function pickUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

const STD_HEADERS = (): Record<string, string> => ({
  "User-Agent": pickUA(),
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
  "Cache-Control": "no-cache",
});

async function fetchAm(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: STD_HEADERS(),
      redirect: "follow",
    });
    if (!res.ok) {
      if (res.status === 404) throw new Error("not_found");
      if (res.status === 429 || res.status === 503) throw new Error("rate_limited");
      if (res.status === 403 || res.status === 410) throw new Error("blocked");
      throw new Error(`http_${res.status}`);
    }
    return await res.text();
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") throw new Error("timeout");
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ────────────────────────────────────────────────────────────────────────
// HTML price extraction — Amazon's DOM is messy; multiple selectors tried
// ────────────────────────────────────────────────────────────────────────
function extractAmazonPrice(html: string): StoreLiveData | null {
  // Tier 1: a-offscreen visible price (most reliable, includes currency)
  // e.g. <span class="a-offscreen">52.999,00 TL</span>
  const offMatch = html.match(/<span[^>]*class=["'][^"']*a-offscreen[^"']*["'][^>]*>([^<]+)<\/span>/i);
  let priceText: string | null = offMatch ? offMatch[1] : null;

  // Tier 2: corePriceDisplay (newer layout)
  if (!priceText) {
    const coreMatch = html.match(/data-a-offscreen=["']([^"']+)["']/i);
    if (coreMatch) priceText = coreMatch[1];
  }

  // Tier 3: priceblock_ourprice (legacy)
  if (!priceText) {
    const legacyMatch = html.match(/id=["']priceblock_(?:our|deal)price["'][^>]*>([^<]+)</i);
    if (legacyMatch) priceText = legacyMatch[1];
  }

  if (!priceText) return null;

  // "52.999,00 TL" → 52999 (TR locale: . thousands, , decimals; TL strip)
  const numericMatch = priceText.replace(/\s/g, "").match(/([\d.]+)(?:,(\d+))?/);
  if (!numericMatch) return null;
  const wholeStr = numericMatch[1].replace(/\./g, "");
  const whole = parseInt(wholeStr, 10);
  if (!whole || isNaN(whole)) return null;

  // Stock check: presence of "Sepete Ekle"; absence of unavailable phrases
  const inStock =
    /Sepete Ekle|Hemen Al|Add to Cart/i.test(html) &&
    !/Şu anda mevcut değil|Currently unavailable|out of stock/i.test(html);

  return {
    price: whole,
    original_price: null,
    currency: "TRY",
    in_stock: inStock,
    stock_count: null,
    shipping_price: null,
    free_shipping: /ücretsiz kargo|Free Shipping/i.test(html),
    seller_name: "Amazon",
    installment_hint: null,
    campaign_hint: null,
    affiliate_url: null,
    fetched_at: new Date().toISOString(),
  };
}

// ────────────────────────────────────────────────────────────────────────
// URL-based fetch
// ────────────────────────────────────────────────────────────────────────
export async function fetchAmazonTr(ctx: FetchContext): Promise<StoreLiveData> {
  let resolvedUrl: string | null = ctx.sourceUrl;

  // ASIN-only sourceProductId fallback
  if (!resolvedUrl && ctx.sourceProductId && /^[A-Z0-9]{10}$/i.test(ctx.sourceProductId)) {
    resolvedUrl = `https://www.amazon.com.tr/dp/${ctx.sourceProductId}`;
  }

  if (!resolvedUrl) throw new Error("amazon_tr_requires_source_url_or_asin");

  let url: URL;
  try {
    url = new URL(resolvedUrl);
  } catch {
    throw new Error("invalid_source_url");
  }
  if (!url.hostname.endsWith("amazon.com.tr")) {
    throw new Error("source_url_not_amazon_tr");
  }

  const html = await fetchAm(url.toString());
  const data = extractAmazonPrice(html);
  if (!data) throw new Error("parse_failed");
  return data;
}

// ────────────────────────────────────────────────────────────────────────
// Search-by-title (discover flow)
// ────────────────────────────────────────────────────────────────────────
async function searchAmazonTr(ctx: SearchContext): Promise<StoreLiveData | null> {
  const query = [ctx.brand, ctx.title].filter(Boolean).join(" ").trim();
  if (!query) return null;
  const searchUrl = `https://www.amazon.com.tr/s?k=${encodeURIComponent(query)}`;

  let searchHtml: string;
  try {
    searchHtml = await fetchAm(searchUrl);
  } catch {
    return null;
  }

  // First non-zero ASIN from search results: <div data-asin="B0XXXXXX" ...>
  const asinMatches = Array.from(searchHtml.matchAll(/data-asin=["']([A-Z0-9]{10})["']/g));
  let asin: string | null = null;
  for (const m of asinMatches) {
    if (m[1] && m[1] !== "0000000000") {
      asin = m[1];
      break;
    }
  }
  if (!asin) return null;

  const productUrl = `https://www.amazon.com.tr/dp/${asin}`;
  let detailHtml: string;
  try {
    detailHtml = await fetchAm(productUrl);
  } catch {
    return null;
  }

  const data = extractAmazonPrice(detailHtml);
  if (!data) return null;
  return { ...data, affiliate_url: productUrl };
}

export const amazonTrFetcher: StoreFetcher = {
  source: "amazon-tr",
  fetch: fetchAmazonTr,
  searchByTitle: searchAmazonTr,
  timeoutMs: TIMEOUT_MS,
  rpmLimit: 60,
};
