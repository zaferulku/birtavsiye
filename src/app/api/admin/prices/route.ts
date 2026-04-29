import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseServer";
import { getAdminUser } from "../../../../lib/apiAdmin";

export const runtime = "nodejs";

const STORE_SOURCE_MAP: Record<string, string> = {
  trendyol: "trendyol",
  hepsiburada: "hepsiburada",
  mediamarkt: "mediamarkt",
  pttavm: "pttavm",
  "vatan-bilgisayar": "vatan",
  "amazon-tr": "amazon",
  amazon: "amazon",
  n11: "n11",
  teknosa: "teknosa",
};

function slugifyStoreName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[ğĞ]/g, "g")
    .replace(/[üÜ]/g, "u")
    .replace(/[şŞ]/g, "s")
    .replace(/[ıİ]/g, "i")
    .replace(/[öÖ]/g, "o")
    .replace(/[çÇ]/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function sourceFromStoreName(name: string): string {
  const slug = slugifyStoreName(name);
  return STORE_SOURCE_MAP[slug] ?? slug;
}

export async function GET(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const product_id = url.searchParams.get("product_id");

  if (product_id) {
    const { data, error } = await supabaseAdmin
      .from("listings")
      .select("id, price, store_id, stores(name, url)")
      .eq("product_id", product_id)
      .order("price", { ascending: true });
    if (error) return NextResponse.json({ error: "Sunucu hatasi" }, { status: 500 });
    return NextResponse.json({ prices: data ?? [] });
  }

  const { data, error } = await supabaseAdmin
    .from("listings")
    .select("id, price, product_id, store_id, products(title), stores(name, url)")
    .order("price", { ascending: true });
  if (error) return NextResponse.json({ error: "Sunucu hatasi" }, { status: 500 });
  return NextResponse.json({ prices: data ?? [] });
}

export async function POST(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { product_id?: string; store_id?: string; price?: number; affiliate_url?: string | null };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }

  const { product_id, store_id, price } = body;
  if (!product_id || !store_id || typeof price !== "number" || isNaN(price)) {
    return NextResponse.json({ error: "product_id, store_id, price required" }, { status: 400 });
  }

  const [{ data: product }, { data: store }] = await Promise.all([
    supabaseAdmin.from("products").select("title").eq("id", product_id).maybeSingle(),
    supabaseAdmin.from("stores").select("name, url").eq("id", store_id).maybeSingle(),
  ]);

  if (!product?.title) return NextResponse.json({ error: "product not found" }, { status: 404 });
  if (!store?.name) return NextResponse.json({ error: "store not found" }, { status: 404 });

  const source = sourceFromStoreName(store.name);
  const sourceProductId = `manual:${product_id}:${store_id}`;
  const sourceUrl = body.affiliate_url?.trim() || store.url || sourceProductId;
  const nowIso = new Date().toISOString();

  const { data: existingListing } = await supabaseAdmin
    .from("listings")
    .select("id, price")
    .eq("source", source)
    .eq("source_product_id", sourceProductId)
    .maybeSingle();

  const { data: listing, error } = await supabaseAdmin
    .from("listings")
    .upsert(
      {
        product_id,
        store_id,
        source,
        source_product_id: sourceProductId,
        source_url: sourceUrl,
        source_title: product.title,
        price,
        affiliate_url: body.affiliate_url ?? null,
        currency: "TRY",
        in_stock: true,
        is_active: true,
        last_seen: nowIso,
        last_price_change: existingListing?.price !== price ? nowIso : undefined,
      },
      { onConflict: "source,source_product_id" }
    )
    .select("id")
    .single();
  if (error || !listing) return NextResponse.json({ error: error?.message ?? "listing save failed" }, { status: 500 });

  if (!existingListing || Number(existingListing.price) !== price) {
    const { error: historyError } = await supabaseAdmin.from("price_history").insert({
      listing_id: listing.id,
      price,
      recorded_at: nowIso,
    });
    if (historyError) return NextResponse.json({ error: historyError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabaseAdmin.from("listings").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Sunucu hatasi" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
