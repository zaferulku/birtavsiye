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
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
console.log("ADMIN_KEY set:", !!adminKey);

const admin = createClient(url, adminKey);
const anon = createClient(url, anonKey);

console.log("\n=== ADMIN ===");
const aCats = await admin.from("categories").select("slug").neq("slug", "siniflandirilmamis").limit(5);
console.log("admin categories:", aCats.data?.length, aCats.error?.message ?? "");
const aProd = await admin.from("products").select("slug").eq("is_active", true).limit(5);
console.log("admin products:", aProd.data?.length, aProd.error?.message ?? "");

console.log("\n=== ANON ===");
const cCats = await anon.from("categories").select("slug").neq("slug", "siniflandirilmamis").limit(5);
console.log("anon categories:", cCats.data?.length, cCats.error?.message ?? "");
const cProd = await anon.from("products").select("slug").eq("is_active", true).limit(5);
console.log("anon products:", cProd.data?.length, cProd.error?.message ?? "");
const cTop = await anon.from("topics").select("id").limit(5);
console.log("anon topics:", cTop.data?.length, cTop.error?.message ?? "");
