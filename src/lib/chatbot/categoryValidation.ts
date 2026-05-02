import { supabaseAdmin } from "@/lib/supabaseServer";
import { trNormalize } from "@/lib/turkishNormalize";

// 5 dk LRU cache (taxonomy nadiren değişir)
// normalizedIndex: trNormalize(slug) → orijinal DB slug.
// "kılıf" gibi Türkçe karakter içeren input'ları ASCII DB slug'larına eşler.
let cache: {
  slugs: Set<string>;
  normalizedIndex: Map<string, string>;
  expiresAt: number;
} | null = null;
const TTL_MS = 5 * 60 * 1000;

async function refreshCache(): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("categories")
    .select("slug");

  if (error) {
    console.error("[categoryValidation] taxonomy fetch FAIL:", error.message);
    if (!cache) {
      cache = { slugs: new Set(), normalizedIndex: new Map(), expiresAt: 0 };
    }
    return;
  }

  const slugs = new Set<string>();
  const normalizedIndex = new Map<string, string>();
  for (const row of (data ?? []) as { slug: string }[]) {
    slugs.add(row.slug);
    normalizedIndex.set(trNormalize(row.slug), row.slug);
  }

  cache = { slugs, normalizedIndex, expiresAt: Date.now() + TTL_MS };
}

export async function getCategoryTaxonomy(): Promise<Set<string>> {
  if (!cache || Date.now() >= cache.expiresAt) await refreshCache();
  return cache!.slugs;
}

async function getNormalizedIndex(): Promise<Map<string, string>> {
  if (!cache || Date.now() >= cache.expiresAt) await refreshCache();
  return cache!.normalizedIndex;
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
// LLM bazen dotted-namespace ("moda.erkek_ust_giyim") veya underscore varyantı
// üretir. DB taxonomy kebab-case ("erkek-giyim-ust"). Normalize et.
function normalizeSlugCandidate(input: string): string[] {
  const variants = new Set<string>();
  const lower = input.toLowerCase().trim();
  variants.add(lower);
  // dotted prefix strip (moda.X → X, teknoloji.Y → Y)
  if (lower.includes(".")) {
    const tail = lower.split(".").pop();
    if (tail) variants.add(tail);
  }
  // underscore → dash
  for (const v of [...variants]) {
    if (v.includes("_")) variants.add(v.replace(/_/g, "-"));
  }
  return [...variants];
}

export async function validateOrFuzzyMatchSlug(
  inputSlug: string | null,
  maxDistance: number = 2,
): Promise<string | null> {
  if (!inputSlug) return null;

  const normalizedIndex = await getNormalizedIndex();
  const candidates = normalizeSlugCandidate(inputSlug);
  // Türkçe normalize her variant için (ı→i, ş→s, ğ→g, ü→u, ö→o, ç→c).
  // DB slug'ları zaten ASCII; input "kılıf" → "kilif" → match.
  const normalizedCandidates = Array.from(
    new Set(candidates.map((c) => trNormalize(c)).filter(Boolean)),
  );

  // Exact match (Türkçe-normalize edilmiş)
  for (const c of normalizedCandidates) {
    const original = normalizedIndex.get(c);
    if (original) return original;
  }

  // Leaf-suffix match: DB slug'ları full hierarchik path
  // (örn "elektronik/telefon/akilli-telefon"); LLM/queryParser leaf-only
  // ("akilli-telefon") üretirse "/leaf" suffix ile match'le. Tek match varsa
  // onu kullan; çoklu match → fuzzy'ye bırak (tie-break belirsiz).
  for (const c of normalizedCandidates) {
    if (c.includes("/")) continue; // zaten path-li, leaf değil
    const matches: string[] = [];
    for (const [normSlug, origSlug] of normalizedIndex) {
      if (normSlug === c || normSlug.endsWith("/" + c)) {
        matches.push(origSlug);
      }
    }
    if (matches.length === 1) {
      console.log(`[categoryValidation] leaf-suffix match: "${inputSlug}" → "${matches[0]}"`);
      return matches[0];
    }
    // Çoklu match: ambiguity, fuzzy aşamasına bırak
  }

  // Token-set match: aynı kelimeler farklı sırada (erkek-ust-giyim ↔ erkek-giyim-ust)
  // DB slug'ları hierarchik path olduğu için sadece leaf segment üzerinde
  // çalışır (split("/").pop()). Input zaten leaf olmalı.
  for (const c of normalizedCandidates) {
    if (c.includes("/")) continue;
    const inputTokens = new Set(c.split("-").filter(Boolean));
    if (inputTokens.size < 2) continue;
    for (const [normSlug, origSlug] of normalizedIndex) {
      const leafSegment = normSlug.split("/").pop() ?? "";
      const candTokens = new Set(leafSegment.split("-").filter(Boolean));
      if (inputTokens.size === candTokens.size) {
        const allMatch = [...inputTokens].every((t) => candTokens.has(t));
        if (allMatch) {
          console.log(`[categoryValidation] token-set match: "${inputSlug}" → "${origSlug}"`);
          return origSlug;
        }
      }
    }
  }

  // Fuzzy match (Levenshtein, normalize edilmiş string'ler üzerinde)
  let best: { slug: string; dist: number } | null = null;
  for (const c of normalizedCandidates) {
    for (const [normSlug, origSlug] of normalizedIndex) {
      const d = levenshtein(c, normSlug);
      if (d <= maxDistance && (!best || d < best.dist)) {
        best = { slug: origSlug, dist: d };
      }
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
