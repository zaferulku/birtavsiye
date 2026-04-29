import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseServer";
import { getAdminUser } from "../../../../lib/apiAdmin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from("products")
    .select("id, title, slug, brand, created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Sunucu hatasi" }, { status: 500 });
  return NextResponse.json({ products: data ?? [] });
}

export async function POST(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }

  const title = typeof body.title === "string" ? body.title.slice(0, 300) : "";
  const slug = typeof body.slug === "string" ? body.slug.slice(0, 200) : "";
  const brand = typeof body.brand === "string" ? body.brand.slice(0, 100) : "";
  if (!title || !slug || !brand) return NextResponse.json({ error: "title, slug, brand required" }, { status: 400 });

  const payload: Record<string, unknown> = {
    title,
    slug,
    brand,
    description: typeof body.description === "string" ? body.description : null,
    image_url: typeof body.image_url === "string" ? body.image_url : null,
    category_id: typeof body.category_id === "string" ? body.category_id : null,
    specs: body.specs ?? null,
    icecat_id: typeof body.icecat_id === "string" ? body.icecat_id : null,
  };

  const { data, error } = await supabaseAdmin.from("products").insert(payload).select("*").single();
  if (error) return NextResponse.json({ error: "Sunucu hatasi" }, { status: 500 });
  return NextResponse.json({ product: data });
}

export async function DELETE(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabaseAdmin.from("products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Sunucu hatasi" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
