"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLivePrices } from "@/lib/scrapers/live/useLivePrices";
import { LivePriceComparison } from "@/components/LivePriceComparison";
import CommunitySection, { type ReviewSummary } from "./CommunitySection";
import ProductBestOfferCard from "./ProductBestOfferCard";
import ProductGallery from "./ProductGallery";
import SpecsTable from "./SpecsTable";
import {
  formatTL,
  mergeOfferRows,
  pickBestOffer,
  type InitialListing,
  type StoreDefinition,
} from "./offerUtils";

type ProductDetailModel = {
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
};

export type SimilarProduct = {
  id: string;
  slug: string;
  title: string;
  image_url: string | null;
  variant_storage: string | null;
  variant_color: string | null;
  min_price: number | null;
};

export type RecommendationTopic = {
  id: string;
  title: string;
  body: string | null;
  user_name: string | null;
  votes: number | null;
  answer_count: number | null;
  created_at: string;
};

type TabId = "yorumlar" | "ozellikler" | "benzer" | "tavsiyeler";

type Props = {
  product: ProductDetailModel;
  stores: Record<string, StoreDefinition>;
  initialListings: InitialListing[];
  initialReviewSummary: ReviewSummary;
  similarProducts?: SimilarProduct[];
  recommendations?: RecommendationTopic[];
};

export default function ProductDetailShell({
  product,
  stores,
  initialListings,
  initialReviewSummary,
  similarProducts = [],
  recommendations = [],
}: Props) {
  const [reviewSummary, setReviewSummary] = useState(initialReviewSummary);
  const [activeTab, setActiveTab] = useState<TabId>("yorumlar");
  const { listings, isLoading, isDone, successful, failed, refresh } = useLivePrices(product.id);

  const offerRows = useMemo(
    () => mergeOfferRows(initialListings, listings, stores),
    [initialListings, listings, stores]
  );

  const bestOffer = useMemo(() => pickBestOffer(offerRows), [offerRows]);
  const lowestKnownPrice =
    bestOffer?.displayPrice ??
    initialListings
      .map((listing) => listing.cached_price)
      .filter((price): price is number => price !== null)
      .sort((left, right) => left - right)[0] ??
    null;

  const primaryImage = product.image_url ?? product.images?.[0] ?? undefined;
  const quickFacts = [
    product.brand ? { label: "Marka", value: product.brand } : null,
    product.variant_storage ? { label: "Depolama", value: product.variant_storage } : null,
    product.variant_color ? { label: "Renk", value: product.variant_color } : null,
    product.category ? { label: "Kategori", value: product.category.name } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <article className="mx-auto flex w-full max-w-[1180px] flex-col gap-6 px-4 py-6">
      <nav className="flex flex-wrap items-center gap-2 text-xs text-[#8B847C]" aria-label="Navigasyon">
        <Link href="/" className="transition hover:text-[#171412]">
          Anasayfa
        </Link>
        {product.category && (
          <>
            <span aria-hidden="true">/</span>
            <Link href={`/kategori/${product.category.slug}`} className="transition hover:text-[#171412]">
              {product.category.name}
            </Link>
          </>
        )}
        <span aria-hidden="true">/</span>
        <span className="text-[#5E5750]">{product.title}</span>
      </nav>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <ProductGallery imageUrl={primaryImage} />

          <div className="rounded-[22px] border border-[#E8E4DF] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[#171412]">Urun Yorumlari</h2>
                <p className="mt-1 text-sm text-[#6D655E]">
                  Kullanici puanlari ve tavsiye forumunda urune etiketlenen paylasimlar.
                </p>
              </div>
              <div className="rounded-full bg-[#FFF3EE] px-3 py-1 text-sm font-semibold text-[#E8460A]">
                {reviewSummary.ratingCount > 0 ? reviewSummary.average.toFixed(1) : "—"}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Stars rating={reviewSummary.average} />
              <span className="text-sm text-[#4D4741]">
                {reviewSummary.ratingCount} puanlama · {reviewSummary.commentCount} yorum
              </span>
            </div>

            <button
              type="button"
              onClick={() => scrollToId("urun-yorumlari")}
              className="mt-4 w-full rounded-xl border border-[#E8E4DF] px-4 py-3 text-sm font-semibold text-[#171412] transition hover:border-[#E8460A] hover:text-[#E8460A]"
            >
              Yorumlara git
            </button>
          </div>
        </div>

        <div className="space-y-5">
          {product.brand && (
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A06B53]">
              {product.brand}
            </p>
          )}

          <div>
            <h1 className="text-3xl font-black leading-tight text-[#171412] sm:text-[2.15rem]">
              {product.title}
            </h1>

            <button
              type="button"
              onClick={() => scrollToId("urun-yorumlari")}
              className="mt-3 inline-flex items-center gap-3 rounded-full border border-[#EFE7DF] bg-white px-3 py-2 text-sm text-[#5E5750] transition hover:border-[#E8460A] hover:text-[#E8460A]"
            >
              <Stars rating={reviewSummary.average} />
              {reviewSummary.ratingCount > 0 ? (
                <span>
                  {reviewSummary.average.toFixed(1)} / 5 · {reviewSummary.ratingCount} degerlendirme
                </span>
              ) : (
                <span>Ilk degerlendirmeyi yap</span>
              )}
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#EFE7DF] bg-[#FFF7F2] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#B56B48]">
                En dusuk fiyat
              </div>
              <div className="mt-1 text-xl font-black text-[#E8460A]">
                {lowestKnownPrice !== null ? formatTL(lowestKnownPrice) : "—"}
              </div>
            </div>
            <div className="rounded-2xl border border-[#EFE7DF] bg-white p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A8179]">
                Magaza sayisi
              </div>
              <div className="mt-1 text-xl font-black text-[#171412]">{initialListings.length}</div>
            </div>
            <div className="rounded-2xl border border-[#EFE7DF] bg-white p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A8179]">
                Toplam yorum
              </div>
              <div className="mt-1 text-xl font-black text-[#171412]">{reviewSummary.commentCount}</div>
            </div>
          </div>

          <p className="text-sm leading-7 text-[#5E5750]">
            {product.description?.trim() || buildAutoDescription(product)}
          </p>

          {quickFacts.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {quickFacts.map((item) => (
                <span
                  key={`${item.label}-${item.value}`}
                  className="rounded-full border border-[#EFE7DF] bg-white px-3 py-1.5 text-xs font-medium text-[#4D4741]"
                >
                  <span className="text-[#8A8179]">{item.label}:</span> {item.value}
                </span>
              ))}
            </div>
          )}
        </div>

        <ProductBestOfferCard rows={offerRows} isLoading={isLoading} refresh={refresh} />
      </div>

      <LivePriceComparison
        productTitle={product.title}
        rows={offerRows}
        isLoading={isLoading}
        isDone={isDone}
        successful={successful}
        failed={failed}
        refresh={refresh}
      />

      <section className="rounded-[22px] border border-[#E8E4DF] bg-white shadow-sm" id="urun-sekmeler">
        <div
          role="tablist"
          aria-label="Ürün detay sekmeleri"
          className="flex flex-wrap gap-1 border-b border-[#EFE7DF] px-3 pt-3"
        >
          <TabButton
            id="yorumlar"
            label={`Yorumlar${reviewSummary.commentCount > 0 ? ` (${reviewSummary.commentCount})` : ""}`}
            active={activeTab === "yorumlar"}
            onSelect={setActiveTab}
          />
          <TabButton
            id="ozellikler"
            label="Teknik Özellikler"
            active={activeTab === "ozellikler"}
            onSelect={setActiveTab}
          />
          <TabButton
            id="benzer"
            label={`Benzer Ürünler${similarProducts.length > 0 ? ` (${similarProducts.length})` : ""}`}
            active={activeTab === "benzer"}
            onSelect={setActiveTab}
          />
          <TabButton
            id="tavsiyeler"
            label={`Tavsiyeler${recommendations.length > 0 ? ` (${recommendations.length})` : ""}`}
            active={activeTab === "tavsiyeler"}
            onSelect={setActiveTab}
          />
        </div>

        <div className="p-4 sm:p-6">
          {activeTab === "yorumlar" && (
            <div id="urun-yorumlari" role="tabpanel" aria-labelledby="tab-yorumlar">
              <CommunitySection
                productId={product.id}
                productTitle={product.title}
                categoryId={product.category?.id ?? null}
                onSummaryChange={setReviewSummary}
                hideSimilarProducts
                hideRecommendations
              />
            </div>
          )}

          {activeTab === "ozellikler" && (
            <div id="urun-teknik-ozellikler" role="tabpanel" aria-labelledby="tab-ozellikler">
              {product.specs && Object.keys(product.specs).length > 0 ? (
                <SpecsTable specs={product.specs} />
              ) : (
                <p className="text-sm text-[#6D655E]">Bu ürün için teknik özellik bilgisi bulunmuyor.</p>
              )}
            </div>
          )}

          {activeTab === "benzer" && (
            <div role="tabpanel" aria-labelledby="tab-benzer">
              <SimilarProductsList items={similarProducts} />
            </div>
          )}

          {activeTab === "tavsiyeler" && (
            <div role="tabpanel" aria-labelledby="tab-tavsiyeler">
              <RecommendationsList
                items={recommendations}
                productSlug={product.slug}
                productTitle={product.title}
              />
            </div>
          )}
        </div>
      </section>
    </article>
  );
}

function TabButton({
  id,
  label,
  active,
  onSelect,
}: {
  id: TabId;
  label: string;
  active: boolean;
  onSelect: (id: TabId) => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={`tab-${id}`}
      aria-selected={active}
      aria-controls={`panel-${id}`}
      onClick={() => onSelect(id)}
      className={`rounded-t-xl px-4 py-2.5 text-sm font-semibold transition ${
        active
          ? "bg-[#FFF3EE] text-[#E8460A]"
          : "text-[#6D655E] hover:bg-[#FAF7F4] hover:text-[#171412]"
      }`}
    >
      {label}
    </button>
  );
}

function SimilarProductsList({ items }: { items: SimilarProduct[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-[#6D655E]">Bu ürünün benzeri henüz listelenmedi.</p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => {
        const variantLabel = [item.variant_storage, item.variant_color]
          .filter(Boolean)
          .join(" · ");
        return (
          <Link
            key={item.id}
            href={`/urun/${item.slug}`}
            className="group flex flex-col overflow-hidden rounded-2xl border border-[#EFE7DF] bg-white transition hover:border-[#E8460A] hover:shadow-md"
          >
            <div className="aspect-square w-full bg-[#FAF7F4]">
              {item.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="h-full w-full object-contain p-3"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl text-[#C9C2BA]">
                  {item.title.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1 p-3">
              <span className="line-clamp-2 text-sm font-semibold text-[#171412] group-hover:text-[#E8460A]">
                {item.title}
              </span>
              {variantLabel && (
                <span className="text-xs text-[#8A8179]">{variantLabel}</span>
              )}
              {item.min_price !== null && (
                <span className="mt-auto text-sm font-bold text-[#E8460A]">
                  {formatTL(item.min_price)}
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function RecommendationsList({
  items,
  productSlug,
  productTitle,
}: {
  items: RecommendationTopic[];
  productSlug: string;
  productTitle: string;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-[#E8E4DF] bg-[#FAF7F4] p-5 text-sm text-[#6D655E]">
        <p>
          <strong className="text-[#171412]">{productTitle}</strong> için henüz tavsiye paylaşımı yok.
        </p>
        <Link
          href={`/tavsiyeler/yeni?product=${encodeURIComponent(productSlug)}`}
          className="rounded-full bg-[#E8460A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#c53a07]"
        >
          İlk tavsiyeyi sen yaz
        </Link>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((topic) => (
        <li key={topic.id}>
          <Link
            href={`/tavsiyeler/${topic.id}`}
            className="flex flex-col gap-2 rounded-2xl border border-[#EFE7DF] bg-white p-4 transition hover:border-[#E8460A] hover:shadow-sm"
          >
            <h3 className="text-base font-semibold text-[#171412]">{topic.title}</h3>
            {topic.body && (
              <p className="line-clamp-2 text-sm text-[#5E5750]">{topic.body}</p>
            )}
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#8A8179]">
              {topic.user_name && <span>{topic.user_name}</span>}
              {typeof topic.votes === "number" && <span>▲ {topic.votes}</span>}
              {typeof topic.answer_count === "number" && <span>{topic.answer_count} yanıt</span>}
              <span>{new Date(topic.created_at).toLocaleDateString("tr-TR")}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function buildAutoDescription(product: ProductDetailModel): string {
  const specs = product.specs ?? {};
  const highlightKeys = [
    "Ekran Boyutu",
    "Ekran Boyutu (inc)",
    "RAM Kapasitesi",
    "Batarya Kapasitesi",
    "Islemci",
    "Arka Kamera",
    "On Kamera",
  ];

  const highlights: string[] = [];
  for (const key of highlightKeys) {
    const value = specs[key];
    if (typeof value === "string" && value.trim()) {
      highlights.push(`${key}: ${value}`);
    }
    if (highlights.length >= 4) break;
  }

  if (highlights.length === 0) {
    return `${product.title} icin fiyatlar, teknik ozellikler ve kullanici yorumlarini bu sayfada inceleyebilirsiniz.`;
  }

  return `${product.title} icin one cikan bilgiler: ${highlights.join(", ")}. Tum magaza fiyatlari ve yorumlar asagida listelenir.`;
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Stars({ rating }: { rating: number }) {
  const rounded = Math.round(rating);

  return (
    <span className="flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className="h-4 w-4"
          viewBox="0 0 20 20"
          fill={star <= rounded ? "#E8A000" : "#E0E0E0"}
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}
