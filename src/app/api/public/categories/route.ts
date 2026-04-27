import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseServer";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("categories")
    .select("id, slug, parent_id, name, icon")
    .neq("slug", "siniflandirilmamis")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    { categories: data ?? [] },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
  );
}
