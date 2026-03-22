import { supabase } from "../../../lib/supabase";
import Link from "next/link";
import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";
import ProductGallery from "../../components/urun/ProductGallery";
import ProductInfo from "../../components/urun/ProductInfo";
import CommunitySection from "../../components/urun/CommunitySection";

export default async function UrunDetay({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const { data: product } = await supabase
    .from("products").select("*").eq("slug", slug).maybeSingle();

  const { data: prices } = await supabase
    .from("prices").select("*, stores(name, url)")
    .eq("product_id", product?.id).order("price", { ascending: true });

  const { data: reviews } = await supabase
    .from("community_posts").select("rating")
    .eq("product_id", product?.id).is("parent_id", null)
    .not("rating", "is", null);

  const reviewCount = reviews?.length || 0;
  const avgRating = reviewCount > 0
    ? Math.round(reviews!.reduce((acc, r) => acc + (r.rating || 0), 0) / reviewCount)
    : 0;

  if (!product) {
    return (
      <main>
        <Header />
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h1 className="font-bold text-2xl mb-4">Urun bulunamadi</h1>
          <Link href="/" className="text-[#E8460A]">Anasayfaya don</Link>
        </div>
        <Footer />
      </main>
    );
  }

  const minPrice = prices && prices.length > 0 ? prices[0].price : null;
  const cheapestStore = prices && prices.length > 0 ? prices[0].stores?.name : null;

  return (
    <main className="bg-gray-50 min-h-screen">
      <Header />
      <div className="max-w-[1400px] mx-auto px-8 py-6">

        {/* Breadcrumb */}
        <div className="flex gap-2 text-sm text-gray-400 mb-5">
          <Link href="/" className="hover:text-[#E8460A]">Anasayfa</Link>
          <span>/</span>
          <span className="text-gray-700">{product.title}</span>
        </div>

        {/* Üst Bölüm: Resim + Bilgi + Fiyat */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
          <div className="grid grid-cols-3 gap-8">
            <ProductGallery imageUrl={product.image_url} />
            <ProductInfo product={product} avgRating={avgRating} reviewCount={reviewCount} />
            <div className="sticky top-20">
              <div className="bg-white border-2 border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-gray-900 px-5 py-5">
                  <div className="text-xs text-gray-400 mb-1">En ucuz fiyat{cheapestStore ? ` - ${cheapestStore}` : ""}</div>
                  <div className="font-extrabold text-3xl text-white">
                    {minPrice ? Number(minPrice).toLocaleString("tr-TR") + " TL" : "Fiyat bekleniyor"}
                  </div>
                </div>
                {cheapestStore && (
                  <button className="w-full bg-[#E8460A] text-white py-3 text-sm font-bold hover:bg-[#C93A08] transition-all">
                    {cheapestStore} sitesine git →
                  </button>
                )}
                <div>
                  {prices?.map((p, i) => (
                    <div key={p.id} className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? "bg-yellow-100 text-yellow-700" : i === 1 ? "bg-gray-100 text-gray-500" : "bg-orange-50 text-orange-600"}`}>
                        {i + 1}
                      </div>
                      <div className="flex-1 text-sm font-medium text-gray-800">{p.stores?.name}</div>
                      <div className="text-right">
                        <div className="font-bold text-sm">{Number(p.price).toLocaleString("tr-TR")} TL</div>
                        {i === 0 && <div className="text-xs text-green-600 font-medium">En ucuz</div>}
                        {i > 0 && minPrice && (
                          <div className="text-xs text-red-400">+{(Number(p.price) - Number(minPrice)).toLocaleString("tr-TR")} TL</div>
                        )}
                      </div>
                      <a href={p.stores?.url || "#"} target="_blank"
                        className="bg-orange-50 text-[#E8460A] text-xs px-3 py-1.5 rounded-lg font-semibold hover:bg-[#E8460A] hover:text-white transition-all">
                        Git
                      </a>
                    </div>
                  ))}
                </div>
                <div className="bg-amber-50 border-t border-amber-100 px-4 py-3 text-xs text-amber-700 cursor-pointer hover:bg-amber-100 transition-all font-medium">
                  🔔 Fiyat duşunce haber ver — Alarm kur
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Yorumlar Bölümü - tam genişlik */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <CommunitySection productId={product.id} />
        </div>

      </div>
      <Footer />
    </main>
  );
}