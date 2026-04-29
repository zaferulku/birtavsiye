import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";
import { supabaseAdmin } from "./supabaseServer";

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const AGENT_DIR = path.join(process.cwd(), ".claude", "agents");
const MAX_RETRIES = 1;
const GEMINI_MODEL = "gemini-2.5-flash";
const GROQ_MODEL = "llama-3.3-70b-versatile";

export interface AgentResult {
  success: boolean;
  data: Record<string, unknown>;
  error?: string;
  duration_ms: number;
  retries: number;
  provider?: "gemini" | "groq";
}

// Module-level cache — agent prompt'ları .md dosyalarından okunuyor; cold start dışında değişmez
const promptCache = new Map<string, string>();

function loadSystemPrompt(agentName: string): string {
  const cached = promptCache.get(agentName);
  if (cached !== undefined) return cached;

  const filePath = path.join(AGENT_DIR, `${agentName}.md`);
  let prompt: string;
  if (!fs.existsSync(filePath)) {
    prompt = `You are the ${agentName} agent. Analyze the given task and return a structured JSON response.`;
  } else {
    const raw = fs.readFileSync(filePath, "utf-8");
    prompt = raw.replace(/^---[\s\S]*?---\n/, "").trim();
  }
  promptCache.set(agentName, prompt);
  return prompt;
}

function parseResult(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw);
  } catch {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    try {
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { raw };
    } catch {
      return { raw };
    }
  }
}

async function callGemini(systemPrompt: string, userMessage: string): Promise<string> {
  const response = await genai.models.generateContent({
    model: GEMINI_MODEL,
    contents: userMessage,
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 0 },
    },
  });
  return response.text ?? "";
}

async function callGroq(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1024,
    }),
  });

  if (!res.ok) throw new Error(`Groq HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? "";
}

function isRateLimit(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /429|RESOURCE_EXHAUSTED|quota|rate[- ]?limit/i.test(msg);
}

export async function runAgent(
  agentName: string,
  task: string,
  payload: Record<string, unknown> = {}
): Promise<AgentResult> {
  const startTime = Date.now();
  const systemPrompt = loadSystemPrompt(agentName);
  const userMessage = `Task: ${task}\n\nPayload:\n${JSON.stringify(payload, null, 2)}\n\nRespond with valid JSON only.`;

  let attempt = 0;
  let lastError = "";
  let provider: "gemini" | "groq" = "gemini";

  while (attempt <= MAX_RETRIES) {
    try {
      console.log(
        `[${new Date().toISOString()}] [${agentName}] attempt=${attempt + 1} provider=${provider} task="${task}"`
      );

      const raw = provider === "gemini"
        ? await callGemini(systemPrompt, userMessage)
        : await callGroq(systemPrompt, userMessage);

      const result = parseResult(raw);
      const duration_ms = Date.now() - startTime;
      const status = attempt > 0 || provider === "groq" ? "retried" : "success";

      const { error: logErr } = await supabaseAdmin.from("agent_logs").insert({
        agent_name: agentName,
        task,
        payload,
        result: { ...result, _provider: provider },
        status,
        duration_ms,
      });
      if (logErr) {
        console.error(
          `[${new Date().toISOString()}] [${agentName}] DB log FAILED: ${logErr.code} ${logErr.message}`
        );
      }

      console.log(
        `[${new Date().toISOString()}] [${agentName}] done in ${duration_ms}ms status=${status} provider=${provider}`
      );

      return { success: true, data: result, duration_ms, retries: attempt, provider };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error(
        `[${new Date().toISOString()}] [${agentName}] provider=${provider} attempt=${attempt + 1} error: ${lastError.slice(0, 200)}`
      );

      // On Gemini rate limit, switch to Groq immediately (if configured)
      if (provider === "gemini" && isRateLimit(err) && process.env.GROQ_API_KEY) {
        console.log(`[${new Date().toISOString()}] [${agentName}] switching to Groq fallback`);
        provider = "groq";
        continue; // Don't consume retry counter on provider switch
      }

      attempt++;
    }
  }

  const duration_ms = Date.now() - startTime;

  await supabaseAdmin.from("agent_logs").insert({
    agent_name: agentName,
    task,
    payload,
    result: { error: lastError, _provider: provider },
    status: "error",
    duration_ms,
  });

  return {
    success: false,
    data: {},
    error: lastError,
    duration_ms,
    retries: attempt,
    provider,
  };
}
