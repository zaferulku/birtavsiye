/**
 * MediaMarkt live price fetcher.
 * Static HTML pages. Prefer JSON-LD Product schema, fall back to regex.
 */

import type { StoreFetcher, StoreLiveData } from "./types";

const TIMEOUT_MS = 4000;

function buildMediaMarktUrl(sourceProductId: string): string {
  if (sourceProductId.includes("-")) {
    return `https://www.mediamarkt.com.tr/tr/product/_${sourceProductId}.html`;
  }
  return `https://www.mediamarkt.com.tr/tr/product/${sourceProductId}.html`;
}

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
];

function pickUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export async function fetchMediaMarkt(sourceProductId: string): Promise<StoreLiveData> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = buildMediaMarktUrl(sourceProductId);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": pickUA(),
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9",
        "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
        "Cache-Control": "no-cache",
      },
    });

    if (!response.ok) {
      if (response.status === 404) throw new Error("not_found");
      if (response.status === 429) throw new Error("rate_limited");
      if (response.status === 403) throw new Error("blocked");
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    return parseMediaMarktHtml(html);
  } catch (err: any) {
    if (err.name === "AbortError") throw new Error("timeout");
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseMediaMarktHtml(html: string): StoreLiveData {
  const jsonLdMatch = html.match(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );

  if (jsonLdMatch) {
    for (const block of jsonLdMatch) {
      try {
        const jsonText = block.replace(/<script[^>]*>|<\/script>/gi, "").trim();
        const data = JSON.parse(jsonText);
        const products = Array.isArray(data) ? data : [data];
        for (const item of products) {
          if (item["@type"] === "Product" || item["@type"]?.includes?.("Product")) {
            const result = extractFromJsonLd(item);
            if (result) return result;
          }
        }
      } catch {
        /* continue */
      }
    }
  }

  return extractFromHtml(html);
}

function extractFromJsonLd(item: any): StoreLiveData | null {
  const offer = item.offers ?? item.offer;
  if (!offer) return null;

  const price = parseNumber(offer.price ?? offer.lowPrice);
  if (price === null) return null;

  const availability = String(offer.availability ?? "").toLowerCase();
  const inStock = availability.includes("instock") || availability.includes("in_stock");

  return {
    price,
    original_price: parseNumber(offer.priceWithoutDiscount ?? offer.highPrice),
    currency: String(offer.priceCurrency ?? "TRY"),
    in_stock: inStock,
    stock_count: null,
    shipping_price: null,
    free_shipping: false,
    seller_name: parseString(offer.seller?.name) ?? "MediaMarkt",
    installment_hint: null,
    campaign_hint: null,
    affiliate_url: null,
    fetched_at: new Date().toISOString(),
  };
}

function extractFromHtml(html: string): StoreLiveData {
  const pricePatterns = [
    /data-price=["'](\d+(?:[.,]\d+)?)["']/,
    /"price"\s*:\s*["']?(\d+(?:[.,]\d+)?)["']?/,
    /class=["'][^"']*price[^"']*["'][^>]*>\s*([\d.,]+)\s*TL/i,
  ];

  let price: number | null = null;
  for (const pat of pricePatterns) {
    const m = html.match(pat);
    if (m) {
      price = parseNumber(m[1]);
      if (price !== null) break;
    }
  }

  if (price === null) throw new Error("no_price_in_html");

  const inStock =
    !/stokta\s*yok|tükendi|sold\s*out|out\s*of\s*stock/i.test(html) &&
    /sepete\s*ekle|add\s*to\s*cart/i.test(html);

  const originalMatch = html.match(
    /(?:original|strike|was|eski)[^<]*?([\d.]+(?:[,.]\d+)?)\s*TL/i
  );
  const originalPrice = originalMatch ? parseNumber(originalMatch[1]) : null;

  const freeShipping = /ücretsiz\s*kargo|kargo\s*bedava|free\s*shipping/i.test(html);

  const installmentMatch = html.match(/(\d{1,2})\s*(?:ay|taksit)/i);
  const installmentHint = installmentMatch ? `${installmentMatch[1]} taksit` : null;

  return {
    price,
    original_price: originalPrice && originalPrice > price ? originalPrice : null,
    currency: "TRY",
    in_stock: inStock,
    stock_count: null,
    shipping_price: null,
    free_shipping: freeShipping,
    seller_name: "MediaMarkt",
    installment_hint: installmentHint,
    campaign_hint: null,
    affiliate_url: null,
    fetched_at: new Date().toISOString(),
  };
}

function parseNumber(v: unknown): number | null {
  if (typeof v === "number" && !isNaN(v)) return v;
  if (typeof v === "string") {
    let normalized = v.replace(/[^\d.,]/g, "");
    if (normalized.includes(",") && normalized.includes(".")) {
      const lastComma = normalized.lastIndexOf(",");
      const lastDot = normalized.lastIndexOf(".");
      if (lastComma > lastDot) {
        normalized = normalized.replace(/\./g, "").replace(",", ".");
      } else {
        normalized = normalized.replace(/,/g, "");
      }
    } else if (normalized.includes(",")) {
      const parts = normalized.split(",");
      if (parts.length === 2 && parts[1].length <= 2) {
        normalized = normalized.replace(",", ".");
      } else {
        normalized = normalized.replace(/,/g, "");
      }
    }
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

function parseString(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

export const mediamarktFetcher: StoreFetcher = {
  source: "mediamarkt",
  fetch: fetchMediaMarkt,
  timeoutMs: TIMEOUT_MS,
  rpmLimit: 15,
};
