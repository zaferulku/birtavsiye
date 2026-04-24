import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseServer";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  const { data: product, error } = await supabaseAdmin
    .from("products")
    .select("*, prices:listings(id, price, url:source_url, affiliate_url, in_stock, is_active, stores(name, url))")
    .eq("slug", slug)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!product) return NextResponse.json({ error: "not found" }, { status: 404 });

  const normalizedProduct = {
    ...product,
    prices: ((product.prices as Array<{
      id: string;
      price: number | string;
      url: string;
      affiliate_url: string | null;
      in_stock?: boolean | null;
      is_active?: boolean | null;
      stores?: { name?: string | null; url?: string | null } | null;
    }> | null) ?? [])
      .filter((listing) => listing.is_active !== false && listing.in_stock !== false)
      .map((listing) => ({
        id: listing.id,
        price: Number(listing.price),
        url: listing.url,
        affiliate_url: listing.affiliate_url,
        in_stock: listing.in_stock !== false,
        stores: listing.stores ?? null,
      })),
  };

  return NextResponse.json(
    { product: normalizedProduct },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
  );
}
