import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;
const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

type SyncSource = "trendyol" | "hepsiburada" | "mediamarkt" | "pttavm" | "vatan";

const STORE_NAME_BY_SOURCE: Record<SyncSource, string> = {
  trendyol: "Trendyol",
  hepsiburada: "Hepsiburada",
  mediamarkt: "MediaMarkt",
  pttavm: "PttAVM",
  vatan: "Vatan Bilgisayar",
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface ScrapedProduct {
  name: string;
  url: string;
  image: string;
  price: number;
  specs?: Record<string, string>;
}

function toAscii(text: string): string {
  return text
    .replace(/[Ğğ]/g, "g")
    .replace(/[Üü]/g, "u")
    .replace(/[Şş]/g, "s")
    .replace(/[İIı]/g, "i")
    .replace(/[Öö]/g, "o")
    .replace(/[Çç]/g, "c");
}

function normalizeTitle(name: string): string {
  return toAscii(name)
    .replace(/(\d+)\s+(gb|mb|tb)/gi, "$1$2")
    .replace(/\b[A-Z]{2,5}[0-9]{2,}[A-Z0-9/]{0,6}\b/g, "")
    .replace(/\bakilli\s+telefon(u)?\b/gi, "")
    .replace(/\bcep\s+telefon(u)?\b/gi, "")
    .replace(/\bsmartphone\b/gi, "")
    .replace(/\btelefon(u)?\b/gi, "")
    .replace(/\b(4|6|8|12|16)\s*gb\s+(ram\s+)?(?=\d)/gi, "")
    .replace(/\bnotebook\b/gi, "laptop")
    .replace(/\bdizustu\b/gi, "laptop")
    .replace(/\bnatural\s+titanium\b/gi, "dogal-titanyum")
    .replace(/\bwhite\s+titanium\b/gi, "beyaz-titanyum")
    .replace(/\bblack\s+titanium\b/gi, "siyah-titanyum")
    .replace(/\bdesert\s+titanium\b/gi, "col-titanyum")
    .replace(/\bmarble\s+gr[ae]y\b/gi, "gri")
    .replace(/\bonyx\s+black\b/gi, "siyah")
    .replace(/\bphantom\s+black\b/gi, "siyah")
    .replace(/\bphantom\s+white\b/gi, "beyaz")
    .replace(/\bcloud\s+white\b/gi, "beyaz")
    .replace(/\blight\s+blue\b/gi, "mavi")
    .replace(/\bmidnight\s+black\b/gi, "siyah")
    .replace(/\bice\s+blue\b/gi, "buz-mavisi")
    .replace(/\btitanium\b/gi, "titanyum")
    .replace(/\bblack\b/gi, "siyah")
    .replace(/\bwhite\b/gi, "beyaz")
    .replace(/\bgr[ae]y\b/gi, "gri")
    .replace(/\bsilver\b/gi, "gumus")
    .replace(/\bgold\b/gi, "altin")
    .replace(/\bblue\b/gi, "mavi")
    .replace(/\bgreen\b/gi, "yesil")
    .replace(/\bred\b/gi, "kirmizi")
    .replace(/\bpurple\b/gi, "mor")
    .replace(/\bpink\b/gi, "pembe")
    .replace(/\byellow\b/gi, "sari")
    .replace(/\borange\b/gi, "turuncu")
    .replace(/\brose\b/gi, "pembe")
    .replace(/\bmidnight\b/gi, "gece-mavisi")
    .replace(/\bstarlight\b/gi, "yildiz-isigi")
    .replace(/\(.*?\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toSlug(text: string): string {
  return normalizeTitle(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

function extractBrand(name: string): string {
  const brands = [
    "Apple", "Samsung", "Xiaomi", "Lenovo", "HP", "Dell", "Asus", "Acer", "MSI",
    "Casper", "Monster", "Huawei", "Sony", "LG", "Philips", "Dyson", "Bosch",
    "Nike", "Adidas", "Puma", "Arcelik", "Vestel", "Beko", "Siemens", "Tefal",
  ];
  const normalizedName = toAscii(name).toLowerCase();
  for (const brand of brands) {
    if (normalizedName.startsWith(toAscii(brand).toLowerCase())) return brand;
  }
  return name.split(" ")[0];
}

function extractModelCode(name: string): string | null {
  const tokens = name.split(/\s+/);
  for (const token of tokens) {
    if (
      token.length >= 5 &&
      /[A-Z]/i.test(token) &&
      /[0-9]/.test(token) &&
      /^[A-Z0-9-]+$/i.test(token)
    ) {
      return token.toUpperCase();
    }
  }
  return null;
}

function getSourceProductId(url: string): string {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.replace(/\/+$/, "");
    const stableParams = [
      "merchantId",
      "boutiqueId",
      "sku",
      "pid",
      "productId",
      "vid",
    ]
      .map((key) => {
        const value = parsed.searchParams.get(key);
        return value ? `${key}=${value}` : null;
      })
      .filter((value): value is string => Boolean(value))
      .join("&");

    if (stableParams) return `${pathname}?${stableParams}`;
    return pathname || parsed.hostname || url.trim();
  } catch {
    return url.trim();
  }
}

async function getStoreId(source: SyncSource): Promise<string | null> {
  const sb = getSupabase();
  const { data } = await sb
    .from("stores")
    .select("id")
    .eq("name", STORE_NAME_BY_SOURCE[source])
    .maybeSingle();

  return data?.id ?? null;
}

async function syncProducts(products: ScrapedProduct[], source: SyncSource, categoryId?: string) {
  const sb = getSupabase();
  const storeId = await getStoreId(source);
  if (!storeId) return { inserted: 0, errors: 1, firstError: ["store:not_found"], newProductIds: [] };

  let inserted = 0;
  let errors = 0;
  const firstError: string[] = [];
  const newProductIds: string[] = [];

  const SECONDHAND = /ikinci\s*el|2\.\s*el|kullanilmis|teshir|hasarli|defolu|acik kutu|open box/i;

  for (const p of products) {
    if (!p.name || !p.url) continue;
    if (SECONDHAND.test(toAscii(p.name).toLowerCase())) continue;

    const slug = toSlug(p.name);
    const brand = extractBrand(p.name);
    const modelCode = extractModelCode(p.name);
    const sourceProductId = getSourceProductId(p.url);
    let productId: string | null = null;
    let queueAgentValidation = false;

    if (modelCode) {
      const { data: existing } = await sb
        .from("products")
        .select("id")
        .ilike("brand", brand)
        .eq("model_code", modelCode)
        .maybeSingle();
      if (existing) productId = existing.id;
    }

    if (!productId) {
      const { data: existingBySlug } = await sb
        .from("products")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (existingBySlug) productId = existingBySlug.id;
    }

    const productPayload: Record<string, unknown> = {
      title: p.name,
      slug,
      brand,
    };
    if (p.image) productPayload.image_url = p.image;
    if (modelCode) productPayload.model_code = modelCode;
    if (p.specs && Object.keys(p.specs).length > 0) productPayload.specs = p.specs;

    if (productId) {
      const { error: updateError } = await sb
        .from("products")
        .update(productPayload)
        .eq("id", productId);

      if (updateError) {
        if (firstError.length < 3) firstError.push(`product:${updateError.code}:${updateError.message}:id=${productId}`);
        errors++;
        continue;
      }
    } else {
      if (!categoryId) {
        if (firstError.length < 3) firstError.push(`product:missing_category:slug=${slug}`);
        errors++;
        continue;
      }

      const { data: createdProduct, error: productError } = await sb
        .from("products")
        .upsert(
          { ...productPayload, category_id: categoryId },
          { onConflict: "slug" }
        )
        .select("id")
        .single();

      if (productError || !createdProduct) {
        if (firstError.length < 3) firstError.push(`product:${productError?.code}:${productError?.message}:slug=${slug}`);
        errors++;
        continue;
      }

      productId = createdProduct.id;
      queueAgentValidation = true;
    }

    const nowIso = new Date().toISOString();
    const { data: existingListing } = await sb
      .from("listings")
      .select("id, price")
      .eq("source", source)
      .eq("source_product_id", sourceProductId)
      .maybeSingle();

    const previousPrice = existingListing?.price != null ? Number(existingListing.price) : null;
    const listingPayload: Record<string, unknown> = {
      product_id: productId,
      store_id: storeId,
      source,
      source_product_id: sourceProductId,
      source_url: p.url,
      source_title: p.name,
      price: p.price,
      affiliate_url: p.url,
      currency: "TRY",
      in_stock: true,
      is_active: true,
      last_seen: nowIso,
    };
    if (!existingListing || previousPrice !== p.price) {
      listingPayload.last_price_change = nowIso;
    }

    const { data: listing, error: listingError } = await sb
      .from("listings")
      .upsert(listingPayload, { onConflict: "source,source_product_id" })
      .select("id")
      .single();

    if (listingError || !listing) {
      if (firstError.length < 3) firstError.push(`listing:${listingError?.code}:${listingError?.message}:source=${source}`);
      errors++;
      continue;
    }

    if (!existingListing || previousPrice !== p.price) {
      const { error: historyError } = await sb.from("price_history").insert({
        listing_id: listing.id,
        price: p.price,
        recorded_at: nowIso,
      });

      if (historyError) {
        if (firstError.length < 3) firstError.push(`history:${historyError.code}:${historyError.message}:listing=${listing.id}`);
        errors++;
        continue;
      }
    }

    const { data: alerts } = await sb
      .from("price_alerts")
      .select("id")
      .eq("product_id", productId)
      .eq("is_triggered", false)
      .gte("target_price", p.price);

    if (alerts && alerts.length > 0) {
      const ids = alerts.map((alert: { id: string }) => alert.id);
      await sb.from("price_alerts").update({ is_triggered: true }).in("id", ids);
    }

    if (queueAgentValidation && productId) newProductIds.push(productId);
    inserted++;
  }

  return { inserted, errors, firstError, newProductIds };
}

async function triggerAgentValidation(productIds: string[]): Promise<void> {
  if (productIds.length === 0) return;

  const rateLimitMs = 4500;
  for (const id of productIds) {
    try {
      fetch(`${BASE_URL}/api/webhook/product/new`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": INTERNAL_SECRET ?? "",
        },
        body: JSON.stringify({ product_id: id }),
      }).catch((err) => console.error(`[agent-validate] product=${id} fetch failed: ${err.message}`));
    } catch (err) {
      console.error(`[agent-validate] product=${id} error: ${err instanceof Error ? err.message : String(err)}`);
    }

    await new Promise((resolve) => setTimeout(resolve, rateLimitMs));
  }
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-internal-secret");
  if (secret !== INTERNAL_SECRET) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const { source, query, page = 1, category_id, title_filter } = await request.json() as {
    source: SyncSource;
    query: string;
    page?: number;
    category_id?: string;
    title_filter?: string[];
  };

  if (!source || !query) {
    return NextResponse.json({ error: "source ve query gerekli" }, { status: 400 });
  }

  const scraperRes = await fetch(
    `${BASE_URL}/api/${source}?q=${encodeURIComponent(query)}&page=${page}`
  );

  if (!scraperRes.ok) {
    return NextResponse.json({ error: `Scraper hatasi: ${scraperRes.status}` }, { status: 502 });
  }

  let { products = [] } = await scraperRes.json() as { products: ScrapedProduct[] };

  if (title_filter && title_filter.length > 0) {
    const before = products.length;
    products = products.filter((product) =>
      title_filter.some((keyword) => product.name.toLowerCase().includes(keyword.toLowerCase()))
    );
    if (products.length < before) {
      console.log(`[title_filter] ${before} -> ${products.length} urun (${before - products.length} atlandi)`);
    }
  }

  const stats = await syncProducts(products, source, category_id);

  if (stats.newProductIds.length > 0) {
    console.log(`[sync] ${stats.newProductIds.length} new product(s) -> agent validation queued`);
    triggerAgentValidation(stats.newProductIds).catch((err) =>
      console.error(`[sync] triggerAgentValidation failed: ${err.message}`)
    );
  }

  return NextResponse.json({
    source,
    query,
    page,
    fetched: products.length,
    inserted: stats.inserted,
    errors: stats.errors,
    firstError: stats.firstError,
    newProducts: stats.newProductIds.length,
  });
}
