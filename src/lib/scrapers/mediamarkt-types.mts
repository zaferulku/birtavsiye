/**
 * MediaMarkt scraper tipleri — P6.12g.
 *
 * mediamarkt.mts JSON-LD + Apollo cache + breadcrumb extraction için
 * gevşek (loose) interface'ler. Üretici schema değişken olduğundan tüm
 * field'lar opsiyonel/unknown.
 */

// ---------------------------------------------------------------------------
// JSON-LD Product schema (schema.org)
// ---------------------------------------------------------------------------
// MediaMarkt PDP'de 1+ <script type="application/ld+json"> bloku var; içerik
// genelde:
// - { "@type": "Product", offers: {...}, name: ... }
// - { "@type": "ProductGroup", hasVariant: [...] }
// - { "@type": "BuyAction", object: { "@type": "Product", ... } }
// - { "@type": "BreadcrumbList", itemListElement: [...] }

export interface JsonLdOffer {
  "@type"?: string;
  price?: number | string;
  lowPrice?: number | string;
  highPrice?: number | string;
  priceCurrency?: string;
  availability?: string;
  url?: string;
  shippingDetails?: {
    shippingRate?: { value?: number | string };
  };
  seller?: { name?: string };
}

export interface JsonLdProductLike {
  "@type"?: string | string[];
  name?: string;
  description?: string;
  image?: string | string[];
  brand?: string | { "@type"?: string; name?: string };
  sku?: string;
  gtin13?: string;
  gtin?: string;
  offers?: JsonLdOffer | JsonLdOffer[];
  hasVariant?: JsonLdProductLike[];
}

export interface JsonLdBreadcrumbItem {
  "@type"?: string;
  position?: number;
  name?: string;
  item?: string | { name?: string };
}

// MediaMarkt JSON-LD'de Product BuyAction wrapper'ı içine nest edilebilir
// veya mainEntity altında olabilir. Tüm varyantları kapsayan envelope:
export interface JsonLdEnvelope {
  "@type"?: string | string[];
  object?: JsonLdProductLike;
  mainEntity?: JsonLdProductLike;
  itemListElement?: JsonLdBreadcrumbItem[];
  // Üst seviyede Product alanları da olabilir (envelope === Product doğrudan):
  name?: string;
  offers?: JsonLdOffer | JsonLdOffer[];
  hasVariant?: JsonLdProductLike[];
}

// ---------------------------------------------------------------------------
// Apollo cache (window.__PRELOADED_STATE__.apolloState)
// ---------------------------------------------------------------------------

export type ApolloRef = { __ref: string };

export interface ApolloFeature {
  __typename?: string;
  name?: string;
  value?: string | number | null;
  unit?: string | null;
}

export interface ApolloFeatureGroup {
  __typename?: string;
  features?: ApolloRef[];
}

export interface ApolloFeatureGroupContainer {
  __typename?: string;
  featureGroups?: ApolloFeatureGroup[];
}

export interface ApolloProduct {
  __typename?: string;
  featureGroupsWithProductId?: ApolloRef;
}

// Apollo cache'de her key'in shape'i farklı; opsiyonel field'lar + unknown
// fallback ile esneklik. Caller cast veya type guard ile narrow edecek.
export type ApolloCacheEntry =
  ApolloProduct
  & ApolloFeatureGroupContainer
  & ApolloFeature
  & Record<string, unknown>;

export type ApolloCache = Record<string, ApolloCacheEntry | undefined>;

export interface PreloadedState {
  apolloState?: ApolloCache;
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isApolloRef(v: unknown): v is ApolloRef {
  return (
    typeof v === "object" && v !== null &&
    "__ref" in v && typeof (v as ApolloRef).__ref === "string"
  );
}

// Type predicate: feat objesinin name alanı dolu string mi.
// ApolloCacheEntry intersection olduğu için narrowing ApolloCacheEntry kalır,
// sadece undefined ele edilir.
export function hasFeatureName(v: ApolloCacheEntry | undefined): v is ApolloCacheEntry {
  if (!v) return false;
  return typeof v.name === "string" && (v.name as string).length > 0;
}
