import { NextResponse } from "next/server";
import { runScriptAgent } from "@/lib/agentRunner";
import { shouldRun } from "@/lib/agentScheduler";

const AGENT_NAME = "price-intelligence";
const AGENT_VERSION = "1.0.0";
const MIN_INTERVAL_MS = 55 * 60 * 1000; // 1h

export const runtime = "nodejs";
export const maxDuration = 120;

function verifyCron(req: Request): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: Request) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();

  if (!(await shouldRun(AGENT_NAME, MIN_INTERVAL_MS))) {
    return NextResponse.json({
      success: true,
      agent: AGENT_NAME,
      skipped: true,
      reason: "cooldown",
      duration: Date.now() - start,
    });
  }

  const result = await runScriptAgent(AGENT_NAME, {
    command: "node",
    args: ["scripts/price-intelligence-snapshot.mjs"],
    cwd: process.cwd(),
    timeoutMs: 90_000,
    triggeredBy: "cron",
    agentVersion: AGENT_VERSION,
    inputData: { window_hours: 24, threshold_percent: 10 },
    computeStatus: (output, exitCode) => {
      if (exitCode !== 0) return "error";
      const s = (output.summary ?? output) as Record<string, unknown> | undefined;
      const rows = Number(s?.rows_24h ?? 0);
      if (rows === 0) return "noop"; // 24 saatte hiç fiyat değişimi olmadıysa
      return "success";
    },
    computeConfidence: () => 1.0, // Deterministic time-series analysis
    computePatchProposed: () => false, // Insight only, no auto-patches
    relatedEntityType: "system",
    relatedEntityId: null,
  });

  return NextResponse.json({
    success: result.success,
    agent: AGENT_NAME,
    status: result.status,
    decisionId: result.decisionId,
    duration: Date.now() - start,
    summary: result.output.summary ?? null,
    error: result.error,
  });
}

export async function POST(req: Request) {
  return GET(req);
}
