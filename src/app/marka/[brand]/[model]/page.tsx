import { supabase } from "../../../../lib/supabase";
import Header from "../../../components/layout/Header";
import Footer from "../../../components/layout/Footer";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ModelPage({
  params,
}: {
  params: Promise<{ brand: string; model: string }>;
}) {
  const { brand, model } = await params;
  const brandGuess = brand.replace(/-/g, " ");
  const modelGuess = model.replace(/-/g, " ");

  type Row = { slug: string; prices: { price: number }[] | null };

  const { data } = await supabase
    .from("products")
    .select("slug, prices(price)")
    .ilike("brand", brandGuess)
    .ilike("model_family", modelGuess)
    .limit(50);

  const rows = (data ?? []) as Row[];

  if (rows.length === 0) {
    return (
      <main className="bg-gray-50 min-h-screen">
        <Header />
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h1 className="font-bold text-2xl mb-4">Model bulunamadı</h1>
          <Link href={`/marka/${brand}`} className="text-[#E8460A]">Markaya dön</Link>
        </div>
        <Footer />
      </main>
    );
  }

  const minPriceOf = (r: Row): number => {
    const list = r.prices ?? [];
    return list.length > 0 ? Math.min(...list.map(x => x.price)) : Infinity;
  };

  const sorted = rows.slice().sort((a, b) => minPriceOf(a) - minPriceOf(b));
  redirect(`/urun/${sorted[0].slug}`);
}
