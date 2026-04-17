import { NextRequest, NextResponse } from "next/server";

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;
const MM_BASE         = "https://www.mediamarkt.com.tr";

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

function parseProducts(html: string): ParsedProduct[] {
  const results: ParsedProduct[] = [];
  const seen = new Set<string>();

  // ItemList JSON-LD: her Product'ı regex ile çıkar
  for (const raw of html.matchAll(
    /"@type"\s*:\s*"Product","name"\s*:\s*"([^"]+)","image"\s*:\s*"([^"]+)","offers"\s*:\s*\{"@type"\s*:\s*"Offer","price"\s*:\s*(\d+)[^}]*\}[^}]*"url"\s*:\s*"([^"]+)"/gs
  )) {
    if (results.length >= 24) break;
    const [, name, image, priceStr, url] = raw;
    if (seen.has(url)) continue;
    seen.add(url);

    results.push({
      name,
      url,
      image: image.startsWith("http") ? image : `${MM_BASE}${image}`,
      price: parseInt(priceStr, 10),
    });
  }

  return results;
}

// GET /api/mediamarkt?q=laptop&page=1
export async function GET(request: NextRequest) {
  if (!SCRAPER_API_KEY) {
    return NextResponse.json(
      { error: "SCRAPER_API_KEY yapılandırılmamış" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const q    = searchParams.get("q");
  const page = parseInt(searchParams.get("page") || "1", 10);

  if (!q) {
    return NextResponse.json({ error: "q parametresi gerekli" }, { status: 400 });
  }

  const targetUrl = `${MM_BASE}/tr/search.html?query=${encodeURIComponent(q)}&page=${page}`;

  try {
    const res = await fetch(scraperUrl(targetUrl), { next: { revalidate: 300 } });

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
      page,
      source: "mediamarkt",
    });
  } catch {
    return NextResponse.json({ error: "Bağlantı hatası" }, { status: 500 });
  }
}
