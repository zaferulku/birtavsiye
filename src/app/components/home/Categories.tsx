import { supabase } from "../../../lib/supabase";
import Link from "next/link";

export default async function Categories() {
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug, icon");

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
    <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-base text-[#0F0E0D]">Tüm Kategoriler</h2>
        <span className="text-xs text-[#E8460A] font-medium cursor-pointer hover:underline">
          Tümünü Gör →
        </span>
      </div>
      <div className="grid grid-cols-6 gap-3">
        {categoriesWithCount.map((c) => (
          <Link href={"/kategori/" + c.slug} key={c.id}>
            <div className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-[#FFF0EB] transition-all cursor-pointer group">
              <div className="w-14 h-14 bg-[#F3F3F3] rounded-full flex items-center justify-center text-2xl group-hover:bg-[#FFE0D6] transition-all">
                {c.icon}
              </div>
              <div className="text-xs font-medium text-center text-[#0F0E0D]">{c.name}</div>
              <div className="text-xs text-[#A8A49F]">{c.count} ürün</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}