"use client";
import { useState } from "react";

const tabs = ["Topluluk Görüşleri (1.284)", "Teknik Özellikler", "Benzer Ürünler"];

const posts = [
  { avatar: "MK", bg: "bg-yellow-100", color: "text-yellow-800", author: "Mehmet K.", badge: "✅ Satın Aldı", badgeBg: "bg-green-100 text-green-800", type: "💡 Öneri", typeBg: "bg-green-100 text-green-800", info: "Trendyol · 74.999 ₺ · 3 gün önce", title: "Kesinlikle alın — kamera için gelenler hayal kırıklığına uğramaz", text: "3 yıl iPhone 14 Pro kullandım. Gece çekimleri dağlar kadar fark ediyor. 5x zoom inanılmaz pratik. Tek eksi adaptör kutuda yok.", votes: 248, replies: 18, border: "border-[#E8E4DF]" },
  { avatar: "RD", bg: "bg-red-100", color: "text-red-800", author: "Rıza D.", badge: "⚠️ Doğrulandı", badgeBg: "bg-yellow-100 text-yellow-800", type: "⚠️ Uyarı", typeBg: "bg-yellow-100 text-yellow-800", info: "1 hafta önce · 4.8K görüntüleme", title: "Dikkat: Bazı mağazalarda sahte garanti belgesi!", text: "Pazaryeri satıcısından aldım, garanti belgesi farklıydı. Seri numarasını apple.com/tr'den kontrol edin.", votes: 612, replies: 31, border: "border-yellow-200" },
];

export default function CommunitySection() {
  const [activeTab, setActiveTab] = useState(0);
  const [activeType, setActiveType] = useState("💡 Öneri");

  return (
    <div>
      <div className="flex border-b border-[#E8E4DF] mb-6 overflow-x-auto">
        {tabs.map((t, i) => (
          <button
            key={t}
            onClick={() => setActiveTab(i)}
            className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
              activeTab === i
                ? "border-[#E8460A] text-[#E8460A]"
                : "border-transparent text-[#6B6760]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {activeTab === 0 && (
        <div>
          {/* Özet */}
          <div className="bg-white border border-[#E8E4DF] rounded-2xl p-4 flex items-center gap-5 mb-5 flex-wrap">
            {[{ n: "1.284", l: "Görüş" }, { n: "342", l: "Soru & Cevap" }, { n: "4.8", l: "Topluluk Puanı" }].map((s) => (
              <div key={s.l} className="text-center">
                <div className="font-syne font-extrabold text-2xl text-[#E8460A]">{s.n}</div>
                <div className="text-xs text-[#A8A49F] mt-1">{s.l}</div>
              </div>
            ))}
            <div className="flex-1 min-w-48">
              <div className="text-xs font-medium text-[#6B6760] mb-2">Genel memnuniyet</div>
              <div className="h-2 bg-[#E8E4DF] rounded-full overflow-hidden flex">
                <div className="bg-green-500 h-full" style={{ width: "82%" }} />
                <div className="bg-yellow-400 h-full" style={{ width: "11%" }} />
                <div className="bg-red-500 h-full" style={{ width: "7%" }} />
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-green-600 font-medium">%82 olumlu</span>
                <span className="text-yellow-600">%11 nötr</span>
                <span className="text-red-500">%7 olumsuz</span>
              </div>
            </div>
          </div>

          {/* Paylaşım Kutusu */}
          <div className="bg-white border-2 border-dashed border-[#E8E4DF] rounded-2xl p-4 mb-5">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <div className="w-8 h-8 rounded-full bg-[#FFF0EB] flex items-center justify-center text-xs font-bold text-[#E8460A]">
                S
              </div>
              {["💡 Öneri", "❓ Soru", "⚠️ Uyarı", "💎 İpucu"].map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveType(t)}
                  className={`text-xs px-3 py-1 rounded-full border transition-all ${
                    activeType === t
                      ? "bg-[#FFF0EB] border-orange-200 text-[#E8460A]"
                      : "bg-[#F8F6F2] border-[#E8E4DF] text-[#6B6760]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <textarea
              className="w-full bg-[#F8F6F2] rounded-xl p-3 text-sm outline-none resize-none text-[#0F0E0D] placeholder:text-[#A8A49F]"
              rows={3}
              placeholder="Deneyimini paylaş, soru sor veya topluluğu uyar..."
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-[#A8A49F]">Gerçek deneyimler en değerli içerik 👀</span>
              <button className="bg-[#E8460A] text-white text-sm px-4 py-2 rounded-lg font-medium">
                Paylaş →
              </button>
            </div>
          </div>

          {/* Gönderiler */}
          {posts.map((p) => (
            <div key={p.author} className={`bg-white border ${p.border} rounded-2xl p-4 mb-3`}>
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-9 h-9 rounded-full ${p.bg} ${p.color} flex items-center justify-center text-xs font-bold flex-shrink-0`}>
                  {p.avatar}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    {p.author}{" "}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${p.badgeBg}`}>
                      {p.badge}
                    </span>
                  </div>
                  <div className="text-xs text-[#A8A49F] mt-0.5">{p.info}</div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${p.typeBg}`}>
                  {p.type}
                </span>
              </div>
              <div className="text-sm font-medium mb-2">{p.title}</div>
              <div className="text-sm text-[#6B6760] leading-relaxed">{p.text}</div>
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[#E8E4DF]">
                <button className="flex items-center gap-1 bg-[#F8F6F2] border border-[#E8E4DF] rounded-full px-3 py-1 text-xs font-medium text-[#6B6760] hover:border-[#E8460A] hover:text-[#E8460A] transition-all">
                  👍 {p.votes}
                </button>
                <button className="flex items-center gap-1 bg-[#F8F6F2] border border-[#E8E4DF] rounded-full px-3 py-1 text-xs font-medium text-[#6B6760] hover:border-[#E8460A] hover:text-[#E8460A] transition-all">
                  👎
                </button>
                <button className="text-xs text-[#A8A49F] hover:text-[#E8460A]">
                  💬 {p.replies} yanıt
                </button>
              </div>
            </div>
          ))}

          <div className="text-center mt-4">
            <button className="bg-white border border-[#E8E4DF] rounded-xl px-6 py-2 text-sm font-medium text-[#6B6760] hover:border-[#E8460A] hover:text-[#E8460A] transition-all">
              Daha fazla yükle →
            </button>
          </div>
        </div>
      )}

      {activeTab === 1 && (
        <div className="bg-white border border-[#E8E4DF] rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            {[
              ["İşlemci", "Apple A18 Pro (3nm)"],
              ["Ekran", '6.3" Super Retina XDR OLED'],
              ["Çözünürlük", "2622 x 1206 piksel"],
              ["Yenileme Hızı", "120 Hz ProMotion"],
              ["Ana Kamera", "48MP f/1.78"],
              ["Telefoto", "12MP f/2.8 · 5x zoom"],
              ["Batarya", "3.582 mAh"],
              ["Şarj", "27W · MagSafe 25W"],
              ["Bağlantı", "5G · Wi-Fi 7 · USB-C"],
              ["Su Geçirmezlik", "IP68 · 6m · 30dk"],
              ["Ağırlık", "199 g"],
              ["Malzeme", "Titanyum · Ceramic Shield"],
            ].map(([l, v], i) => (
              <tr key={l} className={i % 2 === 0 ? "bg-white" : "bg-[#F8F6F2]"}>
                <td className="px-4 py-3 text-[#6B6760] font-medium w-1/3">{l}</td>
                <td className="px-4 py-3">{v}</td>
              </tr>
            ))}
          </table>
        </div>
      )}

      {activeTab === 2 && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { emoji: "📱", name: "Samsung Galaxy S25 Ultra", price: "59.999" },
            { emoji: "📱", name: "iPhone 16 128GB", price: "62.999" },
            { emoji: "📱", name: "Google Pixel 9 Pro", price: "48.499" },
            { emoji: "📱", name: "OnePlus 13 512GB", price: "34.999" },
          ].map((p) => (
            <div key={p.name} className="bg-white border border-[#E8E4DF] rounded-xl overflow-hidden cursor-pointer hover:shadow-md transition-all">
              <div className="h-24 bg-[#F8F6F2] flex items-center justify-center text-4xl">
                {p.emoji}
              </div>
              <div className="p-3">
                <div className="text-xs font-medium mb-2 leading-snug">{p.name}</div>
                <div className="font-syne font-bold text-sm text-[#E8460A]">{p.price} ₺</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}