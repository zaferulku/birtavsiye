import type { SupabaseClient } from "@supabase/supabase-js";

type ListingRow = {
  id: string;
  source: string | null;
  price: number | string | null;
  last_seen: string | null;
  is_active: boolean | null;
  in_stock: boolean | null;
};

type ProductRow = {
  id: string;
  title: string;
  slug: string | null;
  brand: string | null;
  category_id: string | null;
  model_code: string | null;
  model_family: string | null;
  variant_storage: string | null;
  variant_color: string | null;
  quality_score: number | string | null;
  created_at: string | null;
  image_url: string | null;
  description: string | null;
  specs: Record<string, unknown> | null;
  listings: ListingRow[] | null;
};

type FavoriteRow = {
  id: string;
  user_id: string;
  product_id: string;
};

type AffiliateRow = {
  id: string;
  product_id: string;
  platform: string;
};

export type DuplicateGroupMode = "strict" | "review";

export type DuplicateAuditItem = {
  id: string;
  title: string;
  slug: string | null;
  brand: string | null;
  category_id: string | null;
  model_code: string | null;
  model_family: string | null;
  variant_storage: string | null;
  variant_color: string | null;
  active_offer_count: number;
  best_price: number | null;
  freshest_seen_at: string | null;
  quality_score: number;
  canonical_score: number;
  structured_title: boolean;
  image_url: string | null;
};

export type DuplicateAuditGroup = {
  key: string;
  mode: DuplicateGroupMode;
  merge_ready: boolean;
  category_mismatch: boolean;
  canonical_product_id: string;
  canonical_score: number;
  total_active_offers: number;
  reason: string;
  products: DuplicateAuditItem[];
};

export type DuplicateAuditSummary = {
  scanned_products: number;
  strict_groups: number;
  strict_merge_ready_groups: number;
  review_groups: number;
};

export type DuplicateAuditResult = {
  generated_at: string;
  summary: DuplicateAuditSummary;
  strict_groups: DuplicateAuditGroup[];
  review_groups: DuplicateAuditGroup[];
};

export type MergePlan = {
  canonical_product_id: string;
  duplicate_product_ids: string[];
  canonical_updates: Record<string, unknown>;
  impact: {
    listings: number;
    price_alerts: number;
    favorites_move: number;
    favorites_delete: number;
    affiliate_move: number;
    affiliate_delete: number;
    product_queue: number;
    topics: number;
    community_posts: number;
    agent_decisions: number;
    products_delete: number;
  };
};

export type MergeResult = MergePlan & {
  dry_run: boolean;
};

const PRODUCT_SELECT = `
  id,
  title,
  slug,
  brand,
  category_id,
  model_code,
  model_family,
  variant_storage,
  variant_color,
  quality_score,
  created_at,
  image_url,
  description,
  specs,
  listings(id, source, price, last_seen, is_active, in_stock)
`;

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0131/g, "i")
    .replace(/\u0130/g, "I")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCompact(value: string | null | undefined): string {
  return normalizeText(value).replace(/\s+/g, "");
}

function getActiveListings(listings: ListingRow[] | null | undefined): Array<ListingRow & { numeric_price: number }> {
  return (listings ?? [])
    .filter((listing) => listing.is_active !== false && listing.in_stock !== false)
    .map((listing) => ({
      ...listing,
      numeric_price: Number(listing.price),
    }))
    .filter((listing) => Number.isFinite(listing.numeric_price) && listing.numeric_price > 0);
}

function getBestPrice(listings: ListingRow[] | null | undefined): number | null {
  const active = getActiveListings(listings);
  if (active.length === 0) return null;
  return active.reduce((min, item) => (item.numeric_price < min ? item.numeric_price : min), active[0].numeric_price);
}

function getFreshestSeenAt(listings: ListingRow[] | null | undefined): string | null {
  const active = getActiveListings(listings);
  const freshness = active
    .map((listing) => listing.last_seen)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => right.localeCompare(left));
  return freshness[0] ?? null;
}

function hasRandomSuffix(slug: string | null | undefined): boolean {
  return /-[a-z0-9]{4,6}$/i.test(slug ?? "");
}

function isStructuredTitle(product: ProductRow): boolean {
  const normalizedTitle = normalizeText(product.title);
  const composed = [product.brand, product.model_family, product.variant_storage, product.variant_color]
    .filter(Boolean)
    .map((part) => normalizeText(part))
    .join(" ")
    .trim();

  if (!composed) return false;
  return normalizedTitle === composed;
}

function getCanonicalScore(product: ProductRow): number {
  const activeOffers = getActiveListings(product.listings).length;
  const freshestSeenAt = getFreshestSeenAt(product.listings);
  const freshnessBonus = freshestSeenAt
    ? Math.max(0, 30 - Math.floor((Date.now() - new Date(freshestSeenAt).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  const qualityScore = Number(product.quality_score ?? 0);

  let score = activeOffers * 100;
  score += freshnessBonus;
  score += Number.isFinite(qualityScore) ? Math.round(qualityScore * 20) : 0;
  if (product.image_url) score += 8;
  if (product.model_code) score += 8;
  if (product.model_family) score += 5;
  if (isStructuredTitle(product)) score += 6;
  if (!hasRandomSuffix(product.slug)) score += 4;
  return score;
}

function toAuditItem(product: ProductRow): DuplicateAuditItem {
  const activeOffers = getActiveListings(product.listings).length;
  return {
    id: product.id,
    title: product.title,
    slug: product.slug,
    brand: product.brand,
    category_id: product.category_id,
    model_code: product.model_code,
    model_family: product.model_family,
    variant_storage: product.variant_storage,
    variant_color: product.variant_color,
    active_offer_count: activeOffers,
    best_price: getBestPrice(product.listings),
    freshest_seen_at: getFreshestSeenAt(product.listings),
    quality_score: Number(product.quality_score ?? 0),
    canonical_score: getCanonicalScore(product),
    structured_title: isStructuredTitle(product),
    image_url: product.image_url,
  };
}

function getStrictKey(product: ProductRow): string | null {
  const brand = normalizeCompact(product.brand);
  if (!brand) return null;

  if (product.model_code) {
    return `code:${brand}|${normalizeCompact(product.model_code)}`;
  }

  if (product.model_family && (product.variant_storage || product.variant_color)) {
    return [
      "variant",
      brand,
      normalizeCompact(product.model_family),
      normalizeCompact(product.variant_storage),
      normalizeCompact(product.variant_color),
    ].join("|");
  }

  return null;
}

function getReviewKey(product: ProductRow): string | null {
  const brand = normalizeCompact(product.brand);
  const family = normalizeCompact(product.model_family);
  if (!brand || !family) return null;
  return `family:${brand}|${family}`;
}

function buildGroup(
  key: string,
  mode: DuplicateGroupMode,
  products: ProductRow[]
): DuplicateAuditGroup {
  const items = products
    .map(toAuditItem)
    .sort((left, right) => right.canonical_score - left.canonical_score || right.active_offer_count - left.active_offer_count);

  const canonical = items[0];
  const categoryIds = new Set(items.map((item) => item.category_id).filter(Boolean));
  const categoryMismatch = categoryIds.size > 1;
  const mergeReady = mode === "strict" && !categoryMismatch;
  const totalActiveOffers = items.reduce((sum, item) => sum + item.active_offer_count, 0);

  return {
    key,
    mode,
    merge_ready: mergeReady,
    category_mismatch: categoryMismatch,
    canonical_product_id: canonical.id,
    canonical_score: canonical.canonical_score,
    total_active_offers: totalActiveOffers,
    reason:
      mode === "strict"
        ? "Aynı model_code veya tam varyant kimliği birden fazla canonical ürün açmış."
        : "Aynı marka + model_family içinde eksik varyant yüzünden dağılma ihtimali var; manuel kontrol isteyebilir.",
    products: items,
  };
}

export async function auditDuplicateProducts(
  sb: SupabaseClient,
  options?: {
    productLimit?: number;
    groupLimit?: number;
  }
): Promise<DuplicateAuditResult> {
  const productLimit = options?.productLimit ?? 5000;
  const groupLimit = options?.groupLimit ?? 100;

  const { data, error } = await sb
    .from("products")
    .select(PRODUCT_SELECT)
    .order("created_at", { ascending: false })
    .limit(productLimit);

  if (error) {
    throw new Error(`Duplicate audit products fetch failed: ${error.message}`);
  }

  const products = ((data ?? []) as ProductRow[]).filter((product) => product.id);
  const strictBuckets = new Map<string, ProductRow[]>();
  const strictProductIds = new Set<string>();

  for (const product of products) {
    const strictKey = getStrictKey(product);
    if (!strictKey) continue;
    const bucket = strictBuckets.get(strictKey) ?? [];
    bucket.push(product);
    strictBuckets.set(strictKey, bucket);
  }

  const strictGroups = Array.from(strictBuckets.entries())
    .filter(([, bucket]) => bucket.length > 1)
    .map(([key, bucket]) => {
      bucket.forEach((item) => strictProductIds.add(item.id));
      return buildGroup(key, "strict", bucket);
    })
    .sort((left, right) => right.total_active_offers - left.total_active_offers || right.products.length - left.products.length)
    .slice(0, groupLimit);

  const reviewBuckets = new Map<string, ProductRow[]>();
  for (const product of products) {
    if (strictProductIds.has(product.id)) continue;
    const reviewKey = getReviewKey(product);
    if (!reviewKey) continue;
    const bucket = reviewBuckets.get(reviewKey) ?? [];
    bucket.push(product);
    reviewBuckets.set(reviewKey, bucket);
  }

  const reviewGroups = Array.from(reviewBuckets.entries())
    .filter(([, bucket]) => bucket.length > 1)
    .map(([key, bucket]) => buildGroup(key, "review", bucket))
    .sort((left, right) => right.total_active_offers - left.total_active_offers || right.products.length - left.products.length)
    .slice(0, groupLimit);

  return {
    generated_at: new Date().toISOString(),
    summary: {
      scanned_products: products.length,
      strict_groups: strictGroups.length,
      strict_merge_ready_groups: strictGroups.filter((group) => group.merge_ready).length,
      review_groups: reviewGroups.length,
    },
    strict_groups: strictGroups,
    review_groups: reviewGroups,
  };
}

function mergeSpecs(
  canonicalSpecs: Record<string, unknown> | null | undefined,
  duplicateSpecs: Array<Record<string, unknown> | null | undefined>
): Record<string, unknown> | null {
  const merged = canonicalSpecs && typeof canonicalSpecs === "object" ? { ...canonicalSpecs } : {};
  let changed = false;

  for (const candidate of duplicateSpecs) {
    if (!candidate || typeof candidate !== "object") continue;
    for (const [key, value] of Object.entries(candidate)) {
      if (!(key in merged) || merged[key] == null || merged[key] === "") {
        merged[key] = value;
        changed = true;
      }
    }
  }

  if (!changed) return null;
  return merged;
}

function buildCanonicalUpdatePayload(canonical: ProductRow, duplicates: ProductRow[]): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  const firstWithValue = (selector: (product: ProductRow) => string | null | undefined) =>
    duplicates.map(selector).find((value): value is string => Boolean(value && String(value).trim()));

  if (!canonical.image_url) {
    const imageUrl = firstWithValue((product) => product.image_url);
    if (imageUrl) payload.image_url = imageUrl;
  }
  if (!canonical.description) {
    const description = firstWithValue((product) => product.description);
    if (description) payload.description = description;
  }
  if (!canonical.model_code) {
    const modelCode = firstWithValue((product) => product.model_code);
    if (modelCode) payload.model_code = modelCode;
  }
  if (!canonical.model_family) {
    const modelFamily = firstWithValue((product) => product.model_family);
    if (modelFamily) payload.model_family = modelFamily;
  }
  if (!canonical.variant_storage) {
    const variantStorage = firstWithValue((product) => product.variant_storage);
    if (variantStorage) payload.variant_storage = variantStorage;
  }
  if (!canonical.variant_color) {
    const variantColor = firstWithValue((product) => product.variant_color);
    if (variantColor) payload.variant_color = variantColor;
  }

  const mergedSpecs = mergeSpecs(canonical.specs, duplicates.map((product) => product.specs));
  if (mergedSpecs) payload.specs = mergedSpecs;

  return payload;
}

async function countRows(
  sb: SupabaseClient,
  table: string,
  column: string,
  ids: string[]
): Promise<number> {
  if (ids.length === 0) return 0;
  const { count, error } = await sb
    .from(table)
    .select("id", { count: "exact", head: true })
    .in(column, ids);

  if (error) {
    throw new Error(`Count failed for ${table}: ${error.message}`);
  }

  return count ?? 0;
}

async function buildMergePlan(
  sb: SupabaseClient,
  canonical: ProductRow,
  duplicates: ProductRow[]
): Promise<MergePlan> {
  const duplicateIds = duplicates.map((product) => product.id);
  const duplicatePlusCanonical = [canonical.id, ...duplicateIds];

  const favorites = duplicateIds.length
    ? (((await sb
        .from("favorites")
        .select("id, user_id, product_id")
        .in("product_id", duplicatePlusCanonical)).data ?? []) as FavoriteRow[])
    : [];
  const canonicalFavoriteUsers = new Set(
    favorites.filter((row) => row.product_id === canonical.id).map((row) => row.user_id)
  );
  const duplicateFavoriteRows = favorites.filter((row) => duplicateIds.includes(row.product_id));
  const favoritesDelete = duplicateFavoriteRows.filter((row) => canonicalFavoriteUsers.has(row.user_id)).length;
  const favoritesMove = duplicateFavoriteRows.length - favoritesDelete;

  const affiliateLinks = duplicateIds.length
    ? (((await sb
        .from("affiliate_links")
        .select("id, product_id, platform")
        .in("product_id", duplicatePlusCanonical)).data ?? []) as AffiliateRow[])
    : [];
  const canonicalPlatforms = new Set(
    affiliateLinks.filter((row) => row.product_id === canonical.id).map((row) => normalizeCompact(row.platform))
  );
  const duplicateAffiliateRows = affiliateLinks.filter((row) => duplicateIds.includes(row.product_id));
  const affiliateDelete = duplicateAffiliateRows.filter((row) => canonicalPlatforms.has(normalizeCompact(row.platform))).length;
  const affiliateMove = duplicateAffiliateRows.length - affiliateDelete;

  return {
    canonical_product_id: canonical.id,
    duplicate_product_ids: duplicateIds,
    canonical_updates: buildCanonicalUpdatePayload(canonical, duplicates),
    impact: {
      listings: await countRows(sb, "listings", "product_id", duplicateIds),
      price_alerts: await countRows(sb, "price_alerts", "product_id", duplicateIds),
      favorites_move: favoritesMove,
      favorites_delete: favoritesDelete,
      affiliate_move: affiliateMove,
      affiliate_delete: affiliateDelete,
      product_queue: await countRows(sb, "product_queue", "product_id", duplicateIds),
      topics: await countRows(sb, "topics", "product_id", duplicateIds),
      community_posts: await countRows(sb, "community_posts", "product_id", duplicateIds),
      agent_decisions: duplicateIds.length
        ? ((await sb
            .from("agent_decisions")
            .select("id", { count: "exact", head: true })
            .eq("related_entity_type", "product")
            .in("related_entity_id", duplicateIds)).count ?? 0)
        : 0,
      products_delete: duplicateIds.length,
    },
  };
}

async function moveFavorites(
  sb: SupabaseClient,
  canonicalProductId: string,
  duplicateProductIds: string[]
): Promise<void> {
  if (duplicateProductIds.length === 0) return;

  const { data, error } = await sb
    .from("favorites")
    .select("id, user_id, product_id")
    .in("product_id", [canonicalProductId, ...duplicateProductIds]);
  if (error) throw new Error(`Favorites fetch failed: ${error.message}`);

  const rows = (data ?? []) as FavoriteRow[];
  const canonicalUsers = new Set(
    rows.filter((row) => row.product_id === canonicalProductId).map((row) => row.user_id)
  );

  const rowsToDelete = rows
    .filter((row) => duplicateProductIds.includes(row.product_id) && canonicalUsers.has(row.user_id))
    .map((row) => row.id);
  const rowsToMove = rows
    .filter((row) => duplicateProductIds.includes(row.product_id) && !canonicalUsers.has(row.user_id))
    .map((row) => row.id);

  if (rowsToDelete.length > 0) {
    const { error: deleteError } = await sb.from("favorites").delete().in("id", rowsToDelete);
    if (deleteError) throw new Error(`Favorites delete failed: ${deleteError.message}`);
  }
  if (rowsToMove.length > 0) {
    const { error: updateError } = await sb
      .from("favorites")
      .update({ product_id: canonicalProductId })
      .in("id", rowsToMove);
    if (updateError) throw new Error(`Favorites move failed: ${updateError.message}`);
  }
}

async function moveAffiliateLinks(
  sb: SupabaseClient,
  canonicalProductId: string,
  duplicateProductIds: string[]
): Promise<void> {
  if (duplicateProductIds.length === 0) return;

  const { data, error } = await sb
    .from("affiliate_links")
    .select("id, product_id, platform")
    .in("product_id", [canonicalProductId, ...duplicateProductIds]);
  if (error) throw new Error(`Affiliate links fetch failed: ${error.message}`);

  const rows = (data ?? []) as AffiliateRow[];
  const canonicalPlatforms = new Set(
    rows.filter((row) => row.product_id === canonicalProductId).map((row) => normalizeCompact(row.platform))
  );

  const rowsToDelete = rows
    .filter(
      (row) =>
        duplicateProductIds.includes(row.product_id) &&
        canonicalPlatforms.has(normalizeCompact(row.platform))
    )
    .map((row) => row.id);
  const rowsToMove = rows
    .filter(
      (row) =>
        duplicateProductIds.includes(row.product_id) &&
        !canonicalPlatforms.has(normalizeCompact(row.platform))
    )
    .map((row) => row.id);

  if (rowsToDelete.length > 0) {
    const { error: deleteError } = await sb
      .from("affiliate_links")
      .delete()
      .in("id", rowsToDelete);
    if (deleteError) throw new Error(`Affiliate links delete failed: ${deleteError.message}`);
  }
  if (rowsToMove.length > 0) {
    const { error: updateError } = await sb
      .from("affiliate_links")
      .update({ product_id: canonicalProductId })
      .in("id", rowsToMove);
    if (updateError) throw new Error(`Affiliate links move failed: ${updateError.message}`);
  }
}

async function moveSimpleReferenceTable(
  sb: SupabaseClient,
  table: string,
  canonicalProductId: string,
  duplicateProductIds: string[]
): Promise<void> {
  if (duplicateProductIds.length === 0) return;
  const { error } = await sb
    .from(table)
    .update({ product_id: canonicalProductId })
    .in("product_id", duplicateProductIds);

  if (error) {
    throw new Error(`${table} update failed: ${error.message}`);
  }
}

async function moveAgentDecisions(
  sb: SupabaseClient,
  canonicalProductId: string,
  duplicateProductIds: string[]
): Promise<void> {
  if (duplicateProductIds.length === 0) return;
  const { error } = await sb
    .from("agent_decisions")
    .update({ related_entity_id: canonicalProductId })
    .eq("related_entity_type", "product")
    .in("related_entity_id", duplicateProductIds);

  if (error) {
    throw new Error(`agent_decisions update failed: ${error.message}`);
  }
}

export async function mergeDuplicateProducts(
  sb: SupabaseClient,
  options: {
    canonicalProductId: string;
    duplicateProductIds: string[];
    dryRun?: boolean;
  }
): Promise<MergeResult> {
  const duplicateProductIds = Array.from(
    new Set((options.duplicateProductIds ?? []).filter((id) => id && id !== options.canonicalProductId))
  );
  if (!options.canonicalProductId || duplicateProductIds.length === 0) {
    throw new Error("canonicalProductId ve duplicateProductIds zorunlu");
  }

  const { data, error } = await sb
    .from("products")
    .select(PRODUCT_SELECT)
    .in("id", [options.canonicalProductId, ...duplicateProductIds]);

  if (error) {
    throw new Error(`Merge products fetch failed: ${error.message}`);
  }

  const products = (data ?? []) as ProductRow[];
  const canonical = products.find((product) => product.id === options.canonicalProductId);
  const duplicates = products.filter((product) => duplicateProductIds.includes(product.id));

  if (!canonical) throw new Error("Canonical product bulunamadi");
  if (duplicates.length !== duplicateProductIds.length) {
    throw new Error("Bazi duplicate product kayitlari bulunamadi");
  }

  const plan = await buildMergePlan(sb, canonical, duplicates);
  const dryRun = options.dryRun !== false;

  if (dryRun) {
    return { dry_run: true, ...plan };
  }

  if (Object.keys(plan.canonical_updates).length > 0) {
    const { error: canonicalError } = await sb
      .from("products")
      .update(plan.canonical_updates)
      .eq("id", canonical.id);
    if (canonicalError) {
      throw new Error(`Canonical product update failed: ${canonicalError.message}`);
    }
  }

  await moveFavorites(sb, canonical.id, duplicateProductIds);
  await moveAffiliateLinks(sb, canonical.id, duplicateProductIds);
  await moveSimpleReferenceTable(sb, "listings", canonical.id, duplicateProductIds);
  await moveSimpleReferenceTable(sb, "price_alerts", canonical.id, duplicateProductIds);
  await moveSimpleReferenceTable(sb, "product_queue", canonical.id, duplicateProductIds);
  await moveSimpleReferenceTable(sb, "topics", canonical.id, duplicateProductIds);
  await moveSimpleReferenceTable(sb, "community_posts", canonical.id, duplicateProductIds);
  await moveAgentDecisions(sb, canonical.id, duplicateProductIds);

  const { error: deleteError } = await sb
    .from("products")
    .delete()
    .in("id", duplicateProductIds);
  if (deleteError) {
    throw new Error(`Duplicate products delete failed: ${deleteError.message}`);
  }

  return { dry_run: false, ...plan };
}
