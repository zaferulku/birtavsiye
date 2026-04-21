import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseServer";
import { getUserFromRequest } from "../../../../lib/apiAuth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }

  const payload: Record<string, unknown> = { id: user.id };
  if (typeof body.full_name === "string") payload.full_name = body.full_name.slice(0, 150).trim();
  if (typeof body.username === "string") payload.username = body.username.slice(0, 80).trim();
  if (typeof body.gender === "string" && ["kadin", "erkek", "belirtmek-istemiyor", ""].includes(body.gender)) {
    payload.gender = body.gender;
  }
  if (typeof body.age_range === "string") payload.age_range = body.age_range.slice(0, 30);

  const { error } = await supabaseAdmin
    .from("profiles")
    .upsert(payload, { onConflict: "id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
