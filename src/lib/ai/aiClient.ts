// =============================================================================
// src/lib/ai/aiClient.ts
// Unified AI client — chat + embedding
//
// PROVIDERS (priority order):
//   Chat:      NVIDIA NIM (Llama 3.3 70B) → Groq (fallback)
//   Embedding: Gemini text-embedding-004 (768-dim) → NVIDIA (fallback, 1024-dim ⚠️)
//
// Embedding için Gemini birinci tercih — yeni products.embedding VECTOR(768)
// ile uyumlu. NVIDIA embed (1024-dim) fallback olarak bırakıldı ama gerçekte
// kullanılmamalı (boyut uyuşmazlığı). Bu dosya NVIDIA embed'i artık çağırmaz,
// sadece legacy support için tutuldu.
//
// PRENSİP: Bu dosya provider değişimi olduğunda TEK DEĞİŞEN yer olmalı.
//          Üst katmanlar (chat route, classifier) bu fonksiyonları import eder.
// =============================================================================

import { GoogleGenerativeAI } from "@google/generative-ai";

const NIM_ENDPOINT = "https://integrate.api.nvidia.com/v1";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1";

// Gemini client (lazy init)
let _gemini: GoogleGenerativeAI | null = null;
function getGemini(): GoogleGenerativeAI | null {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!_gemini) _gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return _gemini;
}

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AiChatProvider = "nvidia" | "groq" | "none";
export type AiEmbedProvider = "gemini" | "nvidia" | "none";

// =============================================================================
// Provider resolution
// =============================================================================

function chatProvider(): AiChatProvider {
  if (process.env.NVIDIA_API_KEY) return "nvidia";
  if (process.env.GROQ_API_KEY) return "groq";
  return "none";
}

function embedProvider(): AiEmbedProvider {
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.NVIDIA_API_KEY) return "nvidia";
  return "none";
}

// =============================================================================
// Chat (NVIDIA → Groq fallback)
// =============================================================================

export async function aiChat(opts: {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  model?: string;
}): Promise<{ content: string; provider: AiChatProvider; latencyMs: number }> {
  const provider = chatProvider();
  if (provider === "none") {
    throw new Error(
      "No chat provider available. Set NVIDIA_API_KEY or GROQ_API_KEY in environment."
    );
  }

  const startTime = Date.now();
  const endpoint = provider === "nvidia" ? NIM_ENDPOINT : GROQ_ENDPOINT;
  const apiKey = provider === "nvidia" ? process.env.NVIDIA_API_KEY! : process.env.GROQ_API_KEY!;

  // Model seçimi — provider'a göre varsayılan
  const model = opts.model ?? (
    provider === "nvidia"
      ? "meta/llama-3.3-70b-instruct"
      : "llama-3.3-70b-versatile"
  );

  const res = await fetch(`${endpoint}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.2,
      max_tokens: opts.maxTokens ?? 1024,
      stream: false,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${provider} chat failed ${res.status}: ${body.slice(0, 300)}`);
  }

  const j = await res.json();
  const content = j.choices?.[0]?.message?.content ?? "";
  const latencyMs = Date.now() - startTime;

  return { content, provider, latencyMs };
}

// =============================================================================
// Embedding (Gemini → NVIDIA fallback)
// =============================================================================

export async function aiEmbed(opts: {
  input: string;
  // forceProvider: Test için, normalde bırakın
  forceProvider?: AiEmbedProvider;
}): Promise<{
  embedding: number[];
  provider: AiEmbedProvider;
  dimensions: number;
  latencyMs: number;
}> {
  const startTime = Date.now();
  const provider = opts.forceProvider ?? embedProvider();

  if (provider === "none") {
    throw new Error("No embedding provider available. Set GEMINI_API_KEY or NVIDIA_API_KEY.");
  }

  if (provider === "gemini") {
    const gemini = getGemini();
    if (!gemini) throw new Error("Gemini provider unavailable");

    const model = gemini.getGenerativeModel({ model: "gemini-embedding-001" });
    // outputDimensionality SDK type'ında yok ama API parametresi destekliyor (3072 → 768 truncate)
    const result = await model.embedContent({
      content: { role: "user", parts: [{ text: opts.input }] },
      outputDimensionality: 768,
    } as unknown as Parameters<typeof model.embedContent>[0]);
    const embedding = result.embedding.values;

    if (embedding.length !== 768) {
      throw new Error(`Unexpected Gemini embedding dimension: ${embedding.length} (expected 768)`);
    }

    return {
      embedding,
      provider: "gemini",
      dimensions: embedding.length,
      latencyMs: Date.now() - startTime,
    };
  }

  // NVIDIA fallback — WARNING: 1024-dim, products.embedding VECTOR(768) ile uyumsuz
  if (provider === "nvidia") {
    if (!process.env.NVIDIA_API_KEY) {
      throw new Error("NVIDIA_API_KEY not set for embedding");
    }

    const res = await fetch(`${NIM_ENDPOINT}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "nvidia/nv-embedqa-e5-v5",
        input: [opts.input],
        input_type: "query",
        encoding_format: "float",
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`NVIDIA embed failed ${res.status}: ${body.slice(0, 300)}`);
    }

    const j = await res.json();
    const embedding: number[] = j.data?.[0]?.embedding ?? [];

    if (embedding.length === 0) {
      throw new Error("NVIDIA embed returned empty");
    }

    console.warn(
      `NVIDIA embedding used (${embedding.length}-dim) — incompatible with VECTOR(768) products.embedding column. Gemini recommended.`
    );

    return {
      embedding,
      provider: "nvidia",
      dimensions: embedding.length,
      latencyMs: Date.now() - startTime,
    };
  }

  throw new Error(`Unknown embedding provider: ${provider}`);
}

// =============================================================================
// Legacy compatibility (nimClient.ts'ten import eden kodlar için)
// =============================================================================
// Bu fonksiyonlar eski kodla uyumluluk için var. Yeni kodda aiChat/aiEmbed kullanın.

export async function nimChat(opts: {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const result = await aiChat(opts);
  return result.content;
}

export async function nimEmbed(opts: {
  model?: string;
  input: string | string[];
}): Promise<number[][]> {
  const inputs = Array.isArray(opts.input) ? opts.input : [opts.input];
  const results = await Promise.all(
    inputs.map(i => aiEmbed({ input: i }).catch(() => null))
  );
  return results
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .map(r => r.embedding);
}

// Legacy type export
export type NimModel = string;
