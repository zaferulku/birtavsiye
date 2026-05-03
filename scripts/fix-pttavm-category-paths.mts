/**
 * Reclassify old PttAVM products from the source breadcrumb path.
 *
 * Dry-run by default:
 *   npx tsx --env-file=.env.local scripts/fix-pttavm-category-paths.mts
 *
 * Apply product/listing updates:
 *   APPLY=1 npx tsx --env-file=.env.local scripts/fix-pttavm-category-paths.mts
 *
 * Also create missing category path nodes:
 *   APPLY=1 CREATE_MISSING=1 npx tsx --env-file=.env.local scripts/fix-pttavm-category-paths.mts
 *
 * Useful probes:
 *   URL=https://www.pttavm.com/uzum-cekirdegi-yagi-20-ml-p-1382117652 npx tsx --env-file=.env.local scripts/fix-pttavm-category-paths.mts
 *   LIMIT=25 ENRICH=0 npx tsx --env-file=.env.local scripts/fix-pttavm-category-paths.mts
 *   BATCH_SIZE=100 CONCURRENCY=6 MAX_LISTINGS=500 npx tsx --env-file=.env.local scripts/fix-pttavm-category-paths.mts
 */
import { createClient } from "@supabase/supabase-js";

type PttavmCategoryChainNode = {
  slug: string;
  name: string;
};

const pttavmCategoryMap = await import("../src/lib/scrapers/pttavmCategoryMap.ts");

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
};

type JsonRecord = Record<string, unknown>;

interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  parent_id: string | null;
  is_active: boolean | null;
  is_leaf: boolean | null;
}

interface ListingRow {
  id: string;
  product_id: string | null;
  source_url: string | null;
  source_title: string | null;
  source_category: string | null;
}

interface ProductRow {
  id: string;
  title: string | null;
  category_id: string | null;
  specs: JsonRecord | null;
}

interface SourceMeta {
  sourceCategory: string | null;
  sourceCategoryPath: string | null;
  enrichedFromDetail: boolean;
}

interface Stats {
  scannedProducts: number;
  listingsScanned: number;
  missingProduct: number;
  alreadyCorrect: number;
  wouldMove: number;
  moved: number;
  metadataUpdates: number;
  listingUpdates: number;
  categoryRepairs: number;
  enrichedFromDetail: number;
  unresolved: number;
  errors: number;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const sb = createClient(supabaseUrl, serviceRoleKey);

const apply = process.env.APPLY === "1";
const createMissing = process.env.CREATE_MISSING === "1";
const enrich = process.env.ENRICH !== "0";
const trustLeafOnly = process.env.TRUST_LEAF_ONLY === "1";
const batchSize = readPositiveInt("BATCH_SIZE", 100);
const concurrency = readPositiveInt("CONCURRENCY", 6);
const maxListings =
  readOptionalPositiveInt("LIMIT") ?? readOptionalPositiveInt("MAX_LISTINGS");
const offset = readPositiveInt("OFFSET", 0);
const urlFilter = process.env.URL?.trim() || null;

const stats: Stats = {
  scannedProducts: 0,
  listingsScanned: 0,
  missingProduct: 0,
  alreadyCorrect: 0,
  wouldMove: 0,
  moved: 0,
  metadataUpdates: 0,
  listingUpdates: 0,
  categoryRepairs: 0,
  enrichedFromDetail: 0,
  unresolved: 0,
  errors: 0,
};

const plannedCategoryCreates = new Set<string>();
const transitionCounts = new Map<string, number>();
const unresolvedSamples: string[] = [];
const processedProductIds = new Set<string>();

const categories = await fetchAllCategories();
const slugToCategory = new Map(categories.map((category) => [category.slug, category]));
const idToCategory = new Map(categories.map((category) => [category.id, category]));

process.stdout.write(
  [
    "PttAVM category cleanup",
    `mode=${apply ? "APPLY" : "DRY_RUN"}`,
    `create_missing=${createMissing ? "yes" : "no"}`,
    `enrich=${enrich ? "yes" : "no"}`,
    `batch_size=${batchSize}`,
    `concurrency=${concurrency}`,
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

  const listings = await fetchPttavmListings(nextOffset, remaining);
  if (listings.length === 0) break;

  allListings.push(...listings);

  if (urlFilter || listings.length < remaining) break;
  nextOffset += listings.length;
}

await processListingsBatch(allListings);

printReport();

async function processListingsBatch(listings: ListingRow[]): Promise<void> {
  stats.listingsScanned += listings.length;

  const productIds = unique(
    listings.map((listing) => listing.product_id).filter((id): id is string => Boolean(id)),
  );
  const products = await fetchProducts(productIds);
  const productById = new Map(products.map((product) => [product.id, product]));
  const listingsByProduct = groupListingsByProduct(listings);
  const entries = [...listingsByProduct.entries()];
  let nextIndex = 0;

  await Promise.all(
    Array.from({ length: Math.min(concurrency, entries.length) }, async () => {
      while (true) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        const entry = entries[currentIndex];
        if (!entry) return;

        const [productId, productListings] = entry;
        if (processedProductIds.has(productId)) continue;
        processedProductIds.add(productId);

        const product = productById.get(productId);
        if (!product) {
          stats.missingProduct += 1;
          continue;
        }

        stats.scannedProducts += 1;
        try {
          await processProduct(product, productListings);
        } catch (error) {
          stats.errors += 1;
          process.stderr.write(
            `product process failed ${product.id}: ${
              error instanceof Error ? error.message : "unknown error"
            }\n`,
          );
        }
      }
    }),
  );
}

async function processProduct(product: ProductRow, productListings: ListingRow[]): Promise<void> {
  const listing = pickBestListing(productListings);
  const meta = await getSourceMeta(product, listing);
  if (meta.enrichedFromDetail) stats.enrichedFromDetail += 1;

  const target = await resolveTargetCategory(product, meta);
  if (!target) {
    stats.unresolved += 1;
    addUnresolvedSample(product, listing, meta);
    return;
  }

  const currentCategory = product.category_id ? idToCategory.get(product.category_id) : null;
  const currentSlug = currentCategory?.slug ?? "(none)";
  const transitionKey = `${currentSlug} -> ${target.slug}`;

  const specsUpdate = buildSpecsUpdate(product.specs, meta);
  const needsMetadataUpdate = specsUpdate.changed;
  const needsCategoryMove = product.category_id !== target.id;

  if (!needsCategoryMove && !needsMetadataUpdate) {
    stats.alreadyCorrect += 1;
  } else if (needsCategoryMove) {
    stats.wouldMove += 1;
    transitionCounts.set(transitionKey, (transitionCounts.get(transitionKey) ?? 0) + 1);
  }

  if (needsMetadataUpdate) stats.metadataUpdates += 1;

  if (apply && (needsCategoryMove || needsMetadataUpdate)) {
    const { error } = await sb
      .from("products")
      .update({
        ...(needsCategoryMove ? { category_id: target.id } : {}),
        ...(needsMetadataUpdate ? { specs: specsUpdate.specs } : {}),
      })
      .eq("id", product.id);

    if (error) {
      stats.errors += 1;
      process.stderr.write(`product update failed ${product.id}: ${error.message}\n`);
    } else if (needsCategoryMove) {
      stats.moved += 1;
    }
  }

  await updateListingLeaf(productListings, meta);
}

async function resolveTargetCategory(
  product: ProductRow,
  meta: SourceMeta,
): Promise<CategoryRow | null> {
  const trustedLeaf = meta.sourceCategoryPath || trustLeafOnly ? meta.sourceCategory : null;
  const resolved = pttavmCategoryMap.resolvePttavmSourceCategory(
    meta.sourceCategoryPath,
    trustedLeaf,
  );

  if (resolved) {
    const existing = slugToCategory.get(resolved.canonicalSlug);
    if (existing) return existing;

    if (createMissing) {
      return ensureCategoryPathFromSlug(resolved.canonicalSlug, resolved.matchedSegment);
    }

    plannedCategoryCreates.add(resolved.canonicalSlug);
    return null;
  }

  if (!createMissing || !meta.sourceCategoryPath) return null;

  const chain = pttavmCategoryMap.buildPttavmAutoCategoryChain(
    meta.sourceCategoryPath,
    product.title,
  );
  if (chain.length === 0) return null;

  return ensureCategoryChain(chain);
}

async function getSourceMeta(product: ProductRow, listing: ListingRow | null): Promise<SourceMeta> {
  const specs = product.specs ?? {};
  let sourceCategory = stringValue(specs.pttavm_category) ?? listing?.source_category ?? null;
  let sourceCategoryPath = stringValue(specs.pttavm_path) ?? null;
  const sourceTitle = listing?.source_title ?? product.title;

  if (sourceCategoryPath) {
    const normalized = pttavmCategoryMap.buildPttavmCategoryPath(
      pttavmCategoryMap.splitPttavmCategoryPath(sourceCategoryPath),
      sourceTitle,
    );
    sourceCategory = normalized.sourceCategory ?? sourceCategory;
    sourceCategoryPath = normalized.sourceCategoryPath ?? sourceCategoryPath;
  }

  if (sourceCategoryPath || !enrich || !listing?.source_url) {
    return {
      sourceCategory,
      sourceCategoryPath,
      enrichedFromDetail: false,
    };
  }

  const detailMeta = await fetchPttavmDetailMeta(listing.source_url, sourceTitle);
  if (!detailMeta.sourceCategory && !detailMeta.sourceCategoryPath) {
    return {
      sourceCategory,
      sourceCategoryPath,
      enrichedFromDetail: false,
    };
  }

  sourceCategory = detailMeta.sourceCategory ?? sourceCategory;
  sourceCategoryPath = detailMeta.sourceCategoryPath ?? sourceCategoryPath;

  return {
    sourceCategory,
    sourceCategoryPath,
    enrichedFromDetail: true,
  };
}

async function fetchPttavmDetailMeta(
  sourceUrl: string,
  title?: string | null,
): Promise<{ sourceCategory: string | null; sourceCategoryPath: string | null }> {
  try {
    const response = await fetch(sourceUrl, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) return { sourceCategory: null, sourceCategoryPath: null };

    const html = await response.text();
    const breadcrumb = pttavmCategoryMap.extractPttavmBreadcrumbSegmentsFromHtml(html);
    return pttavmCategoryMap.buildPttavmCategoryPath(breadcrumb, title);
  } catch (error) {
    stats.errors += 1;
    process.stderr.write(
      `detail fetch failed ${sourceUrl}: ${
        error instanceof Error ? error.message : "unknown error"
      }\n`,
    );
    return { sourceCategory: null, sourceCategoryPath: null };
  }
}

async function updateListingLeaf(listingsForProduct: ListingRow[], meta: SourceMeta): Promise<void> {
  if (!meta.sourceCategory) return;

  const listingIds = listingsForProduct
    .filter((listing) => listing.source_category !== meta.sourceCategory)
    .map((listing) => listing.id);

  if (listingIds.length === 0) return;

  stats.listingUpdates += listingIds.length;
  if (!apply) return;

  for (const chunk of chunkArray(listingIds, 100)) {
    const { error } = await sb
      .from("listings")
      .update({ source_category: meta.sourceCategory })
      .in("id", chunk);

    if (error) {
      stats.errors += 1;
      process.stderr.write(`listing source_category update failed: ${error.message}\n`);
    }
  }
}

async function ensureCategoryPathFromSlug(
  targetSlug: string,
  leafName?: string | null,
): Promise<CategoryRow | null> {
  const parts = targetSlug.split("/").filter(Boolean);
  if (parts.length === 0) return null;

  let parentId: string | null = null;
  let currentSlug = "";
  let category: CategoryRow | null = null;

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    currentSlug = currentSlug ? `${currentSlug}/${part}` : part;
    category = slugToCategory.get(currentSlug) ?? null;

    const isFinal = index === parts.length - 1;
    if (!category) {
      category = await createCategory({
        slug: currentSlug,
        name: isFinal && leafName ? leafName : labelFromSlug(part),
        parentId,
        isLeaf: isFinal,
      });
    } else {
      category = await ensureCategoryShape(category, parentId, isFinal);
    }

    parentId = category?.id ?? parentId;
  }

  return category;
}

async function ensureCategoryChain(chain: PttavmCategoryChainNode[]): Promise<CategoryRow | null> {
  let parentId: string | null = null;
  let category: CategoryRow | null = null;

  for (let index = 0; index < chain.length; index += 1) {
    const node = chain[index];
    category = slugToCategory.get(node.slug) ?? null;

    const isFinal = index === chain.length - 1;
    if (!category) {
      category = await createCategory({
        slug: node.slug,
        name: node.name,
        parentId,
        isLeaf: isFinal,
      });
    } else {
      category = await ensureCategoryShape(category, parentId, isFinal);
    }

    parentId = category?.id ?? parentId;
  }

  return category;
}

async function ensureCategoryShape(
  category: CategoryRow,
  parentId: string | null,
  isLeaf: boolean,
): Promise<CategoryRow> {
  const needsRepair = category.parent_id !== parentId || category.is_leaf !== isLeaf;
  if (!needsRepair) return category;

  stats.categoryRepairs += 1;
  const repaired = {
    ...category,
    parent_id: parentId,
    is_leaf: isLeaf,
  };
  registerCategory(repaired);

  if (!apply) return repaired;

  const { error } = await sb
    .from("categories")
    .update({ parent_id: parentId, is_leaf: isLeaf })
    .eq("id", category.id);

  if (error) {
    stats.errors += 1;
    process.stderr.write(`category repair failed ${category.slug}: ${error.message}\n`);
    return category;
  }

  return repaired;
}

async function createCategory(input: {
  slug: string;
  name: string;
  parentId: string | null;
  isLeaf: boolean;
}): Promise<CategoryRow> {
  plannedCategoryCreates.add(input.slug);

  if (!apply) {
    const dryCategory: CategoryRow = {
      id: `dry:${input.slug}`,
      slug: input.slug,
      name: input.name,
      parent_id: input.parentId,
      is_active: true,
      is_leaf: input.isLeaf,
    };
    registerCategory(dryCategory);
    return dryCategory;
  }

  if (input.parentId) {
    await sb.from("categories").update({ is_leaf: false }).eq("id", input.parentId);
  }

  const { data, error } = await sb
    .from("categories")
    .insert({
      slug: input.slug,
      name: input.name,
      parent_id: input.parentId,
      is_active: true,
      is_leaf: input.isLeaf,
    })
    .select("id, slug, name, parent_id, is_active, is_leaf")
    .single();

  if (data && !error) {
    const category = data as CategoryRow;
    registerCategory(category);
    return category;
  }

  const { data: existing, error: selectError } = await sb
    .from("categories")
    .select("id, slug, name, parent_id, is_active, is_leaf")
    .eq("slug", input.slug)
    .maybeSingle();

  if (existing && !selectError) {
    const category = existing as CategoryRow;
    registerCategory(category);
    return category;
  }

  throw new Error(
    `category create failed ${input.slug}: ${error?.message ?? selectError?.message ?? "unknown"}`,
  );
}

function registerCategory(category: CategoryRow): void {
  slugToCategory.set(category.slug, category);
  idToCategory.set(category.id, category);
}

async function fetchAllCategories(): Promise<CategoryRow[]> {
  const rows: CategoryRow[] = [];

  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from("categories")
      .select("id, slug, name, parent_id, is_active, is_leaf")
      .range(from, from + 999);

    if (error) throw new Error(`category fetch failed: ${error.message}`);
    rows.push(...((data ?? []) as CategoryRow[]));
    if (!data || data.length < 1000) break;
  }

  return rows;
}

async function fetchPttavmListings(from: number, count: number): Promise<ListingRow[]> {
  let query = sb
    .from("listings")
    .select("id, product_id, source_url, source_title, source_category")
    .eq("source", "pttavm")
    .order("id", { ascending: true })
    .range(from, from + count - 1);

  if (urlFilter) query = query.eq("source_url", urlFilter);

  const { data, error } = await query;
  if (error) throw new Error(`listing fetch failed: ${error.message}`);
  return (data ?? []) as ListingRow[];
}

async function fetchProducts(productIds: string[]): Promise<ProductRow[]> {
  const rows: ProductRow[] = [];

  for (const chunk of chunkArray(productIds, 100)) {
    const { data, error } = await sb
      .from("products")
      .select("id, title, category_id, specs")
      .in("id", chunk);

    if (error) throw new Error(`product fetch failed: ${error.message}`);
    rows.push(...((data ?? []) as ProductRow[]));
  }

  return rows;
}

function buildSpecsUpdate(
  specs: JsonRecord | null,
  meta: SourceMeta,
): { specs: JsonRecord; changed: boolean } {
  const nextSpecs: JsonRecord = { ...(specs ?? {}) };
  let changed = false;

  if (meta.sourceCategory && nextSpecs.pttavm_category !== meta.sourceCategory) {
    nextSpecs.pttavm_category = meta.sourceCategory;
    changed = true;
  }

  if (meta.sourceCategoryPath && nextSpecs.pttavm_path !== meta.sourceCategoryPath) {
    nextSpecs.pttavm_path = meta.sourceCategoryPath;
    changed = true;
  }

  return { specs: nextSpecs, changed };
}

function pickBestListing(listingsForProduct: ListingRow[]): ListingRow | null {
  return (
    listingsForProduct.find((listing) => listing.source_url && listing.source_category) ??
    listingsForProduct.find((listing) => listing.source_url) ??
    listingsForProduct[0] ??
    null
  );
}

function groupListingsByProduct(listingsToGroup: ListingRow[]): Map<string, ListingRow[]> {
  const grouped = new Map<string, ListingRow[]>();

  for (const listing of listingsToGroup) {
    if (!listing.product_id) continue;
    const group = grouped.get(listing.product_id) ?? [];
    group.push(listing);
    grouped.set(listing.product_id, group);
  }

  return grouped;
}

function addUnresolvedSample(
  product: ProductRow,
  listing: ListingRow | null,
  meta: SourceMeta,
): void {
  if (unresolvedSamples.length >= 12) return;

  unresolvedSamples.push(
    [
      product.title ?? listing?.source_title ?? product.id,
      `source_category=${meta.sourceCategory ?? "-"}`,
      `source_path=${meta.sourceCategoryPath ?? "-"}`,
      listing?.source_url ?? "-",
    ].join(" | "),
  );
}

function printReport(): void {
  process.stdout.write("\n=== Summary ===\n");
  process.stdout.write(`listings scanned: ${stats.listingsScanned}\n`);
  process.stdout.write(`products scanned: ${stats.scannedProducts}\n`);
  process.stdout.write(`already correct: ${stats.alreadyCorrect}\n`);
  process.stdout.write(`would move: ${stats.wouldMove}\n`);
  process.stdout.write(`moved: ${stats.moved}\n`);
  process.stdout.write(`metadata updates: ${stats.metadataUpdates}\n`);
  process.stdout.write(`listing source_category updates: ${stats.listingUpdates}\n`);
  process.stdout.write(`category parent repairs: ${stats.categoryRepairs}\n`);
  process.stdout.write(`detail enrichments: ${stats.enrichedFromDetail}\n`);
  process.stdout.write(`missing products: ${stats.missingProduct}\n`);
  process.stdout.write(`unresolved: ${stats.unresolved}\n`);
  process.stdout.write(`errors: ${stats.errors}\n`);

  if (plannedCategoryCreates.size > 0) {
    process.stdout.write("\n=== Category paths to create/check ===\n");
    for (const slug of [...plannedCategoryCreates].sort()) {
      process.stdout.write(`  ${slug}\n`);
    }
  }

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
    process.stdout.write(
      "\nDry-run only. Add APPLY=1 to update products/listings. Add CREATE_MISSING=1 to create missing category nodes.\n",
    );
  }
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function labelFromSlug(slugPart: string): string {
  return slugPart
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function chunkArray<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
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
