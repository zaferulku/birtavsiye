import { supabase } from "../../../lib/supabase";
import Link from "next/link";

export default async function Categories() {
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug, icon");

  // Her kategori için ürün sayısını çek
  const categoriesWithCount = await Promise.all(
    (categories || []).map(async (cat) => {
      const { count } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("category_id", cat.id);
      return { ...cat, count: count || 0 };
    })
  );

  return (
    <section className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-syne font-bold text-xl">Kategoriler</h2>
        <span className="text-sm text-[#E8460A] font-medium cursor-pointer">
          Tümünü Gör →
        </span>
      </div>
      <div className="grid grid-cols-6 gap-3">
        {categoriesWithCount.map((c) => (
          <Link href={"/kategori/" + c.slug} key={c.id}>
            <div className="bg-white border border-[#E8E4DF] rounded-xl p-4 text-center cursor-pointer hover:border-[#E8460A] hover:bg-[#FFF0EB] transition-all">
              <div className="text-2xl mb-2">{c.icon}</div>
              <div className="text-xs font-medium">{c.name}</div>
              <div className="text-xs text-[#A8A49F] mt-1">{c.count} ürün</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}