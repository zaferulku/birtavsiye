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
    .select("*, prices(id, price, url, affiliate_url, in_stock, stores(name, url))")
    .eq("slug", slug)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!product) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json(
    { product },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
  );
}
