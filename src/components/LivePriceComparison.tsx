"use client";

import {
  formatSellerRating,
  formatTL,
  formatWarrantyTypeLabel,
  getMarketplaceLogoUrl,
  type MergedOfferRow,
} from "@/app/components/urun/offerUtils";

type Props = {
  productTitle: string;
  rows: MergedOfferRow[];
  isLoading: boolean;
  isDone: boolean;
  successful: number;
  failed: number;
};

export function LivePriceComparison({ productTitle, rows, isLoading }: Props) {
  const minPrice = rows
    .map((row) => row.totalPrice)
    .filter((price): price is number => price !== null)
    .sort((left, right) => left - right)[0];

  return (
    <section className="live-price-comparison" aria-label={`${productTitle} saticilar ve magaza teklifleri`}>
      <header className="lpc-header">
        <div className="lpc-header-left">
          <h2 className="lpc-title">Saticilar / Magazalar</h2>
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
        {isLoading && <span className="lpc-loading-indicator">Guncelleniyor...</span>}
      </header>

      <ul className="lpc-list">
        {rows.map((row) => (
          <StoreRow
            key={row.listing_id}
            row={row}
            productTitle={productTitle}
            isMinPrice={row.totalPrice !== null && row.totalPrice === minPrice}
          />
        ))}
      </ul>

      <style jsx>{STYLES}</style>
    </section>
  );
}

function StoreRow({
  row,
  productTitle,
  isMinPrice,
}: {
  row: MergedOfferRow;
  productTitle: string;
  isMinPrice: boolean;
}) {
  const { state, store, displayPrice, isCached, fallback_url } = row;
  const storeName = store?.name ?? row.source;
  const data = state.data;
  const logoUrl = getMarketplaceLogoUrl(row.source, store?.logo_url ?? null);
  const isError = state.status === "error";
  const isPending = state.status === "pending";
  const isOutOfStock = data?.in_stock === false;
  const storeUrl = data?.affiliate_url ?? fallback_url ?? null;
  const warrantyDuration = data?.warranty_duration ?? null;
  const warrantyLabel = data?.warranty_label ?? formatWarrantyTypeLabel(row.warranty_type);
  const clickable = !isError && !isOutOfStock && Boolean(storeUrl);

  const WrapperTag = clickable ? "a" : "div";

  return (
    <li>
      <WrapperTag
        {...(clickable
          ? {
              href: storeUrl!,
              target: "_blank",
              rel: "noopener noreferrer nofollow sponsored",
            }
          : {})}
        className={`lpc-row ${clickable ? "lpc-row--link" : ""} ${isError ? "lpc-row--error" : ""} ${isOutOfStock ? "lpc-row--oos" : ""}`}
      >
        <div className="lpc-store">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={storeName} className="lpc-logo" />
          ) : (
            <div className="lpc-logo-placeholder">{storeName.charAt(0)}</div>
          )}

          <div className="lpc-store-info">
            <span className="lpc-store-name">{productTitle}</span>
            <span className="lpc-platform">{storeName}</span>
            <span className="lpc-seller">
              <span>Satici: {data?.seller_name ?? storeName}</span>
              {data?.seller_rating != null && (
                <span className="lpc-seller-badge">{formatSellerRating(data.seller_rating)}</span>
              )}
            </span>
            {typeof data?.seller_review_count === "number" && (
              <span className="lpc-seller lpc-seller--muted">
                {data.seller_review_count.toLocaleString("tr-TR")} yorum
              </span>
            )}
            {(warrantyDuration || warrantyLabel) && (
              <span className="lpc-seller lpc-seller--muted">
                Garanti: {warrantyDuration ?? warrantyLabel}
              </span>
            )}
          </div>
        </div>

        <div className="lpc-price-col">
          {displayPrice !== null ? (
            <div className="lpc-price">
              {isMinPrice && <span className="lpc-price-label">En Uygun</span>}
              <span className="lpc-price-value">
                {isPending && isCached && <span className="lpc-pending-dot" aria-hidden="true" />}
                {formatTL(displayPrice)}
              </span>
            </div>
          ) : (
            <div className="lpc-price lpc-price--skeleton" aria-label="Fiyat yukleniyor">
              <span className="lpc-skeleton-bar" />
            </div>
          )}

          {clickable ? <span className="lpc-cta">Magazaya Git</span> : <span className="lpc-cta-disabled">Baglanti hazir degil</span>}
        </div>
      </WrapperTag>
    </li>
  );
}

const STYLES = `
  .live-price-comparison { border: 1px solid #e5e7eb; border-radius: 18px; background: #fff; overflow: hidden; }
  .lpc-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px 18px; border-bottom: 1px solid #eef2f7; background: #fff; }
  .lpc-title { margin: 0; font-size: 1rem; font-weight: 700; color: #111827; }
  .lpc-subtitle { margin: 3px 0 0; font-size: 0.8rem; color: #6b7280; }
  .lpc-subtitle strong { color: #e8460a; font-weight: 700; }
  .lpc-loading-indicator { font-size: 0.8rem; color: #6b7280; font-weight: 600; }
  .lpc-list { list-style: none; margin: 0; padding: 0; }
  .lpc-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 16px; align-items: center; padding: 16px 18px; border-top: 1px solid #f3f4f6; }
  .lpc-row--link { text-decoration: none; transition: background-color .16s ease; }
  .lpc-row--link:hover { background: #f8fbff; }
  .lpc-row--error { opacity: 0.75; }
  .lpc-row--oos { opacity: 0.75; }
  .lpc-store { display: flex; align-items: flex-start; gap: 12px; min-width: 0; }
  .lpc-logo, .lpc-logo-placeholder { width: 52px; height: 52px; border-radius: 12px; object-fit: contain; background: #fff; }
  .lpc-logo-placeholder { display: flex; align-items: center; justify-content: center; border: 1px solid #e5e7eb; font-weight: 700; color: #6b7280; }
  .lpc-store-info { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
  .lpc-store-name { font-size: 0.98rem; font-weight: 700; line-height: 1.35; color: #111827; }
  .lpc-platform { font-size: 0.9rem; font-weight: 700; color: #111827; }
  .lpc-seller { display: inline-flex; align-items: center; gap: 6px; font-size: 0.8rem; color: #6b7280; }
  .lpc-seller--muted { color: #8b95a7; }
  .lpc-seller-badge { display: inline-flex; min-width: 32px; align-items: center; justify-content: center; border-radius: 999px; background: #0d8f4d; padding: 2px 7px; font-size: 0.7rem; font-weight: 700; line-height: 1; color: #fff; }
  .lpc-price-col { display: flex; align-items: center; gap: 16px; white-space: nowrap; }
  .lpc-price { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
  .lpc-price-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; color: #dc2626; }
  .lpc-price-value { display: flex; align-items: center; gap: 6px; font-size: 1.85rem; font-weight: 800; color: #e8460a; }
  .lpc-pending-dot { width: 8px; height: 8px; border-radius: 999px; background: #dc2626; opacity: 0.65; }
  .lpc-price--skeleton { min-width: 140px; height: 28px; }
  .lpc-skeleton-bar { display: block; width: 120px; height: 24px; border-radius: 8px; background: linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 50%, #f3f4f6 100%); background-size: 200% 100%; animation: lpc-shimmer 1.5s infinite; }
  .lpc-cta { display: inline-flex; align-items: center; justify-content: center; border-radius: 10px; background: #ef4423; padding: 10px 18px; font-size: 0.92rem; font-weight: 700; color: #fff; }
  .lpc-cta-disabled { font-size: 0.8rem; color: #9ca3af; }
  @keyframes lpc-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  @media (max-width: 900px) {
    .lpc-row { grid-template-columns: 1fr; }
    .lpc-price-col { justify-content: space-between; width: 100%; }
    .lpc-price { align-items: flex-start; }
  }
`;
