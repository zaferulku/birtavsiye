import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;
const BASE_URL        = process.env.NEXTAUTH_URL || "http://localhost:3000";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface ScrapedProduct {
  name:  string;
  url:   string;
  image: string;
  price: number;
  specs?: Record<string, string>;
}

function normalizeTitle(name: string): string {
  return name
    .replace(/(\d+)\s+(gb|mb|tb)/gi, "$1$2")        // "256 GB" → "256GB"
    .replace(/\b[A-Z]{2,5}[0-9]{2,}[A-Z0-9/]{0,6}\b/g, "")  // model kodları sil (MTP43TU/A, SM-S928B vb)
    .replace(/\bakıllı\s+telefon(u)?\b/gi, "")
    .replace(/\bcep\s+telefon(u)?\b/gi, "")
    .replace(/\bsmartphone\b/gi, "")
    .replace(/\btelefon(u)?\b/gi, "")
    .replace(/\b(4|6|8|12|16)\s*gb\s+(ram\s+)?(?=\d)/gi, "") // RAM bilgisi sil (8 GB 256 GB → 256 GB)
    .replace(/\bnotebook\b/gi, "laptop")
    .replace(/\bdizüstü\b/gi, "laptop")
    // Renk normalizasyonu: İngilizce → Türkçe (spesifik önce)
    .replace(/\bnatural\s+titanium\b/gi, "dogal-titanyum")
    .replace(/\bwhite\s+titanium\b/gi, "beyaz-titanyum")
    .replace(/\bblack\s+titanium\b/gi, "siyah-titanyum")
    .replace(/\bdesert\s+titanium\b/gi, "ciol-titanyum")
    .replace(/\bmarble\s+gr[ae]y\b/gi, "gri")
    .replace(/\bonyx\s+black\b/gi, "siyah")
    .replace(/\bphantom\s+black\b/gi, "siyah")
    .replace(/\bphantom\s+white\b/gi, "beyaz")
    .replace(/\bcloud\s+white\b/gi, "beyaz")
    .replace(/\blight\s+blue\b/gi, "mavi")
    .replace(/\bmidnight\s+black\b/gi, "siyah")
    .replace(/\bice\s+blue\b/gi, "buz-mavisi")
    .replace(/\btitanium\b/gi, "titanyum")
    // Tekil renk adları
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
    .replace(/\(.*?\)/g, "")                         // parantez içini sil (garantili, ithalatçı vb)
    .replace(/\s+/g, " ")
    .trim();
}

function toSlug(text: string): string {
  return normalizeTitle(text)
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

function extractModelCode(name: string): string | null {
  const tokens = name.split(/\s+/);
  for (const t of tokens) {
    // Must contain both letters and digits, at least 5 chars (e.g. 43VQ80F2FA, RTX4080, SM-G996B)
    if (t.length >= 5 && /[A-Z]/.test(t) && /[0-9]/.test(t) && /^[A-Z0-9-]+$/i.test(t)) {
      return t.toUpperCase();
    }
  }
  return null;
}

async function getStoreId(storeName: string): Promise<string | null> {
  const sb = getSupabase();
  const { data } = await sb
    .from("stores")
    .select("id")
    .ilike("name", storeName)
    .single();
  return data?.id ?? null;
}

async function syncProducts(products: ScrapedProduct[], storeName: string, categoryId?: string) {
  const sb = getSupabase();
  const storeId = await getStoreId(storeName);
  if (!storeId) return { inserted: 0, errors: 1, firstError: [], newProductIds: [] };

  let inserted = 0, errors = 0;
  const firstError: string[] = [];
  const newProductIds: string[] = [];

  const SECONDHAND = /ikinci\s*el|2\.\s*el|kullan[iı]lm[iı][sş]|te[sş]hir|hasarl[iı]|defolu|a[cç][iı]k kutu|open box/i;

  for (const p of products) {
    if (!p.name || !p.url) continue;
    if (SECONDHAND.test(p.name)) continue;

    const slug       = toSlug(p.name);
    const brand      = extractBrand(p.name);
    const modelCode  = extractModelCode(p.name);

    // Try to find existing product by brand+model_code first (cross-store safe match)
    let product: { id: string } | null = null;
    if (modelCode) {
      const { data: existing } = await sb
        .from("products")
        .select("id")
        .ilike("brand", brand)
        .eq("model_code", modelCode)
        .maybeSingle();
      if (existing) product = existing;
    }

    if (!product) {
      // Detect new vs existing by slug (so we only fire webhook for genuinely new products)
      const { data: existingBySlug } = await sb
        .from("products")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      const isNew = !existingBySlug;

      const productData: Record<string, unknown> = {
        title: p.name, slug, brand, image_url: p.image || null,
        source: storeName.toLowerCase(), source_url: p.url,
      };
      if (modelCode) productData.model_code = modelCode;
      if (categoryId) productData.category_id = categoryId;
      if (p.specs && Object.keys(p.specs).length > 0) productData.specs = p.specs;

      const { data: upserted, error: productError } = await sb
        .from("products")
        .upsert(productData, { onConflict: "slug" })
        .select("id")
        .single();

      if (productError || !upserted) {
        if (firstError.length < 3) firstError.push(`product:${productError?.code}:${productError?.message}:slug=${slug}`);
        errors++;
        continue;
      }
      product = upserted;
      if (isNew) newProductIds.push(upserted.id);
    }

    const { error: priceError } = await sb
      .from("prices")
      .upsert(
        { product_id: product.id, store_id: storeId,
          price: p.price, affiliate_url: p.url },
        { onConflict: "product_id,store_id" }
      );

    if (priceError) {
      if (firstError.length < 3) firstError.push(`price:${priceError?.code}:${priceError?.message}`);
      errors++;
      continue;
    }

    await sb.from("price_history").insert({
      product_id: product.id,
      store_id:   storeId,
      price:      p.price,
    });

    const { data: alerts } = await sb
      .from("price_alerts")
      .select("id, email, target_price")
      .eq("product_id", product.id)
      .eq("is_triggered", false)
      .lte("target_price", p.price);

    if (alerts && alerts.length > 0) {
      const ids = alerts.map((a: { id: string }) => a.id);
      await sb.from("price_alerts").update({ is_triggered: true }).in("id", ids);
    }

    inserted++;
  }

  return { inserted, errors, firstError, newProductIds };
}

// Fire-and-forget: send each new product ID to the webhook for agent validation + categorization.
// Runs async without awaiting so sync response stays fast. Rate-limited to stay within Gemini free tier (15 RPM).
async function triggerAgentValidation(productIds: string[]): Promise<void> {
  if (productIds.length === 0) return;
  const RATE_LIMIT_MS = 4500; // ~13 RPM, safe margin under Gemini 15 RPM
  for (const id of productIds) {
    try {
      // Don't await — fire-and-forget per product, but space them out
      fetch(`${BASE_URL}/api/webhook/product/new`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": INTERNAL_SECRET ?? "",
        },
        body: JSON.stringify({ product_id: id }),
      }).catch(err => console.error(`[agent-validate] product=${id} fetch failed: ${err.message}`));
    } catch (err) {
      console.error(`[agent-validate] product=${id} error: ${err instanceof Error ? err.message : String(err)}`);
    }
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS));
  }
}

// POST /api/sync
// Body: { source: "trendyol" | "hepsiburada", query: "laptop", page?: 1 }
// Header: x-internal-secret: <INTERNAL_API_SECRET>
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-internal-secret");
  if (secret !== INTERNAL_SECRET) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const { source, query, page = 1, category_id, title_filter } = await request.json() as {
    source:        "trendyol" | "hepsiburada" | "mediamarkt" | "pttavm" | "vatan";
    query:         string;
    page?:         number;
    category_id?:  string;
    title_filter?: string[]; // en az biri eşleşmeli, yoksa ürün atlanır
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

  let { products = [] } = await scraperRes.json() as { products: ScrapedProduct[] };

  if (title_filter && title_filter.length > 0) {
    const before = products.length;
    products = products.filter(p =>
      title_filter.some(kw => p.name.toLowerCase().includes(kw.toLowerCase()))
    );
    if (products.length < before) {
      console.log(`[title_filter] ${before} → ${products.length} ürün (${before - products.length} atlandı)`);
    }
  }

  const storeName = source === "trendyol" ? "Trendyol"
    : source === "mediamarkt" ? "MediaMarkt"
    : source === "pttavm" ? "PttAVM"
    : source === "vatan" ? "Vatan Bilgisayar"
    : "Hepsiburada";
  const stats     = await syncProducts(products, storeName, category_id);

  // Fire-and-forget agent validation for NEW products only (respects Gemini rate limit)
  if (stats.newProductIds.length > 0) {
    console.log(`[sync] ${stats.newProductIds.length} new product(s) → agent validation queued`);
    // Don't await — let it run in background while we return
    triggerAgentValidation(stats.newProductIds).catch(err =>
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
