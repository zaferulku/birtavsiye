import { parseQuery, type CategoryRef } from "../src/lib/search/queryParser";
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

const url = env.NEXT_PUBLIC_SUPABASE_URL!;
const adminKey = env.SUPABASE_SERVICE_ROLE_KEY!;
const sb = createClient(url, adminKey);

const { data } = await sb.from("categories").select("slug, parent_slug:slug, name").limit(500);
const cats: CategoryRef[] = (data ?? []).map((c: any) => ({ slug: c.slug, name: c.name }));
console.log("loaded", cats.length, "categories");
console.log("\n=== TEST INPUTS ===");

const tests = [
  "akıllı telefon önerir misin",
  "akilli telefon",
  "telefon",
  "iphone",
  "iphone 16",
  "laptop",
  "samsung telefon",
];

for (const q of tests) {
  const parsed = parseQuery(q, cats);
  console.log(`"${q}":`);
  console.log("  category_slugs:", parsed.category_slugs);
  console.log("  brand:", parsed.brand);
  console.log("  semantic_keywords:", parsed.semantic_keywords);
}
