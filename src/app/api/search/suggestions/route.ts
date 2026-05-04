import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { shouldHideDiscoveryProduct } from "@/lib/productDiscovery";
import { cleanProductTitle } from "@/lib/productTitle";
import { retrieveRankedProducts } from "@/lib/search/productRetrieval";
import {
  normalizeForSearch,
  simplifySearchQueryForMatching,
  splitNormalizedSearchTerms,
} from "@/lib/search/searchQuery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SuggestionKind = "product" | "category" | "brand" | "query";

type SearchSuggestion = {
  id: string;
  label: string;
  description: string;
  href: string;
  kind: SuggestionKind;
  score: number;
};

type CategorySuggestionRow = {
  id: string;
  name: string;
  slug: string;
  keywords: string[] | null;
};

const ACCESSORY_TERMS = [
  "aksesuar",
  "adaptör",
  "adaptor",
  "batarya",
  "cam",
  "case",
  "ekran",
  "kapak",
  "kablo",
  "kılıf",
  "kilif",
  "koruyucu",
  "lens",
  "şarj",
  "sarj",
  "soket",
  "stand",
  "tampon",
  "tutucu",
  "uyumlu",
  "yedek",
];

function normalizeForMatch(value: string | null | undefined): string {
  return normalizeForSearch(value);
}

function tokenMatches(candidateToken: string, queryToken: string): boolean {
  return candidateToken === queryToken || candidateToken.startsWith(queryToken);
}

function allQueryTokensMatch(candidateText: string, queryTerms: string[]): boolean {
  const candidateTokens = normalizeForMatch(candidateText).split(/\s+/).filter(Boolean);
  if (candidateTokens.length === 0) return false;

  return queryTerms.every((queryToken) =>
    candidateTokens.some((candidateToken) => tokenMatches(candidateToken, queryToken))
  );
}

function scoreTextMatch(candidateText: string, normalizedQuery: string, queryTerms: string[]): number {
  const normalized = normalizeForMatch(candidateText);
  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (!allQueryTokensMatch(candidateText, queryTerms)) return 0;

  let score = 1;
  if (normalized === normalizedQuery) score += 40;
  if (normalized.startsWith(normalizedQuery)) score += 28;
  if (normalized.includes(normalizedQuery)) score += 18;
  if (tokens.every((token, index) => tokenMatches(token, queryTerms[index] ?? ""))) score += 8;
  score += Math.max(0, 8 - Math.abs(tokens.length - queryTerms.length));
  return score;
}

function containsAnyTerm(text: string, terms: string[]): boolean {
  const normalized = normalizeForMatch(text);
  return terms.some((term) => normalized.split(/\s+/).some((token) => tokenMatches(token, normalizeForMatch(term))));
}

function getAutocompleteTerms(query: string): string[] {
  const tokens = normalizeForMatch(query).split(/\s+/).filter(Boolean);
  const lastIndex = tokens.length - 1;
  return tokens.filter((token, index) => token.length >= 2 || index === lastIndex);
}

function getCategorySearchText(category: CategorySuggestionRow): string {
  return [
    category.name,
    category.slug.replace(/[/_-]+/g, " "),
    ...(category.keywords ?? []),
  ].join(" ");
}

function categoryDescription(slug: string): string {
  const parts = slug.split("/").filter(Boolean);
  if (parts.length <= 1) return "Kategori";
  return parts.slice(0, -1).join(" / ");
}

async function getCategorySuggestions(normalizedQuery: string, queryTerms: string[]): Promise<SearchSuggestion[]> {
  const categories: CategorySuggestionRow[] = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabaseAdmin
      .from("categories")
      .select("id, name, slug, keywords")
      .eq("is_active", true)
      .neq("slug", "siniflandirilmamis")
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      console.warn("[api/search/suggestions] category search failed:", error.message);
      return [];
    }

    categories.push(...((data ?? []) as CategorySuggestionRow[]));
    if (!data || data.length < pageSize) break;
  }

  return categories
    .map((category) => {
      const score = scoreTextMatch(getCategorySearchText(category), normalizedQuery, queryTerms);
      return {
        id: `category-${category.id}`,
        label: category.name,
        description: categoryDescription(category.slug),
        href: `/anasayfa/${category.slug}`,
        kind: "category" as const,
        score,
      };
    })
    .filter((suggestion) => suggestion.score > 0)
    .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label, "tr"))
    .slice(0, 5);
}

async function getProductAndBrandSuggestions(
  query: string,
  normalizedQuery: string,
  queryTerms: string[],
  autocompleteTerms: string[],
): Promise<SearchSuggestion[]> {
  const { products } = await retrieveRankedProducts({
    sb: supabaseAdmin,
    query,
    limit: 60,
  });

  const suggestions: SearchSuggestion[] = [];
  const brandScores = new Map<string, { label: string; score: number; count: number }>();
  const modelScores = new Map<string, { label: string; score: number; count: number }>();
  const queryHasAccessoryIntent = containsAnyTerm(query, ACCESSORY_TERMS);

  for (const product of products.filter((item) => !shouldHideDiscoveryProduct(item))) {
    const title = cleanProductTitle(product.title) || product.title;
    const searchableProductText = [
      title,
      product.brand,
      product.model_family,
      product.model_code,
      product.variant_storage,
      product.category_slug?.replace(/[/_-]+/g, " "),
    ].filter(Boolean).join(" ");
    const productScore = scoreTextMatch(searchableProductText, normalizedQuery, queryTerms);

    if (productScore > 0) {
      const accessoryPenalty = !queryHasAccessoryIntent && containsAnyTerm(title, ACCESSORY_TERMS) ? 35 : 0;
      suggestions.push({
        id: `product-${product.id}`,
        label: title,
        description: [product.brand, product.category_slug?.split("/").at(-1)?.replace(/-/g, " ")]
          .filter(Boolean)
          .join(" / ") || "Urun",
        href: `/urun/${product.slug}`,
        kind: "product",
        score: productScore + Math.min(20, product.search_score / 5) - accessoryPenalty,
      });
    }

    const brand = product.brand?.trim();
    if (brand && scoreTextMatch(brand, normalizedQuery, queryTerms) > 0) {
      const key = normalizeForMatch(brand);
      const current = brandScores.get(key);
      brandScores.set(key, {
        label: current?.label ?? brand,
        score: Math.max(current?.score ?? 0, scoreTextMatch(brand, normalizedQuery, queryTerms)),
        count: (current?.count ?? 0) + 1,
      });
    }

    const modelLabel = [product.model_family, product.variant_storage].filter(Boolean).join(" ").trim();
    if (modelLabel) {
      const modelScore = scoreTextMatch(modelLabel, normalizedQuery, autocompleteTerms);
      if (modelScore > 0) {
        const key = normalizeForMatch(modelLabel);
        const current = modelScores.get(key);
        modelScores.set(key, {
          label: current?.label ?? modelLabel,
          score: Math.max(current?.score ?? 0, modelScore),
          count: (current?.count ?? 0) + 1,
        });
      }
    }
  }

  for (const [key, brand] of brandScores.entries()) {
    suggestions.push({
      id: `brand-${key}`,
      label: brand.label,
      description: `${brand.count} eslesen urun`,
      href: `/ara?q=${encodeURIComponent(brand.label)}`,
      kind: "brand",
      score: brand.score + Math.min(12, brand.count * 2),
    });
  }

  for (const [key, model] of modelScores.entries()) {
    suggestions.push({
      id: `query-${key}`,
      label: model.label,
      description: `${model.count} eslesen urun`,
      href: `/ara?q=${encodeURIComponent(model.label)}`,
      kind: "query",
      score: model.score + Math.min(18, model.count * 2) + 8,
    });
  }

  return suggestions;
}

function dedupeSuggestions(suggestions: SearchSuggestion[]): SearchSuggestion[] {
  const byKey = new Map<string, SearchSuggestion>();

  for (const suggestion of suggestions) {
    const key = `${suggestion.kind}:${normalizeForMatch(suggestion.label)}:${suggestion.href}`;
    const current = byKey.get(key);
    if (!current || suggestion.score > current.score) {
      byKey.set(key, suggestion);
    }
  }

  return Array.from(byKey.values());
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const rawQuery = url.searchParams.get("q") ?? "";
    const query = simplifySearchQueryForMatching(rawQuery);
    const normalizedQuery = normalizeForMatch(query);
    const queryTerms = splitNormalizedSearchTerms(query);
    const autocompleteTerms = getAutocompleteTerms(query);

    if (normalizedQuery.length < 2 || queryTerms.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    const [productAndBrandSuggestions, categorySuggestions] = await Promise.all([
      getProductAndBrandSuggestions(query, normalizedQuery, queryTerms, autocompleteTerms),
      getCategorySuggestions(normalizedQuery, queryTerms),
    ]);

    const suggestions = dedupeSuggestions([...productAndBrandSuggestions, ...categorySuggestions])
      .sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score;
        if (left.kind !== right.kind) {
          const priority: Record<SuggestionKind, number> = { query: 0, product: 1, category: 2, brand: 3 };
          return priority[left.kind] - priority[right.kind];
        }
        return left.label.localeCompare(right.label, "tr");
      })
      .slice(0, 8)
      .map((suggestion) => ({
        id: suggestion.id,
        label: suggestion.label,
        description: suggestion.description,
        href: suggestion.href,
        kind: suggestion.kind,
      }));

    return NextResponse.json(
      { suggestions },
      { headers: { "Cache-Control": "private, max-age=0, no-store" } },
    );
  } catch (error) {
    console.error("[api/search/suggestions] failed:", error);
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }
}
