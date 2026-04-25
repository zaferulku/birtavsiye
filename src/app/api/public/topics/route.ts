import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseServer";

export const runtime = "nodejs";
export const revalidate = 30;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") || "60", 10)));
  const category = url.searchParams.get("category");
  const product_id = url.searchParams.get("product_id");
  const popular = url.searchParams.get("popular") === "1";
  const topicSelect =
    "id, title, body, user_name, category, votes, answer_count, created_at, product_slug, product_title, product_brand, gender_filter";

  let q = supabaseAdmin
    .from("topics")
    .select(popular ? "id, title, category, votes, answer_count, created_at" : topicSelect)
    .limit(limit);

  q = popular
    ? q.order("votes", { ascending: false })
    : q.order("created_at", { ascending: false });

  if (category && category !== "Hepsi") q = q.eq("category", category);
  if (product_id) q = q.eq("product_id", product_id);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    { topics: data ?? [] },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
  );
}
