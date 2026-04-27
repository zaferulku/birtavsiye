import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  buildProductCreatePayload,
  buildProductUpdatePayload,
  inferProductIdentity,
  resolveExistingProduct,
} from "@/lib/productIdentity";
import { categorizeFromTitle } from "@/lib/categorizeFromTitle";

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

function normalizeForSecondhand(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0131/g, "i")
    .replace(/\u0130/g, "I")
    .toLowerCase();
}

// PttAVM ürün başlığında "(Apple Türkiye Garantili)" / "(İthalatçı Garantili)"
// notunu yakalar. MM ve diğer resmî dağıtıcılar default 'apple_tr' kabul edilir.
// Dönen değerler: 'apple_tr' | 'ithalatci' | 'distri' | null
function detectWarrantyType(source: SyncSource, title: string): string | null {
  const t = (title || "").toLowerCase();
  if (t.includes("apple türkiye garantili") || t.includes("apple turkiye garantili")) {
    return "apple_tr";
  }
  if (t.includes("ithalatçı garantili") || t.includes("ithalatci garantili") ||
      t.includes("ithal garantili") || t.includes("paralel ithal")) {
    return "ithalatci";
  }
  if (t.includes("distribütör garantili") || t.includes("distributor garantili")) {
    return "distri";
  }
  // MM / Vatan / Hepsiburada resmî perakendeci → varsayılan apple_tr
  if (source === "mediamarkt" || source === "vatan" || source === "hepsiburada") {
    return "apple_tr";
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
  if (!storeId) {
    return { inserted: 0, errors: 1, firstError: ["store:not_found"], newProductIds: [] };
  }

  // Slug → category_id mapping (title-based override için)
  const { data: catRows } = await sb.from("categories").select("id, slug").eq("is_active", true);
  const slugToId = new Map<string, string>(
    (catRows ?? []).map((c: { id: string; slug: string }) => [c.slug, c.id])
  );

  let inserted = 0;
  let errors = 0;
  const firstError: string[] = [];
  const newProductIds: string[] = [];

  const SECONDHAND =
    /ikinci\s*el|2\.\s*el|kullanilmis|teshir|hasarli|defolu|acik kutu|open box/i;

  for (const product of products) {
    if (!product.name || !product.url) continue;
    if (SECONDHAND.test(normalizeForSecondhand(product.name))) continue;

    const identity = inferProductIdentity({
      title: product.name,
      specs: product.specs,
    });
    const sourceProductId = getSourceProductId(product.url);

    // Title-based dinamik kategori override:
    // PttAVM "iphone 16 plus" query'si aksesuarları da getirebilir.
    // categorizeFromTitle high-confidence eşleşme verirse cron category'sini override et.
    let effectiveCategoryId = categoryId;
    const catGuess = categorizeFromTitle(product.name);
    if (catGuess.slug && catGuess.confidence === "high") {
      const guessedId = slugToId.get(catGuess.slug);
      if (guessedId) effectiveCategoryId = guessedId;
    }

    let productId: string | null = null;
    let queueAgentValidation = false;

    let existingProduct = await resolveExistingProduct({
      sb,
      identity,
      categoryId: effectiveCategoryId,
    });

    if (existingProduct) {
      productId = existingProduct.id;
      const updatePayload = buildProductUpdatePayload({
        existing: existingProduct,
        identity,
        imageUrl: product.image,
        specs: product.specs,
      });

      if (Object.keys(updatePayload).length > 0) {
        const { error: updateError } = await sb
          .from("products")
          .update(updatePayload)
          .eq("id", productId);

        if (updateError) {
          if (firstError.length < 3) {
            firstError.push(
              `product:${updateError.code}:${updateError.message}:id=${productId}`
            );
          }
          errors++;
          continue;
        }
      }
    } else {
      if (!effectiveCategoryId) {
        if (firstError.length < 3) {
          firstError.push(`product:missing_category:slug=${identity.slug}`);
        }
        errors++;
        continue;
      }

      let createPayload = buildProductCreatePayload({
        identity,
        categoryId: effectiveCategoryId,
        imageUrl: product.image,
        specs: product.specs,
      });

      let createResult = await sb
        .from("products")
        .insert(createPayload)
        .select("id")
        .single();

      if (createResult.error?.code === "23505") {
        existingProduct = await resolveExistingProduct({
          sb,
          identity,
          categoryId: effectiveCategoryId,
        });

        if (existingProduct) {
          productId = existingProduct.id;
          const updatePayload = buildProductUpdatePayload({
            existing: existingProduct,
            identity,
            imageUrl: product.image,
            specs: product.specs,
          });

          if (Object.keys(updatePayload).length > 0) {
            const { error: updateError } = await sb
              .from("products")
              .update(updatePayload)
              .eq("id", productId);

            if (updateError) {
              if (firstError.length < 3) {
                firstError.push(
                  `product:${updateError.code}:${updateError.message}:id=${productId}`
                );
              }
              errors++;
              continue;
            }
          }
        } else {
          createPayload = {
            ...createPayload,
            slug: `${identity.slug}-${Date.now().toString(36).slice(-4)}`,
          };

          createResult = await sb
            .from("products")
            .insert(createPayload)
            .select("id")
            .single();
        }
      }

      if (!productId && (createResult.error || !createResult.data)) {
        if (firstError.length < 3) {
          firstError.push(
            `product:${createResult.error?.code}:${createResult.error?.message}:slug=${identity.slug}`
          );
        }
        errors++;
        continue;
      }

      if (!productId && createResult.data) {
        productId = createResult.data.id;
        queueAgentValidation = true;
      }
    }

    const nowIso = new Date().toISOString();
    const { data: existingListing } = await sb
      .from("listings")
      .select("id, price")
      .eq("source", source)
      .eq("source_product_id", sourceProductId)
      .maybeSingle();

    const previousPrice =
      existingListing?.price != null ? Number(existingListing.price) : null;
    const listingPayload: Record<string, unknown> = {
      product_id: productId,
      store_id: storeId,
      source,
      source_product_id: sourceProductId,
      source_url: product.url,
      source_title: product.name,
      price: product.price,
      affiliate_url: product.url,
      currency: "TRY",
      in_stock: true,
      is_active: true,
      last_seen: nowIso,
      warranty_type: detectWarrantyType(source, product.name),
    };
    if (!existingListing || previousPrice !== product.price) {
      listingPayload.last_price_change = nowIso;
    }

    const { data: listing, error: listingError } = await sb
      .from("listings")
      .upsert(listingPayload, { onConflict: "source,source_product_id" })
      .select("id")
      .single();

    if (listingError || !listing) {
      if (firstError.length < 3) {
        firstError.push(
          `listing:${listingError?.code}:${listingError?.message}:source=${source}`
        );
      }
      errors++;
      continue;
    }

    if (!existingListing || previousPrice !== product.price) {
      const { error: historyError } = await sb.from("price_history").insert({
        listing_id: listing.id,
        price: product.price,
        recorded_at: nowIso,
      });

      if (historyError) {
        if (firstError.length < 3) {
          firstError.push(
            `history:${historyError.code}:${historyError.message}:listing=${listing.id}`
          );
        }
        errors++;
        continue;
      }
    }

    const { data: alerts } = await sb
      .from("price_alerts")
      .select("id")
      .eq("product_id", productId)
      .eq("is_triggered", false)
      .gte("target_price", product.price);

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
      }).catch((err) =>
        console.error(`[agent-validate] product=${id} fetch failed: ${err.message}`)
      );
    } catch (err) {
      console.error(
        `[agent-validate] product=${id} error: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }

    await new Promise((resolve) => setTimeout(resolve, rateLimitMs));
  }
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-internal-secret");
  if (secret !== INTERNAL_SECRET) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const { source, query, page = 1, category_id, title_filter } =
    (await request.json()) as {
      source: SyncSource;
      query: string;
      page?: number;
      category_id?: string;
      title_filter?: string[];
    };

  if (!source || !query) {
    return NextResponse.json(
      { error: "source ve query gerekli" },
      { status: 400 }
    );
  }

  const scraperRes = await fetch(
    `${BASE_URL}/api/${source}?q=${encodeURIComponent(query)}&page=${page}`
  );

  if (!scraperRes.ok) {
    return NextResponse.json(
      { error: `Scraper hatasi: ${scraperRes.status}` },
      { status: 502 }
    );
  }

  let { products = [] } = (await scraperRes.json()) as { products: ScrapedProduct[] };

  // Defensive: geçersiz fiyatlı ürünleri filtrele (her scraper kendi başına yapsa da
  // kaynak ne olursa olsun "0 TL" listing'i DB'ye yazılmasın).
  products = products.filter((p) => Number.isFinite(p.price) && p.price > 0);

  if (title_filter && title_filter.length > 0) {
    const before = products.length;
    products = products.filter((product) =>
      title_filter.some((keyword) =>
        product.name.toLowerCase().includes(keyword.toLowerCase())
      )
    );
    if (products.length < before) {
      console.log(
        `[title_filter] ${before} -> ${products.length} urun (${
          before - products.length
        } atlandi)`
      );
    }
  }

  const stats = await syncProducts(products, source, category_id);

  if (stats.newProductIds.length > 0) {
    console.log(
      `[sync] ${stats.newProductIds.length} new product(s) -> agent validation queued`
    );
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
