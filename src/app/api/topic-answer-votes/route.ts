import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseServer";
import { getUserFromRequest } from "../../../lib/apiAuth";

export const runtime = "nodejs";

async function recalcAnswerTotal(answerId: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from("topic_answer_votes")
    .select("vote")
    .eq("answer_id", answerId);
  const total = (data ?? []).reduce((s: number, r: { vote: number }) => s + (r.vote || 0), 0);
  await supabaseAdmin.from("topic_answers").update({ votes: total }).eq("id", answerId);
  return total;
}

async function readBody(req: Request): Promise<{ answer_id?: string; vote?: number }> {
  try { return await req.json(); } catch { return {}; }
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const { answer_id, vote } = await readBody(req);
  if (!answer_id || typeof answer_id !== "string") return NextResponse.json({ error: "answer_id required" }, { status: 400 });
  if (vote !== 1 && vote !== -1) return NextResponse.json({ error: "vote must be 1 or -1" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("topic_answer_votes")
    .upsert({ answer_id, user_id: user.id, vote }, { onConflict: "answer_id,user_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const total = await recalcAnswerTotal(answer_id);
  return NextResponse.json({ ok: true, total });
}

export async function DELETE(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const url = new URL(req.url);
  const answer_id = url.searchParams.get("answer_id");
  if (!answer_id) return NextResponse.json({ error: "answer_id required" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("topic_answer_votes")
    .delete()
    .eq("answer_id", answer_id)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const total = await recalcAnswerTotal(answer_id);
  return NextResponse.json({ ok: true, total });
}
