"use client";

import { useMemo } from "react";
import { formatTL, pickBestOffer, type MergedOfferRow } from "./offerUtils";

type Props = {
  rows: MergedOfferRow[];
  isLoading: boolean;
  refresh: () => void;
};

export default function ProductBestOfferCard({ rows, isLoading, refresh }: Props) {
  const bestOffer = useMemo(() => pickBestOffer(rows), [rows]);

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
          Bu teklif icin baglanti hazir degil
        </div>
      )}
    </aside>
  );
}
