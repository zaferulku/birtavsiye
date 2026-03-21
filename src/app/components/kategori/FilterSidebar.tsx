"use client";
import { useState } from "react";

export default function FilterSidebar() {
  const [fiyatMax, setFiyatMax] = useState(150000);

  return (
    <div className="w-56 flex-shrink-0">

      {/* Aktif Filtreler */}
      <div className="bg-[#FFF0EB] border border-orange-200 rounded-xl p-3 mb-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold text-[#E8460A]">Aktif Filtreler</span>
          <span className="text-xs text-[#E8460A] cursor-pointer">Temizle</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {["Elektronik", "4+ Yıldız"].map((f) => (
            <span key={f} className="bg-white border border-orange-200 text-xs text-[#E8460A] px-2 py-1 rounded-full flex items-center gap-1">
              {f} <span className="cursor-pointer font-bold">×</span>
            </span>
          ))}
        </div>
      </div>

      {/* Fiyat */}
      <div className="bg-white border border-[#E8E4DF] rounded-xl overflow-hidden mb-3">
        <div className="px-4 py-3 border-b border-[#E8E4DF] flex justify-between items-center">
          <span className="text-sm font-medium">Fiyat Aralığı</span>
          <span className="text-[#A8A49F] text-sm">−</span>
        </div>
        <div className="p-4">
          <div className="text-xs text-[#A8A49F] mb-3">
            0 ₺ — {fiyatMax.toLocaleString()} ₺
          </div>
          <input
            type="range"
            min={0}
            max={150000}
            step={1000}
            value={fiyatMax}
            onChange={(e) => setFiyatMax(Number(e.target.value))}
            className="w-full accent-[#E8460A]"
          />
          <div className="flex gap-2 mt-3">
            <input className="flex-1 border border-[#E8E4DF] rounded-lg px-2 py-1.5 text-xs outline-none focus:border-[#E8460A]" placeholder="Min ₺" />
            <span className="text-[#A8A49F] text-xs self-center">—</span>
            <input className="flex-1 border border-[#E8E4DF] rounded-lg px-2 py-1.5 text-xs outline-none focus:border-[#E8460A]" placeholder="Max ₺" />
          </div>
          <button className="w-full bg-[#E8460A] text-white rounded-lg py-2 text-xs font-medium mt-2">
            Uygula
          </button>
        </div>
      </div>

      {/* Marka */}
      <div className="bg-white border border-[#E8E4DF] rounded-xl overflow-hidden mb-3">
        <div className="px-4 py-3 border-b border-[#E8E4DF] flex justify-between items-center">
          <span className="text-sm font-medium">Marka</span>
          <span className="text-[#A8A49F] text-sm">−</span>
        </div>
        <div className="p-4">
          {[
            { name: "Apple", count: "4.821" },
            { name: "Samsung", count: "6.340" },
            { name: "Sony", count: "2.190" },
            { name: "Xiaomi", count: "3.870" },
            { name: "Huawei", count: "1.540" },
          ].map((m) => (
            <label key={m.name} className="flex items-center gap-2 py-1.5 cursor-pointer group">
              <input type="checkbox" className="accent-[#E8460A] w-3.5 h-3.5" />
              <span className="text-xs text-[#6B6760] flex-1 group-hover:text-[#E8460A]">{m.name}</span>
              <span className="text-xs text-[#A8A49F]">{m.count}</span>
            </label>
          ))}
          <div className="text-xs text-[#E8460A] mt-2 cursor-pointer">+ 24 marka daha</div>
        </div>
      </div>

      {/* Puan */}
      <div className="bg-white border border-[#E8E4DF] rounded-xl overflow-hidden mb-3">
        <div className="px-4 py-3 border-b border-[#E8E4DF] flex justify-between items-center">
          <span className="text-sm font-medium">Topluluk Puanı</span>
          <span className="text-[#A8A49F] text-sm">−</span>
        </div>
        <div className="p-4">
          {[
            { label: "★★★★★ 5", count: "8.240" },
            { label: "★★★★☆ 4+", count: "24.100" },
            { label: "★★★☆☆ 3+", count: "38.500" },
          ].map((r) => (
            <label key={r.label} className="flex items-center gap-2 py-1.5 cursor-pointer">
              <input type="radio" name="rating" className="accent-[#E8460A] w-3.5 h-3.5" />
              <span className="text-xs text-yellow-500 flex-1">{r.label}</span>
              <span className="text-xs text-[#A8A49F]">{r.count}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Özellikler */}
      <div className="bg-white border border-[#E8E4DF] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E8E4DF] flex justify-between items-center">
          <span className="text-sm font-medium">Özellikler</span>
          <span className="text-[#A8A49F] text-sm">−</span>
        </div>
        <div className="p-4">
          {["Ücretsiz Kargo", "Türkiye Garantili", "İndirimli", "Stokta Var", "Bugün Kargoda"].map((f) => (
            <label key={f} className="flex items-center gap-2 py-1.5 cursor-pointer group">
              <input type="checkbox" className="accent-[#E8460A] w-3.5 h-3.5" />
              <span className="text-xs text-[#6B6760] group-hover:text-[#E8460A]">{f}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}