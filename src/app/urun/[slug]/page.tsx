import { supabase } from "../../../lib/supabase";
import Link from "next/link";
import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";
import ProductGallery from "../../components/urun/ProductGallery";
import CommunitySection from "../../components/urun/CommunitySection";

export default async function UrunDetay({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  const { data: prices } = await supabase
    .from("prices")
    .select("*, stores(name, url)")
    .eq("product_id", product?.id)
    .order("price", { ascending: true });

  if (!product) {
    return (
      <main>
        <Header />
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h1 className="font-syne font-bold text-2xl mb-4">Ürün bulunamadı</h1>
          <Link href="/" className="text-[#E8460A]">Anasayfaya dön</Link>
        </div>
        <Footer />
      </main>
    );
  }

  const minPrice = prices && prices.length > 0 ? prices[0].price : null;
  const cheapestStore = prices && prices.length > 0 ? prices[0].stores?.name : null;

  return (
    <main>
      <Header />
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex gap-2 text-sm text-[#A8A49F] mb-6">
          <Link href="/" className="hover:text-[#E8460A]">Anasayfa</Link>
          <span>/</span>
          <span className="text-[#0F0E0D]">{product.title}</span>
        </div>
        <div className="grid grid-cols-3 gap-6 mb-8">
          <ProductGallery />
          <div>
            <div className="text-xs font-bold text-[#E8460A] uppercase tracking-wider mb-2">
              {product.brand}
            </div>
            <h1 className="font-syne font-bold text-2xl leading-tight mb-3">
              {product.title}
            </h1>
            <p className="text-sm text-[#6B6760] mb-4">{product.description}</p>
            <div className="flex gap-2 flex-wrap mb-4">
              {["✅ Resmi garanti", "🛡️ 2 yıl garanti", "📦 Hızlı kargo"].map((t) => (
                <span key={t} className="bg-[#F8F6F2] border border-[#E8E4DF] text-[#6B6760] text-xs px-3 py-1 rounded-full">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="sticky top-20">
            <div className="bg-white border-2 border-[#E8E4DF] rounded-2xl overflow-hidden">
              <div className="bg-[#0F0E0D] px-4 py-4">
                <div className="text-xs text-[#888] mb-1">
                  En ucuz fiyat · {cheapestStore}
                </div>
                <div className="font-syne font-extrabold text-3xl text-white">
                  {minPrice ? Number(minPrice).toLocaleString("tr-TR") : "—"} ₺
                </div>
              </div>
              <button className="w-full bg-[#E8460A] text-white py-3 text-sm font-medium">
                {cheapestStore}&apos;a Git →
              </button>
              <div>
                {prices?.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#E8E4DF] last:border-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0 ? "bg-yellow-100 text-yellow-800" :
                      i === 1 ? "bg-slate-100 text-slate-600" :
                      "bg-red-50 text-red-800"
                    }`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 text-sm font-medium">{p.stores?.name}</div>
                    <div className="text-right">
                      <div className="font-syne font-bold text-sm">
                        {Number(p.price).toLocaleString("tr-TR")} ₺
                      </div>
                      {i === 0 && <div className="text-xs text-green-600">En ucuz</div>}
                      {i > 0 && (
                        <div className="text-xs text-red-500">
                          +{(Number(p.price) - Number(minPrice)).toLocaleString("tr-TR")} ₺
                        </div>
                      )}
                    </div>
                    <a href={p.stores?.url || "#"} target="_blank" className="bg-[#FFF0EB] text-[#E8460A] text-xs px-2 py-1 rounded-lg font-medium">
                      Git
                    </a>
                  </div>
                ))}
              </div>
              <div className="bg-yellow-50 border-t border-yellow-200 px-4 py-3 text-xs text-yellow-800 cursor-pointer">
                🔔 Fiyat düşünce haber ver — Alarm kur
              </div>
            </div>
          </div>
        </div>
        <CommunitySection />
      </div>
      <Footer />
    </main>
  );
}