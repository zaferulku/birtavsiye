import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseServer";
import { getUserFromRequest } from "../../../../lib/apiAuth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const url = new URL(req.url);
  const topic_id = url.searchParams.get("topic_id");
  if (!topic_id) return NextResponse.json({ error: "topic_id required" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("topic_votes")
    .select("vote")
    .eq("topic_id", topic_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Sunucu hatasi" }, { status: 500 });
  return NextResponse.json({ vote: data?.vote ?? 0 });
}
