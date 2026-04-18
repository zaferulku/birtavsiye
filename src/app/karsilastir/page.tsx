"use client";
import { useState, useRef, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";

type Price = {
  id: string;
  price: number;
  affiliate_url?: string;
  stores: { name: string; url: string };
};

type Product = {
  id: string;
  title: string;
  slug: string;
  brand: string;
  image_url?: string;
  prices: Price[];
};

const STORE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Trendyol:    { bg: "bg-orange-50",  text: "text-orange-700",  dot: "bg-orange-400" },
  MediaMarkt:  { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500" },
  PttAVM:      { bg: "bg-yellow-50",  text: "text-yellow-700",  dot: "bg-yellow-500" },
  Hepsiburada: { bg: "bg-orange-50",  text: "text-orange-800",  dot: "bg-orange-500" },
};

const SORT_OPTIONS = [
  { value: "ucuz",   label: "En Ucuz" },
  { value: "pahali", label: "En Pahalı" },
  { value: "magaza", label: "Çok Mağaza" },
];

export default function KarsilastirSayfasi() {
  const [query, setQuery]       = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading]   = useState(false);
  const [searched, setSearched] = useState(false);
  const [sort, setSort]         = useState("ucuz");
  const [minP, setMinP]         = useState("");
  const [maxP, setMaxP]         = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setProducts([]); setSearched(false); return; }
    setLoading(true);
    setSearched(true);
    const { data } = await supabase
      .from("products")
      .select("id,title,slug,brand,image_url,prices(id,price,affiliate_url,stores(name,url))")
      .or(`title.ilike.%${q}%,brand.ilike.%${q}%`)
      .limit(48);

    if (data) {
      const enriched: Product[] = (data as any[]).map(p => ({
        ...p,
        prices: (p.prices || [])
          .filter((pr: any) => pr.price > 0)
          .sort((a: any, b: any) => a.price - b.price),
      })).filter(p => p.prices.length > 0);
      setProducts(enriched);
    }
    setLoading(false);
  }, []);

  const handleInput = (val: string) => {
    setQuery(val);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => search(val), 400);
  };

  const filtered = products
    .filter(p => {
      const cheap = p.prices[0]?.price ?? 0;
      if (minP && cheap < Number(minP)) return false;
      if (maxP && cheap > Number(maxP)) return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === "ucuz")   return (a.prices[0]?.price ?? Infinity) - (b.prices[0]?.price ?? Infinity);
      if (sort === "pahali") return (b.prices[0]?.price ?? 0) - (a.prices[0]?.price ?? 0);
      if (sort === "magaza") return b.prices.length - a.prices.length;
      return 0;
    });

  return (
    <main className="bg-[#F5F4F0] min-h-screen">
      <Header />

      {/* Arama hero */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <h1 className="text-2xl font-extrabold text-gray-900 mb-1 text-center">Fiyat Karşılaştır</h1>
          <p className="text-sm text-gray-400 text-center mb-6">
            Tüm mağazaların fiyatlarını tek ekranda gör
          </p>
          <div className="flex items-center gap-3 bg-[#F5F4F0] rounded-2xl px-4 py-3 border border-gray-200 focus-within:border-[#E8460A] focus-within:ring-2 focus-within:ring-[#E8460A]/10 transition-all">
            <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={e => handleInput(e.target.value)}
              placeholder="Ürün adı veya marka girin… (örn: iPhone 15, Samsung TV)"
              className="flex-1 bg-transparent text-sm outline-none text-gray-800 placeholder:text-gray-400"
              autoFocus
            />
            {query && (
              <button onClick={() => { setQuery(""); setProducts([]); setSearched(false); }}
                className="text-gray-300 hover:text-gray-500 transition-colors text-lg leading-none">✕</button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-6">

        {/* Filtre + sıralama */}
        {searched && (
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs">
              <span className="text-gray-400 font-medium mr-1">Sırala:</span>
              {SORT_OPTIONS.map(o => (
                <button key={o.value} onClick={() => setSort(o.value)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${sort === o.value ? "bg-[#E8460A] text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                  {o.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs">
              <span className="text-gray-400 font-medium">Fiyat:</span>
              <input type="number" placeholder="Min ₺" value={minP} onChange={e => setMinP(e.target.value)}
                className="w-20 outline-none text-gray-700 placeholder:text-gray-300 text-xs" />
              <span className="text-gray-300">—</span>
              <input type="number" placeholder="Max ₺" value={maxP} onChange={e => setMaxP(e.target.value)}
                className="w-20 outline-none text-gray-700 placeholder:text-gray-300 text-xs" />
            </div>
            {!loading && (
              <span className="ml-auto text-xs text-gray-400 font-medium">{filtered.length} ürün</span>
            )}
          </div>
        )}

        {/* Spinner */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-[#E8460A] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Sonuç yok */}
        {!loading && searched && filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 py-20 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <div className="text-sm font-semibold text-gray-600 mb-1">Sonuç bulunamadı</div>
            <div className="text-xs text-gray-400">Farklı anahtar kelimeler deneyin</div>
          </div>
        )}

        {/* Boş başlangıç */}
        {!loading && !searched && (
          <div className="bg-white rounded-2xl border border-gray-200 py-24 text-center">
            <div className="text-5xl mb-4">💰</div>
            <div className="text-base font-bold text-gray-700 mb-2">En İyi Fiyatı Bul</div>
            <div className="text-sm text-gray-400 mb-5">
              Ürün adını yukarıya yazın, tüm mağaza fiyatlarını karşılaştırın
            </div>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {["iPhone 15", "Samsung Galaxy", "MacBook", "Dyson", "AirPods"].map(s => (
                <button key={s} onClick={() => { setQuery(s); search(s); }}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-orange-50 hover:text-[#E8460A] text-gray-600 text-xs font-semibold rounded-xl transition-all">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Ürün listesi */}
        {!loading && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map(p => {
              const cheapest = p.prices[0];
              const cheapestPrice = cheapest?.price ?? 0;
              return (
                <div key={p.id} className="bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-all overflow-hidden">
                  <div className="flex items-center gap-4 p-4">

                    {/* Ürün resmi */}
                    <Link href={"/urun/" + p.slug} className="flex-shrink-0">
                      <div className="w-20 h-20 bg-gray-50 rounded-xl overflow-hidden border border-gray-100 flex items-center justify-center">
                        {p.image_url
                          ? <img src={p.image_url} alt={p.title} className="w-full h-full object-contain p-2" />
                          : <span className="text-3xl">📦</span>}
                      </div>
                    </Link>

                    {/* Başlık + fiyat rozetleri */}
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-[#E8460A] uppercase tracking-wider mb-0.5">{p.brand}</div>
                      <Link href={"/urun/" + p.slug}>
                        <h2 className="text-sm font-bold text-gray-900 hover:text-[#E8460A] transition-colors line-clamp-2 leading-snug mb-2.5 cursor-pointer">
                          {p.title}
                        </h2>
                      </Link>

                      {/* Mağaza fiyat rozetleri */}
                      <div className="flex flex-wrap gap-1.5">
                        {p.prices.map((pr, i) => {
                          const sc = STORE_COLORS[pr.stores?.name] ?? { bg: "bg-gray-50", text: "text-gray-600", dot: "bg-gray-300" };
                          const diff = i > 0 ? pr.price - cheapestPrice : 0;
                          return (
                            <a key={pr.id}
                              href={pr.affiliate_url || pr.stores?.url || "#"}
                              target="_blank" rel="nofollow sponsored"
                              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all hover:shadow-sm ${sc.bg} ${sc.text} ${i === 0 ? "border-emerald-200 ring-1 ring-emerald-100" : "border-gray-100"}`}>
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sc.dot}`} />
                              <span>{pr.stores?.name}</span>
                              <span className={`font-extrabold ${i === 0 ? "text-emerald-700" : ""}`}>
                                {Number(pr.price).toLocaleString("tr-TR")} ₺
                              </span>
                              {i === 0 && <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-200 px-1 rounded">EN UCUZ</span>}
                              {i > 0 && diff > 0 && <span className="text-[10px] text-red-400">+{diff.toLocaleString("tr-TR")}</span>}
                            </a>
                          );
                        })}
                      </div>
                    </div>

                    {/* Sağ: fiyat + CTA */}
                    <div className="flex-shrink-0 text-right pl-2 border-l border-gray-100 ml-2">
                      <div className="text-2xl font-extrabold text-gray-900 leading-none">
                        {Number(cheapestPrice).toLocaleString("tr-TR")}
                        <span className="text-sm font-normal text-gray-400 ml-0.5">₺</span>
                      </div>
                      <div className="text-[10px] text-emerald-600 font-semibold mb-2.5">{cheapest.stores?.name}</div>
                      <a href={cheapest.affiliate_url || cheapest.stores?.url || "#"}
                        target="_blank" rel="nofollow sponsored"
                        className="inline-flex items-center gap-1 px-3.5 py-2 bg-[#E8460A] text-white text-xs font-bold rounded-xl hover:bg-[#C93A08] transition-all shadow-sm">
                        Siteye Git →
                      </a>
                      <div className="mt-1.5">
                        <Link href={"/urun/" + p.slug}
                          className="text-[10px] text-gray-400 hover:text-[#E8460A] transition-colors font-medium">
                          Detay & Yorumlar
                        </Link>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
