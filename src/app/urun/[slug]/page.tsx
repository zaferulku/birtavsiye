/**
 * Product detail page: /urun/[slug]
 * SSR with cached listings + client-side SSE hydration via LivePriceComparison.
 */

import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import { LivePriceComparison } from "@/components/LivePriceComparison";
import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";

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
  specs: Record<string, any> | null;
  category: {
    id: string;
    slug: string;
    name: string;
  } | null;
  listings: Array<{
    listing_id: string;
    source: string;
    price: number;
  }>;
  stores: Record<string, {
    id: string;
    slug: string;
    name: string;
    logo_url: string | null;
  }>;
};

async function loadProduct(slug: string): Promise<ProductPageData | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: product, error } = await supabase
    .from("products")
    .select(`
      id, slug, title, brand, model_family, variant_storage, variant_color,
      description, image_url, images, specs,
      category:categories!inner(id, slug, name),
      listings!inner(id, source, source_product_id, price, is_active, store_id)
    `)
    .eq("slug", slug)
    .eq("is_active", true)
    .eq("listings.is_active", true)
    .maybeSingle();

  if (error || !product) return null;

  const sources = [...new Set((product as any).listings.map((l: any) => l.source))];
  const { data: storesData } = await supabase
    .from("stores")
    .select("id, slug, name, logo_url")
    .in("slug", sources);

  const stores: Record<string, any> = {};
  for (const s of storesData ?? []) {
    stores[s.slug] = s;
  }

  return {
    ...(product as any),
    listings: (product as any).listings.map((l: any) => ({
      listing_id: l.id,
      source: l.source,
      price: Number(l.price),
    })),
    stores,
  } as ProductPageData;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug);

  if (!product) {
    return { title: "Ürün bulunamadı — birtavsiye" };
  }

  const minPrice = Math.min(...product.listings.map((l) => l.price));
  const priceFormatted = new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 0,
  }).format(minPrice);

  const title = truncate(
    `${product.title} Fiyatı | En Ucuz ${priceFormatted} TL — birtavsiye`,
    60
  );

  const description = truncate(
    `${product.title} için en uygun fiyatları ${product.listings.length}+ mağazada karşılaştır. ${priceFormatted} TL'den başlayan fiyatlarla.`,
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
      ...(image && { images: [image] }),
    },
    twitter: {
      card: "summary_large_image",
      title: product.title,
      description,
      ...(image && { images: [image] }),
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

  const minPrice = Math.min(...product.listings.map((l) => l.price));
  const maxPrice = Math.max(...product.listings.map((l) => l.price));
  const primaryImage = product.image_url ?? product.images?.[0] ?? null;

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    ...(primaryImage && { image: product.images ?? [primaryImage] }),
    ...(product.description && { description: product.description }),
    ...(product.brand && {
      brand: { "@type": "Brand", name: product.brand },
    }),
    ...(product.category && { category: product.category.name }),
    ...(product.model_family && { model: product.model_family }),
    sku: product.id,
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

  const initialListings = product.listings.map((l) => ({
    listing_id: l.listing_id,
    source: l.source,
    cached_price: l.price,
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

      <article className="product-page">
        <nav className="breadcrumb" aria-label="Navigasyon">
          <a href="/">Anasayfa</a>
          {product.category && (
            <>
              <span aria-hidden="true"> › </span>
              <a href={`/kategori/${product.category.slug}`}>{product.category.name}</a>
            </>
          )}
          <span aria-hidden="true"> › </span>
          <span>{product.title}</span>
        </nav>

        <div className="product-header">
          <div className="product-gallery">
            {primaryImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={primaryImage}
                alt={product.title}
                className="product-primary-image"
              />
            ) : (
              <div className="product-image-placeholder" aria-hidden="true">
                {product.category?.name?.charAt(0) ?? "?"}
              </div>
            )}
          </div>

          <div className="product-summary">
            <h1 className="product-title">{product.title}</h1>
            {product.brand && <p className="product-brand">{product.brand}</p>}

            <div className="product-price-summary">
              <span className="product-price-label">En düşük fiyat</span>
              <span className="product-price-value">
                {new Intl.NumberFormat("tr-TR", {
                  style: "currency",
                  currency: "TRY",
                  minimumFractionDigits: 2,
                }).format(minPrice)}
              </span>
              <span className="product-price-count">
                {product.listings.length} mağaza
              </span>
            </div>

            {product.description && (
              <p className="product-description">{product.description}</p>
            )}
          </div>
        </div>

        <LivePriceComparison
          productId={product.id}
          productTitle={product.title}
          stores={product.stores}
          initialListings={initialListings}
        />

        {product.specs && Object.keys(product.specs).length > 0 && (
          <section className="product-specs">
            <h2>Özellikler</h2>
            <SpecsTable specs={product.specs} />
          </section>
        )}
      </article>

      <Footer />

      <style>{PRODUCT_PAGE_STYLES}</style>
    </>
  );
}

function SpecsTable({ specs }: { specs: Record<string, any> }) {
  const rows = flattenSpecs(specs);
  if (rows.length === 0) return null;

  return (
    <table className="specs-table">
      <tbody>
        {rows.map(({ key, value }) => (
          <tr key={key}>
            <th scope="row">{humanizeKey(key)}</th>
            <td>{formatSpecValue(value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function flattenSpecs(
  obj: Record<string, any>,
  prefix = ""
): Array<{ key: string; value: any }> {
  const result: Array<{ key: string; value: any }> = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "object" && !Array.isArray(v)) {
      result.push(...flattenSpecs(v, fullKey));
    } else {
      result.push({ key: fullKey, value: v });
    }
  }
  return result;
}

function humanizeKey(key: string): string {
  const lastSegment = key.split(".").pop() ?? key;
  return lastSegment
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatSpecValue(v: any): string {
  if (typeof v === "boolean") return v ? "Var" : "Yok";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

const PRODUCT_PAGE_STYLES = `
  .product-page { max-width: 1200px; margin: 0 auto; padding: 20px 16px; display: flex; flex-direction: column; gap: 24px; }
  .breadcrumb { font-size: 0.875rem; color: var(--text-muted, #6b7280); }
  .breadcrumb a { color: var(--text-muted, #6b7280); text-decoration: none; }
  .breadcrumb a:hover { color: var(--text, #111); text-decoration: underline; }
  .product-header { display: grid; grid-template-columns: minmax(280px, 1fr) 2fr; gap: 32px; }
  @media (max-width: 768px) { .product-header { grid-template-columns: 1fr; gap: 20px; } }
  .product-gallery { display: flex; justify-content: center; align-items: flex-start; }
  .product-primary-image { width: 100%; max-width: 400px; aspect-ratio: 1; object-fit: contain; background: #fff; border: 1px solid var(--border, #e5e7eb); border-radius: 12px; padding: 16px; }
  .product-image-placeholder { width: 100%; max-width: 400px; aspect-ratio: 1; background: var(--surface-subtle, #f9fafb); border: 1px solid var(--border, #e5e7eb); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 4rem; color: var(--text-muted, #9ca3af); font-weight: 700; }
  .product-summary { display: flex; flex-direction: column; gap: 16px; }
  .product-title { margin: 0; font-size: 1.625rem; font-weight: 700; color: var(--text, #111); line-height: 1.3; }
  .product-brand { margin: 0; font-size: 0.9375rem; color: var(--text-muted, #6b7280); }
  .product-price-summary { display: flex; flex-direction: column; gap: 2px; padding: 16px; background: var(--accent-soft, #fef2f2); border-radius: 8px; align-self: flex-start; }
  .product-price-label { font-size: 0.75rem; color: var(--text-muted, #6b7280); text-transform: uppercase; letter-spacing: 0.05em; }
  .product-price-value { font-size: 1.75rem; font-weight: 700; color: var(--accent, #dc2626); line-height: 1.1; }
  .product-price-count { font-size: 0.8125rem; color: var(--text-muted, #6b7280); }
  .product-description { margin: 0; font-size: 0.9375rem; line-height: 1.6; color: var(--text-subtle, #374151); }
  .product-specs { padding: 20px; background: var(--surface, #fff); border: 1px solid var(--border, #e5e7eb); border-radius: 12px; }
  .product-specs h2 { margin: 0 0 12px; font-size: 1.125rem; font-weight: 600; }
  .specs-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  .specs-table th, .specs-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--border-subtle, #f3f4f6); }
  .specs-table th { font-weight: 500; color: var(--text-muted, #6b7280); width: 40%; }
  .specs-table td { color: var(--text, #111); }
`;
