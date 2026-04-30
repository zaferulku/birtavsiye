import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { aiEmbed } from "../../../lib/ai/aiClient";
import {
  orchestrateChat,
  type CandidateTrace,
} from "../../../lib/chatbot/chatOrchestrator";
import { parseQuery, type CategoryRef } from "../../../lib/search/queryParser";
import {
  mergeIntent,
  rebuildStateFromHistory,
  emptyState,
  type ConversationState,
  type RawIntent,
} from "../../../lib/chatbot/conversationState";
import { heuristicClassify } from "../../../lib/chatbot/intentTypes";
import { validateOrFuzzyMatchSlug } from "../../../lib/chatbot/categoryValidation";
import {
  getQueryRankingProfile,
  isStrictIntentTerm,
  retrieveRankedProducts,
  splitSearchTerms,
  type RankedProduct,
  type RetrievalRankingDiagnostics,
  type VectorCandidate,
} from "../../../lib/search/productRetrieval";

export const runtime = "nodejs";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type MatchedProduct = {
  id: string;
  title: string;
  slug: string;
  brand: string | null;
  model_family: string | null;
  category_slug: string | null;
  image_url: string | null;
  min_price: number;
  listing_count: number;
  similarity: number;
  search_score?: number | null;
  ranking_reasons?: string[] | null;
  freshest_seen_at?: string | null;
  sources?: string[] | null;
  score_breakdown?: {
    lexical: number;
    vector: number;
    offer: number;
    image: number;
    freshness: number;
    source_trust: number;
    price_penalty: number;
    total: number;
  } | null;
};

const FEEDBACK_PATTERNS = {
  wrong: [
    /^yanlış$/i,
    /^yanlis$/i,
    /^yalnış$/i,
    /^hatalı$/i,
    /^hata$/i,
    /^bu değil$/i,
    /^bu degil$/i,
    /^olmadı$/i,
    /^olmadi$/i,
    /^istediğim bu değil$/i,
    /^bunlar değil$/i,
  ],
  more: [
    /^başka$/i,
    /^baska$/i,
    /^diğer$/i,
    /^diger$/i,
    /^daha farklı$/i,
    /^farklı göster$/i,
    /^başkaları$/i,
  ],
} as const;

type FeedbackType = "wrong" | "more" | null;

type SearchResult = {
  products: MatchedProduct[];
  method: "vector" | "keyword" | "failed";
  filters: {
    category_slugs: string[] | null;
    brand: string | null;
    color: string | null;
    price_min: number | null;
    price_max: number | null;
  };
  latencyMs: number;
  diagnostics?: {
    vector_candidate_count: number;
    top_candidates: CandidateTrace[];
    ranking?: RetrievalRankingDiagnostics;
  };
};

let categoriesCache: { data: CategoryRef[]; timestamp: number } | null = null;
let categoriesPromise: Promise<CategoryRef[]> | null = null; // in-flight dedup
const CATEGORY_CACHE_TTL_MS = 5 * 60 * 1000;

// Server-side input limitleri (client koruması güvenilmez)
const MAX_MESSAGE_CHARS = 2000;
const MAX_HISTORY_ITEMS = 20;
const MAX_IMAGE_BYTES = 7_000_000; // ~5 MB binary as base64

// In-memory rate limiter — per Vercel instance bazlı.
// Production'da Upstash/Redis ile global'e taşınmalı.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(ip);
  if (!bucket || bucket.resetAt < now) {
    rateLimitBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfterSec: 0 };
  }
  if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

function detectFeedback(message: string): FeedbackType {
  const trimmed = message.trim();
  if (trimmed.length > 30) return null;

  for (const pattern of FEEDBACK_PATTERNS.wrong) {
    if (pattern.test(trimmed)) return "wrong";
  }
  for (const pattern of FEEDBACK_PATTERNS.more) {
    if (pattern.test(trimmed)) return "more";
  }
  return null;
}

async function recordFeedback(
  userId: string | null,
  feedbackType: "wrong" | "more",
  sessionContext: Record<string, unknown>,
  chatSessionId: string | null = null,
  bodyDecisionId: number | null = null
): Promise<void> {
  // Race-safe path: client passes decision_id from prior response.
  // Fallback path: session-scoped query for last chatbot-search decision.
  let decisionId: number | null = bodyDecisionId;

  if (!decisionId) {
    if (!chatSessionId) {
      console.warn("[recordFeedback] no decisionId or chatSessionId, ignored");
      return;
    }
    const { data: lastDecision } = await sb
      .from("agent_decisions")
      .select("id")
      .eq("agent_name", "chatbot-search")
      .eq("input_data->>chatSessionId", chatSessionId)
      .order("timestamp", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!lastDecision) return;
    decisionId = lastDecision.id;
  }

  await sb.from("decision_feedback").insert({
    decision_id: decisionId,
    feedback_type: feedbackType,
    source: "user",
    source_identifier: userId,
    feedback_value: sessionContext,
  });
}

async function loadCategories(): Promise<CategoryRef[]> {
  const now = Date.now();
  if (categoriesCache && now - categoriesCache.timestamp < CATEGORY_CACHE_TTL_MS) {
    return categoriesCache.data;
  }
  // In-flight dedup — eşzamanlı request'lerde tek DB call
  if (categoriesPromise) {
    return categoriesPromise;
  }

  categoriesPromise = (async () => {
    try {
      const { data, error } = await sb
        .from("categories")
        .select("id, slug, name, keywords, exclude_keywords, related_brands")
        .eq("is_active", true)
        .eq("is_leaf", true);

      if (error) {
        throw new Error(`Categories load failed: ${error.message}`);
      }

      categoriesCache = {
        data: (data ?? []) as CategoryRef[],
        timestamp: Date.now(),
      };
      return categoriesCache.data;
    } finally {
      categoriesPromise = null;
    }
  })();

  return categoriesPromise;
}

function toMatchedProduct(product: RankedProduct): MatchedProduct {
  return {
    id: product.id,
    title: product.title,
    slug: product.slug,
    brand: product.brand,
    model_family: product.model_family,
    category_slug: product.category_slug,
    image_url: product.image_url,
    min_price: product.min_price ?? 0,
    listing_count: product.listing_count ?? product.offer_count ?? 0,
    similarity: product.vector_similarity ?? 0.5,
    search_score: product.search_score ?? null,
    ranking_reasons: product.ranking_reasons ?? [],
    freshest_seen_at: product.freshest_seen_at ?? null,
    sources: product.sources ?? [],
    score_breakdown: product.score_breakdown ?? null,
  };
}

function summarizeRankedCandidates(
  products: RankedProduct[],
  limit = 5
): CandidateTrace[] {
  return products.slice(0, limit).map((product) => ({
    id: product.id,
    slug: product.slug,
    title: product.title,
    brand: product.brand,
    min_price: product.min_price ?? null,
    listing_count: product.listing_count ?? product.offer_count ?? 0,
    category_slug: product.category_slug ?? null,
    similarity:
      product.vector_similarity != null && Number.isFinite(product.vector_similarity)
        ? Number(product.vector_similarity)
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

async function buildVectorCandidates(
  userQuery: string,
  parsed: ReturnType<typeof parseQuery>
): Promise<VectorCandidate[]> {
  const embed = await aiEmbed({ input: userQuery });
  if (embed.dimensions !== 768) {
    throw new Error(`Embedding dimension ${embed.dimensions} != 768`);
  }

  const { data, error } = await sb.rpc("match_products", {
    query_embedding: embed.embedding,
    category_slugs: parsed.category_slugs,
    brand_filter: parsed.brand,
    price_min: parsed.price_min,
    price_max: parsed.price_max,
    min_similarity: 0.25,
    match_count: 10,
  });

  if (error) {
    throw new Error(`match_products RPC: ${error.message}`);
  }

  return ((data ?? []) as Array<{ id: string; similarity?: number | null }>)
    .filter((row) => Boolean(row.id))
    .slice(0, 10)
    .map((row) => ({
      id: row.id,
      similarity: Number(row.similarity ?? 0),
    }));
}

async function searchProducts(userQuery: string): Promise<SearchResult> {
  const startTime = Date.now();
  const categories = await loadCategories();
  const parsed = parseQuery(userQuery, categories);

  const filters = {
    category_slugs: parsed.category_slugs,
    brand: parsed.brand,
    color: parsed.color,
    price_min: parsed.price_min,
    price_max: parsed.price_max,
  };

  let vectorCandidates: VectorCandidate[] = [];
  try {
    vectorCandidates = await buildVectorCandidates(userQuery, parsed);
  } catch (error) {
    console.warn(
      `[searchProducts] Vector search failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  try {
    const { products: rankedProducts, diagnostics: rankingDiagnostics } =
      await retrieveRankedProducts({
      sb,
      query: userQuery,
      categorySlug: parsed.category_slugs?.[0] ?? null,
      brand: parsed.brand,
      limit: 6,
      offset: 0,
      priceMin: parsed.price_min,
      priceMax: parsed.price_max,
      vectorCandidates,
    });

    const products = rankedProducts.map(toMatchedProduct);

    return {
      products,
      method:
        products.length > 0
          ? vectorCandidates.length > 0
            ? "vector"
            : "keyword"
          : "failed",
      filters,
      latencyMs: Date.now() - startTime,
      diagnostics: {
        vector_candidate_count: vectorCandidates.length,
        top_candidates: summarizeRankedCandidates(rankedProducts),
        ranking: rankingDiagnostics,
      },
    };
  } catch (error) {
    const fallbackTerms = splitSearchTerms(userQuery);
    console.error(
      `[searchProducts] Shared retrieval failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return {
      products: [],
      method: "failed",
      filters,
      latencyMs: Date.now() - startTime,
      diagnostics: {
        vector_candidate_count: vectorCandidates.length,
        top_candidates: [],
        ranking: {
          query_profile: getQueryRankingProfile(fallbackTerms),
          term_count: fallbackTerms.length,
          strict_term_count: fallbackTerms.filter(isStrictIntentTerm).length,
          candidate_pool_size: 0,
        },
      },
    };
  }
}

function calculateProductLimit(state: ConversationState, mergeAction: string): number {
  if (mergeAction === "shortcut_keep_category" || mergeAction === "single_word_widen") return 24;
  if (mergeAction === "category_changed_reset") return 18;
  const filterCount =
    (state.brand_filter.length > 0 ? 1 : 0) +
    (state.variant_color_patterns.length > 0 ? 1 : 0) +
    (state.variant_storage_patterns.length > 0 ? 1 : 0) +
    (state.price_min != null || state.price_max != null ? 1 : 0);
  if (filterCount >= 2) return 12;
  if (filterCount === 1) return 18;
  return 24;
}

export async function POST(req: Request) {
  const startTime = Date.now();

  // Rate limit (per-IP, in-memory) — bot/DoS koruması
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Çok fazla istek. Biraz sonra tekrar dene." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  try {
    const body = await req.json();
    const rawMessage = (body?.message || "").toString().trim();
    const userId = body?.userId || null;
    const history = Array.isArray(body?.history) ? body.history.slice(-MAX_HISTORY_ITEMS) : [];
    const chatSessionId =
      typeof body?.chatSessionId === "string" ? body.chatSessionId : null;
    const decisionIdFromBody =
      typeof body?.decisionId === "number" && Number.isFinite(body.decisionId)
        ? body.decisionId
        : null;
    const intentHintCategory =
      typeof body?.intentHint?.category_slug === "string"
        ? body.intentHint.category_slug
        : null;
    const intentHintFull: { category_slug?: string | null } | null =
      body?.intentHint && typeof body.intentHint === "object" ? body.intentHint : null;
    const image =
      typeof body?.image === "string" && body.image.startsWith("data:image/")
        ? body.image
        : null;

    // Server-side guards (client cap'leri güvenilmez)
    if (rawMessage.length > MAX_MESSAGE_CHARS) {
      return NextResponse.json(
        { error: `Mesaj cok uzun (max ${MAX_MESSAGE_CHARS} karakter)` },
        { status: 400 }
      );
    }
    if (image && image.length > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "Gorsel cok buyuk (max ~5 MB)" },
        { status: 413 }
      );
    }

    const message = image
      ? rawMessage
        ? `${rawMessage}\n[Not: Kullanıcı bir ürün görseli paylaştı, görsel içeriği şu an sadece metinsel olarak işlenebiliyor.]`
        : "[Kullanıcı bir görsel paylaştı ama mesaj yazmadı - hangi kategoride ürün aradığını sor.]"
      : rawMessage;

    if (image) {
      console.log(
        `[/api/chat] image attached (${image.length} bytes, prefix=${image.slice(
          5,
          20
        )}...)`
      );
    }

    if (!message) {
      return NextResponse.json(
        { error: "message field required" },
        { status: 400 }
      );
    }

    const feedback = detectFeedback(message);
    if (feedback) {
      await recordFeedback(
        userId,
        feedback,
        { message, chatSessionId },
        chatSessionId,
        decisionIdFromBody
      );

      const reply =
        feedback === "wrong"
          ? "Anladım, sonuclar uygun olmamış. Daha spesifik bilgi verir misin? Örneğin marka, fiyat aralığı veya bir özellik söyleyebilirsin."
          : "Tamam, başka seçeneklere bakalım. Aramayı biraz değiştirir misin? Farklı bir kategori veya marka ekleyebilirsin.";

      return NextResponse.json({
        reply,
        products: [],
        meta: {
          method: "feedback",
          feedback_type: feedback,
          latency_ms: Date.now() - startTime,
        },
      });
    }

    const categories = await loadCategories();
    const parsed = parseQuery(message, categories);
    const categoryTaxonomy = categories.map((category) => category.slug);

    // ── Stateful conversation intent merge ────────────────────────────────────
    const previousState = rebuildStateFromHistory(
      (history ?? []) as Array<{ role: string; content: string; meta?: Partial<ConversationState> }>
    );

    // İlk pass: parseQuery (heuristic) — orchResult henüz yok.
    // LLM intent ile state enrich orchestrator sonrası yapılıyor (aşağıda).
    const parsedCategoryRaw = parsed.category_slugs?.[0] ?? null;
    const validParsedCategory = await validateOrFuzzyMatchSlug(parsedCategoryRaw, 1);
    const rawIntent: RawIntent = {
      intent_type: heuristicClassify(message) ?? "product_search",
      category_slug: validParsedCategory,
      brand_filter: parsed.brand ? [parsed.brand] : [],
      // State holds raw colors (e.g. "Beyaz"); the RPC layer adds %…% wildcards
      // when calling smart_search. Avoids leaking SQL LIKE syntax into state.
      variant_color_patterns: parsed.color ? [parsed.color] : [],
      variant_storage_patterns: parsed.storage ? [parsed.storage] : [],
      price_min: parsed.price_min ?? null,
      price_max: parsed.price_max ?? null,
      keywords: parsed.keywords ?? [],
    };

    const { next: conversationState, action: initialMergeAction } = mergeIntent(
      previousState,
      rawIntent,
      message,
      intentHintFull
    );
    let mergeAction = initialMergeAction;

    console.log("[chat] mergeAction=", mergeAction, {
      prev: { category: previousState.category_slug, brand: previousState.brand_filter, color: previousState.variant_color_patterns },
      next: { category: conversationState.category_slug, brand: conversationState.brand_filter, color: conversationState.variant_color_patterns },
    });

    const effectiveCategory = conversationState.category_slug || intentHintCategory || parsed.category_slugs?.[0] || null;

    // Effective brand: first entry from state, or parsed brand
    const effectiveBrand =
      conversationState.brand_filter.length > 0
        ? conversationState.brand_filter[0]
        : parsed.brand;

    // Effective color: state holds raw values now; legacy strip kept defensive
    // in case rebuildStateFromHistory rehydrates old wildcard-wrapped entries.
    const effectiveColor =
      conversationState.variant_color_patterns.length > 0
        ? conversationState.variant_color_patterns[0].replace(/%/g, "")
        : parsed.color;

    const orchResult = await orchestrateChat({
      userMessage: message,
      legacySearch: searchProducts,
      parsed: {
        category: effectiveCategory,
        brand: effectiveBrand,
        model_family: null,
        variant_storage: null,
        variant_color: effectiveColor,
        price_min: conversationState.price_min ?? parsed.price_min,
        price_max: conversationState.price_max ?? parsed.price_max,
        keywords: parsed.keywords || [],
        confidence: intentHintCategory
          ? 1.0
          : parsed.category_slugs?.length
            ? 0.8
            : 0.4,
      },
      categoryTaxonomy,
      sb,
      conversationHistory: history,
      conversationState,
      intentType: conversationState.intent_type,
    });

    // İkinci pass: LLM intent (orchResult.intent) state'i enrich eder.
    // LLM bazen yanlış slug üretir (iccekler ↔ icecek); fuzzy match düzeltir.
    const llmIntent = orchResult.intent as
      | {
          category_slug?: string | null;
          brand_filter?: string[] | null;
          price_range?: { min?: number | null; max?: number | null } | null;
        }
      | null
      | undefined;
    if (llmIntent) {
      const enrichedDims: string[] = [];
      const llmCategoryRaw = llmIntent.category_slug ?? null;
      const validLlmCategory = await validateOrFuzzyMatchSlug(llmCategoryRaw, 2);
      if (validLlmCategory && !conversationState.category_slug) {
        conversationState.category_slug = validLlmCategory;
        enrichedDims.push("category");
      }
      const llmBrands = Array.isArray(llmIntent.brand_filter)
        ? llmIntent.brand_filter.filter((b): b is string => typeof b === "string" && b.length > 0)
        : [];
      if (llmBrands.length > 0 && conversationState.brand_filter.length === 0) {
        conversationState.brand_filter = llmBrands;
        enrichedDims.push("brand");
      }
      if (conversationState.price_min == null && llmIntent.price_range?.min != null) {
        conversationState.price_min = llmIntent.price_range.min;
        enrichedDims.push("price_min");
      }
      if (conversationState.price_max == null && llmIntent.price_range?.max != null) {
        conversationState.price_max = llmIntent.price_range.max;
        enrichedDims.push("price_max");
      }
      // mergeAction'i de update et — eval expects merge_with_new_dims
      if (enrichedDims.length > 0 && mergeAction === "no_new_dims_keep") {
        conversationState.last_set_dimensions = [
          ...(conversationState.last_set_dimensions ?? []),
          ...enrichedDims,
        ];
        mergeAction = "merge_with_new_dims";
      }
    }

    const productLimit = calculateProductLimit(conversationState, mergeAction);
    const responseProducts = orchResult.products.slice(0, productLimit);

    let loggedDecisionId: number | null = null;
    try {
      const inputData = { message, userId, chatSessionId };
      const inputHash = createHash("sha256")
        .update(JSON.stringify(inputData))
        .digest("hex");

      const { data: insertedDecision } = await sb
        .from("agent_decisions")
        .insert({
          agent_name: "chatbot-search",
          input_data: inputData,
          input_hash: inputHash,
          output_data: {
            method: orchResult.method,
            path: orchResult.pathDecision.path,
            path_reason: orchResult.pathDecision.reason,
            intent: orchResult.intent
              ? {
                  category_slug: orchResult.intent.category_slug,
                  semantic_keywords: orchResult.intent.semantic_keywords,
                  confidence: orchResult.intent.confidence,
                  is_too_vague: orchResult.intent.is_too_vague,
                  is_off_topic: orchResult.intent.is_off_topic,
                  brand_filter: orchResult.intent.brand_filter ?? [],
                }
              : null,
            kb_chunks: orchResult.kbChunkCount,
            product_count: responseProducts.length,
            suggestions: orchResult.suggestions ?? [],
            reply: typeof orchResult.response === "string" ? orchResult.response.slice(0, 200) : null,
            latency_ms: orchResult.latencyMs,
            diagnostics: orchResult.diagnostics,
          },
          method: orchResult.method,
          confidence: orchResult.intent?.confidence ?? 0.5,
          latency_ms: orchResult.latencyMs,
        })
        .select("id")
        .single();

      if (insertedDecision?.id != null) {
        loggedDecisionId = Number(insertedDecision.id);
      }
    } catch (logErr) {
      console.warn(
        `[chat] agent_decisions log failed: ${
          logErr instanceof Error ? logErr.message : String(logErr)
        }`
      );
    }

    return NextResponse.json({
      reply: orchResult.response,
      products: responseProducts,
      suggestions: orchResult.suggestions ?? null,
      meta: {
        method: orchResult.method,
        decisionId: loggedDecisionId,
        latency_ms: Date.now() - startTime,
        state: {
          intent_type: conversationState.intent_type,
          category_slug: conversationState.category_slug,
          brand_filter: conversationState.brand_filter,
          variant_color_patterns: conversationState.variant_color_patterns,
          variant_storage_patterns: conversationState.variant_storage_patterns,
          price_min: conversationState.price_min,
          price_max: conversationState.price_max,
          turn_count_in_category: conversationState.turn_count_in_category,
        },
        mergeAction,
        intentType: conversationState.intent_type,
        productLimit,
      },
      // _debug field sadece dev/preview'de — prod'a internal architecture sızdırma
      ...(process.env.NODE_ENV !== "production" && {
        _debug: {
          path: orchResult.pathDecision.path,
          reason: orchResult.pathDecision.reason,
          intent: orchResult.intent,
          kb_chunks: orchResult.kbChunkCount,
          orchestrator_latency_ms: orchResult.latencyMs,
          diagnostics: orchResult.diagnostics,
        },
      }),
    });
  } catch (err) {
    console.error("[chat] POST error:", err);
    return NextResponse.json(
      {
        error: "internal error",
      },
      { status: 500 }
    );
  }
}
