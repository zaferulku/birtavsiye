"use client";

import { useMemo } from "react";
import {
  formatTL,
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
            <h2 className="mt-1 text-lg font-bold text-[#171412]">Teklif aranıyor</h2>
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
  const destinationUrl = data?.affiliate_url ?? bestOffer.fallback_url ?? null;
  const isOutOfStock = data?.in_stock === false;

  return (
    <aside className="rounded-[22px] border border-[#E8E4DF] bg-white p-5 shadow-sm xl:sticky xl:top-24">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A06B53]">
            En uygun teklif
          </p>
          <h2 className="mt-1 text-lg font-bold text-[#171412]">{storeName}</h2>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={isLoading}
          className="rounded-full border border-[#E8E4DF] px-3 py-1 text-xs font-medium text-[#5F5952] transition hover:border-[#E8460A] hover:text-[#E8460A] disabled:opacity-60"
        >
          {isLoading ? "Guncelleniyor" : "Yenile"}
        </button>
      </div>

      <div className="mt-4 rounded-[18px] bg-[#FFF3EE] px-4 py-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#B56B48]">
          En dusuk fiyat
        </div>
        <div className="mt-1 text-[2rem] font-black leading-none text-[#E8460A]">
          {bestOffer.displayPrice !== null ? formatTL(bestOffer.displayPrice) : "—"}
        </div>
        {data?.original_price && bestOffer.displayPrice !== null && data.original_price > bestOffer.displayPrice && (
          <div className="mt-1 text-sm text-[#8A6E63] line-through">{formatTL(data.original_price)}</div>
        )}
      </div>

      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex items-start justify-between gap-3">
          <dt className="text-[#8C837B]">Platform</dt>
          <dd className="text-right font-semibold text-[#171412]">{storeName}</dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-[#8C837B]">Satici</dt>
          <dd className="text-right font-semibold text-[#171412]">{sellerName}</dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-[#8C837B]">Durum</dt>
          <dd className={`text-right font-semibold ${isOutOfStock ? "text-[#B42318]" : "text-[#15803D]"}`}>
            {isOutOfStock ? "Stokta yok" : "Aktif teklif"}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-[#8C837B]">Guven sinyali</dt>
          <dd className={`text-right font-semibold ${trust.colorClass}`}>{trust.label}</dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-[#8C837B]">Son gorulme</dt>
          <dd className="text-right font-semibold text-[#171412]">{trust.freshnessLabel}</dd>
        </div>
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

      <div className="mt-4 rounded-xl border border-[#F0E5DD] bg-[#FAF7F4] px-4 py-3">
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8C837B]">
          Guven notu aciklamasi
        </div>
        <p className="mt-2 text-sm leading-6 text-[#5F5952]">{trust.summary}</p>
      </div>

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
          Bu teklif icin baglanti hazir degil
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
      summary: "Henuz yeterli kaynak veya tazelik sinyali yok.",
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
      summary:
        "Kaynak kalitesi yuksek, teklif yeni gorulmus ve temel alisveris sinyalleri net. Bu not resmi magaza puani degil; kaynak tipi ve veri tazeliginden uretilir.",
    };
  }

  if (score >= 65) {
    return {
      score,
      label: "Iyi",
      colorClass: "text-[#1D4ED8]",
      freshnessLabel,
      summary:
        "Teklif kullanisli gorunuyor ama satin almadan once magaza sayfasinda teslimat, satici ve iade detaylarini tekrar kontrol etmek mantikli olur.",
    };
  }

  if (score >= 45) {
    return {
      score,
      label: "Dikkatli bak",
      colorClass: "text-[#B45309]",
      freshnessLabel,
      summary:
        "Kaynak veya veri tazeligi orta seviyede. Fiyat iyi olsa bile kargo ve satici ayrintilarini acip dogrulamak daha guvenli olur.",
    };
  }

  return {
    score,
    label: "Temkinli",
    colorClass: "text-[#B42318]",
    freshnessLabel,
    summary:
      "Bu sinyal zayif. Teklif eski olabilir ya da kaynak guvenilirligi dusuk olabilir. Satin almadan once ayni urunun diger magaza tekliflerini de karsilastir.",
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
