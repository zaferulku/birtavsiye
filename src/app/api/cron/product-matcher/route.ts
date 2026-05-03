import { NextResponse } from "next/server";
import { runScriptAgent } from "@/lib/agentRunner";
import { shouldRun } from "@/lib/agentScheduler";

const AGENT_NAME = "product-matcher";
const AGENT_VERSION = "1.0.0";
const MIN_INTERVAL_MS = 23 * 60 * 60 * 1000; // 24h

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
    args: ["scripts/product-matcher-audit.mjs"],
    cwd: process.cwd(),
    timeoutMs: 90_000,
    triggeredBy: "cron",
    agentVersion: AGENT_VERSION,
    inputData: { audit_mode: "exact_canonical_key" },
    computeStatus: (output, exitCode) => {
      if (exitCode !== 0) return "error";
      const s = (output.summary ?? output) as Record<string, unknown> | undefined;
      const dupes = Number(s?.exact_dup_groups ?? 0);
      if (dupes > 0) return "partial"; // duplicates bulundu, admin müdahalesi gerek
      return "success"; // hiç duplicate yok = sağlıklı
    },
    computeConfidence: (output) => {
      // Exact normalize match → high confidence; fuzzy yok bu sürümde
      const s = (output.summary ?? output) as Record<string, unknown> | undefined;
      return Number(s?.exact_dup_groups ?? 0) > 0 ? 0.95 : 1.0;
    },
    computePatchProposed: (output) => {
      const s = (output.summary ?? output) as Record<string, unknown> | undefined;
      return Boolean(s?.patchProposed) || Number(s?.exact_dup_groups ?? 0) > 0;
    },
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
