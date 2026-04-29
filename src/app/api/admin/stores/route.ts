import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseServer";
import { getAdminUser } from "../../../../lib/apiAdmin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data, error } = await supabaseAdmin.from("stores").select("*").order("name");
  if (error) return NextResponse.json({ error: "Sunucu hatasi" }, { status: 500 });
  return NextResponse.json({ stores: data ?? [] });
}

export async function POST(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { name?: string; url?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const url = typeof body.url === "string" ? body.url.trim() : "";

  const { data: existing } = await supabaseAdmin
    .from("stores")
    .select("id")
    .ilike("name", name)
    .maybeSingle();

  if (existing) return NextResponse.json({ store: existing, created: false });

  const { data, error } = await supabaseAdmin
    .from("stores")
    .insert({ name, url: url || null })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: "Sunucu hatasi" }, { status: 500 });
  return NextResponse.json({ store: data, created: true });
}
