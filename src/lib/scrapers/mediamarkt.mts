/**
 * MediaMarkt scraper
 * - Sitemap -> JSON-LD -> Apollo cache walker (specs)
 * - Breadcrumb filter -> hedef kategori
 */

import * as cheerio from 'cheerio';
import { findDbSlugForMmBreadcrumb } from './mediamarkt-category-map.mjs';

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

  let state: any;
  try {
    state = JSON.parse(raw);
  } catch {
    return null;
  }

  const cache = state.apolloState;
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

  const containerRef = product.featureGroupsWithProductId?.__ref;
  if (!containerRef) return null;

  const container = cache[containerRef];
  if (!container || !Array.isArray(container.featureGroups)) return null;

  const specs: Record<string, string> = {};

  for (const group of container.featureGroups) {
    if (!Array.isArray(group.features)) continue;

    for (const featRef of group.features) {
      const refKey = featRef?.__ref;
      if (!refKey) continue;

      const feat = cache[refKey];
      if (!feat?.name || feat.value == null) continue;

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

export async function scrapePdp(pdpUrl: string): Promise<MmScrapedProduct | null> {
  const html = await fetchText(pdpUrl);
  const $ = cheerio.load(html);

  let product: any = null;
  let breadcrumb: { name: string; position: number }[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const txt = $(el).html()?.trim() ?? '';
      if (!txt) return;
      const data = JSON.parse(txt);
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        // MM JSON-LD yapisi: Product BuyAction.object icinde gomulu
        const p = item.object || item.mainEntity || item;
        if (p['@type'] === 'Product' && p.offers) {
          product = p;
        } else if (p['@type'] === 'BreadcrumbList' && Array.isArray(p.itemListElement)) {
          breadcrumb = p.itemListElement.map((b: any) => ({
            position: b.position,
            name: b.name || b.item?.name || '',
          }));
        }
      }
    } catch { /* parse fail, atla */ }
  });

  if (!product) return null;

  const matchResult = findDbSlugForMmBreadcrumb(breadcrumb);
  if (!matchResult) return null;
  const { dbSlug, matchedSegment } = matchResult;

  const sku = String(product.sku ?? '').trim();
  if (!sku) return null;

  const sourceCategory: string | null = matchedSegment;

  const images: string[] = Array.isArray(product.image)
    ? product.image.filter((u: any) => typeof u === 'string')
    : (typeof product.image === 'string' ? [product.image] : []);

  const price = Number(product.offers?.price ?? 0);
  if (!price || price < 1) return null;

  const inStock = String(product.offers?.availability ?? '').includes('InStock');
  const shippingValue = product.offers?.shippingDetails?.shippingRate?.value;
  const freeShipping = shippingValue === 0 || shippingValue === '0';

  const affiliate = pdpUrl.includes('?')
    ? `${pdpUrl}&utm_source=birtavsiye&utm_medium=referral`
    : `${pdpUrl}?utm_source=birtavsiye&utm_medium=referral`;

  const specs = extractSpecsFromHtml(html, sku);

  return {
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
  };
}

// -----------------------------------------------------
// HTTP helper (Cloudflare cookie capture)
// -----------------------------------------------------

let cachedCookies: string = '';

async function fetchText(url: string): Promise<string> {
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

  if (!res.ok) throw new Error(`Fetch ${url}: ${res.status}`);
  return await res.text();
}
