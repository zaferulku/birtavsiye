import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseServer";
import { getFreshestSeenAt, getLowestActivePrice } from "../../../../../lib/listingSignals";

export const runtime = "nodejs";
export const revalidate = 600;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const productId = url.searchParams.get("product_id");
  if (!productId) return NextResponse.json({ error: "product_id required" }, { status: 400 });

  const { data: thisProd } = await supabaseAdmin
    .from("products")
    .select("brand, model_family, category_id")
    .eq("id", productId)
    .maybeSingle();

  if (!thisProd?.category_id) {
    return NextResponse.json({ products: [] });
  }

  let q = supabaseAdmin
    .from("products")
    .select("id,title,slug,brand,image_url,model_family,prices:listings(price, last_seen, is_active, in_stock)")
    .eq("category_id", thisProd.category_id)
    .neq("id", productId)
    .limit(40);

  if (thisProd.model_family) q = q.neq("model_family", thisProd.model_family);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: "Sunucu hatasi" }, { status: 500 });

  const list = (data ?? []).map((product) => ({
    ...product,
    prices: ((product.prices as Array<{ price: number | string; last_seen?: string | null; is_active?: boolean | null; in_stock?: boolean | null }> | null) ?? [])
      .filter((listing) => listing.is_active !== false && listing.in_stock !== false)
      .map((listing) => ({ price: Number(listing.price), last_seen: listing.last_seen ?? null })),
    min_price: getLowestActivePrice(
      ((product.prices as Array<{ price: number | string; last_seen?: string | null; is_active?: boolean | null; in_stock?: boolean | null }> | null) ?? [])
    ),
    freshest_seen_at: getFreshestSeenAt(
      ((product.prices as Array<{ price: number | string; last_seen?: string | null; is_active?: boolean | null; in_stock?: boolean | null }> | null) ?? [])
    ),
  }));
  const byFamily = new Map<string, typeof list[number]>();
  const noFamily: typeof list = [];
  for (const p of list) {
    if (p.brand && p.model_family) {
      const key = `${p.brand}|${p.model_family}`;
      if (!byFamily.has(key)) byFamily.set(key, p);
    } else {
      noFamily.push(p);
    }
  }
  const deduped = [...byFamily.values(), ...noFamily];
  const sorted = deduped.sort((a, b) => {
    const aBrand = thisProd.brand && a.brand === thisProd.brand ? 0 : 1;
    const bBrand = thisProd.brand && b.brand === thisProd.brand ? 0 : 1;
    return aBrand - bBrand;
  });

  return NextResponse.json(
    { products: sorted.slice(0, 8) },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
  );
}
