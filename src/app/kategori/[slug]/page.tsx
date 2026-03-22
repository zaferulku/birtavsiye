import { supabase } from "../../../lib/supabase";
import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";
import Link from "next/link";

export default async function KategoriSayfasi({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const { data: category } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  const { data: products } = await supabase
    .from("products")
    .select("id, title, slug, brand, description")
    .eq("category_id", category?.id)
    .limit(24);

  return (
    <main>
      <Header />

      {/* Kategori Hero */}
      <div className="bg-[#0F0E0D] text-white px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex gap-2 text-sm text-[#666] mb-3">
            <Link href="/" className="hover:text-white">Anasayfa</Link>
            <span>/</span>
            <span className="text-white">{category?.name || slug}</span>
          </div>
          <h1 className="font-syne font-extrabold text-3xl mb-2">
            {category?.icon} {category?.name || slug}
          </h1>
          <p className="text-[#888] text-sm">
            {products?.length || 0} ürün bulundu
          </p>
        </div>
      </div>

      {/* Ürünler */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {!products || products.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-3">📦</div>
            <div className="text-sm font-medium text-[#0F0E0D] mb-1">
              Bu kategoride henüz ürün yok
            </div>
            <div className="text-xs text-[#A8A49F]">
              Admin panelinden ürün ekleyebilirsin.
            </div>
            <Link href="/" className="text-xs text-[#E8460A] mt-3 block">
              Anasayfaya dön →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {products.map((p) => (
              <Link href={"/urun/" + p.slug} key={p.id}>
                <div className="bg-white border border-[#E8E4DF] rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg transition-all">
                  <div className="h-40 bg-[#F8F6F2] flex items-center justify-center text-5xl">
                    {category?.icon || "📦"}
                  </div>
                  <div className="p-3">
                    <div className="text-xs font-bold text-[#E8460A] uppercase tracking-wide mb-1">
                      {p.brand}
                    </div>
                    <div className="text-sm font-medium leading-snug mb-2">
                      {p.title}
                    </div>
                    <div className="text-xs text-[#A8A49F]">
                      {p.description?.slice(0, 60)}...
                    </div>
                  </div>
                  <div className="w-full bg-[#F8F6F2] border-t border-[#E8E4DF] py-2 text-xs font-medium text-[#6B6760] text-center hover:bg-[#FFF0EB] hover:text-[#E8460A] transition-all">
                    Fiyatları Karşılaştır →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}