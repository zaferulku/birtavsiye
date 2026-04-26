// =============================================================================
// src/app/api/chat/route.ts
// Chatbot API (v3 â RAG entegrasyonu)
//
// AKIÅ:
//   1. KullanÄ±cÄ± mesajÄ± al
//   2. Feedback detection (kÄ±sa "yanlÄ±Å", "baÅka" mesajlarÄ±)
//      â decision_feedback'e yaz, kullanÄ±cÄ±ya yardÄ±m teklif et
//   3. parseQuery + loadCategories (orchestrator iÃ§in input hazÄ±rlÄ±ÄÄ±)
//   4. orchestrateChat â fast (direct search) veya slow (RAG) path
//      - Fast: searchProducts() (mevcut, vector + keyword)
//      - Slow: KB retrieval â intent parse â smart_search â fallback
//   5. Response + agent_decisions log + UI'ya products
//
// DEPENDENCIES:
//   - aiClient (chat + embed)
//   - queryParser (lokal, hÄ±zlÄ± kategori/marka/fiyat tespiti)
//   - chatOrchestrator (RAG akÄ±ÅÄ±)
//   - Supabase (match_products + smart_search RPCs, decision_feedback)
// =============================================================================

import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { aiEmbed } from "../../../lib/ai/aiClient";
import { parseQuery, type CategoryRef } from "../../../lib/search/queryParser";
import { orchestrateChat } from "../../../lib/chatbot/chatOrchestrator";

export const runtime = "nodejs";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// =============================================================================
// Types
// =============================================================================

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
};

// =============================================================================
// Feedback detection (KORUNDU â deÄiÅmedi)
// =============================================================================

const FEEDBACK_PATTERNS = {
  wrong: [
    /^yanlÄ±Å$/i, /^yanlis$/i, /^yalnÄ±Å$/i, /^hatalÄ±$/i, /^hata$/i,
    /^bu deÄil$/i, /^bu degil$/i, /^olmadÄ±$/i, /^olmadi$/i,
    /^istediÄim bu deÄil$/i, /^bunlar deÄil$/i,
  ],
  more: [
    /^baÅka$/i, /^baska$/i, /^diÄer$/i, /^diger$/i,
    /^daha farklÄ±$/i, /^farklÄ± gÃ¶ster$/i, /^baÅkalarÄ±$/i,
  ],
};

type FeedbackType = "wrong" | "more" | null;

function detectFeedback(message: string): FeedbackType {
  const trimmed = message.trim();
  if (trimmed.length > 30) return null;

  for (const p of FEEDBACK_PATTERNS.wrong) {
    if (p.test(trimmed)) return "wrong";
  }
  for (const p of FEEDBACK_PATTERNS.more) {
    if (p.test(trimmed)) return "more";
  }
  return null;
}

async function recordFeedback(
  userId: string | null,
  feedbackType: "wrong" | "more",
  sessionContext: Record<string, unknown>,
  chatSessionId: string | null = null
): Promise<void> {
  if (!chatSessionId) {
    // Session yoksa global son karar → race condition risk (fallback davranış)
    console.warn("[recordFeedback] chatSessionId yok, global son kararı alıyor");
  }

  // Session-scoped: bu sohbetin son kararı
  let query = sb
    .from("agent_decisions")
    .select("id")
    .eq("agent_name", "chatbot-search")
    .order("timestamp", { ascending: false })
    .limit(1);

  if (chatSessionId) {
    // input_data.chatSessionId match (JSONB path)
    query = query.eq("input_data->>chatSessionId", chatSessionId);
  }

  const { data: lastDecision } = await query.maybeSingle();

  if (!lastDecision) return;

  await sb.from("decision_feedback").insert({
    decision_id: lastDecision.id,
    feedback_type: feedbackType,
    source: "user",
    source_identifier: userId,
    feedback_value: sessionContext,
  });
}

// =============================================================================
// Categories cache (KORUNDU â deÄiÅmedi)
// =============================================================================

let _categoriesCache: { data: CategoryRef[]; timestamp: number } | null = null;
const CAT_CACHE_TTL_MS = 5 * 60 * 1000;

async function loadCategories(): Promise<CategoryRef[]> {
  const now = Date.now();
  if (_categoriesCache && (now - _categoriesCache.timestamp) < CAT_CACHE_TTL_MS) {
    return _categoriesCache.data;
  }

  const { data, error } = await sb
    .from("categories")
    .select("id, slug, name, keywords, exclude_keywords, related_brands")
    .eq("is_active", true)
    .eq("is_leaf", true);

  if (error) throw new Error(`Categories load failed: ${error.message}`);

  _categoriesCache = { data: (data ?? []) as CategoryRef[], timestamp: now };
  return _categoriesCache.data;
}

// =============================================================================
// Product search (KORUNDU â orchestrator legacySearch olarak kullanÄ±r)
// =============================================================================

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
};

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

  // Vector search (Gemini embedding)
  try {
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

    if (error) throw new Error(`match_products RPC: ${error.message}`);

    if (data && data.length > 0) {
      return {
        products: (data as MatchedProduct[]).slice(0, 6),
        method: "vector",
        filters,
        latencyMs: Date.now() - startTime,
      };
    }
  } catch (e) {
    console.warn(
      `[searchProducts] Vector search failed: ${e instanceof Error ? e.message : e}`
    );
  }

  // Keyword fallback (commit 8fafa73 ile gerÃ§ek min_price hesaplÄ±yor)
  try {
    const keywords = parsed.brand
      ? [parsed.brand, ...parsed.keywords].filter(Boolean)
      : parsed.keywords.filter(Boolean);

    if (keywords.length === 0) {
      return {
        products: [],
        method: "failed",
        filters,
        latencyMs: Date.now() - startTime,
      };
    }

    const orFilter = keywords
      .map((k) => `title.ilike.%${k}%,brand.ilike.%${k}%`)
      .join(",");

    const { data: prods, error } = await sb
      .from("products")
      .select(`
        id, slug, title, brand, model_family, image_url,
        categories(slug),
        listings!inner(price, source, is_active)
      `)
      .eq("listings.is_active", true)
      .eq("is_active", true)
      .or(orFilter)
      .limit(20);

    if (error) throw new Error(`Keyword query: ${error.message}`);

    const products: MatchedProduct[] = (prods ?? [])
      .map((p: any) => {
        const activePrices = (p.listings || [])
          .filter((l: any) => l.is_active)
          .map((l: any) => Number(l.price))
          .filter((n: number) => !isNaN(n) && n > 0);

        return {
          id: p.id,
          slug: p.slug,
          title: p.title,
          brand: p.brand,
          model_family: p.model_family,
          category_slug: p.categories?.slug || null,
          image_url: p.image_url,
          min_price: activePrices.length > 0 ? Math.min(...activePrices) : 0,
          listing_count: activePrices.length,
          similarity: 0.5,
        };
      })
      .filter((p) => p.listing_count > 0)
      .slice(0, 6);

    return {
      products,
      method: products.length > 0 ? "keyword" : "failed",
      filters,
      latencyMs: Date.now() - startTime,
    };
  } catch (e) {
    console.error(
      `[searchProducts] Keyword fallback failed: ${e instanceof Error ? e.message : e}`
    );
    return {
      products: [],
      method: "failed",
      filters,
      latencyMs: Date.now() - startTime,
    };
  }
}

// =============================================================================
// POST handler â orchestrator entegrasyonu
// =============================================================================

export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const rawMessage = (body?.message || "").toString().trim();
    const userId = body?.userId || null;
    const history = Array.isArray(body?.history) ? body.history : [];
    const chatSessionId = typeof body?.chatSessionId === "string" ? body.chatSessionId : null;
    const image =
      typeof body?.image === "string" && body.image.startsWith("data:image/")
        ? body.image
        : null;

    // Görsel eklenmişse mesajı zenginleştir (vision modeli henüz yok — text hint)
    const message = image
      ? rawMessage
        ? `${rawMessage}\n[Not: Kullanıcı bir ürün görseli paylaştı, görsel içeriği şu an sadece metinsel olarak işlenebiliyor.]`
        : "[Kullanıcı bir görsel paylaştı ama mesaj yazmadı — hangi kategoride ürün aradığını sor.]"
      : rawMessage;

    if (image) {
      console.log(`[/api/chat] image attached (${image.length} bytes, prefix=${image.slice(5, 20)}...)`);
    }

    if (!message) {
      return NextResponse.json(
        { error: "message field required" },
        { status: 400 }
      );
    }

    // ----- 1. Feedback detection (mevcut akÄ±Å korunur) -----
    const feedback = detectFeedback(message);

    if (feedback) {
      await recordFeedback(userId, feedback, { message, chatSessionId }, chatSessionId);

      const reply =
        feedback === "wrong"
          ? "AnladÄ±m, sonuÃ§lar uygun olmamÄ±Å. Daha spesifik bilgi verir misin? ÃrneÄin marka, fiyat aralÄ±ÄÄ± veya bir Ã¶zellik sÃ¶yleyebilirsin."
          : "Tamam, baÅka seÃ§eneklere bakalÄ±m. AramayÄ± biraz deÄiÅtirir misin? FarklÄ± bir kategori veya marka ekleyebilirsin.";

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

    // ----- 2. Orchestrator iÃ§in input hazÄ±rlÄ±ÄÄ± -----
    const categories = await loadCategories();
    const parsed = parseQuery(message, categories);
    const categoryTaxonomy = categories.map((c) => c.slug);

    // ----- 3. Orchestrator Ã§aÄrÄ±sÄ± -----
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

    // ----- 4. agent_decisions log -----
    try {
      const inputData = { message, userId, chatSessionId };
      const inputHash = createHash("sha256")
        .update(JSON.stringify(inputData))
        .digest("hex");
      await sb.from("agent_decisions").insert({
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
        },
        method: orchResult.method,
        confidence: orchResult.intent?.confidence ?? 0.5,
        latency_ms: orchResult.latencyMs,
      });
    } catch (logErr) {
      console.warn(
        `[chat] agent_decisions log failed: ${logErr instanceof Error ? logErr.message : logErr}`
      );
    }

    // ----- 5. Response (mevcut UI shape ile uyumlu) -----
    return NextResponse.json({
      reply: orchResult.response,
      products: orchResult.products,
      suggestions: orchResult.suggestions ?? null,
      meta: {
        method: orchResult.method,
        latency_ms: Date.now() - startTime,
      },
      // Debug bilgileri (production'da kaldÄ±rÄ±labilir)
      _debug: {
        path: orchResult.pathDecision.path,
        reason: orchResult.pathDecision.reason,
        intent: orchResult.intent,
        kb_chunks: orchResult.kbChunkCount,
        orchestrator_latency_ms: orchResult.latencyMs,
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
