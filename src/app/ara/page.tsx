"use client";

import { useState, useEffect, Suspense, useEffectEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import {
  formatFreshnessLabel,
  getActiveOfferCount,
  getFreshestSeenAt,
  getLowestActivePrice,
} from "../../lib/listingSignals";
import { getDiscoveryProductLabel } from "../../lib/productDiscovery";

type Product = {
  id: string;
  title: string;
  slug: string;
  brand: string | null;
  description?: string;
  image_url?: string;
  category_id?: string;
  model_code?: string | null;
  model_family?: string | null;
  variant_storage?: string | null;
  variant_color?: string | null;
  created_at?: string | null;
  prices?: {
    id: string;
    price: number;
    source: string | null;
    last_seen: string | null;
    is_active?: boolean | null;
    in_stock?: boolean | null;
  }[];
};

const popularSearches = [
  "iPhone 16",
  "Samsung Galaxy",
  "MacBook",
  "AirPods",
  "PlayStation 5",
  "Xbox",
  "iPad",
  "Dyson",
];

function AramaIcerik({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState("varsayilan");
  const [selectedBrand, setSelectedBrand] = useState("");

  const search = useEffectEvent(async (term: string) => {
    if (!term.trim()) return;
    setLoading(true);

    const response = await fetch(`/api/public/products?q=${encodeURIComponent(term)}&limit=48`, {
      cache: "no-store",
    });

    if (!response.ok) {
      setResults([]);
      setLoading(false);
      return;
    }

    const payload = (await response.json()) as { products?: Product[] };
    setResults((payload.products ?? []).filter((product) => (product.prices?.length ?? 0) > 0));

    setLoading(false);
  });

  useEffect(() => {
    if (initialQuery) void search(initialQuery);
  }, [initialQuery]);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (query.trim()) router.push(`/ara?q=${encodeURIComponent(query)}`);
  };

  const brands = [...new Set(results.map((product) => product.brand))].filter(Boolean);

  const filteredResults = results
    .filter((product) => selectedBrand === "" || product.brand === selectedBrand)
    .sort((left, right) => {
      if (sortBy === "ucuz") {
        return (getLowestActivePrice(left.prices) ?? Infinity) - (getLowestActivePrice(right.prices) ?? Infinity);
      }
      if (sortBy === "pahali") {
        return (getLowestActivePrice(right.prices) ?? -Infinity) - (getLowestActivePrice(left.prices) ?? -Infinity);
      }
      if (sortBy === "magaza") {
        return getActiveOfferCount(right.prices) - getActiveOfferCount(left.prices);
      }
      if (sortBy === "a-z") return left.title.localeCompare(right.title);
      if (sortBy === "z-a") return right.title.localeCompare(left.title);
      return 0;
    });

  return (
    <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-4 md:py-6">
      <form onSubmit={handleSearch} className="flex gap-2 sm:gap-3 mb-4 md:mb-6">
        <div className="flex-1 flex items-center bg-white border-2 border-gray-200 rounded-xl px-3 sm:px-4 gap-2 sm:gap-3 h-12 focus-within:border-[#E8460A] transition-all min-w-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4 text-gray-400 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Urun, kategori veya marka ara..."
            className="flex-1 bg-transparent text-sm outline-none text-gray-800 placeholder:text-gray-400 min-w-0"
            autoFocus
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                router.push("/ara?q=");
              }}
              className="text-gray-400 hover:text-gray-600 text-lg flex-shrink-0 min-w-11 min-h-11 flex items-center justify-center"
            >
              x
            </button>
          )}
        </div>
        <button
          type="submit"
          className="bg-[#E8460A] text-white px-4 sm:px-8 h-12 rounded-xl text-sm font-bold hover:bg-[#C93A08] transition-all flex-shrink-0"
        >
          Ara
        </button>
      </form>

      {!initialQuery && !loading && (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">Ara</div>
          <div className="text-base font-bold text-gray-800 mb-2">Ne aramak istersiniz?</div>
          <div className="text-sm text-gray-500 mb-8">Urun adi, marka veya kategori yazin</div>
          <div className="flex flex-wrap gap-2 justify-center">
            {popularSearches.map((term) => (
              <button
                key={term}
                onClick={() => router.push(`/ara?q=${encodeURIComponent(term)}`)}
                className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:border-[#E8460A] hover:text-[#E8460A] transition-all"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3 animate-pulse">Ara</div>
          <div className="text-sm text-gray-500">Araniyor...</div>
        </div>
      )}

      {!loading && initialQuery && results.length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">Sonuc yok</div>
          <div className="text-base font-bold text-gray-800 mb-2">
            &quot;{initialQuery}&quot; icin sonuc bulunamadi
          </div>
          <div className="text-sm text-gray-500 mb-6">Farkli bir kelime deneyin</div>
          <div className="flex flex-wrap gap-2 justify-center">
            {popularSearches.map((term) => (
              <button
                key={term}
                onClick={() => router.push(`/ara?q=${encodeURIComponent(term)}`)}
                className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:border-[#E8460A] hover:text-[#E8460A] transition-all"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && filteredResults.length > 0 && (
        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
          <div className="w-full md:w-56 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sticky top-24">
              <h3 className="font-bold text-sm text-gray-900 mb-4">Filtrele</h3>

              <div className="mb-4">
                <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Siralama</div>
                {[
                  { value: "varsayilan", label: "Varsayilan" },
                  { value: "ucuz", label: "En Ucuz" },
                  { value: "pahali", label: "En Pahali" },
                  { value: "magaza", label: "En Fazla Magaza" },
                  { value: "a-z", label: "A-Z" },
                  { value: "z-a", label: "Z-A" },
                ].map((sort) => (
                  <button
                    key={sort.value}
                    onClick={() => setSortBy(sort.value)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs mb-1 transition-all ${
                      sortBy === sort.value
                        ? "bg-orange-50 text-[#E8460A] font-semibold"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {sort.label}
                  </button>
                ))}
              </div>

              {brands.length > 1 && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Marka</div>
                  <button
                    onClick={() => setSelectedBrand("")}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs mb-1 transition-all ${
                      selectedBrand === ""
                        ? "bg-orange-50 text-[#E8460A] font-semibold"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Tumu ({results.length})
                  </button>
                  {brands.map((brand) => (
                    <button
                      key={brand}
                      onClick={() => setSelectedBrand(brand ?? "")}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs mb-1 transition-all ${
                        selectedBrand === brand
                          ? "bg-orange-50 text-[#E8460A] font-semibold"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {brand} ({results.filter((product) => product.brand === brand).length})
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-500">
                <span className="font-bold text-gray-900">{filteredResults.length}</span> sonuc bulundu -{" "}
                <span className="text-[#E8460A] font-medium">&quot;{initialQuery}&quot;</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {filteredResults.map((product) => {
                const minPrice = getLowestActivePrice(product.prices);
                const offerCount = getActiveOfferCount(product.prices);
                const freshestSeenAt = getFreshestSeenAt(product.prices);
                return (
                  <Link href={`/urun/${product.slug}`} key={product.id}>
                    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-lg hover:border-[#E8460A]/30 transition-all cursor-pointer group">
                      <div className="aspect-square bg-gray-50 overflow-hidden">
                        {product.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.image_url}
                            alt={product.title}
                            className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl">?</div>
                        )}
                      </div>
                      <div className="p-3">
                        <div className="text-xs font-bold text-[#E8460A] uppercase tracking-wide mb-1">
                          {product.brand}
                        </div>
                        <div className="text-xs font-semibold text-gray-800 line-clamp-2 leading-snug mb-2">
                          {getDiscoveryProductLabel(product)}
                        </div>
                        {minPrice !== null ? (
                          <div>
                            <div className="flex items-baseline justify-between gap-2">
                              <div className="text-sm font-bold text-gray-900">
                                {minPrice.toLocaleString("tr-TR")}{" "}
                                <span className="text-xs font-normal text-gray-400">TL</span>
                              </div>
                              {offerCount > 1 && (
                                <span className="text-[9px] text-gray-500 font-medium bg-gray-100 rounded-full px-1.5 py-0.5">
                                  {offerCount} satici
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-[10px] text-gray-400">
                              Son fiyat: {formatFreshnessLabel(freshestSeenAt)}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-[#E8460A] font-medium">Fiyatlari Karsilastir -&gt;</div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AramaSayfasiIcerik() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";

  return <AramaIcerik key={q} initialQuery={q} />;
}

export default function AramaSayfasi() {
  return (
    <main className="bg-white min-h-screen">
      <Header />
      <Suspense fallback={<div className="text-center py-20 text-gray-400">Yukleniyor...</div>}>
        <AramaSayfasiIcerik />
      </Suspense>
      <Footer />
    </main>
  );
}
