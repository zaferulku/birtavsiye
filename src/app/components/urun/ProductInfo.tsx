export default function ProductInfo() {
  return (
    <div>
      <div className="text-xs font-bold text-[#E8460A] uppercase tracking-wider mb-2">
        Apple
      </div>
      <h1 className="font-syne font-bold text-2xl leading-tight mb-3">
        iPhone 16 Pro 256GB Doğal Titanyum
      </h1>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-yellow-400 text-sm">★★★★★</span>
        <span className="font-medium text-sm">4.8</span>
        <span className="text-[#A8A49F] text-sm">· 1.284 topluluk görüşü</span>
        <span className="text-[#E8E4DF]">|</span>
        <span className="text-[#A8A49F] text-sm">👁 48.2K görüntüleme</span>
      </div>
      <div className="flex gap-2 flex-wrap mb-4">
        {["🔥 Çok Satan", "✅ Resmi garanti", "🛡️ 2 yıl", "📦 Hızlı kargo"].map((t) => (
          <span
            key={t}
            className="bg-[#F8F6F2] border border-[#E8E4DF] text-[#6B6760] text-xs px-3 py-1 rounded-full"
          >
            {t}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {[
          { l: "İşlemci", v: "Apple A18 Pro" },
          { l: "Ekran", v: '6.3" Super Retina XDR' },
          { l: "Kamera", v: "48MP + 48MP + 12MP" },
          { l: "Batarya", v: "3.582 mAh" },
          { l: "RAM", v: "8 GB" },
          { l: "Depolama", v: "256 GB" },
        ].map((s) => (
          <div key={s.l} className="bg-[#F8F6F2] rounded-xl p-3">
            <div className="text-xs text-[#A8A49F] mb-1">{s.l}</div>
            <div className="text-xs font-medium">{s.v}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap">
        {["♡ Favorilere Ekle", "⊕ Karşılaştır", "↑ Paylaş", "🔔 Fiyat Alarmı"].map((b) => (
          <button
            key={b}
            className="bg-white border border-[#E8E4DF] rounded-lg px-3 py-2 text-xs text-[#6B6760] hover:border-[#E8460A] hover:text-[#E8460A] transition-all"
          >
            {b}
          </button>
        ))}
      </div>
    </div>
  );
}