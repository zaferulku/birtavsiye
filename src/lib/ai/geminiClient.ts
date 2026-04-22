// =============================================================================
// src/lib/ai/geminiClient.ts
// Google Gemini (AI Studio) SDK wrapper
//
// İki temel işlev:
//   1. geminiChat()   — structured JSON output ile soru-cevap
//   2. geminiEmbed()  — 768-dim embedding vector
//
// Prensip: Bu dosya SADECE Gemini API'sine çağrı yapar.
//          Business logic (classification, cache) burada YOK.
//          Provider değişirse sadece bu dosya değişir, üst katmanlar aynı kalır.
// =============================================================================

import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable is not set");
}

const genAI = new GoogleGenerativeAI(API_KEY);

// =============================================================================
// Model seçimleri
// =============================================================================

// Classification için: gemini-2.0-flash (hızlı, ucuz, Türkçe'de iyi)
const CHAT_MODEL = "gemini-2.0-flash";

// Embedding için: text-embedding-004 (768 boyut, cömert free tier)
const EMBED_MODEL = "text-embedding-004";

// Güvenlik ayarları — classification için agresif değil
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];


// =============================================================================
// Tip tanımları
// =============================================================================

export type GeminiChatOptions = {
  prompt: string;                    // Kullanıcı mesajı
  systemInstruction?: string;        // Sistem promptu
  responseSchema?: object;           // Structured JSON şeması (opsiyonel)
  temperature?: number;              // 0.0-1.0 arası (default: 0.2)
  maxOutputTokens?: number;          // Max çıktı token sayısı (default: 1024)
};

export type GeminiChatResult<T = string> = {
  content: T;                        // Structured schema varsa T object, yoksa string
  tokensUsed: number;                // Toplam kullanılan token (input + output)
  latencyMs: number;                 // API çağrısının süresi
  model: string;                     // Kullanılan model adı
};

export type GeminiEmbedResult = {
  embedding: number[];               // 768 boyutlu vektör
  tokensUsed: number;
  latencyMs: number;
};


// =============================================================================
// geminiChat — structured output destekli
// =============================================================================

export async function geminiChat<T = string>(
  options: GeminiChatOptions
): Promise<GeminiChatResult<T>> {
  const {
    prompt,
    systemInstruction,
    responseSchema,
    temperature = 0.2,
    maxOutputTokens = 1024,
  } = options;

  const startTime = Date.now();

  const modelConfig: {
    model: string;
    systemInstruction?: string;
    safetySettings: typeof SAFETY_SETTINGS;
    generationConfig: Record<string, unknown>;
  } = {
    model: CHAT_MODEL,
    safetySettings: SAFETY_SETTINGS,
    generationConfig: {
      temperature,
      maxOutputTokens,
    },
  };

  if (systemInstruction) {
    modelConfig.systemInstruction = systemInstruction;
  }

  // Structured output (JSON schema) istenmişse
  if (responseSchema) {
    modelConfig.generationConfig.responseMimeType = "application/json";
    modelConfig.generationConfig.responseSchema = responseSchema;
  }

  const model = genAI.getGenerativeModel(modelConfig);

  const result = await model.generateContent(prompt);
  const response = result.response;

  const text = response.text();
  const usage = response.usageMetadata;
  const tokensUsed =
    (usage?.promptTokenCount ?? 0) + (usage?.candidatesTokenCount ?? 0);

  const latencyMs = Date.now() - startTime;

  // Schema varsa JSON parse et
  let content: T;
  if (responseSchema) {
    try {
      content = JSON.parse(text) as T;
    } catch (e) {
      throw new Error(
        `Gemini structured output JSON parse failed: ${e instanceof Error ? e.message : e}\nRaw: ${text.substring(0, 200)}`
      );
    }
  } else {
    content = text as unknown as T;
  }

  return {
    content,
    tokensUsed,
    latencyMs,
    model: CHAT_MODEL,
  };
}


// =============================================================================
// geminiEmbed — 768-dim text embedding
// =============================================================================

export async function geminiEmbed(text: string): Promise<GeminiEmbedResult> {
  const startTime = Date.now();

  const model = genAI.getGenerativeModel({ model: EMBED_MODEL });
  const result = await model.embedContent(text);

  const embedding = result.embedding.values;
  const latencyMs = Date.now() - startTime;

  // Token count yaklaşık (Gemini embedding API'si detay vermiyor)
  const tokensUsed = Math.ceil(text.length / 4);

  return {
    embedding,
    tokensUsed,
    latencyMs,
  };
}


// =============================================================================
// Batch embedding (paralelleştirilmiş)
// =============================================================================

export async function geminiEmbedBatch(
  texts: string[],
  concurrency = 5
): Promise<GeminiEmbedResult[]> {
  const results: GeminiEmbedResult[] = [];

  for (let i = 0; i < texts.length; i += concurrency) {
    const batch = texts.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(t => geminiEmbed(t)));
    results.push(...batchResults);
  }

  return results;
}


// =============================================================================
// Yardımcı: retry wrapper (rate limit / transient hatalar için)
// =============================================================================

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; baseDelayMs?: number } = {}
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 1000 } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      const msg = e instanceof Error ? e.message : String(e);

      // Rate limit (429) veya transient (500-504) hatalarını retry et
      const isRetriable =
        msg.includes("429") ||
        msg.includes("500") ||
        msg.includes("503") ||
        msg.includes("504") ||
        msg.includes("RESOURCE_EXHAUSTED") ||
        msg.includes("UNAVAILABLE");

      if (!isRetriable || attempt === maxAttempts) {
        throw e;
      }

      // Exponential backoff with jitter
      const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 500;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
