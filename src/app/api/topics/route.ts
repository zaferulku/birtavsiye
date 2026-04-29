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

  const title = typeof body.title === "string" ? body.title.slice(0, 300).trim() : "";
  const bodyText = typeof body.body === "string" ? body.body.slice(0, 3000).trim() : "";
  const category = typeof body.category === "string" ? body.category.slice(0, 80) : null;
  const userName = typeof body.user_name === "string" ? body.user_name.slice(0, 80) : null;
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const payload: Record<string, unknown> = {
    user_id: user.id,
    user_name: userName,
    title,
    body: bodyText,
    category,
    votes: 0,
    answer_count: 0,
    gender_filter: typeof body.gender_filter === "string" ? body.gender_filter : null,
  };
  if (body.product_id) payload.product_id = body.product_id;
  if (body.product_slug) payload.product_slug = body.product_slug;
  if (body.product_title) payload.product_title = String(body.product_title).slice(0, 300);
  if (body.product_brand) payload.product_brand = String(body.product_brand).slice(0, 100);

  const { data, error } = await supabaseAdmin.from("topics").insert(payload).select("*").single();
  if (error) return NextResponse.json({ error: "Sunucu hatasi" }, { status: 500 });
  return NextResponse.json({ topic: data });
}
