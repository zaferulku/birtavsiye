import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseServer";
import { getUserFromRequest } from "../../../../lib/apiAuth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const url = new URL(req.url);
  const topicId = url.searchParams.get("topic_id");

  let query = supabaseAdmin
    .from("topic_answers")
    .select("id")
    .eq("user_id", user.id);

  if (topicId) query = query.eq("topic_id", topicId);

  const { data, error } = await query.limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    answer_ids: (data ?? []).map((row) => row.id),
  });
}
