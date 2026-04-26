/**
 * LivePriceComparison - Product detail page price comparison card
 * Pure presentational: receives merged rows + loading state from parent (ProductDetailShell).
 */

"use client";

import { formatTL, type MergedOfferRow } from "@/app/components/urun/offerUtils";

type Props = {
  productTitle: string;
  rows: MergedOfferRow[];
  isLoading: boolean;
  isDone: boolean;
  successful: number;
  failed: number;
  refresh: () => void;
};

export function LivePriceComparison({
  productTitle,
  rows,
  isLoading,
  isDone,
  successful,
  failed,
  refresh,
}: Props) {
  const minPrice = rows
    .map((row) => row.totalPrice)
    .filter((price): price is number => price !== null)
    .sort((left, right) => left - right)[0];

  return (
    <section className="live-price-comparison" aria-label={`${productTitle} magaza fiyatlari`}>
      <header className="lpc-header">
        <div className="lpc-header-left">
          <h2 className="lpc-title">Magaza Fiyatlari</h2>
          {rows.length > 0 && (
            <p className="lpc-subtitle">
              {rows.length} magaza
              {minPrice !== undefined && (
                <>
                  {" · "}
                  <strong>{formatTL(minPrice)}&apos;dan basliyor</strong>
                </>
              )}
            </p>
          )}
        </div>
        <button
          className="lpc-refresh"
          onClick={refresh}
          disabled={isLoading}
          aria-label="Fiyatlari yenile"
          type="button"
        >
          {isLoading ? (
            <span className="lpc-loading-indicator">Guncelleniyor...</span>
          ) : (
            <span>↻ Yenile</span>
          )}
        </button>
      </header>

      <ul className="lpc-list">
        {rows.map((row) => (
          <StoreRow
            key={row.listing_id}
            row={row}
            isMinPrice={row.totalPrice !== null && row.totalPrice === minPrice}
          />
        ))}
      </ul>

      {isDone && (
        <footer className="lpc-footer">
          <span className="lpc-stats">
            {successful} magaza guncellendi
            {failed > 0 && ` · ${failed} magazada anlik kontrol basarisiz`}
          </span>
          <span className="lpc-disclaimer">
            Fiyatlar son dakika guncellemelerini yansitir. Taksit ve kampanya detaylari magazada gosterilir.
          </span>
        </footer>
      )}

      <style jsx>{STYLES}</style>
    </section>
  );
}

type StoreRowProps = {
  row: MergedOfferRow;
  isMinPrice: boolean;
};

function StoreRow({ row, isMinPrice }: StoreRowProps) {
  const { state, store, displayPrice, isCached, fallback_url } = row;
  const storeName = store?.name ?? row.source;
  const data = state.data;

  const isError = state.status === "error";
  const isPending = state.status === "pending";
  const isOutOfStock = data?.in_stock === false;
  const storeUrl = data?.affiliate_url ?? fallback_url ?? null;

  return (
    <li className={`lpc-row ${isError ? "lpc-row--error" : ""} ${isOutOfStock ? "lpc-row--oos" : ""}`}>
      <div className="lpc-store">
        {store?.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={store.logo_url} alt={storeName} className="lpc-logo" />
        ) : (
          <div className="lpc-logo-placeholder">{storeName.charAt(0)}</div>
        )}
        <div className="lpc-store-info">
          <span className="lpc-store-name">{storeName}</span>
          {data?.seller_name && data.seller_name !== storeName && (
            <span className="lpc-seller">Satici: {data.seller_name}</span>
          )}
          {data?.seller_rating != null && (
            <span className="lpc-seller">
              {data.seller_rating.toFixed(1)} / 5
              {typeof data?.seller_review_count === "number" &&
                ` · ${data.seller_review_count.toLocaleString("tr-TR")} yorum`}
            </span>
          )}
        </div>
      </div>

      <div className="lpc-details">
        {isError && (
          <span className="lpc-error-text">
            Anlik fiyat dogrulanamadi
            {row.state.error === "rate_limited" && " (biraz sonra tekrar deneyin)"}
            {row.state.error === "timeout" && " (yanit gecikti)"}
          </span>
        )}
        {!isError && isOutOfStock && <span className="lpc-oos-text">Stokta yok</span>}
        {!isError && !isOutOfStock && (
          <>
            {data?.campaign_hint && (
              <span className="lpc-badge lpc-badge--campaign">{data.campaign_hint}</span>
            )}
            {data?.free_shipping && (
              <span className="lpc-badge lpc-badge--shipping">Kargo bedava</span>
            )}
            {data?.installment_hint && (
              <span className="lpc-badge lpc-badge--installment">{data.installment_hint}</span>
            )}
          </>
        )}
      </div>

      <div className="lpc-price-col">
        {displayPrice !== null ? (
          <div className={`lpc-price ${isMinPrice ? "lpc-price--best" : ""}`}>
            {isMinPrice && <span className="lpc-price-label">En uygun</span>}
            <span className="lpc-price-value">
              {isPending && isCached && <span className="lpc-pending-dot" aria-label="Guncelleniyor" />}
              {formatTL(displayPrice)}
            </span>
            {data?.original_price && data.original_price > displayPrice && (
              <span className="lpc-price-strike">{formatTL(data.original_price)}</span>
            )}
            {data?.shipping_price && data.shipping_price > 0 && (
              <span className="lpc-price-shipping">+ {formatTL(data.shipping_price)} kargo</span>
            )}
          </div>
        ) : (
          <div className="lpc-price lpc-price--skeleton" aria-label="Fiyat yukleniyor">
            <span className="lpc-skeleton-bar" />
          </div>
        )}

        {!isError && !isOutOfStock && storeUrl && (
          <a
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer nofollow sponsored"
            className="lpc-cta"
          >
            Magazayi Gor
          </a>
        )}
        {!isError && !isOutOfStock && !storeUrl && (
          <span className="lpc-cta-disabled" aria-hidden="true">
            Baglanti hazir degil
          </span>
        )}
      </div>
    </li>
  );
}

const STYLES = `
  .live-price-comparison { border: 1px solid var(--border, #e5e7eb); border-radius: 12px; background: var(--surface, #fff); overflow: hidden; }
  .lpc-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border, #e5e7eb); background: var(--surface-subtle, #f9fafb); }
  .lpc-title { margin: 0; font-size: 1.125rem; font-weight: 600; color: var(--text, #111); }
  .lpc-subtitle { margin: 2px 0 0; font-size: 0.875rem; color: var(--text-muted, #6b7280); }
  .lpc-subtitle strong { color: var(--accent, #dc2626); font-weight: 600; }
  .lpc-refresh { padding: 8px 14px; border: 1px solid var(--border, #e5e7eb); border-radius: 8px; background: var(--surface, #fff); color: var(--text, #111); font-size: 0.875rem; cursor: pointer; }
  .lpc-refresh:hover:not(:disabled) { background: var(--surface-hover, #f3f4f6); }
  .lpc-refresh:disabled { opacity: 0.6; cursor: not-allowed; }
  .lpc-list { list-style: none; margin: 0; padding: 0; }
  .lpc-row { display: grid; grid-template-columns: 1fr 1fr auto; gap: 16px; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border-subtle, #f3f4f6); }
  .lpc-row:last-child { border-bottom: none; }
  .lpc-row--error { opacity: 0.75; }
  .lpc-row--oos { opacity: 0.7; }
  .lpc-store { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .lpc-logo, .lpc-logo-placeholder { width: 48px; height: 48px; border-radius: 6px; object-fit: contain; }
  .lpc-logo-placeholder { background: var(--surface-subtle, #f9fafb); display: flex; align-items: center; justify-content: center; font-weight: 600; color: var(--text-muted, #6b7280); }
  .lpc-store-info { display: flex; flex-direction: column; min-width: 0; }
  .lpc-store-name { font-weight: 500; color: var(--text, #111); }
  .lpc-seller { font-size: 0.75rem; color: var(--text-muted, #6b7280); }
  .lpc-details { display: flex; flex-wrap: wrap; gap: 6px; }
  .lpc-badge { padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 500; }
  .lpc-badge--campaign { background: var(--accent-soft, #fef2f2); color: var(--accent, #dc2626); }
  .lpc-badge--shipping { background: var(--success-soft, #ecfdf5); color: var(--success, #059669); }
  .lpc-badge--installment { background: var(--info-soft, #eff6ff); color: var(--info, #2563eb); }
  .lpc-error-text, .lpc-oos-text { font-size: 0.8125rem; color: var(--text-muted, #6b7280); }
  .lpc-price-col { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
  .lpc-price { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
  .lpc-price--best .lpc-price-value { color: var(--accent, #dc2626); }
  .lpc-price-label { font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; color: var(--accent, #dc2626); }
  .lpc-price-value { font-size: 1.125rem; font-weight: 700; display: flex; align-items: center; gap: 6px; }
  .lpc-price-strike { font-size: 0.8125rem; color: var(--text-muted, #6b7280); text-decoration: line-through; }
  .lpc-price-shipping { font-size: 0.75rem; color: var(--text-muted, #6b7280); }
  .lpc-price--skeleton { min-width: 100px; height: 24px; }
  .lpc-skeleton-bar { display: block; width: 80px; height: 20px; background: linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 50%, #f3f4f6 100%); background-size: 200% 100%; animation: lpc-shimmer 1.5s infinite; border-radius: 4px; }
  .lpc-pending-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent, #dc2626); opacity: 0.6; animation: lpc-pulse 1.5s infinite; }
  .lpc-cta { padding: 8px 16px; border-radius: 8px; background: var(--accent, #dc2626); color: #fff; font-weight: 500; font-size: 0.875rem; text-decoration: none; white-space: nowrap; }
  .lpc-cta:hover { background: var(--accent-hover, #b91c1c); }
  .lpc-cta-disabled { font-size: 0.75rem; color: var(--text-muted, #9ca3af); font-style: italic; }
  .lpc-footer { padding: 12px 20px; border-top: 1px solid var(--border-subtle, #f3f4f6); background: var(--surface-subtle, #f9fafb); display: flex; flex-direction: column; gap: 4px; }
  .lpc-stats { font-size: 0.8125rem; color: var(--text, #111); font-weight: 500; }
  .lpc-disclaimer { font-size: 0.75rem; color: var(--text-muted, #6b7280); }
  @keyframes lpc-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  @keyframes lpc-pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.8; } }
  @media (max-width: 640px) {
    .lpc-row { grid-template-columns: 1fr; gap: 12px; }
    .lpc-price-col { flex-direction: row; justify-content: space-between; width: 100%; }
    .lpc-price { align-items: flex-start; }
  }
`;
