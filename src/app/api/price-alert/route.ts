import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const { product_id, email, target_price } = await request.json() as {
    product_id:   string;
    email:        string;
    target_price: number;
  };

  if (!product_id || !email || !target_price) {
    return NextResponse.json({ error: "Eksik alan" }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Geçersiz e-posta" }, { status: 400 });
  }

  const sb = getSupabase();

  const { error } = await sb.from("price_alerts").insert({
    product_id,
    email,
    target_price,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
