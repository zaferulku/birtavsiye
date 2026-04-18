import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const BASE_URL        = process.env.NEXTAUTH_URL || "http://localhost:3000";
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const STORE_SOURCE: Record<string, string> = {
  Trendyol:    "trendyol",
  MediaMarkt:  "mediamarkt",
  PttAVM:      "pttavm",
  Hepsiburada: "hepsiburada",
};

export async function GET(request: NextRequest) {
  const productId = request.nextUrl.searchParams.get("productId");
  if (!productId) return NextResponse.json({ error: "productId gerekli" }, { status: 400 });

  const sb = getSupabase();

  const { data: product } = await sb
    .from("products")
    .select("id, title, category_id")
    .eq("id", productId)
    .single();

  if (!product) return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });

  const { data: prices } = await sb
    .from("prices")
    .select("stores(name)")
    .eq("product_id", productId);

  const stores = [...new Set(
    (prices ?? []).map((p: any) => p.stores?.name as string).filter(Boolean)
  )];

  await Promise.allSettled(
    stores.map(storeName => {
      const source = STORE_SOURCE[storeName];
      if (!source) return Promise.resolve(null);
      return fetch(`${BASE_URL}/api/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": INTERNAL_SECRET ?? "",
        },
        body: JSON.stringify({
          source,
          query: product.title,
          page: 1,
          category_id: product.category_id ?? undefined,
        }),
      });
    })
  );

  return NextResponse.json({ ok: true, stores });
}
