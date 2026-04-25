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
import { parseIntent } from "./intentParserRuntime";
import { aiEmbed } from "../ai/aiClient";
import { generateResponse, type ProductForResponse } from "./generateResponse";
import type { StructuredIntent } from "./intentParser";

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
};

export type LegacySearchResult = {
  products: any[];  // MatchedProduct from chat route
  method: "vector" | "keyword" | "failed";
  filters: Record<string, any>;
  latencyMs: number;
};

export type OrchestratorOutput = {
  response: string;
  products: any[];
  method: string;          // "fast_vector" | "fast_keyword" | "slow_hybrid" | ...
  pathDecision: PathDecision;
  intent: StructuredIntent | null;
  kbChunkCount: number;
  latencyMs: number;
};

// ============================================================================
// Main entry point
// ============================================================================

export async function orchestrateChat(
  input: OrchestratorInput
): Promise<OrchestratorOutput> {
  const startTime = Date.now();

  // 1. Path decision (fast vs slow)
  const decision = detectPath(input.userMessage, input.parsed);

  if (decision.path === "fast") {
    return await runFastPath(input, decision, startTime);
  } else {
    return await runSlowPath(input, decision, startTime);
  }
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

  return {
    response,
    products: searchResult.products,
    method: `fast_${searchResult.method}`,
    pathDecision: decision,
    intent: null,
    kbChunkCount: 0,
    latencyMs: Date.now() - startTime,
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
  // 1. Paralel: KB retrieval + query embedding (slow path optimizasyonu)
  const [knowledgeChunks] = await Promise.all([
    retrieveKnowledge(input.sb, input.userMessage, {
      topN: 5,
      minSim: 0.5,
    }),
  ]);

  // 2. Intent parser (Llama ş Groq ş Gemini Flash chain)
  const intent = await parseIntent(
    input.userMessage,
    knowledgeChunks,
    input.categoryTaxonomy,
    input.conversationHistory || []
  );

  // 3. Off-topic veya çok genel ş search yapma, direkt yanıt üret
  if (intent.is_off_topic || (intent.is_too_vague && intent.confidence < 0.3)) {
    const response = await generateResponse({
      userMessage: input.userMessage,
      intent,
      knowledgeChunks,
      products: [],
      searchMethod: "failed",
      conversationHistory: input.conversationHistory || [],
    });

    return {
      response,
      products: [],
      method: intent.is_off_topic ? "slow_off_topic" : "slow_too_vague",
      pathDecision: decision,
      intent,
      kbChunkCount: knowledgeChunks.length,
      latencyMs: Date.now() - startTime,
    };
  }

  // 4. Smart search (hybrid: vector + JSONB specs + keyword)
  let smartResults: SmartSearchRow[] = [];
  let method = "slow_hybrid";

  try {
    smartResults = await runSmartSearch(input.sb, input.userMessage, intent);
  } catch (err) {
    console.warn(
      `[orchestrator] smart_search failed: ${err instanceof Error ? err.message : err}`
    );
  }

  // 5. Smart search 0 sonuç ş mevcut searchProducts'a fallback
  let finalProducts: any[] = smartResults;
  if (smartResults.length === 0) {
    const fallback = await input.legacySearch(input.userMessage);
    finalProducts = fallback.products;
    method = `slow_fallback_${fallback.method}`;
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

  return {
    response,
    products: finalProducts,
    method,
    pathDecision: decision,
    intent,
    kbChunkCount: knowledgeChunks.length,
    latencyMs: Date.now() - startTime,
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
]);

function extractVariantPatterns(specs: Record<string, string[] | string | number>): {
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
        if (typeof v !== "string") continue;
        const s = v.trim();
        if (!s) continue;
        // Hem boşluklu hem boşluksuz pattern üret: "256 GB" ve "256GB"
        const noSpace = s.replace(/\s+/g, "");
        const withSpaceMatch = s.match(/^(\d+(?:[.,]\d+)?)\s*(GB|TB|MB)/i);
        if (withSpaceMatch) {
          const num = withSpaceMatch[1];
          const unit = withSpaceMatch[2].toUpperCase();
          storages.push(`%${num}${unit}%`);
          storages.push(`%${num} ${unit}%`);
        } else {
          storages.push(`%${noSpace}%`);
          storages.push(`%${s}%`);
        }
      }
    } else {
      remaining[key] = val;
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

  // Variant patterns'i must_have_specs'ten ayıkla (renk/storage kolonlara)
  const {
    variant_color_patterns,
    variant_storage_patterns,
    remaining_specs,
  } = extractVariantPatterns(intent.must_have_specs);

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
    match_count: 10,
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

function mapProductsForResponse(products: any[]): ProductForResponse[] {
  return products.slice(0, 5).map((p) => ({
    title: p.title,
    slug: p.slug,
    brand: p.brand,
    min_price: p.min_price,
    listing_count: p.listing_count ?? 0,
  }));
}
