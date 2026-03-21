const products = [
  { emoji: "📱", cat: "Akıllı Telefon", name: "Samsung Galaxy S25 Ultra 512GB", rating: "4.7", reviews: "2.140", price: "62.499", shops: 18, badge: "🔥 Çok Satan", badgeColor: "bg-[#E8460A]" },
  { emoji: "🎧", cat: "Kulaklık", name: "Sony WH-1000XM5 ANC Kulaklık", rating: "4.9", reviews: "3.820", price: "8.999", shops: 22, badge: "⚡ %22 İndirim", badgeColor: "bg-[#7C3AED]" },
  { emoji: "💻", cat: "Laptop", name: "MacBook Air M3 13\" 8GB 256GB", rating: "4.8", reviews: "940", price: "47.499", shops: 12, badge: "✨ Yeni", badgeColor: "bg-[#059669]" },
  { emoji: "⌚", cat: "Akıllı Saat", name: "Apple Watch Series 10 46mm GPS", rating: "4.6", reviews: "580", price: "19.999", shops: 9, badge: "", badgeColor: "" },
];

export default function FeaturedProducts() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-10 pt-0">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-syne font-bold text-xl">Öne Çıkan Ürünler</h2>
        <span className="text-sm text-[#E8460A] font-medium cursor-pointer">
          Tümünü Gör →
        </span>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {products.map((p) => (
          <div
            key={p.name}
            className="bg-white border border-[#E8E4DF] rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg transition-all"
          >
            <div className="h-40 bg-[#F8F6F2] flex items-center justify-center text-5xl relative">
              {p.badge && (
                <span className={`absolute top-2 left-2 ${p.badgeColor} text-white text-xs font-semibold px-2 py-1 rounded`}>
                  {p.badge}
                </span>
              )}
              <span className="absolute top-2 right-2 bg-white border border-[#E8E4DF] rounded-full w-7 h-7 flex items-center justify-center text-sm cursor-pointer hover:border-[#E8460A]">
                ♡
              </span>
              {p.emoji}
            </div>
            <div className="p-3">
              <div className="text-xs font-semibold text-[#E8460A] uppercase tracking-wide mb-1">
                {p.cat}
              </div>
              <div className="text-sm font-medium leading-snug mb-2">{p.name}</div>
              <div className="flex items-center gap-1 mb-3 text-xs">
                <span className="text-yellow-400">★★★★★</span>
                <span className="font-medium">{p.rating}</span>
                <span className="text-[#A8A49F]">· {p.reviews} görüş</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-syne font-bold text-lg text-[#E8460A]">
                    {p.price} ₺
                  </div>
                  <div className="text-xs text-[#A8A49F]">{p.shops} mağaza</div>
                </div>
              </div>
            </div>
            <button className="w-full bg-[#F8F6F2] border-t border-[#E8E4DF] py-2 text-xs font-medium text-[#6B6760] hover:bg-[#FFF0EB] hover:text-[#E8460A] transition-all">
              Fiyatları Karşılaştır →
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}