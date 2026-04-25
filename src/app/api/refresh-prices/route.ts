import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserFromRequest } from "../../../lib/apiAuth";

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const SUPPORTED_SOURCES = new Set([
  "trendyol",
  "hepsiburada",
  "mediamarkt",
  "pttavm",
  "vatan",
]);

export async function GET(request: NextRequest) {
  const internalSecret = request.headers.get("x-internal-secret");
  const user = await getUserFromRequest(request);
  if (internalSecret !== INTERNAL_SECRET && !user) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const productId = request.nextUrl.searchParams.get("productId");
  if (!productId) return NextResponse.json({ error: "productId gerekli" }, { status: 400 });
  if (!INTERNAL_SECRET) {
    return NextResponse.json({ error: "INTERNAL_API_SECRET tanimli degil" }, { status: 500 });
  }

  const sb = getSupabase();

  const { data: product, error: productError } = await sb
    .from("products")
    .select("id, title, category_id")
    .eq("id", productId)
    .single();

  if (productError) return NextResponse.json({ error: productError.message }, { status: 500 });
  if (!product) return NextResponse.json({ error: "Urun bulunamadi" }, { status: 404 });

  const { data: listings, error: listingsError } = await sb
    .from("listings")
    .select("source")
    .eq("product_id", productId)
    .eq("is_active", true);

  if (listingsError) return NextResponse.json({ error: listingsError.message }, { status: 500 });

  const sources = [...new Set(
    (listings ?? [])
      .map((listing) => listing.source)
      .filter((source): source is string => Boolean(source) && SUPPORTED_SOURCES.has(source))
  )];

  await Promise.allSettled(
    sources.map((source) =>
      fetch(`${BASE_URL}/api/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": INTERNAL_SECRET,
        },
        body: JSON.stringify({
          source,
          query: product.title,
          page: 1,
          category_id: product.category_id ?? undefined,
        }),
      })
    )
  );

  return NextResponse.json({ ok: true, stores: sources, sources });
}
