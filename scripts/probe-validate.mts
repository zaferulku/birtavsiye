/**
 * Phase 5 final validation:
 * 1. validateOrFuzzyMatchSlug smoke test
 * 2. Header NAV slug DB cross-check
 *
 * Run: npx tsx scripts/probe-validate.mts
 */
import { readFileSync } from "node:fs";

const env = readFileSync(".env.local", "utf8");
env.split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
});

const mod = await import("../src/lib/chatbot/categoryValidation");
const { validateOrFuzzyMatchSlug, getCategoryTaxonomy, findCanonicalSlugSync } = mod;

const taxonomy = await getCategoryTaxonomy();
console.log(`\n========== PHASE 5 VALIDATION ==========`);
console.log(`Taxonomy size: ${taxonomy.size}\n`);

// ================================================
// TEST 1 — validateOrFuzzyMatchSlug smoke test
// Phase 5D-3.1: Türkçe karakter normalize testi
// ================================================
console.log(`========== TEST 1: validateOrFuzzyMatchSlug ==========`);
const testSlugs = [
  // Phase 5D-2 regression slugs
  "aksesuar",
  "kılıf",            // ı + Türkçe karakter testi
  "kahve",
  "blender",
  "akilli-telefon",
  // Phase 5D-3 ek Türkçe karakter testleri
  "şarj-kablo",       // ş
  "buzdolabı",        // ı
  "küçük-ev-aletleri",// ü + ç
  "güneş-gözlüğü",    // ü + ş + ö + ğ
];

for (const slug of testSlugs) {
  const result = await validateOrFuzzyMatchSlug(slug, 1);

  const directMatches: string[] = [];
  for (const t of taxonomy) {
    if (t === slug || t.endsWith("/" + slug)) directMatches.push(t);
  }

  const status =
    directMatches.length === 0
      ? result === null
        ? "✓ 0 match → null"
        : `⚠ 0 direct match ama fuzzy → ${result}`
      : directMatches.length === 1
        ? result === directMatches[0]
          ? "✓ tek match"
          : `⚠ tek direct ama farklı dönüş: ${result}`
        : `⚠ ÇOKLU match (${directMatches.length}): ${directMatches.slice(0, 3).join(", ")}${directMatches.length > 3 ? "..." : ""} → fuzzy: ${result}`;

  console.log(`  "${slug}" → ${result ?? "null"}  [${status}]`);
}

// ================================================
// TEST 2 — Header NAV slug DB cross-check
// ================================================
console.log(`\n========== TEST 2: Header NAV ↔ DB ==========`);

const headerText = readFileSync("src/app/components/layout/Header.tsx", "utf8");
// ASCII kebab-case slug'lar; template literal/${...} yakalamaz
const slugRegex = /slug:\s*"([a-z0-9][a-z0-9/-]*)"/g;
const navSlugs = new Set<string>();
let match: RegExpExecArray | null;
while ((match = slugRegex.exec(headerText)) !== null) {
  navSlugs.add(match[1]);
}

console.log(`NAV unique slug count: ${navSlugs.size}\n`);

const exact: { slug: string; full: string }[] = [];
const rescued: { slug: string; full: string }[] = []; // Sync helper kurtardı
const broken: string[] = [];
const ambiguous: { slug: string; matches: string[] }[] = [];

for (const slug of [...navSlugs].sort()) {
  const directMatches: string[] = [];
  for (const t of taxonomy) {
    if (t === slug || t.endsWith("/" + slug)) directMatches.push(t);
  }

  if (directMatches.length === 1) {
    exact.push({ slug, full: directMatches[0] });
    continue;
  }
  if (directMatches.length > 1) {
    ambiguous.push({ slug, matches: directMatches });
    continue;
  }

  // 0 direct match → sync helper kurtarabilir mi?
  const resolved = findCanonicalSlugSync(slug, taxonomy);
  if (resolved) {
    rescued.push({ slug, full: resolved });
  } else {
    broken.push(slug);
  }
}

console.log(`✓ EXACT match     : ${exact.length}`);
console.log(`✓ RESCUED (helper): ${rescued.length}`);
console.log(`⚠ AMBIGUOUS       : ${ambiguous.length}`);
console.log(`✗ BROKEN (gerçek) : ${broken.length}\n`);

if (rescued.length > 0) {
  console.log(`--- HELPER KURTARDI ---`);
  for (const r of rescued) console.log(`  ✓ "${r.slug}" → "${r.full}"`);
  console.log();
}

if (broken.length > 0) {
  console.log(`--- HÂLÂ KIRIK NAV SLUG'LARI ---`);
  for (const s of broken) console.log(`  ✗ "${s}"`);
  console.log();
}

if (ambiguous.length > 0) {
  console.log(`--- ÇOKLU MATCH (ambiguous) ---`);
  for (const a of ambiguous) {
    console.log(`  ⚠ "${a.slug}" → ${a.matches.length} match: ${a.matches.join(", ")}`);
  }
  console.log();
}

console.log(`========== ÖZET ==========`);
console.log(
  `NAV: ${navSlugs.size} | Exact: ${exact.length} | Rescued: ${rescued.length} | Ambiguous: ${ambiguous.length} | Broken: ${broken.length}`,
);
console.log(
  `Önce: ${navSlugs.size - exact.length - ambiguous.length} broken (helper'dan önce)`,
);
console.log(
  `Sonra: ${broken.length} broken (helper sonrası, kurtarılan: ${rescued.length})`,
);
