/**
 * P6.2a ADIM 4 — Dry-run test for scrapeClassifier (Phase 5 hierarchik uyum).
 *
 * 3 senaryo:
 *   1. source_mapped — SOURCE_CATEGORY_MAP hit
 *   2. title_high — categorizeFromTitle leaf-only → resolveLeafToFullPath kurtarır
 *   3. unclassified — auto-create yok, fallback yoluna düş
 *
 * Read-only: classifyScrapedProduct'a mock input geçer, DB write YAPMAZ.
 *
 * Run: npx tsx scripts/probe-scrape-classifier.mts
 */
import { readFileSync } from "node:fs";

const env = readFileSync(".env.local", "utf8");
env.split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
});

const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const { classifyScrapedProduct } = await import(
  "../src/lib/scrapers/scrapeClassifier"
);

// slugToId Map: api/sync/route.ts ile aynı pattern
const { data: catRows, error } = await sb
  .from("categories")
  .select("id, slug")
  .eq("is_active", true);
if (error) {
  console.error("DB fetch fail:", error.message);
  process.exit(1);
}
const slugToId = new Map<string, string>(
  (catRows ?? []).map((c) => [c.slug, c.id]),
);
const unclassParentId = slugToId.get("siniflandirilmamis") ?? null;

console.log(`slugToId size: ${slugToId.size}`);
console.log(`unclassParentId: ${unclassParentId}\n`);

interface Scenario {
  name: string;
  input: Parameters<typeof classifyScrapedProduct>[0];
  expectedSlug: string | null;
  expectedMethod: string;
}

const scenarios: Scenario[] = [
  {
    name: "1. source_mapped",
    input: {
      sb,
      title: "Samsung Galaxy A55",
      source: "mediamarkt",
      sourceCategoryRaw: "Android Telefonlar",
      fallbackCategoryId: null,
      slugToId,
    },
    expectedSlug: "elektronik/telefon/akilli-telefon",
    expectedMethod: "source_mapped",
  },
  {
    name: "2. title_high (resolver)",
    input: {
      sb,
      title: "iPhone 15 Pro Max kılıf siyah deri",
      source: "mediamarkt",
      sourceCategoryRaw: null,
      fallbackCategoryId: null,
      slugToId,
    },
    expectedSlug: "elektronik/telefon/kilif",
    expectedMethod: "title_high",
  },
  {
    name: "3. unclassified (auto-create yok)",
    input: {
      sb,
      title: "Yeni Garip XYZ Tanımsız",
      source: "mediamarkt",
      sourceCategoryRaw: "Tanımsız Yeni Kategori",
      fallbackCategoryId: null,
      slugToId,
    },
    expectedSlug: "siniflandirilmamis",
    expectedMethod: "unclassified",
  },
];

let pass = 0;
let fail = 0;
for (const s of scenarios) {
  console.log(`=== ${s.name} ===`);
  console.log(`Input: title="${s.input.title}", sourceCategoryRaw="${s.input.sourceCategoryRaw}"`);
  const result = await classifyScrapedProduct(s.input, unclassParentId);
  console.log(`Output: slug="${result.slug}", method="${result.method}", reason="${result.reason}"`);
  const ok = result.slug === s.expectedSlug && result.method === s.expectedMethod;
  console.log(`Expected: slug="${s.expectedSlug}", method="${s.expectedMethod}"`);
  console.log(ok ? "PASS" : "FAIL");
  console.log();
  if (ok) pass++;
  else fail++;
}

console.log(`=== OZET ===`);
console.log(`PASS: ${pass}/${scenarios.length}`);
console.log(`FAIL: ${fail}/${scenarios.length}`);
process.exit(fail === 0 ? 0 : 1);
