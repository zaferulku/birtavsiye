import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseServer";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const categorySlug = url.searchParams.get("category");
  const q = url.searchParams.get("q");
  const brand = url.searchParams.get("brand");
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10)));
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10));

  let categoryIds: string[] | null = null;
  if (categorySlug) {
    const { data: cat } = await supabaseAdmin
      .from("categories")
      .select("id, parent_id")
      .eq("slug", categorySlug)
      .maybeSingle();

    if (!cat) return NextResponse.json({ products: [], error: "category not found" }, { status: 404 });

    const { data: all } = await supabaseAdmin.from("categories").select("id, parent_id");
    const childMap = new Map<string, string[]>();
    for (const c of all ?? []) {
      if (!c.parent_id) continue;
      const arr = childMap.get(c.parent_id) ?? [];
      arr.push(c.id);
      childMap.set(c.parent_id, arr);
    }
    categoryIds = [cat.id];
    const stack = [cat.id];
    while (stack.length) {
      const id = stack.pop()!;
      for (const cid of childMap.get(id) ?? []) {
        categoryIds.push(cid);
        stack.push(cid);
      }
    }
  }

  let query = supabaseAdmin
    .from("products")
    .select("id, title, slug, brand, image_url, category_id, model_family, variant_storage, variant_color, source, prices(price)")
    .range(offset, offset + limit - 1)
    .order("created_at", { ascending: false });

  if (categoryIds) query = query.in("category_id", categoryIds);
  if (q) query = query.ilike("title", `%${q.replace(/[%_]/g, "\\$&").slice(0, 100)}%`);
  if (brand) query = query.ilike("brand", brand);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    { products: data ?? [] },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
  );
}
