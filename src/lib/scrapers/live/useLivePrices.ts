/**
 * useLivePrices - React hook for SSE-driven live price updates.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type StoreLiveData = {
  price: number;
  original_price: number | null;
  currency: string;
  in_stock: boolean;
  stock_count: number | null;
  shipping_price: number | null;
  free_shipping: boolean;
  seller_name: string | null;
  seller_rating?: number | null;
  seller_review_count?: number | null;
  installment_hint: string | null;
  campaign_hint: string | null;
  affiliate_url: string | null;
  fetched_at: string;
};

export type ListingState = {
  listing_id: string;
  source: string;
  status: "pending" | "success" | "error";
  data: StoreLiveData | null;
  error: string | null;
};

export type UseLivePricesResult = {
  listings: Record<string, ListingState>;
  isLoading: boolean;
  isDone: boolean;
  totalStores: number;
  successful: number;
  failed: number;
  durationMs: number;
  refresh: () => void;
};

export function useLivePrices(productId: string | null): UseLivePricesResult {
  const [listings, setListings] = useState<Record<string, ListingState>>({});
  const [isDone, setIsDone] = useState(false);
  const [stats, setStats] = useState({
    totalStores: 0,
    successful: 0,
    failed: 0,
    durationMs: 0,
  });

  const [refreshToken, setRefreshToken] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  const refresh = useCallback(() => {
    setRefreshToken((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!productId) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // P6.12: productId değişince stale fiyat/stat'ı temizle ve yeni SSE'yi
    // subscribe et — "subscribe-on-key-change" deseni. ESLint
    // set-state-in-effect bunu cascading render olarak işaretliyor; 3 sync
    // setState batch'lenir, refactor (useReducer / parent key prop) scope dışı.
    /* eslint-disable react-hooks/set-state-in-effect */
    setListings({});
    setIsDone(false);
    setStats({ totalStores: 0, successful: 0, failed: 0, durationMs: 0 });
    /* eslint-enable react-hooks/set-state-in-effect */

    // discover=1 → mevcut listing'i olmayan mağazalarda title+brand araması yap.
    // Orphan ürünlerde (tek-mağaza) diğer pazaryeri fiyatları gösterir.
    const url = `/api/live-prices?product_id=${encodeURIComponent(productId)}&discover=1${
      refreshToken > 0 ? "&fresh=1" : ""
    }`;

    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener("price", (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        setListings((prev) => ({
          ...prev,
          [payload.listing_id]: {
            listing_id: payload.listing_id,
            source: payload.source,
            status: "success",
            data: payload.data,
            error: null,
          },
        }));
      } catch (err) {
        console.warn("[useLivePrices] parse price event failed:", err);
      }
    });

    es.addEventListener("error", (e: any) => {
      if (e?.data) {
        try {
          const payload = JSON.parse(e.data);
          setListings((prev) => ({
            ...prev,
            [payload.listing_id]: {
              listing_id: payload.listing_id,
              source: payload.source,
              status: "error",
              data: null,
              error: payload.error,
            },
          }));
        } catch {
          /* ignore */
        }
      }
    });

    es.addEventListener("done", (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        setStats({
          totalStores: payload.total_stores,
          successful: payload.successful,
          failed: payload.failed,
          durationMs: payload.duration_ms,
        });
      } catch {
        /* ignore */
      }
      setIsDone(true);
      es.close();
    });

    return () => {
      es.close();
    };
  }, [productId, refreshToken]);

  return {
    listings,
    isLoading: !isDone,
    isDone,
    totalStores: stats.totalStores,
    successful: stats.successful,
    failed: stats.failed,
    durationMs: stats.durationMs,
    refresh,
  };
}
