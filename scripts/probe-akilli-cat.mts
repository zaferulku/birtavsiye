import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf-8")
  .split("\n")
  .filter((l) => l && !l.startsWith("#"))
  .reduce<Record<string, string>>((acc, l) => {
    const [k, ...v] = l.split("=");
    if (k && v.length) acc[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
    return acc;
  }, {});

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!);

const { data } = await sb
  .from("categories")
  .select("slug, name, keywords, exclude_keywords, related_brands")
  .or("slug.eq.elektronik/telefon/akilli-telefon,slug.like.%akilli-telefon")
  .limit(5);

console.log("Matched categories:", data?.length);
for (const c of data ?? []) {
  console.log(`\nslug: ${c.slug}`);
  console.log(`  name: ${c.name}`);
  console.log(`  keywords: ${JSON.stringify(c.keywords)}`);
  console.log(`  exclude_keywords: ${JSON.stringify(c.exclude_keywords)}`);
  console.log(`  related_brands: ${JSON.stringify(c.related_brands?.slice(0, 5))}`);
}
