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

// Caller passes a Supabase client (any to avoid generic depth issues).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SbLike = any;

// ═══ Source Category Map — tüm pazaryerleri için merkezi mapping ═══
// Yeni pazaryeri ekledikçe burayı genişlet. Tek source: SOR.
export const SOURCE_CATEGORY_MAP: Record<string, string> = {
  // MediaMarkt — Telefon
  "Android Telefonlar": "akilli-telefon",
  "iPhone 11": "akilli-telefon",
  "iPhone 14 Pro Max": "akilli-telefon",
  "iPhone 17 Pro Max": "akilli-telefon",
  "Galaxy A": "akilli-telefon",
  "Galaxy S": "akilli-telefon",
  "Galaxy Z": "akilli-telefon",
  "Samsung Telefon": "akilli-telefon",
  "General Mobile Telefon": "akilli-telefon",

  // MM — Laptop
  "Casper Laptop": "laptop",
  "HP Laptop": "laptop",
  "Asus Laptop": "laptop",
  "Acer Laptop": "laptop",
  "Huawei Laptop": "laptop",
  "Lenovo Laptop": "laptop",
  "Lenovo Laptop Modelleri": "laptop",
  Laptop: "laptop",

  // MM — Akıllı Saat
  "Akıllı Saatler": "akilli-saat",
  "Bilicra Akıllı Saat": "akilli-saat",

  // MM — Tablet
  "Android Tabletler": "tablet",
  Tabletler: "tablet",

  // MM — Mutfak
  Blender: "blender",
  "Kahve Makinesi": "kahve-makinesi",
  "Espresso Kahve Makineleri": "kahve-makinesi",
  "Filtre Kahve Makineleri": "kahve-makinesi",
  "Robot Süpürge": "robot-supurge",
  "Ankastre Fırın": "firin",
  "Ankastre Bulaşık Makineleri": "bulasik-makinesi",
  "Çamaşır Makineleri": "camasir-makinesi",
  Buzdolabi: "buzdolabi",
  Klimalar: "klima",

  // MM — Powerbank
  "Taşınabilir Şarj Cihazları": "powerbank",
  "MagSafe Powerbank": "powerbank",
  "Ttec Powerbank": "powerbank",
  "Ugreen Powerbank": "powerbank",

  // MM — Diğer
  Drone: "drone",
  "Oyun Konsolları": "oyun-konsol",

  // PttAVM (kebab-case) — pre-existing slug formatı
  "akilli-telefon": "akilli-telefon",
  "telefon-kilifi": "telefon-kilifi",
  "telefon-yedek-parca": "telefon-yedek-parca",
  "telefon-aksesuar": "telefon-aksesuar",
  "ekran-koruyucu": "ekran-koruyucu",
  "sarj-kablo": "sarj-kablo",
  "akilli-saat": "akilli-saat",
  "kahve-makinesi": "kahve-makinesi",
  buzdolabi: "buzdolabi",
  "tost-makinesi": "tost-makinesi",
  televizyon: "tv",
  "tv-aksesuar": "tv-aksesuar",
  "fotograf-kamera": "fotograf-kamera",
  "guvenlik-kamerasi": "guvenlik-kamerasi",
  "bilgisayar-bilesenleri": "bilgisayar-bilesenleri",
};

export type ClassifyMethod =
  | "source_mapped"
  | "auto_created"
  | "title_high"
  | "title_medium"
  | "fallback"
  | "unclassified";

export interface ScrapeClassifyResult {
  categoryId: string | null;
  slug: string | null;
  method: ClassifyMethod;
  reason: string;
}

export interface ScrapeClassifyInput {
  sb: SbLike;
  title: string;
  source: string;
  sourceCategoryRaw?: string | null;
  fallbackCategoryId?: string | null;
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

function isCleanSourceCategory(raw: string): boolean {
  if (!raw || raw.length < 3 || raw.length > 60) return false;
  if (/^[\d-]+$/.test(raw)) return false;
  return /[a-zçşğıöüA-ZÇŞĞİÖÜ]{3,}/.test(raw);
}

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
  const { sb, title, source, sourceCategoryRaw, fallbackCategoryId, slugToId } = input;

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

  // 2 + 3. Title classifier (high → medium)
  const guess = categorizeFromTitle(title || "");
  if (guess.slug && (guess.confidence === "high" || guess.confidence === "medium")) {
    const id = slugToId.get(guess.slug);
    if (id) {
      return {
        categoryId: id,
        slug: guess.slug,
        method: guess.confidence === "high" ? "title_high" : "title_medium",
        reason: `title-${guess.confidence}: ${guess.matchedKeyword}`,
      };
    }
  }

  // 4. Auto-create (ONLY if title classifier gave nothing AND source_category is clean)
  if (sourceCategoryRaw && isCleanSourceCategory(sourceCategoryRaw)) {
    const created = await findOrCreateAutoCategory(sb, sourceCategoryRaw, source, unclassParentId);
    if (created) {
      slugToId.set(created.slug, created.id);
      return {
        categoryId: created.id,
        slug: created.slug,
        method: "auto_created",
        reason: `auto: ${sourceCategoryRaw}`,
      };
    }
  }

  // 5. Fallback to provided
  if (fallbackCategoryId)
    return { categoryId: fallbackCategoryId, slug: null, method: "fallback", reason: "cron-provided" };

  // 6. Unclassified
  return {
    categoryId: unclassParentId ?? null,
    slug: "siniflandirilmamis",
    method: "unclassified",
    reason: "no match",
  };
}
