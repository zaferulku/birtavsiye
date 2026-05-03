import { NextResponse } from "next/server";
import { runScriptAgent } from "@/lib/agentRunner";
import { shouldRun } from "@/lib/agentScheduler";

// Saat başı çalışsın — 55 min cooldown ile çift tetiklemeyi engelle
const MIN_INTERVAL_MS = 55 * 60 * 1000;
const AGENT_NAME = "category-link-auditor";
const AGENT_VERSION = "1.0.0";

export const runtime = "nodejs";
export const maxDuration = 120; // saniye

function verifyCron(req: Request): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: Request) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();

  // Cooldown — agent_logs / agent_decisions üzerinden
  if (!(await shouldRun(AGENT_NAME, MIN_INTERVAL_MS))) {
    return NextResponse.json({
      success: true,
      agent: AGENT_NAME,
      skipped: true,
      reason: "cooldown",
      duration: Date.now() - start,
    });
  }

  console.log(`[${new Date().toISOString()}] CRON /api/cron/${AGENT_NAME} started`);

  const result = await runScriptAgent(AGENT_NAME, {
    command: "node",
    args: ["scripts/probe-nav-db-compare.mjs"],
    cwd: process.cwd(),
    timeoutMs: 90_000,
    triggeredBy: "cron",
    agentVersion: AGENT_VERSION,
    inputData: {
      scope: "full",
      header_path: "src/app/components/layout/Header.tsx",
      auto_patch: false,
    },
    // Output yapısı: probe scriptindeki summary objesi
    computeStatus: (output, exitCode) => {
      if (exitCode !== 0) return "error";
      const summary = (output.summary ?? output) as Record<string, unknown> | undefined;
      const broken = Number(summary?.broken ?? 0);
      const leaf = Number(summary?.leaf ?? 0);
      if (broken > 0) return "partial";       // Broken link var, ama agent çalıştı
      if (leaf === 0 && broken === 0) return "noop";
      return "success";
    },
    computeConfidence: (output) => {
      const summary = (output.summary ?? output) as Record<string, unknown> | undefined;
      const ambiguous = Number(summary?.ambiguous ?? 0);
      return ambiguous > 0 ? 0.6 : 1.0;
    },
    computePatchProposed: (output) => {
      const summary = (output.summary ?? output) as Record<string, unknown> | undefined;
      return Boolean(summary?.patchProposed) || Number(summary?.broken ?? 0) > 0 || Number(summary?.leaf ?? 0) > 0;
    },
    relatedEntityType: "system",
    relatedEntityId: null,
  });

  return NextResponse.json({
    success: result.success,
    agent: AGENT_NAME,
    status: result.status,
    duration: Date.now() - start,
    decisionId: result.decisionId,
    patch_proposed: result.patch_proposed,
    summary: (result.output.summary ?? null),
    error: result.error,
  });
}

// POST = manual trigger (admin panelden)
export async function POST(req: Request) {
  return GET(req);
}
