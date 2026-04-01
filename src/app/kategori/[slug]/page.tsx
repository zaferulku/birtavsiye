import { supabase } from "../../../lib/supabase";
import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";
import Link from "next/link";

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

  // Tüm ürünleri çek (marka filtresi için)
  let query = supabase
    .from("products")
    .select("id, title, slug, brand, description, image_url", { count: "exact" })
    .eq("category_id", category?.id);

  if (marka) query = query.eq("brand", marka);

  if (siralama === "az") query = query.order("title", { ascending: true });
  else if (siralama === "za") query = query.order("title", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  const { data: products, count } = await query.limit(96);

  // Markalar listesi (filtre için)
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
              <Link href={"/kategori/" + slug + (siralama ? "?siralama=" + siralama : "")}>
                <div className={`flex items-center justify-between px-4 py-2 text-sm cursor-pointer transition-colors ${!marka ? "text-[#E8460A] font-semibold bg-orange-50" : "text-gray-700 hover:bg-gray-50"}`}>
                  <span>Tümü</span>
                  <span className="text-xs text-gray-400">{count || 0}</span>
                </div>
              </Link>
              {brands.map((b) => (
                <Link key={b.name}
                  href={"/kategori/" + slug + "?marka=" + encodeURIComponent(b.name) + (siralama ? "&siralama=" + siralama : "")}>
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
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-500">
              {marka && <span className="font-semibold text-gray-800">{marka}</span>}
              {marka && " · "}
              {products?.length || 0} ürün gösteriliyor
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Sırala:</span>
              {[
                { label: "En Yeni", val: "" },
                { label: "A → Z", val: "az" },
                { label: "Z → A", val: "za" },
              ].map(({ label, val }) => (
                <Link key={val} href={"/kategori/" + slug + "?" + (marka ? "marka=" + encodeURIComponent(marka) + "&" : "") + (val ? "siralama=" + val : "")}>
                  <div className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    (siralama || "") === val
                      ? "bg-[#E8460A] text-white border-[#E8460A]"
                      : "border-gray-200 text-gray-600 hover:border-[#E8460A] hover:text-[#E8460A]"
                  }`}>{label}</div>
                </Link>
              ))}
            </div>
          </div>

          {!products || products.length === 0 ? (
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
              {products.map((p) => (
                <Link href={"/urun/" + p.slug} key={p.id}>
                  <div className="bg-white border border-[#E8E4DF] rounded-2xl overflow-hidden hover:shadow-lg hover:border-[#E8460A]/30 transition-all group">
                    <div className="h-44 bg-[#F8F6F2] flex items-center justify-center overflow-hidden">
                      {p.image_url
                        ? <img src={p.image_url} alt={p.title} className="h-full w-full object-contain p-4 group-hover:scale-105 transition-transform duration-300" />
                        : <span className="text-5xl">{category.icon}</span>
                      }
                    </div>
                    <div className="p-3">
                      <div className="text-[10px] font-bold text-[#E8460A] uppercase tracking-wider mb-0.5">{p.brand}</div>
                      <div className="text-xs font-medium text-gray-800 leading-snug line-clamp-2 min-h-[2.5rem]">{p.title}</div>
                    </div>
                    <div className="px-3 pb-3">
                      <div className="w-full bg-[#F8F6F2] border border-[#E8E4DF] rounded-xl py-2 text-xs font-semibold text-gray-600 text-center group-hover:bg-[#E8460A] group-hover:text-white group-hover:border-[#E8460A] transition-all">
                        Fiyatları Karşılaştır →
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  );
}
