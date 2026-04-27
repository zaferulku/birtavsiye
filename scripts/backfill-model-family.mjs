/**
 * Backfill model_family from product title.
 *
 * Calistirma:
 *   npx tsx --env-file=.env.local scripts/backfill-model-family.mjs --dry-run
 *   npx tsx --env-file=.env.local scripts/backfill-model-family.mjs --dry-run --category=akilli-telefon
 *   npx tsx --env-file=.env.local scripts/backfill-model-family.mjs --category=akilli-telefon
 *   npx tsx --env-file=.env.local scripts/backfill-model-family.mjs --overwrite-all (DIKKAT)
 */
import { createClient } from "@supabase/supabase-js";
import { extractModelFamily, isInvalidModelFamily } from "../src/lib/extractModelFamily.mjs";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const onlyInvalid = !args.includes("--overwrite-all");
const categoryArg = args.find((a) => a.startsWith("--category="))?.split("=")[1];

console.log("Backfill basliyor:");
console.log("  dry-run:", dryRun);
console.log("  mode:", onlyInvalid ? "only-invalid" : "overwrite-all");
console.log("  category:", categoryArg ?? "TUMU");

let q = sb
  .from("products")
  .select("id, title, brand, model_family, model_code, category_id, categories!inner(slug)");
if (categoryArg) q = q.eq("categories.slug", categoryArg);

const { data: products, error } = await q.limit(10000);
if (error) { console.error("Query error:", error); process.exit(1); }

console.log("\n" + products.length + " urun taranacak.\n");

const stats = {
  scanned: 0,
  unchanged: 0,
  fixed_family: 0,
  fixed_code: 0,
  no_pattern_match: 0,
  samples: [],
};

for (const p of products) {
  stats.scanned++;

  const currentInvalid = isInvalidModelFamily(p.model_family);
  if (onlyInvalid && !currentInvalid) {
    stats.unchanged++;
    continue;
  }

  const extracted = extractModelFamily(p.title, p.brand);

  if (!extracted.family) {
    stats.no_pattern_match++;
    if (stats.samples.length < 10) {
      stats.samples.push({ title: (p.title || "").slice(0, 60), brand: p.brand, current: p.model_family, status: "no_match" });
    }
    continue;
  }

  if (extracted.family === p.model_family && extracted.code === p.model_code) {
    stats.unchanged++;
    continue;
  }

  const updates = {};
  if (extracted.family !== p.model_family) {
    updates.model_family = extracted.family;
    stats.fixed_family++;
  }
  if (extracted.code && extracted.code !== p.model_code) {
    updates.model_code = extracted.code;
    stats.fixed_code++;
  }

  if (stats.samples.length < 10) {
    stats.samples.push({
      title: (p.title || "").slice(0, 60),
      old_family: p.model_family,
      new_family: extracted.family,
      new_code: extracted.code,
    });
  }

  if (!dryRun && Object.keys(updates).length > 0) {
    const { error: upErr } = await sb.from("products").update(updates).eq("id", p.id);
    if (upErr) console.error("  fail " + p.id + ":", upErr.message);
  }
}

console.log("\n=== OZET ===");
console.log("Taranan:", stats.scanned);
console.log("Degismedi:", stats.unchanged);
console.log("model_family duzeltildi:", stats.fixed_family);
console.log("model_code duzeltildi:", stats.fixed_code);
console.log("Pattern match yok:", stats.no_pattern_match);

console.log("\nOrnekler:");
for (const s of stats.samples) console.log("  " + JSON.stringify(s));

if (dryRun) console.log("\nDRY-RUN: DB'ye yazilmadi.");
