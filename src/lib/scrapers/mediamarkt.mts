/**
 * MediaMarkt scraper
 * - Sitemap -> JSON-LD -> Apollo cache walker (specs)
 * - Breadcrumb filter -> hedef kategori
 */

import * as cheerio from 'cheerio';
import { findDbSlugForMmBreadcrumb } from './mediamarkt-category-map.mjs';
import type {
  JsonLdEnvelope,
  JsonLdProductLike,
  JsonLdOffer,
  JsonLdBreadcrumbItem,
  PreloadedState,
  ApolloCache,
} from './mediamarkt-types.mjs';
import { isApolloRef, hasFeatureName } from './mediamarkt-types.mjs';

const MM_BASE = 'https://www.mediamarkt.com.tr';
const SITEMAP_INDEX = `${MM_BASE}/sitemaps/sitemap-index.xml`;
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

export const MM_STORE_UUID = 'dc8d9257-f5b4-4a1c-9141-20a8b9749310';

export interface MmScrapedProduct {
  source_product_id: string;
  source_url: string;
  affiliate_url: string;
  source_title: string;
  source_category: string | null;
  price: number;
  currency: 'TRY';
  free_shipping: boolean;
  in_stock: boolean;
  raw_images: string[];
  raw_description: string | null;
  raw_specs: Record<string, string> | null;
  gtin13: string | null;
  brand: string | null;
  name: string;
  dbSlug: string | null;
  breadcrumb: { name: string; position: number }[];
}

// -----------------------------------------------------
// Sitemap reader
// -----------------------------------------------------

export async function fetchProductDetailShards(): Promise<string[]> {
  const xml = await fetchText(SITEMAP_INDEX);
  const $ = cheerio.load(xml, { xmlMode: true });
  const shards: string[] = [];
  $('sitemap loc').each((_, el) => {
    const url = $(el).text().trim();
    if (url.includes('productdetailspages')) shards.push(url);
  });
  return shards;
}

export async function fetchProductUrlsFromShard(shardUrl: string): Promise<string[]> {
  const xml = await fetchText(shardUrl);
  const $ = cheerio.load(xml, { xmlMode: true });
  const urls: string[] = [];
  $('url loc').each((_, el) => {
    urls.push($(el).text().trim());
  });
  return urls;
}

// -----------------------------------------------------
// Apollo cache walker
// -----------------------------------------------------

/**
 * window.__PRELOADED_STATE__'ten flat specs cikar.
 * Yapi:
 *   state.apolloState[GraphqlProduct:Media:tr-TR:<sku>]
 *     .featureGroupsWithProductId.__ref
 *   -> state.apolloState[GraphqlProductFeatureGroups:<sku>].featureGroups[]
 *     .features[].__ref
 *     -> state.apolloState[GraphqlProductFeature:...].{name, value, unit}
 */
function extractSpecsFromHtml(html: string, sku: string): Record<string, string> | null {
  const m = html.match(/window\.__PRELOADED_STATE__\s*=\s*({[\s\S]+?});<\/script>/);
  if (!m) return null;

  let raw = m[1];
  raw = raw.replace(/:\s*undefined([,}\]])/g, ':null$1');

  let state: PreloadedState;
  try {
    state = JSON.parse(raw) as PreloadedState;
  } catch {
    return null;
  }

  const cache: ApolloCache | undefined = state.apolloState;
  if (!cache || typeof cache !== 'object') return null;

  const prodKey = Object.keys(cache).find(k =>
    k.startsWith('GraphqlProduct:') &&
    !k.startsWith('GraphqlProductFeature') &&
    !k.startsWith('GraphqlProductFeatureGroup') &&
    !k.startsWith('GraphqlProductMatch') &&
    !k.startsWith('GraphqlProductAggregate') &&
    k.endsWith(':' + sku)
  );
  if (!prodKey) return null;

  const product = cache[prodKey];
  if (!product) return null;

  if (!isApolloRef(product.featureGroupsWithProductId)) return null;
  const containerRef = product.featureGroupsWithProductId.__ref;

  const container = cache[containerRef];
  if (!container || !Array.isArray(container.featureGroups)) return null;

  const specs: Record<string, string> = {};

  for (const group of container.featureGroups) {
    if (!Array.isArray(group.features)) continue;

    for (const featRef of group.features) {
      if (!isApolloRef(featRef)) continue;
      const refKey = featRef.__ref;

      const feat = cache[refKey];
      if (!hasFeatureName(feat) || feat.value == null) continue;

      const name = String(feat.name).trim();
      const value = String(feat.value).trim();
      const unit = feat.unit ? String(feat.unit).trim() : '';

      if (!name || !value) continue;

      const finalValue = unit && !value.toLowerCase().includes(unit.toLowerCase())
        ? `${value} ${unit}`
        : value;

      if (!(name in specs)) {
        specs[name] = finalValue;
      }
    }
  }

  return Object.keys(specs).length > 0 ? specs : null;
}

// -----------------------------------------------------
// PDP scraper
// -----------------------------------------------------

// BLACKLIST — yenilenmis / refurbished urunler scrape edilmez (karar: 2026-04-27)
export const REFURBISHED_PATTERNS: RegExp[] = [
  /yenilenm/i,
  /refurb/i,
  /ikinci\s*el/i,
  /\b2\.?\s*el\b/i,
];

export function isRefurbished(opts: {
  title?: string;
  url?: string;
  breadcrumb?: { name: string }[] | string[];
}): boolean {
  const breadcrumbStr = Array.isArray(opts.breadcrumb)
    ? opts.breadcrumb
        .map((b) => (typeof b === "string" ? b : b?.name ?? ""))
        .join(" | ")
    : "";
  const haystack = `${opts.title ?? ""} | ${opts.url ?? ""} | ${breadcrumbStr}`;
  return REFURBISHED_PATTERNS.some((p) => p.test(haystack));
}

export type ScrapeFailReason =
  | 'no_jsonld'
  | 'no_product_type'
  | 'no_offers'
  | 'no_breadcrumb_match'
  | 'no_sku'
  | 'refurbished'
  | 'no_price';

export type ScrapeResult =
  | { ok: true; scraped: MmScrapedProduct }
  | { ok: false; reason: ScrapeFailReason; debugTitle?: string };

export async function scrapePdpDetailed(pdpUrl: string): Promise<ScrapeResult> {
  const html = await fetchText(pdpUrl);
  const $ = cheerio.load(html);

  // P6.12g: 'product' birden çok JSON-LD schema variant'ından (Product /
  // ProductGroup / nested object/mainEntity wrapper) cheerio.each callback
  // içinde dinamik atanır. JsonLdProductLike narrowing TS control flow analizini
  // each() içindeki assignment'larla taşıyamayıp 17 TS2339 cascade üretti.
  // Opt-out: bu satırda 'any' kabul edilir (sub-borç P6.12g-product-narrow,
  // generic JSON-LD union narrowing veya extractor function refactor gerek).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let product: any = null;
  let breadcrumb: { name: string; position: number }[] = [];
  let jsonldFound = false;
  let productTypeFound = false;

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const txt = $(el).html()?.trim() ?? '';
      if (!txt) return;
      jsonldFound = true;
      const data: unknown = JSON.parse(txt);
      const items: JsonLdEnvelope[] = Array.isArray(data)
        ? (data as JsonLdEnvelope[])
        : [data as JsonLdEnvelope];

      for (const item of items) {
        // MM JSON-LD yapisi: Product/ProductGroup BuyAction.object icinde gomulu
        // Apple iPhone PDP'leri ProductGroup tipinde geliyor — onlari da kabul et
        const p: JsonLdProductLike = item.object ?? item.mainEntity ?? (item as JsonLdProductLike);
        const t = p['@type'];
        if (t === 'Product' || t === 'ProductGroup') {
          productTypeFound = true;
          if (p.offers) {
            product = p;
          } else if (p['@type'] === 'ProductGroup' && Array.isArray(p.hasVariant) && p.hasVariant.length > 0) {
            // ProductGroup variant fallback: ilk variant'in offers'ini kullan
            const firstVariant = p.hasVariant.find((v) => v?.offers);
            if (firstVariant) {
              product = { ...p, offers: firstVariant.offers, sku: firstVariant.sku ?? p.sku };
            }
          }
        } else if (p['@type'] === 'BreadcrumbList' && Array.isArray((p as JsonLdEnvelope).itemListElement)) {
          const itemList = (p as JsonLdEnvelope).itemListElement ?? [];
          breadcrumb = itemList.map((b: JsonLdBreadcrumbItem) => {
            const itemName = typeof b.item === 'object' ? b.item?.name : undefined;
            return {
              position: b.position ?? 0,
              name: b.name || itemName || '',
            };
          });
        }
      }
    } catch { /* parse fail, atla */ }
  });

  if (!jsonldFound) return { ok: false, reason: 'no_jsonld' };
  if (!productTypeFound) return { ok: false, reason: 'no_product_type' };
  if (!product) return { ok: false, reason: 'no_offers' };

  const matchResult = findDbSlugForMmBreadcrumb(breadcrumb);
  if (!matchResult) {
    return {
      ok: false,
      reason: 'no_breadcrumb_match',
      debugTitle: String(product.name ?? '').slice(0, 50),
    };
  }
  const { dbSlug, matchedSegment } = matchResult;

  const sku = String(product.sku ?? '').trim();
  if (!sku) return { ok: false, reason: 'no_sku' };

  // BLACKLIST guard — yenilenmis urunler scrape edilmez
  const productTitle = String(product.name ?? '').trim();
  if (isRefurbished({ title: productTitle, url: pdpUrl, breadcrumb })) {
    return { ok: false, reason: 'refurbished', debugTitle: productTitle.slice(0, 50) };
  }

  const sourceCategory: string | null = matchedSegment;

  const productImage = product.image;
  const images: string[] = Array.isArray(productImage)
    ? productImage.filter((u: unknown): u is string => typeof u === 'string')
    : (typeof productImage === 'string' ? [productImage] : []);

  // MM offers JSON-LD array da olabiliyor: [{price, availability}, ...]. Tek obje
  // beklemek (.offers?.price) varyantlarda undefined döndürüp price=0/in_stock=false
  // hatasına yol açıyordu (Panasonic KX-TU155 vakası). İlk geçerli offer'ı seç.
  const offer: JsonLdOffer | undefined = Array.isArray(product.offers)
    ? ((product.offers as JsonLdOffer[]).find((o: JsonLdOffer) => o && (o.price ?? o.lowPrice)) ?? product.offers[0])
    : product.offers;
  const rawPrice = Number(offer?.price ?? offer?.lowPrice ?? 0);
  const price = isFinite(rawPrice) && rawPrice > 0 ? rawPrice : 0;
  const inStock = price > 0 && String(offer?.availability ?? '').toLowerCase().includes('instock');
  const shippingValue = offer?.shippingDetails?.shippingRate?.value;
  const freeShipping = shippingValue === 0 || shippingValue === '0';

  const affiliate = pdpUrl.includes('?')
    ? `${pdpUrl}&utm_source=birtavsiye&utm_medium=referral`
    : `${pdpUrl}?utm_source=birtavsiye&utm_medium=referral`;

  const specs = extractSpecsFromHtml(html, sku);

  return {
    ok: true,
    scraped: {
      source_product_id: sku,
      source_url: pdpUrl,
      affiliate_url: affiliate,
      source_title: String(product.name ?? '').trim(),
      source_category: sourceCategory,
      price,
      currency: 'TRY',
      free_shipping: freeShipping,
      in_stock: inStock,
      raw_images: images,
      raw_description: typeof product.description === 'string' ? product.description : null,
      raw_specs: specs,
      gtin13: typeof product.gtin13 === 'string' ? product.gtin13 : null,
      brand: typeof product.brand === 'object' ? product.brand?.name ?? null : null,
      name: String(product.name ?? '').trim(),
      dbSlug,
      breadcrumb,
    },
  };
}

// Legacy wrapper — eski consumer'lar (scrape-mediamarkt-pilot.mjs) icin
export async function scrapePdp(pdpUrl: string): Promise<MmScrapedProduct | null> {
  const r = await scrapePdpDetailed(pdpUrl);
  return r.ok ? r.scraped : null;
}

// -----------------------------------------------------
// HTTP helper (Cloudflare cookie capture)
// -----------------------------------------------------

let cachedCookies: string = '';

async function fetchText(url: string, attempt: number = 0): Promise<string> {
  const headers: Record<string, string> = {
    'User-Agent': USER_AGENT,
    'Accept': 'text/html,application/xhtml+xml,application/xml,text/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.5',
  };
  if (cachedCookies) headers['Cookie'] = cachedCookies;

  const res = await fetch(url, { headers });

  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    const cfMatch = setCookie.match(/(__cf_bm|_cfuvid)=([^;]+)/g);
    if (cfMatch) cachedCookies = cfMatch.join('; ');
  }

  // 503 — Cloudflare cookie reset + 1 retry
  if (res.status === 503 && attempt < 1) {
    console.warn(`  [503] cookie reset + retry: ${url.slice(-60)}`);
    cachedCookies = '';
    await new Promise((r) => setTimeout(r, 5000));
    return fetchText(url, attempt + 1);
  }

  if (!res.ok) throw new Error(`Fetch ${url}: ${res.status}`);
  return await res.text();
}
