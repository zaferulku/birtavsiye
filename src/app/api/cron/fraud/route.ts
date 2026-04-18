import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agentRunner";
import { shouldRun } from "@/lib/agentScheduler";

const MIN_INTERVAL_MS = 55 * 60 * 1000;

function verifyCron(req: Request): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: Request) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();

  if (!(await shouldRun("fraud-detector", MIN_INTERVAL_MS))) {
    return NextResponse.json({ success: true, agent: "fraud-detector", skipped: true, duration: 0 });
  }

  console.log(`[${new Date().toISOString()}] CRON /api/cron/fraud started`);

  const result = await runAgent(
    "fraud-detector",
    "Scan new reviews and user accounts for fraud signals in the last 60 minutes",
    { window_minutes: 60, timestamp: new Date().toISOString() }
  );

  return NextResponse.json({
    success: result.success,
    agent: "fraud-detector",
    duration: Date.now() - start,
    error: result.error,
  });
}
