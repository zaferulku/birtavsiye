"use client";
import { useState, useEffect, Suspense } from "react";
import { supabase } from "../../lib/supabase";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";

type Price = { price: number; store: { name: string } };
type Product = {
  id: string;
  title: string;
  slug: string;
  brand: string;
  description: string;
  image_url?: string;
  category_id?: string;
  prices?: Price[];
};

const popularSearches = [
  "iPhone 16", "Samsung Galaxy", "MacBook", "AirPods",
  "PlayStation 5", "Xbox", "iPad", "Dyson",
];

function AramaIcerik() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get("q") || "";
  const [query, setQuery] = useState(q);
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState("varsayilan");
  const [selectedBrand, setSelectedBrand] = useState("");

  useEffect(() => {
    setQuery(q);
    if (q) search(q);
    else setResults([]);
  }, [q]);

  const search = async (term: string) => {
    if (!term.trim()) return;
    setLoading(true);

    const { data: categoryData } = await supabase
      .from("categories").select("id").ilike("name", "%" + term + "%");
    const categoryIds = categoryData?.map((c) => c.id) || [];

    let queryBuilder = supabase
      .from("products")
      .select("id, title, slug, brand, description, image_url, category_id, prices(price, store:stores(name))")
      .limit(40);

    if (categoryIds.length > 0) {
      queryBuilder = queryBuilder.or(
        `title.ilike.%${term}%,brand.ilike.%${term}%,description.ilike.%${term}%,category_id.in.(${categoryIds.join(",")})`
      );
    } else {
      queryBuilder = queryBuilder.or(
        `title.ilike.%${term}%,brand.ilike.%${term}%,description.ilike.%${term}%`
      );
    }

    const { data } = await queryBuilder;
    if (data) setResults(data as unknown as Product[]);
    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) router.push("/ara?q=" + encodeURIComponent(query));
  };

  const getMinPrice = (p: Product) => {
    if (!p.prices?.length) return null;
    return p.prices.reduce((min, x) => x.price < min.price ? x : min, p.prices[0]);
  };

  const brands = [...new Set(results.map((p) => p.brand))].filter(Boolean);

  const filteredResults = results
    .filter((p) => selectedBrand === "" || p.brand === selectedBrand)
    .sort((a, b) => {
      if (sortBy === "a-z") return a.title.localeCompare(b.title);
      if (sortBy === "z-a") return b.title.localeCompare(a.title);
      if (sortBy === "fiyat-asc") {
        const pa = getMinPrice(a)?.price ?? Infinity;
        const pb = getMinPrice(b)?.price ?? Infinity;
        return pa - pb;
      }
      if (sortBy === "fiyat-desc") {
        const pa = getMinPrice(a)?.price ?? 0;
        const pb = getMinPrice(b)?.price ?? 0;
        return pb - pa;
      }
      return 0;
    });

  return (
    <div className="max-w-[1400px] mx-auto px-8 py-6">

      {/* Arama Formu */}
      <form onSubmit={handleSearch} className="flex gap-3 mb-6">
        <div className="flex-1 flex items-center bg-white border-2 border-gray-200 rounded-xl px-4 gap-3 h-12 focus-within:border-[#E8460A] transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Ürün, kategori veya marka ara..."
            className="flex-1 bg-transparent text-sm outline-none text-gray-800 placeholder:text-gray-400"
            autoFocus />
          {query && (
            <button type="button" onClick={() => { setQuery(""); router.push("/ara?q="); }}
              className="text-gray-400 hover:text-gray-600 text-lg">×</button>
          )}
        </div>
        <button type="submit"
          className="bg-[#E8460A] text-white px-8 h-12 rounded-xl text-sm font-bold hover:bg-[#C93A08] transition-all">
          Ara
        </button>
      </form>

      {/* Sonuç yok — popüler aramalar */}
      {!q && !loading && (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🔍</div>
          <div className="text-base font-bold text-gray-800 mb-2">Ne aramak istersiniz?</div>
          <div className="text-sm text-gray-500 mb-8">Ürün adı, marka veya kategori yazın</div>
          <div className="flex flex-wrap gap-2 justify-center">
            {popularSearches.map((s) => (
              <button key={s} onClick={() => router.push("/ara?q=" + encodeURIComponent(s))}
                className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:border-[#E8460A] hover:text-[#E8460A] transition-all">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Yükleniyor */}
      {loading && (
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
              <div className="aspect-square bg-gray-100" />
              <div className="p-3 space-y-2">
                <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                <div className="h-3 bg-gray-100 rounded w-full" />
                <div className="h-3 bg-gray-100 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sonuç yok */}
      {!loading && q && results.length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">😕</div>
          <div className="text-base font-bold text-gray-800 mb-2">
            "{q}" için sonuç bulunamadı
          </div>
          <div className="text-sm text-gray-500 mb-6">Farklı bir kelime deneyin</div>
          <div className="flex flex-wrap gap-2 justify-center">
            {popularSearches.map((s) => (
              <button key={s} onClick={() => router.push("/ara?q=" + encodeURIComponent(s))}
                className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:border-[#E8460A] hover:text-[#E8460A] transition-all">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sonuçlar */}
      {!loading && filteredResults.length > 0 && (
        <div className="flex gap-6">

          {/* Sol - Filtreler */}
          <div className="w-56 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sticky top-24">
              <h3 className="font-bold text-sm text-gray-900 mb-4">Filtrele</h3>

              {/* Sıralama */}
              <div className="mb-4">
                <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Sıralama</div>
                {[
                  { value: "varsayilan", label: "Varsayılan" },
                  { value: "fiyat-asc", label: "En Düşük Fiyat" },
                  { value: "fiyat-desc", label: "En Yüksek Fiyat" },
                  { value: "a-z", label: "A-Z" },
                  { value: "z-a", label: "Z-A" },
                ].map((s) => (
                  <button key={s.value} onClick={() => setSortBy(s.value)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs mb-1 transition-all ${
                      sortBy === s.value ? "bg-orange-50 text-[#E8460A] font-semibold" : "text-gray-600 hover:bg-gray-50"
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Marka */}
              {brands.length > 1 && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Marka</div>
                  <button onClick={() => setSelectedBrand("")}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs mb-1 transition-all ${
                      selectedBrand === "" ? "bg-orange-50 text-[#E8460A] font-semibold" : "text-gray-600 hover:bg-gray-50"
                    }`}>
                    Tümü ({results.length})
                  </button>
                  {brands.map((b) => (
                    <button key={b} onClick={() => setSelectedBrand(b)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs mb-1 transition-all ${
                        selectedBrand === b ? "bg-orange-50 text-[#E8460A] font-semibold" : "text-gray-600 hover:bg-gray-50"
                      }`}>
                      {b} ({results.filter(p => p.brand === b).length})
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sağ - Sonuçlar */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-500">
                <span className="font-bold text-gray-900">{filteredResults.length}</span> sonuç —{" "}
                <span className="text-[#E8460A] font-medium">"{q}"</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              {filteredResults.map((p) => {
                const lowest = getMinPrice(p);
                return (
                  <Link href={"/urun/" + p.slug} key={p.id}>
                    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-lg hover:border-[#E8460A]/30 transition-all cursor-pointer group h-full flex flex-col">
                      <div className="aspect-square bg-gray-50 overflow-hidden">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.title}
                            className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>
                        )}
                      </div>
                      <div className="p-3 flex flex-col flex-1">
                        <div className="text-xs font-bold text-[#E8460A] uppercase tracking-wide mb-0.5">{p.brand}</div>
                        <div className="text-xs font-semibold text-gray-800 line-clamp-2 leading-snug mb-2 flex-1">{p.title}</div>
                        {lowest ? (
                          <div className="bg-green-50 border border-green-100 rounded-xl px-2.5 py-1.5">
                            <div className="text-[10px] text-green-600 font-medium">En Düşük Fiyat</div>
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-extrabold text-green-700">
                                {lowest.price.toLocaleString("tr-TR")} ₺
                              </div>
                              <div className="text-[10px] text-gray-500 font-semibold truncate max-w-[60px]">
                                {lowest.store.name}
                              </div>
                            </div>
                            {(p.prices?.length ?? 0) > 1 && (
                              <div className="text-[10px] text-gray-400 mt-0.5">
                                +{(p.prices?.length ?? 1) - 1} mağaza
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-gray-50 border border-gray-100 rounded-xl px-2.5 py-1.5 text-center">
                            <div className="text-xs text-[#E8460A] font-semibold">Fiyatları Karşılaştır →</div>
                          </div>
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

export default function AramaSayfasi() {
  return (
    <main className="bg-gray-50 min-h-screen">
      <Header />
      <Suspense fallback={<div className="text-center py-20 text-gray-400">Yükleniyor...</div>}>
        <AramaIcerik />
      </Suspense>
      <Footer />
    </main>
  );
}
