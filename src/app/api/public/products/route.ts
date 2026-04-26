import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseServer";
import {
  getActiveOfferCount,
  getFreshestSeenAt,
  getLowestActivePrice,
  getUniqueActiveSources,
} from "../../../../lib/listingSignals";
import { mergeClusteredProducts } from "../../../../lib/productCluster";

export const runtime = "nodejs";
export const revalidate = 60;

type SearchCategoryRow = {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
};

function normalizeSearchText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0131/g, "i")
    .replace(/\u0130/g, "I")
    .toLowerCase()
    .trim();
}

function expandCategoryIds(
  categories: SearchCategoryRow[],
  rootIds: Iterable<string>
): string[] {
  const expandedIds = new Set<string>(rootIds);
  if (expandedIds.size === 0) return [];

  let foundChild = true;
  while (foundChild) {
    foundChild = false;
    for (const category of categories) {
      if (!category.parent_id || expandedIds.has(category.id) || !expandedIds.has(category.parent_id)) continue;
      expandedIds.add(category.id);
      foundChild = true;
    }
  }

  return [...expandedIds];
}

function getMatchedCategoryIds(categories: SearchCategoryRow[], term: string): string[] {
  const normalizedTerm = normalizeSearchText(term);
  if (!normalizedTerm) return [];

  const matchedRootIds = categories
    .filter((category) => {
      const haystacks = [category.name, category.slug].map((value) => normalizeSearchText(value));
      return haystacks.some((value) => value.includes(normalizedTerm));
    })
    .map((category) => category.id);

  return expandCategoryIds(categories, matchedRootIds);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const categorySlug = url.searchParams.get("category");
  const q = url.searchParams.get("q");
  const brand = url.searchParams.get("brand");
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10)));
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10));

  const shouldLoadCategories = Boolean(categorySlug || q);
  const { data: allCategories } = shouldLoadCategories
    ? await supabaseAdmin.from("categories").select("id, parent_id, name, slug")
    : { data: null };
  const categories = (allCategories ?? []) as SearchCategoryRow[];

  let categoryIds: string[] | null = null;
  if (categorySlug) {
    const cat = categories.find((category) => category.slug === categorySlug) ?? null;

    if (!cat) return NextResponse.json({ products: [], error: "category not found" }, { status: 404 });

    categoryIds = expandCategoryIds(categories, [cat.id]);
  }

  const fetchLimit = Math.min(400, Math.max(offset + limit * 4, 48));
  const selectFields =
    "id, title, slug, brand, image_url, category_id, model_code, model_family, variant_storage, variant_color, created_at, prices:listings(id, price, source, last_seen, is_active, in_stock)";

  let data:
    | Array<{
        id: string;
        title: string;
        slug: string;
        brand: string | null;
        image_url: string | null;
        category_id: string | null;
        model_code: string | null;
        model_family: string | null;
        variant_storage: string | null;
        variant_color: string | null;
        created_at: string | null;
        prices?: Array<{
          id: string;
          price: number | string;
          source?: string | null;
          last_seen?: string | null;
          is_active?: boolean | null;
          in_stock?: boolean | null;
        }> | null;
      }>
    | null = null;

  if (q) {
    const safeTerm = q.replace(/[%_]/g, "\\$&").slice(0, 100);
    let textQuery = supabaseAdmin
      .from("products")
      .select(selectFields)
      .or(
        [
          `title.ilike.%${safeTerm}%`,
          `brand.ilike.%${safeTerm}%`,
          `model_family.ilike.%${safeTerm}%`,
          `model_code.ilike.%${safeTerm}%`,
          `variant_storage.ilike.%${safeTerm}%`,
          `variant_color.ilike.%${safeTerm}%`,
        ].join(",")
      )
      .range(0, fetchLimit - 1)
      .order("created_at", { ascending: false });

    if (categoryIds) textQuery = textQuery.in("category_id", categoryIds);
    if (brand) textQuery = textQuery.ilike("brand", brand);

    const matchedCategoryIds = getMatchedCategoryIds(categories, q);
    const categoryScopedIds = categoryIds
      ? matchedCategoryIds.filter((id) => categoryIds.includes(id))
      : matchedCategoryIds;

    const [textResult, categoryResult] = await Promise.all([
      textQuery,
      categoryScopedIds.length > 0
        ? supabaseAdmin
            .from("products")
            .select(selectFields)
            .in("category_id", categoryScopedIds)
            .range(0, fetchLimit - 1)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as typeof data, error: null }),
    ]);

    if (textResult.error) return NextResponse.json({ error: textResult.error.message }, { status: 500 });
    if (categoryResult.error) {
      return NextResponse.json({ error: categoryResult.error.message }, { status: 500 });
    }

    const uniqueRows = new Map<string, NonNullable<typeof data>[number]>();
    for (const product of [...(textResult.data ?? []), ...(categoryResult.data ?? [])]) {
      uniqueRows.set(product.id, product);
    }
    data = [...uniqueRows.values()];
  } else {
    let query = supabaseAdmin
      .from("products")
      .select(selectFields)
      .range(0, fetchLimit - 1)
      .order("created_at", { ascending: false });

    if (categoryIds) query = query.in("category_id", categoryIds);
    if (brand) query = query.ilike("brand", brand);

    const result = await query;
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
    data = result.data;
  }

  const mergedProducts = mergeClusteredProducts(
    ((data ?? []) as Array<{
      id: string;
      title: string;
      slug: string;
      brand: string | null;
      image_url: string | null;
      category_id: string | null;
      model_code: string | null;
      model_family: string | null;
      variant_storage: string | null;
      variant_color: string | null;
      created_at: string | null;
      prices?: Array<{
        id: string;
        price: number | string;
        source?: string | null;
        last_seen?: string | null;
        is_active?: boolean | null;
        in_stock?: boolean | null;
      }> | null;
    }>).map((product) => ({
      ...product,
      prices: ((product.prices ?? []).map((listing) => ({
        id: listing.id,
        price: Number(listing.price),
        source: listing.source ?? null,
        last_seen: listing.last_seen ?? null,
        is_active: listing.is_active ?? null,
        in_stock: listing.in_stock ?? null,
      }))).filter(
        (listing) =>
          listing.is_active !== false &&
          listing.in_stock !== false &&
          Number.isFinite(listing.price) &&
          listing.price > 0
      ),
    }))
  );

  const products = mergedProducts
    .filter((product) => product.prices.length > 0)
    .slice(offset, offset + limit)
    .map((product) => ({
      ...product,
      min_price: getLowestActivePrice(product.prices),
      offer_count: getActiveOfferCount(product.prices),
      sources: getUniqueActiveSources(product.prices),
      freshest_seen_at: getFreshestSeenAt(product.prices),
    }));

  return NextResponse.json(
    { products },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
  );
}
