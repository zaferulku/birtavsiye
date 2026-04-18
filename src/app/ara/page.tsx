"use client";
import { useState, useEffect, Suspense } from "react";
import { supabase } from "../../lib/supabase";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";

type Product = {
  id: string;
  title: string;
  slug: string;
  brand: string;
  description: string;
  image_url?: string;
  category_id?: string;
  prices?: { price: number; stores: { name: string }[] }[];
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
      .select("id, title, slug, brand, description, image_url, category_id, prices(price,stores(name))")
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
    if (data) setResults(data);
    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) router.push("/ara?q=" + encodeURIComponent(query));
  };

  // Filtreleme ve sıralama
  const brands = [...new Set(results.map((p) => p.brand))].filter(Boolean);

  const filteredResults = results
    .filter((p) => selectedBrand === "" || p.brand === selectedBrand)
    .sort((a, b) => {
      if (sortBy === "a-z") return a.title.localeCompare(b.title);
      if (sortBy === "z-a") return b.title.localeCompare(a.title);
      return 0;
    });

  return (
    <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-4 md:py-6">

      {/* Arama Formu */}
      <form onSubmit={handleSearch} className="flex gap-2 sm:gap-3 mb-4 md:mb-6">
        <div className="flex-1 flex items-center bg-white border-2 border-gray-200 rounded-xl px-3 sm:px-4 gap-2 sm:gap-3 h-12 focus-within:border-[#E8460A] transition-all min-w-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Ürün, kategori veya marka ara..."
            className="flex-1 bg-transparent text-sm outline-none text-gray-800 placeholder:text-gray-400 min-w-0"
            autoFocus />
          {query && (
            <button type="button" onClick={() => { setQuery(""); router.push("/ara?q="); }}
              className="text-gray-400 hover:text-gray-600 text-lg flex-shrink-0 min-w-11 min-h-11 flex items-center justify-center">×</button>
          )}
        </div>
        <button type="submit"
          className="bg-[#E8460A] text-white px-4 sm:px-8 h-12 rounded-xl text-sm font-bold hover:bg-[#C93A08] transition-all flex-shrink-0">
          Ara
        </button>
      </form>

      {/* Sonuç yok — popüler aramalar */}
      {!q && !loading && (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🔍</div>
          <div className="text-base font-bold text-gray-800 mb-2">Ne aramak istersiniz?</div>
          <div className="text-sm text-gray-500 mb-8">Urun adi, marka veya kategori yazin</div>
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
        <div className="text-center py-16">
          <div className="text-4xl mb-3 animate-pulse">🔍</div>
          <div className="text-sm text-gray-500">Araniyor...</div>
        </div>
      )}

      {/* Sonuç yok */}
      {!loading && q && results.length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">😕</div>
          <div className="text-base font-bold text-gray-800 mb-2">
            "{q}" icin sonuc bulunamadi
          </div>
          <div className="text-sm text-gray-500 mb-6">Farkli bir kelime deneyin</div>
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
        <div className="flex flex-col md:flex-row gap-4 md:gap-6">

          {/* Sol - Filtreler */}
          <div className="w-full md:w-56 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sticky top-24">
              <h3 className="font-bold text-sm text-gray-900 mb-4">Filtrele</h3>

              {/* Sıralama */}
              <div className="mb-4">
                <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Siralama</div>
                {[
                  { value: "varsayilan", label: "Varsayilan" },
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
                    Tumu ({results.length})
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

          {/* Sag - Sonuçlar */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-500">
                <span className="font-bold text-gray-900">{filteredResults.length}</span> sonuc bulundu —{" "}
                <span className="text-[#E8460A] font-medium">"{q}"</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {filteredResults.map((p) => {
                const minPrice = p.prices?.length
                  ? p.prices.reduce((m, x) => x.price < m.price ? x : m, p.prices[0])
                  : null;
                return (
                  <Link href={"/urun/" + p.slug} key={p.id}>
                    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-lg hover:border-[#E8460A]/30 transition-all cursor-pointer group">
                      <div className="aspect-square bg-gray-50 overflow-hidden">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.title}
                            className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>
                        )}
                      </div>
                      <div className="p-3">
                        <div className="text-xs font-bold text-[#E8460A] uppercase tracking-wide mb-1">{p.brand}</div>
                        <div className="text-xs font-semibold text-gray-800 line-clamp-2 leading-snug mb-2">{p.title}</div>
                        {minPrice ? (
                          <div className="text-sm font-bold text-gray-900">{minPrice.price.toLocaleString("tr-TR")} <span className="text-xs font-normal text-gray-400">₺</span></div>
                        ) : (
                          <div className="text-xs text-[#E8460A] font-medium">Fiyatları Karşılaştır →</div>
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
      <Suspense fallback={<div className="text-center py-20 text-gray-400">Yukleniyor...</div>}>
        <AramaIcerik />
      </Suspense>
      <Footer />
    </main>
  );
}