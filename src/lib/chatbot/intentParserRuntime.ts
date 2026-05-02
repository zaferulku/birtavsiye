import {
  type KnowledgeChunk,
  type StructuredIntent,
  INTENT_PARSER_SYSTEM_PROMPT,
  buildIntentParserPrompt,
  parseIntentResponse,
} from "./intentParser";
import {
  formatIntentExamples,
  selectIntentExamples,
} from "./intentExamples";

const INTENT_CACHE_TTL_MS = 5 * 60 * 1000;
const INTENT_CACHE_MAX = 500;
const REQUEST_TIMEOUT_MS = 10_000;

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
  return chunks
    .map((chunk) => `${chunk.source}:${chunk.content.slice(0, 20)}`)
    .join("|")
    .slice(0, 100);
}

type IntentProvider = (signal: AbortSignal) => Promise<string>;

export async function parseIntent(
  message: string,
  knowledgeChunks: KnowledgeChunk[],
  categoryTaxonomy: string[],
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<StructuredIntent> {
  const historyHash = conversationHistory
    .map((messageEntry) => messageEntry.content.slice(0, 30))
    .join("|")
    .slice(0, 80);

  const key = cacheKey(
    message,
    `${hashChunks(knowledgeChunks)}::${historyHash}`
  );
  const cached = cacheGet(key);
  if (cached) {
    return cached;
  }

  const userPrompt = buildIntentParserPrompt(
    message,
    knowledgeChunks,
    categoryTaxonomy,
    conversationHistory,
    formatIntentExamples(selectIntentExamples(message, conversationHistory))
  );

  const providers: IntentProvider[] = [
    (signal) => callNvidiaLlama(userPrompt, signal),
    (signal) => callGroqLlama(userPrompt, signal),
    (signal) => callGeminiFlash(userPrompt, signal),
  ];

  let lastError: Error | null = null;

  for (let index = 0; index < providers.length; index += 1) {
    const provider = providers[index];
    try {
      const rawResponse = await withAbortTimeout(provider, REQUEST_TIMEOUT_MS);
      const intent = parseIntentResponse(rawResponse);
      cacheSet(key, intent);
      return intent;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(
        `[intent-parser] Provider ${index} failed: ${lastError.message.slice(0, 100)}`
      );
    }
  }

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
    reasoning: "Intent parser tum providerlarda basarisiz",
    is_too_vague: true,
    is_off_topic: false,
  };
}

async function callNvidiaLlama(
  userPrompt: string,
  signal: AbortSignal
): Promise<string> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error("NVIDIA_API_KEY not set");
  }

  const response = await fetch(
    "https://integrate.api.nvidia.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      signal,
      body: JSON.stringify({
        model: "meta/llama-3.3-70b-instruct",
        messages: [
          { role: "system", content: INTENT_PARSER_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 600,
        stream: false,
      }),
    }
  );

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

async function callGroqLlama(
  userPrompt: string,
  signal: AbortSignal
): Promise<string> {
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
    signal,
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

async function callGeminiFlash(
  userPrompt: string,
  signal: AbortSignal
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not set");
  }

  const model = "gemini-flash-lite-latest";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
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

async function withAbortTimeout<T>(
  runner: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await runner(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`Timeout after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function clearIntentCache(): void {
  cache.clear();
}

export function getIntentCacheSize(): number {
  return cache.size;
}
