import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseServer";

export const runtime = "nodejs";
export const revalidate = 600;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const product_id = url.searchParams.get("product_id");
  if (!product_id) return NextResponse.json({ error: "product_id required" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("community_posts")
    .select("id, user_name, body, created_at, parent_id, votes, downvotes, rating")
    .eq("product_id", product_id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: "Sunucu hatasi" }, { status: 500 });
  return NextResponse.json(
    { posts: data ?? [] },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
  );
}
