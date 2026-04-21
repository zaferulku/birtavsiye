import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseServer";
import { getUserFromRequest } from "../../../lib/apiAuth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }

  const product_id = typeof body.product_id === "string" ? body.product_id : null;
  const text = typeof body.body === "string" ? body.body.slice(0, 2000).trim() : "";
  const title = typeof body.title === "string" ? body.title.slice(0, 200) : text.slice(0, 80);
  const user_name = typeof body.user_name === "string" ? body.user_name.slice(0, 80) : null;
  const parent_id = typeof body.parent_id === "string" ? body.parent_id : null;
  const rating = typeof body.rating === "number" && body.rating >= 0 && body.rating <= 5 ? body.rating : null;
  const type = typeof body.type === "string" ? body.type.slice(0, 40) : "yorum";

  if (!product_id || !text) return NextResponse.json({ error: "product_id and body required" }, { status: 400 });

  const payload: Record<string, unknown> = {
    product_id,
    user_id: user.id,
    user_name,
    type,
    title,
    body: text,
    votes: 0,
    downvotes: 0,
    parent_id,
  };
  if (rating !== null) payload.rating = rating;

  const { data, error } = await supabaseAdmin
    .from("community_posts")
    .insert(payload)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ post: data });
}
