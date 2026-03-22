"use client";
import { useState, useEffect } from "react";
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
  price: number;
  stores: { name: string; url: string };
};

export default function KarsilastirSayfasi() {
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product[]>([]);
  const [prices, setPrices] = useState<Record<string, Price[]>>({});
  const [activeSearch, setActiveSearch] = useState(false);

  const searchProducts = async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    const { data } = await supabase.from("products")
      .select("id, title, slug, brand, description, image_url, specs")
      .or(`title.ilike.%${q}%,brand.ilike.%${q}%`)
      .limit(8);
    if (data) setSearchResults(data.filter(p => !selected.find(s => s.id === p.id)));
  };

  const addProduct = async (product: Product) => {
    if (selected.length >= 4) return;
    if (selected.find(p => p.id === product.id)) return;
    const newSelected = [...selected, product];
    setSelected(newSelected);
    setSearch("");
    setSearchResults([]);
    setActiveSearch(false);

    // Fiyatları çek
    const { data } = await supabase.from("prices")
      .select("price, stores(name, url)")
      .eq("product_id", product.id)
      .order("price", { ascending: true });
    if (data) setPrices(prev => ({ ...prev, [product.id]: data as any }));
  };

  const removeProduct = (id: string) => {
    setSelected(prev => prev.filter(p => p.id !== id));
    setPrices(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  // Tüm spec key'leri topla
  const allSpecKeys = [...new Set(
    selected.flatMap(p => p.specs ? Object.keys(p.specs) : [])
  )];

  const colClass = selected.length === 1 ? "grid-cols-1" :
    selected.length === 2 ? "grid-cols-2" :
    selected.length === 3 ? "grid-cols-3" : "grid-cols-4";

  return (
    <main className="bg-gray-50 min-h-screen">
      <Header />
      <div className="max-w-[1400px] mx-auto px-8 py-8">

        {/* Başlık */}
        <div className="mb-6">
          <h1 className="font-bold text-2xl text-gray-900 mb-1">Urun Karsilastir</h1>
          <p className="text-sm text-gray-500">En fazla 4 urun karsilastirilabilir</p>
        </div>

        {/* Ürün Seçme */}
        <div className={`grid ${colClass} gap-4 mb-6`}>
          {selected.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="relative">
                <div className="h-40 bg-gray-50 overflow-hidden">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>
                  )}
                </div>
                <button onClick={() => removeProduct(p.id)}
                  className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 transition-all">
                  ×
                </button>
              </div>
              <div className="p-3">
                <div className="text-xs font-bold text-[#E8460A] mb-0.5">{p.brand}</div>
                <Link href={"/urun/" + p.slug}>
                  <div className="text-sm font-semibold text-gray-800 hover:text-[#E8460A] transition-colors line-clamp-2 leading-snug">
                    {p.title}
                  </div>
                </Link>
              </div>
            </div>
          ))}

          {/* Ürün Ekle Butonu */}
          {selected.length < 4 && (
            <div className="relative">
              <div
                onClick={() => setActiveSearch(true)}
                className="bg-white rounded-2xl border-2 border-dashed border-gray-200 h-full min-h-[220px] flex flex-col items-center justify-center cursor-pointer hover:border-[#E8460A] hover:bg-orange-50 transition-all group">
                <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-[#E8460A]/10 flex items-center justify-center text-2xl mb-2 transition-all">+</div>
                <div className="text-sm font-medium text-gray-500 group-hover:text-[#E8460A] transition-colors">Urun Ekle</div>
              </div>

              {activeSearch && (
                <div className="absolute top-0 left-0 right-0 z-10 bg-white rounded-2xl border border-gray-200 shadow-xl p-3">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); searchProducts(e.target.value); }}
                    placeholder="Urun ara..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#E8460A] transition-all mb-2"
                    autoFocus
                  />
                  {searchResults.length > 0 && (
                    <div className="max-h-48 overflow-y-auto">
                      {searchResults.map((p) => (
                        <button key={p.id} onClick={() => addProduct(p)}
                          className="w-full flex items-center gap-2 p-2 hover:bg-orange-50 rounded-lg transition-all text-left">
                          <div className="w-8 h-8 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            {p.image_url ? (
                              <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs">📦</div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-gray-800 truncate">{p.title}</div>
                            <div className="text-xs text-gray-400">{p.brand}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  <button onClick={() => { setActiveSearch(false); setSearch(""); setSearchResults([]); }}
                    className="w-full mt-2 text-xs text-gray-400 hover:text-gray-600 transition-all">
                    Iptal
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {selected.length > 0 && (
          <div className="space-y-4">

            {/* Fiyat Karşılaştırma */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-gray-900 px-5 py-3">
                <h2 className="font-bold text-white text-sm">En Dusuk Fiyatlar</h2>
              </div>
              <div className={`grid ${colClass} divide-x divide-gray-100`}>
                {selected.map((p) => {
                  const pList = prices[p.id] || [];
                  const minPrice = pList[0];
                  return (
                    <div key={p.id} className="p-4">
                      {minPrice ? (
                        <>
                          <div className="text-xl font-extrabold text-gray-900 mb-0.5">
                            {Number(minPrice.price).toLocaleString("tr-TR")} TL
                          </div>
                          <div className="text-xs text-gray-400 mb-2">{minPrice.stores?.name}</div>
                          <a href={minPrice.stores?.url || "#"} target="_blank"
                            className="inline-block px-3 py-1.5 bg-[#E8460A] text-white text-xs font-semibold rounded-lg hover:bg-[#C93A08] transition-all">
                            Siteye Git →
                          </a>
                        </>
                      ) : (
                        <div className="text-sm text-gray-400">Fiyat yok</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Genel Bilgiler */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
                <h2 className="font-bold text-gray-800 text-sm">Genel Bilgiler</h2>
              </div>
              {[
                { label: "Marka", getValue: (p: Product) => p.brand },
                { label: "Aciklama", getValue: (p: Product) => p.description?.slice(0, 80) || "-" },
              ].map((row) => (
                <div key={row.label} className={`grid ${colClass} divide-x divide-gray-100 border-b border-gray-50 last:border-0`}>
                  <div className="col-span-full bg-gray-50 px-5 py-2 text-xs font-semibold text-gray-500 border-b border-gray-100">
                    {row.label}
                  </div>
                  {selected.map((p) => (
                    <div key={p.id} className="px-5 py-3 text-sm text-gray-700">{row.getValue(p)}</div>
                  ))}
                </div>
              ))}
            </div>

            {/* Teknik Özellikler */}
            {allSpecKeys.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
                  <h2 className="font-bold text-gray-800 text-sm">Teknik Ozellikler</h2>
                </div>
                {allSpecKeys.map((key, i) => (
                  <div key={key} className={`grid ${colClass} divide-x divide-gray-100 border-b border-gray-50 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}>
                    <div className="col-span-full bg-gray-50 px-5 py-2 text-xs font-semibold text-gray-500 border-b border-gray-100">
                      {key}
                    </div>
                    {selected.map((p) => (
                      <div key={p.id} className="px-5 py-3 text-sm text-gray-700">
                        {p.specs?.[key] || <span className="text-gray-300">—</span>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {selected.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">⚖️</div>
            <div className="text-base font-bold text-gray-700 mb-2">Urunleri Karsilastir</div>
            <div className="text-sm text-gray-400">Yukaridan urun ekleyerek karsilastirmaya baslayin</div>
          </div>
        )}

      </div>
      <Footer />
    </main>
  );
}