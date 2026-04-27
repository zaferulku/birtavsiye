/**
 * Backfill listings.source_category for PttAVM listings using categorizeFromTitle.
 *
 * Calistirma:
 *   npx tsx --env-file=.env.local scripts/backfill-pttavm-categories.mts
 *   DRY_RUN=1 npx tsx --env-file=.env.local scripts/backfill-pttavm-categories.mts
 */
import { createClient } from "@supabase/supabase-js";
import { categorizeFromTitle } from "../src/lib/categorizeFromTitle.mts";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const dryRun = process.env.DRY_RUN === "1";
process.stdout.write(`Backfill PttAVM source_category${dryRun ? " (DRY-RUN)" : ""}\n`);

const { data: listings, error } = await sb
  .from("listings")
  .select("id, source_title")
  .eq("source", "pttavm")
  .is("source_category", null);

if (error) {
  process.stderr.write("ERR: " + error.message + "\n");
  process.exit(1);
}
process.stdout.write(`PttAVM listing (source_category=null): ${listings?.length ?? 0}\n`);

let ok = 0, skip = 0, fail = 0;
const slugCounts: Record<string, number> = {};

for (const l of listings ?? []) {
  const r = categorizeFromTitle(l.source_title || "");
  if (!r.slug) { skip++; continue; }
  slugCounts[r.slug] = (slugCounts[r.slug] || 0) + 1;
  if (dryRun) { ok++; continue; }
  const { error: upErr } = await sb.from("listings")
    .update({ source_category: r.slug })
    .eq("id", l.id);
  if (upErr) { fail++; if (fail <= 3) process.stderr.write(`  fail ${l.id}: ${upErr.message}\n`); }
  else ok++;
}

process.stdout.write(`OK: ${ok} | Skip (no match): ${skip} | Fail: ${fail}\n`);
process.stdout.write("--- Slug dagilimi ---\n");
Object.entries(slugCounts).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
  process.stdout.write(`  ${k.padEnd(28)} ${v}\n`);
});
