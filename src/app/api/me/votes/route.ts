import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseServer";
import { getUserFromRequest } from "../../../../lib/apiAuth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("topic_votes")
    .select("topic_id, vote")
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: "Sunucu hatasi" }, { status: 500 });
  return NextResponse.json({ votes: data ?? [] });
}
