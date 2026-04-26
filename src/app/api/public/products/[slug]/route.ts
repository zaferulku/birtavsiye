import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseServer";
import {
  getActiveOfferCount,
  getFreshestSeenAt,
  getLowestActivePrice,
  getUniqueActiveSources,
} from "../../../../../lib/listingSignals";
import {
  dedupeClusterListingsBySource,
  resolveProductClusterIds,
} from "../../../../../lib/productCluster";

export const runtime = "nodejs";
export const revalidate = 60;

type PublicPriceRow = {
  id: string;
  product_id: string;
  source: string | null;
  price: number | string;
  last_seen: string | null;
  source_url: string | null;
  affiliate_url: string | null;
  in_stock: boolean | null;
  is_active: boolean | null;
  stores?: { name?: string | null; url?: string | null } | null;
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  const { data: product, error } = await supabaseAdmin
    .from("products")
    .select("*, prices:listings(id, source, price, last_seen, url:source_url, affiliate_url, in_stock, is_active, stores(name, url))")
    .eq("slug", slug)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!product) return NextResponse.json({ error: "not found" }, { status: 404 });

  const clusterProductIds = await resolveProductClusterIds(supabaseAdmin, {
    id: product.id,
    brand: product.brand ?? null,
    model_code: product.model_code ?? null,
    model_family: product.model_family ?? null,
    variant_storage: product.variant_storage ?? null,
    variant_color: product.variant_color ?? null,
    category_id: product.category_id ?? null,
  });

  const { data: clusterPrices, error: clusterPricesError } = await supabaseAdmin
    .from("listings")
    .select("id, product_id, source, price, last_seen, source_url, affiliate_url, in_stock, is_active, stores(name, url)")
    .in("product_id", clusterProductIds)
    .eq("is_active", true);

  if (clusterPricesError) {
    return NextResponse.json({ error: clusterPricesError.message }, { status: 500 });
  }

  const mergedPrices = dedupeClusterListingsBySource<PublicPriceRow>(
    (((clusterPrices as PublicPriceRow[] | null) ?? []).map((listing) => ({
      ...listing,
      source: listing.source ?? null,
      last_seen: listing.last_seen ?? null,
      source_url: listing.source_url ?? null,
      in_stock: listing.in_stock ?? null,
      is_active: listing.is_active ?? null,
    }))).filter((listing) => listing.in_stock !== false)
  );

  const normalizedProduct = {
    ...product,
    prices: mergedPrices
      .map((listing) => ({
        id: listing.id,
        source: listing.source ?? null,
        price: Number(listing.price),
        last_seen: listing.last_seen ?? null,
        url: listing.source_url ?? null,
        affiliate_url: listing.affiliate_url,
        in_stock: listing.in_stock !== false,
        stores: listing.stores ?? null,
      })),
    min_price: getLowestActivePrice(
      mergedPrices
    ),
    offer_count: getActiveOfferCount(
      mergedPrices
    ),
    freshest_seen_at: getFreshestSeenAt(
      mergedPrices
    ),
    sources: getUniqueActiveSources(
      mergedPrices
    ),
    cluster_product_ids: clusterProductIds,
  };

  return NextResponse.json(
    { product: normalizedProduct },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
  );
}
