import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseServer";
import { getUserFromRequest } from "../../../lib/apiAuth";

export const runtime = "nodejs";

async function recalcCounters(postId: string): Promise<{ votes: number; downvotes: number }> {
  const { data } = await supabaseAdmin
    .from("post_votes")
    .select("vote_type")
    .eq("post_id", postId);
  let votes = 0, downvotes = 0;
  for (const r of data ?? []) {
    if (r.vote_type === "up") votes++;
    else if (r.vote_type === "down") downvotes++;
  }
  await supabaseAdmin.from("community_posts").update({ votes, downvotes }).eq("id", postId);
  return { votes, downvotes };
}

async function readBody(req: Request): Promise<{ post_id?: string; vote_type?: string }> {
  try { return await req.json(); } catch { return {}; }
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const { post_id, vote_type } = await readBody(req);
  if (!post_id || typeof post_id !== "string") return NextResponse.json({ error: "post_id required" }, { status: 400 });
  if (vote_type !== "up" && vote_type !== "down") return NextResponse.json({ error: "vote_type must be 'up' or 'down'" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("post_votes")
    .upsert({ post_id, user_id: user.id, vote_type }, { onConflict: "post_id,user_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const counters = await recalcCounters(post_id);
  return NextResponse.json({ ok: true, ...counters });
}

export async function DELETE(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const url = new URL(req.url);
  const post_id = url.searchParams.get("post_id");
  if (!post_id) return NextResponse.json({ error: "post_id required" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("post_votes")
    .delete()
    .eq("post_id", post_id)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const counters = await recalcCounters(post_id);
  return NextResponse.json({ ok: true, ...counters });
}
