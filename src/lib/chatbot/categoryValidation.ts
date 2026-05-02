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

// Hierarchik slug yolları arası en uzun ortak prefix segment sayısı.
// "kucuk-ev-aletleri/mutfak/kahve-makinesi" vs "kucuk-ev-aletleri/mutfak/cay-makinesi" → 2.
// "supermarket/kahve" vs "kucuk-ev-aletleri/mutfak/kahve-makinesi" → 0.
// P6.11: Aynı leaf-suffix'e match'lenen birden çok slug arasında, mevcut sticky
// context'e en yakın olanı seçmek için kullanılır.
function commonPrefixDistance(a: string, b: string): number {
  const aParts = a.split("/");
  const bParts = b.split("/");
  let i = 0;
  while (i < aParts.length && i < bParts.length && aParts[i] === bParts[i]) i++;
  return i;
}

export interface SlugMatchOptions {
  // Mevcut konuşmada aktif kategori slug'ı (full path). Leaf-suffix katmanı
  // birden çok eşleşme bulduğunda bu slug'la en uzun ortak prefix'i paylaşan
  // adayı tercih eder. Yoksa eski davranış (multiple match → fallthrough) korunur.
  stickyContextSlug?: string | null;
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

/**
 * Caller-provided taxonomy üzerinden in-memory eşleme. Header gibi DB hit
 * yapmadan, kendi cats array'ini iterable olarak geçen client'lar için.
 *
 * Katmanlar (sırayla): exact → leaf-suffix (tek match) → token-set (leaf scope).
 * Fuzzy YOK — async tarafa özel (Levenshtein cost'u + DB hit imkânı orada).
 *
 * @param inputSlug Türkçe karakter / dotted / underscore varyantı tolere eder
 * @param taxonomy DB slug'larının iterable'ı (full hierarchik path beklenir)
 * @returns matched orijinal DB slug veya null
 */
export function findCanonicalSlugSync(
  inputSlug: string | null | undefined,
  taxonomy: Iterable<string>,
  options?: SlugMatchOptions,
): string | null {
  if (!inputSlug) return null;

  // Lazy normalize index oluştur (caller her seferinde re-build etmemeli;
  // Header useMemo ile cache'liyor)
  const candidates = normalizeSlugCandidate(inputSlug);
  const normalizedCandidates = Array.from(
    new Set(candidates.map((c) => trNormalize(c)).filter(Boolean)),
  );
  if (normalizedCandidates.length === 0) return null;

  // Exact match
  for (const original of taxonomy) {
    const norm = trNormalize(original);
    if (normalizedCandidates.includes(norm)) return original;
  }

  // Leaf-suffix match.
  // Tek match → döndür.
  // Birden çok match → P6.11: stickyContextSlug verilmişse, ortak prefix
  // mesafesi en yüksek olanı seç (eşitlikte ilk match). Sticky yoksa eski
  // davranış (fallthrough → token-set katmanı) korunur.
  for (const c of normalizedCandidates) {
    if (c.includes("/")) continue;
    const matches: string[] = [];
    for (const original of taxonomy) {
      const norm = trNormalize(original);
      if (norm === c || norm.endsWith("/" + c)) matches.push(original);
    }
    if (matches.length === 1) return matches[0];
    if (matches.length > 1 && options?.stickyContextSlug) {
      const sticky = options.stickyContextSlug;
      let best: { slug: string; dist: number } | null = null;
      for (const candidate of matches) {
        const dist = commonPrefixDistance(candidate, sticky);
        if (!best || dist > best.dist) best = { slug: candidate, dist };
      }
      if (best && best.dist > 0) return best.slug;
    }
  }

  // P6.18b: Compound-path match (token-set'ten önce, daha spesifik).
  // Input "erkek-giyim-ust" → DB "moda/erkek-giyim/ust" segmentlerine yayılan
  // tokens. Tüm input token'lar segments'in birinde appear etmeli (full coverage).
  // Çoklu match → P6.11 sticky tie-break. Tek match → döndür.
  for (const c of normalizedCandidates) {
    if (c.includes("/")) continue;
    const inputTokens = c.split("-").filter((t) => t.length >= 2);
    if (inputTokens.length < 2) continue;

    const matches: string[] = [];
    for (const original of taxonomy) {
      const norm = trNormalize(original);
      const segments = norm.split("/");
      const allTokensFound = inputTokens.every((tok) =>
        segments.some((seg) => seg.includes(tok)),
      );
      if (allTokensFound) matches.push(original);
    }
    if (matches.length === 1) return matches[0];
    if (matches.length > 1 && options?.stickyContextSlug) {
      const sticky = options.stickyContextSlug;
      let best: { slug: string; dist: number } | null = null;
      for (const candidate of matches) {
        const dist = commonPrefixDistance(candidate, sticky);
        if (!best || dist > best.dist) best = { slug: candidate, dist };
      }
      if (best && best.dist > 0) return best.slug;
    }
    if (matches.length > 1) {
      // Tie-break yok → en kısa slug'ı seç (en spesifik leaf, gereksiz parent
      // path'leri eliminate eder). Eşitse alfabetik ilk.
      matches.sort((a, b) => a.length - b.length || a.localeCompare(b));
      return matches[0];
    }
  }

  // Token-set match (leaf segment scope)
  for (const c of normalizedCandidates) {
    if (c.includes("/")) continue;
    const inputTokens = new Set(c.split("-").filter(Boolean));
    if (inputTokens.size < 2) continue;
    for (const original of taxonomy) {
      const norm = trNormalize(original);
      const leafSegment = norm.split("/").pop() ?? "";
      const candTokens = new Set(leafSegment.split("-").filter(Boolean));
      if (inputTokens.size === candTokens.size) {
        const allMatch = [...inputTokens].every((t) => candTokens.has(t));
        if (allMatch) return original;
      }
    }
  }

  return null;
}

export async function validateOrFuzzyMatchSlug(
  inputSlug: string | null,
  maxDistance: number = 2,
  options?: SlugMatchOptions,
): Promise<string | null> {
  if (!inputSlug) return null;

  const taxonomy = await getCategoryTaxonomy();
  const normalizedIndex = await getNormalizedIndex();

  // Önce sync helper (exact + leaf-suffix + token-set)
  const syncMatch = findCanonicalSlugSync(inputSlug, taxonomy, options);
  if (syncMatch) {
    // İsteğe bağlı log: hangi katmandan match'lendi (sync helper sessiz)
    console.log(`[categoryValidation] sync match: "${inputSlug}" → "${syncMatch}"`);
    return syncMatch;
  }

  // Fuzzy match (Levenshtein, normalize edilmiş string'ler üzerinde)
  const candidates = normalizeSlugCandidate(inputSlug);
  const normalizedCandidates = Array.from(
    new Set(candidates.map((c) => trNormalize(c)).filter(Boolean)),
  );
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
