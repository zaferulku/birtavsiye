import { supabase } from "../../../../lib/supabase";
import Header from "../../../components/layout/Header";
import Footer from "../../../components/layout/Footer";
import Link from "next/link";
import Image from "next/image";

export const revalidate = 120;

export default async function ModelPage({
  params,
}: {
  params: Promise<{ brand: string; model: string }>;
}) {
  const { brand, model } = await params;
  const brandGuess = brand.replace(/-/g, " ");
  const modelGuess = model.replace(/-/g, " ");

  type PriceRow = { price: number };
  type Row = {
    id: string;
    slug: string;
    title: string;
    brand: string | null;
    image_url: string | null;
    variant_storage: string | null;
    variant_color: string | null;
    specs: Record<string, unknown> | null;
    prices: PriceRow[] | null;
  };

  const { data } = await supabase
    .from("products")
    .select("id, slug, title, brand, image_url, variant_storage, variant_color, specs, prices(price)")
    .ilike("brand", brandGuess)
    .ilike("model_family", modelGuess)
    .limit(200);

  const rows = (data ?? []) as unknown as Row[];

  if (rows.length === 0) {
    return (
      <main className="bg-white min-h-screen">
        <Header />
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h1 className="font-bold text-2xl mb-4">Model bulunamadı</h1>
          <Link href={`/marka/${brand}`} className="text-[#E8460A]">Markaya dön</Link>
        </div>
        <Footer />
      </main>
    );
  }

  const actualBrand = rows[0].brand ?? brandGuess;
  const actualModel = modelGuess.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  const minPriceOf = (r: Row): number => {
    const list = r.prices ?? [];
    return list.length > 0 ? Math.min(...list.map(x => x.price)) : Infinity;
  };

  // Group by (variant_storage, variant_color) — take cheapest per variant
  type VariantGroup = { rep: Row; minPrice: number; count: number; image: string | null };
  const groups = new Map<string, VariantGroup>();
  for (const r of rows) {
    const key = `${r.variant_storage ?? ""}|${r.variant_color ?? ""}`;
    const mp = minPriceOf(r);
    const existing = groups.get(key);
    if (!existing || mp < existing.minPrice) {
      groups.set(key, { rep: r, minPrice: mp, count: (existing?.count ?? 0) + 1, image: r.image_url });
    } else {
      existing.count += 1;
    }
  }

  const variants = [...groups.values()].sort((a, b) => a.minPrice - b.minPrice);
  const cheapest = variants[0];
  const samplePrice = cheapest && isFinite(cheapest.minPrice) ? cheapest.minPrice : null;

  return (
    <main className="bg-white min-h-screen">
      <Header />
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-4 md:py-6">
        <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 text-xs md:text-sm text-gray-500 mb-5">
          <Link href="/" className="hover:text-[#E8460A]">Anasayfa</Link>
          <span>/</span>
          <Link href={`/marka/${brand}`} className="hover:text-[#E8460A]">{actualBrand}</Link>
          <span>/</span>
          <span className="text-gray-800">{actualModel}</span>
        </nav>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{actualBrand} {actualModel}</h1>
            <div className="text-sm text-gray-500 mt-1">{variants.length} varyant · {rows.length} satıcı</div>
          </div>
          {samplePrice !== null && (
            <div className="text-right">
              <div className="text-xs text-gray-500">En ucuz varyanttan</div>
              <div className="text-xl font-bold text-[#E8460A]">{samplePrice.toLocaleString("tr-TR")} TL&apos;den</div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
          {variants.map((v, i) => (
            <Link key={i} href={`/urun/${v.rep.slug}`} className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md hover:border-gray-300 transition group">
              <div className="relative aspect-square bg-white">
                {v.image ? (
                  <Image src={v.image} alt={v.rep.title} fill className="object-contain p-3 group-hover:scale-105 transition-transform" sizes="(max-width: 768px) 50vw, 20vw" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>
                )}
              </div>
              <div className="p-3">
                <div className="flex flex-wrap gap-1 mb-2">
                  {v.rep.variant_storage && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{v.rep.variant_storage}</span>
                  )}
                  {v.rep.variant_color && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-[#E8460A]">{v.rep.variant_color}</span>
                  )}
                </div>
                {isFinite(v.minPrice) ? (
                  <div className="font-bold text-sm">{v.minPrice.toLocaleString("tr-TR")} <span className="text-[10px] font-normal text-gray-400">TL&apos;den</span></div>
                ) : (
                  <div className="text-xs text-gray-400">Fiyat yok</div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
      <Footer />
    </main>
  );
}
