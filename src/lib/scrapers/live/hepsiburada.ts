/**
 * Hepsiburada live price fetcher
 *
 * URL pattern: https://www.hepsiburada.com/{slug}-p-{ID}
 *
 * Strategy:
 *   1. URL-based fetch (when listing exists): JSON-LD Product schema
 *   2. searchByTitle (discover flow): /ara?q=<title>, parse first product
 *      href, fetch detail page, parse JSON-LD.
 *
 * Anti-bot: Hepsiburada Cloudflare gate-keeps datacenter IPs aggressively.
 * Local dev/home IP usually OK; from Vercel sometimes blocked.
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
  Referer: "https://www.hepsiburada.com/",
});

async function fetchHb(url: string): Promise<string> {
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
      if (res.status === 429) throw new Error("rate_limited");
      if (res.status === 403 || res.status === 451) throw new Error("blocked");
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
// Price extraction
// Hepsiburada JSON-LD = WebPage (Product yok). Price embedded JSON state
// içinde: "price":"81599.04". Fallback: HTML "X.XXX,XX TL" regex.
// ────────────────────────────────────────────────────────────────────────
function extractHbPrice(html: string): StoreLiveData | null {
  // Tier 1: embedded JSON state — "price":"81599.04"
  const jsonPriceMatch = html.match(/"price"\s*:\s*"?(\d+(?:\.\d+)?)"?/);
  let priceVal: number | null = null;
  if (jsonPriceMatch) {
    const v = parseFloat(jsonPriceMatch[1]);
    if (!isNaN(v) && v > 0) priceVal = Math.round(v);
  }

  // Tier 2: HTML "X.XXX,XX TL" (TR locale)
  if (priceVal === null) {
    const tlMatch = html.match(/(\d{1,3}(?:\.\d{3})*)(?:,(\d{2}))?\s*TL/);
    if (tlMatch) {
      const whole = parseInt(tlMatch[1].replace(/\./g, ""), 10);
      if (whole > 100) priceVal = whole; // "5TL" gibi dummies'i ele
    }
  }

  if (priceVal === null) return null;

  // Stok: "Sepete Ekle" varlığı + "stoklarda yok" yokluğu
  const inStock =
    /Sepete Ekle|Hemen Al/i.test(html) &&
    !/stoklarda yok|tükendi|şu anda mevcut değil/i.test(html);

  return {
    price: priceVal,
    original_price: null,
    currency: "TRY",
    in_stock: inStock,
    stock_count: null,
    shipping_price: null,
    free_shipping: /ücretsiz kargo/i.test(html),
    seller_name: null,
    installment_hint: null,
    campaign_hint: null,
    affiliate_url: null,
    fetched_at: new Date().toISOString(),
  };
}

// ────────────────────────────────────────────────────────────────────────
// URL-based fetch (existing listing)
// ────────────────────────────────────────────────────────────────────────
export async function fetchHepsiburada(ctx: FetchContext): Promise<StoreLiveData> {
  if (!ctx.sourceUrl) throw new Error("hepsiburada_requires_source_url");
  let url: URL;
  try {
    url = new URL(ctx.sourceUrl);
  } catch {
    throw new Error("invalid_source_url");
  }
  if (!url.hostname.endsWith("hepsiburada.com")) {
    throw new Error("source_url_not_hepsiburada");
  }

  const html = await fetchHb(url.toString());
  const data = extractHbPrice(html);
  if (!data) throw new Error("parse_failed");
  return data;
}

// ────────────────────────────────────────────────────────────────────────
// Search-by-title (discover flow)
// ────────────────────────────────────────────────────────────────────────
async function searchHepsiburada(ctx: SearchContext): Promise<StoreLiveData | null> {
  const query = [ctx.brand, ctx.title].filter(Boolean).join(" ").trim();
  if (!query) return null;
  const searchUrl = `https://www.hepsiburada.com/ara?q=${encodeURIComponent(query)}`;

  let searchHtml: string;
  try {
    searchHtml = await fetchHb(searchUrl);
  } catch {
    return null;
  }

  // Hepsiburada product anchors: href="/{slug}-p-{ID}"
  const hrefMatch = searchHtml.match(/href=["'](\/[^"']*-p-[A-Z0-9_-]+)["']/i);
  if (!hrefMatch) return null;
  const productUrl = `https://www.hepsiburada.com${hrefMatch[1]}`;

  let detailHtml: string;
  try {
    detailHtml = await fetchHb(productUrl);
  } catch {
    return null;
  }

  const data = extractHbPrice(detailHtml);
  if (!data) return null;
  return { ...data, affiliate_url: productUrl };
}

export const hepsiburadaFetcher: StoreFetcher = {
  source: "hepsiburada",
  fetch: fetchHepsiburada,
  searchByTitle: searchHepsiburada,
  timeoutMs: TIMEOUT_MS,
  rpmLimit: 20,
};
