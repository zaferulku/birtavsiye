import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";
import FilterSidebar from "../../components/kategori/FilterSidebar";
import ProductGrid from "../../components/kategori/ProductGrid";

export default function KategoriSayfasi() {
  return (
    <main>
      <Header />
      <div className="bg-[#0F0E0D] text-white px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex gap-2 text-sm text-[#666] mb-3">
            <span className="cursor-pointer hover:text-white">Anasayfa</span>
            <span>/</span>
            <span className="text-white">Elektronik</span>
          </div>
          <h1 className="font-syne font-extrabold text-3xl mb-2">📱 Elektronik</h1>
          <p className="text-[#888] text-sm mb-5">
            85+ mağazada en iyi fiyatlar ve topluluk tavsiyeleri
          </p>
          <div className="flex gap-3 mb-5 flex-wrap">
            {["Tümü", "Akıllı Telefon", "Laptop", "Kulaklık", "Tablet", "TV", "Kamera"].map((c) => (
              <button
                key={c}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  c === "Tümü"
                    ? "bg-[#E8460A] text-white"
                    : "bg-white/10 text-[#ccc] hover:bg-white/20"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex gap-6">
            {[
              { n: "42.800", l: "Ürün" },
              { n: "85+", l: "Mağaza" },
              { n: "318K", l: "Topluluk Görüşü" },
            ].map((s) => (
              <div key={s.l} className="text-center">
                <div className="font-syne font-bold text-lg text-white">{s.n}</div>
                <div className="text-xs text-[#666] mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-6 py-6 flex gap-6">
        <FilterSidebar />
        <ProductGrid />
      </div>
      <Footer />
    </main>
  );
}