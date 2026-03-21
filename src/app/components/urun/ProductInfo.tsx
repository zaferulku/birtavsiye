"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";

export default function ProductInfo({ product }: { product: any }) {
  const [isFav, setIsFav] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user && product?.id) checkFav(data.user.id);
    });
  }, [product?.id]);

  const checkFav = async (userId: string) => {
    const { data } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", userId)
      .eq("product_id", product.id)
      .maybeSingle();
    setIsFav(!!data);
  };

  const toggleFav = async () => {
    if (!user) { window.location.href = "/giris"; return; }
    setLoading(true);
    if (isFav) {
      await supabase.from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", product.id);
      setIsFav(false);
    } else {
      await supabase.from("favorites").insert({
        user_id: user.id,
        product_id: product.id,
      });
      setIsFav(true);
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-2">
        <div className="text-xs font-bold text-[#E8460A] uppercase tracking-wider">
          {product?.brand}
        </div>
        {/* Favori ikonu */}
        <button
          onClick={toggleFav}
          disabled={loading}
          className={`text-xl transition-all ${
            isFav ? "text-[#E8460A]" : "text-[#D0CBC4] hover:text-[#E8460A]"
          }`}
        >
          {isFav ? "♥" : "♡"}
        </button>
      </div>

      <h1 className="font-syne font-bold text-2xl leading-tight mb-3">
        {product?.title}
      </h1>
      <p className="text-sm text-[#6B6760] mb-4">{product?.description}</p>

      <div className="flex gap-2 flex-wrap mb-4">
        {["✅ Resmi garanti", "🛡️ 2 yıl garanti", "📦 Hızlı kargo"].map((t) => (
          <span key={t} className="bg-[#F8F6F2] border border-[#E8E4DF] text-[#6B6760] text-xs px-3 py-1 rounded-full">
            {t}
          </span>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        <button className="bg-white border border-[#E8E4DF] rounded-lg px-4 py-2 text-xs text-[#6B6760] hover:border-[#E8460A] hover:text-[#E8460A] transition-all">
          ⊕ Karşılaştır
        </button>
        <button className="bg-white border border-[#E8E4DF] rounded-lg px-4 py-2 text-xs text-[#6B6760] hover:border-[#E8460A] hover:text-[#E8460A] transition-all">
          ↑ Paylaş
        </button>
        <button className="bg-white border border-[#E8E4DF] rounded-lg px-4 py-2 text-xs text-[#6B6760] hover:border-[#E8460A] hover:text-[#E8460A] transition-all">
          🔔 Fiyat Alarmı
        </button>
      </div>
    </div>
  );
}