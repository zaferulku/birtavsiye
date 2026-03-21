import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";
import ProductGallery from "../../components/urun/ProductGallery";
import ProductInfo from "../../components/urun/ProductInfo";
import PriceBox from "../../components/urun/PriceBox";
import CommunitySection from "../../components/urun/CommunitySection";

export default function UrunDetay() {
  return (
    <main>
      <Header />
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex gap-2 text-sm text-[#A8A49F] mb-6">
          <span className="cursor-pointer hover:text-[#E8460A]">Anasayfa</span>
          <span>/</span>
          <span className="cursor-pointer hover:text-[#E8460A]">Elektronik</span>
          <span>/</span>
          <span className="cursor-pointer hover:text-[#E8460A]">Akıllı Telefon</span>
          <span>/</span>
          <span className="text-[#0F0E0D]">iPhone 16 Pro 256GB</span>
        </div>
        <div className="grid grid-cols-3 gap-6 mb-8">
          <ProductGallery />
          <ProductInfo />
          <PriceBox />
        </div>
        <CommunitySection />
      </div>
      <Footer />
    </main>
  );
}