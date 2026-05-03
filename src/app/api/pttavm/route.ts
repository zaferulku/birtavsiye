import { NextRequest, NextResponse } from "next/server";
import { buildPttavmCategoryPath } from "@/lib/scrapers/pttavmCategoryMap";

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
  source_category?: string | null;
  source_category_path?: string | null;
  specs?: Record<string, string>;
}

const DETAIL_CONCURRENCY = 6;

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

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function collectBreadcrumbSegments(node: unknown, results: string[][]): void {
  if (!node) return;

  if (Array.isArray(node)) {
    for (const item of node) collectBreadcrumbSegments(item, results);
    return;
  }

  if (typeof node !== "object") return;

  const record = node as Record<string, unknown>;
  const type = record["@type"];

  if (type === "BreadcrumbList" && Array.isArray(record.itemListElement)) {
    const segments = record.itemListElement
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const entry = item as Record<string, unknown>;
        const directName =
          typeof entry.name === "string" ? decodeHtmlEntities(entry.name) : null;
        const nested =
          entry.item && typeof entry.item === "object"
            ? (entry.item as Record<string, unknown>)
            : null;
        const nestedName =
          nested && typeof nested.name === "string"
            ? decodeHtmlEntities(nested.name)
            : null;
        return directName ?? nestedName;
      })
      .filter((segment): segment is string => Boolean(segment));

    if (segments.length > 0) {
      results.push(segments);
    }
  }

  for (const value of Object.values(record)) {
    collectBreadcrumbSegments(value, results);
  }
}

function extractBreadcrumbSegments(html: string): string[] {
  const results: string[][] = [];

  for (const match of html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    const raw = match[1]?.trim();
    if (!raw) continue;

    try {
      const parsed: unknown = JSON.parse(raw);
      collectBreadcrumbSegments(parsed, results);
    } catch {
      continue;
    }
  }

  return results[0] ?? [];
}

async function fetchPttavmDetailMeta(product: ParsedProduct): Promise<ParsedProduct> {
  try {
    const res = await fetch(product.url, {
      headers: FETCH_HEADERS,
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(12_000),
    });

    if (!res.ok) return product;

    const html = await res.text();
    const breadcrumb = extractBreadcrumbSegments(html);
    const { sourceCategory, sourceCategoryPath } = buildPttavmCategoryPath(
      breadcrumb,
      product.name,
    );

    if (!sourceCategory && !sourceCategoryPath) return product;

    return {
      ...product,
      source_category: sourceCategory ?? product.source_category ?? null,
      source_category_path: sourceCategoryPath ?? product.source_category_path ?? null,
      specs: {
        ...(product.specs ?? {}),
        ...(sourceCategory ? { pttavm_category: sourceCategory } : {}),
        ...(sourceCategoryPath ? { pttavm_path: sourceCategoryPath } : {}),
      },
    };
  } catch {
    return product;
  }
}

async function enrichProductsWithDetailMeta(products: ParsedProduct[]): Promise<ParsedProduct[]> {
  if (products.length === 0) return products;

  const results = [...products];
  let nextIndex = 0;

  await Promise.all(
    Array.from({ length: Math.min(DETAIL_CONCURRENCY, products.length) }, async () => {
      while (true) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        if (currentIndex >= products.length) return;
        results[currentIndex] = await fetchPttavmDetailMeta(products[currentIndex]);
      }
    }),
  );

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

    const html = await res.text();
    const parsedProducts = parseProducts(html);
    const products = await enrichProductsWithDetailMeta(parsedProducts);

    return NextResponse.json({ products, totalCount: products.length, page, source: "pttavm" });
  } catch {
    return NextResponse.json({ error: "Bağlantı hatası" }, { status: 500 });
  }
}
