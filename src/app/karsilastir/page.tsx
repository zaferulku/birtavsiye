"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabase";
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
  specs?: Record<string, string>;
};

type Price = {
  id: string;
  price: number;
  affiliate_url?: string;
  stores: { name: string; url: string };
};

const MAX = 4;

const colClass: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
};

export default function KarsilastirSayfasi() {
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product[]>([]);
  const [prices, setPrices] = useState<Record<string, Price[]>>({});
  const [activeSearch, setActiveSearch] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const searchProducts = async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    const { data } = await supabase.from("products")
      .select("id, title, slug, brand, description, image_url, specs")
      .or(`title.ilike.%${q}%,brand.ilike.%${q}%`)
      .limit(8);
    if (data) setSearchResults(data.filter(p => !selected.find(s => s.id === p.id)));
  };

  const addProduct = async (product: Product) => {
    if (selected.length >= MAX) return;
    if (selected.find(p => p.id === product.id)) return;
    setSelected(prev => [...prev, product]);
    setSearch("");
    setSearchResults([]);
    setActiveSearch(false);
    setLoadingId(product.id);
    const { data } = await supabase.from("prices")
      .select("id, price, affiliate_url, stores(name, url)")
      .eq("product_id", product.id)
      .order("price", { ascending: true });
    if (data) setPrices(prev => ({ ...prev, [product.id]: data as any }));
    setLoadingId(null);
  };

  const removeProduct = (id: string) => {
    setSelected(prev => prev.filter(p => p.id !== id));
    setPrices(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const allSpecKeys = [...new Set(
    selected.flatMap(p => p.specs ? Object.keys(p.specs) : [])
  )];

  const cols = colClass[selected.length] || "grid-cols-1";
  const colsWithSlot = colClass[Math.min(selected.length + 1, MAX)] || colClass[MAX];

  return (
    <main className="bg-[#F5F4F0] min-h-screen">
      <Header />

      <div className="max-w-[1400px] mx-auto px-6 py-6">

        {/* Sayfa başlığı */}
        <div className="mb-5">
          <h1 className="font-bold text-xl text-gray-900">Ürün Karşılaştır</h1>
          <p className="text-sm text-gray-500 mt-0.5">En fazla {MAX} ürünü yan yana karşılaştırın</p>
        </div>

        {/* Ürün seçim alanı */}
        <div className={`grid ${selected.length < MAX ? colsWithSlot : cols} gap-4 mb-5`}>
          {selected.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="relative">
                <div className="h-44 bg-gray-50 flex items-center justify-center overflow-hidden">
                  {p.image_url
                    ? <img src={p.image_url} alt={p.title} className="h-full w-full object-contain p-4" />
                    : <div className="text-5xl">📦</div>
                  }
                </div>
                <button
                  onClick={() => removeProduct(p.id)}
                  className="absolute top-2 right-2 w-7 h-7 bg-white border border-gray-200 text-gray-400 rounded-full text-sm flex items-center justify-center hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all shadow-sm">
                  ✕
                </button>
                {loadingId === p.id && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-[#E8460A] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <div className="p-3.5">
                <div className="text-[10px] font-bold text-[#E8460A] uppercase tracking-wider mb-1">{p.brand}</div>
                <Link href={"/urun/" + p.slug}>
                  <div className="text-sm font-semibold text-gray-800 hover:text-[#E8460A] transition-colors line-clamp-2 leading-snug cursor-pointer">
                    {p.title}
                  </div>
                </Link>
              </div>
            </div>
          ))}

          {/* Ürün ekle slot */}
          {selected.length < MAX && (
            <div className="relative">
              <div
                onClick={() => setActiveSearch(true)}
                className="bg-white rounded-2xl border-2 border-dashed border-gray-200 h-full min-h-[240px] flex flex-col items-center justify-center cursor-pointer hover:border-[#E8460A] hover:bg-orange-50/30 transition-all group">
                <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-[#E8460A]/10 flex items-center justify-center text-2xl text-gray-400 group-hover:text-[#E8460A] mb-2.5 transition-all">+</div>
                <div className="text-sm font-semibold text-gray-400 group-hover:text-[#E8460A] transition-colors">Ürün Ekle</div>
                <div className="text-xs text-gray-300 mt-1">{selected.length}/{MAX} ürün</div>
              </div>

              {activeSearch && (
                <div className="absolute top-0 left-0 right-0 z-20 bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
                  <div className="p-3 border-b border-gray-100">
                    <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 h-10">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); searchProducts(e.target.value); }}
                        placeholder="Ürün adı veya marka ara..."
                        className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder:text-gray-400"
                        autoFocus
                      />
                    </div>
                  </div>
                  {searchResults.length > 0 ? (
                    <div className="max-h-56 overflow-y-auto divide-y divide-gray-50">
                      {searchResults.map((p) => (
                        <button key={p.id} onClick={() => addProduct(p)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-orange-50 transition-all text-left">
                          <div className="w-9 h-9 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            {p.image_url
                              ? <img src={p.image_url} alt="" className="w-full h-full object-contain p-1" />
                              : <div className="w-full h-full flex items-center justify-center text-sm">📦</div>
                            }
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-gray-800 truncate">{p.title}</div>
                            <div className="text-[10px] text-gray-400 font-medium">{p.brand}</div>
                          </div>
                          <div className="text-[10px] text-[#E8460A] font-semibold flex-shrink-0">Ekle →</div>
                        </button>
                      ))}
                    </div>
                  ) : search.length > 0 ? (
                    <div className="px-3 py-6 text-center text-xs text-gray-400">Sonuç bulunamadı</div>
                  ) : (
                    <div className="px-3 py-6 text-center text-xs text-gray-400">Aramak istediğiniz ürünü yazın</div>
                  )}
                  <div className="p-2 border-t border-gray-100">
                    <button onClick={() => { setActiveSearch(false); setSearch(""); setSearchResults([]); }}
                      className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 transition-all rounded-lg hover:bg-gray-50">
                      Kapat
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Boş durum */}
        {selected.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 py-20 text-center shadow-sm">
            <div className="text-5xl mb-4">⚖️</div>
            <div className="text-base font-bold text-gray-700 mb-2">Ürünleri Karşılaştır</div>
            <div className="text-sm text-gray-400 mb-6">Yukarıdan ürün ekleyerek karşılaştırmaya başlayın</div>
            <Link href="/ara?q=" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#E8460A] text-white text-sm font-bold rounded-xl hover:bg-[#C93A08] transition-all">
              Ürün Ara →
            </Link>
          </div>
        )}

        {selected.length > 0 && (
          <div className="space-y-4">

            {/* Fiyat Karşılaştırma */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100">
                <span className="text-base">💰</span>
                <h2 className="font-bold text-sm text-gray-900">Fiyat Karşılaştırma</h2>
              </div>
              <div className={`grid ${cols} divide-x divide-gray-100`}>
                {selected.map((p) => {
                  const pList = prices[p.id] || [];
                  const cheapest = pList[0];
                  return (
                    <div key={p.id} className="p-4">
                      {loadingId === p.id ? (
                        <div className="h-16 flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-[#E8460A] border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : cheapest ? (
                        <>
                          <div className="text-2xl font-extrabold text-gray-900 mb-0.5">
                            {Number(cheapest.price).toLocaleString("tr-TR")}
                            <span className="text-sm font-normal text-gray-400 ml-1">₺</span>
                          </div>
                          <div className="text-xs text-emerald-600 font-semibold mb-1">En ucuz fiyat</div>
                          <div className="text-xs text-gray-400 mb-3">{cheapest.stores?.name}</div>
                          <a href={cheapest.affiliate_url || cheapest.stores?.url || "#"}
                            target="_blank" rel="nofollow sponsored"
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#E8460A] text-white text-xs font-bold rounded-lg hover:bg-[#C93A08] transition-all">
                            Siteye Git →
                          </a>
                          {pList.length > 1 && (
                            <div className="mt-3 space-y-1.5">
                              {pList.slice(1).map((pr) => (
                                <div key={pr.id} className="flex items-center justify-between text-xs">
                                  <span className="text-gray-500">{pr.stores?.name}</span>
                                  <span className="font-semibold text-gray-700">
                                    {Number(pr.price).toLocaleString("tr-TR")} ₺
                                    <span className="text-red-400 font-normal ml-1">
                                      (+{(Number(pr.price) - Number(cheapest.price)).toLocaleString("tr-TR")})
                                    </span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-sm text-gray-300 py-4">Fiyat bulunamadı</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Genel Bilgiler */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100">
                <span className="text-base">📋</span>
                <h2 className="font-bold text-sm text-gray-900">Genel Bilgiler</h2>
              </div>
              {[
                { label: "Marka", getValue: (p: Product) => p.brand },
                { label: "Açıklama", getValue: (p: Product) => p.description?.slice(0, 100) ? p.description.slice(0, 100) + (p.description.length > 100 ? "…" : "") : "—" },
              ].map((row) => (
                <div key={row.label} className={`grid ${cols} border-b border-gray-50 last:border-0`}>
                  <div className={`col-span-full bg-gray-50 px-5 py-2 text-xs font-bold text-gray-500 uppercase tracking-wide border-b border-gray-100`}>
                    {row.label}
                  </div>
                  {selected.map((p) => (
                    <div key={p.id} className="px-5 py-3 text-sm text-gray-700 border-r border-gray-50 last:border-0">
                      {row.getValue(p)}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Teknik Özellikler */}
            {allSpecKeys.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100">
                  <span className="text-base">⚙️</span>
                  <h2 className="font-bold text-sm text-gray-900">Teknik Özellikler</h2>
                </div>
                {allSpecKeys.map((key, i) => (
                  <div key={key} className={`grid ${cols} border-b border-gray-50 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}>
                    <div className="col-span-full bg-gray-50 px-5 py-2 text-xs font-bold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                      {key}
                    </div>
                    {selected.map((p) => {
                      const val = p.specs?.[key];
                      return (
                        <div key={p.id} className="px-5 py-3 text-sm text-gray-700 border-r border-gray-50 last:border-0">
                          {val || <span className="text-gray-300">—</span>}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            {/* Özet / Kazanan */}
            {selected.length >= 2 && (
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl border border-orange-100 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🏆</span>
                  <h2 className="font-bold text-sm text-gray-900">Fiyat Açısından Kazanan</h2>
                </div>
                {(() => {
                  const withPrice = selected.filter(p => prices[p.id]?.length > 0);
                  if (!withPrice.length) return <p className="text-sm text-gray-400">Fiyat verisi yükleniyor...</p>;
                  const cheapest = withPrice.reduce((best, p) => {
                    const bPrice = prices[best.id]?.[0]?.price ?? Infinity;
                    const cPrice = prices[p.id]?.[0]?.price ?? Infinity;
                    return cPrice < bPrice ? p : best;
                  });
                  const cheapestPrice = prices[cheapest.id]?.[0]?.price;
                  return (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl overflow-hidden border border-orange-100 flex-shrink-0">
                        {cheapest.image_url
                          ? <img src={cheapest.image_url} alt="" className="w-full h-full object-contain p-1" />
                          : <div className="w-full h-full flex items-center justify-center text-lg">📦</div>
                        }
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900 line-clamp-1">{cheapest.title}</div>
                        <div className="text-xs text-emerald-600 font-semibold">
                          {Number(cheapestPrice).toLocaleString("tr-TR")} ₺ — En uygun fiyat
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
