#!/usr/bin/env tsx
/**
 * scripts/backfill-gtin.mts
 *
 * Mevcut 44K canonical product için GTIN backfill:
 *   1. specs.gtin13 varsa → products.gtin set
 *   2. Title'da 8/12/13/14 hane Luhn-valid GTIN varsa → set
 *   3. Description'da varsa → set (fallback)
 *
 * Migration 020 (products.gtin kolon) DB'de uygulanmış olmalı.
 *
 * KULLANIM:
 *   npx tsx scripts/backfill-gtin.mts --dry-run
 *   npx tsx scripts/backfill-gtin.mts --limit 1000
 *   npx tsx scripts/backfill-gtin.mts            (full)
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const text = readFileSync(".env.local", "utf8");
const env: Record<string, string> = {};
text.split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const ARG_LIMIT = parseInt(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? "0", 10);
const BATCH = 500;

// Luhn (GS1 mod-10) checksum
const GTIN_LENGTHS = new Set([8, 12, 13, 14]);
function isValidGtin(gtin: string): boolean {
  if (!GTIN_LENGTHS.has(gtin.length)) return false;
  if (!/^\d+$/.test(gtin)) return false;
  const padded = gtin.padStart(14, "0");
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    const d = parseInt(padded[i], 10);
    const w = (13 - i) % 2 === 0 ? 3 : 1;
    sum += d * w;
  }
  return parseInt(padded[13], 10) === (10 - (sum % 10)) % 10;
}

function extractGtinLocal(title: string, specs: Record<string, unknown> | null, description: string | null): string | null {
  // 1. specs alanları
  if (specs) {
    for (const [k, v] of Object.entries(specs)) {
      if (!/gtin|ean|barkod|barcode|upc/i.test(k)) continue;
      const cleaned = String(v ?? "").replace(/[^\d]/g, "");
      if (isValidGtin(cleaned)) return cleaned;
    }
  }
  // 2. title regex
  const titleHits = title.match(/\b\d{8,14}\b/g) ?? [];
  for (const h of titleHits) {
    if (GTIN_LENGTHS.has(h.length) && isValidGtin(h)) return h;
  }
  // 3. description regex
  if (description) {
    const descHits = description.match(/\b\d{8,14}\b/g) ?? [];
    for (const h of descHits) {
      if (GTIN_LENGTHS.has(h.length) && isValidGtin(h)) return h;
    }
  }
  return null;
}

console.log(`Mode: ${DRY ? "DRY-RUN" : "LIVE"}, limit: ${ARG_LIMIT || "all"}`);

const stats = {
  total: 0,
  alreadyHasGtin: 0,
  fromSpecs: 0,
  fromTitle: 0,
  fromDescription: 0,
  none: 0,
  updated: 0,
  errors: 0,
  conflicts: 0,
};

const t0 = Date.now();
let lastId: string | null = null;

while (true) {
  if (ARG_LIMIT && stats.total >= ARG_LIMIT) break;

  let q = sb
    .from("products")
    .select("id, title, specs, description, gtin")
    .order("id", { ascending: true })
    .limit(BATCH);
  if (lastId) q = q.gt("id", lastId);

  const { data: rows, error } = await q;
  if (error) {
    console.error("Read error:", error);
    break;
  }
  if (!rows || rows.length === 0) break;

  type Row = { id: string; title: string; specs: Record<string, unknown> | null; description: string | null; gtin: string | null };
  const updates: { id: string; gtin: string }[] = [];

  for (const row of rows as Row[]) {
    stats.total++;
    if (row.gtin) {
      stats.alreadyHasGtin++;
      continue;
    }
    // Hangi kaynaktan geldiğini tracking
    const specsHit = row.specs ? Object.entries(row.specs).find(([k]) => /gtin|ean|barkod|barcode|upc/i.test(k)) : null;
    const fromSpecs = specsHit ? String(specsHit[1] ?? "").replace(/[^\d]/g, "") : null;
    const gtin = extractGtinLocal(row.title ?? "", row.specs, row.description);
    if (!gtin) {
      stats.none++;
      continue;
    }
    if (fromSpecs && isValidGtin(fromSpecs) && fromSpecs === gtin) stats.fromSpecs++;
    else if ((row.title ?? "").includes(gtin)) stats.fromTitle++;
    else stats.fromDescription++;
    updates.push({ id: row.id, gtin });
  }

  // UNIQUE constraint nedeniyle aynı gtin'i farklı satırlara yazamayız.
  // Batch içi dedup: aynı gtin birden fazla satıra düşüyorsa SKIP.
  const gtinSeen = new Map<string, number>();
  updates.forEach((u) => gtinSeen.set(u.gtin, (gtinSeen.get(u.gtin) ?? 0) + 1));
  const toUpdate = updates.filter((u) => gtinSeen.get(u.gtin) === 1);
  stats.conflicts += updates.length - toUpdate.length;

  if (!DRY && toUpdate.length > 0) {
    // Tek tek update (gtin per-row farklı)
    for (const u of toUpdate) {
      const { error: upErr } = await sb.from("products").update({ gtin: u.gtin }).eq("id", u.id);
      if (upErr) {
        if (upErr.code === "23505") stats.conflicts++; // unique violation
        else stats.errors++;
      } else {
        stats.updated++;
      }
    }
  } else {
    stats.updated += toUpdate.length;
  }

  lastId = (rows[rows.length - 1] as Row).id;
  const elapsed = Math.round((Date.now() - t0) / 100) / 10;
  console.log(
    `[${stats.total.toString().padStart(6)}]  hasGtin=${stats.alreadyHasGtin} fromSpecs=${stats.fromSpecs} fromTitle=${stats.fromTitle} fromDesc=${stats.fromDescription} none=${stats.none} updated=${stats.updated} conflicts=${stats.conflicts} errors=${stats.errors}  ${elapsed}s`
  );

  if (rows.length < BATCH) break;
}

console.log("\n═══════════════════════════════════════");
console.log("  RAPOR");
console.log("═══════════════════════════════════════");
console.log(`Toplam taranan        : ${stats.total}`);
console.log(`Zaten GTIN'li         : ${stats.alreadyHasGtin}`);
console.log(`Specs'ten             : ${stats.fromSpecs}`);
console.log(`Title'dan             : ${stats.fromTitle}`);
console.log(`Description'dan       : ${stats.fromDescription}`);
console.log(`GTIN bulunamadı       : ${stats.none}`);
console.log(`${DRY ? "Update edilecek       " : "Update edildi         "}: ${stats.updated}`);
console.log(`Conflict (dup gtin)   : ${stats.conflicts}`);
console.log(`Hata                  : ${stats.errors}`);

console.log("\nDone.");
