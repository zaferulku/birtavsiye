/**
 * N11 live price fetcher
 *
 * URL pattern: https://www.n11.com/urun/{slug}-{numeric-id} OR
 *              https://www.n11.com/arama?q=<title>
 *
 * Strategy:
 *   1. URL-based fetch: JSON-LD Product schema (N11 exposes it on detail pages)
 *   2. searchByTitle: /arama?q=... → ilk href → detail → JSON-LD price
 *
 * Anti-bot: N11 daha az agresif Cloudflare, datacenter IP'lerden çoğu zaman OK.
 * Akamai bot management seyrek devreye girer.
 */

import type {
  StoreFetcher,
  StoreLiveData,
  FetchContext,
  SearchContext,
} from "./types";

const TIMEOUT_MS = 5000;

// Mobile-only: datacenter IP + desktop UA → Cloudflare 403 (probe 2026-05-01).
// www.n11.com mobile UA'larda Status 200 dönüyor.
const USER_AGENTS = [
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36",
];

function pickUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

const STD_HEADERS = (): Record<string, string> => ({
  "User-Agent": pickUA(),
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
  "Cache-Control": "no-cache",
  Referer: "https://www.n11.com/",
});

async function fetchN11(url: string): Promise<string> {
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
// JSON-LD parser + HTML fallback
// ────────────────────────────────────────────────────────────────────────
function extractN11Price(html: string): StoreLiveData | null {
  // Tier 1: JSON-LD Product schema
  const matches = Array.from(
    html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  );
  for (const m of matches) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(m[1].trim());
    } catch {
      continue;
    }
    const items = Array.isArray(parsed) ? parsed : [parsed];
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const obj = item as Record<string, unknown>;
      if (obj["@type"] !== "Product") continue;
      const offersRaw = obj.offers as Record<string, unknown> | unknown[] | undefined;
      if (!offersRaw) continue;
      const offer = Array.isArray(offersRaw) ? offersRaw[0] : offersRaw;
      if (!offer || typeof offer !== "object") continue;
      const o = offer as Record<string, unknown>;
      const priceVal = parseFloat(String(o.price ?? "0"));
      if (!priceVal || isNaN(priceVal)) continue;
      const availability = String(o.availability ?? "").toLowerCase();
      const inStock = availability.includes("instock");
      const seller = o.seller as Record<string, unknown> | undefined;
      return {
        price: Math.round(priceVal),
        original_price: null,
        currency: typeof o.priceCurrency === "string" ? o.priceCurrency : "TRY",
        in_stock: inStock,
        stock_count: null,
        shipping_price: null,
        free_shipping: /ücretsiz kargo|kargo bedava/i.test(html),
        seller_name: seller && typeof seller.name === "string" ? seller.name : null,
        installment_hint: null,
        campaign_hint: null,
        affiliate_url: null,
        fetched_at: new Date().toISOString(),
      };
    }
  }

  // Tier 2: HTML "X.XXX,XX TL" fallback
  const tlMatch = html.match(/(\d{1,3}(?:\.\d{3})*)(?:,(\d{2}))?\s*TL/);
  if (tlMatch) {
    const whole = parseInt(tlMatch[1].replace(/\./g, ""), 10);
    if (whole > 100) {
      const inStock =
        /Sepete Ekle|Hemen Al/i.test(html) &&
        !/stokta yok|tükendi|şu anda mevcut değil/i.test(html);
      return {
        price: whole,
        original_price: null,
        currency: "TRY",
        in_stock: inStock,
        stock_count: null,
        shipping_price: null,
        free_shipping: /ücretsiz kargo|kargo bedava/i.test(html),
        seller_name: null,
        installment_hint: null,
        campaign_hint: null,
        affiliate_url: null,
        fetched_at: new Date().toISOString(),
      };
    }
  }

  return null;
}

// ────────────────────────────────────────────────────────────────────────
// URL-based fetch
// ────────────────────────────────────────────────────────────────────────
export async function fetchN11Live(ctx: FetchContext): Promise<StoreLiveData> {
  if (!ctx.sourceUrl) throw new Error("n11_requires_source_url");
  let url: URL;
  try {
    url = new URL(ctx.sourceUrl);
  } catch {
    throw new Error("invalid_source_url");
  }
  if (!url.hostname.endsWith("n11.com")) throw new Error("source_url_not_n11");

  const html = await fetchN11(url.toString());
  const data = extractN11Price(html);
  if (!data) throw new Error("parse_failed");
  return data;
}

// ────────────────────────────────────────────────────────────────────────
// Search-by-title (discover flow)
// ────────────────────────────────────────────────────────────────────────
async function searchN11(ctx: SearchContext): Promise<StoreLiveData | null> {
  const query = [ctx.brand, ctx.title].filter(Boolean).join(" ").trim();
  if (!query) return null;
  const searchUrl = `https://www.n11.com/arama?q=${encodeURIComponent(query)}`;

  let searchHtml: string;
  try {
    searchHtml = await fetchN11(searchUrl);
  } catch {
    return null;
  }

  // N11 product anchors typically /urun/{slug}-{id}; absolute or relative
  const hrefMatch = searchHtml.match(/href=["'](https?:\/\/(?:www\.)?n11\.com\/urun\/[^"']+)["']/i);
  let productUrl: string | null = hrefMatch ? hrefMatch[1] : null;

  if (!productUrl) {
    const relMatch = searchHtml.match(/href=["'](\/urun\/[^"']+)["']/i);
    if (relMatch) productUrl = `https://www.n11.com${relMatch[1]}`;
  }

  if (!productUrl) return null;

  let detailHtml: string;
  try {
    detailHtml = await fetchN11(productUrl);
  } catch {
    return null;
  }

  const data = extractN11Price(detailHtml);
  if (!data) return null;
  return { ...data, affiliate_url: productUrl };
}

export const n11Fetcher: StoreFetcher = {
  source: "n11",
  fetch: fetchN11Live,
  searchByTitle: searchN11,
  timeoutMs: TIMEOUT_MS,
  rpmLimit: 15,
};
