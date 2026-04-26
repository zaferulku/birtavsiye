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

export type ClusterableProduct<TListing extends ClusterableListing = ClusterableListing> =
  ProductClusterSeed & {
    title: string;
    slug?: string | null;
    image_url?: string | null;
    created_at?: string | null;
    quality_score?: number | string | null;
    listings?: TListing[] | null;
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

export function getExactProductClusterKey(product: ProductClusterSeed): string | null {
  const brand = normalizeIdentityPart(product.brand);
  if (!brand) return null;

  const modelCode = normalizeIdentityPart(product.model_code);
  if (modelCode) {
    return `code:${brand}|${modelCode}`;
  }

  const family = normalizeIdentityPart(product.model_family);
  const storage = normalizeIdentityPart(product.variant_storage);
  const color = normalizeIdentityPart(product.variant_color);

  if (!family || (!storage && !color)) {
    return null;
  }

  return `variant:${brand}|${family}|${storage}|${color}`;
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

function compareRepresentativePriority(
  left: ClusterableProduct,
  right: ClusterableProduct
): number {
  const leftListings = dedupeClusterListingsBySource((left.listings ?? []).filter(Boolean));
  const rightListings = dedupeClusterListingsBySource((right.listings ?? []).filter(Boolean));

  if (leftListings.length !== rightListings.length) {
    return rightListings.length - leftListings.length;
  }

  const leftBestPrice = leftListings
    .map((listing) => Number(listing.price))
    .filter((price) => Number.isFinite(price) && price > 0)
    .sort((a, b) => a - b)[0] ?? Number.POSITIVE_INFINITY;
  const rightBestPrice = rightListings
    .map((listing) => Number(listing.price))
    .filter((price) => Number.isFinite(price) && price > 0)
    .sort((a, b) => a - b)[0] ?? Number.POSITIVE_INFINITY;

  if (leftBestPrice !== rightBestPrice) {
    return leftBestPrice - rightBestPrice;
  }

  const leftFreshest = leftListings
    .map((listing) => listing.last_seen)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => b.localeCompare(a))[0];
  const rightFreshest = rightListings
    .map((listing) => listing.last_seen)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => b.localeCompare(a))[0];

  if ((leftFreshest ?? "") !== (rightFreshest ?? "")) {
    return (rightFreshest ?? "").localeCompare(leftFreshest ?? "");
  }

  const leftQuality = Number(left.quality_score ?? 0);
  const rightQuality = Number(right.quality_score ?? 0);
  if (leftQuality !== rightQuality) {
    return rightQuality - leftQuality;
  }

  const leftImage = Boolean(left.image_url);
  const rightImage = Boolean(right.image_url);
  if (leftImage !== rightImage) {
    return leftImage ? -1 : 1;
  }

  return (right.created_at ?? "").localeCompare(left.created_at ?? "");
}

export function mergeClusteredProducts<
  TListing extends ClusterableListing,
  TProduct extends ClusterableProduct<TListing>
>(products: TProduct[]): TProduct[] {
  const groups = new Map<
    string,
    {
      firstIndex: number;
      items: TProduct[];
    }
  >();
  const passthrough: Array<{ firstIndex: number; item: TProduct }> = [];

  products.forEach((product, index) => {
    const key = getExactProductClusterKey(product);
    if (!key) {
      passthrough.push({
        firstIndex: index,
        item: {
          ...product,
          listings: dedupeClusterListingsBySource((product.listings ?? []).filter(Boolean)) as TListing[],
        } as TProduct,
      });
      return;
    }

    const group = groups.get(key);
    if (group) {
      group.items.push(product);
      return;
    }

    groups.set(key, {
      firstIndex: index,
      items: [product],
    });
  });

  const mergedGroups = Array.from(groups.values()).map((group) => {
    const representative = [...group.items].sort(compareRepresentativePriority)[0];
    const mergedListings = dedupeClusterListingsBySource(
      group.items.flatMap((item) => item.listings ?? []).filter(Boolean)
    ) as TListing[];

    return {
      firstIndex: group.firstIndex,
      item: {
        ...representative,
        image_url:
          representative.image_url ??
          group.items.find((item) => item.image_url)?.image_url ??
          null,
        listings: mergedListings,
      } as TProduct,
    };
  });

  return [...passthrough, ...mergedGroups]
    .sort((left, right) => left.firstIndex - right.firstIndex)
    .map((entry) => entry.item);
}
