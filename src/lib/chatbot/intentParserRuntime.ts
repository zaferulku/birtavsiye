/**
 * Intent Parser Runtime
 *
 * Kullanıcı mesajı + KB chunks ş yapılandırılmış niyet (JSON)
 *
 * Model öncelik sırası:
 *   1. NVIDIA NIM Llama 3.3 70B (primary ş şu an chatbot için kullanılıyor)
 *   2. Groq Llama 3.3 70B (fallback ş NVIDIA rate limit / error)
 *   3. Gemini Flash (son çare ş ilk ikisi başarısız)
 *
 * Bu dosya mevcut src/lib/ai/aiClient.ts'i kullanır (import path uyumlu olmalı).
 *
 * Cache: 5 dakika (aynı mesaj ş aynı niyet). Bu gereksiz LLM çşısı önler.
 */

import {
  KnowledgeChunk,
  StructuredIntent,
  INTENT_PARSER_SYSTEM_PROMPT,
  buildIntentParserPrompt,
  parseIntentResponse,
} from "./intentParser";

// ============================================================================
// Config
// ============================================================================

const INTENT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 dakika
const INTENT_CACHE_MAX = 500;
const REQUEST_TIMEOUT_MS = 10_000; // 10 saniye (niyet parser hızlı olmalı)

// ============================================================================
// Cache (in-memory LRU)
// ============================================================================

type CacheEntry = {
  intent: StructuredIntent;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

function cacheKey(message: string, chunkHash: string): string {
  return `${message.slice(0, 200)}::${chunkHash}`;
}

function cacheGet(key: string): StructuredIntent | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  // LRU: re-insert to mark as recently used
  cache.delete(key);
  cache.set(key, entry);
  return entry.intent;
}

function cacheSet(key: string, intent: StructuredIntent): void {
  if (cache.size >= INTENT_CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, {
    intent,
    expiresAt: Date.now() + INTENT_CACHE_TTL_MS,
  });
}

function hashChunks(chunks: KnowledgeChunk[]): string {
  // Chunk source + ilk 20 char content ş hızlı hash
  return chunks
    .map((c) => `${c.source}:${c.content.slice(0, 20)}`)
    .join("|")
    .slice(0, 100);
}

// ============================================================================
// Main entry point
// ============================================================================

/**
 * Kullanıcı mesajı için yapılandırılmış niyet çıkar.
 *
 * @param message Kullanıcı mesajı (Türkçe)
 * @param knowledgeChunks KB'den retrieve edilen chunk'lar
 * @param categoryTaxonomy Geçerli kategori slug'larının listesi
 * @returns StructuredIntent
 */
export async function parseIntent(
  message: string,
  knowledgeChunks: KnowledgeChunk[],
  categoryTaxonomy: string[],
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<StructuredIntent> {
  // Cache check (history hash'e dahil — farklı geçmiş = farklı yorum)
  const historyHash = conversationHistory.map(m => m.content.slice(0, 30)).join("|").slice(0, 80);
  const key = cacheKey(message, hashChunks(knowledgeChunks) + "::" + historyHash);
  const cached = cacheGet(key);
  if (cached) {
    return cached;
  }

  // Prompt oluştur
  const userPrompt = buildIntentParserPrompt(
    message,
    knowledgeChunks,
    categoryTaxonomy,
    conversationHistory
  );

  // Model chain: NVIDIA ş Groq ş Gemini
  const providers: Array<() => Promise<string>> = [
    () => callNvidiaLlama(userPrompt),
    () => callGroqLlama(userPrompt),
    () => callGeminiFlash(userPrompt),
  ];

  let lastError: Error | null = null;

  for (const [i, provider] of providers.entries()) {
    try {
      const rawResponse = await withTimeout(provider(), REQUEST_TIMEOUT_MS);
      const intent = parseIntentResponse(rawResponse);

      // Cache başarılı sonuçlar
      cacheSet(key, intent);

      return intent;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(
        `[intent-parser] Provider ${i} failed: ${lastError.message.slice(0, 100)}`
      );
      // Sonraki provider'ı dene
    }
  }

  // Hepsi başarısız ş fallback intent
  console.error(
    `[intent-parser] All providers failed. Last error: ${lastError?.message}`
  );

  return {
    category_slug: null,
    semantic_keywords: [],
    must_have_specs: {},
    nice_to_have_specs: {},
    price_range: { min: null, max: null },
    brand_filter: [],
    confidence: 0,
    reasoning: "Intent parser tüm provider'larda başarısız",
    is_too_vague: true,
    is_off_topic: false,
  };
}

// ============================================================================
// NVIDIA NIM Llama 3.3 70B
// ============================================================================

async function callNvidiaLlama(userPrompt: string): Promise<string> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error("NVIDIA_API_KEY not set");
  }

  const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      model: "meta/llama-3.3-70b-instruct",
      messages: [
        { role: "system", content: INTENT_PARSER_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1, // Düşük ş deterministik JSON için
      max_tokens: 600,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`NVIDIA HTTP ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content || typeof content !== "string") {
    throw new Error("NVIDIA: empty content in response");
  }

  return content;
}

// ============================================================================
// Groq Llama 3.3 70B (fallback)
// ============================================================================

async function callGroqLlama(userPrompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY not set");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: INTENT_PARSER_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 600,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq HTTP ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content || typeof content !== "string") {
    throw new Error("Groq: empty content in response");
  }

  return content;
}

// ============================================================================
// Gemini Flash (son çare - Gemini kotayı korumak için ideal değil ama fallback)
// ============================================================================

async function callGeminiFlash(userPrompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not set");
  }

  const model = "gemini-flash-lite-latest";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: INTENT_PARSER_SYSTEM_PROMPT }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 600,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini HTTP ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content || typeof content !== "string") {
    throw new Error("Gemini: empty content in response");
  }

  return content;
}

// ============================================================================
// Helpers
// ============================================================================

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | null = null;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// ============================================================================
// Exports for testing
// ============================================================================

export function clearIntentCache(): void {
  cache.clear();
}

export function getIntentCacheSize(): number {
  return cache.size;
}
