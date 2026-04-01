"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../../lib/supabase";
import Link from "next/link";

type Price = { price: number; store: { name: string; logo_url: string | null } };
type Product = {
  id: string; title: string; slug: string; brand: string;
  image_url: string | null; category_id: string | null;
  prices?: Price[];
};
type Category = { id: string; name: string; slug: string; icon: string };

const SORT_OPTIONS = [
  { label: "En Yeni", value: "new" },
  { label: "A → Z", value: "az" },
  { label: "En Düşük Fiyat", value: "price_asc" },
];

export default function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("new");
  const [loading, setLoading] = useState(true);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  useEffect(() => {
    supabase.from("categories").select("id, name, slug, icon")
      .order("name").then(({ data }) => setCategories(data || []));
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("products")
      .select("id, title, slug, brand, image_url, category_id, prices(price, store:stores(name, logo_url))")
      .limit(24);

    if (activeCat) q = q.eq("category_id", activeCat);
    if (search.trim()) q = q.ilike("title", `%${search.trim()}%`);
    if (sort === "az") q = q.order("title", { ascending: true });
    else q = q.order("created_at", { ascending: false });

    const { data } = await q;
    let result = (data as unknown as Product[]) || [];

    if (sort === "price_asc") {
      result = result
        .map(p => ({ ...p, _minPrice: p.prices?.length ? Math.min(...p.prices.map(x => x.price)) : Infinity }))
        .sort((a: any, b: any) => a._minPrice - b._minPrice);
    }

    setProducts(result);
    setLoading(false);
  }, [activeCat, search, sort]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const toggleCompare = (id: string) => {
    setCompareIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  const getLowestPrice = (p: Product) => {
    if (!p.prices?.length) return null;
    return p.prices.reduce((min, x) => x.price < min.price ? x : min, p.prices[0]);
  };

  return (
    <div className="flex flex-col h-full">

      {/* Arama + Sıralama */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Ürün veya marka ara..."
            className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-[#E8460A] transition-all"
          />
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)}
          className="border border-gray-200 rounded-xl px-2.5 py-2 text-xs bg-white outline-none focus:border-[#E8460A] cursor-pointer">
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Kategori Filtreleri */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto scrollbar-hide pb-0.5">
        <button
          onClick={() => setActiveCat(null)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            !activeCat ? "bg-[#E8460A] text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:border-[#E8460A] hover:text-[#E8460A]"
          }`}>
          Tümü
        </button>
        {categories.slice(0, 14).map(c => (
          <button key={c.id} onClick={() => setActiveCat(c.id)}
            className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              activeCat === c.id ? "bg-[#E8460A] text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:border-[#E8460A] hover:text-[#E8460A]"
            }`}>
            <span>{c.icon}</span><span>{c.name}</span>
          </button>
        ))}
      </div>

      {/* Karşılaştırma Barı */}
      {compareIds.length > 0 && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
          <span className="text-xs text-blue-700 font-medium">{compareIds.length} ürün seçildi</span>
          <div className="flex gap-2">
            <button onClick={() => setCompareIds([])} className="text-xs text-gray-500 hover:text-gray-700">Temizle</button>
            <Link href={"/karsilastir?ids=" + compareIds.join(",")}>
              <div className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors">
                Karşılaştır →
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Ürün Grid */}
      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
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
      ) : products.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🔍</div>
            <div className="text-sm text-gray-500 font-medium">Ürün bulunamadı</div>
            <button onClick={() => { setSearch(""); setActiveCat(null); }} className="mt-3 text-xs text-[#E8460A] hover:underline">
              Filtreleri temizle
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 overflow-y-auto">
          {products.map(p => {
            const lowest = getLowestPrice(p);
            const isSelected = compareIds.includes(p.id);
            return (
              <div key={p.id} className={`relative bg-white rounded-2xl border overflow-hidden group transition-all duration-200 hover:shadow-md ${
                isSelected ? "border-blue-400 ring-2 ring-blue-200" : "border-gray-100 hover:border-[#E8460A]/30"
              }`}>
                {/* Karşılaştır checkbox */}
                <button
                  onClick={() => toggleCompare(p.id)}
                  className={`absolute top-2 left-2 z-10 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    isSelected ? "bg-blue-500 border-blue-500" : "bg-white/80 border-gray-300 opacity-0 group-hover:opacity-100"
                  }`}>
                  {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </button>

                <Link href={"/urun/" + p.slug}>
                  {/* Görsel */}
                  <div className="aspect-square bg-gray-50 overflow-hidden flex items-center justify-center">
                    {p.image_url
                      ? <img src={p.image_url} alt={p.title} className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300" />
                      : <span className="text-4xl">📦</span>
                    }
                  </div>

                  {/* Bilgi */}
                  <div className="p-3">
                    <div className="text-[10px] font-bold text-[#E8460A] uppercase tracking-wide mb-0.5">{p.brand}</div>
                    <div className="text-xs font-semibold text-gray-800 line-clamp-2 leading-snug min-h-[2.5rem] mb-2">
                      {p.title}
                    </div>

                    {/* Fiyat */}
                    {lowest ? (
                      <div className="bg-green-50 border border-green-100 rounded-xl px-2.5 py-1.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-[10px] text-green-600 font-medium">En Düşük Fiyat</div>
                            <div className="text-sm font-extrabold text-green-700">
                              {lowest.price.toLocaleString("tr-TR")} ₺
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] text-gray-400">Mağaza</div>
                            <div className="text-xs font-bold text-gray-700 truncate max-w-[60px]">
                              {lowest.store.name}
                            </div>
                          </div>
                        </div>
                        {(p.prices?.length ?? 0) > 1 && (
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            +{(p.prices?.length ?? 1) - 1} mağaza daha
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-100 rounded-xl px-2.5 py-1.5 text-center">
                        <div className="text-[10px] text-gray-400">Fiyat bilgisi yok</div>
                        <div className="text-xs font-semibold text-[#E8460A] mt-0.5">Fiyatları Gör →</div>
                      </div>
                    )}
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer link */}
      {products.length > 0 && (
        <div className="mt-4 text-center">
          <Link href="/ara?q=" className="text-xs text-[#E8460A] font-semibold hover:underline">
            Tüm ürünleri gör →
          </Link>
        </div>
      )}
    </div>
  );
}
