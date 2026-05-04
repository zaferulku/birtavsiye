import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash, randomUUID } from "node:crypto";
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
  type ConversationState,
  type RawIntent,
} from "../../../lib/chatbot/conversationState";
import { heuristicClassify } from "../../../lib/chatbot/intentTypes";
import { classifyTurn, type TurnType } from "../../../lib/chatbot/turnClassifier";
import { validateOrFuzzyMatchSlug } from "../../../lib/chatbot/categoryValidation";
import { enhanceCategorySearchMessage } from "../../../lib/chatbot/categoryKnowledge";
import {
  getQueryRankingProfile,
  isStrictIntentTerm,
  retrieveRankedProducts,
  splitSearchTerms,
  type RankedProduct,
  type RetrievalRankingDiagnostics,
  type VectorCandidate,
} from "../../../lib/search/productRetrieval";
import {
  interpretChatQuery,
  resolveFallbackCategorySlugFromMessage,
} from "../../../lib/chatbot/queryInterpreter";

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
    family: number;
    color: number;
    vector: number;
    offer: number;
    image: number;
    freshness: number;
    source_trust: number;
    knowledge: number;
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
    storage: string | null;
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

const ACCESSORY_QUERY_PATTERN =
  /\b(kilif|kılıf|kapak|aksesuar|sarj|şarj|kablo|ekran koruyucu|boyun askisi|aski)\b/i;

function shouldPreferLeafFallbackCategory(
  rawCategorySlug: string | null | undefined,
  fallbackCategorySlug: string | null | undefined,
  query: string
): boolean {
  if (!rawCategorySlug || !fallbackCategorySlug) return false;
  if (ACCESSORY_QUERY_PATTERN.test(query)) return false;

  if (
    fallbackCategorySlug === "akilli-telefon" &&
    /(^|\/)telefon$/i.test(rawCategorySlug) &&
    !/akilli-telefon/i.test(rawCategorySlug)
  ) {
    return true;
  }

  return false;
}

function resolvePreferredCategoryCandidate(
  rawCategorySlug: string | null | undefined,
  fallbackCategorySlug: string | null | undefined,
  query: string
): string | null {
  if (shouldPreferLeafFallbackCategory(rawCategorySlug, fallbackCategorySlug, query)) {
    return fallbackCategorySlug ?? null;
  }

  return rawCategorySlug ?? fallbackCategorySlug ?? null;
}

function normalizeVariantToken(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0131/g, "i")
    .replace(/\u0130/g, "i")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesVariantFilters(
  product: RankedProduct,
  filters: { color: string | null; storage: string | null }
): boolean {
  const fragments = [
    product.title,
    product.brand,
    product.model_family,
    product.model_code,
    product.variant_color,
    product.variant_storage,
    JSON.stringify(product.specs ?? {}),
  ]
    .filter(Boolean)
    .map((value) => normalizeVariantToken(String(value)));

  const haystack = fragments.join(" ");
  const haystackCompact = haystack.replace(/\s+/g, "");

  if (filters.color) {
    const colorNeedle = normalizeVariantToken(filters.color);
    if (colorNeedle && !haystack.includes(colorNeedle)) {
      return false;
    }
  }

  if (filters.storage) {
    const storageNeedle = normalizeVariantToken(filters.storage).replace(/\s+/g, "");
    if (storageNeedle && !haystackCompact.includes(storageNeedle)) {
      return false;
    }
  }

  return true;
}

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
const BROWSER_SESSION_COOKIE = "btv_browser_sid";
const BROWSER_SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 180;

function generateBrowserSessionId(): string {
  return `bsid_${randomUUID().replace(/-/g, "")}`;
}

function normalizeBrowserSessionId(value: string | undefined): string | null {
  if (!value) return null;
  return /^bsid_[a-f0-9]{32}$/i.test(value) ? value : null;
}

function normalizeClientChatSessionId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 120);
}

function buildChatSessionScope(
  browserSessionId: string,
  chatSessionId: string | null
): string {
  return createHash("sha256")
    .update(`${browserSessionId}:${chatSessionId ?? "missing-client-session"}`)
    .digest("hex");
}

async function resolveBrowserSessionId(): Promise<string> {
  const cookieStore = await cookies();
  return (
    normalizeBrowserSessionId(cookieStore.get(BROWSER_SESSION_COOKIE)?.value) ??
    generateBrowserSessionId()
  );
}

function withBrowserSessionCookie(
  response: NextResponse,
  browserSessionId: string
): NextResponse {
  response.cookies.set({
    name: BROWSER_SESSION_COOKIE,
    value: browserSessionId,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: BROWSER_SESSION_COOKIE_MAX_AGE,
    priority: "high",
  });
  return response;
}

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
  chatSessionScope: string | null = null,
  bodyDecisionId: number | null = null
): Promise<void> {
  // Race-safe path: client passes decision_id from prior response.
  // Fallback path: session-scoped query for last chatbot-search decision.
  let decisionId: number | null = bodyDecisionId;

  if (decisionId) {
    let validationQuery = sb
      .from("agent_decisions")
      .select("id")
      .eq("id", decisionId)
      .eq("agent_name", "chatbot-search");

    if (chatSessionScope) {
      validationQuery = validationQuery.eq(
        "input_data->>chatSessionScope",
        chatSessionScope
      );
    } else if (chatSessionId) {
      validationQuery = validationQuery.eq(
        "input_data->>chatSessionId",
        chatSessionId
      );
    }

    const { data: validatedDecision } = await validationQuery.maybeSingle();
    if (!validatedDecision) {
      decisionId = null;
    }
  }

  if (!decisionId) {
    if (!chatSessionScope && !chatSessionId) {
      console.warn("[recordFeedback] no decisionId or session scope, ignored");
      return;
    }
    let query = sb
      .from("agent_decisions")
      .select("id")
      .eq("agent_name", "chatbot-search");

    query = chatSessionScope
      ? query.eq("input_data->>chatSessionScope", chatSessionScope)
      : query.eq("input_data->>chatSessionId", chatSessionId);

    const { data: lastDecision } = await query
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
  parsed: ReturnType<typeof parseQuery>,
  resolvedCategorySlugs: string[] | null
): Promise<VectorCandidate[]> {
  const embed = await aiEmbed({ input: userQuery });
  if (embed.dimensions !== 768) {
    throw new Error(`Embedding dimension ${embed.dimensions} != 768`);
  }

  const { data, error } = await sb.rpc("match_products", {
    query_embedding: embed.embedding,
    category_slugs: resolvedCategorySlugs,
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

async function searchProducts(
  userQuery: string,
  options?: { categorySlug?: string | null }
): Promise<SearchResult> {
  const startTime = Date.now();
  const categories = await loadCategories();
  const parsed = parseQuery(userQuery, categories);
  const fallbackCategorySlug = resolveFallbackCategorySlugFromMessage(userQuery);
  const overrideCategorySlug = options?.categorySlug ?? null;
  const categoryCandidates = overrideCategorySlug
    ? [overrideCategorySlug]
    : parsed.category_slugs?.length
    ? [
        resolvePreferredCategoryCandidate(
          parsed.category_slugs[0],
          fallbackCategorySlug,
          userQuery
        ),
      ].filter((slug): slug is string => Boolean(slug))
    : fallbackCategorySlug
      ? [fallbackCategorySlug]
      : [];
  const resolvedCategorySlugs = categoryCandidates.length
    ? (
        await Promise.all(
          categoryCandidates.map((slug) => validateOrFuzzyMatchSlug(slug, 1))
        )
      ).filter((slug): slug is string => Boolean(slug))
    : null;

  const filters = {
    category_slugs: resolvedCategorySlugs,
    brand: parsed.brand,
    color: parsed.color,
    storage: parsed.storage ?? null,
    price_min: parsed.price_min,
    price_max: parsed.price_max,
  };

  let vectorCandidates: VectorCandidate[] = [];
  try {
    vectorCandidates = await buildVectorCandidates(
      userQuery,
      parsed,
      resolvedCategorySlugs
    );
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
      categorySlug: resolvedCategorySlugs?.[0] ?? null,
      brand: parsed.brand,
      limit: 6,
      offset: 0,
      priceMin: parsed.price_min,
      priceMax: parsed.price_max,
      vectorCandidates,
    });

    const variantFilteredProducts =
      parsed.color || parsed.storage
        ? rankedProducts.filter((product) =>
            matchesVariantFilters(product, {
              color: parsed.color,
              storage: parsed.storage ?? null,
            })
          )
        : rankedProducts;
    const products = variantFilteredProducts.map(toMatchedProduct);

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
        top_candidates: summarizeRankedCandidates(variantFilteredProducts),
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
  const browserSessionId = await resolveBrowserSessionId();
  const respondJson = (
    payload: Parameters<typeof NextResponse.json>[0],
    init?: Parameters<typeof NextResponse.json>[1]
  ) => withBrowserSessionCookie(NextResponse.json(payload, init), browserSessionId);

  // Rate limit (per-IP, in-memory) — bot/DoS koruması
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    return respondJson(
      { error: "Çok fazla istek. Biraz sonra tekrar dene." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  try {
    const body = await req.json();
    const rawMessage = (body?.message || "").toString().trim();
    const userId = body?.userId || null;
    const history = Array.isArray(body?.history) ? body.history.slice(-MAX_HISTORY_ITEMS) : [];
    const chatSessionId = normalizeClientChatSessionId(body?.chatSessionId);
    const chatSessionScope = buildChatSessionScope(
      browserSessionId,
      chatSessionId
    );
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
      return respondJson(
        { error: `Mesaj cok uzun (max ${MAX_MESSAGE_CHARS} karakter)` },
        { status: 400 }
      );
    }
    if (image && image.length > MAX_IMAGE_BYTES) {
      return respondJson(
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
      return respondJson(
        { error: "message field required" },
        { status: 400 }
      );
    }

    const feedback = detectFeedback(message);
    if (feedback) {
      await recordFeedback(
        userId,
        feedback,
        { message, chatSessionId, chatSessionScope },
        chatSessionId,
        chatSessionScope,
        decisionIdFromBody
      );

      const reply =
        feedback === "wrong"
          ? "Anladım, sonuclar uygun olmamış. Daha spesifik bilgi verir misin? Örneğin marka, fiyat aralığı veya bir özellik söyleyebilirsin."
          : "Tamam, başka seçeneklere bakalım. Aramayı biraz değiştirir misin? Farklı bir kategori veya marka ekleyebilirsin.";

      return respondJson({
        reply,
        products: [],
        meta: {
          method: "feedback",
          feedback_type: feedback,
          latency_ms: Date.now() - startTime,
        },
      });
    }

    const previousState = rebuildStateFromHistory(
      (history ?? []) as Array<{ role: string; content: string; meta?: Partial<ConversationState> }>
    );

    const categories = await loadCategories();
    const queryInterpretation = interpretChatQuery({
      message,
      categories,
      previousState,
    });
    const parsed = parseQuery(queryInterpretation.searchMessage, categories);
    const categoryTaxonomy = categories.map((category) => category.slug);

    // ── Stateful conversation intent merge ────────────────────────────────────

    // İlk pass: parseQuery (heuristic) — orchResult henüz yok.
    // LLM intent ile state enrich orchestrator sonrası yapılıyor (aşağıda).
    const fallbackCategorySlug =
      queryInterpretation.fallbackCategorySlug ??
      resolveFallbackCategorySlugFromMessage(message);
    const parsedCategoryRaw = queryInterpretation.usedContextCategory
      ? previousState.category_slug ?? null
      : resolvePreferredCategoryCandidate(
      parsed.category_slugs?.[0] ?? null,
      fallbackCategorySlug,
      queryInterpretation.searchMessage || message
    );
    // P6.11: Sticky context'i tie-break için geçir. "espresso olsun" gibi
    // follow-up'larda LLM bazen "kahve" gibi kısa bir slug üretir; leaf-suffix
    // birden çok match'lendiğinde (supermarket/kahve vs kucuk-ev-aletleri/
    // mutfak/kahve-makinesi) önceki state'le ortak prefix'i en uzun olan kazanır.
    const validParsedCategory = await validateOrFuzzyMatchSlug(parsedCategoryRaw, 1, {
      stickyContextSlug: previousState?.category_slug ?? null,
    });
    // P6.18: validateOrFuzzyMatchSlug resolve edemediği FLAT slug'ları state'e
    // yazma. Eski davranış raw fallback yapıyordu, eval2 dialog 4'te
    // 'erkek-giyim-ust' (flat compound) state'te kaldı — search runtime resolve
    // etti ama state corrupt. Yeni davranış:
    // - validParsed varsa kullan
    // - yoksa raw full-path ise (içinde '/') kullan (geriye dönük uyum)
    // - yoksa previousState'e fallback (null da olabilir)
    const resilientParsedCategory =
      validParsedCategory ??
      (parsedCategoryRaw && parsedCategoryRaw.includes("/")
        ? parsedCategoryRaw
        : previousState?.category_slug ?? null);

    // Feature dimension extraction (basit regex-based)
    const features: string[] = [];
    const msgLower = message.toLowerCase();
    if (/(enerji tasarruflu|a\+\+|a\+\+\+|enerji sınıfı a)/i.test(msgLower)) features.push("enerji_tasarruflu");
    if (/(su (geçirmez|korumas)|ip6[78])/i.test(msgLower)) features.push("su_korumasi");
    if (/(gürültü (önleyici|engel)|noise (cancelling|cancel)|anc)/i.test(msgLower)) features.push("anc");
    if (/(qled|oled|hdr|4k|8k|smart tv)/i.test(msgLower)) features.push("smart_display");
    if (/(şarj hızlı|hızlı şarj|fast charg|65w|100w)/i.test(msgLower)) features.push("hizli_sarj");
    if (/(kablosuz|wireless)/i.test(msgLower)) features.push("kablosuz");
    if (/(spor(luk|ty)?|aktivewear|active ?wear)/i.test(msgLower)) features.push("spor");
    if (/(slim fit|skinny|regular fit)/i.test(msgLower)) features.push("slim_fit");
    if (/\boyun|gaming|fps\b/i.test(msgLower)) features.push("oyun");
    if (/\bofis|is icin|iş için\b/i.test(msgLower)) features.push("ofis");
    if (/\byazilim|yazılım|gelistirme|geliştirme|kodlama\b/i.test(msgLower)) features.push("yazilim");
    if (/\bgunluk|günlük|casual\b/i.test(msgLower)) features.push("gunluk");
    if (/\bespresso\b/i.test(msgLower)) features.push("espresso");
    if (/\bfiltre\b/i.test(msgLower)) features.push("filtre");
    if (/\bkapsul|kapsül|kapsullu|kapsüllü\b/i.test(msgLower)) features.push("kapsul");

    // Installment (taksit) ay sayısı extraction
    let installmentMin: number | null = null;
    const installMatch = message.match(/(\d{1,2})\s*(ay\s*taksit|taksit|ay\s*vade|vade)/i);
    if (installMatch) installmentMin = parseInt(installMatch[1], 10);
    if (!installMatch && /(taksit imkân|taksit olsun|taksitli)/i.test(message)) installmentMin = 12;

    // Rating filtresi (yüksek/iyi puanlı)
    let minAvgRating: number | null = null;
    if (/(?:iyi|y[üu]ksek|en iyi)\s*puanl[ıi]|y[üu]ksek\s*rated|en iyi rated/i.test(message)) {
      minAvgRating = 4.0;
    }

    // Sort tercihi (popülerlik / puan / fiyat)
    let sortBy: string | null = null;
    if (/en\s*pop[üu]ler|en\s*çok\s*tercih|en\s*çok\s*satan/i.test(message)) sortBy = "best_value";
    else if (/en\s*y[üu]ksek\s*puan|en\s*iyi\s*rated/i.test(message)) sortBy = "rating";

    const rawIntent: RawIntent = {
      intent_type: heuristicClassify(message) ?? "product_search",
      category_slug: resilientParsedCategory,
      brand_filter: parsed.brand ? [parsed.brand] : [],
      // State holds raw colors (e.g. "Beyaz"); the RPC layer adds %…% wildcards
      // when calling smart_search. Avoids leaking SQL LIKE syntax into state.
      variant_color_patterns: parsed.color ? [parsed.color] : [],
      variant_storage_patterns: parsed.storage ? [parsed.storage] : [],
      price_min: parsed.price_min ?? null,
      price_max: parsed.price_max ?? null,
      features: features.length > 0 ? features : undefined,
      installment_months_min: installmentMin,
      min_avg_rating: minAvgRating,
      sort_by: sortBy,
      keywords: parsed.keywords ?? [],
    };

    const { next: conversationState, action: initialMergeAction } = mergeIntent(
      previousState,
      rawIntent,
      message,
      intentHintFull
    );
    let mergeAction = initialMergeAction;
    let turnType: TurnType = classifyTurn(mergeAction, previousState);

    console.log("[chat] mergeAction=", mergeAction, "turnType=", turnType, {
      prev: { category: previousState.category_slug, brand: previousState.brand_filter, color: previousState.variant_color_patterns },
      next: { category: conversationState.category_slug, brand: conversationState.brand_filter, color: conversationState.variant_color_patterns },
    });

    const effectiveCategory =
      conversationState.category_slug ||
      intentHintCategory ||
      parsed.category_slugs?.[0] ||
      fallbackCategorySlug ||
      null;
    const categoryAwareSearchMessage = enhanceCategorySearchMessage({
      categorySlug: effectiveCategory,
      searchMessage: queryInterpretation.searchMessage,
      originalMessage: message,
    });
    const shouldLockCategoryToState =
      Boolean(previousState.category_slug) &&
      Boolean(conversationState.category_slug) &&
      previousState.category_slug === conversationState.category_slug &&
      mergeAction !== "category_changed_reset" &&
      !queryInterpretation.accessoryHint &&
      (
        queryInterpretation.usedContextCategory ||
        queryInterpretation.shortQueryKind === "contextual_refine" ||
        queryInterpretation.shortQueryKind === "sort_only" ||
        mergeAction === "single_word_widen" ||
        mergeAction === "shortcut_keep_category" ||
        mergeAction === "no_new_dims_keep" ||
        mergeAction === "merge_with_new_dims"
      );
    const lockCategorySlug = shouldLockCategoryToState
      ? conversationState.category_slug
      : null;

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
      interpretedMessage: categoryAwareSearchMessage,
      lockCategorySlug,
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
    const suppressBroadeningEnrichment =
      mergeAction === "shortcut_keep_category" ||
      mergeAction === "single_word_widen" ||
      mergeAction === "category_changed_reset";
    if (llmIntent) {
      const enrichedDims: string[] = [];
      const llmCategoryRaw = llmIntent.category_slug ?? null;
      // P6.11: LLM intent slug'ında da sticky tie-break uygula.
      const validLlmCategory = await validateOrFuzzyMatchSlug(llmCategoryRaw, 2, {
        stickyContextSlug: previousState?.category_slug ?? null,
      });
      if (validLlmCategory && !conversationState.category_slug) {
        conversationState.category_slug = validLlmCategory;
        enrichedDims.push("category");
      }
      const llmBrands = Array.isArray(llmIntent.brand_filter)
        ? llmIntent.brand_filter.filter((b): b is string => typeof b === "string" && b.length > 0)
        : [];
      if (
        !suppressBroadeningEnrichment &&
        llmBrands.length > 0 &&
        conversationState.brand_filter.length === 0
      ) {
        conversationState.brand_filter = llmBrands;
        enrichedDims.push("brand");
      }
      // LLM bazen kullanıcı sadece "max 400" dediğinde min: 0 hallüsünasyonu yapar.
      // 0 anlamlı bir fiyat filtresi değil (negatif fiyat yok); sadece > 0 değerleri kabul et.
      if (
        !suppressBroadeningEnrichment &&
        conversationState.price_min == null &&
        typeof llmIntent.price_range?.min === "number" &&
        llmIntent.price_range.min > 0
      ) {
        conversationState.price_min = llmIntent.price_range.min;
        enrichedDims.push("price_min");
      }
      if (
        !suppressBroadeningEnrichment &&
        conversationState.price_max == null &&
        typeof llmIntent.price_range?.max === "number" &&
        llmIntent.price_range.max > 0
      ) {
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
        // mergeAction değişti → turn_type'ı da yeniden sınıflandır
        turnType = classifyTurn(mergeAction, previousState);
      }
    }

    const productLimit = calculateProductLimit(conversationState, mergeAction);
    const responseProducts = orchResult.products.slice(0, productLimit);

    let loggedDecisionId: number | null = null;
    try {
      const inputData = {
        message,
        userId,
        chatSessionId,
        chatSessionScope,
        browserSessionBound: true,
      };
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
            query_interpretation: {
              corrected_message: queryInterpretation.correctedMessage,
              search_message: categoryAwareSearchMessage,
              corrections: queryInterpretation.corrections,
              short_query_kind: queryInterpretation.shortQueryKind,
              used_context_category: queryInterpretation.usedContextCategory,
              used_context_brand: queryInterpretation.usedContextBrand,
              accessory_hint: queryInterpretation.accessoryHint,
              category_locked_to_state: lockCategorySlug,
            },
            turn_type: turnType,
            merge_action: mergeAction,
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

    return respondJson({
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
          features: conversationState.features ?? [],
          installment_months_min: conversationState.installment_months_min ?? null,
          turn_count_in_category: conversationState.turn_count_in_category,
        },
        mergeAction,
        intentType: conversationState.intent_type,
        productLimit,
        queryInterpretation: {
          corrected_message: queryInterpretation.correctedMessage,
          search_message: categoryAwareSearchMessage,
          corrections: queryInterpretation.corrections,
          short_query_kind: queryInterpretation.shortQueryKind,
          used_context_category: queryInterpretation.usedContextCategory,
          used_context_brand: queryInterpretation.usedContextBrand,
          accessory_hint: queryInterpretation.accessoryHint,
          category_locked_to_state: lockCategorySlug,
        },
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
          query_interpretation: queryInterpretation,
          category_locked_to_state: lockCategorySlug,
        },
      }),
    });
  } catch (err) {
    console.error("[chat] POST error:", err);
    return respondJson(
      {
        error: "internal error",
      },
      { status: 500 }
    );
  }
}
