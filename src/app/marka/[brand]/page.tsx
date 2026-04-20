import { supabase } from "../../../lib/supabase";
import { fetchCategoryPath } from "../../../lib/categoryTree";
import { redirect } from "next/navigation";

// Deprecated — /marka/[brand] → /anasayfa/{chain}/{brand}'e yönlendir
export default async function LegacyBrandRedirect({
  params,
}: {
  params: Promise<{ brand: string }>;
}) {
  const { brand } = await params;
  const brandGuess = brand.replace(/-/g, " ");

  const { data } = await supabase
    .from("products")
    .select("category_id")
    .ilike("brand", brandGuess)
    .limit(500);

  const catCounts = new Map<string, number>();
  for (const r of data ?? []) {
    if (r.category_id) catCounts.set(r.category_id, (catCounts.get(r.category_id) ?? 0) + 1);
  }
  const dominantCatId = [...catCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const categoryPath = dominantCatId ? await fetchCategoryPath(dominantCatId) : [];

  if (categoryPath.length > 0) {
    const chain = categoryPath.map(c => c.slug).join("/");
    redirect(`/anasayfa/${chain}/${brand}`);
  }
  redirect("/");
}
