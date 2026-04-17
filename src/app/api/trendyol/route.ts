import { NextRequest, NextResponse } from "next/server";

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;
const TRENDYOL_BASE   = "https://www.trendyol.com";

function scraperUrl(targetUrl: string): string {
  const encoded = encodeURIComponent(targetUrl);
  return `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encoded}&country_code=tr&render=true&premium=true`;
}

interface ParsedProduct {
  name:  string;
  url:   string;
  image: string;
  price: number;
}

function parseTLPrice(raw: string): number {
  return parseFloat(raw.trim().replace(/\./g, "").replace(",", ".").replace(/[^0-9.]/g, "")) || 0;
}

// HTML'den ürün listesini product-card bloklarına bölerek çıkar
function parseProducts(html: string): ParsedProduct[] {
  // Preload edilen gerçek ürün resimleri (ilk 4 ürün için)
  const preloadImages: string[] = [];
  const preloadMatch = html.match(/"__single-search-result_preload-images__PROPS"\]=(\{[^<]+\})/);
  if (preloadMatch) {
    try {
      const decoded = preloadMatch[1].replace(/\\u002F/g, "/");
      const parsed  = JSON.parse(decoded) as { images: string[] };
      preloadImages.push(...(parsed.images || []));
    } catch { /* ignore */ }
  }

  // HTML'i product-card bloklarına böl
  const chunks = html.split('data-testid="product-card"').slice(1);

  const seen    = new Set<string>();
  const results: ParsedProduct[] = [];

  for (const chunk of chunks) {
    if (results.length >= 24) break;

    // Ürün adı: data-testid="image-img" alt="..."
    const nameMatch = chunk.match(/data-testid="image-img"[^>]*alt="([^"]+)"/);
    if (!nameMatch) continue;
    const name = nameMatch[1].trim();

    // Ürün URL: href="/brand/slug-p-12345"
    const urlMatch = chunk.match(/href="(\/[^"]*-p-\d+)/);
    if (!urlMatch) continue;
    const url = `${TRENDYOL_BASE}${urlMatch[1]}`;
    if (seen.has(url)) continue;
    seen.add(url);

    // Fiyat: price-section veya single-price
    const priceMatch =
      chunk.match(/data-testid="price-section"[^>]*>([^<]+)/) ??
      chunk.match(/data-testid="single-price"[^>]*>([^<]+)/)  ??
      chunk.match(/data-testid="price-value"[^>]*>([^<]+)/);
    const price = priceMatch ? parseTLPrice(priceMatch[1]) : 0;

    // Alakasız ürünleri filtrele (çıkartma, aksesuar vb. düşük fiyatlılar)
    if (price > 0 && price < 1000) continue;

    // Resim: preload listesinden veya CDN URL (tüm boyutları yakala)
    const imgMatch = chunk.match(/https:\/\/cdn\.dsmcdn\.com\/[^"\\]+\.jpg/);
    const image    = preloadImages[results.length] ?? imgMatch?.[0] ?? "";

    results.push({ name, url, image, price });
  }

  return results;
}

// GET /api/trendyol?q=laptop&page=1
export async function GET(request: NextRequest) {
  if (!SCRAPER_API_KEY) {
    return NextResponse.json(
      { error: "SCRAPER_API_KEY yapılandırılmamış" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const q    = searchParams.get("q");
  const page = searchParams.get("page") || "1";

  if (!q) {
    return NextResponse.json({ error: "q parametresi gerekli" }, { status: 400 });
  }

  const targetUrl = `${TRENDYOL_BASE}/sr?q=${encodeURIComponent(q)}&pi=${page}`;

  try {
    const res = await fetch(scraperUrl(targetUrl), {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `ScraperAPI hatası: ${res.status}` },
        { status: res.status }
      );
    }

    const html     = await res.text();
    const products = parseProducts(html);

    return NextResponse.json({
      products,
      totalCount: products.length,
      page:       parseInt(page),
      source:     "trendyol",
    });
  } catch {
    return NextResponse.json({ error: "Bağlantı hatası" }, { status: 500 });
  }
}
