import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseServer";

export const runtime = "nodejs";
export const revalidate = 30;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data: topic, error } = await supabaseAdmin
    .from("topics")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!topic) return NextResponse.json({ topic: null }, { status: 404 });

  let author_gender: string | null = null;
  if (topic.user_id) {
    const { data: p } = await supabaseAdmin
      .from("public_profiles")
      .select("gender")
      .eq("id", topic.user_id)
      .maybeSingle();
    author_gender = p?.gender ?? null;
  }

  return NextResponse.json(
    { topic: { ...topic, author_gender } },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
  );
}
