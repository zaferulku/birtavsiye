"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";

function buildAutoDescription(p: { title?: string; brand?: string | null; model_family?: string | null; specs?: Record<string, unknown> | null } | null | undefined): string {
  if (!p) return "";
  const specs = p.specs ?? {};
  const HIGHLIGHT_KEYS = [
    "Ekran Boyutu (inç)", "Ekran boyutu cm / inç", "İşlemci", "RAM Kapasitesi",
    "Bellek Kapasitesi", "Pil Kapasitesi", "Arka Kamera", "Ön Kamera",
    "İşletim Sistemi", "Mobil Telefon Standardı",
  ];
  const highlights: string[] = [];
  for (const k of HIGHLIGHT_KEYS) {
    const v = specs[k];
    if (typeof v === "string" && v.trim()) highlights.push(`${k}: ${v}`);
    if (highlights.length >= 4) break;
  }
  const head = [p.brand, p.model_family].filter(Boolean).join(" ") || p.title || "";
  const body = highlights.length > 0 ? `${head}. ${highlights.join(", ")}.` : head;
  return `${body} Tüm fiyatlar, özellikler ve kullanıcı yorumları birtavsiye.net'te.`.trim();
}

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <svg key={s} className="w-4 h-4" viewBox="0 0 20 20" fill={s <= rating ? "#E8A000" : "#E0E0E0"}>
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ))}
  </div>
);

export default function ProductInfo({ product, avgRating, reviewCount }: {
  product: any;
  avgRating: number;
  reviewCount: number;
}) {
  const [isFav, setIsFav] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user && product?.id) checkFav(data.user.id);
    });
  }, [product?.id]);

  const checkFav = async (_userId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token || !product?.id) return;
    const res = await fetch(`/api/me/favorites?product_id=${product.id}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    }).then(r => r.json()).catch(() => null);
    setIsFav(!!res?.favorited);
  };

  const toggleFav = async () => {
    if (!user) { window.location.href = "/giris"; return; }
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) { setLoading(false); return; }
    const auth = { Authorization: `Bearer ${session.access_token}` };
    if (isFav) {
      await fetch(`/api/me/favorites?product_id=${product.id}`, { method: "DELETE", headers: auth });
      setIsFav(false);
    } else {
      await fetch("/api/me/favorites", {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: product.id }),
      });
      setIsFav(true);
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="text-xs font-bold text-[#E8460A] uppercase tracking-wider mb-2">
        {product?.brand}
      </div>

      <div className="flex items-start justify-between mb-2">
        <h1 className="font-bold text-2xl leading-tight text-gray-900 flex-1 pr-4">
          {product?.title}
        </h1>
        <button onClick={toggleFav} disabled={loading}
          className={`text-2xl transition-all mt-1 flex-shrink-0 ${isFav ? "text-[#E8460A]" : "text-gray-200 hover:text-gray-400"}`}>
          {isFav ? "♥" : "♡"}
        </button>
      </div>

      {/* Yıldız puanı - her zaman göster */}
      <button
        onClick={() => document.getElementById("yorumlar")?.scrollIntoView({ behavior: "smooth" })}
        className="flex items-center gap-2 mb-4 group"
      >
        <StarRating rating={avgRating > 0 ? avgRating : 0} />
        {reviewCount > 0 ? (
          <span className="text-sm text-[#E8460A] group-hover:underline">
            {avgRating.toFixed(1)} · {reviewCount} degerlendirme
          </span>
        ) : (
          <span className="text-sm text-gray-400 group-hover:text-[#E8460A] transition-colors">
            Ilk degerlendirmeyi yap →
          </span>
        )}
      </button>

      <p className="text-sm text-gray-500 mb-4 leading-relaxed">{product?.description || buildAutoDescription(product)}</p>

      <div className="flex gap-2 flex-wrap mb-5">
        {["✅ Resmi garanti", "🛡️ 2 yıl garanti", "📦 Hızlı kargo"].map((t) => (
          <span key={t} className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-3 py-1.5 rounded-full font-medium">
            {t}
          </span>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {["⊕ Karşılaştır", "↑ Paylaş", "🔔 Fiyat Alarmı"].map((t) => (
          <button key={t} className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-xs text-gray-600 hover:border-[#E8460A] hover:text-[#E8460A] transition-all font-medium">
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}