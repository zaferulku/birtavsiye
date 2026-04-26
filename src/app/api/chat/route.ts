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
  retrieveRankedProducts,
  type RankedProduct,
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
  };
};

let categoriesCache: { data: CategoryRef[]; timestamp: number } | null = null;
const CATEGORY_CACHE_TTL_MS = 5 * 60 * 1000;

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
    timestamp: now,
  };

  return categoriesCache.data;
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
    const { products: rankedProducts } = await retrieveRankedProducts({
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
      },
    };
  } catch (error) {
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
    };
  }
}

export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const rawMessage = (body?.message || "").toString().trim();
    const userId = body?.userId || null;
    const history = Array.isArray(body?.history) ? body.history : [];
    const chatSessionId =
      typeof body?.chatSessionId === "string" ? body.chatSessionId : null;
    const decisionIdFromBody =
      typeof body?.decisionId === "number" && Number.isFinite(body.decisionId)
        ? body.decisionId
        : null;
    const image =
      typeof body?.image === "string" && body.image.startsWith("data:image/")
        ? body.image
        : null;

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

    const orchResult = await orchestrateChat({
      userMessage: message,
      legacySearch: searchProducts,
      parsed: {
        category: parsed.category_slugs?.[0] || null,
        brand: parsed.brand,
        model_family: null,
        variant_storage: null,
        variant_color: parsed.color,
        price_min: parsed.price_min,
        price_max: parsed.price_max,
        keywords: parsed.keywords || [],
        confidence: parsed.category_slugs?.length ? 0.8 : 0.4,
      },
      categoryTaxonomy,
      sb,
      conversationHistory: history,
    });

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
                }
              : null,
            kb_chunks: orchResult.kbChunkCount,
            product_count: orchResult.products.length,
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
      products: orchResult.products,
      suggestions: orchResult.suggestions ?? null,
      meta: {
        method: orchResult.method,
        decisionId: loggedDecisionId,
        latency_ms: Date.now() - startTime,
      },
      _debug: {
        path: orchResult.pathDecision.path,
        reason: orchResult.pathDecision.reason,
        intent: orchResult.intent,
        kb_chunks: orchResult.kbChunkCount,
        orchestrator_latency_ms: orchResult.latencyMs,
        diagnostics: orchResult.diagnostics,
      },
    });
  } catch (err) {
    console.error("[chat] POST error:", err);
    return NextResponse.json(
      {
        error: "internal error",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
