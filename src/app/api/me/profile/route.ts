import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseServer";
import { getUserFromRequest } from "../../../../lib/apiAuth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, username, full_name, bio, phone, birth_date, gender, avatar_url, is_admin, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Sunucu hatasi" }, { status: 500 });
  return NextResponse.json({ profile: data });
}

export async function PATCH(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }

  const payload: Record<string, unknown> = {};
  if (typeof body.username === "string") payload.username = body.username.slice(0, 80).trim();
  if (typeof body.full_name === "string") payload.full_name = body.full_name.slice(0, 150).trim();
  if (typeof body.bio === "string") payload.bio = body.bio.slice(0, 1000);
  if (typeof body.phone === "string") payload.phone = body.phone.slice(0, 30);
  if (body.birth_date === null || (typeof body.birth_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.birth_date))) {
    payload.birth_date = body.birth_date;
  }
  if (typeof body.gender === "string" && ["kadin", "erkek", "belirtmek-istemiyor", ""].includes(body.gender)) {
    payload.gender = body.gender;
  }
  if (typeof body.avatar_url === "string") payload.avatar_url = body.avatar_url.slice(0, 500);

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: "no valid fields" }, { status: 400 });
  }

  // is_admin user tarafından ASLA değiştirilemez (güvenlik)
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .upsert({ id: user.id, ...payload }, { onConflict: "id" })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: "Sunucu hatasi" }, { status: 500 });
  return NextResponse.json({ profile: data });
}
