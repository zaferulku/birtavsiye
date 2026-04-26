import type { SupabaseClient } from "@supabase/supabase-js";

export type ProductClusterSeed = {
  id: string;
  brand: string | null;
  model_code: string | null;
  model_family: string | null;
  variant_storage: string | null;
  variant_color: string | null;
  category_id: string | null;
};

export type ClusterableListing = {
  id: string;
  source: string | null;
  price: number | string | null;
  last_seen?: string | null;
  source_url?: string | null;
  affiliate_url?: string | null;
  is_active?: boolean | null;
  in_stock?: boolean | null;
};

function normalizeIdentityPart(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0131/g, "i")
    .replace(/\u0130/g, "I")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

export function isExactProductClusterMatch(
  base: ProductClusterSeed,
  candidate: ProductClusterSeed
): boolean {
  if (base.id === candidate.id) return true;

  if (
    base.category_id &&
    candidate.category_id &&
    base.category_id !== candidate.category_id
  ) {
    return false;
  }

  const baseBrand = normalizeIdentityPart(base.brand);
  const candidateBrand = normalizeIdentityPart(candidate.brand);
  if (baseBrand && candidateBrand && baseBrand !== candidateBrand) {
    return false;
  }

  const baseModelCode = normalizeIdentityPart(base.model_code);
  const candidateModelCode = normalizeIdentityPart(candidate.model_code);
  if (baseModelCode && candidateModelCode) {
    return baseModelCode === candidateModelCode;
  }

  const baseFamily = normalizeIdentityPart(base.model_family);
  const candidateFamily = normalizeIdentityPart(candidate.model_family);
  if (!baseFamily || !candidateFamily || baseFamily !== candidateFamily) {
    return false;
  }

  const baseStorage = normalizeIdentityPart(base.variant_storage);
  const candidateStorage = normalizeIdentityPart(candidate.variant_storage);
  const baseColor = normalizeIdentityPart(base.variant_color);
  const candidateColor = normalizeIdentityPart(candidate.variant_color);
  const hasVariantIdentity = Boolean(baseStorage || candidateStorage || baseColor || candidateColor);

  if (!hasVariantIdentity) {
    return false;
  }

  return baseStorage === candidateStorage && baseColor === candidateColor;
}

export async function resolveProductClusterIds(
  supabase: SupabaseClient,
  product: ProductClusterSeed
): Promise<string[]> {
  if (!product.model_code && !product.model_family) {
    return [product.id];
  }

  let query = supabase
    .from("products")
    .select("id, brand, model_code, model_family, variant_storage, variant_color, category_id")
    .eq("is_active", true)
    .neq("id", product.id)
    .limit(24);

  if (product.model_code) {
    query = query.eq("model_code", product.model_code);
    if (product.brand) {
      query = query.eq("brand", product.brand);
    }
  } else {
    query = query.eq("model_family", product.model_family);
    if (product.brand) {
      query = query.eq("brand", product.brand);
    }
    if (product.category_id) {
      query = query.eq("category_id", product.category_id);
    }
  }

  const { data, error } = await query;
  if (error || !data) {
    return [product.id];
  }

  const relatedIds = (data as ProductClusterSeed[])
    .filter((candidate) => isExactProductClusterMatch(product, candidate))
    .map((candidate) => candidate.id);

  return [product.id, ...relatedIds];
}

export async function resolveProductClusterIdsByProductId(
  supabase: SupabaseClient,
  productId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, brand, model_code, model_family, variant_storage, variant_color, category_id")
    .eq("id", productId)
    .maybeSingle();

  if (error || !data) {
    return [productId];
  }

  return resolveProductClusterIds(supabase, data as ProductClusterSeed);
}

function compareListingPriority(left: ClusterableListing, right: ClusterableListing): number {
  const leftPrice = Number(left.price);
  const rightPrice = Number(right.price);
  const leftHasPrice = Number.isFinite(leftPrice) && leftPrice > 0;
  const rightHasPrice = Number.isFinite(rightPrice) && rightPrice > 0;
  const leftInStock = left.in_stock !== false;
  const rightInStock = right.in_stock !== false;

  if (leftInStock !== rightInStock) return leftInStock ? -1 : 1;
  if (leftHasPrice !== rightHasPrice) return leftHasPrice ? -1 : 1;
  if (leftHasPrice && rightHasPrice && leftPrice !== rightPrice) return leftPrice - rightPrice;

  const leftSeen = left.last_seen ? new Date(left.last_seen).getTime() : 0;
  const rightSeen = right.last_seen ? new Date(right.last_seen).getTime() : 0;
  if (leftSeen !== rightSeen) return rightSeen - leftSeen;

  const leftHasUrl = Boolean(left.affiliate_url || left.source_url);
  const rightHasUrl = Boolean(right.affiliate_url || right.source_url);
  if (leftHasUrl !== rightHasUrl) return leftHasUrl ? -1 : 1;

  return left.id.localeCompare(right.id);
}

export function dedupeClusterListingsBySource<T extends ClusterableListing>(listings: T[]): T[] {
  const bestBySource = new Map<string, T>();

  for (const listing of listings) {
    const sourceKey = listing.source ?? `listing:${listing.id}`;
    const existing = bestBySource.get(sourceKey);
    if (!existing || compareListingPriority(listing, existing) < 0) {
      bestBySource.set(sourceKey, listing);
    }
  }

  return Array.from(bestBySource.values()).sort(compareListingPriority);
}
