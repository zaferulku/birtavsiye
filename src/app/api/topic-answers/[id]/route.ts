import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseServer";
import { getUserFromRequest } from "../../../../lib/apiAuth";
import { adjustTopicAnswerCount } from "../../../../lib/forumCounters";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }

  const text = typeof body.body === "string" ? body.body.slice(0, 2000).trim() : "";
  if (!text) return NextResponse.json({ error: "body required" }, { status: 400 });

  const { data: existing } = await supabaseAdmin
    .from("topic_answers")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (existing.user_id !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from("topic_answers")
    .update({ body: text })
    .eq("id", id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: "Sunucu hatasi" }, { status: 500 });
  return NextResponse.json({ answer: data });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data: existing } = await supabaseAdmin
    .from("topic_answers")
    .select("user_id, topic_id")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (existing.user_id !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { error } = await supabaseAdmin.from("topic_answers").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Sunucu hatasi" }, { status: 500 });

  await adjustTopicAnswerCount(existing.topic_id, -1);

  return NextResponse.json({ ok: true });
}
