"use client";

import { useMemo } from "react";
import {
  formatSellerRating,
  formatTL,
  formatWarrantyTypeLabel,
  getMarketplaceLogoUrl,
  pickBestOffer,
  sourceTrustScore,
  type MergedOfferRow,
} from "./offerUtils";

type Props = {
  rows: MergedOfferRow[];
  isLoading: boolean;
  refresh: () => void;
};

export default function ProductBestOfferCard({ rows, isLoading, refresh }: Props) {
  const bestOffer = useMemo(() => pickBestOffer(rows), [rows]);
  const trust = useMemo(() => buildOfferTrust(rows, bestOffer), [rows, bestOffer]);

  if (!bestOffer) {
    return (
      <aside className="rounded-[22px] border border-[#E8E4DF] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A06B53]">
              En uygun teklif
            </p>
            <h2 className="mt-1 text-lg font-bold text-[#171412]">Teklif araniyor</h2>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={isLoading}
            className="rounded-full border border-[#E8E4DF] px-3 py-1 text-xs font-medium text-[#5F5952] transition hover:border-[#E8460A] hover:text-[#E8460A] disabled:opacity-60"
          >
            Yenile
          </button>
        </div>
        <p className="text-sm leading-6 text-[#6C655E]">
          Bu urun icin henuz aktif magaza teklifi gorunmuyor.
        </p>
      </aside>
    );
  }

  const data = bestOffer.state.data;
  const storeName = bestOffer.store?.name ?? bestOffer.source;
  const sellerName = data?.seller_name ?? storeName;
  const sellerRating = data?.seller_rating ?? null;
  const sellerReviewCount = data?.seller_review_count ?? null;
  const warrantyDuration = data?.warranty_duration ?? null;
  const warrantyLabel = data?.warranty_label ?? formatWarrantyTypeLabel(bestOffer.warranty_type);
  const destinationUrl = data?.affiliate_url ?? bestOffer.fallback_url ?? null;
  const isOutOfStock = data?.in_stock === false;
  const logoUrl = getMarketplaceLogoUrl(bestOffer.source, bestOffer.store?.logo_url ?? null);

  return (
    <aside className="h-fit self-start rounded-[22px] border border-[#DCEAFB] bg-[#EDF6FF] p-5 shadow-[0_14px_32px_rgba(29,112,224,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={storeName}
              className="mt-0.5 h-12 w-12 rounded-xl border border-[#F0E5DD] bg-white object-contain p-2"
            />
          ) : null}

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A06B53]">
              En uygun teklif
            </p>
            <h2 className="mt-1 text-lg font-bold text-[#171412]">{storeName}</h2>
          </div>
        </div>

        <button
          type="button"
          onClick={refresh}
          disabled={isLoading}
          className="rounded-full border border-[#D7E7FB] bg-white px-3 py-1 text-xs font-medium text-[#5F5952] transition hover:border-[#1D70E0] hover:text-[#1D70E0] disabled:opacity-60"
        >
          {isLoading ? "Guncelleniyor" : "Yenile"}
        </button>
      </div>

      <div className="mt-4 rounded-[18px] border border-[#CFE2FA] bg-white px-4 py-4 shadow-[0_10px_26px_rgba(29,112,224,0.07)]">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1D70E0]/75">
          En uygun teklif
        </div>
        <div className="mt-2 text-[2rem] font-black leading-none text-[#171412]">
          {bestOffer.displayPrice !== null ? formatTL(bestOffer.displayPrice) : "-"}
        </div>
        {data?.original_price &&
          bestOffer.displayPrice !== null &&
          data.original_price > bestOffer.displayPrice && (
            <div className="mt-1 text-sm text-[#94A3B8] line-through">
              {formatTL(data.original_price)}
            </div>
          )}
      </div>

      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex items-start justify-between gap-3">
          <dt className="text-[#8C837B]">Platform</dt>
          <dd className="text-right font-semibold text-[#171412]">{storeName}</dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-[#8C837B]">Satici</dt>
          <dd className="text-right">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="font-semibold text-[#171412]">{sellerName}</span>
              {sellerRating !== null && (
                <span className="inline-flex min-w-[34px] items-center justify-center rounded-full bg-[#0D8F4D] px-2.5 py-0.5 text-[12px] font-bold leading-none text-white">
                  {formatSellerRating(sellerRating)}
                </span>
              )}
            </div>
            {sellerReviewCount !== null && (
              <div className="mt-1 text-xs font-medium text-[#8C837B]">
                {sellerReviewCount.toLocaleString("tr-TR")} yorum
              </div>
            )}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-[#8C837B]">Son gorulme</dt>
          <dd className="text-right font-semibold text-[#171412]">{trust.freshnessLabel}</dd>
        </div>
        {(warrantyDuration || warrantyLabel) && (
          <div className="flex items-start justify-between gap-3">
            <dt className="text-[#8C837B]">Garanti</dt>
            <dd className="text-right">
              {warrantyDuration && (
                <div className="font-semibold text-[#171412]">{warrantyDuration}</div>
              )}
              {warrantyLabel && (
                <div className="text-xs font-medium text-[#8C837B]">{warrantyLabel}</div>
              )}
            </dd>
          </div>
        )}
        {data?.shipping_price !== null && data?.shipping_price !== undefined && (
          <div className="flex items-start justify-between gap-3">
            <dt className="text-[#8C837B]">Kargo</dt>
            <dd className="text-right font-semibold text-[#171412]">
              {data.free_shipping ? "Bedava" : formatTL(data.shipping_price)}
            </dd>
          </div>
        )}
      </dl>

      {(data?.campaign_hint || data?.installment_hint) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {data?.campaign_hint && (
            <span className="rounded-full bg-[#FFF0EA] px-3 py-1 text-xs font-medium text-[#D13F05]">
              {data.campaign_hint}
            </span>
          )}
          {data?.installment_hint && (
            <span className="rounded-full bg-[#EEF4FF] px-3 py-1 text-xs font-medium text-[#1D4ED8]">
              {data.installment_hint}
            </span>
          )}
        </div>
      )}

      {destinationUrl && !isOutOfStock ? (
        <a
          href={destinationUrl}
          target="_blank"
          rel="noopener noreferrer nofollow sponsored"
          className="mt-5 flex w-full items-center justify-center rounded-xl bg-[#E8460A] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#C93A08]"
        >
          Magazaya Git
        </a>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-[#E8E4DF] px-4 py-3 text-center text-sm text-[#8C837B]">
          Bu teklif icin magaza baglantisi hazir degil
        </div>
      )}
    </aside>
  );
}

function buildOfferTrust(rows: MergedOfferRow[], bestOffer: MergedOfferRow | null) {
  if (!bestOffer) {
    return {
      score: 0,
      label: "Yetersiz veri",
      colorClass: "text-[#8C837B]",
      freshnessLabel: "Bilinmiyor",
    };
  }

  const uniqueSourceCount = new Set(rows.map((row) => row.source)).size;
  const baseScore = sourceTrustScore(bestOffer.source);
  const freshnessBonus = freshnessBonusFromIso(bestOffer.last_seen);
  const shippingBonus =
    bestOffer.state.data?.shipping_price != null || bestOffer.state.data?.free_shipping ? 6 : 0;
  const sellerBonus = bestOffer.state.data?.seller_name ? 4 : 0;
  const linkBonus = (bestOffer.state.data?.affiliate_url ?? bestOffer.fallback_url) ? 4 : 0;
  const diversityBonus = uniqueSourceCount >= 4 ? 10 : uniqueSourceCount >= 2 ? 5 : 0;

  const score = Math.max(
    0,
    Math.min(100, baseScore + freshnessBonus + shippingBonus + sellerBonus + linkBonus + diversityBonus)
  );

  const freshnessLabel = formatFreshness(bestOffer.last_seen);

  if (score >= 85) {
    return {
      score,
      label: "Guclu",
      colorClass: "text-[#15803D]",
      freshnessLabel,
    };
  }

  if (score >= 65) {
    return {
      score,
      label: "Iyi",
      colorClass: "text-[#1D4ED8]",
      freshnessLabel,
    };
  }

  if (score >= 45) {
    return {
      score,
      label: "Dikkatli bak",
      colorClass: "text-[#B45309]",
      freshnessLabel,
    };
  }

  return {
    score,
    label: "Temkinli",
    colorClass: "text-[#B42318]",
    freshnessLabel,
  };
}

function freshnessBonusFromIso(value: string | null): number {
  if (!value) return 0;
  const diffHours = (Date.now() - new Date(value).getTime()) / (1000 * 60 * 60);
  if (diffHours <= 6) return 10;
  if (diffHours <= 24) return 6;
  if (diffHours <= 48) return 3;
  return 0;
}

function formatFreshness(value: string | null): string {
  if (!value) return "Bilinmiyor";

  const diffMs = Date.now() - new Date(value).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return "1 saatten yeni";
  if (diffHours < 24) return `${diffHours} saat once`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} gun once`;
}
