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

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
console.log("URL:", url ? "set" : "missing");
console.log("KEY:", key ? "set" : "missing");

if (!url || !key) process.exit(1);

const sb = createClient(url, key);

console.time("categories");
const cats = await sb
  .from("categories")
  .select("slug")
  .neq("slug", "siniflandirilmamis")
  .limit(200);
console.timeEnd("categories");
console.log("categories: count =", cats.data?.length, " err =", cats.error?.message ?? "none");
if (cats.data?.length) {
  console.log("first 5:", cats.data.slice(0, 5).map((c) => c.slug));
}

console.time("products");
const prods = await sb
  .from("products")
  .select("slug, updated_at")
  .eq("is_active", true)
  .order("created_at", { ascending: false })
  .limit(5);
console.timeEnd("products");
console.log("products: count =", prods.data?.length, " err =", prods.error?.message ?? "none");

console.time("topics");
const tops = await sb
  .from("topics")
  .select("id, created_at")
  .order("created_at", { ascending: false })
  .limit(5);
console.timeEnd("topics");
console.log("topics: count =", tops.data?.length, " err =", tops.error?.message ?? "none");
