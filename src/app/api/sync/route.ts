import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;
const BASE_URL        = process.env.NEXTAUTH_URL || "http://localhost:3000";

interface ScrapedProduct {
  name:  string;
  url:   string;
  image: string;
  price: number;
  specs?: Record<string, string>;
}

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
    .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

function extractBrand(name: string): string {
  const brands = [
    "Apple","Samsung","Xiaomi","Lenovo","HP","Dell","Asus","Acer","MSI",
    "Casper","Monster","Huawei","Sony","LG","Philips","Dyson","Bosch",
    "Nike","Adidas","Puma","Arçelik","Vestel","Beko","Siemens","Tefal",
  ];
  for (const brand of brands) {
    if (name.toLowerCase().startsWith(brand.toLowerCase())) return brand;
  }
  return name.split(" ")[0];
}

async function getStoreId(storeName: string): Promise<string | null> {
  const { data } = await supabase
    .from("stores")
    .select("id")
    .ilike("name", storeName)
    .single();
  return data?.id ?? null;
}

async function syncProducts(products: ScrapedProduct[], storeName: string, categoryId?: string) {
  const storeId = await getStoreId(storeName);
  if (!storeId) return { inserted: 0, errors: 1 };

  let inserted = 0, errors = 0;

  for (const p of products) {
    if (!p.name || !p.url) continue;

    const slug  = toSlug(p.name);
    const brand = extractBrand(p.name);

    const productData: Record<string, unknown> = {
      title: p.name, slug, brand, image_url: p.image || null,
      source: storeName.toLowerCase(), source_url: p.url,
    };
    if (categoryId) productData.category_id = categoryId;
    if (p.specs && Object.keys(p.specs).length > 0) productData.specs = p.specs;

    const { data: product, error: productError } = await supabase
      .from("products")
      .upsert(productData, { onConflict: "slug" })
      .select("id")
      .single();

    if (productError || !product) { errors++; continue; }

    const { error: priceError } = await supabase
      .from("prices")
      .upsert(
        { product_id: product.id, store_id: storeId,
          price: p.price, affiliate_url: p.url },
        { onConflict: "product_id,store_id" }
      );

    if (priceError) { errors++; continue; }
    inserted++;
  }

  return { inserted, errors };
}

// POST /api/sync
// Body: { source: "trendyol" | "hepsiburada", query: "laptop", page?: 1 }
// Header: x-internal-secret: <INTERNAL_API_SECRET>
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-internal-secret");
  if (secret !== INTERNAL_SECRET) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const { source, query, page = 1, category_id } = await request.json() as {
    source:      "trendyol" | "hepsiburada" | "mediamarkt" | "pttavm";
    query:       string;
    page?:       number;
    category_id?: string;
  };

  if (!source || !query) {
    return NextResponse.json({ error: "source ve query gerekli" }, { status: 400 });
  }

  const scraperRes = await fetch(
    `${BASE_URL}/api/${source}?q=${encodeURIComponent(query)}&page=${page}`
  );

  if (!scraperRes.ok) {
    return NextResponse.json({ error: `Scraper hatası: ${scraperRes.status}` }, { status: 502 });
  }

  const { products = [] } = await scraperRes.json() as { products: ScrapedProduct[] };
  const storeName = source === "trendyol" ? "Trendyol"
    : source === "mediamarkt" ? "MediaMarkt"
    : source === "pttavm" ? "PttAVM"
    : "Hepsiburada";
  const stats     = await syncProducts(products, storeName, category_id);

  return NextResponse.json({ source, query, page, fetched: products.length, ...stats });
}
