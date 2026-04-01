"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import Link from "next/link";

type Price = { price: number; store: { name: string } };
type Product = {
  id: string; title: string; slug: string; brand: string;
  image_url: string | null; prices?: Price[];
};

const SECTIONS = [
  { key: "son",     label: "Son Gezilen Ürünler",   icon: "🕐", accent: "#E8460A" },
  { key: "avantaj", label: "En Avantajlı Ürünler",  icon: "🏷️", accent: "#059669" },
  { key: "ozel",    label: "Sana Özel Öneriler",     icon: "✨", accent: "#7C3AED" },
  { key: "popüler", label: "En Çok Değerlendirilen", icon: "⭐", accent: "#D97706" },
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function ProductCard({ p }: { p: Product }) {
  const lowest = p.prices?.length
    ? p.prices.reduce((m, x) => x.price < m.price ? x : m, p.prices[0])
    : null;

  return (
    <Link href={"/urun/" + p.slug}>
      <div className="flex-shrink-0 w-36 bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md hover:border-gray-200 transition-all group cursor-pointer">
        <div className="w-full aspect-square bg-gray-50 overflow-hidden">
          {p.image_url
            ? <img src={p.image_url} alt={p.title} className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300" />
            : <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>
          }
        </div>
        <div className="p-2.5">
          <div className="text-[10px] font-bold text-[#E8460A] uppercase tracking-wide mb-0.5 truncate">{p.brand}</div>
          <div className="text-xs font-medium text-gray-800 line-clamp-2 leading-snug min-h-[2.5rem] mb-1.5">{p.title}</div>
          {lowest ? (
            <div className="text-sm font-bold text-gray-900">{lowest.price.toLocaleString("tr-TR")} <span className="text-xs font-normal text-gray-400">₺</span></div>
          ) : (
            <div className="text-[10px] text-[#E8460A] font-semibold">Fiyatları Gör →</div>
          )}
        </div>
      </div>
    </Link>
  );
}

function Section({ label, icon, accent, products }: { label: string; icon: string; accent: string; products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between px-5 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className="font-bold text-sm text-gray-900">{label}</span>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
        </div>
        <Link href="/ara?q=" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
          Tümünü gör →
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto px-5 pb-1" style={{ scrollbarWidth: "none" }}>
        {products.map(p => <ProductCard key={p.id + label} p={p} />)}
      </div>
    </div>
  );
}

export default function FeaturedProducts() {
  const [sections, setSections] = useState<Record<string, Product[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("products")
      .select("id,title,slug,brand,image_url,prices(price,store:stores(name))")
      .limit(60)
      .then(({ data }) => {
        if (!data) { setLoading(false); return; }
        const all = data as unknown as Product[];
        const s = shuffle(all);
        const chunk = Math.ceil(s.length / 4);
        setSections({
          son:     s.slice(0, chunk),
          avantaj: s.slice(chunk, chunk * 2),
          ozel:    s.slice(chunk * 2, chunk * 3),
          "popüler": s.slice(chunk * 3),
        });
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div className="px-5 py-6 space-y-8">
      {[1, 2, 3].map(i => (
        <div key={i}>
          <div className="h-4 w-40 bg-gray-100 rounded-full mb-3 animate-pulse" />
          <div className="flex gap-3">
            {[1,2,3,4,5].map(j => (
              <div key={j} className="flex-shrink-0 w-36 rounded-2xl bg-gray-100 animate-pulse">
                <div className="aspect-square" />
                <div className="p-2.5 space-y-1.5">
                  <div className="h-2 bg-gray-200 rounded w-2/3" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="py-5">
      {SECTIONS.map(s => (
        <Section
          key={s.key}
          label={s.label}
          icon={s.icon}
          accent={s.accent}
          products={sections[s.key] || []}
        />
      ))}
    </div>
  );
}
