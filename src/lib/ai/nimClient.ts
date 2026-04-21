// OpenAI-compatible AI client with auto-fallback.
// Priority: NVIDIA_API_KEY (build.nvidia.com) → GROQ_API_KEY (groq.com).
// If only Groq is available, chat uses Groq's Llama 3.3 70B;
// embeddings fall back to empty (caller uses keyword search).

const NIM_ENDPOINT = "https://integrate.api.nvidia.com/v1";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1";

export type NimModel =
  | "meta/llama-3.3-70b-instruct"
  | "nvidia/llama-3.3-nemotron-super-49b-v1"
  | "nvidia/nv-embedqa-e5-v5"
  | "baai/bge-m3";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function provider(): "nvidia" | "groq" | "none" {
  if (process.env.NVIDIA_API_KEY) return "nvidia";
  if (process.env.GROQ_API_KEY) return "groq";
  return "none";
}

export async function nimChat(opts: {
  model?: NimModel;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const p = provider();
  if (p === "none") throw new Error("Neither NVIDIA_API_KEY nor GROQ_API_KEY configured");

  const endpoint = p === "nvidia" ? NIM_ENDPOINT : GROQ_ENDPOINT;
  const apiKey = p === "nvidia" ? process.env.NVIDIA_API_KEY! : process.env.GROQ_API_KEY!;
  const model = p === "nvidia"
    ? (opts.model ?? "meta/llama-3.3-70b-instruct")
    : "llama-3.3-70b-versatile";

  const res = await fetch(`${endpoint}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
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
    throw new Error(`${p} chat failed ${res.status}: ${body.slice(0, 300)}`);
  }
  const j = await res.json();
  return j.choices?.[0]?.message?.content ?? "";
}

export async function nimEmbed(opts: {
  model?: NimModel;
  input: string | string[];
}): Promise<number[][]> {
  // Embedding only via NVIDIA; Groq has no embedding endpoint
  if (!process.env.NVIDIA_API_KEY) return [];

  const model = opts.model ?? "nvidia/nv-embedqa-e5-v5";
  const inputs = Array.isArray(opts.input) ? opts.input : [opts.input];
  const res = await fetch(`${NIM_ENDPOINT}/embeddings`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.NVIDIA_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: inputs,
      input_type: "query",
      encoding_format: "float",
    }),
  });
  if (!res.ok) return [];
  const j = await res.json();
  return (j.data ?? []).map((d: { embedding: number[] }) => d.embedding);
}
