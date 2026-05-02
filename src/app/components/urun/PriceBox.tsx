const prices = [
  { rank: 1, shop: "Trendyol", ship: "Ücretsiz · 2-3 gün", price: "74.999", diff: "En ucuz", diffColor: "text-green-600" },
  { rank: 2, shop: "Hepsiburada", ship: "Ücretsiz · 1-2 gün", price: "76.499", diff: "+1.500 ₺", diffColor: "text-red-500" },
  { rank: 3, shop: "Amazon TR", ship: "Prime · 1 gün", price: "77.200", diff: "+2.201 ₺", diffColor: "text-red-500" },
  { rank: 4, shop: "MediaMarkt", ship: "Mağazadan · Bugün", price: "78.990", diff: "+3.991 ₺", diffColor: "text-red-500" },
  { rank: 5, shop: "Vatan", ship: "Ücretsiz · 2-4 gün", price: "79.499", diff: "+4.500 ₺", diffColor: "text-red-500" },
];

const rankColors = [
  "bg-yellow-100 text-yellow-800",
  "bg-slate-100 text-slate-600",
  "bg-red-50 text-red-800",
  "bg-green-50 text-green-800",
  "bg-purple-50 text-purple-800",
];

export default function PriceBox() {
  return (
    <div className="sticky top-20">
      <div className="bg-white border-2 border-[#E8E4DF] rounded-2xl overflow-hidden">
        <div className="bg-[#0F0E0D] px-4 py-4">
          <div className="text-xs text-[#888] mb-1">En ucuz fiyat · Trendyol</div>
          <div className="font-syne font-extrabold text-3xl text-white">74.999 ₺</div>
          <div className="text-xs text-[#FF6B35] mt-1">Ücretsiz kargo · 2-3 iş günü</div>
        </div>
        <button className="w-full bg-[#E8460A] text-white py-3 text-sm font-medium hover:bg-[#C93A08] transition-colors">
          Trendyol&apos;a Git →
        </button>
        <div>
          {prices.map((p) => (
            <div
              key={p.shop}
              className="flex items-center gap-3 px-4 py-3 border-b border-[#E8E4DF] last:border-0"
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${rankColors[p.rank - 1]}`}>
                {p.rank}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{p.shop}</div>
                <div className="text-xs text-[#A8A49F]">{p.ship}</div>
              </div>
              <div className="text-right">
                <div className="font-syne font-bold text-sm">{p.price} ₺</div>
                <div className={`text-xs font-medium ${p.diffColor}`}>{p.diff}</div>
              </div>
              <button className="bg-[#FFF0EB] text-[#E8460A] text-xs px-2 py-1 rounded-lg font-medium">
                Git
              </button>
            </div>
          ))}
          <div className="text-center py-2 text-xs text-[#E8460A] font-medium cursor-pointer">
            +9 mağaza daha gör →
          </div>
        </div>
        <div className="bg-yellow-50 border-t border-yellow-200 px-4 py-3 text-xs text-yellow-800 cursor-pointer">
          🔔 Fiyat düşünce haber ver — Alarm kur
        </div>
      </div>

      <div className="bg-white border border-[#E8E4DF] rounded-2xl p-4 mt-3">
        <div className="flex justify-between items-center text-sm font-medium mb-3">
          <span>📊 Fiyat Geçmişi</span>
          <span className="text-xs text-[#A8A49F]">Son 90 gün</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { l: "En düşük", v: "71.500 ₺", c: "text-green-600" },
            { l: "Ortalama", v: "75.800 ₺", c: "text-[#0F0E0D]" },
            { l: "En yüksek", v: "81.200 ₺", c: "text-red-500" },
          ].map((s) => (
            <div key={s.l} className="bg-[#F8F6F2] rounded-lg p-2 text-center">
              <div className="text-xs text-[#A8A49F] mb-1">{s.l}</div>
              <div className={`text-sm font-semibold ${s.c}`}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}