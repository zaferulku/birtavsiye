import { notFound } from "next/navigation";
import { cache } from "react";
import type { Metadata } from "next";
import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";
import ProductDetailShell from "../../components/urun/ProductDetailShell";
import type {
  PriceInsightsPayload,
  SimilarProduct,
  RecommendationTopic,
  VariantOption,
} from "../../components/urun/ProductDetailShell";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { getFreshestSeenAt, getLowestActivePrice } from "@/lib/listingSignals";
import { buildVariantFamilyKey, isSameVariantFamily } from "@/lib/productVariantFamily";
import type { InitialListing, StoreDefinition } from "../../components/urun/offerUtils";
import type { ReviewSummary } from "../../components/urun/CommunitySection";
import { cleanProductTitle } from "@/lib/productTitle";

// Ürün sayfası ISR — 30 dk cache. Önceden dynamic (her request DB'ye iniyordu);
// 14 .from() × bot crawl × bin ürün = DB egress kuotası tüketme nedeni.
export const revalidate = 1800;

/** XSS guard: JSON-LD tag içinde </script>, <!--, <![CDATA[ kırılmasını engelle */
function safeJsonLd(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, "\\u003c")
    .replace(/-->/g, "--\\u003e");
}

type ProductPageData = {
  id: string;
  slug: string;
  title: string;
  brand: string | null;
  model_family: string | null;
  variant_storage: string | null;
  variant_color: string | null;
  description: string | null;
  image_url: string | null;
  images: string[] | null;
  specs: Record<string, unknown> | null;
  category: {
    id: string;
    slug: string;
    name: string;
  } | null;
  listings: Array<{
    listing_id: string;
    source: string;
    price: number;
    source_url: string | null;
    affiliate_url: string | null;
    last_seen: string | null;
  }>;
  stores: Record<string, StoreDefinition>;
  reviewSummary: ReviewSummary;
  priceInsights: PriceInsightsPayload;
  cluster_product_ids: string[];
  variants: VariantOption[];
};

type ProductListingRow = {
  id: string;
  source: string;
  source_url: string | null;
  affiliate_url: string | null;
  price: number | string;
  last_seen: string | null;
  is_active?: boolean | null;
  in_stock?: boolean | null;
};

type ProductRow = {
  id: string;
  slug: string;
  title: string;
  brand: string | null;
  model_code: string | null;
  model_family: string | null;
  variant_storage: string | null;
  variant_color: string | null;
  description: string | null;
  image_url: string | null;
  images: string[] | null;
  specs: Record<string, unknown> | null;
  category_id: string | null;
  category: ProductPageData["category"];
  listings: ProductListingRow[];
};

type ReviewRow = {
  body: string;
  parent_id: string | null;
  rating: number | null;
};

type PriceHistoryRow = {
  listing_id: string;
  price: number | string;
  recorded_at: string;
};

type SimilarProductRow = {
  id: string;
  slug: string;
  title: string;
  image_url: string | null;
  variant_storage: string | null;
  variant_color: string | null;
  listings: Array<{
    price: number | string;
    last_seen?: string | null;
    is_active?: boolean | null;
    in_stock?: boolean | null;
  }>;
};

type VariantProductRow = {
  id: string;
  slug: string;
  title: string;
  image_url: string | null;
  model_family: string | null;
  variant_storage: string | null;
  variant_color: string | null;
  listings?: Array<{
    price: number | string;
    last_seen?: string | null;
    is_active?: boolean | null;
    in_stock?: boolean | null;
  }> | null;
};

function rowsToSimilar(rows: SimilarProductRow[]): SimilarProduct[] {
  return rows.map((row) => {
    return {
      id: row.id,
      slug: row.slug,
      title: cleanProductTitle(row.title),
      image_url: row.image_url,
      variant_storage: row.variant_storage,
      variant_color: row.variant_color,
      min_price: getLowestActivePrice(row.listings),
      freshest_seen_at: getFreshestSeenAt(row.listings),
    };
  });
}

async function loadSimilarProducts(
  brand: string | null,
  modelFamily: string | null,
  categoryId: string | null,
  excludeIds: string[]
): Promise<SimilarProduct[]> {
  const similarSelect =
    "id, slug, title, image_url, variant_storage, variant_color, listings!inner(price, last_seen, is_active, in_stock)";

  // 1st pass: same category + same brand + same model_family (true variants)
  if (brand && modelFamily && categoryId) {
    const { data } = await supabaseAdmin
      .from("products")
      .select(similarSelect)
      .eq("category_id", categoryId)
      .eq("brand", brand)
      .eq("model_family", modelFamily)
      .eq("is_active", true)
      .eq("listings.is_active", true)
      .limit(24);

    const rows = rowsToSimilar((data as unknown as SimilarProductRow[]) ?? []).filter(
      (row) => !excludeIds.includes(row.id)
    );
    if (rows.length >= 4) return rows;

    // 2nd pass: same category + same brand (any model_family)
    const { data: brandData } = await supabaseAdmin
      .from("products")
      .select(similarSelect)
      .eq("category_id", categoryId)
      .eq("brand", brand)
      .eq("is_active", true)
      .eq("listings.is_active", true)
      .limit(24);

    const brandRows = rowsToSimilar((brandData as unknown as SimilarProductRow[]) ?? []).filter(
      (row) => !excludeIds.includes(row.id)
    );
    const merged = [...rows];
    for (const r of brandRows) {
      if (!merged.some((m) => m.id === r.id)) merged.push(r);
      if (merged.length >= 12) break;
    }
    if (merged.length >= 4) return merged;

    // 3rd pass: same category (any brand)
    const { data: catData } = await supabaseAdmin
      .from("products")
      .select(similarSelect)
      .eq("category_id", categoryId)
      .eq("is_active", true)
      .eq("listings.is_active", true)
      .limit(24);

    const catRows = rowsToSimilar((catData as unknown as SimilarProductRow[]) ?? []).filter(
      (row) => !excludeIds.includes(row.id)
    );
    for (const r of catRows) {
      if (!merged.some((m) => m.id === r.id)) merged.push(r);
      if (merged.length >= 12) break;
    }
    return merged.slice(0, 12);
  }

  // Fallback: no category info — return empty rather than cross-category noise
  return [];
}

async function loadRecommendations(productIds: string[]): Promise<RecommendationTopic[]> {
  if (productIds.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from("topics")
    .select("id, title, body, user_name, votes, answer_count, created_at")
    .in("product_id", productIds)
    .order("created_at", { ascending: false })
    .limit(8);

  if (error || !data) return [];
  return data as RecommendationTopic[];
}

async function loadVariantOptions(
  brand: string | null,
  modelFamily: string | null,
  categoryId: string | null
): Promise<VariantOption[]> {
  if (!brand || !modelFamily || !categoryId) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("products")
    .select(
      "id, slug, title, image_url, model_family, variant_storage, variant_color, listings(price, last_seen, is_active, in_stock)"
    )
    .eq("brand", brand)
    .eq("model_family", modelFamily)
    .eq("category_id", categoryId)
    .eq("is_active", true)
    .limit(48);

  if (error || !data) {
    return [];
  }

  let variantRows = data as unknown as VariantProductRow[];
  const baseFamilyKey = buildVariantFamilyKey({ brand, modelFamily, title: `${brand ?? ""} ${modelFamily}` });

  if (variantRows.length <= 1) {
    const { data: fallbackRows, error: fallbackError } = await supabaseAdmin
      .from("products")
      .select(
        "id, slug, title, image_url, model_family, variant_storage, variant_color, listings(price, last_seen, is_active, in_stock)"
      )
      .eq("brand", brand)
      .eq("category_id", categoryId)
      .eq("is_active", true)
      .limit(160);

    if (!fallbackError && fallbackRows) {
      const mergedBySlug = new Map<string, VariantProductRow>();
      for (const row of [...variantRows, ...(fallbackRows as unknown as VariantProductRow[])]) {
        mergedBySlug.set(row.slug, row);
      }
      variantRows = Array.from(mergedBySlug.values());
    }
  }

  if (baseFamilyKey) {
    variantRows = variantRows.filter((row) =>
      isSameVariantFamily(
        { brand, modelFamily, title: `${brand ?? ""} ${modelFamily}` },
        { brand, modelFamily: row.model_family, title: row.title }
      )
    );
  }

  const bestByVariant = new Map<string, VariantOption>();

  for (const row of variantRows) {
    const listings = (row.listings ?? []).filter(
      (listing) =>
        listing.is_active !== false &&
        listing.in_stock !== false &&
        Number.isFinite(Number(listing.price)) &&
        Number(listing.price) > 0
    );
    const minPrice = getLowestActivePrice(listings);
    const freshestSeenAt = getFreshestSeenAt(listings);
    const key = `${row.variant_storage ?? ""}|${row.variant_color ?? ""}`;

    const candidate: VariantOption = {
      id: row.id,
      slug: row.slug,
      title: cleanProductTitle(row.title),
      image_url: row.image_url,
      variant_storage: row.variant_storage,
      variant_color: row.variant_color,
      min_price: minPrice,
      freshest_seen_at: freshestSeenAt,
    };

    const existing = bestByVariant.get(key);
    if (!existing) {
      bestByVariant.set(key, candidate);
      continue;
    }

    const existingPrice = existing.min_price ?? Number.POSITIVE_INFINITY;
    const candidatePrice = candidate.min_price ?? Number.POSITIVE_INFINITY;
    if (candidatePrice < existingPrice) {
      bestByVariant.set(key, candidate);
      continue;
    }

    if (
      candidatePrice === existingPrice &&
      (candidate.freshest_seen_at ?? "") > (existing.freshest_seen_at ?? "")
    ) {
      bestByVariant.set(key, candidate);
    }
  }

  return Array.from(bestByVariant.values()).sort((left, right) => {
    const leftStorage = left.variant_storage ?? "";
    const rightStorage = right.variant_storage ?? "";
    if (leftStorage !== rightStorage) return leftStorage.localeCompare(rightStorage, "tr");

    const leftColor = left.variant_color ?? "";
    const rightColor = right.variant_color ?? "";
    if (leftColor !== rightColor) return leftColor.localeCompare(rightColor, "tr");

    return left.title.localeCompare(right.title, "tr");
  });
}

const loadProduct = cache(async (slug: string): Promise<ProductPageData | null> => {
  const { data: product, error } = await supabaseAdmin
    .from("products")
    .select(`
      id, slug, title, brand, model_code, model_family, variant_storage, variant_color,
      description, image_url, images, specs,
      category_id,
      category:categories!inner(id, slug, name),
      listings(id, source, source_url, affiliate_url, price, last_seen, is_active, in_stock)
    `)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !product) return null;

  const productRow = product as unknown as ProductRow;
  const clusterRows = await loadExactClusterRows(productRow);
  const clusterProductIds = clusterRows.map((row) => row.id);
  const activeListings = dedupeListingsBySource(
    getRenderableListings(clusterRows.flatMap((row) => row.listings ?? []))
  );
  const sources = [...new Set(activeListings.map((listing) => listing.source))];
  const listingIds = activeListings.map((listing) => listing.id);
  const historySinceIso = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const priceHistoryPromise =
    listingIds.length > 0
      ? supabaseAdmin
          .from("price_history")
          .select("listing_id, price, recorded_at")
          .in("listing_id", listingIds)
          .gte("recorded_at", historySinceIso)
          .order("recorded_at", { ascending: true })
      : Promise.resolve({ data: [] as PriceHistoryRow[], error: null });

  const [{ data: storesData }, { data: reviewRows }, { data: historyRows }] = await Promise.all([
    supabaseAdmin
      .from("stores")
      .select("id, slug, name, logo_url")
      .in("slug", sources),
    supabaseAdmin
      .from("community_posts")
      .select("body, parent_id, rating")
      .in("product_id", clusterProductIds),
    priceHistoryPromise,
  ]);

  const stores: Record<string, StoreDefinition> = {};
  for (const store of storesData ?? []) {
    stores[store.slug] = store;
  }

  const reviewSummary = computeReviewSummary(reviewRows ?? []);
  const priceInsights = buildPriceInsights(
    activeListings,
    (historyRows as PriceHistoryRow[] | null) ?? [],
    stores
  );
  const variants = await loadVariantOptions(
    productRow.brand,
    productRow.model_family,
    productRow.category?.id ?? null
  );
  const cleanedTitle = cleanProductTitle(productRow.title);

  return {
    ...productRow,
    title: cleanedTitle,
    listings: activeListings.map((listing) => ({
      listing_id: listing.id,
      source: listing.source,
      price: Number(listing.price),
      source_url: listing.source_url ?? null,
      affiliate_url: listing.affiliate_url ?? null,
      last_seen: listing.last_seen ?? null,
    })),
    stores,
    reviewSummary,
    priceInsights,
    cluster_product_ids: clusterProductIds,
    variants,
  };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug);

  if (!product) {
    return { title: "Urun bulunamadi | birtavsiye" };
  }

  const minPrice = product.listings.length > 0
    ? Math.min(...product.listings.map((listing) => listing.price))
    : null;
  const priceFormatted = minPrice !== null
    ? new Intl.NumberFormat("tr-TR", {
        maximumFractionDigits: 0,
      }).format(minPrice)
    : null;

  const title = truncate(
    priceFormatted
      ? `${product.title} Fiyati | En Uygun ${priceFormatted} TL`
      : `${product.title} Ozellikleri ve Yorumlari | birtavsiye`,
    60
  );
  const description = truncate(
    priceFormatted
      ? `${product.title} icin magaza fiyatlarini, teknik ozellikleri ve kullanici yorumlarini inceleyin. En dusuk fiyat ${priceFormatted} TL.`
      : `${product.title} icin teknik ozellikleri, kullanici yorumlarini ve benzer urun onerilerini inceleyin.`,
    160
  );

  const image = product.image_url ?? product.images?.[0] ?? null;

  return {
    title,
    description,
    openGraph: {
      title: product.title,
      description,
      type: "website",
      locale: "tr_TR",
      siteName: "birtavsiye.net",
      ...(image ? { images: [image] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: product.title,
      description,
      ...(image ? { images: [image] } : {}),
    },
    alternates: {
      canonical: `/urun/${product.slug}`,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await loadProduct(slug);

  if (!product) {
    notFound();
  }

  const [similarProducts, recommendations] = await Promise.all([
    loadSimilarProducts(
      product.brand,
      product.model_family,
      product.category?.id ?? null,
      product.cluster_product_ids
    ),
    loadRecommendations(product.cluster_product_ids),
  ]);

  const minPrice = product.listings.length > 0
    ? Math.min(...product.listings.map((listing) => listing.price))
    : null;
  const maxPrice = product.listings.length > 0
    ? Math.max(...product.listings.map((listing) => listing.price))
    : null;
  const primaryImage = product.image_url ?? product.images?.[0] ?? null;

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    ...(primaryImage ? { image: product.images ?? [primaryImage] } : {}),
    ...(product.description ? { description: product.description } : {}),
    ...(product.brand
      ? {
          brand: { "@type": "Brand", name: product.brand },
        }
      : {}),
    ...(product.category ? { category: product.category.name } : {}),
    ...(product.model_family ? { model: product.model_family } : {}),
    sku: product.id,
    aggregateRating:
      product.reviewSummary.ratingCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: Number(product.reviewSummary.average.toFixed(1)),
            reviewCount: product.reviewSummary.ratingCount,
          }
        : undefined,
    offers:
      minPrice !== null && maxPrice !== null
        ? {
            "@type": "AggregateOffer",
            priceCurrency: "TRY",
            lowPrice: minPrice,
            highPrice: maxPrice,
            offerCount: product.listings.length,
            availability: "https://schema.org/InStock",
          }
        : undefined,
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Anasayfa",
        item: "https://birtavsiye.net/",
      },
      ...(product.category
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: product.category.name,
              item: `https://birtavsiye.net/anasayfa/${product.category.slug}`,
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: product.category ? 3 : 2,
        name: product.title,
        item: `https://birtavsiye.net/urun/${product.slug}`,
      },
    ],
  };

  const initialListings: InitialListing[] = product.listings.map((listing) => ({
    listing_id: listing.listing_id,
    source: listing.source,
    cached_price: listing.price,
    last_seen: listing.last_seen ?? null,
    fallback_url: listing.affiliate_url || listing.source_url || null,
  }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }}
      />

      <Header />

      <ProductDetailShell
        product={{
          id: product.id,
          slug: product.slug,
          title: product.title,
          brand: product.brand,
          model_family: product.model_family,
          variant_storage: product.variant_storage,
          variant_color: product.variant_color,
          description: product.description,
          image_url: product.image_url,
          images: product.images,
          specs: product.specs,
          category: product.category,
        }}
        stores={product.stores}
        initialListings={initialListings}
        initialReviewSummary={product.reviewSummary}
        similarProducts={similarProducts}
        recommendations={recommendations}
        priceInsights={product.priceInsights}
        variants={product.variants}
      />

      <Footer />
    </>
  );
}

function computeReviewSummary(rows: ReviewRow[]): ReviewSummary {
  const topLevelRows = rows.filter((row) => !row.parent_id);
  const ratingRows = topLevelRows.filter((row) => (row.rating ?? 0) > 0);
  const average =
    ratingRows.length > 0
      ? ratingRows.reduce((total, row) => total + (row.rating ?? 0), 0) / ratingRows.length
      : 0;

  const commentCount = topLevelRows.filter((row) => {
    const body = row.body?.trim().toLowerCase() ?? "";
    return !(body.includes("puan verildi") && body.length <= 40 && (row.rating ?? 0) > 0);
  }).length;

  return {
    average,
    ratingCount: ratingRows.length,
    commentCount,
  };
}

async function loadExactClusterRows(product: ProductRow): Promise<ProductRow[]> {
  if (!product.model_code && !product.model_family) {
    return [product];
  }

  let query = supabaseAdmin
    .from("products")
    .select(`
      id, slug, title, brand, model_code, model_family, variant_storage, variant_color,
      description, image_url, images, specs, category_id,
      category:categories(id, slug, name),
      listings(id, source, source_url, affiliate_url, price, last_seen, is_active, in_stock)
    `)
    .eq("is_active", true)
    .neq("id", product.id)
    .limit(24);

  if (product.model_code) {
    query = query.eq("model_code", product.model_code);
    if (product.brand) {
      query = query.eq("brand", product.brand);
    }
  } else {
    query = query.eq("model_family", product.model_family);
    if (product.brand) {
      query = query.eq("brand", product.brand);
    }
    if (product.category_id) {
      query = query.eq("category_id", product.category_id);
    }
  }

  const { data, error } = await query;
  if (error || !data) {
    return [product];
  }

  const siblings = (data as unknown as ProductRow[]).filter((candidate) =>
    isExactClusterMatch(product, candidate)
  );

  return [product, ...siblings];
}

function getRenderableListings(
  listings: ProductListingRow[] | null | undefined
): ProductListingRow[] {
  return (listings ?? []).filter((listing) => {
    const price = Number(listing.price);
    return (
      listing.is_active !== false &&
      listing.in_stock !== false &&
      Number.isFinite(price) &&
      price > 0
    );
  });
}

function dedupeListingsBySource(listings: ProductListingRow[]): ProductListingRow[] {
  const bestBySource = new Map<string, ProductListingRow>();

  for (const listing of listings) {
    const existing = bestBySource.get(listing.source);
    if (!existing || compareListingPriority(listing, existing) < 0) {
      bestBySource.set(listing.source, listing);
    }
  }

  return Array.from(bestBySource.values()).sort(compareListingPriority);
}

function compareListingPriority(left: ProductListingRow, right: ProductListingRow): number {
  const leftPrice = Number(left.price);
  const rightPrice = Number(right.price);
  const leftHasPrice = Number.isFinite(leftPrice) && leftPrice > 0;
  const rightHasPrice = Number.isFinite(rightPrice) && rightPrice > 0;
  const leftInStock = left.in_stock !== false;
  const rightInStock = right.in_stock !== false;

  if (leftInStock !== rightInStock) return leftInStock ? -1 : 1;
  if (leftHasPrice !== rightHasPrice) return leftHasPrice ? -1 : 1;
  if (leftHasPrice && rightHasPrice && leftPrice !== rightPrice) return leftPrice - rightPrice;

  const leftSeen = left.last_seen ? new Date(left.last_seen).getTime() : 0;
  const rightSeen = right.last_seen ? new Date(right.last_seen).getTime() : 0;
  if (leftSeen !== rightSeen) return rightSeen - leftSeen;

  const leftHasUrl = Boolean(left.affiliate_url || left.source_url);
  const rightHasUrl = Boolean(right.affiliate_url || right.source_url);
  if (leftHasUrl !== rightHasUrl) return leftHasUrl ? -1 : 1;

  return left.id.localeCompare(right.id);
}

function isExactClusterMatch(base: ProductRow, candidate: ProductRow): boolean {
  if (base.id === candidate.id) return true;

  if (
    base.category_id &&
    candidate.category_id &&
    base.category_id !== candidate.category_id
  ) {
    return false;
  }

  const baseBrand = normalizeIdentityPart(base.brand);
  const candidateBrand = normalizeIdentityPart(candidate.brand);
  if (baseBrand && candidateBrand && baseBrand !== candidateBrand) {
    return false;
  }

  const baseModelCode = normalizeIdentityPart(base.model_code);
  const candidateModelCode = normalizeIdentityPart(candidate.model_code);
  if (baseModelCode && candidateModelCode) {
    return baseModelCode === candidateModelCode;
  }

  const baseFamily = normalizeIdentityPart(base.model_family);
  const candidateFamily = normalizeIdentityPart(candidate.model_family);
  if (!baseFamily || !candidateFamily || baseFamily !== candidateFamily) {
    return false;
  }

  const baseStorage = normalizeIdentityPart(base.variant_storage);
  const candidateStorage = normalizeIdentityPart(candidate.variant_storage);
  const baseColor = normalizeIdentityPart(base.variant_color);
  const candidateColor = normalizeIdentityPart(candidate.variant_color);
  const hasVariantIdentity = Boolean(baseStorage || candidateStorage || baseColor || candidateColor);

  if (!hasVariantIdentity) {
    return false;
  }

  return baseStorage === candidateStorage && baseColor === candidateColor;
}

function normalizeIdentityPart(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0131/g, "i")
    .replace(/\u0130/g, "I")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function buildPriceInsights(
  listings: ProductListingRow[],
  historyRows: PriceHistoryRow[],
  stores: Record<string, StoreDefinition>
): PriceInsightsPayload {
  const listingById = new Map(
    listings.map((listing) => [listing.id, { source: listing.source }])
  );

  const currentPrices = listings
    .map((listing) => Number(listing.price))
    .filter((price) => Number.isFinite(price));

  const currentLowPrice =
    currentPrices.length > 0 ? Math.min(...currentPrices) : null;

  const history = historyRows
    .map((row) => {
      const listing = listingById.get(row.listing_id);
      const price = Number(row.price);
      if (!listing || !Number.isFinite(price)) return null;

      return {
        recorded_at: row.recorded_at,
        price,
        stores: {
          name: stores[listing.source]?.name ?? formatSourceName(listing.source),
        },
      };
    })
    .filter(
      (
        row
      ): row is {
        recorded_at: string;
        price: number;
        stores: { name: string };
      } => Boolean(row)
    );

  const dailyLowMap = new Map<string, number>();
  for (const row of history) {
    const dayKey = row.recorded_at.slice(0, 10);
    const currentValue = dailyLowMap.get(dayKey);
    if (currentValue === undefined || row.price < currentValue) {
      dailyLowMap.set(dayKey, row.price);
    }
  }

  if (currentLowPrice !== null) {
    const todayKey = new Date().toISOString().slice(0, 10);
    const existingToday = dailyLowMap.get(todayKey);
    if (existingToday === undefined || currentLowPrice < existingToday) {
      dailyLowMap.set(todayKey, currentLowPrice);
    }
  }

  const cutoff30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const cutoff90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const dailyLows = [...dailyLowMap.entries()].sort(([left], [right]) =>
    left.localeCompare(right)
  );
  const lows30 = dailyLows
    .filter(([date]) => date >= cutoff30)
    .map(([, price]) => price);
  const lows90 = dailyLows
    .filter(([date]) => date >= cutoff90)
    .map(([, price]) => price);

  const lowest30d = lows30.length > 0 ? Math.min(...lows30) : currentLowPrice;
  const average90d =
    lows90.length > 0
      ? lows90.reduce((sum, price) => sum + price, 0) / lows90.length
      : null;

  const vsLowest30dPct = toDeltaPercent(currentLowPrice, lowest30d);
  const vsAverage90dPct = toDeltaPercent(currentLowPrice, average90d);
  const verdict = buildPriceVerdict(
    currentLowPrice,
    lowest30d,
    average90d,
    vsLowest30dPct,
    vsAverage90dPct
  );

  return {
    history,
    currentLowPrice,
    lowest30d,
    average90d,
    vsLowest30dPct,
    vsAverage90dPct,
    verdictTitle: verdict.title,
    verdictBody: verdict.body,
    verdictTone: verdict.tone,
  };
}

function buildPriceVerdict(
  currentLowPrice: number | null,
  lowest30d: number | null,
  average90d: number | null,
  vsLowest30dPct: number | null,
  vsAverage90dPct: number | null
): {
  title: string;
  body: string;
  tone: "good" | "neutral" | "watch";
} {
  if (currentLowPrice === null) {
    return {
      title: "Teklif bekleniyor",
      body: "Bu urun icin aktif fiyat teklifi henuz gorunmuyor.",
      tone: "neutral",
    };
  }

  if (lowest30d === null && average90d === null) {
    return {
      title: "Gecmis yeni olusuyor",
      body: "Yeterli fiyat gecmisi birikmedigi icin simdilik bugunku en dusuk teklif takip edilmeli.",
      tone: "neutral",
    };
  }

  if (vsLowest30dPct !== null && vsLowest30dPct <= 2) {
    return {
      title: "Guclu fiyat seviyesi",
      body: "Guncel en dusuk fiyat son 30 gunun dip seviyesine cok yakin. Acil ihtiyac varsa guvenle takip edilebilecek bir bantta.",
      tone: "good",
    };
  }

  if (vsAverage90dPct !== null && vsAverage90dPct <= -5) {
    return {
      title: "Ortalamanin altinda",
      body: "Guncel teklif son 90 gun ortalamasinin belirgin altinda. Kampanya veya kupon detayi varsa firsat guclenebilir.",
      tone: "good",
    };
  }

  if (vsLowest30dPct !== null && vsLowest30dPct >= 12) {
    return {
      title: "Biraz yuksek gorunuyor",
      body: "Guncel fiyat son 30 gun dip seviyesinin belirgin ustunde. Aciliyet yoksa alarm kurup izlemek daha mantikli olabilir.",
      tone: "watch",
    };
  }

  if (vsAverage90dPct !== null && vsAverage90dPct >= 8) {
    return {
      title: "Takip etmeye deger",
      body: "Bu teklif kendi ortalamasina gore pahaliya yakin. Bir sonraki fiyat dususunu beklemek tasarruf saglayabilir.",
      tone: "watch",
    };
  }

  return {
    title: "Normal fiyat bandi",
    body: "Guncel teklif son donemin normal fiyat araliginda. Magaza guven sinyalleri ve kargo toplami ile birlikte karar vermek en dogrusu olur.",
    tone: "neutral",
  };
}

function toDeltaPercent(
  currentValue: number | null,
  referenceValue: number | null
): number | null {
  if (
    currentValue === null ||
    referenceValue === null ||
    !Number.isFinite(currentValue) ||
    !Number.isFinite(referenceValue) ||
    referenceValue <= 0
  ) {
    return null;
  }

  return ((currentValue - referenceValue) / referenceValue) * 100;
}

function formatSourceName(source: string): string {
  if (!source) return "Magaza";

  const predefined: Record<string, string> = {
    amazon: "Amazon TR",
    hepsiburada: "Hepsiburada",
    mediamarkt: "MediaMarkt",
    n11: "n11",
    pttavm: "PttAVM",
    trendyol: "Trendyol",
    vatan: "Vatan Bilgisayar",
  };

  if (predefined[source]) return predefined[source];

  return source.charAt(0).toUpperCase() + source.slice(1);
}
