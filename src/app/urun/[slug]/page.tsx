import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";
import ProductDetailShell from "../../components/urun/ProductDetailShell";
import type {
  SimilarProduct,
  RecommendationTopic,
} from "../../components/urun/ProductDetailShell";
import { supabaseAdmin } from "@/lib/supabaseServer";
import type { InitialListing, StoreDefinition } from "../../components/urun/offerUtils";
import type { ReviewSummary } from "../../components/urun/CommunitySection";

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
  }>;
  stores: Record<string, StoreDefinition>;
  reviewSummary: ReviewSummary;
};

type ProductListingRow = {
  id: string;
  source: string;
  source_url: string | null;
  affiliate_url: string | null;
  price: number | string;
};

type ProductRow = {
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
  category: ProductPageData["category"];
  listings: ProductListingRow[];
};

type ReviewRow = {
  body: string;
  parent_id: string | null;
  rating: number | null;
};

type SimilarProductRow = {
  id: string;
  slug: string;
  title: string;
  image_url: string | null;
  variant_storage: string | null;
  variant_color: string | null;
  listings: Array<{ price: number | string; is_active: boolean }>;
};

function rowsToSimilar(rows: SimilarProductRow[]): SimilarProduct[] {
  return rows.map((row) => {
    const prices = (row.listings ?? [])
      .map((l) => Number(l.price))
      .filter((n) => Number.isFinite(n));
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      image_url: row.image_url,
      variant_storage: row.variant_storage,
      variant_color: row.variant_color,
      min_price: prices.length > 0 ? Math.min(...prices) : null,
    };
  });
}

async function loadSimilarProducts(
  brand: string | null,
  modelFamily: string | null,
  categoryId: string | null,
  excludeId: string
): Promise<SimilarProduct[]> {
  const similarSelect =
    "id, slug, title, image_url, variant_storage, variant_color, listings!inner(price, is_active)";

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
      .neq("id", excludeId)
      .limit(12);

    const rows = rowsToSimilar((data as unknown as SimilarProductRow[]) ?? []);
    if (rows.length >= 4) return rows;

    // 2nd pass: same category + same brand (any model_family)
    const { data: brandData } = await supabaseAdmin
      .from("products")
      .select(similarSelect)
      .eq("category_id", categoryId)
      .eq("brand", brand)
      .eq("is_active", true)
      .eq("listings.is_active", true)
      .neq("id", excludeId)
      .limit(12);

    const brandRows = rowsToSimilar((brandData as unknown as SimilarProductRow[]) ?? []);
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
      .neq("id", excludeId)
      .limit(12);

    const catRows = rowsToSimilar((catData as unknown as SimilarProductRow[]) ?? []);
    for (const r of catRows) {
      if (!merged.some((m) => m.id === r.id)) merged.push(r);
      if (merged.length >= 12) break;
    }
    return merged;
  }

  // Fallback: no category info — return empty rather than cross-category noise
  return [];
}

async function loadRecommendations(productId: string): Promise<RecommendationTopic[]> {
  const { data, error } = await supabaseAdmin
    .from("topics")
    .select("id, title, body, user_name, votes, answer_count, created_at")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(8);

  if (error || !data) return [];
  return data as RecommendationTopic[];
}

async function loadProduct(slug: string): Promise<ProductPageData | null> {
  const { data: product, error } = await supabaseAdmin
    .from("products")
    .select(`
      id, slug, title, brand, model_family, variant_storage, variant_color,
      description, image_url, images, specs,
      category:categories!inner(id, slug, name),
      listings!inner(id, source, source_url, affiliate_url, price, is_active)
    `)
    .eq("slug", slug)
    .eq("is_active", true)
    .eq("listings.is_active", true)
    .maybeSingle();

  if (error || !product) return null;

  const productRow = product as unknown as ProductRow;
  const sources = [...new Set(productRow.listings.map((listing) => listing.source))];

  const [{ data: storesData }, { data: reviewRows }] = await Promise.all([
    supabaseAdmin
      .from("stores")
      .select("id, slug, name, logo_url")
      .in("slug", sources),
    supabaseAdmin
      .from("community_posts")
      .select("body, parent_id, rating")
      .eq("product_id", productRow.id),
  ]);

  const stores: Record<string, StoreDefinition> = {};
  for (const store of storesData ?? []) {
    stores[store.slug] = store;
  }

  const reviewSummary = computeReviewSummary(reviewRows ?? []);

  return {
    ...productRow,
    listings: productRow.listings.map((listing) => ({
      listing_id: listing.id,
      source: listing.source,
      price: Number(listing.price),
      source_url: listing.source_url ?? null,
      affiliate_url: listing.affiliate_url ?? null,
    })),
    stores,
    reviewSummary,
  };
}

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

  const minPrice = Math.min(...product.listings.map((listing) => listing.price));
  const priceFormatted = new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 0,
  }).format(minPrice);

  const title = truncate(`${product.title} Fiyati | En Uygun ${priceFormatted} TL`, 60);
  const description = truncate(
    `${product.title} icin magaza fiyatlarini, teknik ozellikleri ve kullanici yorumlarini inceleyin. En dusuk fiyat ${priceFormatted} TL.`,
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
    loadSimilarProducts(product.brand, product.model_family, product.category?.id ?? null, product.id),
    loadRecommendations(product.id),
  ]);

  const minPrice = Math.min(...product.listings.map((listing) => listing.price));
  const maxPrice = Math.max(...product.listings.map((listing) => listing.price));
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
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "TRY",
      lowPrice: minPrice,
      highPrice: maxPrice,
      offerCount: product.listings.length,
      availability: "https://schema.org/InStock",
    },
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
              item: `https://birtavsiye.net/kategori/${product.category.slug}`,
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
    fallback_url: listing.affiliate_url || listing.source_url || null,
  }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
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

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}
