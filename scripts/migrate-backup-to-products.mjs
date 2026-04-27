/**
 * Backup -> products migrate (Gemini BYPASS).
 *
 * Backup_20260422_products'taki category_id dolu 43K urunu DOGRUDAN
 * products'a kopyalar. Gemini'ye gerek yok — backup zaten classified.
 *
 * Calistirma:
 *   DRY_RUN=1 npx tsx --env-file=.env.local scripts/migrate-backup-to-products.mjs
 *   LIMIT=500 npx tsx --env-file=.env.local scripts/migrate-backup-to-products.mjs
 *   npx tsx --env-file=.env.local scripts/migrate-backup-to-products.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { categorizeFromTitle } from "../src/lib/categorizeFromTitle.mts";

// Title'dan variant_storage extract (GB, TB, ml)
function extractStorage(title) {
  if (!title) return null;
  const m = title.match(/\b(\d+)\s*(GB|TB|ml|L)\b/i);
  return m ? `${m[1]} ${m[2].toUpperCase()}` : null;
}

// Title'dan variant_color extract (TR + EN)
const COLOR_PATTERNS = {
  Siyah: /\b(siyah|black|midnight|space gray)\b/i,
  Beyaz: /\b(beyaz|white|starlight)\b/i,
  Kırmızı: /\b(kırmızı|red|crimson)\b/i,
  Mavi: /\b(mavi|blue|navy)\b/i,
  Yeşil: /\b(yeşil|green|mint)\b/i,
  Sarı: /\b(sarı|yellow|gold)\b/i,
  Pembe: /\b(pembe|pink|rose)\b/i,
  Mor: /\b(mor|purple|violet)\b/i,
  Gri: /\b(gri|gray|grey|silver|gümüş)\b/i,
  Turuncu: /\b(turuncu|orange)\b/i,
  Kahverengi: /\b(kahverengi|brown)\b/i,
};
function extractColor(title) {
  if (!title) return null;
  for (const [color, pattern] of Object.entries(COLOR_PATTERNS)) {
    if (pattern.test(title)) return color;
  }
  return null;
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const dryRun = process.env.DRY_RUN === "1";
const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : Infinity;
const BATCH = 100;

console.log(`Backup -> products migrate${dryRun ? " (DRY-RUN)" : ""}`);
console.log(`LIMIT: ${LIMIT === Infinity ? "ALL" : LIMIT}`);

// 0) Categories slug -> id mapping (backup category_id'leri ORPHAN, yeniden infer)
const slugToId = new Map();
{
  const { data } = await sb.from("categories").select("id, slug");
  data?.forEach((c) => slugToId.set(c.slug, c.id));
}
console.log(`Aktif categories: ${slugToId.size}`);

// 1) Mevcut products slug'lar
const prdSlugs = new Set();
let from1 = 0;
while (true) {
  const { data, error } = await sb.from("products").select("slug").range(from1, from1 + 999);
  if (error) { console.error(error.message); process.exit(1); }
  if (!data || data.length === 0) break;
  data.forEach((p) => prdSlugs.add(p.slug));
  if (data.length < 1000) break;
  from1 += 1000;
}
console.log(`Mevcut products slug: ${prdSlugs.size}`);

// 2) Backup kandidatları
const candidates = [];
let from2 = 0;
while (candidates.length < LIMIT) {
  const { data, error } = await sb
    .from("backup_20260422_products")
    .select("id, slug, title, category_id, brand, description, specs, images, image_url, model_code, model_family, variant_storage, variant_color, source, source_url, icecat_id")
    .not("category_id", "is", null)
    .range(from2, from2 + 999);
  if (error) { console.error(error.message); break; }
  if (!data || data.length === 0) break;
  for (const b of data) {
    if (prdSlugs.has(b.slug)) continue;
    // Backup category_id ORPHAN, title'dan yeniden infer
    const inferred = categorizeFromTitle(b.title || "");
    const newCatId = inferred.slug ? slugToId.get(inferred.slug) : null;
    if (!newCatId) continue;
    b.category_id = newCatId;
    candidates.push(b);
    if (candidates.length >= LIMIT) break;
  }
  if (data.length < 1000) break;
  from2 += 1000;
}
const todo = candidates;
console.log(`Migrate kandidat: ${todo.length}`);

if (dryRun) {
  console.log("DRY-RUN: insert atlandi.");
  todo.slice(0, 5).forEach((b) =>
    console.log(" ", (b.slug || "").slice(0, 55), "| brand:", b.brand, "| cat:", b.category_id?.slice(0, 8)),
  );
  process.exit(0);
}

// 3) Insert
let inserted = 0, dedup = 0, slugConflict = 0, otherFail = 0;
const failReasons = {};

for (let i = 0; i < todo.length; i += BATCH) {
  const batch = todo.slice(i, i + BATCH);
  await Promise.all(batch.map(async (b) => {
    const payload = {
      slug: b.slug,
      title: b.title,
      category_id: b.category_id,
      brand: b.brand,
      description: b.description,
      specs: b.specs,
      images: b.images,
      image_url: b.image_url,
      model_code: b.model_code,
      model_family: b.model_family,
      // Title'dan extract (dedup constraint için benzersiz tuple)
      variant_storage: b.variant_storage || extractStorage(b.title),
      variant_color: b.variant_color || extractColor(b.title),
      icecat_id: b.icecat_id,
      is_active: true,
      is_verified: false,
      classified_by: "backup-restore",
      classified_at: new Date().toISOString(),
      quality_score: 0.7,
    };
    const { error } = await sb.from("products").insert(payload);
    if (error) {
      const msg = error.message;
      if (msg.includes("uq_products_dedup")) dedup++;
      else if (msg.includes("slug")) slugConflict++;
      else {
        otherFail++;
        const k = msg.slice(0, 60);
        failReasons[k] = (failReasons[k] || 0) + 1;
      }
    } else {
      inserted++;
    }
  }));
  if (i % 500 === 0) {
    process.stdout.write(`\r  ${i + batch.length}/${todo.length} | ins=${inserted} dedup=${dedup} slug=${slugConflict} fail=${otherFail}`);
  }
}

console.log(`\n=== SONUC ===`);
console.log(`Insert: ${inserted}`);
console.log(`Dedup skip: ${dedup}`);
console.log(`Slug conflict: ${slugConflict}`);
console.log(`Diger fail: ${otherFail}`);
if (Object.keys(failReasons).length > 0) {
  console.log("Fail sebepleri:");
  Object.entries(failReasons).sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([k, v]) =>
    console.log(`  ${v}x ${k}`),
  );
}
