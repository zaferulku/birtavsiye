import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseServer";

export const runtime = "nodejs";
export const revalidate = 30;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const topicIdsParam = url.searchParams.get("topic_ids");
  const topicId = url.searchParams.get("topic_id");

  if (!topicIdsParam && !topicId) {
    return NextResponse.json({ error: "topic_ids veya topic_id parametresi gerekli" }, { status: 400 });
  }

  const ids = topicIdsParam ? topicIdsParam.split(",").filter(Boolean).slice(0, 200) : [topicId!];
  if (ids.length === 0) return NextResponse.json({ answers: [] });

  const { data, error } = await supabaseAdmin
    .from("topic_answers")
    .select("id, topic_id, user_id, user_name, body, votes, gender, created_at, parent_id")
    .in("topic_id", ids)
    .order("votes", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    { answers: data ?? [] },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
  );
}
