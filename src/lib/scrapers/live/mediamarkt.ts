/**
 * MediaMarkt live price fetcher
 *
 * HTML-based scraping with JSON-LD Product schema preferred,
 * regex fallback for fields not in schema.
 *
 * STATUS: Interface-compliant but URL pattern is a placeholder.
 * TODO: Align URL construction + parsing with existing batch scraper.
 * Current behavior:
 *   - If listing has source_url, use it directly
 *   - If not, construct URL from sourceProductId using best-guess pattern
 */

import type { StoreFetcher, StoreLiveData, FetchContext } from "./types";

const TIMEOUT_MS = 5000;

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
];

function pickUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function resolveUrl(ctx: FetchContext): string {
  if (ctx.sourceUrl) return ctx.sourceUrl;
  const id = ctx.sourceProductId;
  if (id.includes("-")) {
    return `https://www.mediamarkt.com.tr/tr/product/_${id}.html`;
  }
  return `https://www.mediamarkt.com.tr/tr/product/${id}.html`;
}

export async function fetchMediaMarkt(ctx: FetchContext): Promise<StoreLiveData> {
  const url = resolveUrl(ctx);

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("invalid_url");
  }
  if (!parsedUrl.hostname.endsWith("mediamarkt.com.tr")) {
    throw new Error("url_not_mediamarkt");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": pickUA(),
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9",
        "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
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
    return parseMediaMarktHtml(html);
  } catch (err: any) {
    if (err.name === "AbortError") throw new Error("timeout");
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseMediaMarktHtml(html: string): StoreLiveData {
  const jsonLdMatches = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );

  for (const match of jsonLdMatches) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const candidates = Array.isArray(parsed)
        ? parsed
        : parsed["@graph"] && Array.isArray(parsed["@graph"])
          ? parsed["@graph"]
          : [parsed];

      for (const item of candidates) {
        const type = item?.["@type"];
        const isProduct =
          type === "Product" ||
          (Array.isArray(type) && type.includes("Product"));
        // MediaMarkt'ın güncel JSON-LD layout'unda Product, BuyAction wrapper'ı
        // içine nest ediliyor: {"@type":"BuyAction","object":{"@type":"Product",...}}.
        // Top-level Product görünmüyor; nested object'i de Product olarak değerlendir.
        const isBuyActionWithProduct =
          (type === "BuyAction" || (Array.isArray(type) && type.includes("BuyAction"))) &&
          item?.object?.["@type"] === "Product";
        const productNode = isProduct
          ? item
          : isBuyActionWithProduct
            ? item.object
            : null;
        if (!productNode) continue;

        const result = parseProductSchema(productNode);
        if (result) return result;
      }
    } catch {
      continue;
    }
  }

  return extractFromHtml(html);
}

function parseProductSchema(product: any): StoreLiveData | null {
  const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers;
  if (!offers) return null;

  const price = parseNumber(offers.price ?? offers.lowPrice);
  if (price === null) return null;

  const originalPrice = parseNumber(offers.highPrice ?? offers.priceWithoutDiscount);
  const availability = String(offers.availability ?? "").toLowerCase();
  const inStock = availability.includes("instock") || availability.includes("in_stock");

  return {
    price,
    original_price: originalPrice && originalPrice > price ? originalPrice : null,
    currency: parseString(offers.priceCurrency) ?? "TRY",
    in_stock: inStock,
    stock_count: null,
    shipping_price: null,
    free_shipping: false,
    seller_name: parseString(offers.seller?.name) ?? "MediaMarkt",
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
    !/stokta\s*yok|tükendi/i.test(html) && /sepete\s*ekle/i.test(html);

  return {
    price,
    original_price: null,
    currency: "TRY",
    in_stock: inStock,
    stock_count: null,
    shipping_price: null,
    free_shipping: /ücretsiz\s*kargo|kargo\s*bedava/i.test(html),
    seller_name: "MediaMarkt",
    installment_hint: null,
    campaign_hint: null,
    affiliate_url: null,
    fetched_at: new Date().toISOString(),
  };
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

export const mediamarktFetcher: StoreFetcher = {
  source: "mediamarkt",
  fetch: fetchMediaMarkt,
  timeoutMs: TIMEOUT_MS,
  rpmLimit: 15,
};
