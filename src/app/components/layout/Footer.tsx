export default function Footer() {
  return (
    <footer className="bg-[#0F0E0D] text-[#666] mt-12 py-8 sm:py-10 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-8">
          <div>
            <div className="font-syne font-extrabold text-xl text-[#E8460A] mb-3">
              birtavsiye.net
            </div>
            <p className="text-sm leading-relaxed">
              Türkiye'nin en kapsamlı ürün öneri ve fiyat karşılaştırma platformu.
            </p>
          </div>
          <div>
            <div className="text-sm font-medium text-[#ccc] mb-3">Kategoriler</div>
            {["Elektronik", "Kozmetik", "Ev & Yaşam", "Spor"].map((l) => (
              <div key={l} className="text-sm mb-2 cursor-pointer hover:text-white transition-colors">{l}</div>
            ))}
          </div>
          <div>
            <div className="text-sm font-medium text-[#ccc] mb-3">Keşfet</div>
            {["En İyi Listeler", "Fırsatlar", "Blog", "Yeni Ürünler"].map((l) => (
              <div key={l} className="text-sm mb-2 cursor-pointer hover:text-white transition-colors">{l}</div>
            ))}
          </div>
          <div>
            <div className="text-sm font-medium text-[#ccc] mb-3">Kurumsal</div>
            {["Hakkımızda", "İletişim", "Gizlilik", "KVKK"].map((l) => (
              <div key={l} className="text-sm mb-2 cursor-pointer hover:text-white transition-colors">{l}</div>
            ))}
          </div>
        </div>
        <div className="border-t border-[#222] pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-[#444]">
          <span>© 2025 birtavsiye.net · Tüm hakları saklıdır</span>
          <span>Türkiye'de 🇹🇷 sevgiyle yapıldı</span>
        </div>
      </div>
    </footer>
  );
}