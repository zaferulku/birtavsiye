import type { SupabaseClient } from "@supabase/supabase-js";
import { buildCategoryRankingContext } from "../chatbot/categoryKnowledge";
import {
  dedupeClusterListingsBySource,
  getExactProductClusterKey,
  type ClusterableListing,
} from "../productCluster";
import {
  getActiveOfferCount,
  getBestSourceTrust,
  getFreshestSeenAt,
  getLowestActivePrice,
  getUniqueActiveSources,
} from "../listingSignals";

type SearchCategoryRow = {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
};

export type SearchListingRow = ClusterableListing & {
  price: number;
};

type SearchProductRow = {
  id: string;
  title: string;
  slug: string;
  brand: string | null;
  image_url: string | null;
  specs: Record<string, unknown> | null;
  category_id: string | null;
  model_code: string | null;
  model_family: string | null;
  variant_storage: string | null;
  variant_color: string | null;
  created_at: string | null;
  prices?: Array<{
    id: string;
    price: number | string;
    source?: string | null;
    last_seen?: string | null;
    is_active?: boolean | null;
    in_stock?: boolean | null;
  }> | null;
};

export type VectorCandidate = {
  id: string;
  similarity: number;
};

export type RankedProduct = Omit<SearchProductRow, "prices"> & {
  category_slug: string | null;
  prices: SearchListingRow[];
  min_price: number | null;
  offer_count: number;
  listing_count: number;
  sources: string[];
  freshest_seen_at: string | null;
  search_score: number;
  vector_similarity: number | null;
  ranking_reasons: string[];
  score_breakdown: RankingScoreBreakdown;
};

export type RankingScoreBreakdown = {
  lexical: number;
  vector: number;
  offer: number;
  image: number;
  freshness: number;
  source_trust: number;
  knowledge: number;
  price_penalty: number;
  total: number;
};

export type QueryRankingProfile = {
  mode: "specific" | "balanced" | "exploratory";
  priceSensitive: boolean;
  accessoryIntent: boolean;
};

export type RetrievalRankingDiagnostics = {
  query_profile: QueryRankingProfile;
  term_count: number;
  strict_term_count: number;
  candidate_pool_size: number;
  knowledge_category_slug?: string | null;
  knowledge_profile_id?: string | null;
  knowledge_signal_terms?: string[];
};

export type RetrieveRankedProductsOptions = {
  sb: SupabaseClient;
  query?: string | null;
  categorySlug?: string | null;
  brand?: string | null;
  limit?: number;
  offset?: number;
  priceMin?: number | null;
  priceMax?: number | null;
  includeEmptyListings?: boolean;
  vectorCandidates?: VectorCandidate[];
};

export type RerankKnownProductsOptions = {
  sb: SupabaseClient;
  productIds: string[];
  query: string;
  categorySlug?: string | null;
  limit?: number;
  offset?: number;
  priceMin?: number | null;
  priceMax?: number | null;
  includeEmptyListings?: boolean;
  vectorCandidates?: VectorCandidate[];
};

export function isStrictIntentTerm(term: string): boolean {
  if (!term) return false;
  if (/\d/.test(term)) return true;
  if (/^\d+(gb|tb|mp|hz|mah)$/.test(term)) return true;
  return VARIANT_INTENT_TERMS.has(term) && !GENERIC_DISCOVERY_TERMS.has(term);
}

function isAnchorIntentTerm(term: string): boolean {
  if (!term || term.length < 4) return false;
  if (/\d/.test(term)) return false;
  if (GENERIC_DISCOVERY_TERMS.has(term)) return false;
  if (PRICE_SENSITIVE_TERMS.has(term)) return false;
  if (VARIANT_INTENT_TERMS.has(term)) return false;
  if (ACCESSORY_QUERY_HINTS.has(term)) return false;
  return true;
}

export class CategoryNotFoundError extends Error {
  constructor(slug: string) {
    super(`category not found: ${slug}`);
    this.name = "CategoryNotFoundError";
  }
}

const SELECT_FIELDS =
  "id, title, slug, brand, image_url, specs, category_id, model_code, model_family, variant_storage, variant_color, created_at, prices:listings(id, price, source, last_seen, is_active, in_stock)";

const ACCESSORY_CATEGORY_PATTERN =
  /telefon-kilifi|telefon-aksesuar|telefon-yedek-parca|ekran-koruyucu|sarj-kablo|sarj-cihazi|telefon-tutacagi|tablet-kilif|laptop-kilif|kulaklik-aksesuar/i;

const ACCESSORY_QUERY_HINTS = new Set([
  "aksesuar",
  "kilif",
  "kiliflar",
  "kilifi",
  "kılıf",
  "koruyucu",
  "yedek",
  "parca",
  "parça",
  "kablo",
  "sarj",
  "şarj",
  "case",
  "cover",
]);

const GENERIC_DISCOVERY_TERMS = new Set([
  "telefon",
  "telefonlar",
  "akilli",
  "akilli-telefon",
  "cep",
  "laptop",
  "notebook",
  "tablet",
  "kulaklik",
  "kulakliklar",
  "televizyon",
  "tv",
  "monitor",
  "saat",
  "akilli-saat",
  "kamera",
  "bilgisayar",
  "oyuncu",
  "urun",
  "urunler",
]);

const PRICE_SENSITIVE_TERMS = new Set([
  "ucuz",
  "uygun",
  "fiyat",
  "fiyata",
  "fiyatli",
  "indirim",
  "indirimli",
  "kampanya",
  "hesapli",
  "butce",
  "butceye",
  "butceli",
  "performans",
  "fp",
]);

const VARIANT_INTENT_TERMS = new Set([
  "pro",
  "max",
  "ultra",
  "mini",
  "plus",
  "gb",
  "tb",
  "siyah",
  "beyaz",
  "mavi",
  "mor",
  "yesil",
  "pembe",
  "kirmizi",
  "gri",
  "gold",
  "silver",
  "titanyum",
]);

function normalizeSearchText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0131/g, "i")
    .replace(/\u0130/g, "I")
    .toLowerCase()
    .trim();
}

export function splitSearchTerms(query: string | null | undefined): string[] {
  return Array.from(
    new Set(
      normalizeSearchText(query)
        .split(/\s+/)
        .map((part) => part.trim())
        .filter((part) => part.length >= 2)
    )
  ).slice(0, 8);
}

function collectSpecText(value: unknown, fragments: string[]): void {
  if (value == null) return;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    fragments.push(String(value));
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectSpecText(item, fragments);
    }
    return;
  }
  if (typeof value === "object") {
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      fragments.push(key);
      collectSpecText(nestedValue, fragments);
    }
  }
}

function flattenSpecsText(specs: Record<string, unknown> | null | undefined): string {
  if (!specs || typeof specs !== "object") return "";
  const fragments: string[] = [];
  collectSpecText(specs, fragments);
  return normalizeSearchText(fragments.join(" "));
}

function escapeIlikeTerm(term: string): string {
  return term.replace(/[%_]/g, "\\$&").slice(0, 100);
}

function expandCategoryIds(
  categories: SearchCategoryRow[],
  rootIds: Iterable<string>
): string[] {
  const expandedIds = new Set<string>(rootIds);
  if (expandedIds.size === 0) return [];

  let foundChild = true;
  while (foundChild) {
    foundChild = false;
    for (const category of categories) {
      if (
        !category.parent_id ||
        expandedIds.has(category.id) ||
        !expandedIds.has(category.parent_id)
      ) {
        continue;
      }
      expandedIds.add(category.id);
      foundChild = true;
    }
  }

  return Array.from(expandedIds);
}

function getMatchedCategoryIds(categories: SearchCategoryRow[], term: string): string[] {
  const normalizedTerm = normalizeSearchText(term);
  if (!normalizedTerm) return [];

  const matchedRootIds = categories
    .filter((category) => {
      const haystacks = [category.name, category.slug].map((value) =>
        normalizeSearchText(value)
      );
      return haystacks.some((value) => value.includes(normalizedTerm));
    })
    .map((category) => category.id);

  return expandCategoryIds(categories, matchedRootIds);
}

function hasAccessoryIntent(terms: string[]): boolean {
  return terms.some((term) => ACCESSORY_QUERY_HINTS.has(term));
}

function normalizeProductRows(
  products: SearchProductRow[],
  categoryMap: Map<string, SearchCategoryRow>
): RankedProduct[] {
  return products.map((product) => {
    const prices = dedupeClusterListingsBySource(
      ((product.prices ?? []).map((listing) => ({
        id: listing.id,
        price: Number(listing.price),
        source: listing.source ?? null,
        last_seen: listing.last_seen ?? null,
        is_active: listing.is_active ?? null,
        in_stock: listing.in_stock ?? null,
      })) as SearchListingRow[]).filter(
        (listing) =>
          listing.is_active !== false &&
          listing.in_stock !== false &&
          Number.isFinite(listing.price) &&
          listing.price > 0
      )
    );

    const categorySlug =
      product.category_id && categoryMap.has(product.category_id)
        ? categoryMap.get(product.category_id)?.slug ?? null
        : null;

    const offerCount = getActiveOfferCount(prices);
    const freshestSeenAt = getFreshestSeenAt(prices);

    return {
      ...product,
      category_slug: categorySlug,
      prices,
      min_price: getLowestActivePrice(prices),
      offer_count: offerCount,
      listing_count: offerCount,
      sources: getUniqueActiveSources(prices),
      freshest_seen_at: freshestSeenAt,
      search_score: 0,
      vector_similarity: null,
      ranking_reasons: [],
      score_breakdown: {
        lexical: 0,
        vector: 0,
        offer: 0,
        image: 0,
        freshness: 0,
        source_trust: 0,
        knowledge: 0,
        price_penalty: 0,
        total: 0,
      },
    };
  });
}

function getProductSearchScore(
  product: RankedProduct,
  category: SearchCategoryRow | undefined,
  terms: string[],
  profile: QueryRankingProfile
): { score: number; reasons: string[] } {
  if (terms.length === 0) {
    return { score: 0, reasons: [] };
  }

  const title = normalizeSearchText(product.title);
  const brand = normalizeSearchText(product.brand);
  const modelFamily = normalizeSearchText(product.model_family);
  const modelCode = normalizeSearchText(product.model_code);
  const storage = normalizeSearchText(product.variant_storage);
  const color = normalizeSearchText(product.variant_color);
  const specsText = flattenSpecsText(product.specs);
  const categoryName = normalizeSearchText(category?.name);
  const categorySlug = normalizeSearchText(category?.slug);
  const accessoryIntent = hasAccessoryIntent(terms);

  const reasons = new Set<string>();
  let score = 0;
  let matchedTerms = 0;
  let missingTerms = 0;
  let matchedStrictTerms = 0;
  let missingStrictTerms = 0;
  let matchedAnchorTerms = 0;

  for (const term of terms) {
    let matched = false;

    if (title.includes(term)) {
      score += 16;
      reasons.add(`baslik:${term}`);
      matched = true;
    }
    if (modelFamily.includes(term)) {
      score += 14;
      reasons.add(`model:${term}`);
      matched = true;
    }
    if (brand.includes(term)) {
      score += 10;
      reasons.add(`marka:${term}`);
      matched = true;
    }
    if (modelCode.includes(term)) {
      score += 10;
      reasons.add(`kod:${term}`);
      matched = true;
    }
    if (storage.includes(term) || color.includes(term)) {
      score += 6;
      reasons.add(`varyant:${term}`);
      matched = true;
    }
    if (specsText.includes(term)) {
      score += 7;
      reasons.add(`ozellik:${term}`);
      matched = true;
    }
    if (categoryName.includes(term) || categorySlug.includes(term)) {
      score += 9;
      reasons.add(`kategori:${term}`);
      matched = true;
    }

    if (!matched) {
      missingTerms += 1;
      if (isStrictIntentTerm(term)) {
        missingStrictTerms += 1;
      }
      continue;
    }

    matchedTerms += 1;
    if (isStrictIntentTerm(term)) {
      matchedStrictTerms += 1;
    }
    if (isAnchorIntentTerm(term)) {
      matchedAnchorTerms += 1;
    }

    if (term === "telefon" && categorySlug === "akilli-telefon") {
      score += 22;
      reasons.add("telefon-kategori");
    }
  }

  // HARD FILTER: aksesuar kategori + accessoryIntent yoksa, ürün tamamen el.
  // Önceden -100 skor uygulardı ama base score 108+ olunca pozitif kalıp
  // filter'dan geçiyordu (kılıflar telefon araması sonuçlarında görünüyordu).
  // Şimdi -1 dön → applyRankingSignals filter'ı tamamen eler.
  if (ACCESSORY_CATEGORY_PATTERN.test(categorySlug) && !accessoryIntent) {
    return { score: -1, reasons: [] };
  }

  if (matchedTerms === 0) {
    return { score: -1, reasons: [] };
  }

  const coverage = matchedTerms / terms.length;
  const minCoverage =
    profile.mode === "specific" ? 0.6 : profile.mode === "balanced" ? 0.4 : 0.25;

  if (coverage < minCoverage) {
    return { score: -1, reasons: [] };
  }

  const anchorTerms = terms.filter(isAnchorIntentTerm);
  if (anchorTerms.length > 0 && matchedAnchorTerms === 0 && profile.mode !== "exploratory") {
    return { score: -1, reasons: [] };
  }

  if (anchorTerms.length > 0 && matchedAnchorTerms === anchorTerms.length) {
    score += 6;
    reasons.add("anchor-tam");
  }

  if (missingTerms > 0) {
    const penalty =
      profile.mode === "specific"
        ? missingTerms * 8
        : profile.mode === "balanced"
          ? missingTerms * 5
          : missingTerms * 2;
    score -= penalty;
    reasons.add(`eksik-terim:${missingTerms}`);
  }

  if (matchedStrictTerms > 0 && missingStrictTerms === 0) {
    score += 8;
    reasons.add("kritik-tam");
  } else if (missingStrictTerms > 0) {
    const strictPenalty =
      profile.mode === "specific"
        ? missingStrictTerms * 18
        : profile.mode === "balanced"
          ? missingStrictTerms * 10
          : missingStrictTerms * 4;
    score -= strictPenalty;
    reasons.add(`eksik-kritik:${missingStrictTerms}`);
  }

  if (product.offer_count > 0) {
    score += Math.min(product.offer_count * 2, 8);
    reasons.add("aktif-teklif");
  }
  if (product.image_url) {
    score += 2;
    reasons.add("gorsel");
  }

  return { score, reasons: Array.from(reasons) };
}

export function getQueryRankingProfile(terms: string[]): QueryRankingProfile {
  if (terms.length === 0) {
    return {
      mode: "balanced",
      priceSensitive: false,
      accessoryIntent: false,
    };
  }

  const accessoryIntent = hasAccessoryIntent(terms);
  const priceSensitive = terms.some((term) => PRICE_SENSITIVE_TERMS.has(term));
  const hasVariantHints = terms.some((term) => {
    if (VARIANT_INTENT_TERMS.has(term)) return true;
    if (/\d/.test(term)) return true;
    if (/^\d+(gb|tb|mp|hz|mah)$/.test(term)) return true;
    return false;
  });
  const genericOnly = terms.every(
    (term) => GENERIC_DISCOVERY_TERMS.has(term) || PRICE_SENSITIVE_TERMS.has(term)
  );

  if (hasVariantHints) {
    return {
      mode: "specific",
      priceSensitive,
      accessoryIntent,
    };
  }

  if (genericOnly || (priceSensitive && terms.length <= 3)) {
    return {
      mode: "exploratory",
      priceSensitive,
      accessoryIntent,
    };
  }

  return {
    mode: "balanced",
    priceSensitive,
    accessoryIntent,
  };
}

function getModeMultiplier(
  profile: QueryRankingProfile,
  channel: "vector" | "offer" | "freshness" | "source_trust"
): number {
  if (profile.mode === "specific") {
    if (channel === "vector") return 1.2;
    if (channel === "offer") return 0.75;
    if (channel === "freshness") return 0.5;
    return 0.4;
  }

  if (profile.mode === "exploratory") {
    if (channel === "vector") return 0.9;
    if (channel === "offer") return 1.15;
    if (channel === "freshness") return 1.1;
    return 1;
  }

  if (channel === "vector") return 1;
  if (channel === "offer") return 1;
  if (channel === "freshness") return 0.85;
  return 0.75;
}

function getVectorBoost(
  similarity: number | null | undefined,
  profile: QueryRankingProfile
): number {
  if (!Number.isFinite(similarity)) return 0;
  const safeSimilarity = Math.max(0, Math.min(1, similarity ?? 0));
  const base = 10 + Math.round(safeSimilarity * 24);
  return Math.round(base * getModeMultiplier(profile, "vector"));
}

function getFreshnessBoost(
  value: string | null | undefined,
  profile: QueryRankingProfile
): number {
  if (!value) return 0;

  const diffMs = Date.now() - new Date(value).getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  let base = 0;
  if (diffHours <= 6) base = 6;
  else if (diffHours <= 24) base = 4;
  else if (diffHours <= 72) base = 2;
  else if (diffHours <= 168) base = 1;

  return Math.round(base * getModeMultiplier(profile, "freshness"));
}

function getSourceTrustBoost(
  product: RankedProduct,
  profile: QueryRankingProfile
): number {
  const trust = getBestSourceTrust(product.prices);
  let base = 0;
  if (trust >= 95) base = 6;
  else if (trust >= 80) base = 5;
  else if (trust >= 70) base = 4;
  else if (trust >= 60) base = 3;
  else if (trust >= 40) base = 2;
  else if (trust > 0) base = 1;

  return Math.round(base * getModeMultiplier(profile, "source_trust"));
}

function getOfferBoost(product: RankedProduct, profile: QueryRankingProfile): number {
  const base = product.offer_count > 0 ? Math.min(product.offer_count * 2, 8) : 0;
  return Math.round(base * getModeMultiplier(profile, "offer"));
}

function getRelativePriceAdjustment(
  product: RankedProduct,
  products: RankedProduct[],
  profile: QueryRankingProfile
): number {
  if (profile.mode === "specific" && !profile.priceSensitive) {
    return 0;
  }

  const validPrices = products
    .map((entry) => entry.min_price)
    .filter((price): price is number => Number.isFinite(price));

  if (validPrices.length < 2 || !Number.isFinite(product.min_price)) {
    return 0;
  }

  const minPrice = Math.min(...validPrices);
  const maxPrice = Math.max(...validPrices);
  const range = maxPrice - minPrice;
  if (range <= 0) return 0;

  const normalized = (maxPrice - (product.min_price ?? maxPrice)) / range;
  const maxBonus = profile.priceSensitive ? 7 : profile.mode === "exploratory" ? 5 : 2;
  return Math.round(normalized * maxBonus);
}

function getKnowledgeBoost(
  product: RankedProduct,
  usageProfileId: string | null,
  signalTerms: string[],
  profile: QueryRankingProfile
): { boost: number; reasons: string[] } {
  if (!usageProfileId || signalTerms.length === 0) {
    return { boost: 0, reasons: [] };
  }

  const titleText = normalizeSearchText(
    [product.title, product.brand, product.model_family, product.model_code]
      .filter(Boolean)
      .join(" ")
  );
  const specsText = flattenSpecsText(product.specs);
  const matchedSignals = new Set<string>();
  let boost = 0;

  for (const signal of signalTerms.slice(0, 16)) {
    const normalizedSignal = normalizeSearchText(signal);
    if (normalizedSignal.length < 2) continue;

    if (titleText.includes(normalizedSignal)) {
      matchedSignals.add(normalizedSignal);
      boost += normalizedSignal.includes(" ") ? 4 : 3;
      continue;
    }

    if (specsText.includes(normalizedSignal)) {
      matchedSignals.add(normalizedSignal);
      boost += normalizedSignal.includes(" ") ? 5 : 4;
    }
  }

  if (matchedSignals.size === 0) {
    return { boost: 0, reasons: [] };
  }

  if (matchedSignals.size >= 2) {
    boost += 3;
  }

  const maxBoost =
    profile.mode === "specific" ? 18 : profile.mode === "balanced" ? 16 : 14;
  const limitedBoost = Math.min(boost, maxBoost);

  return {
    boost: limitedBoost,
    reasons: [
      `kullanim:${usageProfileId}`,
      `bilgi-eslesme:${matchedSignals.size}`,
      ...Array.from(matchedSignals)
        .slice(0, 2)
        .map((signal) => `bilgi:${signal}`),
    ],
  };
}

function applyRankingSignals(
  products: RankedProduct[],
  categories: SearchCategoryRow[],
  query: string,
  queryCategorySlug: string | null,
  terms: string[],
  vectorMap: Map<string, number>,
  priceMin: number | null | undefined,
  priceMax: number | null | undefined
): RankedProduct[] {
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const profile = getQueryRankingProfile(terms);
  const knowledgeContext = buildCategoryRankingContext({
    categorySlug: queryCategorySlug,
    userMessage: query,
  });

  return products
    .map((product) => {
      const lexical = getProductSearchScore(
        product,
        categoryMap.get(product.category_id ?? ""),
        terms,
        profile
      );
      const vectorSimilarity = vectorMap.get(product.id) ?? null;
      const vectorBoost = getVectorBoost(vectorSimilarity, profile);
      const offerBoost = getOfferBoost(product, profile);
      const imageBoost = product.image_url ? 2 : 0;
      const freshnessBoost = getFreshnessBoost(product.freshest_seen_at, profile);
      const sourceTrustBoost = getSourceTrustBoost(product, profile);
      const knowledgeBoost = getKnowledgeBoost(
        product,
        knowledgeContext?.usageProfileId ?? null,
        knowledgeContext?.signalTerms ?? [],
        profile
      );

      let score = lexical.score;
      const reasons = [...lexical.reasons];
      let pricePenalty = 0;

      if (vectorSimilarity !== null) {
        score = Math.max(score, 0) + vectorBoost;
        reasons.push(`vektor:${vectorSimilarity.toFixed(2)}`);
      }

      if (
        priceMin &&
        Number.isFinite(product.min_price) &&
        (product.min_price ?? 0) < priceMin
      ) {
        pricePenalty -= 8;
        reasons.push("butce-alti");
      }

      if (
        priceMax &&
        Number.isFinite(product.min_price) &&
        (product.min_price ?? 0) > priceMax
      ) {
        pricePenalty -= 12;
        reasons.push("butce-ustu");
      }

      const relativePriceAdjustment = getRelativePriceAdjustment(product, products, profile);
      if (relativePriceAdjustment > 0) {
        pricePenalty += relativePriceAdjustment;
        reasons.push(
          profile.priceSensitive ? `fiyat-avantaj:${relativePriceAdjustment}` : "fiyat-avantaj"
        );
      }

      score +=
        offerBoost +
        imageBoost +
        freshnessBoost +
        sourceTrustBoost +
        knowledgeBoost.boost +
        pricePenalty;
      if (offerBoost > 0 && !reasons.includes("aktif-teklif")) reasons.push("aktif-teklif");
      if (imageBoost > 0 && !reasons.includes("gorsel")) reasons.push("gorsel");
      if (freshnessBoost > 0) reasons.push(`tazelik:${freshnessBoost}`);
      if (sourceTrustBoost > 0) reasons.push(`guven:${sourceTrustBoost}`);
      if (knowledgeBoost.boost > 0) reasons.push(...knowledgeBoost.reasons);
      if (profile.mode !== "balanced") reasons.push(`profil:${profile.mode}`);

      return {
        ...product,
        search_score: score,
        vector_similarity: vectorSimilarity,
        ranking_reasons: reasons,
        score_breakdown: {
          lexical: lexical.score,
          vector: vectorBoost,
          offer: offerBoost,
          image: imageBoost,
          freshness: freshnessBoost,
          source_trust: sourceTrustBoost,
          knowledge: knowledgeBoost.boost,
          price_penalty: pricePenalty,
          total: score,
        },
      };
    })
    .filter(
      (product) => product.score_breakdown.lexical >= 0 || product.vector_similarity !== null
    )
    .sort((left, right) => {
      if (right.search_score !== left.search_score) {
        return right.search_score - left.search_score;
      }
      if ((right.vector_similarity ?? 0) !== (left.vector_similarity ?? 0)) {
        return (right.vector_similarity ?? 0) - (left.vector_similarity ?? 0);
      }
      if (right.offer_count !== left.offer_count) {
        return right.offer_count - left.offer_count;
      }
      return (right.created_at ?? "").localeCompare(left.created_at ?? "");
    });
}

function relaxSearchTerms(terms: string[]): string[] {
  const prioritized = terms.filter(
    (term) => isAnchorIntentTerm(term) || isStrictIntentTerm(term)
  );
  const fallback = prioritized.length > 0 ? prioritized : terms.slice(0, 3);
  return Array.from(new Set(fallback)).slice(0, Math.min(4, terms.length));
}

function buildRelaxedTermVariants(terms: string[]): string[][] {
  const variants: string[][] = [];
  const pushVariant = (candidate: string[]) => {
    const normalized = Array.from(new Set(candidate)).filter(Boolean);
    if (normalized.length === 0) return;
    if (normalized.join("|") === terms.join("|")) return;
    if (variants.some((entry) => entry.join("|") === normalized.join("|"))) return;
    variants.push(normalized);
  };

  pushVariant(relaxSearchTerms(terms));
  pushVariant(terms.filter(isAnchorIntentTerm));
  pushVariant(terms.filter((term) => isAnchorIntentTerm(term) || isStrictIntentTerm(term)));
  pushVariant(terms.slice(0, 2));

  return variants;
}

function mergeRankedClusters(products: RankedProduct[]): RankedProduct[] {
  const groups = new Map<string, RankedProduct[]>();
  const passthrough: RankedProduct[] = [];

  for (const product of products) {
    const key = getExactProductClusterKey(product);
    if (!key) {
      passthrough.push(product);
      continue;
    }

    const existing = groups.get(key);
    if (existing) {
      existing.push(product);
      continue;
    }

    groups.set(key, [product]);
  }

  const merged = Array.from(groups.values()).map((items) => {
    const representative = Array.from(items).sort((left, right) => {
      if (right.search_score !== left.search_score) {
        return right.search_score - left.search_score;
      }
      if (right.offer_count !== left.offer_count) {
        return right.offer_count - left.offer_count;
      }
      if ((right.vector_similarity ?? 0) !== (left.vector_similarity ?? 0)) {
        return (right.vector_similarity ?? 0) - (left.vector_similarity ?? 0);
      }
      if ((right.freshest_seen_at ?? "") !== (left.freshest_seen_at ?? "")) {
        return (right.freshest_seen_at ?? "").localeCompare(left.freshest_seen_at ?? "");
      }
      return (right.created_at ?? "").localeCompare(left.created_at ?? "");
    })[0];

    const mergedPrices = dedupeClusterListingsBySource(
      items.flatMap((item) => item.prices ?? [])
    ) as SearchListingRow[];

    return {
      ...representative,
      image_url:
        representative.image_url ?? items.find((item) => item.image_url)?.image_url ?? null,
      prices: mergedPrices,
      min_price: getLowestActivePrice(mergedPrices),
      offer_count: getActiveOfferCount(mergedPrices),
      listing_count: getActiveOfferCount(mergedPrices),
      sources: getUniqueActiveSources(mergedPrices),
      freshest_seen_at: getFreshestSeenAt(mergedPrices),
      search_score: Math.max(...items.map((item) => item.search_score)),
      vector_similarity: items.reduce<number | null>(
        (best, item) =>
          best === null || (item.vector_similarity ?? 0) > best
            ? item.vector_similarity ?? best
            : best,
        null
      ),
      ranking_reasons: Array.from(
        new Set(items.flatMap((item) => item.ranking_reasons))
      ),
      score_breakdown: items
        .slice()
        .sort((left, right) => right.search_score - left.search_score)[0].score_breakdown,
    };
  });

  return passthrough.concat(merged).sort((left, right) => {
    if (right.search_score !== left.search_score) {
      return right.search_score - left.search_score;
    }
    if ((right.vector_similarity ?? 0) !== (left.vector_similarity ?? 0)) {
      return (right.vector_similarity ?? 0) - (left.vector_similarity ?? 0);
    }
    if (right.offer_count !== left.offer_count) {
      return right.offer_count - left.offer_count;
    }
    return (right.created_at ?? "").localeCompare(left.created_at ?? "");
  });
}

async function loadSearchCategories(
  sb: SupabaseClient,
  enabled: boolean
): Promise<SearchCategoryRow[]> {
  if (!enabled) return [];
  const { data, error } = await sb
    .from("categories")
    .select("id, parent_id, name, slug");

  if (error) {
    throw new Error(`category search failed: ${error.message}`);
  }

  return (data ?? []) as SearchCategoryRow[];
}

export async function retrieveRankedProducts(
  options: RetrieveRankedProductsOptions
): Promise<{ products: RankedProduct[]; diagnostics: RetrievalRankingDiagnostics }> {
  const {
    sb,
    query,
    categorySlug,
    brand,
    limit = 20,
    offset = 0,
    priceMin = null,
    priceMax = null,
    includeEmptyListings = false,
    vectorCandidates = [],
  } = options;

  const normalizedQuery = query?.trim() ?? "";
  const queryTerms = splitSearchTerms(normalizedQuery);
  const queryProfile = getQueryRankingProfile(queryTerms);
  const knowledgeContext = buildCategoryRankingContext({
    categorySlug: categorySlug ?? null,
    userMessage: normalizedQuery,
  });
  const shouldLoadCategories = Boolean(categorySlug || normalizedQuery);
  const categories = await loadSearchCategories(sb, shouldLoadCategories);

  let categoryIds: string[] | null = null;
  if (categorySlug) {
    const category = categories.find((entry) => entry.slug === categorySlug) ?? null;
    if (!category) {
      throw new CategoryNotFoundError(categorySlug);
    }
    categoryIds = expandCategoryIds(categories, [category.id]);
  }

  const vectorMap = new Map(
    vectorCandidates
      .filter((candidate) => Boolean(candidate?.id))
      .map((candidate) => [candidate.id, Number(candidate.similarity) || 0])
  );

  const fetchLimit = Math.min(400, Math.max(offset + limit * 4, 48));
  let rows: SearchProductRow[] = [];

  if (normalizedQuery) {
    const searchTerms = queryTerms;
    const categoryMap = new Map(categories.map((category) => [category.id, category]));
    const uniqueRows = new Map<string, SearchProductRow>();

    const promises: Array<Promise<{ data: SearchProductRow[] | null; error: { message: string } | null }>> =
      [];

    if (searchTerms.length > 0) {
      const textClauses = searchTerms.flatMap((term) => {
        const safeTerm = escapeIlikeTerm(term);
        return [
          `title.ilike.%${safeTerm}%`,
          `brand.ilike.%${safeTerm}%`,
          `model_family.ilike.%${safeTerm}%`,
          `model_code.ilike.%${safeTerm}%`,
          `variant_storage.ilike.%${safeTerm}%`,
          `variant_color.ilike.%${safeTerm}%`,
        ];
      });

      let textQuery = sb
        .from("products")
        .select(SELECT_FIELDS)
        .or(textClauses.join(","))
        .eq("is_active", true)
        .range(0, fetchLimit - 1)
        .order("created_at", { ascending: false });

      if (categoryIds) textQuery = textQuery.in("category_id", categoryIds);
      if (brand) textQuery = textQuery.ilike("brand", brand);

      promises.push(textQuery as unknown as Promise<{ data: SearchProductRow[] | null; error: { message: string } | null }>);

      // BUG FIX: OR query .range(0, fetchLimit-1) created_at DESC sırasıyla top-N
      // alıyor; eski tarihli ama tüm term'leri içeren ürünler (örn iPhone 15
      // Plus 128GB phones) candidate pool'a girmiyordu. AND-on-title ile ek
      // hedefli query — tüm term'ler title'da olan ürünleri kesin getir.
      if (searchTerms.length >= 2) {
        let andTitleQuery = sb
          .from("products")
          .select(SELECT_FIELDS)
          .eq("is_active", true)
          .range(0, fetchLimit - 1)
          .order("created_at", { ascending: false });

        for (const term of searchTerms) {
          andTitleQuery = andTitleQuery.ilike("title", `%${escapeIlikeTerm(term)}%`);
        }
        if (categoryIds) andTitleQuery = andTitleQuery.in("category_id", categoryIds);
        if (brand) andTitleQuery = andTitleQuery.ilike("brand", brand);

        promises.push(andTitleQuery as unknown as Promise<{ data: SearchProductRow[] | null; error: { message: string } | null }>);
      }

      const matchedCategoryIds = [
        ...new Set(searchTerms.flatMap((term) => getMatchedCategoryIds(categories, term))),
      ];
      const categoryScopedIds = categoryIds
        ? matchedCategoryIds.filter((id) => categoryIds?.includes(id))
        : matchedCategoryIds;

      if (categoryScopedIds.length > 0) {
        let categoryQuery = sb
          .from("products")
          .select(SELECT_FIELDS)
          .in("category_id", categoryScopedIds)
          .eq("is_active", true)
          .range(0, fetchLimit - 1)
          .order("created_at", { ascending: false });

        if (brand) categoryQuery = categoryQuery.ilike("brand", brand);
        promises.push(categoryQuery as unknown as Promise<{ data: SearchProductRow[] | null; error: { message: string } | null }>);
      }
    }

    if (vectorMap.size > 0) {
      let vectorQuery = sb
        .from("products")
        .select(SELECT_FIELDS)
        .in("id", Array.from(vectorMap.keys()).slice(0, fetchLimit))
        .range(0, fetchLimit - 1)
        .order("created_at", { ascending: false });

      if (categoryIds) vectorQuery = vectorQuery.in("category_id", categoryIds);
      if (brand) vectorQuery = vectorQuery.ilike("brand", brand);

      promises.push(vectorQuery as unknown as Promise<{ data: SearchProductRow[] | null; error: { message: string } | null }>);
    }

    if (promises.length === 0) {
      let fallbackQuery = sb
        .from("products")
        .select(SELECT_FIELDS)
        .range(0, fetchLimit - 1)
        .order("created_at", { ascending: false });

      if (categoryIds) fallbackQuery = fallbackQuery.in("category_id", categoryIds);
      if (brand) fallbackQuery = fallbackQuery.ilike("brand", brand);

      promises.push(fallbackQuery as unknown as Promise<{ data: SearchProductRow[] | null; error: { message: string } | null }>);
    }

    const results = await Promise.all(promises);
    for (const result of results) {
      if (result.error) {
        throw new Error(result.error.message);
      }
      for (const row of result.data ?? []) {
        uniqueRows.set(row.id, row);
      }
    }

    const ranked = applyRankingSignals(
      normalizeProductRows(Array.from(uniqueRows.values()), categoryMap),
      categories,
      normalizedQuery,
      categorySlug ?? null,
      searchTerms,
      vectorMap,
      priceMin,
      priceMax
    );

    let mergedRanked = mergeRankedClusters(ranked)
      .filter((product) => includeEmptyListings || product.prices.length > 0)
      .slice(offset, offset + limit);

    if (mergedRanked.length === 0 && searchTerms.length > 2) {
      for (const relaxedTerms of buildRelaxedTermVariants(searchTerms)) {
        const relaxedRanked = applyRankingSignals(
          normalizeProductRows(Array.from(uniqueRows.values()), categoryMap),
          categories,
          normalizedQuery,
          categorySlug ?? null,
          relaxedTerms,
          vectorMap,
          priceMin,
          priceMax
        );
        mergedRanked = mergeRankedClusters(relaxedRanked)
          .filter((product) => includeEmptyListings || product.prices.length > 0)
          .slice(offset, offset + limit);
        if (mergedRanked.length > 0) {
          break;
        }
      }
    }

    rows = mergedRanked as unknown as SearchProductRow[];

    return {
      products: rows as unknown as RankedProduct[],
      diagnostics: {
        query_profile: queryProfile,
        term_count: searchTerms.length,
        strict_term_count: searchTerms.filter(isStrictIntentTerm).length,
        candidate_pool_size: ranked.length,
        knowledge_category_slug: knowledgeContext?.categorySlug ?? null,
        knowledge_profile_id: knowledgeContext?.usageProfileId ?? null,
        knowledge_signal_terms: knowledgeContext?.signalTerms ?? [],
      },
    };
  }

  let listQuery = sb
    .from("products")
    .select(SELECT_FIELDS)
    .eq("is_active", true)
    .range(0, fetchLimit - 1)
    .order("created_at", { ascending: false });

  if (categoryIds) listQuery = listQuery.in("category_id", categoryIds);
  if (brand) listQuery = listQuery.ilike("brand", brand);

  const result = await listQuery;
  if (result.error) {
    throw new Error(result.error.message);
  }

  const categoryMap = new Map(categories.map((category) => [category.id, category]));

  const listedProducts = normalizeProductRows(
    (result.data ?? []) as SearchProductRow[],
    categoryMap
  )
    .filter((product) => includeEmptyListings || product.prices.length > 0)
    .slice(offset, offset + limit);

  return {
    products: listedProducts,
    diagnostics: {
      query_profile: queryProfile,
      term_count: queryTerms.length,
      strict_term_count: queryTerms.filter(isStrictIntentTerm).length,
      candidate_pool_size: listedProducts.length,
      knowledge_category_slug: knowledgeContext?.categorySlug ?? null,
      knowledge_profile_id: knowledgeContext?.usageProfileId ?? null,
      knowledge_signal_terms: knowledgeContext?.signalTerms ?? [],
    },
  };
}

export async function rerankKnownProducts(
  options: RerankKnownProductsOptions
): Promise<{ products: RankedProduct[]; diagnostics: RetrievalRankingDiagnostics }> {
  const {
    sb,
    productIds,
    query,
    categorySlug = null,
    limit = 20,
    offset = 0,
    priceMin = null,
    priceMax = null,
    includeEmptyListings = false,
    vectorCandidates = [],
  } = options;

  const uniqueProductIds = Array.from(
    new Set(productIds.filter((id) => typeof id === "string" && id.length > 0))
  ).slice(0, 64);
  const queryTerms = splitSearchTerms(query);
  const queryProfile = getQueryRankingProfile(queryTerms);
  const knowledgeContext = buildCategoryRankingContext({
    categorySlug: categorySlug ?? null,
    userMessage: query,
  });

  if (uniqueProductIds.length === 0) {
    return {
      products: [],
      diagnostics: {
        query_profile: queryProfile,
        term_count: queryTerms.length,
        strict_term_count: queryTerms.filter(isStrictIntentTerm).length,
        candidate_pool_size: 0,
        knowledge_category_slug: knowledgeContext?.categorySlug ?? null,
        knowledge_profile_id: knowledgeContext?.usageProfileId ?? null,
        knowledge_signal_terms: knowledgeContext?.signalTerms ?? [],
      },
    };
  }

  const shouldLoadCategories = Boolean(categorySlug || query);
  const categories = await loadSearchCategories(sb, shouldLoadCategories);

  let categoryIds: string[] | null = null;
  if (categorySlug) {
    const category = categories.find((entry) => entry.slug === categorySlug) ?? null;
    if (!category) {
      throw new CategoryNotFoundError(categorySlug);
    }
    categoryIds = expandCategoryIds(categories, [category.id]);
  }

  let detailQuery = sb
    .from("products")
    .select(SELECT_FIELDS)
    .eq("is_active", true)
    .in("id", uniqueProductIds);

  if (categoryIds) {
    detailQuery = detailQuery.in("category_id", categoryIds);
  }

  const result = await detailQuery;
  if (result.error) {
    throw new Error(result.error.message);
  }

  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const vectorMap = new Map(
    vectorCandidates
      .filter((candidate) => Boolean(candidate?.id))
      .map((candidate) => [candidate.id, Number(candidate.similarity) || 0])
  );

  const ranked = applyRankingSignals(
    normalizeProductRows((result.data ?? []) as SearchProductRow[], categoryMap),
    categories,
    query,
    categorySlug ?? null,
    queryTerms,
    vectorMap,
    priceMin,
    priceMax
  );

  const merged = mergeRankedClusters(ranked)
    .filter((product) => includeEmptyListings || product.prices.length > 0)
    .slice(offset, offset + limit);

  return {
    products: merged,
    diagnostics: {
      query_profile: queryProfile,
      term_count: queryTerms.length,
      strict_term_count: queryTerms.filter(isStrictIntentTerm).length,
      candidate_pool_size: ranked.length,
      knowledge_category_slug: knowledgeContext?.categorySlug ?? null,
      knowledge_profile_id: knowledgeContext?.usageProfileId ?? null,
      knowledge_signal_terms: knowledgeContext?.signalTerms ?? [],
    },
  };
}
