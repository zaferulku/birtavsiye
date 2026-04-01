import { supabase } from "../../../lib/supabase";
import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";
import Link from "next/link";

type Price = { price: number; stores: { name: string } | null };
type Product = {
  id: string; title: string; slug: string; brand: string;
  description: string; image_url: string | null;
  prices?: Price[];
};

export default async function KategoriSayfasi({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ marka?: string; siralama?: string }>;
}) {
  const { slug } = await params;
  const { marka, siralama } = await searchParams;

  const { data: category } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  let query = supabase
    .from("products")
    .select("id, title, slug, brand, description, image_url, prices(price, stores(name))", { count: "exact" })
    .eq("category_id", category?.id);

  if (marka) query = query.eq("brand", marka);

  if (siralama === "az") query = query.order("title", { ascending: true });
  else if (siralama === "za") query = query.order("title", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  const { data: rawProducts, count } = await query.limit(96);

  let products = (rawProducts as unknown as Product[]) || [];

  if (siralama === "fiyat-asc") {
    products = [...products].sort((a, b) => {
      const pa = a.prices?.length ? Math.min(...a.prices.map(x => x.price)) : Infinity;
      const pb = b.prices?.length ? Math.min(...b.prices.map(x => x.price)) : Infinity;
      return pa - pb;
    });
  } else if (siralama === "fiyat-desc") {
    products = [...products].sort((a, b) => {
      const pa = a.prices?.length ? Math.min(...a.prices.map(x => x.price)) : 0;
      const pb = b.prices?.length ? Math.min(...b.prices.map(x => x.price)) : 0;
      return pb - pa;
    });
  }

  // Markalar listesi
  const { data: allProducts } = await supabase
    .from("products")
    .select("brand")
    .eq("category_id", category?.id);

  const brandCounts: Record<string, number> = {};
  (allProducts || []).forEach(p => {
    if (p.brand) brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1;
  });
  const brands = Object.entries(brandCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  if (!category) {
    return (
      <main>
        <Header />
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h1 className="font-bold text-2xl mb-4">Kategori bulunamadı</h1>
          <Link href="/" className="text-[#E8460A]">Anasayfaya dön</Link>
        </div>
        <Footer />
      </main>
    );
  }

  const buildHref = (opts: { marka?: string | null; siralama?: string }) => {
    const params = new URLSearchParams();
    const m = opts.marka !== undefined ? opts.marka : marka;
    const s = opts.siralama !== undefined ? opts.siralama : siralama;
    if (m) params.set("marka", m);
    if (s) params.set("siralama", s);
    const qs = params.toString();
    return "/kategori/" + slug + (qs ? "?" + qs : "");
  };

  return (
    <main className="bg-[#F8F6F2] min-h-screen">
      <Header />

      {/* Hero */}
      <div className="bg-[#0F0E0D] text-white px-6 py-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex gap-2 text-sm text-[#666] mb-2">
            <Link href="/" className="hover:text-white transition-colors">Anasayfa</Link>
            <span>/</span>
            <span className="text-white">{category.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <h1 className="font-extrabold text-2xl flex items-center gap-2">
              <span>{category.icon}</span>{category.name}
            </h1>
            <span className="text-sm text-[#888]">{count || 0} ürün</span>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-6 flex gap-6">

        {/* Sol: Marka filtresi sidebar */}
        <aside className="w-52 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-[#E8E4DF] overflow-hidden sticky top-24">
            <div className="px-4 py-3 border-b border-[#E8E4DF]">
              <div className="font-bold text-sm text-gray-800">Marka</div>
            </div>
            <div className="py-2 max-h-96 overflow-y-auto">
              <Link href={buildHref({ marka: null })}>
                <div className={`flex items-center justify-between px-4 py-2 text-sm cursor-pointer transition-colors ${!marka ? "text-[#E8460A] font-semibold bg-orange-50" : "text-gray-700 hover:bg-gray-50"}`}>
                  <span>Tümü</span>
                  <span className="text-xs text-gray-400">{count || 0}</span>
                </div>
              </Link>
              {brands.map((b) => (
                <Link key={b.name} href={buildHref({ marka: b.name })}>
                  <div className={`flex items-center justify-between px-4 py-2 text-sm cursor-pointer transition-colors ${marka === b.name ? "text-[#E8460A] font-semibold bg-orange-50" : "text-gray-700 hover:bg-gray-50"}`}>
                    <span>{b.name}</span>
                    <span className="text-xs text-gray-400">{b.count}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </aside>

        {/* Sağ: Ürün grid */}
        <div className="flex-1 min-w-0">
          {/* Sıralama bar */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="text-sm text-gray-500">
              {marka && <span className="font-semibold text-gray-800">{marka}</span>}
              {marka && " · "}
              {products.length} ürün gösteriliyor
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500">Sırala:</span>
              {[
                { label: "En Yeni", val: "" },
                { label: "En Ucuz", val: "fiyat-asc" },
                { label: "En Pahalı", val: "fiyat-desc" },
                { label: "A → Z", val: "az" },
                { label: "Z → A", val: "za" },
              ].map(({ label, val }) => (
                <Link key={val} href={buildHref({ siralama: val || undefined })}>
                  <div className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    (siralama || "") === val
                      ? "bg-[#E8460A] text-white border-[#E8460A]"
                      : "border-gray-200 text-gray-600 hover:border-[#E8460A] hover:text-[#E8460A]"
                  }`}>{label}</div>
                </Link>
              ))}
            </div>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-[#E8E4DF]">
              <div className="text-4xl mb-3">{category.icon}</div>
              <div className="text-sm font-medium text-gray-700 mb-1">Ürün bulunamadı</div>
              <div className="text-xs text-gray-400">Farklı bir marka seç veya filtreyi kaldır</div>
              <Link href={"/kategori/" + slug} className="text-xs text-[#E8460A] mt-3 block hover:underline">
                Filtreyi kaldır →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {products.map((p) => {
                const minPrice = p.prices?.length
                  ? p.prices.reduce((min, x) => x.price < min.price ? x : min, p.prices[0])
                  : null;
                return (
                  <Link href={"/urun/" + p.slug} key={p.id}>
                    <div className="bg-white border border-[#E8E4DF] rounded-2xl overflow-hidden hover:shadow-lg hover:border-[#E8460A]/30 transition-all group flex flex-col h-full">
                      <div className="h-44 bg-[#F8F6F2] flex items-center justify-center overflow-hidden">
                        {p.image_url
                          ? <img src={p.image_url} alt={p.title} className="h-full w-full object-contain p-4 group-hover:scale-105 transition-transform duration-300" />
                          : <span className="text-5xl">{category.icon}</span>
                        }
                      </div>
                      <div className="p-3 flex flex-col flex-1">
                        <div className="text-[10px] font-bold text-[#E8460A] uppercase tracking-wider mb-0.5">{p.brand}</div>
                        <div className="text-xs font-medium text-gray-800 leading-snug line-clamp-2 min-h-[2.5rem] mb-2">{p.title}</div>
                        <div className="mt-auto">
                          {minPrice ? (
                            <div className="bg-green-50 border border-green-100 rounded-xl px-2.5 py-1.5">
                              <div className="text-[10px] text-green-600 font-medium">En Düşük Fiyat</div>
                              <div className="flex items-center justify-between">
                                <div className="text-sm font-extrabold text-green-700">
                                  {minPrice.price.toLocaleString("tr-TR")} ₺
                                </div>
                                {minPrice.stores && (
                                  <div className="text-[10px] text-gray-500 font-semibold truncate max-w-[60px]">
                                    {minPrice.stores.name}
                                  </div>
                                )}
                              </div>
                              {(p.prices?.length ?? 0) > 1 && (
                                <div className="text-[10px] text-gray-400 mt-0.5">
                                  +{(p.prices?.length ?? 1) - 1} mağaza
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="w-full bg-[#F8F6F2] border border-[#E8E4DF] rounded-xl py-2 text-xs font-semibold text-gray-600 text-center group-hover:bg-[#E8460A] group-hover:text-white group-hover:border-[#E8460A] transition-all">
                              Fiyatları Karşılaştır →
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  );
}
