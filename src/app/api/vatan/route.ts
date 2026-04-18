import { NextRequest, NextResponse } from "next/server";

const VATAN_BASE = "https://www.vatanbilgisayar.com";

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

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function parseProducts(html: string): ParsedProduct[] {
  const results: ParsedProduct[] = [];
  const seen = new Set<string>();

  const chunks = html.split('class="product-list-link"').slice(1);

  for (const chunk of chunks) {
    if (results.length >= 24) break;

    const urlMatch = chunk.match(/href="(https:\/\/www\.vatanbilgisayar\.com\/[^"]+\.html)"/);
    if (!urlMatch) continue;
    const url = urlMatch[1];
    if (seen.has(url)) continue;
    seen.add(url);

    const altMatch = chunk.match(/alt="([^"]+)"/);
    const name = altMatch ? decodeHtmlEntities(altMatch[1]).trim() : "";
    if (!name) continue;

    const imgMatches = [...chunk.matchAll(/data-src="(https:\/\/cdn\.vatanbilgisayar\.com\/[^"]+\.jpg)"/g)];
    const image = imgMatches.find(m => !m[1].includes("placeHolder"))?.[1] ?? "";

    const priceMatch = chunk.match(/class=['"]product-list__price['"][^>]*>([^<]+)</);
    const price = priceMatch ? parseTLPrice(priceMatch[1]) : 0;

    if (price <= 0) continue;

    results.push({ name, url, image, price });
  }

  return results;
}

// GET /api/vatan?q=iphone&page=1
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q    = searchParams.get("q");
  const page = searchParams.get("page") || "1";

  if (!q) {
    return NextResponse.json({ error: "q parametresi gerekli" }, { status: 400 });
  }

  const pagePart = page === "1" ? "" : `?page=${page}`;
  const targetUrl = `${VATAN_BASE}/arama/${encodeURIComponent(q)}/${pagePart}`;

  try {
    const res = await fetch(targetUrl, {
      headers: FETCH_HEADERS,
      next: { revalidate: 300 },
      redirect: "follow",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Vatan hatası: ${res.status}` },
        { status: res.status }
      );
    }

    const html = await res.text();
    const products = parseProducts(html);

    return NextResponse.json({
      products,
      totalCount: products.length,
      page:       parseInt(page),
      source:     "vatan",
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Bağlantı hatası: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 500 }
    );
  }
}
