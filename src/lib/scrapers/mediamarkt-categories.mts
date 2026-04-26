/**
 * MediaMarkt kategori sayfasi reader
 *
 * Tek bir kategoriden tum urun URL'lerini al (pagination dahil).
 * Kategori sayfasi HTML'inde urun card'lari var: data-test="mms-product-card-X"
 * Her card'in href'i PDP URL'i.
 */

import * as cheerio from 'cheerio';

const MM_BASE = 'https://www.mediamarkt.com.tr';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

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

/**
 * Kategori sayfasindan urun URL'lerini ve toplam sayi bilgisini al.
 */
export async function fetchProductUrlsFromCategoryPage(
  categorySlug: string,
  page: number = 1
): Promise<{ urls: string[]; hasNextPage: boolean; totalCount: number | null }> {
  const url = page === 1
    ? `${MM_BASE}/tr/category/${categorySlug}.html`
    : `${MM_BASE}/tr/category/${categorySlug}.html?page=${page}`;

  const html = await fetchText(url);
  const $ = cheerio.load(html);

  // MM: data-test="mms-product-card" (suffix yok). Card icindeki ilk product link'ini al.
  // Fallback: tum /tr/product/ link'lerini topla (header/footer'da yok)
  const urls: string[] = [];
  $('[data-test="mms-product-card"]').each((_, el) => {
    const link = $(el).find('a[href*="/tr/product/"]').first();
    let href = link.attr('href');
    if (!href) return;
    if (href.startsWith('/')) href = MM_BASE + href;
    if (href.includes('/tr/product/') && !urls.includes(href)) {
      urls.push(href);
    }
  });

  // Fallback (selector miss kalirsa)
  if (urls.length === 0) {
    $('a[href*="/tr/product/"]').each((_, el) => {
      let href = $(el).attr('href');
      if (!href) return;
      if (href.startsWith('/')) href = MM_BASE + href;
      if (href.includes('/tr/product/') && !urls.includes(href)) {
        urls.push(href);
      }
    });
  }

  let totalCount: number | null = null;
  const totalMatch = html.match(/([\d.,]+)\s*(?:urun|sonuc|product|result)/i);
  if (totalMatch) {
    totalCount = parseInt(totalMatch[1].replace(/[.,]/g, ''), 10) || null;
  }

  const hasNextPage = urls.length >= 12;

  return { urls, hasNextPage, totalCount };
}

/**
 * Bir kategoriden TUM urun URL'lerini al (pagination loop).
 * onPageDone callback: her sayfadan sonra cagrilir.
 */
export async function fetchAllProductsFromCategory(
  categorySlug: string,
  options: {
    delayMs?: number;
    maxPages?: number;
    startPage?: number;
    onPageDone?: (page: number, urlsFound: number) => Promise<void>;
  } = {}
): Promise<string[]> {
  const { delayMs = 1500, maxPages = 100, startPage = 1, onPageDone } = options;

  const allUrls: string[] = [];
  let page = startPage;

  while (page <= maxPages) {
    try {
      const { urls, hasNextPage } = await fetchProductUrlsFromCategoryPage(categorySlug, page);

      if (urls.length === 0) break;

      allUrls.push(...urls);

      if (onPageDone) await onPageDone(page, urls.length);

      if (!hasNextPage) break;

      page++;
      await new Promise(r => setTimeout(r, delayMs));
    } catch (e: any) {
      console.warn(`Kategori sayfa fail: ${categorySlug} p${page} -> ${e.message}`);
      break;
    }
  }

  return [...new Set(allUrls)];
}
