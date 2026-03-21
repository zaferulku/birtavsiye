"use client";
import { useState, useEffect, Suspense } from "react";
import { supabase } from "../../lib/supabase";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";

type Product = {
  id: string;
  title: string;
  slug: string;
  brand: string;
  description: string;
};

function AramaIcerik() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get("q") || "";
  const [query, setQuery] = useState(q);
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuery(q);
    if (q) search(q);
    else setResults([]);
  }, [q]);

  const search = async (term: string) => {
  if (!term.trim()) return;
  setLoading(true);

  // Kategori adına göre ara
  const { data: categoryData } = await supabase
    .from("categories")
    .select("id")
    .ilike("name", "%" + term + "%");

  const categoryIds = categoryData?.map((c) => c.id) || [];

  // Ürünleri ara — başlık, marka, açıklama veya kategori
  let queryBuilder = supabase
    .from("products")
    .select("id, title, slug, brand, description")
    .limit(20);

  if (categoryIds.length > 0) {
    queryBuilder = queryBuilder.or(
      `title.ilike.%${term}%,brand.ilike.%${term}%,description.ilike.%${term}%,category_id.in.(${categoryIds.join(",")})`
    );
  } else {
    queryBuilder = queryBuilder.or(
      `title.ilike.%${term}%,brand.ilike.%${term}%,description.ilike.%${term}%`
    );
  }

  const { data } = await queryBuilder;
  if (data) setResults(data);
  setLoading(false);
};

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) router.push("/ara?q=" + encodeURIComponent(query));
  };

  const emojis: Record<string, string> = {
    Apple: "🍎",
    Samsung: "📱",
    Sony: "🎧",
    Xiaomi: "📱",
    Google: "📱",
    OnePlus: "📱",
    Dell: "💻",
    default: "📦",
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <form onSubmit={handleSearch} className="flex gap-3 mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ürün, kategori veya marka ara..."
          className="flex-1 border-2 border-[#E8E4DF] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8460A]"
          autoFocus
        />
        <button
          type="submit"
          className="bg-[#E8460A] text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-[#C93A08] transition-all"
        >
          Ara
        </button>
      </form>

      {loading && (
        <div className="text-center py-16 text-[#A8A49F] text-sm">
          Aranıyor...
        </div>
      )}

      {!loading && q && results.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🔍</div>
          <div className="text-sm font-medium text-[#0F0E0D] mb-1">
            &quot;{q}&quot; için sonuç bulunamadı
          </div>
          <div className="text-xs text-[#A8A49F]">
            Farklı bir kelime dene veya kategori sayfalarına göz at.
          </div>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div>
          <div className="text-sm text-[#6B6760] mb-4">
            <strong className="text-[#0F0E0D]">{results.length}</strong> sonuç bulundu —{" "}
            <span className="text-[#E8460A]">&quot;{q}&quot;</span>
          </div>
          <div className="flex flex-col gap-3">
            {results.map((p) => (
              <Link href={"/urun/" + p.slug} key={p.id}>
                <div className="bg-white border border-[#E8E4DF] rounded-2xl p-4 hover:shadow-md hover:border-[#E8460A] transition-all cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-[#F8F6F2] rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                      {emojis[p.brand] || emojis.default}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-[#E8460A] uppercase tracking-wide mb-1">
                        {p.brand}
                      </div>
                      <div className="text-sm font-medium text-[#0F0E0D] mb-1">
                        {p.title}
                      </div>
                      <div className="text-xs text-[#A8A49F]">
                        {p.description}
                      </div>
                    </div>
                    <div className="text-xs text-[#E8460A] font-medium whitespace-nowrap">
                      Fiyatları Gör →
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!q && !loading && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🔍</div>
          <div className="text-sm font-medium text-[#0F0E0D] mb-1">
            Ne arıyorsun?
          </div>
          <div className="text-xs text-[#A8A49F]">
            Ürün adı, marka veya kategori yaz
          </div>
        </div>
      )}
    </div>
  );
}

export default function AramaSayfasi() {
  return (
    <main>
      <Header />
      <Suspense fallback={<div className="text-center py-20 text-[#A8A49F]">Yükleniyor...</div>}>
        <AramaIcerik />
      </Suspense>
      <Footer />
    </main>
  );
}