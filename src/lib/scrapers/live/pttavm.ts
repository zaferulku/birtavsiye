/**
 * PttAVM live price fetcher
 *
 * PttAVM product pages are HTML with schema.org/Product JSON-LD embedded.
 * No public API; we parse the public product detail page.
 *
 * URL pattern: https://www.pttavm.com/{slug}-p-{numeric-id}
 * Stored in listings.source_url (full URL, not just ID).
 *
 * Response strategy (in order):
 *   1. Extract JSON-LD script blocks, find Product schema, parse offers
 *   2. Fall back to HTML regex if JSON-LD missing/malformed
 *
 * No Cloudflare or CAPTCHA on PttAVM — User-Agent optional but used for politeness.
 */

import type { StoreFetcher, StoreLiveData, FetchContext } from "./types";

const TIMEOUT_MS = 5000;

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
];

function pickUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export async function fetchPttavm(ctx: FetchContext): Promise<StoreLiveData> {
  if (!ctx.sourceUrl) {
    throw new Error("pttavm_requires_source_url");
  }

  let url: URL;
  try {
    url = new URL(ctx.sourceUrl);
  } catch {
    throw new Error("invalid_source_url");
  }
  if (!url.hostname.endsWith("pttavm.com")) {
    throw new Error("source_url_not_pttavm");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": pickUA(),
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9",
        "Accept-Language": "tr-TR,tr;q=0.9",
        "Cache-Control": "no-cache",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      if (response.status === 404) throw new Error("not_found");
      if (response.status === 429) throw new Error("rate_limited");
      if (response.status === 403) throw new Error("blocked");
      throw new Error(`http_${response.status}`);
    }

    const html = await response.text();
    return parsePttavmHtml(html);
  } catch (err: any) {
    if (err.name === "AbortError") throw new Error("timeout");
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

function parsePttavmHtml(html: string): StoreLiveData {
  const fromLd = extractFromJsonLd(html);
  if (fromLd) {
    return enrichWithHtmlFields(fromLd, html);
  }
  return extractFromHtml(html);
}

// ============================================================================
// JSON-LD extraction (primary path)
// ============================================================================

function extractFromJsonLd(html: string): StoreLiveData | null {
  const scriptMatches = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );

  for (const match of scriptMatches) {
    const jsonText = match[1].trim();
    if (!jsonText) continue;

    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      continue;
    }

    const candidates = Array.isArray(parsed)
      ? parsed
      : parsed["@graph"] && Array.isArray(parsed["@graph"])
        ? parsed["@graph"]
        : [parsed];

    for (const item of candidates) {
      if (!item || typeof item !== "object") continue;
      const type = item["@type"];
      const isProduct =
        type === "Product" ||
        (Array.isArray(type) && type.includes("Product"));
      if (!isProduct) continue;

      const result = parseProductSchema(item);
      if (result) return result;
    }
  }

  return null;
}

function parseProductSchema(product: any): StoreLiveData | null {
  const offers = normalizeOffers(product.offers);
  if (!offers) return null;

  const price = parseNumber(offers.price ?? offers.lowPrice);
  if (price === null) return null;

  const originalPrice = parseNumber(offers.highPrice);
  const currency = parseString(offers.priceCurrency) ?? "TRY";

  const availability = parseString(offers.availability) ?? "";
  const inStock =
    /instock/i.test(availability) || /in_stock/i.test(availability);

  const sellerName =
    parseString(offers.seller?.name) ??
    parseString(product.brand?.name) ??
    "PttAVM";

  const shippingRate = offers.shippingDetails?.shippingRate;
  const shippingPrice = parseNumber(shippingRate?.value);
  const freeShipping = shippingPrice === 0;

  return {
    price,
    original_price: originalPrice && originalPrice > price ? originalPrice : null,
    currency,
    in_stock: inStock,
    stock_count: null,
    shipping_price: shippingPrice,
    free_shipping: freeShipping,
    seller_name: sellerName,
    installment_hint: null,
    campaign_hint: null,
    affiliate_url: null,
    fetched_at: new Date().toISOString(),
  };
}

function normalizeOffers(offers: any): any | null {
  if (!offers) return null;
  if (Array.isArray(offers)) {
    if (offers.length === 0) return null;
    const sorted = [...offers].sort((a, b) => {
      const pa = parseNumber(a?.price ?? a?.lowPrice) ?? Infinity;
      const pb = parseNumber(b?.price ?? b?.lowPrice) ?? Infinity;
      return pa - pb;
    });
    return sorted[0];
  }
  return offers;
}

// ============================================================================
// HTML-only enrichment
// ============================================================================

function enrichWithHtmlFields(base: StoreLiveData, html: string): StoreLiveData {
  return {
    ...base,
    installment_hint: extractInstallmentHint(html),
    campaign_hint: extractCampaignHint(html),
  };
}

function extractInstallmentHint(html: string): string | null {
  const patterns = [
    /peşin\s*fiyatın[ae]\s*(\d{1,2})\s*taksit/i,
    /(\d{1,2})\s*aya\s*varan\s*taksit/i,
    /(\d{1,2})\s*taksit(?!\s*seçen)/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) {
      const count = parseInt(m[1], 10);
      if (count > 0 && count <= 36) {
        return `${count} taksit`;
      }
    }
  }
  return null;
}

function extractCampaignHint(html: string): string | null {
  const patterns = [
    /<[^>]*class=["'][^"']*campaign[^"']*["'][^>]*>([^<]+)</i,
    /<[^>]*class=["'][^"']*kampanya[^"']*["'][^>]*>([^<]+)</i,
    /<[^>]*class=["'][^"']*badge-promo[^"']*["'][^>]*>([^<]+)</i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) {
      const text = m[1].replace(/\s+/g, " ").trim();
      if (text.length > 0 && text.length < 200) {
        return text.length > 80 ? text.slice(0, 77) + "…" : text;
      }
    }
  }
  return null;
}

// ============================================================================
// HTML regex fallback
// ============================================================================

function extractFromHtml(html: string): StoreLiveData {
  const pricePatterns = [
    /itemprop=["']price["'][^>]*content=["']([\d.]+)["']/i,
    /<meta[^>]*property=["']product:price:amount["'][^>]*content=["']([\d.]+)["']/i,
    /class=["'][^"']*price[^"']*["'][^>]*>\s*([\d.,]+)\s*TL/i,
  ];

  let price: number | null = null;
  for (const p of pricePatterns) {
    const m = html.match(p);
    if (m) {
      price = parseNumber(m[1]);
      if (price !== null) break;
    }
  }

  if (price === null) {
    throw new Error("no_price_in_html");
  }

  const inStock =
    !/stokta\s*yok|tükendi|sold\s*out/i.test(html) &&
    /sepete\s*ekle|satın\s*al/i.test(html);

  return {
    price,
    original_price: null,
    currency: "TRY",
    in_stock: inStock,
    stock_count: null,
    shipping_price: null,
    free_shipping: /ücretsiz\s*kargo|kargo\s*bedava/i.test(html),
    seller_name: "PttAVM",
    installment_hint: extractInstallmentHint(html),
    campaign_hint: extractCampaignHint(html),
    affiliate_url: null,
    fetched_at: new Date().toISOString(),
  };
}

// ============================================================================
// Helpers
// ============================================================================

function parseNumber(v: unknown): number | null {
  if (typeof v === "number" && !isNaN(v)) return v;
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (!trimmed) return null;

    const simple = parseFloat(trimmed);
    if (!isNaN(simple) && /^-?\d+(\.\d+)?$/.test(trimmed)) {
      return simple;
    }

    let n = trimmed.replace(/[^\d.,\-]/g, "");
    if (n.includes(",") && n.includes(".")) {
      const lastComma = n.lastIndexOf(",");
      const lastDot = n.lastIndexOf(".");
      if (lastComma > lastDot) {
        n = n.replace(/\./g, "").replace(",", ".");
      } else {
        n = n.replace(/,/g, "");
      }
    } else if (n.includes(",")) {
      const parts = n.split(",");
      if (parts.length === 2 && parts[1].length <= 2) {
        n = n.replace(",", ".");
      } else {
        n = n.replace(/,/g, "");
      }
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

export const pttavmFetcher: StoreFetcher = {
  source: "pttavm",
  fetch: fetchPttavm,
  timeoutMs: TIMEOUT_MS,
  rpmLimit: 60,
};
