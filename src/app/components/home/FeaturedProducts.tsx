import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseServer";
import {
  formatFreshnessLabel,
  getActiveOfferCount,
  getFreshestSeenAt,
  getLowestActivePrice,
} from "@/lib/listingSignals";
import { mergeClusteredProducts } from "@/lib/productCluster";
import { cleanProductTitle } from "@/lib/productTitle";
import { shouldHideDiscoveryProduct } from "@/lib/productDiscovery";

type Price = {
  id: string;
  price: number;
  source: string | null;
  last_seen: string | null;
  is_active?: boolean | null;
  in_stock?: boolean | null;
};
type Product = {
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
  listings: Price[];
};

const SECTIONS = [
  { key: "drops", label: "Fiyati Dusenler", icon: "D", accent: "#E8460A" },
  { key: "weekly", label: "Son Haftanin En Ucuzlari", icon: "H", accent: "#059669" },
  { key: "multi", label: "Cok Magazali Firsatlar", icon: "M", accent: "#2563EB" },
  { key: "fresh", label: "En Guncel Teklifler", icon: "G", accent: "#D97706" },
] as const;

type ProductHistoryRow = {
  listing_id: string;
  price: number | string;
  recorded_at: string;
};

type ProductMetrics = {
  weeklyLow: number | null;
  weeklyHigh: number | null;
  dropPct: number | null;
  freshnessRank: number;
};

// Build sırasında Supabase 5xx/timeout durumunda home/urunler prerender'ı
// düşmesin diye query'i timeout ve try/catch ile sarmaladık. ISR (revalidate=300)
// runtime'da boş gelen sayfayı 5dk içinde yenileyecek.
const FEATURED_QUERY_TIMEOUT_MS = 25_000;

async function withTimeout<T>(thenable: PromiseLike<T>, label: string): Promise<T | null> {
  return await Promise.race([
    Promise.resolve(thenable),
    new Promise<null>((resolve) =>
      setTimeout(() => {
        console.warn(`[FeaturedProducts] ${label} timed out after ${FEATURED_QUERY_TIMEOUT_MS}ms`);
        resolve(null);
      }, FEATURED_QUERY_TIMEOUT_MS),
    ),
  ]);
}

async function loadProducts(): Promise<Product[]> {
  type ProductsRes = {
    data: Array<{
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
      listings?: Array<{
        id: string;
        price: number | string;
        source?: string | null;
        last_seen?: string | null;
        is_active?: boolean | null;
        in_stock?: boolean | null;
      }> | null;
    }> | null;
    error: { message: string } | null;
  };

  let res: ProductsRes | null = null;
  try {
    res = await withTimeout(
      supabaseAdmin
        .from("products")
        .select(
          "id, title, slug, brand, image_url, category_id, model_code, model_family, variant_storage, variant_color, created_at, listings:listings!inner(id, price, source, last_seen, is_active, in_stock)"
        )
        .eq("is_active", true)
        .eq("listings.is_active", true)
        .order("created_at", { ascending: false })
        .limit(192) as PromiseLike<ProductsRes>,
      "products",
    );
  } catch (err) {
    console.error("[FeaturedProducts] product load threw:", err instanceof Error ? err.message : err);
    return [];
  }

  if (!res) return [];
  const { data, error } = res;

  if (error) {
    console.error("[FeaturedProducts] product load failed:", error.message);
    return [];
  }

  const mappedProducts = ((data ?? []) as Array<{
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
      listings?: Array<{
        id: string;
        price: number | string;
        source?: string | null;
        last_seen?: string | null;
        is_active?: boolean | null;
        in_stock?: boolean | null;
    }> | null;
  }>)
    .map((product) => ({
      id: product.id,
      title: product.title,
      slug: product.slug,
      brand: product.brand,
      image_url: product.image_url,
      category_id: product.category_id,
      model_code: product.model_code,
      model_family: product.model_family,
      variant_storage: product.variant_storage,
      variant_color: product.variant_color,
      created_at: product.created_at,
      listings: ((product.listings ?? []).map((listing) => ({
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
    .filter((product) => product.listings.length > 0);

  return mergeClusteredProducts(mappedProducts).filter(
    (product) => product.listings.length > 0 && !shouldHideDiscoveryProduct(product)
  );
}

function getLowestPrice(product: Product): number {
  return getLowestActivePrice(product.listings) ?? Infinity;
}

async function buildSections(products: Product[]) {
  const metrics = await loadProductMetrics(products);

  const drops = [...products]
    .filter((product) => (metrics.get(product.id)?.dropPct ?? 0) > 0)
    .sort((left, right) => {
      const leftDrop = metrics.get(left.id)?.dropPct ?? 0;
      const rightDrop = metrics.get(right.id)?.dropPct ?? 0;
      if (rightDrop !== leftDrop) return rightDrop - leftDrop;
      return getLowestPrice(left) - getLowestPrice(right);
    })
    .slice(0, 8);

  const weekly = [...products]
    .sort((left, right) => {
      const leftWeekly = metrics.get(left.id)?.weeklyLow ?? getLowestPrice(left);
      const rightWeekly = metrics.get(right.id)?.weeklyLow ?? getLowestPrice(right);
      if (leftWeekly !== rightWeekly) return leftWeekly - rightWeekly;
      return getLowestPrice(left) - getLowestPrice(right);
    })
    .slice(0, 8);

  const multi = [...products]
    .sort((left, right) => {
      const offerDiff = getActiveOfferCount(right.listings) - getActiveOfferCount(left.listings);
      if (offerDiff !== 0) return offerDiff;
      return getLowestPrice(left) - getLowestPrice(right);
    })
    .slice(0, 8);

  const fresh = [...products]
    .sort((left, right) => {
      const freshnessDiff = (metrics.get(right.id)?.freshnessRank ?? 0) - (metrics.get(left.id)?.freshnessRank ?? 0);
      if (freshnessDiff !== 0) return freshnessDiff;
      return getLowestPrice(left) - getLowestPrice(right);
    })
    .slice(0, 8);

  return {
    drops: drops.length > 0 ? drops : weekly,
    weekly,
    multi,
    fresh,
  };
}

function ProductCard({ product }: { product: Product }) {
  const lowestPrice = getLowestPrice(product);
  const freshestSeenAt = getFreshestSeenAt(product.listings);

  return (
    <Link href={`/urun/${product.slug}`}>
      <div className="flex-shrink-0 w-28 sm:w-36 md:w-44 bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md hover:border-gray-200 transition-all group cursor-pointer">
        <div className="w-full aspect-square bg-white overflow-hidden">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={product.title}
              className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">
              ?
            </div>
          )}
        </div>
        <div className="p-2 sm:p-3">
          <div className="text-[9px] sm:text-[10px] font-bold text-[#E8460A] uppercase tracking-wide mb-0.5 truncate">
            {product.brand || "Markasiz"}
          </div>
          <div className="text-[10px] sm:text-xs font-medium text-gray-800 line-clamp-2 leading-snug mb-1 sm:mb-2">
            {cleanProductTitle(product.title)}
          </div>
          <div className="text-xs sm:text-sm font-bold text-gray-900">
            {lowestPrice.toLocaleString("tr-TR")}
            <span className="text-[10px] font-normal text-gray-400"> TL</span>
          </div>
          <div className="mt-1 text-[10px] text-gray-400">
            Son fiyat: {formatFreshnessLabel(freshestSeenAt)}
          </div>
        </div>
      </div>
    </Link>
  );
}

function Section({
  label,
  icon,
  accent,
  products,
}: {
  label: string;
  icon: string;
  accent: string;
  products: Product[];
}) {
  if (products.length === 0) return null;

  return (
    <div className="mb-4 sm:mb-6">
      <div className="flex items-center justify-between px-2 sm:px-5 mb-2 sm:mb-3">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white"
            style={{ background: accent }}
          >
            {icon}
          </span>
          <span className="font-bold text-sm text-gray-900">{label}</span>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
        </div>
        <Link href="/ara?q=" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
          Tumunu gor →
        </Link>
      </div>
      <div className="flex gap-2 sm:gap-3 overflow-x-auto px-2 sm:px-5 pb-1" style={{ scrollbarWidth: "none" }}>
        {products.map((product) => (
          <ProductCard key={`${label}-${product.id}`} product={product} />
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="px-5 py-10">
      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center">
        <div className="text-sm font-semibold text-gray-700">Henuz gosterilecek aktif urun yok</div>
        <div className="mt-2 text-xs text-gray-500">
          Yeni eklenen urunler aktif listing aldiginda burada gorunecek.
          Fiyat hareketi ve aktif teklif geldiginde burada firsat bloklari gorunecek.
        </div>
      </div>
    </div>
  );
}

export default async function FeaturedProducts() {
  const products = await loadProducts();

  if (products.length === 0) {
    return <EmptyState />;
  }

  const sections = await buildSections(products);

  return (
    <div className="py-3 sm:py-5">
      <Section
        label={SECTIONS[0].label}
        icon={SECTIONS[0].icon}
        accent={SECTIONS[0].accent}
        products={sections.drops}
      />
      <Section
        label={SECTIONS[1].label}
        icon={SECTIONS[1].icon}
        accent={SECTIONS[1].accent}
        products={sections.weekly}
      />
      <Section
        label={SECTIONS[2].label}
        icon={SECTIONS[2].icon}
        accent={SECTIONS[2].accent}
        products={sections.multi}
      />
      <Section
        label={SECTIONS[3].label}
        icon={SECTIONS[3].icon}
        accent={SECTIONS[3].accent}
        products={sections.fresh}
      />
    </div>
  );
}

async function loadProductMetrics(products: Product[]): Promise<Map<string, ProductMetrics>> {
  const listingIds = products.flatMap((product) => product.listings.map((listing) => listing.id));
  const historyMap = new Map<string, ProductHistoryRow[]>();

  if (listingIds.length > 0) {
    const weekAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    type HistoryRes = { data: ProductHistoryRow[] | null };
    let historyRes: HistoryRes | null = null;
    try {
      historyRes = await withTimeout(
        supabaseAdmin
          .from("price_history")
          .select("listing_id, price, recorded_at")
          .in("listing_id", listingIds)
          .gte("recorded_at", weekAgoIso)
          .order("recorded_at", { ascending: true }) as PromiseLike<HistoryRes>,
        "price_history",
      );
    } catch (err) {
      console.error("[FeaturedProducts] price_history load threw:", err instanceof Error ? err.message : err);
      historyRes = null;
    }

    for (const row of (historyRes?.data ?? []) as ProductHistoryRow[]) {
      const existing = historyMap.get(row.listing_id) ?? [];
      existing.push(row);
      historyMap.set(row.listing_id, existing);
    }
  }

  const metrics = new Map<string, ProductMetrics>();

  for (const product of products) {
    const currentLow = getLowestPrice(product);
    const weeklyPrices = product.listings
      .flatMap((listing) => historyMap.get(listing.id) ?? [])
      .map((row) => Number(row.price))
      .filter((price) => Number.isFinite(price) && price > 0);

    const weeklyLow =
      weeklyPrices.length > 0 ? Math.min(...weeklyPrices, currentLow) : Number.isFinite(currentLow) ? currentLow : null;
    const weeklyHigh =
      weeklyPrices.length > 0 ? Math.max(...weeklyPrices, currentLow) : Number.isFinite(currentLow) ? currentLow : null;
    const dropPct =
      weeklyHigh && Number.isFinite(currentLow) && weeklyHigh > currentLow
        ? ((weeklyHigh - currentLow) / weeklyHigh) * 100
        : null;

    metrics.set(product.id, {
      weeklyLow,
      weeklyHigh,
      dropPct,
      freshnessRank: freshnessScore(getFreshestSeenAt(product.listings)),
    });
  }

  return metrics;
}

function freshnessScore(value: string | null): number {
  if (!value) return 0;
  const diffHours = (Date.now() - new Date(value).getTime()) / (1000 * 60 * 60);
  if (diffHours <= 6) return 4;
  if (diffHours <= 24) return 3;
  if (diffHours <= 72) return 2;
  if (diffHours <= 168) return 1;
  return 0;
}
