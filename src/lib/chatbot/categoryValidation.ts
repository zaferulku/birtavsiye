import { supabaseAdmin } from "@/lib/supabaseServer";

// 5 dk LRU cache (taxonomy nadiren değişir)
let cache: { slugs: Set<string>; expiresAt: number } | null = null;
const TTL_MS = 5 * 60 * 1000;

export async function getCategoryTaxonomy(): Promise<Set<string>> {
  if (cache && Date.now() < cache.expiresAt) return cache.slugs;

  const { data, error } = await supabaseAdmin
    .from("categories")
    .select("slug");

  if (error) {
    console.error("[categoryValidation] taxonomy fetch FAIL:", error.message);
    return cache?.slugs ?? new Set();
  }

  cache = {
    slugs: new Set((data ?? []).map((r: { slug: string }) => r.slug)),
    expiresAt: Date.now() + TTL_MS,
  };
  return cache.slugs;
}

// Test/migration sonrası cache temizleme
export function invalidateTaxonomyCache(): void {
  cache = null;
}

// Levenshtein distance (basit DP)
function levenshtein(a: string, b: string): number {
  const m: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0),
  );
  for (let i = 0; i <= a.length; i++) m[i][0] = i;
  for (let j = 0; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      m[i][j] = a[i - 1] === b[j - 1]
        ? m[i - 1][j - 1]
        : 1 + Math.min(m[i - 1][j - 1], m[i - 1][j], m[i][j - 1]);
    }
  }
  return m[a.length][b.length];
}

/**
 * Verilen slug'ın taxonomy'de geçerli olup olmadığını kontrol eder.
 * Geçersizse fuzzy match dener (Levenshtein ≤ maxDistance).
 * Hiçbir match yoksa null döner.
 */
export async function validateOrFuzzyMatchSlug(
  inputSlug: string | null,
  maxDistance: number = 2,
): Promise<string | null> {
  if (!inputSlug) return null;

  const taxonomy = await getCategoryTaxonomy();

  // Exact match
  if (taxonomy.has(inputSlug)) return inputSlug;

  // Fuzzy match
  let best: { slug: string; dist: number } | null = null;
  const lower = inputSlug.toLowerCase();
  for (const candidate of taxonomy) {
    const d = levenshtein(lower, candidate.toLowerCase());
    if (d <= maxDistance && (!best || d < best.dist)) {
      best = { slug: candidate, dist: d };
    }
  }

  if (best) {
    console.log(
      `[categoryValidation] fuzzy match: "${inputSlug}" → "${best.slug}" (distance=${best.dist})`,
    );
    return best.slug;
  }

  return null;
}
