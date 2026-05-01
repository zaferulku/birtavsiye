#!/usr/bin/env tsx
/**
 * scripts/classify-backup-inhouse.mts
 *
 * FAZ 1 — Backup'tan Canonical'a IN-HOUSE Classifier (Gemini-siz)
 *
 * AMAÇ:
 *   backup_20260422_products (43,176 satır) → mevcut in-house pipeline ile
 *   classify edip products tablosuna upsert. Gemini'siz, sürdürülebilir.
 *
 * PIPELINE:
 *   1. backup'tan paginated read (500 satır/batch)
 *   2. Her satır:
 *      a. inferProductIdentity(title, brand) → brand+model+variant+slug
 *      b. categorizeFromTitle(title) → category slug + confidence
 *      c. categories.id by slug
 *      d. checkAccessory(title, catSlug) → isAccessory
 *      e. (filter) confidence === null veya brand çok kısa → skip
 *   3. Batch içi slug'ları products tablosunda kontrol et → existing skip
 *   4. Yeni satırları insert + agent_decisions log
 *
 * KULLANIM:
 *   npx tsx scripts/classify-backup-inhouse.mts --dry-run
 *   npx tsx scripts/classify-backup-inhouse.mts --limit 100
 *   npx tsx scripts/classify-backup-inhouse.mts --strict
 *   npx tsx scripts/classify-backup-inhouse.mts            (full run)
 *
 * FLAGS:
 *   --dry-run         : DB değişiklik yok, sadece istatistik
 *   --limit N         : Sadece ilk N satır
 *   --strict          : Yüksek confidence + bilinen brand zorunlu
 *   --batch-size N    : Batch boyutu (default 500)
 *   --no-resume       : products.slug check'i atla (çift insert riski)
 *
 * IDEMPOTENT:
 *   Slug match → skip. Aynı script'i tekrar çalıştırmak ek satır eklemez.
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// tsx ESM .ts uzantı + named import'u runtime'da çözemiyor — dynamic import.
const piMod = await import("../src/lib/productIdentity.ts");
const inferProductIdentity = (piMod as { inferProductIdentity: (i: { title: string; brand?: string | null; specs?: Record<string, string> | null }) => ProductIdentity }).inferProductIdentity;
type ProductIdentity = {
  originalTitle: string;
  brand: string;
  slug: string;
  canonicalTitle: string;
  modelCode: string | null;
  modelFamily: string | null;
  variantStorage: string | null;
  variantColor: string | null;
};

const cftMod = await import("../src/lib/categorizeFromTitle.ts");
const categorizeFromTitle = (cftMod as { categorizeFromTitle: (t: string) => { slug: string | null; confidence: "high" | "medium" | "low"; matchedKeyword?: string } }).categorizeFromTitle;

const accMod = await import("../src/lib/accessoryDetector.ts");
const checkAccessory = (accMod as { checkAccessory: (title: string, catSlug: string, price?: number) => { isAccessory: boolean; reason: string | null; matchedKeyword?: string; confidence: "high" | "medium" | "low" } }).checkAccessory;

const kbMod = await import("../src/lib/data/known-brands.ts");
const KNOWN_BRANDS_TR: string[] = (kbMod as { KNOWN_BRANDS_TR: string[] }).KNOWN_BRANDS_TR;

// ============================================================================
// Env + CLI
// ============================================================================
const text = readFileSync(".env.local", "utf8");
const env: Record<string, string> = {};
text.split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
});

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const args = process.argv.slice(2);
const FLAG_DRY = args.includes("--dry-run");
const FLAG_STRICT = args.includes("--strict");
const FLAG_NO_RESUME = args.includes("--no-resume");

function getArg(flag: string, def: string): string {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
}
const ARG_LIMIT = parseInt(getArg("--limit", "0"), 10);
const BATCH_SIZE = parseInt(getArg("--batch-size", "500"), 10);

const knownBrandLower = new Set(KNOWN_BRANDS_TR.map((b) => b.toLowerCase()));

// ============================================================================
// Helpers
// ============================================================================
type CatRow = { id: string; slug: string };

async function loadCategories(): Promise<{
  bySlug: Map<string, string>;
  unclassifiedId: string | null;
}> {
  const { data } = await sb.from("categories").select("id, slug");
  const bySlug = new Map<string, string>();
  let unclassifiedId: string | null = null;
  (data as CatRow[] | null)?.forEach((c) => {
    bySlug.set(c.slug, c.id);
    if (c.slug === "siniflandirilmamis") unclassifiedId = c.id;
  });
  return { bySlug, unclassifiedId };
}

function isQualityBrand(brand: string): boolean {
  if (!brand || brand.length < 2) return false;
  if (/^\d+$/.test(brand)) return false;
  // Generic non-brand tokens
  const generic = new Set([
    "büyük", "buyuk", "kadın", "kadin", "erkek", "çocuk", "cocuk",
    "genç", "genc", "bluz", "elbise", "ayakkabı", "ayakkabi",
    "pantolon", "tişört", "tisort", "etek", "şort", "sort",
    "damatlık", "damatlik", "uyumlu", "orjinal", "color", "hiking",
    "watch", "smart", "yeni", "kaliteli", "premium",
  ]);
  return !generic.has(brand.toLowerCase());
}

// ============================================================================
// Main
// ============================================================================
console.log("═══════════════════════════════════════════════════════════");
console.log("  Faz 1 in-house classifier — backup_20260422 → products");
console.log("═══════════════════════════════════════════════════════════");
console.log(`Mode: ${FLAG_DRY ? "DRY-RUN" : "LIVE"}${FLAG_STRICT ? " + STRICT" : ""}`);
console.log(`Batch: ${BATCH_SIZE}, Limit: ${ARG_LIMIT || "all"}`);
console.log();

const { bySlug: catBySlug, unclassifiedId } = await loadCategories();
console.log(`Loaded ${catBySlug.size} kategori (siniflandirilmamis_id=${unclassifiedId ?? "—"})`);

const stats = {
  total: 0,
  inserted: 0,
  skipped_existing: 0,
  skipped_low_quality: 0,
  skipped_no_category: 0,
  errors: 0,
  byCategory: new Map<string, number>(),
  byBrandQuality: { known: 0, unknown_kept: 0, unknown_skipped: 0 },
};

const t0 = Date.now();
let cursor = 0;

while (true) {
  const end = ARG_LIMIT
    ? Math.min(cursor + BATCH_SIZE - 1, ARG_LIMIT - 1)
    : cursor + BATCH_SIZE - 1;
  if (ARG_LIMIT && cursor >= ARG_LIMIT) break;

  const { data: rows, error } = await sb
    .from("backup_20260422_products")
    .select("id, title, brand, specs, image_url, source, source_url")
    .order("id", { ascending: true })
    .range(cursor, end);

  if (error) {
    console.error("Backup read error:", error);
    break;
  }
  if (!rows || rows.length === 0) break;

  // Classify each row in-memory
  type Classified = {
    backup_id: string;
    identity: ProductIdentity;
    catSlug: string | null;
    catId: string | null;
    confidence: "high" | "medium" | "low";
    isAccessory: boolean;
    accessoryReason: string | null;
    qualityBrand: boolean;
    raw: { title: string; image_url: string | null; specs: Record<string, unknown> | null };
  };

  const classified: Classified[] = [];
  for (const r of rows) {
    const row = r as {
      id: string;
      title: string;
      brand: string | null;
      specs: Record<string, unknown> | null;
      image_url: string | null;
      source: string | null;
      source_url: string | null;
    };
    if (!row.title) continue;

    const identity = inferProductIdentity({
      title: row.title,
      brand: row.brand,
      specs: (row.specs as Record<string, string> | null) ?? null,
    });
    const catRes = categorizeFromTitle(row.title);
    const catId = catRes.slug ? catBySlug.get(catRes.slug) ?? null : null;
    const acc = checkAccessory(row.title, catRes.slug ?? "");
    classified.push({
      backup_id: row.id,
      identity,
      catSlug: catRes.slug,
      catId,
      confidence: catRes.confidence,
      isAccessory: acc.isAccessory,
      accessoryReason: acc.reason,
      qualityBrand: isQualityBrand(identity.brand),
      raw: { title: row.title, image_url: row.image_url, specs: row.specs },
    });
  }

  // Filter
  const passing = classified.filter((c) => {
    if (FLAG_STRICT) {
      if (c.confidence === "low") {
        stats.skipped_low_quality++;
        return false;
      }
      if (!c.qualityBrand || !knownBrandLower.has(c.identity.brand.toLowerCase())) {
        stats.skipped_low_quality++;
        stats.byBrandQuality.unknown_skipped++;
        return false;
      }
    }
    if (!c.qualityBrand) {
      stats.skipped_low_quality++;
      stats.byBrandQuality.unknown_skipped++;
      return false;
    }
    if (knownBrandLower.has(c.identity.brand.toLowerCase())) stats.byBrandQuality.known++;
    else stats.byBrandQuality.unknown_kept++;

    if (!c.catId && !unclassifiedId) {
      stats.skipped_no_category++;
      return false;
    }
    return true;
  });

  // Existing slug dedup
  let toInsert = passing;
  if (!FLAG_NO_RESUME && passing.length > 0) {
    const slugs = passing.map((c) => c.identity.slug);
    const { data: existing } = await sb
      .from("products")
      .select("slug")
      .in("slug", slugs);
    const existSet = new Set((existing ?? []).map((e: { slug: string }) => e.slug));
    toInsert = passing.filter((c) => {
      if (existSet.has(c.identity.slug)) {
        stats.skipped_existing++;
        return false;
      }
      return true;
    });
  }

  // Insert payload
  const payloads = toInsert.map((c) => {
    const cid = c.catId ?? unclassifiedId!;
    return {
      title: c.identity.originalTitle,
      slug: c.identity.slug,
      brand: c.identity.brand,
      category_id: cid,
      model_code: c.identity.modelCode,
      model_family: c.identity.modelFamily,
      variant_storage: c.identity.variantStorage,
      variant_color: c.identity.variantColor,
      image_url: c.raw.image_url,
      specs: c.raw.specs ?? null,
      is_active: true,
      is_accessory: c.isAccessory,
      accessory_reason: c.accessoryReason,
      accessory_detected_at: c.isAccessory ? new Date().toISOString() : null,
      classified_by: "inhouse-faz1",
      classified_at: new Date().toISOString(),
      quality_score:
        c.confidence === "high" ? 0.9 : c.confidence === "medium" ? 0.7 : 0.5,
    };
  });

  // Intra-batch slug dedup: aynı slug birden fazla varsa son occurence kalır
  const dedupMap = new Map<string, (typeof payloads)[number]>();
  for (const p of payloads) dedupMap.set(p.slug as string, p);
  const dedupedPayloads = [...dedupMap.values()];
  const intraBatchDup = payloads.length - dedupedPayloads.length;
  if (intraBatchDup > 0) stats.skipped_existing += intraBatchDup;

  if (!FLAG_DRY && dedupedPayloads.length > 0) {
    // upsert with ignoreDuplicates → mevcut slug skip edilir, batch fail etmez
    const { error: insErr, count: insertedCount } = await sb
      .from("products")
      .upsert(dedupedPayloads, { onConflict: "slug", ignoreDuplicates: true, count: "exact" });
    if (insErr) {
      console.error(`Batch upsert error (cursor=${cursor}):`, insErr.message);
      stats.errors += dedupedPayloads.length;
    } else {
      const actualInserted = insertedCount ?? dedupedPayloads.length;
      stats.inserted += actualInserted;
      // Upsert ignoreDuplicates olunca skip'lenenler "existing" sayılır
      stats.skipped_existing += dedupedPayloads.length - actualInserted;
    }
  } else {
    stats.inserted += dedupedPayloads.length; // dry-run: would-insert count
  }

  toInsert.forEach((c) => {
    const slug = c.catSlug ?? "siniflandirilmamis";
    stats.byCategory.set(slug, (stats.byCategory.get(slug) ?? 0) + 1);
  });
  stats.total += rows.length;

  const elapsed = Math.round((Date.now() - t0) / 100) / 10;
  console.log(
    `[${stats.total.toString().padStart(6)}]  inserted=${stats.inserted}  skip_existing=${stats.skipped_existing}  skip_quality=${stats.skipped_low_quality}  errors=${stats.errors}  ${elapsed}s`
  );

  if (rows.length < BATCH_SIZE) break;
  cursor = end + 1;
}

// ============================================================================
// Final report
// ============================================================================
const elapsed = Math.round((Date.now() - t0) / 100) / 10;
console.log("\n═══════════════════════════════════════════════════════════");
console.log("  RAPOR");
console.log("═══════════════════════════════════════════════════════════");
console.log(`Toplam okunan        : ${stats.total}`);
console.log(`${FLAG_DRY ? "Insert edilecek      " : "Insert edildi        "}: ${stats.inserted}`);
console.log(`Skip (zaten var)     : ${stats.skipped_existing}`);
console.log(`Skip (düşük kalite)  : ${stats.skipped_low_quality}`);
console.log(`Skip (kategori yok)  : ${stats.skipped_no_category}`);
console.log(`Hata                 : ${stats.errors}`);
console.log(`Süre                 : ${elapsed}s`);
console.log();
console.log("Brand kalitesi:");
console.log(`  KNOWN_BRANDS_TR    : ${stats.byBrandQuality.known}`);
console.log(`  unknown (kept)     : ${stats.byBrandQuality.unknown_kept}`);
console.log(`  unknown (skipped)  : ${stats.byBrandQuality.unknown_skipped}`);
console.log();
console.log("Kategori dağılımı (top 20):");
const topCats = [...stats.byCategory.entries()].sort(([, a], [, b]) => b - a).slice(0, 20);
topCats.forEach(([s, n]) => console.log(`  ${s.padEnd(35)} ${n}`));
const totalCats = stats.byCategory.size;
console.log(`  ... toplam ${totalCats} farklı kategori`);

console.log("\nDone.");
