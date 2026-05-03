import { NextResponse } from "next/server";
import { runStubCron } from "@/lib/agentRunner";
import { shouldRun } from "@/lib/agentScheduler";

const AGENT_NAME = "review-aggregator";
const MIN_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000 - 60 * 60 * 1000;

export const runtime = "nodejs";
export const maxDuration = 60;

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

  const result = await runStubCron(AGENT_NAME, {
    triggeredBy: "cron",
    note: "Per-product review aggregation",
  });

  return NextResponse.json({
    success: result.success,
    agent: AGENT_NAME,
    status: result.status,
    decisionId: result.decisionId,
    duration: Date.now() - start,
  });
}

export async function POST(req: Request) {
  return GET(req);
}
