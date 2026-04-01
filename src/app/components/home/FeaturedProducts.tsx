"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../../lib/supabase";
import Link from "next/link";

type Price = { price: number; store: { name: string } };
type Product = {
  id: string; title: string; slug: string; brand: string;
  image_url: string | null; category_id: string | null;
  prices?: Price[];
};
type Category = { id: string; name: string; slug: string; icon: string };

const SORTS = [
  { label: "En Yeni", value: "new" },
  { label: "A → Z", value: "az" },
  { label: "En Ucuz", value: "price_asc" },
];

export default function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("new");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("categories").select("id,name,slug,icon").order("name")
      .then(({ data }) => setCategories(data || []));
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("products")
      .select("id,title,slug,brand,image_url,category_id,prices(price,store:stores(name))")
      .limit(24);
    if (activeCat) q = q.eq("category_id", activeCat);
    if (search.trim()) q = q.ilike("title", `%${search.trim()}%`);
    if (sort === "az") q = q.order("title", { ascending: true });
    else q = q.order("created_at", { ascending: false });
    const { data } = await q;
    let result = (data as unknown as Product[]) || [];
    if (sort === "price_asc") {
      result = [...result].sort((a, b) => {
        const pa = a.prices?.length ? Math.min(...a.prices.map(x => x.price)) : Infinity;
        const pb = b.prices?.length ? Math.min(...b.prices.map(x => x.price)) : Infinity;
        return pa - pb;
      });
    }
    setProducts(result);
    setLoading(false);
  }, [activeCat, search, sort]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const getLowest = (p: Product) =>
    p.prices?.length ? p.prices.reduce((m, x) => x.price < m.price ? x : m, p.prices[0]) : null;

  return (
    <div>
      {/* Arama + Sıralama */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Ürün veya marka ara..."
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-[#E8460A] focus:bg-white transition-all"
          />
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-xs bg-gray-50 outline-none focus:border-[#E8460A] cursor-pointer">
          {SORTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Kategori Filtreleri */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
        <button onClick={() => setActiveCat(null)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            !activeCat ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}>
          Tümü
        </button>
        {categories.slice(0, 16).map(c => (
          <button key={c.id} onClick={() => setActiveCat(c.id)}
            className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              activeCat === c.id ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}>
            <span>{c.icon}</span><span>{c.name}</span>
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-100 overflow-hidden animate-pulse bg-white">
              <div className="aspect-square bg-gray-100" />
              <div className="p-3 space-y-2">
                <div className="h-2 bg-gray-100 rounded w-1/3" />
                <div className="h-3 bg-gray-100 rounded w-full" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-3xl mb-3">🔍</div>
          <div className="text-sm text-gray-400">Ürün bulunamadı</div>
          <button onClick={() => { setSearch(""); setActiveCat(null); }}
            className="mt-2 text-xs text-[#E8460A] hover:underline">Filtreleri temizle</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            {products.map(p => {
              const lowest = getLowest(p);
              return (
                <Link href={"/urun/" + p.slug} key={p.id}>
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden group hover:shadow-md hover:border-gray-200 transition-all duration-200">
                    <div className="aspect-square bg-gray-50 overflow-hidden">
                      {p.image_url
                        ? <img src={p.image_url} alt={p.title} className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300" />
                        : <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>
                      }
                    </div>
                    <div className="p-3">
                      <div className="text-[10px] font-bold text-[#E8460A] uppercase tracking-wide mb-0.5">{p.brand}</div>
                      <div className="text-xs font-semibold text-gray-800 line-clamp-2 leading-snug min-h-[2.5rem] mb-2">{p.title}</div>
                      {lowest ? (
                        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-2.5 py-1.5">
                          <div className="text-sm font-bold text-gray-900">{lowest.price.toLocaleString("tr-TR")} ₺</div>
                          <div className="text-[10px] text-gray-400 truncate max-w-[60px]">{lowest.store.name}</div>
                        </div>
                      ) : (
                        <div className="text-xs text-[#E8460A] font-semibold">Fiyat Karşılaştır →</div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="mt-4 text-center">
            <Link href="/ara?q=" className="text-xs text-gray-400 hover:text-[#E8460A] transition-colors">
              Tüm ürünleri gör →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
