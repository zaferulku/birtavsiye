#!/usr/bin/env node
/**
 * scripts/migrate-products-to-new-categories.mjs
 *
 * Migration 022 — Eski flat kategori → yeni hierarchik kategori
 * Mevcut ~44K aktif ürünün category_id'sini günceller.
 *
 * KULLANIM:
 *   node --env-file=.env.local scripts/migrate-products-to-new-categories.mjs --dry-run
 *   node --env-file=.env.local scripts/migrate-products-to-new-categories.mjs --apply
 *
 * GÜVENLİK:
 *   - Sadece category_id ve updated_at güncellenir
 *   - GTIN, brand, title, vs DOKUNULMAZ
 *   - Mapping eksikse rapor eder, atla
 *   - PRESERVED_SLUGS (siniflandirilmamis + 14 yeni root) skip
 *
 * BACKUP:
 *   backup_20260430_products_categories tablosu eski category_id'leri tutuyor.
 *   Rollback: UPDATE products SET category_id = b.category_id
 *             FROM backup_20260430_products_categories b WHERE b.id = products.id;
 */

import { createClient } from "@supabase/supabase-js";
import { CATEGORY_MIGRATION_MAP, PRESERVED_SLUGS } from "./category-migration-mapping.mjs";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const APPLY = args.includes("--apply");

if (!DRY && !APPLY) {
  console.error("Usage: --dry-run | --apply");
  process.exit(1);
}

console.log("═══════════════════════════════════════════════════════════");
console.log("  Migration 022 — Eski → Yeni kategori taşıma");
console.log("═══════════════════════════════════════════════════════════");
console.log(`Mode: ${DRY ? "DRY-RUN" : "LIVE APPLY"}`);
console.log();

// 1. Tüm kategorileri çek
const { data: cats, error: catErr } = await sb.from("categories").select("id, slug");
if (catErr) { console.error("read err:", catErr); process.exit(1); }
const slugToId = new Map(cats.map((c) => [c.slug, c.id]));
console.log(`Toplam kategori (DB): ${cats.length}`);

// 2. Mapping integrity — yeni hedef slug'lar DB'de var mı?
const missingTargets = [];
for (const [oldSlug, newSlug] of Object.entries(CATEGORY_MIGRATION_MAP)) {
  if (newSlug === null) continue;
  if (!slugToId.has(newSlug)) {
    missingTargets.push({ old: oldSlug, new: newSlug });
  }
}
if (missingTargets.length > 0) {
  console.error("\n❌ Mapping'deki bazı yeni slug'lar DB'de yok:");
  missingTargets.forEach((m) => console.error(`  ${m.old} → ${m.new}`));
  process.exit(1);
}

// 3. Eski flat kategoriler
const oldFlatSlugs = cats
  .map((c) => c.slug)
  .filter((s) => !s.includes("/") && !PRESERVED_SLUGS.includes(s));
console.log(`\nEski flat kategori sayısı: ${oldFlatSlugs.length}`);

const missingMappings = oldFlatSlugs.filter((s) => !(s in CATEGORY_MIGRATION_MAP));
if (missingMappings.length > 0) {
  console.warn(`\n⚠️ Mapping'de eksik (skip edilecek): ${missingMappings.length}`);
  missingMappings.slice(0, 20).forEach((s) => console.warn(`  ${s}`));
  if (missingMappings.length > 20) console.warn(`  ... +${missingMappings.length - 20} daha`);
}

// 4. Her eski slug için ürün taşıma
let totalMoved = 0;
let totalSkipped = 0;
let totalErrors = 0;
const moveSummary = [];

for (const oldSlug of oldFlatSlugs) {
  const newSlug = CATEGORY_MIGRATION_MAP[oldSlug];
  if (newSlug === null || newSlug === undefined) {
    totalSkipped++;
    continue;
  }
  const oldId = slugToId.get(oldSlug);
  const newId = slugToId.get(newSlug);
  if (!oldId || !newId) {
    console.warn(`  SKIP ${oldSlug}: id lookup fail`);
    totalSkipped++;
    continue;
  }

  const { count } = await sb
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("category_id", oldId);

  if (!count || count === 0) {
    moveSummary.push({ old: oldSlug, new: newSlug, count: 0 });
    continue;
  }

  if (DRY) {
    moveSummary.push({ old: oldSlug, new: newSlug, count, applied: false });
    totalMoved += count;
  } else {
    let movedHere = 0;
    while (true) {
      const { data: ids, error: idErr } = await sb
        .from("products")
        .select("id")
        .eq("category_id", oldId)
        .limit(500);
      if (idErr) { console.error(`  read ${oldSlug} err:`, idErr.message); totalErrors++; break; }
      if (!ids || ids.length === 0) break;
      const idList = ids.map((r) => r.id);

      const { error: upErr } = await sb
        .from("products")
        .update({ category_id: newId, updated_at: new Date().toISOString() })
        .in("id", idList);
      if (upErr) {
        console.error(`  update ${oldSlug} err:`, upErr.message);
        totalErrors += idList.length;
        break;
      }
      movedHere += idList.length;
      if (ids.length < 500) break;
    }
    moveSummary.push({ old: oldSlug, new: newSlug, count: movedHere, applied: true });
    totalMoved += movedHere;
    if (movedHere > 0) {
      process.stdout.write(`  ${oldSlug.padEnd(35)} → ${newSlug.padEnd(45)} ${movedHere}\n`);
    }
  }
}

// 5. Rapor
console.log("\n═══════════════════════════════════════════════════════════");
console.log("  RAPOR");
console.log("═══════════════════════════════════════════════════════════");
console.log(`Toplam eski kategori        : ${oldFlatSlugs.length}`);
console.log(`Mapping'de var              : ${oldFlatSlugs.length - missingMappings.length}`);
console.log(`Mapping eksik (skip)        : ${missingMappings.length}`);
console.log(`${DRY ? "Taşınacak ürün             " : "Taşınan ürün               "}: ${totalMoved}`);
console.log(`Skip (mapping null)         : ${totalSkipped}`);
console.log(`Hata                        : ${totalErrors}`);

if (DRY) {
  console.log("\nTop 30 taşıma planı:");
  moveSummary
    .filter((m) => m.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 30)
    .forEach((m) => {
      console.log(`  ${String(m.count).padStart(5)}  ${m.old.padEnd(35)} → ${m.new}`);
    });
}

console.log("\nDone.");
