"use client";

/**
 * /sonuclar â Chatbot tarafÄ±ndan Ã¶nerilen Ã¼rÃ¼nleri gÃ¶steren sayfa
 *
 * URL: /sonuclar?q=lavanta+deodorant
 *
 * DavranÄ±Å:
 *   - useChatStore'dan recommendedProducts okur
 *   - HiÃ§ Ã¼rÃ¼n yoksa "Aramaya baÅla" CTA gÃ¶sterir
 *   - 3 sÃ¼tun grid (mobilde 2)
 *   - Ãstte query baÅlÄ±ÄÄ± + kaÃ§ sonuÃ§ olduÄu
 *   - BoÅ durumda: "Daha farklÄ± ifade dene" + alternatif Ã¶neriler
 */

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  useChatStore,
  type RecommendedProduct,
} from "@/lib/chatbot/useChatStore";
import Header from "../components/layout/Header";
import ToggleBar from "../components/home/ToggleBar";

// ============================================================================
// Product card
// ============================================================================

function ProductCard({ product }: { product: RecommendedProduct }) {
  const price =
    product.min_price != null
      ? `${product.min_price.toLocaleString("tr-TR")} TL`
      : "Fiyat bilgisi yok";

  const listingsLabel =
    product.listing_count > 1
      ? `${product.listing_count} mağazada`
      : product.listing_count === 1
      ? "1 mağazada"
      : "Stokta yok";

  return (
    <a
      href={`/urun/${product.slug}`}
      className="
        group flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden
        hover:border-gray-400 hover:shadow-md transition-all
      "
    >
      {/* Resim */}
      <div className="aspect-square bg-gray-50 flex items-center justify-center p-4 overflow-hidden">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.title}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="text-gray-300 text-xs">Görsel yok</div>
        )}
      </div>

      {/* Ä°Ã§erik */}
      <div className="flex-1 p-3 flex flex-col gap-1">
        {product.brand && product.brand !== "null" && (
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            {product.brand}
          </p>
        )}
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">
          {product.title}
        </h3>
        <div className="mt-auto pt-2 flex items-baseline justify-between gap-2">
          <span className="text-base font-semibold text-gray-900 truncate">
            {price}
          </span>
          <span className="text-xs text-gray-500 flex-shrink-0">
            {listingsLabel}
          </span>
        </div>
      </div>
    </a>
  );
}

// ============================================================================
// Empty state (sorgu yapÄ±ldÄ± ama sonuÃ§ yok)
// ============================================================================

function EmptyResults({ query }: { query: string }) {
  return (
    <div className="text-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">
        &ldquo;{query}&rdquo; için sistemde ürün bulamadık
      </h2>
      <p className="text-sm text-gray-600 max-w-md mx-auto mb-6 leading-relaxed">
        Aramayı biraz daha geniş tutmayı deneyebilirsin. Sağdaki sohbet
        penceresinde botla konuşarak alternatifleri bulabiliriz.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="text-xs text-gray-500">Örnek sorgular:</span>
        <SuggestionChip text="iPhone 15" />
        <SuggestionChip text="laptop 30000 TL altı" />
        <SuggestionChip text="yağlı cilt için nemlendirici" />
      </div>
    </div>
  );
}

function SuggestionChip({ text }: { text: string }) {
  return (
    <a
      href={`/sonuclar?q=${encodeURIComponent(text)}`}
      className="
        inline-flex items-center px-3 py-1.5 rounded-full
        bg-gray-100 hover:bg-gray-200
        text-xs text-gray-700 transition-colors
      "
    >
      {text}
    </a>
  );
}

// ============================================================================
// Initial state (henÃ¼z sorgu yapÄ±lmadÄ±, direkt URL'den giriÅ)
// ============================================================================

function InitialState() {
  return (
    <div className="text-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">
        Aramaya başla
      </h2>
      <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
        Aşağıdaki çubuğa istediğin ürünü tarif et, sana uygun seçenekleri
        gösterelim.
      </p>
    </div>
  );
}

// ============================================================================
// Loading state (sorgu yapÄ±ldÄ±, yanÄ±t bekleniyor)
// ============================================================================

function LoadingState({ query }: { query: string }) {
  return (
    <div className="py-8 px-4">
      <h2 className="text-base text-gray-700 mb-6">
        &ldquo;{query}&rdquo; için arama yapılıyor...
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-gray-100 rounded-xl aspect-[3/4] animate-pulse" />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Main content
// ============================================================================

function SonuclarContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const products = useChatStore((s) => s.recommendedProducts);
  const lastQuery = useChatStore((s) => s.lastQuery);
  const status = useChatStore((s) => s.status);

  // HiÃ§ sorgu yoksa initial state
  if (!query && products.length === 0) {
    return <InitialState />;
  }

  // Sorgu var ama hÃ¢lÃ¢ yÃ¼kleniyor (ChatBar henÃ¼z cevap almadÄ±)
  // ve mevcut sorgu URL'deki sorguyla eÅleÅmiyor (yeni sorgu)
  const isFetching =
    (status === "sending" || status === "streaming") &&
    query &&
    query !== lastQuery;

  if (isFetching) {
    return <LoadingState query={query} />;
  }

  // Sorgu var, sonuÃ§ yok
  if (query && products.length === 0) {
    return <EmptyResults query={query} />;
  }

  // SonuÃ§lar var
  return (
    <div className="py-6 px-4 max-w-6xl mx-auto">
      {/* BaÅlÄ±k */}
      <div className="mb-6 pb-4 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">
          {query ? (
            <>&ldquo;{query}&rdquo; için sonuçlar</>
          ) : (
            "Sana özel öneriler"
          )}
        </h1>
        <p className="text-sm text-gray-500">
          {products.length} ürün bulundu
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Footer hint */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          Aradığın bu mu? Sağdaki sohbet penceresinden botla konuşarak
          aramayı daraltabilirsin.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Page (Suspense wrapper, useSearchParams iÃ§in gerekli)
// ============================================================================

export default function SonuclarPage() {
  return (
    <main className="min-h-screen bg-white pb-32">
      <Header />
      <ToggleBar />
      <Suspense fallback={<div className="py-16 text-center text-gray-500">Yükleniyor...</div>}>
        <SonuclarContent />
      </Suspense>
    </main>
  );
}
