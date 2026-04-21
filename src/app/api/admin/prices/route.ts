import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseServer";
import { getAdminUser } from "../../../../lib/apiAdmin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const product_id = url.searchParams.get("product_id");

  if (product_id) {
    const { data, error } = await supabaseAdmin
      .from("prices")
      .select("id, price, store_id, stores(name, url)")
      .eq("product_id", product_id)
      .order("price", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ prices: data ?? [] });
  }

  const { data, error } = await supabaseAdmin
    .from("prices")
    .select("id, price, product_id, store_id, products(title), stores(name, url)")
    .order("price", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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

  const { error } = await supabaseAdmin
    .from("prices")
    .upsert(
      { product_id, store_id, price, affiliate_url: body.affiliate_url ?? null },
      { onConflict: "product_id,store_id" }
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabaseAdmin.from("prices").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
