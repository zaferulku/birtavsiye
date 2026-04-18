import { NextRequest, NextResponse } from "next/server";

const TRENDYOL_BASE = "https://www.trendyol.com";

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  "Connection": "keep-alive",
};

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

  // HTML'i product-card bloklarına böl (split delimiter <a class="product-card" öncesi — href sonrada kalsın)
  const chunks = html.split('class="product-card"').slice(1);

  const seen    = new Set<string>();
  const results: ParsedProduct[] = [];

  for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
    if (results.length >= 24) break;
    const chunk = chunks[chunkIdx];

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

    // Resim: chunkIdx ile preload eşle (filtrelemeden etkilenmez), fallback CDN
    const imgMatch = chunk.match(/https:\/\/cdn\.dsmcdn\.com\/[^"\\]+\.jpg/);
    const image    = preloadImages[chunkIdx] ?? imgMatch?.[0] ?? "";

    results.push({ name, url, image, price });
  }

  return results;
}

// GET /api/trendyol?q=laptop&page=1
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q    = searchParams.get("q");
  const page = searchParams.get("page") || "1";

  if (!q) {
    return NextResponse.json({ error: "q parametresi gerekli" }, { status: 400 });
  }

  const targetUrl = `${TRENDYOL_BASE}/sr?q=${encodeURIComponent(q)}&pi=${page}`;

  try {
    const res = await fetch(targetUrl, {
      headers: FETCH_HEADERS,
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Trendyol hatası: ${res.status}` },
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
