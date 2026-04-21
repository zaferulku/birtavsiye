import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseServer";
import { getUserFromRequest } from "../../../lib/apiAuth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }

  const topic_id = typeof body.topic_id === "string" ? body.topic_id : null;
  const text = typeof body.body === "string" ? body.body.slice(0, 2000).trim() : "";
  const userName = typeof body.user_name === "string" ? body.user_name.slice(0, 80) : null;
  const gender = typeof body.gender === "string" ? body.gender : null;

  if (!topic_id || !text) return NextResponse.json({ error: "topic_id and body required" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("topic_answers")
    .insert({ topic_id, user_id: user.id, user_name: userName, body: text, gender, votes: 0 })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // answer_count increment
  const { data: t } = await supabaseAdmin.from("topics").select("answer_count").eq("id", topic_id).maybeSingle();
  if (t) {
    await supabaseAdmin.from("topics").update({ answer_count: (t.answer_count || 0) + 1 }).eq("id", topic_id);
  }

  return NextResponse.json({ answer: data });
}
