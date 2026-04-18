import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter(l => l.includes("=") && !l.startsWith("#"))
    .map(l => { const i = l.indexOf("="); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; })
);

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const patterns = [
  "ikinci el", "2. el", "2.el",
  "kullanılmış", "kullanilmis",
  "teşhir", "teshir",
  "hasarlı", "hasarli",
  "defolu",
  "açık kutu", "acik kutu",
  "open box",
];

const orFilter = patterns.map(p => `title.ilike.%${p}%`).join(",");

const { data: targetProducts, count } = await sb.from("products").select("id", { count: "exact" }).or(orFilter);
console.log(`Silinecek ürün sayısı: ${count}`);

if (!count || count === 0) { console.log("Silinecek ürün yok."); process.exit(0); }

const ids = targetProducts.map(p => p.id);

// Önce bağlı prices kayıtlarını sil
const { error: priceErr } = await sb.from("prices").delete().in("product_id", ids);
if (priceErr) { console.error("prices silme hatası:", priceErr.message); process.exit(1); }
console.log(`✓ İlgili prices silindi.`);

// Sonra products'ları sil
const { error: prodErr } = await sb.from("products").delete().in("id", ids);
if (prodErr) { console.error("products silme hatası:", prodErr.message); process.exit(1); }

console.log(`✓ ${count} ikinci el ürün silindi.`);
