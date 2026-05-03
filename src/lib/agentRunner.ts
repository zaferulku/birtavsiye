import { GoogleGenAI } from "@google/genai";
import { spawn } from "child_process";
import crypto from "crypto";
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

// ============================================================================
// runScriptAgent — script-based (non-LLM) agent runtime
// ============================================================================
// Pilot agent altyapısı (category-link-auditor için). Bir Node.js scriptini
// çocuk process olarak çalıştırır, stdout'undan __AUDIT_JSON__ özet satırını
// çıkartır, agent_decisions tablosuna structured kayıt yazar.
//
// LLM çağırmaz; rule/script tabanlı agent kararları için. Migration 042
// kolonlarını kullanır (status, triggered_by, patch_proposed).
// ============================================================================

export type AgentTriggeredBy = "cron" | "manual" | "webhook" | "agent";
export type AgentStatus = "success" | "partial" | "error" | "noop";

export interface ScriptAgentOptions {
  command: string;            // örn. "node"
  args: string[];             // örn. ["scripts/probe-nav-db-compare.mjs"]
  cwd?: string;               // varsayılan: process.cwd()
  env?: Record<string, string>;
  timeoutMs?: number;         // varsayılan: 120000
  triggeredBy: AgentTriggeredBy;
  inputData: Record<string, unknown>;
  // Status hesaplaması — output_data'ya göre. Default: exit==0 → success.
  computeStatus?: (output: Record<string, unknown>, exitCode: number) => AgentStatus;
  // Confidence hesaplaması — output_data'ya göre. Default: 1.0.
  computeConfidence?: (output: Record<string, unknown>) => number;
  // Patch_proposed flag — agent fix önerdi mi
  computePatchProposed?: (output: Record<string, unknown>) => boolean;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  agentVersion?: string;
}

export interface ScriptAgentResult {
  success: boolean;
  status: AgentStatus;
  output: Record<string, unknown>;
  exitCode: number;
  stdout: string;
  stderr: string;
  duration_ms: number;
  decisionId?: number | string | null;
  patch_proposed: boolean;
  error?: string;
}

function hashInput(payload: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

// stdout'tan __AUDIT_JSON__<json> formatlı son özet satırı yakala
function extractStructuredOutput(stdout: string): Record<string, unknown> {
  const lines = stdout.split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith("__AUDIT_JSON__")) {
      const json = line.slice("__AUDIT_JSON__".length);
      try { return JSON.parse(json) as Record<string, unknown>; }
      catch { /* devam */ }
    }
  }
  // Fallback: son satırda standalone JSON
  const last = lines.filter(Boolean).pop()?.trim() ?? "";
  if (last.startsWith("{") && last.endsWith("}")) {
    try { return JSON.parse(last) as Record<string, unknown>; } catch { /* yok */ }
  }
  return { raw: stdout.slice(-2000) };
}

export async function runScriptAgent(
  agentName: string,
  options: ScriptAgentOptions
): Promise<ScriptAgentResult> {
  const start = Date.now();
  const timeoutMs = options.timeoutMs ?? 120_000;
  const cwd = options.cwd ?? process.cwd();

  console.log(
    `[${new Date().toISOString()}] [${agentName}] script run start cmd="${options.command} ${options.args.join(" ")}"`
  );

  const child = spawn(options.command, options.args, {
    cwd,
    env: { ...process.env, ...(options.env ?? {}) },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    child.kill("SIGKILL");
  }, timeoutMs);

  child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

  const exitCode: number = await new Promise((resolve) => {
    child.on("close", (code) => resolve(code ?? -1));
    child.on("error", () => resolve(-1));
  });
  clearTimeout(timer);

  const duration_ms = Date.now() - start;
  const output = extractStructuredOutput(stdout);

  const computedStatus = options.computeStatus
    ? options.computeStatus(output, exitCode)
    : (exitCode === 0 ? ("success" as const) : ("error" as const));
  const status: AgentStatus = timedOut ? "error" : computedStatus;
  const confidence = options.computeConfidence ? options.computeConfidence(output) : 1.0;
  const patch_proposed = options.computePatchProposed ? options.computePatchProposed(output) : false;

  // agent_decisions kaydı (Migration 042 kolonlarıyla)
  const inputHash = hashInput(options.inputData);
  let decisionId: number | string | null = null;
  try {
    const { data, error } = await supabaseAdmin
      .from("agent_decisions")
      .insert({
        agent_name: agentName,
        agent_version: options.agentVersion ?? "1.0.0",
        input_hash: inputHash,
        input_data: options.inputData,
        output_data: output,
        confidence,
        method: "script",
        latency_ms: duration_ms,
        tokens_used: 0,
        related_entity_type: options.relatedEntityType ?? null,
        related_entity_id: options.relatedEntityId ?? null,
        status,
        triggered_by: options.triggeredBy,
        patch_proposed,
      })
      .select("id")
      .single();

    if (error) {
      console.error(
        `[${new Date().toISOString()}] [${agentName}] agent_decisions INSERT FAILED: ${error.code} ${error.message}`
      );
    } else {
      decisionId = (data?.id as number | string | null) ?? null;
    }
  } catch (err) {
    console.error(
      `[${new Date().toISOString()}] [${agentName}] agent_decisions INSERT exception:`,
      err instanceof Error ? err.message : err
    );
  }

  console.log(
    `[${new Date().toISOString()}] [${agentName}] script run done in ${duration_ms}ms status=${status} exit=${exitCode} patch_proposed=${patch_proposed} decisionId=${decisionId}`
  );

  return {
    success: status === "success" || status === "partial" || status === "noop",
    status,
    output,
    exitCode,
    stdout,
    stderr: stderr.slice(-2000),
    duration_ms,
    decisionId,
    patch_proposed,
    error: timedOut ? `Timeout after ${timeoutMs}ms` : (status === "error" ? stderr.slice(-500) : undefined),
  };
}

// ============================================================================
// runStubCron — placeholder cron handler (real logic TBD per agent)
// ============================================================================
// Pilot fazında 13 agent için cron infrastructure çalışsın diye scaffolding.
// Her agent için route bu helper'ı çağırır → agent_decisions'a noop kayıt yazar.
// İleride her agent'ın gerçek logic'i route'unda doldurulduğunda bu çağrı
// runAgent() veya runScriptAgent() ile değiştirilir.
// ============================================================================

export interface StubCronOptions {
  triggeredBy: AgentTriggeredBy;
  note?: string;
  inputData?: Record<string, unknown>;
  agentVersion?: string;
}

export async function runStubCron(
  agentName: string,
  options: StubCronOptions
): Promise<{ success: boolean; status: AgentStatus; decisionId: number | string | null; duration_ms: number }> {
  const start = Date.now();
  const inputData = options.inputData ?? { stub: true, note: options.note ?? "scaffolding only" };
  const inputHash = hashInput(inputData);

  let decisionId: number | string | null = null;
  try {
    const { data, error } = await supabaseAdmin
      .from("agent_decisions")
      .insert({
        agent_name: agentName,
        agent_version: options.agentVersion ?? "0.0.1-stub",
        input_hash: inputHash,
        input_data: inputData,
        output_data: { status: "stub_not_implemented", note: options.note ?? "Real logic pending; cron infrastructure verified." },
        confidence: 1.0,
        method: "stub",
        latency_ms: Date.now() - start,
        tokens_used: 0,
        related_entity_type: null,
        related_entity_id: null,
        status: "noop",
        triggered_by: options.triggeredBy,
        patch_proposed: false,
      })
      .select("id")
      .single();

    if (error) {
      console.error(
        `[${new Date().toISOString()}] [${agentName}] stub agent_decisions INSERT FAILED: ${error.code} ${error.message}`
      );
    } else {
      decisionId = (data?.id as number | string | null) ?? null;
    }
  } catch (err) {
    console.error(
      `[${new Date().toISOString()}] [${agentName}] stub INSERT exception:`,
      err instanceof Error ? err.message : err
    );
  }

  const duration_ms = Date.now() - start;
  console.log(
    `[${new Date().toISOString()}] [${agentName}] stub cron ran in ${duration_ms}ms decisionId=${decisionId}`
  );

  return { success: true, status: "noop", decisionId, duration_ms };
}

