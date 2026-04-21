import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseServer";

export const runtime = "nodejs";
export const revalidate = 30;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") || "60", 10)));
  const category = url.searchParams.get("category");

  let q = supabaseAdmin
    .from("topics")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (category && category !== "Hepsi") q = q.eq("category", category);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    { topics: data ?? [] },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
  );
}
