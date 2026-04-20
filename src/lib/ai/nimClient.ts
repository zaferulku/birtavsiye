// NVIDIA NIM (build.nvidia.com) OpenAI-compatible client
// Requires NVIDIA_API_KEY env var — get from https://build.nvidia.com/

const NIM_ENDPOINT = "https://integrate.api.nvidia.com/v1";

export type NimModel =
  | "meta/llama-3.3-70b-instruct"
  | "nvidia/llama-3.3-nemotron-super-49b-v1"
  | "nvidia/nv-embedqa-e5-v5"
  | "baai/bge-m3";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function apiKey(): string {
  const k = process.env.NVIDIA_API_KEY;
  if (!k) throw new Error("NVIDIA_API_KEY not configured in .env.local");
  return k;
}

export async function nimChat(opts: {
  model?: NimModel;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const model = opts.model ?? "meta/llama-3.3-70b-instruct";
  const res = await fetch(`${NIM_ENDPOINT}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey()}`,
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
    throw new Error(`NIM chat failed ${res.status}: ${body.slice(0, 300)}`);
  }
  const j = await res.json();
  return j.choices?.[0]?.message?.content ?? "";
}

export async function nimEmbed(opts: {
  model?: NimModel;
  input: string | string[];
}): Promise<number[][]> {
  const model = opts.model ?? "nvidia/nv-embedqa-e5-v5";
  const inputs = Array.isArray(opts.input) ? opts.input : [opts.input];
  const res = await fetch(`${NIM_ENDPOINT}/embeddings`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: inputs,
      input_type: "query",
      encoding_format: "float",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`NIM embed failed ${res.status}: ${body.slice(0, 300)}`);
  }
  const j = await res.json();
  return (j.data ?? []).map((d: { embedding: number[] }) => d.embedding);
}
