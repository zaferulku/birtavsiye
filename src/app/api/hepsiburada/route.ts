import { NextRequest, NextResponse } from "next/server";

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;
const HB_BASE         = "https://www.hepsiburada.com";

function scraperUrl(targetUrl: string): string {
  const encoded = encodeURIComponent(targetUrl);
  return `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encoded}&country_code=tr&render=true&premium=true`;
}

interface ParsedProduct {
  name:  string;
  url:   string;
  image: string;
  price: number;
  sku:   string;
}

function parseProducts(html: string): ParsedProduct[] {
  const results: ParsedProduct[] = [];
  const seen    = new Set<string>();

  const chunks = html.split('href="/').slice(1);

  for (const chunk of chunks) {
    if (results.length >= 24) break;

    // URL: "product-slug-pm-HBCXXXXX"
    const urlMatch = chunk.match(/^([^"]*-pm-HBC[^"]+)"/);
    if (!urlMatch) continue;

    const path = urlMatch[1].split("?")[0];
    const url  = `${HB_BASE}/${path}`;
    if (seen.has(url)) continue;

    // SKU
    const skuMatch = path.match(/-(HBC[^-"]+)$/);
    const sku      = skuMatch?.[1] ?? "";

    // Ürün adı
    const nameMatch = chunk.match(/title="([^"]{10,})"/) ?? chunk.match(/alt="([^"]{10,})"/);
    if (!nameMatch) continue;
    const name = nameMatch[1].trim();

    // Resim
    const imgMatch = chunk.match(/https:\/\/productimages\.hepsiburada\.net\/[^"\s,]+\.jpg/);
    const image    = imgMatch?.[0] ?? "";

    // Fiyat
    const priceMatch =
      chunk.match(/"price":(\d+(?:\.\d+)?)/) ??
      chunk.match(/data-test-id="final-price-\d+"[^>]*>([^<]+)/);
    const rawPrice = priceMatch?.[1]?.trim().replace(/\./g, "").replace(",", ".") ?? "0";
    const price    = parseFloat(rawPrice) || 0;

    seen.add(url);
    results.push({ name, url, image, price, sku });
  }

  return results;
}

// GET /api/hepsiburada?q=laptop&page=1
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

  const targetUrl = `${HB_BASE}/ara?q=${encodeURIComponent(q)}&sayfa=${page}`;

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
      source:     "hepsiburada",
    });
  } catch {
    return NextResponse.json({ error: "Bağlantı hatası" }, { status: 500 });
  }
}
