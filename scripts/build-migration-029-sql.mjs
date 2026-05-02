/**
 * ADIM 3 — Migration 029 SQL üretici.
 *
 * Input:
 *   - scripts/category-keywords-static-mapped.json (25 entry)
 *   - scripts/category-keywords-llm-v1.json (191 entry)
 *
 * Output:
 *   supabase/migrations/029_categories_keywords_backfill.sql
 *
 * Run: node scripts/build-migration-029-sql.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";

const STATIC_PATH = "scripts/category-keywords-static-mapped.json";
const LLM_PATH = "scripts/category-keywords-llm-v1.json";
const OUTPUT_PATH = "supabase/migrations/029_categories_keywords_backfill.sql";
const EXPECTED_TOTAL = 216;

const staticData = JSON.parse(readFileSync(STATIC_PATH, "utf8"));
const llmData = JSON.parse(readFileSync(LLM_PATH, "utf8"));

const merged = new Map();

for (const entry of staticData.matched) {
  if (merged.has(entry.db_slug)) {
    console.warn(`Duplicate (static + static): ${entry.db_slug}`);
  }
  merged.set(entry.db_slug, entry.keywords);
}

for (const entry of llmData.matched) {
  if (merged.has(entry.slug)) {
    console.warn(`Duplicate (static <-> llm): ${entry.slug} -- using STATIC`);
    continue;
  }
  merged.set(entry.slug, entry.keywords);
}

console.log(`Merged: ${merged.size} unique slugs (expected ${EXPECTED_TOTAL})`);

if (merged.size !== EXPECTED_TOTAL) {
  console.error(`MISMATCH: ${merged.size} !== ${EXPECTED_TOTAL}`);
  process.exit(1);
}

function normalizeKeywords(arr) {
  const seen = new Set();
  const result = [];
  for (const kw of arr) {
    if (typeof kw !== "string") continue;
    const trimmed = kw.trim();
    if (trimmed.length === 0) continue;
    const lower = trimmed.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    result.push(trimmed);
  }
  return result;
}

function sqlEscape(s) {
  return s.replace(/'/g, "''");
}

let totalKeywords = 0;
let emptySlugCount = 0;
const valuesLines = [];
const sortedSlugs = [...merged.keys()].sort();

for (const slug of sortedSlugs) {
  const kws = normalizeKeywords(merged.get(slug));
  if (kws.length === 0) {
    console.warn(`Empty keywords after normalize: ${slug}`);
    emptySlugCount++;
    continue;
  }
  totalKeywords += kws.length;
  const arrayLiteral =
    "ARRAY[" + kws.map((kw) => `'${sqlEscape(kw)}'`).join(",") + "]::text[]";
  valuesLines.push(`    ('${sqlEscape(slug)}', ${arrayLiteral})`);
}

console.log(`Generated VALUES rows: ${valuesLines.length}`);
console.log(`Total keywords: ${totalKeywords}`);
console.log(`Avg kw/slug: ${(totalKeywords / valuesLines.length).toFixed(2)}`);
if (emptySlugCount > 0) {
  console.warn(`Empty slugs (skipped): ${emptySlugCount}`);
}

const sql = `-- 029_categories_keywords_backfill.sql
-- 216 kategori icin keywords backfill (Migration 021 NULL kalmisti)
-- + GIN index (array contains performans)
-- Idempotent: keywords NULL/empty olanlar UPDATE, dolu olanlar atla
--
-- KOD ETKISI: SIFIR. Sadece DB tarafinda degisiklik.
-- src/lib/chatbot/categoryKnowledge.ts ve queryParser.ts dokunulmadi.
-- Static map'ler korundu - DB keywords paralel kaynak olarak calisir.
--
-- KAYNAK:
-- - 25 entry: scripts/category-keywords-static-mapped.json
--   (queryParser STATIC_CATEGORY_KEYWORDS + CHATBOT_FALLBACK_CATEGORY_PHRASES)
-- - 191 entry: scripts/category-keywords-llm-v1.json
--   (Gemini 2.5-flash + Groq llama-3.3-70b + NVIDIA llama-3.3-70b-instruct)
-- - TOPLAM: ${valuesLines.length} = DB'deki tum kategoriler
-- - Avg ${(totalKeywords / valuesLines.length).toFixed(1)} keyword/slug

BEGIN;

-- Step 1: Backfill (idempotent, dolu olanlari atla)
WITH new_keywords (slug, kw) AS (
  VALUES
${valuesLines.join(",\n")}
)
UPDATE categories AS c
SET keywords = nk.kw
FROM new_keywords nk
WHERE c.slug = nk.slug
  AND (c.keywords IS NULL OR cardinality(c.keywords) = 0);

-- Step 2: GIN index (array contains performans icin)
CREATE INDEX IF NOT EXISTS idx_categories_keywords_gin
ON categories USING GIN (keywords);

-- Step 3: Self-verify
DO $$
DECLARE
  total_count INT;
  null_count INT;
  filled_count INT;
BEGIN
  SELECT COUNT(*) INTO total_count FROM categories;
  SELECT COUNT(*) INTO null_count FROM categories
   WHERE keywords IS NULL OR cardinality(keywords) = 0;
  filled_count := total_count - null_count;

  RAISE NOTICE 'Migration 029: %/% kategori filled', filled_count, total_count;

  IF null_count > 0 THEN
    RAISE WARNING 'Migration 029: % kategori hala NULL/empty', null_count;
  ELSIF filled_count <> ${EXPECTED_TOTAL} THEN
    RAISE WARNING 'Migration 029: filled count beklenmedik: % (${EXPECTED_TOTAL} hedef)', filled_count;
  ELSE
    RAISE NOTICE 'Migration 029: OK ${EXPECTED_TOTAL}/${EXPECTED_TOTAL}';
  END IF;
END $$;

COMMIT;
`;

writeFileSync(OUTPUT_PATH, sql, "utf8");
console.log(`\nWrote: ${OUTPUT_PATH}`);
console.log(`File size: ${(sql.length / 1024).toFixed(1)} KB`);
console.log(`Line count: ${sql.split("\n").length}`);
