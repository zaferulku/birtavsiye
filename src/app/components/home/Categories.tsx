import { supabaseAdmin } from "../../../lib/supabaseServer";
import Link from "next/link";
import { fetchDescendantIds } from "../../../lib/categoryTree";

export default async function Categories() {
  const { data: roots } = await supabaseAdmin
    .from("categories")
    .select("id, name, slug, icon")
    .is("parent_id", null)
    .order("name");

  const rootsWithCount = await Promise.all(
    (roots || []).map(async (cat) => {
      const ids = await fetchDescendantIds(cat.id);
      const { count } = await supabaseAdmin
        .from("products")
        .select("id", { count: "exact", head: true })
        .in("category_id", ids);
      return { ...cat, count: count || 0 };
    })
  );

  return (
    <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-base text-[#0F0E0D]">Kategoriler</h2>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {rootsWithCount.map((c) => (
          <Link href={"/kategori/" + c.slug} key={c.id}>
            <div className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-[#FFF0EB] transition-all cursor-pointer group">
              <div className="w-14 h-14 bg-[#F3F3F3] rounded-full flex items-center justify-center text-2xl group-hover:bg-[#FFE0D6] transition-all">
                {c.icon ?? "📦"}
              </div>
              <div className="text-xs font-medium text-center text-[#0F0E0D] line-clamp-2">{c.name}</div>
              <div className="text-[10px] text-[#A8A49F]">{c.count.toLocaleString("tr-TR")} ürün</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
