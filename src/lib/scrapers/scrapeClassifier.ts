/**
 * Generic Scrape Classifier — tüm pazaryerleri için ortak kategori atama.
 *
 * Strateji (öncelik sırası):
 *   1. source_category MAP'te varsa → mapped slug (en güvenilir)
 *   2. categorizeFromTitle "high" confidence → matched slug
 *   3. categorizeFromTitle "medium" confidence → matched slug
 *   4. source_category MAP'te YOK ama "temiz" string → AUTO-CREATE category
 *      (parent=siniflandirilmamis, name="<source>: <raw>")
 *   5. fallbackCategoryId (cron'un sağladığı) → kullan
 *   6. siniflandirilmamis (last resort)
 *
 * Yeni pazaryeri eklerken: bu modülü çağır, kendi kodunda kategori logic'i yazma.
 */
import { categorizeFromTitle } from "../categorizeFromTitle";
import { resolvePttavmSourceCategory } from "./pttavmCategoryMap";

// Caller passes a Supabase client (any to avoid generic depth issues).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SbLike = any;

// ═══ Source Category Map — tüm pazaryerleri için merkezi mapping ═══
// Phase 5 sonrası full hierarchik path format. DB'deki categories.slug ile
// eşleşmeli (Migration 021: <root>/<sub>/<leaf>). Yeni pazaryeri ekledikçe
// burayı genişlet — leaf-only YAZMA, hierarchik path zorunlu.
// Source: scripts/scrape-classifier-map-audit.json (P6.2a, 2026-05-02)
export const SOURCE_CATEGORY_MAP: Record<string, string> = {
  // MediaMarkt — Telefon
  "Android Telefonlar": "elektronik/telefon/akilli-telefon",
  "iPhone 11": "elektronik/telefon/akilli-telefon",
  "iPhone 14 Pro Max": "elektronik/telefon/akilli-telefon",
  "iPhone 17 Pro Max": "elektronik/telefon/akilli-telefon",
  "Galaxy A": "elektronik/telefon/akilli-telefon",
  "Galaxy S": "elektronik/telefon/akilli-telefon",
  "Galaxy Z": "elektronik/telefon/akilli-telefon",
  "Samsung Telefon": "elektronik/telefon/akilli-telefon",
  "General Mobile Telefon": "elektronik/telefon/akilli-telefon",

  // MM — Laptop
  "Casper Laptop": "elektronik/bilgisayar-tablet/laptop",
  "HP Laptop": "elektronik/bilgisayar-tablet/laptop",
  "Asus Laptop": "elektronik/bilgisayar-tablet/laptop",
  "Acer Laptop": "elektronik/bilgisayar-tablet/laptop",
  "Huawei Laptop": "elektronik/bilgisayar-tablet/laptop",
  "Lenovo Laptop": "elektronik/bilgisayar-tablet/laptop",
  "Lenovo Laptop Modelleri": "elektronik/bilgisayar-tablet/laptop",
  Laptop: "elektronik/bilgisayar-tablet/laptop",

  // MM — Akıllı Saat
  "Akıllı Saatler": "elektronik/giyilebilir/akilli-saat",
  "Bilicra Akıllı Saat": "elektronik/giyilebilir/akilli-saat",

  // MM — Tablet
  "Android Tabletler": "elektronik/bilgisayar-tablet/tablet",
  Tabletler: "elektronik/bilgisayar-tablet/tablet",

  // MM — Mutfak / Beyaz Eşya
  Blender: "kucuk-ev-aletleri/mutfak/blender",
  "Kahve Makinesi": "kucuk-ev-aletleri/mutfak/kahve-makinesi",
  "Espresso Kahve Makineleri": "kucuk-ev-aletleri/mutfak/kahve-makinesi",
  "Filtre Kahve Makineleri": "kucuk-ev-aletleri/mutfak/kahve-makinesi",
  "Robot Süpürge": "kucuk-ev-aletleri/temizlik/robot-supurge",
  "Ankastre Fırın": "beyaz-esya/firin-ocak",
  "Ankastre Bulaşık Makineleri": "beyaz-esya/bulasik-makinesi",
  "Çamaşır Makineleri": "beyaz-esya/camasir-makinesi",
  Buzdolabi: "beyaz-esya/buzdolabi",
  Klimalar: "beyaz-esya/klima",

  // MM — Powerbank
  "Taşınabilir Şarj Cihazları": "elektronik/telefon/powerbank",
  "MagSafe Powerbank": "elektronik/telefon/powerbank",
  "Ttec Powerbank": "elektronik/telefon/powerbank",
  "Ugreen Powerbank": "elektronik/telefon/powerbank",

  // MM — Diğer
  Drone: "elektronik/kamera/drone",
  "Oyun Konsolları": "elektronik/oyun/konsol",
  "Saç Kurutma": "kucuk-ev-aletleri/kisisel-bakim/sac-kurutma",

  // PttAVM (kebab-case eski leaf-only key'ler — Phase 5 öncesi)
  "akilli-telefon": "elektronik/telefon/akilli-telefon",
  "telefon-kilifi": "elektronik/telefon/kilif",
  "telefon-yedek-parca": "elektronik/telefon/yedek-parca",
  "telefon-aksesuar": "elektronik/telefon/aksesuar",
  "ekran-koruyucu": "elektronik/telefon/ekran-koruyucu",
  "sarj-kablo": "elektronik/telefon/sarj-kablo",
  "akilli-saat": "elektronik/giyilebilir/akilli-saat",
  "kahve-makinesi": "kucuk-ev-aletleri/mutfak/kahve-makinesi",
  buzdolabi: "beyaz-esya/buzdolabi",
  "tost-makinesi": "kucuk-ev-aletleri/mutfak/tost-makinesi",
  televizyon: "elektronik/tv-ses-goruntu/televizyon",
  "tv-aksesuar": "elektronik/tv-ses-goruntu/tv-aksesuar",
  "fotograf-kamera": "elektronik/kamera/fotograf-makinesi",
  "guvenlik-kamerasi": "elektronik/ag-guvenlik/guvenlik-kamera",
  "bilgisayar-bilesenleri": "elektronik/bilgisayar-tablet/bilesenler",
};

export type ClassifyMethod =
  | "source_mapped"
  | "auto_created"
  | "title_high"
  | "title_medium"
  | "fallback"
  | "unclassified"
  | "filtered_out";

export interface ScrapeClassifyResult {
  categoryId: string | null;
  slug: string | null;
  method: ClassifyMethod;
  reason: string;
  skip?: boolean;
}

export interface ScrapeClassifyInput {
  sb: SbLike;
  title: string;
  source: string;
  sourceCategoryRaw?: string | null;
  sourceCategoryPathRaw?: string | null;
  fallbackCategoryId?: string | null;
  fallbackCategorySlug?: string | null;
  sourceQuery?: string | null;
  slugToId: Map<string, string>;
}

function slugifySourceCat(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[ıİiİ]/g, "i")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// kept for future hierarchik auto-create (P6.2a — auto-create devre dışı 2026-05-02)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function isCleanSourceCategory(raw: string): boolean {
  if (!raw || raw.length < 3 || raw.length > 60) return false;
  if (/^[\d-]+$/.test(raw)) return false;
  return /[a-zçşğıöüA-ZÇŞĞİÖÜ]{3,}/.test(raw);
}

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\u0131/g, "i")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const QUERY_STOPWORDS = new Set([
  "pro",
  "max",
  "plus",
  "ultra",
  "mini",
  "gb",
  "tb",
  "ve",
  "ile",
  "icin",
  "uyumlu",
]);

function buildQueryTokens(query: string): string[] {
  return normalizeSearchText(query)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !QUERY_STOPWORDS.has(token));
}

function splitSourceCategoryPath(rawPath?: string | null): string[] {
  if (!rawPath) return [];
  return rawPath
    .split(/\s*(?:\/|>|\u203a|\u00bb|\|)\s*/g)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function hasQueryRelevance(title: string, query?: string | null): boolean {
  if (!query) return true;

  const normalizedTitle = normalizeSearchText(title);
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  if (normalizedTitle.includes(normalizedQuery)) return true;

  const tokens = buildQueryTokens(query);
  if (tokens.length === 0) return true;

  return tokens.some((token) => normalizedTitle.includes(token));
}

function isCompatibleWithFallback(
  fallbackSlug: string,
  candidateSlug: string,
): boolean {
  if (fallbackSlug === candidateSlug) return true;

  if (fallbackSlug.endsWith("/akilli-telefon")) {
    return candidateSlug.startsWith("elektronik/telefon/");
  }

  if (fallbackSlug.endsWith("/laptop")) {
    return (
      candidateSlug.endsWith("/laptop") ||
      candidateSlug.endsWith("/bilesenler") ||
      candidateSlug.endsWith("/klavye-mouse-webcam")
    );
  }

  if (fallbackSlug.endsWith("/akilli-saat")) {
    return candidateSlug.endsWith("/akilli-saat");
  }

  if (fallbackSlug.endsWith("/televizyon")) {
    return (
      candidateSlug.endsWith("/televizyon") ||
      candidateSlug.endsWith("/tv-aksesuar")
    );
  }

  const fallbackRoot = fallbackSlug.split("/")[0];
  const candidateRoot = candidateSlug.split("/")[0];
  return fallbackRoot.length > 0 && fallbackRoot === candidateRoot;
}

/**
 * Leaf-only veya full-path slug'ı slugToId Map'inde çözer.
 * Phase 5 sonrası slugToId key'leri full hierarchik path. Üç katman:
 *   1. Direct hit (zaten full-path)
 *   2. SOURCE_CATEGORY_MAP fallback (eski leaf-only → yeni full path,
 *      categorizeFromTitle gibi leaf-only çıktılar için)
 *   3. Leaf-suffix match (DB taxonomy'de "/leaf" ile biten tek satır)
 * Çoklu match'te console.warn + null fallback.
 */
function resolveLeafToFullPath(
  slugToId: Map<string, string>,
  leafOrPath: string,
): { id: string; slug: string } | null {
  const direct = slugToId.get(leafOrPath);
  if (direct) return { id: direct, slug: leafOrPath };

  // SOURCE_CATEGORY_MAP fallback: eski leaf-only slug'ı yeni full path'e çevir.
  // Örn. categorizeFromTitle "telefon-kilifi" → MAP'te "elektronik/telefon/kilif".
  const mapped = SOURCE_CATEGORY_MAP[leafOrPath];
  if (mapped) {
    const id = slugToId.get(mapped);
    if (id) return { id, slug: mapped };
  }

  const suffix = "/" + leafOrPath;
  const matches: Array<[string, string]> = [];
  for (const [slug, id] of slugToId) {
    if (slug.endsWith(suffix)) matches.push([slug, id]);
  }
  if (matches.length === 1) return { id: matches[0][1], slug: matches[0][0] };
  if (matches.length > 1) {
    console.warn(
      `[classify] ambiguous leaf: ${leafOrPath} -> matches: ${matches.map((m) => m[0]).join(", ")}`,
    );
  }
  return null;
}

// kept for future hierarchik auto-create (P6.2a — auto-create devre dışı 2026-05-02)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function findOrCreateAutoCategory(
  sb: SbLike,
  sourceCatRaw: string,
  source: string,
  unclassParentId: string | null,
): Promise<{ id: string; slug: string } | null> {
  const baseSlug = slugifySourceCat(sourceCatRaw);
  if (!baseSlug || baseSlug.length < 3) return null;
  const candidateSlug = `auto-${source}-${baseSlug}`.slice(0, 80);

  const { data: existing } = await sb
    .from("categories")
    .select("id, slug")
    .eq("slug", candidateSlug)
    .maybeSingle();
  if (existing) return { id: existing.id, slug: existing.slug };

  const { data, error } = await sb
    .from("categories")
    .insert({
      slug: candidateSlug,
      name: `${source}: ${sourceCatRaw}`,
      is_active: true,
      is_leaf: true,
      parent_id: unclassParentId,
    })
    .select("id, slug")
    .single();

  if (error || !data) {
    console.warn(`[classify] auto-create failed for "${sourceCatRaw}": ${error?.message ?? "unknown"}`);
    return null;
  }
  console.log(`[classify] auto-created cat: ${data.slug} (from ${source}:"${sourceCatRaw}")`);
  return { id: data.id, slug: data.slug };
}

/**
 * Ürün için kategori belirle. Tüm pazaryerleri bu fonksiyonu kullanır.
 */
export async function classifyScrapedProduct(
  input: ScrapeClassifyInput,
  unclassParentId: string | null,
): Promise<ScrapeClassifyResult> {
  // sb + source destructuring'den çıkarıldı (auto-create devre dışı, runtime'da
  // kullanılmıyor). input'ta hâlâ caller tarafından geçiyor — imza aynı.
  const {
    title,
    source,
    sourceCategoryRaw,
    sourceCategoryPathRaw,
    fallbackCategoryId,
    fallbackCategorySlug,
    sourceQuery,
    slugToId,
  } = input;

  if (source === "pttavm") {
    const pttavmMapped = resolvePttavmSourceCategory(
      sourceCategoryPathRaw,
      sourceCategoryRaw,
    );

    if (pttavmMapped) {
      const id = slugToId.get(pttavmMapped.canonicalSlug);
      if (id) {
        return {
          categoryId: id,
          slug: pttavmMapped.canonicalSlug,
          method: "source_mapped",
          reason: `pttavm-path:${pttavmMapped.matchedSegment}`,
        };
      }
    }
  }

  if (sourceCategoryPathRaw) {
    const candidates = splitSourceCategoryPath(sourceCategoryPathRaw).reverse();
    for (const candidate of candidates) {
      const mappedSlug = SOURCE_CATEGORY_MAP[candidate];
      if (!mappedSlug) continue;
      const id = slugToId.get(mappedSlug);
      if (id) {
        return {
          categoryId: id,
          slug: mappedSlug,
          method: "source_mapped",
          reason: `${source}-path:${candidate}`,
        };
      }
    }
  }

  // 1. source_category MAP'te varsa
  if (sourceCategoryRaw) {
    const mappedSlug = SOURCE_CATEGORY_MAP[sourceCategoryRaw];
    if (mappedSlug) {
      const id = slugToId.get(mappedSlug);
      if (id)
        return {
          categoryId: id,
          slug: mappedSlug,
          method: "source_mapped",
          reason: `mapped: ${sourceCategoryRaw}`,
        };
    }
  }

  // 2 + 3. Title classifier (high → medium). categorizeFromTitle leaf-only
  // slug döndürür; Phase 5 slugToId full-path key — resolver leaf-suffix
  // match ile çevirir.
  const guess = categorizeFromTitle(title || "");
  if (guess.slug && (guess.confidence === "high" || guess.confidence === "medium")) {
    const resolved = resolveLeafToFullPath(slugToId, guess.slug);
    if (resolved) {
      if (
        source === "pttavm" &&
        !sourceCategoryRaw &&
        fallbackCategorySlug &&
        !isCompatibleWithFallback(fallbackCategorySlug, resolved.slug)
      ) {
        return {
          categoryId: null,
          slug: null,
          method: "filtered_out",
          reason: `pttavm-incompatible:${resolved.slug}:query=${sourceQuery ?? "-"}`,
          skip: true,
        };
      }

      return {
        categoryId: resolved.id,
        slug: resolved.slug,
        method: guess.confidence === "high" ? "title_high" : "title_medium",
        reason: `title-${guess.confidence}: ${guess.matchedKeyword}`,
      };
    }
  }

  // 4. Auto-create — DEVRE DIŞI (P6.2a, 2026-05-02). Phase 5 hierarchik
  //    taxonomy ile uyumsuz (auto-* kategoriler keywords NULL, NAV'da yok,
  //    kullanıcı bulamıyor). Yeni source_category gelirse 5. fallback yoluna
  //    düşer; sonra SOURCE_CATEGORY_MAP'e manuel ekle.
  //    findOrCreateAutoCategory + isCleanSourceCategory + slugifySourceCat
  //    function gövdeleri korundu (gelecekte hierarchik versiyon için).

  // 5. Fallback to provided
  if (fallbackCategoryId) {
    if (
      source === "pttavm" &&
      !sourceCategoryRaw &&
      !hasQueryRelevance(title, sourceQuery)
    ) {
      return {
        categoryId: null,
        slug: null,
        method: "filtered_out",
        reason: `pttavm-query-miss:${sourceQuery ?? "-"}`,
        skip: true,
      };
    }

    return {
      categoryId: fallbackCategoryId,
      slug: fallbackCategorySlug ?? null,
      method: "fallback",
      reason: source === "pttavm" ? "pttavm-query-anchor" : "cron-provided",
    };
  }

  // 6. Unclassified
  return {
    categoryId: unclassParentId ?? null,
    slug: "siniflandirilmamis",
    method: "unclassified",
    reason: "no match",
  };
}
