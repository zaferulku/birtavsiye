// =============================================================================
// src/app/api/chat/route.ts
// Chatbot API (v2)
//
// AKIŞ:
//   1. Kullanıcı mesajı al
//   2. Feedback detection: "yanlış", "başka", "bu değil" gibi kısa mesajlar
//      → decision_feedback'e yaz, user'a yardım teklif et
//   3. Query parser (LOKAL, hızlı):
//      "beyaz telefon" → {category: akilli-telefon, color: Beyaz}
//      "1000 tl altı laptop" → {category: laptop, price_max: 1000}
//   4. Parse sonucuyla match_products RPC (kategori-aware)
//      → Gemini embedding (768-dim) + filters
//   5. Gemini fail → keyword fallback (ama yine kategori filtreli)
//   6. NVIDIA Llama chat ile yanıt üret
//   7. agent_decisions'a log, products UI kartları için döndür
//
// DEPENDENCIES:
//   - aiClient (chat + embed)
//   - queryParser (lokal)
//   - Supabase (match_products RPC, decision_feedback)
// =============================================================================

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { aiChat, aiEmbed, type ChatMessage } from "../../../lib/ai/aiClient";
import { parseQuery, type CategoryRef } from "../../../lib/search/queryParser";

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
// Feedback detection
// =============================================================================

const FEEDBACK_PATTERNS = {
  wrong: [
    /^yanlış$/i, /^yanlis$/i, /^yalnış$/i, /^hatalı$/i, /^hata$/i,
    /^bu değil$/i, /^bu degil$/i, /^olmadı$/i, /^olmadi$/i,
    /^istediğim bu değil$/i, /^bunlar değil$/i,
  ],
  more: [
    /^başka$/i, /^baska$/i, /^diğer$/i, /^diger$/i,
    /^daha farklı$/i, /^farklı göster$/i, /^başkaları$/i,
  ],
};

type FeedbackType = "wrong" | "more" | null;

function detectFeedback(message: string): FeedbackType {
  const trimmed = message.trim();
  if (trimmed.length > 30) return null; // Uzun mesaj feedback değil

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
  sessionContext: Record<string, unknown>
): Promise<void> {
  // Bu session'daki son "product_search" kararını bul
  const { data: lastDecision } = await sb
    .from("agent_decisions")
    .select("id")
    .eq("agent_name", "chatbot-search")
    .order("timestamp", { ascending: false })
    .limit(1)
    .maybeSingle();

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
// Kategorileri cache'le (her istekte yüklenmesin)
// =============================================================================

let _categoriesCache: { data: CategoryRef[]; timestamp: number } | null = null;
const CAT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 dakika

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
// Product search — 2 katmanlı
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

  // 1. LOKAL PARSER — LLM'siz, hızlı
  const parsed = parseQuery(userQuery, categories);

  const filters = {
    category_slugs: parsed.category_slugs,
    brand: parsed.brand,
    color: parsed.color,
    price_min: parsed.price_min,
    price_max: parsed.price_max,
  };

  // 2. VECTOR SEARCH (Gemini embedding)
  try {
    const embed = await aiEmbed({ input: userQuery });

    if (embed.dimensions !== 768) {
      throw new Error(`Embedding dimension ${embed.dimensions} != 768 — incompatible with products.embedding`);
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
      const filtered = data as MatchedProduct[];
      // TODO: parsed.color varsa post-filter (RPC variant_color parametresi alacak şekilde genişletilirse)

      return {
        products: filtered.slice(0, 6),
        method: "vector",
        filters,
        latencyMs: Date.now() - startTime,
      };
    }
  } catch (e) {
    console.warn("Vector search failed:", e instanceof Error ? e.message : e);
    // Keyword fallback'e düş
  }

  // 3. KEYWORD FALLBACK — ama kategori filtreli
  const keywords = parsed.keywords.length > 0 ? parsed.keywords : normalizeWords(userQuery);

  if (keywords.length === 0) {
    return {
      products: [],
      method: "failed",
      filters,
      latencyMs: Date.now() - startTime,
    };
  }

  // Kategori filtreli ILIKE araması — listings JOIN ile gerçek fiyat
  let query = sb
    .from("products")
    .select(`
      id, title, slug, brand, model_family, image_url,
      category:categories!inner(slug),
      listings!inner(price, is_active)
    `)
    .eq("is_active", true);

  // Kategori filtresi
  if (parsed.category_slugs && parsed.category_slugs.length > 0) {
    query = query.in("category.slug", parsed.category_slugs);
  }

  // Brand filtresi
  if (parsed.brand) {
    query = query.ilike("brand", parsed.brand);
  }

  // Keyword search — OR clause
  const orClauses = keywords.map(w => `title.ilike.%${w}%`).join(",");
  query = query.or(orClauses).limit(30);

  const { data: kwData, error: kwError } = await query;
  if (kwError) {
    console.error("Keyword search error:", kwError.message);
    return {
      products: [],
      method: "failed",
      filters,
      latencyMs: Date.now() - startTime,
    };
  }

  // Rank by keyword match count — gerçek fiyat listings JOIN'den
  const ranked = (kwData ?? [])
    .map(p => {
      const t = (p.title ?? "").toLowerCase();
      const hits = keywords.filter(w => t.includes(w)).length;
      const listings = (Array.isArray(p.listings) ? p.listings : []) as Array<{ price: number | null; is_active: boolean }>;
      const activePrices = listings
        .filter(l => l.is_active && typeof l.price === "number" && l.price > 0)
        .map(l => l.price as number);
      const minPrice = activePrices.length > 0 ? Math.min(...activePrices) : 0;
      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        brand: p.brand,
        model_family: p.model_family,
        category_slug: (Array.isArray(p.category) ? p.category[0]?.slug : (p.category as { slug: string } | null)?.slug) ?? null,
        image_url: p.image_url,
        min_price: minPrice,
        listing_count: activePrices.length,
        similarity: hits / keywords.length,
      };
    })
    .filter(p => p.similarity > 0 && p.listing_count > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 6);

  return {
    products: ranked,
    method: "keyword",
    filters,
    latencyMs: Date.now() - startTime,
  };
}

function normalizeWords(query: string): string[] {
  const STOPWORDS = new Set([
    "bir","bu","şu","ne","nasıl","nasil","neden","niçin","nedir","midir","mi","mu","mı","mü",
    "en","ucuz","pahalı","pahali","uygun","iyi","kötü","kotu","güzel","guzel",
    "hangi","hangisi","kaç","kac","kadar","için","icin","ile","gibi","olan",
    "olabilir","olur","oldu","var","yok","tl","lira","adet","yeni","eski","altı","alti",
  ]);

  return query
    .toLowerCase()
    .replace(/[^\wşüıçğöâî\s]/gi, " ")
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOPWORDS.has(w))
    .slice(0, 5);
}

// =============================================================================
// Sistem prompt
// =============================================================================

const SYSTEM_PROMPT_BASE = `Sen birtavsiye.net'in yapay zeka ürün danışmanısın.

Görevin:
- Kullanıcının tarifi ile doğru ürünü bulmasına yardım etmek
- Türk e-ticaret ürünleri (telefon, laptop, tv, beyaz eşya, giyim, kozmetik, anne-bebek, spor, oto, kitap vb.) hakkında bilgi vermek
- Kategori yönlendirmesi, fiyat karşılaştırması, özellik karşılaştırması yapmak
- Kısa, net, Türkçe cevaplar (maks 4-5 cümle)

Kurallar:
- "Bulunan Ürünler" listesinden seç, dışarıdan öneri yapma
- URL paylaşma, UI kartları gösterecek
- 1-3 ürün öner, neden uygun olduğunu açıkla
- Liste boşsa: daha spesifik tarif iste (marka, bütçe, renk, kullanım)
- Kesin fiyat verme — "yaklaşık X TL'den başlıyor" formatı
- Samimi, reklam dili olmadan

Muğlak sorguda netleştirme sor:
- "spor ayakkabı" → "Koşu mu yürüyüş mü? Bütçe?"
- "iyi bir laptop" → "Oyun mu iş mi? Bütçe?"
- "anneme hediye" → "Yaş, ilgi alanı, bütçe?"`;

// =============================================================================
// POST handler
// =============================================================================

export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const messages = body.messages as ChatMessage[] | undefined;
    const userId = (body.userId as string | null) ?? null;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "messages required" }, { status: 400 });
    }

    const lastUser = [...messages].reverse().find(m => m.role === "user");
    if (!lastUser?.content) {
      return NextResponse.json({ error: "no user message" }, { status: 400 });
    }

    const userMessage = lastUser.content.trim();

    // ---------- FEEDBACK HANDLING ----------
    const feedbackType = detectFeedback(userMessage);
    if (feedbackType === "wrong") {
      await recordFeedback(userId, "wrong", { query: userMessage, history: messages.length });
      return NextResponse.json({
        reply: "Özür dilerim, aradığınızı bulamadım. Daha net yardımcı olabilmem için şunlardan hangisi? Marka, bütçe, renk, kullanım amacı?",
        products: [],
        feedback_recorded: "wrong",
      });
    }
    if (feedbackType === "more") {
      await recordFeedback(userId, "more", { query: userMessage });
      return NextResponse.json({
        reply: "Başka öneriler için biraz daha detay verir misiniz? Hangi özellik önemli sizin için?",
        products: [],
        feedback_recorded: "more",
      });
    }

    // ---------- PRODUCT SEARCH ----------
    const searchResult = await searchProducts(userMessage);

    // Log search decision (fire-and-forget)
    sb.from("agent_decisions").insert({
      agent_name: "chatbot-search",
      input_hash: hashQuery(userMessage),
      input_data: { query: userMessage, userId },
      output_data: {
        method: searchResult.method,
        filters: searchResult.filters,
        product_count: searchResult.products.length,
        product_ids: searchResult.products.map(p => p.id),
      },
      confidence: searchResult.products.length > 0 ? 0.8 : 0.2,
      method: searchResult.method,
      latency_ms: searchResult.latencyMs,
    }).then(() => {}, () => {});

    // ---------- BUILD SYSTEM PROMPT WITH PRODUCTS ----------
    const productContext = searchResult.products.length > 0
      ? `\n\nBulunan Ürünler (${searchResult.method} arama, ${searchResult.products.length} sonuç):\n` +
        searchResult.products.map((p, i) =>
          `${i + 1}. ${p.brand ? p.brand + " " : ""}${p.model_family ?? p.title} — ` +
          `slug:${p.slug}` +
          (p.min_price > 0 ? ` (${p.min_price} TL'den, ${p.listing_count} mağaza)` : "") +
          (p.similarity ? ` [${p.similarity.toFixed(2)}]` : "")
        ).join("\n")
      : `\n\n(Eşleşen ürün bulunamadı — kullanıcıdan daha fazla detay iste: marka, bütçe, renk, kullanım amacı.)`;

    const systemPrompt = SYSTEM_PROMPT_BASE + productContext;

    // Last 20 messages (system hariç)
    const trimmed = messages.slice(-20);
    const fullMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...trimmed,
    ];

    // ---------- CHAT COMPLETION ----------
    const chatResult = await aiChat({
      messages: fullMessages,
      temperature: 0.3,
      maxTokens: 512,
    });

    const totalLatency = Date.now() - startTime;

    return NextResponse.json({
      reply: chatResult.content,
      products: searchResult.products.map(p => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        brand: p.brand,
        model_family: p.model_family,
        image_url: p.image_url,
        min_price: p.min_price,
        listing_count: p.listing_count,
      })),
      meta: {
        search_method: searchResult.method,
        filters: searchResult.filters,
        chat_provider: chatResult.provider,
        total_latency_ms: totalLatency,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "chat failed";
    console.error("Chat error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// =============================================================================
// Utility
// =============================================================================

function hashQuery(q: string): string {
  // Simple hash, not cryptographic
  let h = 0;
  for (let i = 0; i < q.length; i++) {
    h = (h * 31 + q.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}
