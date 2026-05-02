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

// ================================================
// TEST 3 — Broken slug'lar için DB öneri tablosu (5D-3.3)
// ================================================
function tokenSet(s: string): Set<string> {
  // Leaf segment + tokenize
  const leaf = s.split("/").pop() ?? s;
  return new Set(leaf.split("-").filter(Boolean));
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function levenshtein(a: string, b: string): number {
  const m: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0),
  );
  for (let i = 0; i <= a.length; i++) m[i][0] = i;
  for (let j = 0; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      m[i][j] =
        a[i - 1] === b[j - 1]
          ? m[i - 1][j - 1]
          : 1 + Math.min(m[i - 1][j - 1], m[i - 1][j], m[i][j - 1]);
    }
  }
  return m[a.length][b.length];
}

function suggestForBroken(brokenSlug: string, taxIter: Iterable<string>): {
  slug: string;
  score: number;
  reason: string;
}[] {
  const inputTokens = tokenSet(brokenSlug);
  const inputLeaf = brokenSlug.split("/").pop() ?? brokenSlug;
  const candidates: { slug: string; score: number; reason: string }[] = [];

  for (const dbSlug of taxIter) {
    const dbTokens = tokenSet(dbSlug);
    const dbLeaf = dbSlug.split("/").pop() ?? dbSlug;

    const jaccard = jaccardSimilarity(inputTokens, dbTokens);
    const lev = levenshtein(inputLeaf, dbLeaf);
    const maxLen = Math.max(inputLeaf.length, dbLeaf.length);
    const levRatio = maxLen === 0 ? 1 : 1 - lev / maxLen;
    // ILIKE-benzeri substring
    const substringHit =
      dbLeaf.includes(inputLeaf) || inputLeaf.includes(dbLeaf) ? 0.3 : 0;

    const score = jaccard * 0.5 + levRatio * 0.4 + substringHit;
    if (score < 0.3) continue;

    let reason = "";
    if (jaccard >= 0.5) reason = `token-overlap=${jaccard.toFixed(2)}`;
    else if (substringHit > 0) reason = `substring`;
    else reason = `lev=${lev}/${maxLen}`;

    candidates.push({ slug: dbSlug, score, reason });
  }

  return candidates.sort((a, b) => b.score - a.score).slice(0, 3);
}

console.log(`\n========== TEST 3: Broken slug öneri tablosu ==========`);
console.log(`(her broken slug için top 3 DB önerisi, score ≥ 0.3)\n`);

const mappingProposals: { broken: string; suggestions: ReturnType<typeof suggestForBroken> }[] = [];
for (const b of broken) {
  const suggestions = suggestForBroken(b, taxonomy);
  mappingProposals.push({ broken: b, suggestions });
}

console.log(`| NAV slug (eski) | Öneri 1 | Öneri 2 | Öneri 3 |`);
console.log(`|---|---|---|---|`);
for (const { broken: b, suggestions } of mappingProposals) {
  const cols = [b];
  for (let i = 0; i < 3; i++) {
    const s = suggestions[i];
    cols.push(s ? `${s.slug} (${s.score.toFixed(2)}, ${s.reason})` : "-");
  }
  console.log(`| ${cols.join(" | ")} |`);
}

const noSuggestion = mappingProposals.filter((p) => p.suggestions.length === 0);
console.log(`\nÖnerisiz (DB'de yakın eşleşme yok): ${noSuggestion.length}`);
if (noSuggestion.length > 0) {
  for (const p of noSuggestion) console.log(`  ✗ "${p.broken}"`);
}
