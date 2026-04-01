"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import Link from "next/link";

export default function FeaturedProducts() {
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("products")
      .select("id, title, slug, brand, image_url")
      .limit(10)
      .then(({ data }) => setProducts(data || []));
  }, []);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">Öne Çıkan Ürünler</h2>
        <Link href="/ara?q=urun" className="text-sm text-[#E8460A] font-semibold hover:underline">
          Tümünü Gör →
        </Link>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {products.map((p) => (
          <Link href={"/urun/" + p.slug} key={p.id}>
            <div className="bg-white rounded-2xl overflow-hidden group cursor-pointer hover:shadow-lg transition-all duration-300 border border-gray-100">
              <div className="relative aspect-square overflow-hidden bg-gray-50">
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={p.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl">📦</div>
                )}
                <button className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500">
                  ♡
                </button>
              </div>
              <div className="p-3">
                <p className="text-xs text-gray-400 mb-1">{p.brand}</p>
                <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-snug mb-2 min-h-[32px]">
                  {p.title}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#E8460A]">Fiyat Karşılaştır</span>
                  <span className="text-xs text-gray-400">→</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}