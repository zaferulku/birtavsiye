import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserFromRequest } from "@/lib/apiAuth";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  // Auth gate — anonim email harvest / spam tetikleme engellensin
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }
  if (!user.email) {
    return NextResponse.json({ error: "Hesabınızda e-posta yok" }, { status: 400 });
  }

  const { product_id, target_price } = await request.json() as {
    product_id:   string;
    target_price: number;
  };

  if (!product_id || typeof target_price !== "number" || target_price <= 0) {
    return NextResponse.json({ error: "Eksik veya geçersiz alan" }, { status: 400 });
  }

  const sb = getSupabase();

  const { error } = await sb.from("price_alerts").insert({
    product_id,
    email: user.email,
    user_id: user.id,
    target_price,
  });

  if (error) {
    console.error("[price-alert] insert failed", error);
    return NextResponse.json({ error: "Kayıt başarısız" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
