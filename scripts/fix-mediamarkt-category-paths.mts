/**
 * Reclassify old MediaMarkt products from captured breadcrumb/source category.
 *
 * Dry-run by default:
 *   npx tsx --env-file=.env.local scripts/fix-mediamarkt-category-paths.mts
 *
 * Apply product/listing metadata updates:
 *   APPLY=1 npx tsx --env-file=.env.local scripts/fix-mediamarkt-category-paths.mts
 *
 * Also apply category moves after reviewing dry-run:
 *   APPLY=1 APPLY_MOVES=1 npx tsx --env-file=.env.local scripts/fix-mediamarkt-category-paths.mts
 *
 * Useful probes:
 *   LIMIT=200 npx tsx --env-file=.env.local scripts/fix-mediamarkt-category-paths.mts
 *   URL=https://www.mediamarkt.com.tr/tr/product/_... npx tsx --env-file=.env.local scripts/fix-mediamarkt-category-paths.mts
 */
import { createClient } from "@supabase/supabase-js";

const mmCategoryMap = await import("../src/lib/scrapers/mediamarkt-category-map.mts");

type JsonRecord = Record<string, unknown>;

interface ListingRow {
  id: string;
  product_id: string | null;
  source_url: string | null;
  source_title: string | null;
  source_category: string | null;
  products?: ProductRow | ProductRow[] | null;
}

interface ProductRow {
  id: string;
  title: string | null;
  category_id: string | null;
  specs: JsonRecord | null;
}

interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  parent_id: string | null;
}

interface SourceMeta {
  sourceCategory: string | null;
  sourceCategoryPath: string | null;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const sb = createClient(supabaseUrl, serviceRoleKey);
const apply = process.env.APPLY === "1";
const applyMoves = process.env.APPLY_MOVES === "1";
const batchSize = readPositiveInt("BATCH_SIZE", 100);
const maxListings = readOptionalPositiveInt("LIMIT") ?? readOptionalPositiveInt("MAX_LISTINGS");
const offset = readPositiveInt("OFFSET", 0);
const urlFilter = process.env.URL?.trim() || null;

const stats = {
  listingsScanned: 0,
  productsScanned: 0,
  alreadyCorrect: 0,
  wouldMove: 0,
  moved: 0,
  metadataUpdates: 0,
  listingUpdates: 0,
  unresolved: 0,
  missingProduct: 0,
  errors: 0,
};

const transitionCounts = new Map<string, number>();
const unresolvedSamples: string[] = [];
const processedProductIds = new Set<string>();

const categories = await fetchAllCategories();
const slugToCategory = new Map(categories.map((category) => [category.slug, category]));
const idToCategory = new Map(categories.map((category) => [category.id, category]));

process.stdout.write(
  [
    "MediaMarkt category cleanup",
    `mode=${apply ? "APPLY" : "DRY_RUN"}`,
    `apply_moves=${applyMoves ? "yes" : "no"}`,
    `batch_size=${batchSize}`,
    `max_listings=${maxListings ?? "all"}`,
    `offset=${offset}`,
    urlFilter ? `url=${urlFilter}` : null,
  ]
    .filter(Boolean)
    .join(" | ") + "\n\n",
);

let nextOffset = offset;
const allListings: ListingRow[] = [];

while (true) {
  const remaining =
    maxListings == null ? batchSize : Math.min(batchSize, maxListings - allListings.length);
  if (remaining <= 0) break;

  const listings = await fetchMediaMarktListings(nextOffset, remaining);
  if (listings.length === 0) break;

  allListings.push(...listings);
  if (urlFilter || listings.length < remaining) break;
  nextOffset += listings.length;
}

for (const listing of allListings) {
  stats.listingsScanned += 1;
  const product = normalizeNestedProduct(listing.products);
  if (!product) {
    stats.missingProduct += 1;
    continue;
  }
  if (processedProductIds.has(product.id)) continue;
  processedProductIds.add(product.id);
  stats.productsScanned += 1;

  try {
    await processProduct(product, listing);
  } catch (error) {
    stats.errors += 1;
    process.stderr.write(
      `product process failed ${product.id}: ${
        error instanceof Error ? error.message : "unknown error"
      }\n`,
    );
  }
}

printReport();

async function processProduct(product: ProductRow, listing: ListingRow): Promise<void> {
  const meta = getSourceMeta(product, listing);
  const target = resolveTargetCategory(meta);
  if (!target) {
    stats.unresolved += 1;
    addUnresolvedSample(product, listing, meta);
    return;
  }

  const currentCategory = product.category_id ? idToCategory.get(product.category_id) : null;
  const currentSlug = currentCategory?.slug ?? "(none)";
  const needsCategoryMove = product.category_id !== target.id;
  const specsUpdate = buildSpecsUpdate(product.specs, meta);
  const needsMetadataUpdate = specsUpdate.changed;
  const needsListingUpdate = Boolean(
    meta.sourceCategory && listing.source_category !== meta.sourceCategory,
  );

  if (!needsCategoryMove && !needsMetadataUpdate && !needsListingUpdate) {
    stats.alreadyCorrect += 1;
  }

  if (needsCategoryMove) {
    stats.wouldMove += 1;
    const key = `${currentSlug} -> ${target.slug}`;
    transitionCounts.set(key, (transitionCounts.get(key) ?? 0) + 1);
  }
  if (needsMetadataUpdate) stats.metadataUpdates += 1;
  if (needsListingUpdate) stats.listingUpdates += 1;

  if (!apply) return;

  const shouldMoveCategory = needsCategoryMove && applyMoves;

  if (shouldMoveCategory || needsMetadataUpdate) {
    const { error } = await sb
      .from("products")
      .update({
        ...(shouldMoveCategory ? { category_id: target.id } : {}),
        ...(needsMetadataUpdate ? { specs: specsUpdate.specs } : {}),
      })
      .eq("id", product.id);

    if (error) {
      stats.errors += 1;
      process.stderr.write(`product update failed ${product.id}: ${error.message}\n`);
    } else if (shouldMoveCategory) {
      stats.moved += 1;
    }
  }

  if (needsListingUpdate && meta.sourceCategory) {
    const { error } = await sb
      .from("listings")
      .update({ source_category: meta.sourceCategory })
      .eq("id", listing.id);

    if (error) {
      stats.errors += 1;
      process.stderr.write(`listing update failed ${listing.id}: ${error.message}\n`);
    }
  }
}

function getSourceMeta(product: ProductRow, listing: ListingRow): SourceMeta {
  const specs = product.specs ?? {};
  const rawPath = stringValue(specs.mediamarkt_path);
  const path = normalizeMediaMarktPath(rawPath, listing.source_title ?? product.title);
  const pathLeaf = path ? splitMediaMarktPath(path).at(-1) ?? null : null;

  return {
    sourceCategory:
      pathLeaf ??
      stringValue(specs.mediamarkt_category) ??
      listing.source_category ??
      null,
    sourceCategoryPath: path,
  };
}

function resolveTargetCategory(meta: SourceMeta): CategoryRow | null {
  const segments = splitMediaMarktPath(meta.sourceCategoryPath);
  const breadcrumb = segments.map((name, index) => ({ name, position: index + 1 }));

  if (meta.sourceCategory && !segments.some((segment) => sameTr(segment, meta.sourceCategory))) {
    breadcrumb.push({ name: meta.sourceCategory, position: breadcrumb.length + 1 });
  }

  const resolved = mmCategoryMap.findDbSlugForMmBreadcrumb(breadcrumb);
  if (!resolved) return null;
  return slugToCategory.get(resolved.dbSlug) ?? null;
}

function normalizeMediaMarktPath(
  rawPath?: string | null,
  productTitle?: string | null,
): string | null {
  const segments = splitMediaMarktPath(rawPath);
  if (segments.length === 0) return null;

  const normalizedTitle = productTitle?.trim().toLocaleLowerCase("tr") ?? "";
  const filtered = segments.filter((segment, index) => {
    if (segment.toLocaleLowerCase("tr") === "home") return false;
    if (index !== segments.length - 1 || !normalizedTitle) return true;
    return segment.toLocaleLowerCase("tr") !== normalizedTitle;
  });

  return filtered.length > 0 ? filtered.join(" > ") : null;
}

function splitMediaMarktPath(rawPath?: string | null): string[] {
  if (!rawPath) return [];
  return rawPath
    .split(/\s*(?:\/|>|\u203a|\u00bb|\|)\s*/g)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function buildSpecsUpdate(
  specs: JsonRecord | null,
  meta: SourceMeta,
): { specs: JsonRecord; changed: boolean } {
  const nextSpecs: JsonRecord = { ...(specs ?? {}) };
  let changed = false;

  if (meta.sourceCategory && nextSpecs.mediamarkt_category !== meta.sourceCategory) {
    nextSpecs.mediamarkt_category = meta.sourceCategory;
    changed = true;
  }

  if (meta.sourceCategoryPath && nextSpecs.mediamarkt_path !== meta.sourceCategoryPath) {
    nextSpecs.mediamarkt_path = meta.sourceCategoryPath;
    changed = true;
  }

  return { specs: nextSpecs, changed };
}

async function fetchAllCategories(): Promise<CategoryRow[]> {
  const rows: CategoryRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from("categories")
      .select("id, slug, name, parent_id")
      .range(from, from + 999);
    if (error) throw new Error(`category fetch failed: ${error.message}`);
    rows.push(...((data ?? []) as CategoryRow[]));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

async function fetchMediaMarktListings(from: number, count: number): Promise<ListingRow[]> {
  let query = sb
    .from("listings")
    .select("id, product_id, source_url, source_title, source_category, products!inner(id, title, category_id, specs)")
    .eq("source", "mediamarkt")
    .order("id", { ascending: true })
    .range(from, from + count - 1);

  if (urlFilter) query = query.eq("source_url", urlFilter);

  const { data, error } = await query;
  if (error) throw new Error(`listing fetch failed: ${error.message}`);
  return (data ?? []) as unknown as ListingRow[];
}

function normalizeNestedProduct(value: ProductRow | ProductRow[] | null | undefined): ProductRow | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function addUnresolvedSample(
  product: ProductRow,
  listing: ListingRow,
  meta: SourceMeta,
): void {
  if (unresolvedSamples.length >= 12) return;
  unresolvedSamples.push(
    [
      product.title ?? listing.source_title ?? product.id,
      `source_category=${meta.sourceCategory ?? "-"}`,
      `source_path=${meta.sourceCategoryPath ?? "-"}`,
      listing.source_url ?? "-",
    ].join(" | "),
  );
}

function printReport(): void {
  process.stdout.write("\n=== Summary ===\n");
  process.stdout.write(`listings scanned: ${stats.listingsScanned}\n`);
  process.stdout.write(`products scanned: ${stats.productsScanned}\n`);
  process.stdout.write(`already correct: ${stats.alreadyCorrect}\n`);
  process.stdout.write(`would move: ${stats.wouldMove}\n`);
  process.stdout.write(`moved: ${stats.moved}\n`);
  process.stdout.write(`metadata updates: ${stats.metadataUpdates}\n`);
  process.stdout.write(`listing source_category updates: ${stats.listingUpdates}\n`);
  process.stdout.write(`missing products: ${stats.missingProduct}\n`);
  process.stdout.write(`unresolved: ${stats.unresolved}\n`);
  process.stdout.write(`errors: ${stats.errors}\n`);

  if (transitionCounts.size > 0) {
    process.stdout.write("\n=== Planned moves ===\n");
    for (const [transition, count] of [...transitionCounts.entries()].sort((a, b) => b[1] - a[1])) {
      process.stdout.write(`  ${String(count).padStart(4)}  ${transition}\n`);
    }
  }

  if (unresolvedSamples.length > 0) {
    process.stdout.write("\n=== Unresolved samples ===\n");
    for (const sample of unresolvedSamples) process.stdout.write(`  ${sample}\n`);
  }

  if (!apply) {
    process.stdout.write("\nDry-run only. Add APPLY=1 to update products/listings.\n");
  }
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function sameTr(left: string, right: string): boolean {
  return left.localeCompare(right, "tr", { sensitivity: "base" }) === 0;
}

function readPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readOptionalPositiveInt(name: string): number | null {
  const raw = process.env[name];
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
