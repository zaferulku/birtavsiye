import { NextResponse } from "next/server";
import { runScriptAgent } from "@/lib/agentRunner";
import { shouldRun } from "@/lib/agentScheduler";

const AGENT_NAME = "canonical-data-manager";
const AGENT_VERSION = "1.0.0";
const MIN_INTERVAL_MS = 5 * 60 * 60 * 1000; // 6h

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
    args: ["scripts/canonical-health.mjs"],
    cwd: process.cwd(),
    timeoutMs: 90_000,
    triggeredBy: "cron",
    agentVersion: AGENT_VERSION,
    inputData: { scope: "full" },
    computeStatus: (output, exitCode) => {
      if (exitCode !== 0) return "error";
      const s = (output.summary ?? output) as Record<string, unknown> | undefined;
      const orphans = Number(s?.orphans ?? 0);
      const nullBrand = Number(s?.null_brand ?? 0);
      const nullCategory = Number(s?.null_category ?? 0);
      // Health audit her zaman success — sadece raporlar. Severity output'ta.
      if (orphans > 0 || nullBrand > 0 || nullCategory > 0) return "success";
      return "noop"; // Hiç issue yoksa noop
    },
    computeConfidence: () => 1.0, // Deterministic SQL count
    computePatchProposed: () => false, // Read-only audit
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
