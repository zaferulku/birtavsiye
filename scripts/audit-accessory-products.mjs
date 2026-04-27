/**
 * Audit: DB'deki tüm ürünleri checkAccessory ile geç,
 * is_accessory + accessory_reason güncelle.
 *
 * Calistirma:
 *   npx tsx --env-file=.env.local scripts/audit-accessory-products.mjs --dry-run
 *   npx tsx --env-file=.env.local scripts/audit-accessory-products.mjs
 *   npx tsx --env-file=.env.local scripts/audit-accessory-products.mjs --category=akilli-telefon --batch=300
 */
import { createClient } from "@supabase/supabase-js";
import { checkAccessory, hasAccessoryRule } from "../src/lib/accessoryDetector.js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const categoryArg = args.find((a) => a.startsWith("--category="))?.split("=")[1];
const batchSize = Number(args.find((a) => a.startsWith("--batch="))?.split("=")[1] ?? 500);

console.log("Audit basliyor:");
console.log("  dry-run:", dryRun);
console.log("  category:", categoryArg ?? "TUMU");
console.log("  batch:", batchSize);

let categoriesQuery = sb.from("categories").select("id, slug, name");
if (categoryArg) categoriesQuery = categoriesQuery.eq("slug", categoryArg);
const { data: categories, error: catErr } = await categoriesQuery;
if (catErr) { console.error("Kategoriler:", catErr); process.exit(1); }

console.log("\n" + categories.length + " kategori taranacak.\n");

const stats = {
  totalScanned: 0,
  totalFlagged: 0,
  byCategory: {},
  byReason: { title_keyword: 0, title_main_product_missing: 0, price_too_low: 0 },
};

function* chunked(arr, n) {
  for (let i = 0; i < arr.length; i += n) yield arr.slice(i, i + n);
}

for (const cat of categories) {
  if (!hasAccessoryRule(cat.slug)) {
    // Kategori-spesifik kural yok, sadece UNIVERSAL_ACCESSORY_KEYWORDS calisir
  }

  let from = 0;
  const catFlagged = [];
  while (true) {
    // Migration 007 uygulanmadiysa is_accessory yoktur — sadece id+title cek.
    const { data: products, error } = await sb
      .from("products")
      .select("id, title")
      .eq("category_id", cat.id)
      .range(from, from + batchSize - 1);
    if (error) { console.error(error); break; }
    if (!products || products.length === 0) break;

    // listings'den en dusuk fiyat (price_too_low kontrolu icin)
    const ids = products.map((p) => p.id);
    const { data: priceRows } = await sb
      .from("listings")
      .select("product_id, price")
      .in("product_id", ids)
      .eq("is_active", true)
      .gt("price", 0);
    const priceByPid = new Map();
    for (const r of priceRows ?? []) {
      const cur = priceByPid.get(r.product_id);
      if (cur === undefined || r.price < cur) priceByPid.set(r.product_id, r.price);
    }

    for (const p of products) {
      stats.totalScanned++;
      const minPrice = priceByPid.get(p.id);
      const r = checkAccessory(p.title ?? "", cat.slug, minPrice);
      if (r.isAccessory && r.confidence === "high") {
        catFlagged.push({ id: p.id, title: p.title, reason: r.reason, kw: r.matchedKeyword });
        stats.byReason[r.reason] = (stats.byReason[r.reason] ?? 0) + 1;
      }
    }

    from += batchSize;
    if (products.length < batchSize) break;
  }

  if (catFlagged.length > 0) {
    stats.totalFlagged += catFlagged.length;
    stats.byCategory[cat.slug] = catFlagged.length;
    console.log("\n[" + cat.slug + "] " + catFlagged.length + " aksesuar tespit:");
    catFlagged.slice(0, 5).forEach((p) =>
      console.log("  - " + (p.title || "").slice(0, 70) + " (" + p.reason + "/" + (p.kw ?? "-") + ")"),
    );
    if (catFlagged.length > 5) console.log("  ... ve " + (catFlagged.length - 5) + " daha");

    if (!dryRun) {
      const now = new Date().toISOString();
      let updated = 0;
      for (const chunk of chunked(catFlagged, 100)) {
        await Promise.all(chunk.map((p) =>
          sb.from("products").update({
            is_accessory: true,
            accessory_reason: p.reason,
            accessory_detected_at: now,
          }).eq("id", p.id).then(({ error }) => {
            if (error) console.error("  update fail:", p.id, error.message);
            else updated++;
          })
        ));
      }
      console.log("  OK " + updated + " urun is_accessory=true isaretlendi.");
    }
  }
}

console.log("\n=== OZET ===");
console.log("Taranan:", stats.totalScanned);
console.log("Aksesuar:", stats.totalFlagged);
console.log("Kategori dagilimi:", stats.byCategory);
console.log("Sebep dagilimi:", stats.byReason);
if (dryRun) console.log("\nDRY-RUN: DB'ye yazilmadi.");
