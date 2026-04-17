import { NextRequest, NextResponse } from "next/server";

const PTTAVM_BASE = "https://www.pttavm.com";

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

function parseProducts(html: string): ParsedProduct[] {
  const results: ParsedProduct[] = [];
  const seen = new Set<string>();

  for (const raw of html.matchAll(
    /"@type"\s*:\s*"Product","name"\s*:\s*"([^"]+)","image"\s*:\s*"([^"]+)","url"\s*:\s*"([^"]+)","offers"\s*:\s*\{"@type"\s*:\s*"Offer","price"\s*:\s*"([^"]+)"/gs
  )) {
    if (results.length >= 48) break;
    const [, name, image, url, priceStr] = raw;
    if (seen.has(url)) continue;
    seen.add(url);

    // PttAVM fiyatlar ondalıklı gelir: "97498.99644999999" → 97499 TL
    const price = Math.round(parseFloat(priceStr)) || 0;

    results.push({
      name,
      url: url.startsWith("http") ? url : `${PTTAVM_BASE}${url}`,
      image: image.startsWith("http") ? image : `${PTTAVM_BASE}${image}`,
      price,
    });
  }

  return results;
}

// GET /api/pttavm?q=laptop&page=1
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q    = searchParams.get("q");
  const page = parseInt(searchParams.get("page") || "1", 10);

  if (!q) {
    return NextResponse.json({ error: "q parametresi gerekli" }, { status: 400 });
  }

  const targetUrl = `${PTTAVM_BASE}/arama?q=${encodeURIComponent(q)}&page=${page}`;

  try {
    const res = await fetch(targetUrl, { headers: FETCH_HEADERS, next: { revalidate: 300 } });

    if (!res.ok) {
      return NextResponse.json({ error: `PttAVM hatası: ${res.status}` }, { status: res.status });
    }

    const html     = await res.text();
    const products = parseProducts(html);

    return NextResponse.json({ products, totalCount: products.length, page, source: "pttavm" });
  } catch {
    return NextResponse.json({ error: "Bağlantı hatası" }, { status: 500 });
  }
}
