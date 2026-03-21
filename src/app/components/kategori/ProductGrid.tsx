"use client";
import { useState } from "react";

const products = [
  { emoji: "📱", cat: "Akıllı Telefon", name: "iPhone 16 Pro 256GB Doğal Titanyum", rating: "4.8", reviews: "1.284", price: "74.999", oldPrice: "81.200", shops: 14, badge: "🏆 En Tavsiye", badgeColor: "bg-yellow-700" },
  { emoji: "📱", cat: "Akıllı Telefon", name: "Samsung Galaxy S25 Ultra 512GB", rating: "4.7", reviews: "2.140", price: "62.999", oldPrice: "78.500", shops: 18, badge: "🔥 Çok Satan", badgeColor: "bg-[#E8460A]" },
  { emoji: "🎧", cat: "Kulaklık", name: "Sony WH-1000XM5 ANC Kulaklık", rating: "4.9", reviews: "3.820", price: "8.999", oldPrice: "11.500", shops: 22, badge: "⚡ %22 İndirim", badgeColor: "bg-purple-700" },
  { emoji: "💻", cat: "Laptop", name: "MacBook Air M3 13\" 8GB 256GB", rating: "4.8", reviews: "940", price: "47.499", oldPrice: "", shops: 12, badge: "✨ Yeni", badgeColor: "bg-green-700" },
  { emoji: "⌚", cat: "Akıllı Saat", name: "Apple Watch Series 10 46mm GPS", rating: "4.6", reviews: "580", price: "19.999", oldPrice: "", shops: 9, badge: "", badgeColor: "" },
  { emoji: "📺", cat: "TV", name: "Samsung 65\" QLED 4K Smart TV 2025", rating: "4.5", reviews: "1.120", price: "34.999", oldPrice: "39.900", shops: 11, badge: "🔥 Popüler", badgeColor: "bg-[#E8460A]" },
];

export default function ProductGrid() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [favs, setFavs] = useState<number[]>([]);

  const toggleFav = (i: number) => {
    setFavs((prev) => prev.includes(i) ? prev.filter((f) => f !== i) : [...prev, i]);
  };

  return (
    <div className="flex-1">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex-1 text-sm text-[#6B6760]">
          <strong className="text-[#0F0E0D]">42.817</strong> ürün bulundu
        </div>
        <select className="border border-[#E8E4DF] rounded-lg px-3 py-2 text-sm outline-none bg-white focus:border-[#E8460A]">
          <option>En Çok Tavsiye Edilen</option>
          <option>En Düşük Fiyat</option>
          <option>En Yüksek Fiyat</option>
          <option>En Yeni</option>
          <option>En Çok Yorumlanan</option>
        </select>
        <div className="flex gap-1">
          <button
            onClick={() => setView("grid")}
            className={`px-3 py-2 rounded-lg border text-sm transition-all ${view === "grid" ? "border-[#E8460A] text-[#E8460A]" : "border-[#E8E4DF] text-[#6B6760]"}`}
          >
            ▦
          </button>
          <button
            onClick={() => setView("list")}
            className={`px-3 py-2 rounded-lg border text-sm transition-all ${view === "list" ? "border-[#E8460A] text-[#E8460A]" : "border-[#E8E4DF] text-[#6B6760]"}`}
          >
            ☰
          </button>
        </div>
      </div>

      {/* İndirim Banner */}
      <div className="bg-[#0F0E0D] rounded-xl p-4 mb-4 flex items-center gap-4">
        <span className="text-2xl">⚡</span>
        <div className="flex-1">
          <div className="font-syne font-bold text-white text-sm">Bu hafta 1.240 üründe fiyat düştü!</div>
          <div className="text-xs text-[#888] mt-0.5">Topluluk tarafından en çok tavsiye edilen indirimli ürünler</div>
        </div>
        <button className="bg-[#E8460A] text-white text-xs px-4 py-2 rounded-lg font-medium whitespace-nowrap">
          İndirimleri Gör →
        </button>
      </div>

      {/* Grid View */}
      {view === "grid" && (
        <div className="grid grid-cols-3 gap-4">
          {products.map((p, i) => (
            <div key={i} className="bg-white border border-[#E8E4DF] rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg transition-all">
              <div className="h-40 bg-[#F8F6F2] flex items-center justify-center text-5xl relative">
                {p.badge && (
                  <span className={`absolute top-2 left-2 ${p.badgeColor} text-white text-xs font-semibold px-2 py-1 rounded`}>
                    {p.badge}
                  </span>
                )}
                <button
                  onClick={() => toggleFav(i)}
                  className="absolute top-2 right-2 bg-white border border-[#E8E4DF] rounded-full w-7 h-7 flex items-center justify-center text-sm hover:border-[#E8460A] transition-all"
                >
                  {favs.includes(i) ? "♥" : "♡"}
                </button>
                {p.emoji}
              </div>
              <div className="p-3">
                <div className="text-xs font-semibold text-[#E8460A] uppercase tracking-wide mb-1">{p.cat}</div>
                <div className="text-sm font-medium leading-snug mb-2">{p.name}</div>
                <div className="flex items-center gap-1 mb-3 text-xs">
                  <span className="text-yellow-400">★★★★★</span>
                  <span className="font-medium">{p.rating}</span>
                  <span className="text-[#A8A49F]">· {p.reviews} görüş</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-syne font-bold text-lg text-[#E8460A]">{p.price} ₺</div>
                    {p.oldPrice && <div className="text-xs text-[#A8A49F] line-through">{p.oldPrice} ₺</div>}
                  </div>
                  <span className="text-xs text-[#A8A49F] bg-[#F8F6F2] px-2 py-1 rounded">{p.shops} mağaza</span>
                </div>
              </div>
              <button className="w-full bg-[#F8F6F2] border-t border-[#E8E4DF] py-2 text-xs font-medium text-[#6B6760] hover:bg-[#FFF0EB] hover:text-[#E8460A] transition-all">
                Fiyatları Karşılaştır →
              </button>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {view === "list" && (
        <div className="flex flex-col gap-3">
          {products.map((p, i) => (
            <div key={i} className="bg-white border border-[#E8E4DF] rounded-2xl overflow-hidden flex cursor-pointer hover:shadow-md transition-all">
              <div className="w-32 bg-[#F8F6F2] flex items-center justify-center text-4xl flex-shrink-0">
                {p.emoji}
              </div>
              <div className="flex-1 p-4">
                <div className="text-xs font-semibold text-[#E8460A] uppercase mb-1">{p.cat}</div>
                <div className="text-sm font-medium mb-2">{p.name}</div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-yellow-400">★★★★★</span>
                  <span>{p.rating}</span>
                  <span className="text-[#A8A49F]">· {p.reviews} görüş</span>
                  {p.badge && <span className={`${p.badgeColor} text-white px-2 py-0.5 rounded text-xs`}>{p.badge}</span>}
                </div>
              </div>
              <div className="p-4 flex flex-col items-end justify-between min-w-32">
                <div className="text-right">
                  <div className="font-syne font-bold text-lg text-[#E8460A]">{p.price} ₺</div>
                  <div className="text-xs text-[#A8A49F]">{p.shops} mağazada</div>
                </div>
                <button className="bg-[#E8460A] text-white text-xs px-4 py-2 rounded-lg font-medium whitespace-nowrap">
                  En Ucuza Git →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sayfalama */}
      <div className="flex justify-center gap-2 mt-6">
        {["‹", "1", "2", "3", "...", "48", "›"].map((p, i) => (
          <button
            key={i}
            className={`w-9 h-9 rounded-lg border text-sm transition-all ${
              p === "1"
                ? "bg-[#E8460A] border-[#E8460A] text-white"
                : "bg-white border-[#E8E4DF] text-[#6B6760] hover:border-[#E8460A] hover:text-[#E8460A]"
            }`}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}