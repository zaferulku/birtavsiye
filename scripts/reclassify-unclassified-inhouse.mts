#!/usr/bin/env tsx
/**
 * scripts/reclassify-unclassified-inhouse.mts
 *
 * Mevcut canonical products tablosunda category_id=siniflandirilmamis olan
 * ürünleri title'larından genişletilmiş categorizeFromTitle ile yeniden
 * categorize eder, eşleşenlerin category_id'sini günceller.
 *
 * Faz 1 sonrası 12,918+ ürün siniflandirilmamis kaldı çünkü categorizeFromTitle
 * keyword listesi yetersizdi. categorizeFromTitle.ts genişletildikten sonra
 * (cilt-bakim, makyaj, kamp-outdoor, networking, bilgisayar-bilesenleri için
 * yeni keyword'ler) bu script onları kurtarır.
 *
 * NOT: scripts/reclassify-unclassified.mjs FARKLI — eski SOURCE_CATEGORY_MAP
 * kullanır; bu .mts genişletilmiş categorizeFromTitle'i kullanır.
 *
 * KULLANIM:
 *   npx tsx scripts/reclassify-unclassified-inhouse.mts --dry-run
 *   npx tsx scripts/reclassify-unclassified-inhouse.mts --limit 500
 *   npx tsx scripts/reclassify-unclassified-inhouse.mts            (full)
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const cftMod = await import("../src/lib/categorizeFromTitle.ts");
const categorizeFromTitle = (cftMod as {
  categorizeFromTitle: (t: string) => {
    slug: string | null;
    confidence: "high" | "medium" | "low";
    matchedKeyword?: string;
  };
}).categorizeFromTitle;

const text = readFileSync(".env.local", "utf8");
const env: Record<string, string> = {};
text.split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
});

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const args = process.argv.slice(2);
const FLAG_DRY = args.includes("--dry-run");
function getArg(flag: string, def: string): string {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
}
const ARG_LIMIT = parseInt(getArg("--limit", "0"), 10);
const BATCH = parseInt(getArg("--batch-size", "500"), 10);

console.log("═══════════════════════════════════════════════════════════");
console.log("  reclassify-unclassified-inhouse — siniflandirilmamis → kategori");
console.log("═══════════════════════════════════════════════════════════");
console.log(`Mode: ${FLAG_DRY ? "DRY-RUN" : "LIVE"} | Batch: ${BATCH} | Limit: ${ARG_LIMIT || "all"}`);
console.log();

const { data: cats } = await sb.from("categories").select("id, slug");
const catBySlug = new Map<string, string>(
  ((cats ?? []) as { id: string; slug: string }[]).map((c) => [c.slug, c.id])
);
const unId = catBySlug.get("siniflandirilmamis");
if (!unId) {
  console.error("siniflandirilmamis kategorisi bulunamadı");
  process.exit(1);
}

const stats = {
  total: 0,
  matched: 0,
  still_unclassified: 0,
  updated: 0,
  errors: 0,
  byCategory: new Map<string, number>(),
};
const t0 = Date.now();

// ID cursor pagination — UPDATE'le set küçülse de doğru çalışır.
// (range offset olsaydı LIVE mode'da kayar ve row atlardı.)
let lastId: string | null = null;
while (true) {
  if (ARG_LIMIT && stats.total >= ARG_LIMIT) break;

  let q = sb
    .from("products")
    .select("id, title")
    .eq("category_id", unId)
    .order("id", { ascending: true })
    .limit(BATCH);
  if (lastId) q = q.gt("id", lastId);

  const { data: rows, error } = await q;

  if (error) {
    console.error("Read error:", error);
    break;
  }
  if (!rows || rows.length === 0) break;

  const updates = new Map<string, string[]>();
  let dbgCount = 0;
  for (const row of rows as { id: string; title: string }[]) {
    if (!row.title) continue;
    const res = categorizeFromTitle(row.title);
    if (dbgCount < 5 && stats.total < 5) {
      console.log(`  DEBUG cft("${row.title.slice(0,60)}") → slug=${res.slug ?? "null"} conf=${res.confidence}`);
      dbgCount++;
    }
    if (res.slug && res.confidence !== "low") {
      const newCatId = catBySlug.get(res.slug);
      if (newCatId && newCatId !== unId) {
        if (!updates.has(newCatId)) updates.set(newCatId, []);
        updates.get(newCatId)!.push(row.id);
        stats.byCategory.set(res.slug, (stats.byCategory.get(res.slug) ?? 0) + 1);
        stats.matched++;
        continue;
      }
    }
    stats.still_unclassified++;
  }

  if (!FLAG_DRY) {
    for (const [newCatId, ids] of updates) {
      const { error: upErr } = await sb
        .from("products")
        .update({ category_id: newCatId, classified_at: new Date().toISOString() })
        .in("id", ids);
      if (upErr) {
        console.error(`Update error (cat=${newCatId}, n=${ids.length}):`, upErr.message);
        stats.errors += ids.length;
      } else {
        stats.updated += ids.length;
      }
    }
  } else {
    stats.updated = stats.matched;
  }

  stats.total += rows.length;
  const elapsed = Math.round((Date.now() - t0) / 100) / 10;
  console.log(
    `[${stats.total.toString().padStart(6)}]  matched=${stats.matched}  still=${stats.still_unclassified}  updated=${stats.updated}  errors=${stats.errors}  ${elapsed}s`
  );

  // Sonraki batch için lastId
  lastId = (rows[rows.length - 1] as { id: string }).id;
  if (rows.length < BATCH) break;
}

// Önemli: rows.length < BATCH her zaman doğru olmayabilir; siniflandirilmamis
// içinden okuyoruz ve update'le bu set küçülüyor. Bu yüzden range cursor'u
// kullanırken kayıp olabilir. Çözüm: cursor'u her batch sonrası 0'a sıfırla
// VE WHILE LOOP'u ek pas atılmadığı sürece dur.

const elapsed = Math.round((Date.now() - t0) / 100) / 10;
console.log("\n═══════════════════════════════════════════════════════════");
console.log("  RAPOR");
console.log("═══════════════════════════════════════════════════════════");
console.log(`Toplam unclassified  : ${stats.total}`);
console.log(`Match (yeni kategori): ${stats.matched}`);
console.log(`Hâlâ siniflandırılmamış: ${stats.still_unclassified}`);
console.log(`${FLAG_DRY ? "Update edilecek      " : "Update edildi        "}: ${stats.updated}`);
console.log(`Hata                 : ${stats.errors}`);
console.log(`Süre                 : ${elapsed}s`);
console.log();
console.log("Yeni kategori dağılımı (top 20):");
const top = [...stats.byCategory.entries()].sort(([, a], [, b]) => b - a).slice(0, 20);
top.forEach(([s, n]) => console.log(`  ${s.padEnd(35)} ${n}`));

console.log("\nDone.");
