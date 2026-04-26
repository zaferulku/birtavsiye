import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseServer";
import {
  formatFreshnessLabel,
  getActiveOfferCount,
  getActiveListings,
  getFreshestSeenAt,
  getLowestActivePrice,
} from "@/lib/listingSignals";

type Price = { price: number; source?: string | null; last_seen?: string | null };
type Product = {
  id: string;
  title: string;
  slug: string;
  brand: string | null;
  image_url: string | null;
  listings: Price[];
};

const SECTIONS = [
  { key: "latest", label: "Yeni Eklenen Urunler", icon: "N", accent: "#E8460A" },
  { key: "value", label: "En Avantajli Urunler", icon: "F", accent: "#059669" },
  { key: "picked", label: "One Cikan Secimler", icon: "O", accent: "#2563EB" },
  { key: "popular", label: "En Fazla Fiyatli Urunler", icon: "P", accent: "#D97706" },
] as const;

async function loadProducts(): Promise<Product[]> {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select(
      "id, title, slug, brand, image_url, listings:listings!inner(price, source, last_seen, is_active, in_stock)"
    )
    .eq("is_active", true)
    .eq("listings.is_active", true)
    .order("created_at", { ascending: false })
    .limit(128);

  if (error) {
    console.error("[FeaturedProducts] product load failed:", error.message);
    return [];
  }

  return ((data ?? []) as Array<{
    id: string;
    title: string;
    slug: string;
    brand: string | null;
    image_url: string | null;
      listings?: Array<{
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
      listings: getActiveListings(product.listings).map((listing) => ({
        price: listing.price,
        source: listing.source,
        last_seen: listing.last_seen,
      }))
        .filter((listing) => Number.isFinite(listing.price) && listing.price > 0),
    }))
    .filter((product) => product.listings.length > 0);
}

function getLowestPrice(product: Product): number {
  return getLowestActivePrice(product.listings) ?? Infinity;
}

function buildSections(products: Product[]) {
  const latest = products.slice(0, 8);
  const value = [...products].sort((a, b) => getLowestPrice(a) - getLowestPrice(b)).slice(0, 8);
  const popular = [...products]
    .sort((a, b) => getActiveOfferCount(b.listings) - getActiveOfferCount(a.listings))
    .slice(0, 8);
  const picked = products.slice(8, 16);

  return {
    latest,
    value,
    picked,
    popular,
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
            {product.title}
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

  const sections = buildSections(products);

  return (
    <div className="py-3 sm:py-5">
      <Section
        label={SECTIONS[0].label}
        icon={SECTIONS[0].icon}
        accent={SECTIONS[0].accent}
        products={sections.latest}
      />
      <Section
        label={SECTIONS[1].label}
        icon={SECTIONS[1].icon}
        accent={SECTIONS[1].accent}
        products={sections.value}
      />
      <Section
        label={SECTIONS[2].label}
        icon={SECTIONS[2].icon}
        accent={SECTIONS[2].accent}
        products={sections.picked}
      />
      <Section
        label={SECTIONS[3].label}
        icon={SECTIONS[3].icon}
        accent={SECTIONS[3].accent}
        products={sections.popular}
      />
    </div>
  );
}
