import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseServer";
import { getUserFromRequest } from "../../../lib/apiAuth";

export const runtime = "nodejs";

async function readBody(req: Request): Promise<{ topic_id?: string; vote?: number }> {
  try { return await req.json(); } catch { return {}; }
}

// POST: upsert vote (+1 / -1)
export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const { topic_id, vote } = await readBody(req);
  if (!topic_id || typeof topic_id !== "string") return NextResponse.json({ error: "topic_id required" }, { status: 400 });
  if (vote !== 1 && vote !== -1) return NextResponse.json({ error: "vote must be 1 or -1" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("topic_votes")
    .upsert({ topic_id, user_id: user.id, vote }, { onConflict: "topic_id,user_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE: remove vote
export async function DELETE(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const url = new URL(req.url);
  const topic_id = url.searchParams.get("topic_id");
  if (!topic_id) return NextResponse.json({ error: "topic_id required" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("topic_votes")
    .delete()
    .eq("topic_id", topic_id)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
