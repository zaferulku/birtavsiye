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

type SearchProductRow = {
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
};

const ACCESSORY_CATEGORY_PATTERN =
  /telefon-kilifi|telefon-aksesuar|telefon-yedek-parca|ekran-koruyucu|sarj-kablo/i;

const ACCESSORY_QUERY_HINTS = new Set([
  "aksesuar",
  "kilif",
  "kılıf",
  "koruyucu",
  "yedek",
  "parca",
  "parça",
  "kablo",
  "sarj",
  "şarj",
  "case",
  "cover",
]);

function normalizeSearchText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0131/g, "i")
    .replace(/\u0130/g, "I")
    .toLowerCase()
    .trim();
}

function splitSearchTerms(query: string | null | undefined): string[] {
  return [...new Set(
    normalizeSearchText(query)
      .split(/\s+/)
      .map((part) => part.trim())
      .filter((part) => part.length >= 2)
  )].slice(0, 6);
}

function escapeIlikeTerm(term: string): string {
  return term.replace(/[%_]/g, "\\$&").slice(0, 100);
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

function hasAccessoryIntent(terms: string[]): boolean {
  return terms.some((term) => ACCESSORY_QUERY_HINTS.has(term));
}

function getProductSearchScore(
  product: SearchProductRow,
  category: SearchCategoryRow | undefined,
  terms: string[]
): number {
  if (terms.length === 0) return 0;

  const title = normalizeSearchText(product.title);
  const brand = normalizeSearchText(product.brand);
  const modelFamily = normalizeSearchText(product.model_family);
  const modelCode = normalizeSearchText(product.model_code);
  const storage = normalizeSearchText(product.variant_storage);
  const color = normalizeSearchText(product.variant_color);
  const categoryName = normalizeSearchText(category?.name);
  const categorySlug = normalizeSearchText(category?.slug);
  const accessoryIntent = hasAccessoryIntent(terms);

  let score = 0;

  for (const term of terms) {
    let matched = false;

    if (title.includes(term)) {
      score += 16;
      matched = true;
    }
    if (modelFamily.includes(term)) {
      score += 14;
      matched = true;
    }
    if (brand.includes(term)) {
      score += 10;
      matched = true;
    }
    if (modelCode.includes(term)) {
      score += 10;
      matched = true;
    }
    if (storage.includes(term) || color.includes(term)) {
      score += 6;
      matched = true;
    }
    if (categoryName.includes(term) || categorySlug.includes(term)) {
      score += 9;
      matched = true;
    }

    if (!matched) {
      return -1;
    }

    if (term === "telefon" && categorySlug === "akilli-telefon") {
      score += 22;
    }

    if (
      term === "telefon" &&
      ACCESSORY_CATEGORY_PATTERN.test(categorySlug) &&
      !accessoryIntent
    ) {
      score -= 18;
    }
  }

  if (product.prices && product.prices.length > 0) score += Math.min(product.prices.length * 2, 8);
  if (product.image_url) score += 2;

  return score;
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
    const searchTerms = splitSearchTerms(q);
    const textClauses = searchTerms.flatMap((term) => {
      const safeTerm = escapeIlikeTerm(term);
      return [
        `title.ilike.%${safeTerm}%`,
        `brand.ilike.%${safeTerm}%`,
        `model_family.ilike.%${safeTerm}%`,
        `model_code.ilike.%${safeTerm}%`,
        `variant_storage.ilike.%${safeTerm}%`,
        `variant_color.ilike.%${safeTerm}%`,
      ];
    });

    let textQuery = supabaseAdmin
      .from("products")
      .select(selectFields)
      .or(textClauses.join(","))
      .range(0, fetchLimit - 1)
      .order("created_at", { ascending: false });

    if (categoryIds) textQuery = textQuery.in("category_id", categoryIds);
    if (brand) textQuery = textQuery.ilike("brand", brand);

    const matchedCategoryIds = [
      ...new Set(searchTerms.flatMap((term) => getMatchedCategoryIds(categories, term))),
    ];
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

    const categoryMap = new Map(categories.map((category) => [category.id, category]));
    data = [...uniqueRows.values()]
      .map((product) => ({
        product,
        score: getProductSearchScore(product, categoryMap.get(product.category_id ?? ""), searchTerms),
      }))
      .filter((entry) => entry.score >= 0)
      .sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score;
        return (right.product.created_at ?? "").localeCompare(left.product.created_at ?? "");
      })
      .map((entry) => entry.product);
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
