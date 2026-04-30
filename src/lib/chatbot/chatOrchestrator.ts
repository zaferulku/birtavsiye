/**
 * Chat Orchestrator
 *
 * Kullanıcı mesajını alır, fast/slow path arasında karar verir, ilgili
 * arama akışını çalşırır, sonucu döner.
 *
 * Bu dosya mevcut /api/chat/route.ts içine import edilir. Mevcut
 * searchProducts() bozulmaz ş bu fonksiyon onu sarmalar.
 *
 * AKIş:
 *   parseQuery (mevcut, hızlı)
 *     ş
 *   detectPath (fast vs slow)
 *     ş
 *   FAST PATH: searchProducts() (mevcut, vector + keyword)
 *   SLOW PATH: retrieveKB ş parseIntent ş smartSearch ş fallback to searchProducts
 *     ş
 *   generateResponse (mevcut LLM çşısı + KB context + intent)
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { detectPath, type PathDecision, type QueryParserResult } from "./fastPathDetector";
import { retrieveKnowledge } from "./retrieveKnowledge";
import { INTENT_ROUTING, type IntentType } from "./intentTypes";
import { parseIntent } from "./intentParserRuntime";
import { aiEmbed } from "../ai/aiClient";
import { generateResponse, type ProductForResponse } from "./generateResponse";
import type { StructuredIntent } from "./intentParser";
import { buildSuggestions, type Suggestion } from "./suggestionBuilder";
import {
  getQueryRankingProfile,
  isStrictIntentTerm,
  rerankKnownProducts,
  splitSearchTerms,
  type QueryRankingProfile,
  type RankingScoreBreakdown,
} from "../search/productRetrieval";

// ============================================================================
// Types
// ============================================================================

export type OrchestratorInput = {
  userMessage: string;
  // searchProducts (mevcut fonksiyon) ş bu modül oraya bşmlı olmasın
  legacySearch: (query: string) => Promise<LegacySearchResult>;
  // queryParser sonucu (mevcut chat route'tan geliyor)
  parsed: QueryParserResult;
  // Categories (loadCategories sonucu)
  categoryTaxonomy: string[];
  // Supabase client
  sb: SupabaseClient;
  // Önceki konuşma (proaktif sohbet için, opsiyonel)
  conversationHistory?: Array<{ role: string; content: string }>;
  // Stateful conversation (opsiyonel — dinamik match_count için)
  conversationState?: {
    category_slug?: string | null;
    brand_filter?: string[];
    variant_color_patterns?: string[];
    variant_storage_patterns?: string[];
  } | null;
  // Heuristic-resolved intent type (greeting/smalltalk/off_topic short-circuit
  // KB retrieval + smart_search). Defaults to product_search when absent.
  intentType?: IntentType | null;
};

export type ChatProductResult = {
  id: string;
  title: string;
  slug: string;
  brand: string | null;
  min_price: number | null;
  listing_count: number;
  model_family?: string | null;
  category_slug?: string | null;
  image_url?: string | null;
  similarity?: number | null;
  search_score?: number | null;
  ranking_reasons?: string[] | null;
  freshest_seen_at?: string | null;
  sources?: string[] | null;
  score_breakdown?: RankingScoreBreakdown | null;
};

export type CandidateTrace = {
  id: string;
  slug: string;
  title: string;
  brand: string | null;
  min_price: number | null;
  listing_count: number;
  category_slug: string | null;
  similarity: number | null;
  search_score: number | null;
  freshest_seen_at: string | null;
  ranking_reasons: string[];
  sources: string[];
  score_breakdown: RankingScoreBreakdown | null;
};

export type RetrievalDiagnostics = {
  path: "fast" | "slow";
  retrieval_stage: string;
  query_profile?: QueryRankingProfile | null;
  rerank_applied: boolean;
  kb_chunk_count: number;
  candidate_count: number;
  top_candidates: CandidateTrace[];
  pre_rerank_top_candidates?: CandidateTrace[];
  strict_term_count?: number;
  supplemented_by_legacy?: boolean;
  supplemental_candidate_count?: number;
  vector_candidate_count?: number;
  smart_search_count?: number;
  smart_search_match_sources?: string[];
  fallback_method?: LegacySearchResult["method"] | null;
  filters?: Record<string, unknown>;
};

export type LegacySearchResult = {
  products: ChatProductResult[];
  method: "vector" | "keyword" | "failed";
  filters: Record<string, unknown>;
  latencyMs: number;
  diagnostics?: {
    vector_candidate_count: number;
    top_candidates: CandidateTrace[];
    ranking?: {
      query_profile: QueryRankingProfile;
      term_count: number;
      strict_term_count: number;
      candidate_pool_size: number;
    };
  };
};

export type OrchestratorOutput = {
  response: string;
  products: ChatProductResult[];
  method: string;          // "fast_vector" | "fast_keyword" | "slow_hybrid" | ...
  pathDecision: PathDecision;
  intent: StructuredIntent | null;
  kbChunkCount: number;
  latencyMs: number;
  suggestions?: Suggestion[] | null;
  diagnostics: RetrievalDiagnostics;
};

// ============================================================================
// Main entry point
// ============================================================================

export async function orchestrateChat(
  input: OrchestratorInput
): Promise<OrchestratorOutput> {
  const startTime = Date.now();

  // 0. INTENT_ROUTING dispatch — intent_type'a göre pipeline seç:
  //    short_response (greeting/smalltalk/off_topic) → kısa hazır cevap
  //    knowledge_query → KB-only (smart_search atla)
  //    store_help → KB + forum (community_posts + topic_answers)
  //    product_search (default) → fast/slow path (smart_search aktif)
  const intentType = input.intentType ?? "product_search";
  const routing = INTENT_ROUTING[intentType];
  if (routing.short_response) {
    return runShortResponse(intentType, startTime);
  }
  if (intentType === "knowledge_query") {
    return await runKnowledgeQuery(input, startTime);
  }
  if (intentType === "store_help") {
    return await runStoreHelp(input, startTime);
  }

  // 1. Path decision (fast vs slow) — sadece product_search için
  const decision = detectPath(input.userMessage, input.parsed);

  if (decision.path === "fast") {
    return await runFastPath(input, decision, startTime);
  } else {
    return await runSlowPath(input, decision, startTime);
  }
}

// ============================================================================
// KNOWLEDGE_QUERY PATH — KB-only, smart_search atla
// ============================================================================

async function runKnowledgeQuery(
  input: OrchestratorInput,
  startTime: number
): Promise<OrchestratorOutput> {
  const knowledgeChunks = await retrieveKnowledge(input.sb, input.userMessage, {
    topN: 6,
    minSim: 0.4,
  });
  const response = await generateResponse({
    userMessage: input.userMessage,
    intent: null,
    knowledgeChunks,
    products: [],
    searchMethod: "failed",
    conversationHistory: input.conversationHistory || [],
  });
  return {
    response,
    products: [],
    method: "knowledge_query",
    pathDecision: { path: "slow", reason: "knowledge_query_kb_only", confidence: 1 },
    intent: null,
    kbChunkCount: knowledgeChunks.length,
    latencyMs: Date.now() - startTime,
    suggestions: [],
    diagnostics: {
      path: "slow",
      retrieval_stage: "kb_only",
      query_profile: null,
      rerank_applied: false,
      kb_chunk_count: knowledgeChunks.length,
      candidate_count: 0,
      top_candidates: [],
      strict_term_count: 0,
      vector_candidate_count: 0,
      filters: {},
    },
  };
}

// ============================================================================
// STORE_HELP PATH — KB + forum (community_posts + topic_answers)
// ============================================================================

async function retrieveForumChunks(
  sb: SupabaseClient,
  query: string,
  limit = 4
): Promise<Array<{ source: string; title: string | null; topic: string | null; content: string; similarity: number }>> {
  // Basit ILIKE search — vektörel değil, RPC gerek yok. store_help mesajları
  // genelde "kargo nasıl", "iade", "garanti" gibi anahtar kelime sorguları.
  const term = query.trim().slice(0, 80);
  if (!term) return [];
  const pattern = `%${term}%`;

  const [topicAns, communityPosts] = await Promise.all([
    sb
      .from("topic_answers")
      .select("id, content, topic_id")
      .ilike("content", pattern)
      .limit(limit),
    sb
      .from("community_posts")
      .select("id, content, title")
      .ilike("content", pattern)
      .limit(limit),
  ]);

  const chunks: Array<{
    source: string;
    title: string | null;
    topic: string | null;
    content: string;
    similarity: number;
  }> = [];
  for (const row of topicAns.data ?? []) {
    chunks.push({
      source: "topic_answer",
      title: null,
      topic: row.topic_id ?? null,
      content: String(row.content ?? "").slice(0, 600),
      similarity: 0.5,
    });
  }
  for (const row of communityPosts.data ?? []) {
    chunks.push({
      source: "community_post",
      title: row.title ?? null,
      topic: null,
      content: String(row.content ?? "").slice(0, 600),
      similarity: 0.5,
    });
  }
  return chunks;
}

async function runStoreHelp(
  input: OrchestratorInput,
  startTime: number
): Promise<OrchestratorOutput> {
  const [knowledgeChunks, forumChunks] = await Promise.all([
    retrieveKnowledge(input.sb, input.userMessage, { topN: 4, minSim: 0.4 }),
    retrieveForumChunks(input.sb, input.userMessage, 4),
  ]);
  const combined = [...knowledgeChunks, ...forumChunks];
  const response = await generateResponse({
    userMessage: input.userMessage,
    intent: null,
    knowledgeChunks: combined,
    products: [],
    searchMethod: "failed",
    conversationHistory: input.conversationHistory || [],
  });
  return {
    response,
    products: [],
    method: "store_help",
    pathDecision: { path: "slow", reason: "store_help_kb_forum", confidence: 1 },
    intent: null,
    kbChunkCount: combined.length,
    latencyMs: Date.now() - startTime,
    suggestions: [],
    diagnostics: {
      path: "slow",
      retrieval_stage: "kb_plus_forum",
      query_profile: null,
      rerank_applied: false,
      kb_chunk_count: combined.length,
      candidate_count: 0,
      top_candidates: [],
      strict_term_count: 0,
      vector_candidate_count: 0,
      filters: {},
    },
  };
}

const SHORT_RESPONSE_REPLIES: Record<IntentType, string> = {
  product_search: "",
  knowledge_query: "",
  store_help: "",
  greeting: "Merhaba! Ne aramama yardım edebilirim?",
  smalltalk: "Rica ederim, başka bir şey arıyor musunuz?",
  off_topic:
    "Ben birtavsiye.net asistanıyım, alışverişle ilgili yardımcı olabilirim. Bir ürün arıyor musunuz?",
};

function runShortResponse(
  intentType: IntentType,
  startTime: number
): OrchestratorOutput {
  const reply =
    SHORT_RESPONSE_REPLIES[intentType] || SHORT_RESPONSE_REPLIES.greeting;
  return {
    response: reply,
    products: [],
    method: `short_${intentType}`,
    pathDecision: {
      path: "fast",
      reason: `short_response_${intentType}`,
      confidence: 1,
    },
    intent: null,
    kbChunkCount: 0,
    latencyMs: Date.now() - startTime,
    suggestions: [],
    diagnostics: {
      path: "fast",
      retrieval_stage: "skipped_short_response",
      query_profile: null,
      rerank_applied: false,
      kb_chunk_count: 0,
      candidate_count: 0,
      top_candidates: [],
      strict_term_count: 0,
      vector_candidate_count: 0,
      filters: {},
    },
  };
}

// ============================================================================
// FAST PATH: spesifik ürün araması (örn "iPhone 15 Pro Max")
// ============================================================================

async function runFastPath(
  input: OrchestratorInput,
  decision: PathDecision,
  startTime: number
): Promise<OrchestratorOutput> {
  // Mevcut searchProducts() ş vector + keyword fallback zaten içinde
  const searchResult = await input.legacySearch(input.userMessage);

  // KB çşrmıyoruz, intent parse etmiyoruz ş fast path saf direkt arama
  // Response oluşturma: KB ve intent yok, ürünler var (umarız)
  const response = await generateResponse({
    userMessage: input.userMessage,
    intent: null,
    knowledgeChunks: [],
    products: mapProductsForResponse(searchResult.products),
    searchMethod: searchResult.method,
    conversationHistory: input.conversationHistory || [],
  });

  const suggestions = await buildSuggestions({
    userMessage: input.userMessage,
    intent: null,
    products: mapProductsForResponse(searchResult.products),
    conversationHistory: input.conversationHistory || [],
    sb: input.sb,
    categorySlug: input.parsed?.category ?? null,
  });

  return {
    response,
    products: searchResult.products,
    method: `fast_${searchResult.method}`,
    pathDecision: decision,
    intent: null,
    kbChunkCount: 0,
    latencyMs: Date.now() - startTime,
    suggestions,
    diagnostics: {
      path: "fast",
      retrieval_stage:
        searchResult.method === "vector"
          ? "shared_retrieval_ranked"
          : searchResult.method === "keyword"
            ? "shared_retrieval_keyword"
            : "shared_retrieval_failed",
      query_profile: searchResult.diagnostics?.ranking?.query_profile ?? null,
      rerank_applied: searchResult.method !== "failed",
      kb_chunk_count: 0,
      candidate_count: searchResult.products.length,
      top_candidates:
        searchResult.diagnostics?.top_candidates ??
        summarizeCandidateTraces(searchResult.products),
      strict_term_count: searchResult.diagnostics?.ranking?.strict_term_count ?? 0,
      vector_candidate_count: searchResult.diagnostics?.vector_candidate_count ?? 0,
      filters: searchResult.filters,
    },
  };
}

// ============================================================================
// SLOW PATH: niyet tabanlı arama (örn "lavanta kokulu deodorant")
// ============================================================================

async function runSlowPath(
  input: OrchestratorInput,
  decision: PathDecision,
  startTime: number
): Promise<OrchestratorOutput> {
  // KB retrieval — query embedding zaten retrieveKnowledge içinde yapılıyor.
  // Eskiden Promise.all single-item idi (ölü paralelleştirme); kaldırıldı.
  const knowledgeChunks = await retrieveKnowledge(input.sb, input.userMessage, {
    topN: 5,
    minSim: 0.5,
  });

  // 2. Intent parser (Llama ş Groq ş Gemini Flash chain)
  const intent = await parseIntent(
    input.userMessage,
    knowledgeChunks,
    input.categoryTaxonomy,
    input.conversationHistory || []
  );
  const queryTerms = splitSearchTerms(input.userMessage);
  const queryProfile = getQueryRankingProfile(queryTerms);
  const strictTermCount = queryTerms.filter(isStrictIntentTerm).length;

  // 3. Off-topic veya çok genel ş search yapma, direkt yanıt üret
  // Override: LLM kategori/brand çıkardıysa veya conversationState/parsed kategori
  // varsa → too_vague override edilir, search devam eder.
  // Sebep: "erkek tişört" gibi parseQuery'nin yakaladığı sorgular LLM tarafından
  // is_too_vague=true işaretleniyor; ama state'de category var, search yapılmalı.
  const hasResolvedDimension =
    Boolean(intent.category_slug) ||
    (Array.isArray(intent.brand_filter) && intent.brand_filter.length > 0) ||
    Boolean(input.conversationState?.category_slug) ||
    (Array.isArray(input.conversationState?.brand_filter) &&
      (input.conversationState?.brand_filter?.length ?? 0) > 0);
  if (intent.is_off_topic || (intent.is_too_vague && intent.confidence < 0.3 && !hasResolvedDimension)) {
    const response = await generateResponse({
      userMessage: input.userMessage,
      intent,
      knowledgeChunks,
      products: [],
      searchMethod: "failed",
      conversationHistory: input.conversationHistory || [],
    });

    const suggestions = await buildSuggestions({
      userMessage: input.userMessage,
      intent,
      products: [],
      conversationHistory: input.conversationHistory || [],
      sb: input.sb,
    });

    return {
      response,
      products: [],
      method: intent.is_off_topic ? "slow_off_topic" : "slow_too_vague",
      pathDecision: decision,
      intent,
      kbChunkCount: knowledgeChunks.length,
      latencyMs: Date.now() - startTime,
      suggestions,
      diagnostics: {
        path: "slow",
        retrieval_stage: intent.is_off_topic ? "off_topic" : "too_vague",
        query_profile: queryProfile,
        rerank_applied: false,
        kb_chunk_count: knowledgeChunks.length,
        candidate_count: 0,
        top_candidates: [],
        strict_term_count: strictTermCount,
        smart_search_count: 0,
      },
    };
  }

  // 4. Smart search (hybrid: vector + JSONB specs + keyword)
  let smartResults: SmartSearchRow[] = [];
  let method = "slow_hybrid";
  let rerankApplied = false;
  let supplementedByLegacy = false;
  let supplementalCandidateCount = 0;

  try {
    smartResults = await runSmartSearch(input.sb, input.userMessage, intent);
  } catch (err) {
    console.warn(
      `[orchestrator] smart_search failed: ${err instanceof Error ? err.message : err}`
    );
  }

  // 5. Smart search 0 sonuç ş mevcut searchProducts'a fallback
  let finalProducts: ChatProductResult[] = smartResults;
  if (smartResults.length === 0) {
    const fallback = await input.legacySearch(input.userMessage);
    finalProducts = fallback.products;
    method = `slow_fallback_${fallback.method}`;
  } else {
    try {
      const rerankProductIds = smartResults.map((product) => product.id);
      let rerankVectorCandidates = smartResults.map((product) => ({
        id: product.id,
        similarity: Number(product.similarity ?? 0),
      }));

      const shouldSupplementWithLegacy =
        queryProfile.mode === "specific" || strictTermCount > 0;

      if (shouldSupplementWithLegacy) {
        const supplemental = await input.legacySearch(input.userMessage);
        supplementalCandidateCount = supplemental.products.length;

        if (supplemental.products.length > 0) {
          const mergedIds = new Set(rerankProductIds);
          for (const product of supplemental.products) {
            if (!mergedIds.has(product.id)) {
              mergedIds.add(product.id);
              rerankProductIds.push(product.id);
            }
          }

          const vectorMap = new Map<string, number>();
          for (const candidate of rerankVectorCandidates) {
            vectorMap.set(candidate.id, Number(candidate.similarity ?? 0));
          }
          for (const product of supplemental.products) {
            const similarity = Number(product.similarity ?? 0);
            const existing = vectorMap.get(product.id);
            if (existing == null || similarity > existing) {
              vectorMap.set(product.id, similarity);
            }
          }

          rerankVectorCandidates = Array.from(vectorMap.entries()).map(
            ([id, similarity]) => ({
              id,
              similarity,
            })
          );
          supplementedByLegacy = rerankProductIds.length > smartResults.length;
        }
      }

      const reranked = await rerankKnownProducts({
        sb: input.sb,
        productIds: rerankProductIds,
        query: input.userMessage,
        categorySlug: intent.category_slug,
        limit: Math.max(smartResults.length, supplementalCandidateCount, 12),
        priceMin: intent.price_range.min,
        priceMax: intent.price_range.max,
        vectorCandidates: rerankVectorCandidates,
      });

      if (reranked.products.length > 0) {
        finalProducts = reranked.products;
        method = supplementedByLegacy
          ? "slow_hybrid_ranked_augmented"
          : "slow_hybrid_ranked";
        rerankApplied = true;
      }
    } catch (err) {
      console.warn(
        `[orchestrator] slow rerank failed: ${err instanceof Error ? err.message : err}`
      );
    }
  }

  // 6. Response generation (KB context + intent + ürünler)
  const response = await generateResponse({
    userMessage: input.userMessage,
    intent,
    knowledgeChunks,
    products: mapProductsForResponse(finalProducts),
    searchMethod: smartResults.length > 0 ? "hybrid" : "failed",
    conversationHistory: input.conversationHistory || [],
  });

  const suggestions = await buildSuggestions({
    userMessage: input.userMessage,
    intent,
    products: mapProductsForResponse(finalProducts),
    conversationHistory: input.conversationHistory || [],
    sb: input.sb,
    categorySlug: intent?.category_slug ?? null,
  });

  // DEBUG: suggestions empty trace (suggestions her zaman bos donuyorsa neden?)
  if (!suggestions || suggestions.length === 0) {
    console.warn("[suggestions] empty for slow path query:", input.userMessage?.slice(0, 60), {
      products_count: finalProducts.length,
      intent_brand: intent?.brand_filter,
      intent_category: intent?.category_slug,
      is_too_vague: intent?.is_too_vague,
    });
  }

  return {
    response,
    products: finalProducts,
    method,
    pathDecision: decision,
    intent,
    kbChunkCount: knowledgeChunks.length,
    latencyMs: Date.now() - startTime,
    suggestions,
    diagnostics: {
      path: "slow",
      retrieval_stage:
        smartResults.length > 0
          ? rerankApplied
            ? supplementedByLegacy
              ? "smart_search_plus_legacy_then_rerank"
              : "smart_search_then_rerank"
            : "smart_search_raw"
          : "legacy_fallback",
      query_profile: queryProfile,
      rerank_applied: rerankApplied,
      kb_chunk_count: knowledgeChunks.length,
      candidate_count: finalProducts.length,
      top_candidates: summarizeCandidateTraces(finalProducts),
      pre_rerank_top_candidates:
        smartResults.length > 0 ? summarizeCandidateTraces(smartResults) : undefined,
      strict_term_count: strictTermCount,
      supplemented_by_legacy: supplementedByLegacy,
      supplemental_candidate_count: supplementalCandidateCount,
      smart_search_count: smartResults.length,
      smart_search_match_sources:
        smartResults.length > 0
          ? Array.from(new Set(smartResults.map((product) => product.match_source)))
          : [],
      fallback_method:
        smartResults.length === 0 ? extractFallbackMethod(method) : null,
      filters: {
        category_slug: intent.category_slug,
        brand_filter: intent.brand_filter,
        price_range: intent.price_range,
        semantic_keywords: intent.semantic_keywords,
      },
    },
  };
}

// ============================================================================
// Smart search RPC çşısı
// ============================================================================

type SmartSearchRow = {
  id: string;
  slug: string;
  title: string;
  brand: string | null;
  image_url: string | null;
  category_slug: string | null;
  min_price: number | null;
  listing_count: number;
  similarity: number;
  match_source: string;
};

// Variant pattern extraction — must_have_specs içinden renk/depolama
// key'lerini ayıklayıp ILIKE pattern'larına çevirir. smart_search v2 RPC
// (migration 004) variant_color_patterns + variant_storage_patterns alır.
const COLOR_KEYS = new Set([
  "renk", "Renk", "color", "Color", "RENK", "COLOR",
]);
const STORAGE_KEYS = new Set([
  "depolama", "Depolama", "storage", "Storage", "hafıza", "Hafıza",
  "kapasite", "Kapasite", "gb", "GB",
  "hafiza", "Hafiza", "dahili_hafiza", "dahili_hafıza",
  "internal_storage", "memory", "Memory",
]);

// LLM tutarsızlığında semantic_keywords içinden renk yakalamak için.
// Intent parser bazen "siyah"ı must_have_specs.renk yerine
// semantic_keywords'e atıyor — bu sözlük JS-side fallback için.
// 35 Türkçe (diacritic'li + diacritic'siz) + 16 İngilizce.
const COLOR_WORDS = [
  // TR diacritic'li
  "siyah", "beyaz", "kırmızı", "mavi", "yeşil", "sarı", "mor",
  // "kahve" deliberately omitted: category/product ("kahve makinesi"), not color.
  "pembe", "gri", "kahverengi", "turuncu", "lacivert",
  "bej", "krem", "altın", "gümüş", "bronz", "bordo", "şampanya",
  "antrasit", "lila", "fuşya", "turkuaz", "jet", "şeffaf", "mat", "rose",
  // TR diacritic'siz (LLM bazen normalize ediyor)
  "kirmizi", "yesil", "sari", "altin", "gumus", "sampanya", "fusya",
  // EN
  "black", "white", "red", "blue", "green", "yellow", "purple",
  "pink", "gray", "grey", "brown", "orange", "navy", "beige",
  "gold", "silver",
];
// Substring match — "siyahı"/"siyahtaki" gibi varyantları yakalar.
// Storage pattern hem standalone hem inline (regex global ile matchAll).
const STORAGE_PATTERN = /^(\d+(?:[.,]\d+)?)\s*(GB|TB|MB)$/i;
const STORAGE_INLINE_PATTERN = /\b(\d+)\s*(GB|TB|MB)\b/gi;

function buildStoragePatterns(value: string, into: string[]): void {
  const s = value.trim();
  if (!s) return;
  const m = s.match(STORAGE_PATTERN);
  if (m) {
    const num = m[1];
    const unit = m[2].toUpperCase();
    into.push(`%${num}${unit}%`);
    into.push(`%${num} ${unit}%`);
  } else {
    into.push(`%${s.replace(/\s+/g, "")}%`);
    into.push(`%${s}%`);
  }
}

function extractVariantPatterns(
  specs: Record<string, string[] | string | number>,
  semanticKeywords: string[] = []
): {
  variant_color_patterns: string[] | null;
  variant_storage_patterns: string[] | null;
  remaining_specs: Record<string, string[] | string | number>;
} {
  const colors: string[] = [];
  const storages: string[] = [];
  const remaining: Record<string, string[] | string | number> = {};

  for (const [key, val] of Object.entries(specs)) {
    const values = Array.isArray(val) ? val : [String(val)];
    if (COLOR_KEYS.has(key)) {
      for (const v of values) {
        if (typeof v === "string" && v.trim()) {
          colors.push(`%${v.trim()}%`);
        }
      }
    } else if (STORAGE_KEYS.has(key)) {
      for (const v of values) {
        if (typeof v === "string") buildStoragePatterns(v, storages);
      }
    } else {
      remaining[key] = val;
    }
  }

  // Fallback: must_have_specs renk/storage içermiyorsa semantic_keywords'e bak
  // (LLM bazen renk kelimesini specs yerine keyword olarak atıyor)
  if (colors.length === 0 || storages.length === 0) {
    for (const kw of semanticKeywords) {
      if (typeof kw !== "string") continue;
      const lower = kw.toLowerCase().trim();
      if (!lower) continue;
      // Color: substring match — "siyahı", "kırmızı dağı" gibi varyantlar
      if (colors.length === 0) {
        for (const c of COLOR_WORDS) {
          if (lower === c || lower.includes(c)) {
            colors.push(`%${c}%`);
            break;
          }
        }
      }
      // Storage: standalone OR inline (kw="iphone 256GB" → 256GB yakalar)
      if (storages.length === 0) {
        if (STORAGE_PATTERN.test(lower)) {
          buildStoragePatterns(lower, storages);
        } else {
          const matches = [...lower.matchAll(STORAGE_INLINE_PATTERN)];
          for (const m of matches) {
            buildStoragePatterns(`${m[1]}${m[2].toUpperCase()}`, storages);
          }
        }
      }
    }
  }

  return {
    variant_color_patterns: colors.length > 0 ? Array.from(new Set(colors)) : null,
    variant_storage_patterns: storages.length > 0 ? Array.from(new Set(storages)) : null,
    remaining_specs: remaining,
  };
}

async function runSmartSearch(
  sb: SupabaseClient,
  userMessage: string,
  intent: StructuredIntent
): Promise<SmartSearchRow[]> {
  // Embedding (slow path için query embedding alıyoruz)
  const embed = await aiEmbed({ input: userMessage });
  if (embed.dimensions !== 768) {
    throw new Error(`Embedding dim mismatch: ${embed.dimensions}`);
  }

  // Variant patterns'i must_have_specs'ten ayıkla (renk/storage kolonlara).
  // semantic_keywords fallback olarak verilir — LLM bazen rengi
  // must_have_specs yerine keyword listesine atıyor.
  const {
    variant_color_patterns,
    variant_storage_patterns,
    remaining_specs,
  } = extractVariantPatterns(intent.must_have_specs, intent.semantic_keywords);

  // Dinamik match_count — filtre yoğunluğuna göre
  const filterDensity =
    (intent.brand_filter?.length ? 1 : 0) +
    (variant_color_patterns ? 1 : 0) +
    (variant_storage_patterns ? 1 : 0);
  const dynamicMatchCount = filterDensity >= 2 ? 20 : filterDensity === 1 ? 30 : 40;

  // RPC parametreleri
  const params = {
    query_embedding: embed.embedding,
    category_filter: intent.category_slug,
    specs_must: Object.keys(remaining_specs).length > 0
      ? remaining_specs
      : null,
    keyword_patterns: intent.semantic_keywords.length > 0
      ? intent.semantic_keywords
      : null,
    price_min: intent.price_range.min,
    price_max: intent.price_range.max,
    brand_filter: intent.brand_filter.length > 0
      ? intent.brand_filter
      : null,
    match_count: dynamicMatchCount,
    match_threshold: 0.3,
    variant_color_patterns,
    variant_storage_patterns,
  };

  const { data, error } = await sb.rpc("smart_search", params);

  if (error) {
    throw new Error(`smart_search RPC: ${error.message}`);
  }

  return (data ?? []) as SmartSearchRow[];
}

// ============================================================================
// Helpers
// ============================================================================

function mapProductsForResponse(products: ChatProductResult[]): ProductForResponse[] {
  return products.slice(0, 5).map((p) => ({
    title: p.title,
    slug: p.slug,
    brand: p.brand,
    min_price: p.min_price,
    listing_count: p.listing_count ?? 0,
  }));
}

function summarizeCandidateTraces(
  products: Array<
    ChatProductResult & {
      match_source?: string | null;
    }
  >,
  limit = 5
): CandidateTrace[] {
  return products.slice(0, limit).map((product) => ({
    id: product.id,
    slug: product.slug,
    title: product.title,
    brand: product.brand,
    min_price: product.min_price ?? null,
    listing_count: product.listing_count ?? 0,
    category_slug: product.category_slug ?? null,
    similarity:
      product.similarity != null && Number.isFinite(product.similarity)
        ? Number(product.similarity)
        : null,
    search_score:
      product.search_score != null && Number.isFinite(product.search_score)
        ? Number(product.search_score)
        : null,
    freshest_seen_at: product.freshest_seen_at ?? null,
    ranking_reasons: product.ranking_reasons ?? [],
    sources: product.sources ?? [],
    score_breakdown: product.score_breakdown ?? null,
  }));
}

function extractFallbackMethod(method: string): LegacySearchResult["method"] | null {
  if (method.endsWith("_vector")) return "vector";
  if (method.endsWith("_keyword")) return "keyword";
  if (method.endsWith("_failed")) return "failed";
  return null;
}
