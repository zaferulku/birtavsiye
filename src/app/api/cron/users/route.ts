import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agentRunner";
import { shouldRun } from "@/lib/agentScheduler";

const MIN_INTERVAL_MS = 23 * 60 * 60 * 1000;

function verifyCron(req: Request): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: Request) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();

  if (!(await shouldRun("user-profile-agent", MIN_INTERVAL_MS))) {
    return NextResponse.json({ success: true, agent: "user-profile-agent", skipped: true, duration: 0 });
  }

  console.log(`[${new Date().toISOString()}] CRON /api/cron/users started`);

  const result = await runAgent(
    "user-profile-agent",
    "Update all user preference profiles based on recent activity and behavior signals",
    { timestamp: new Date().toISOString() }
  );

  return NextResponse.json({
    success: result.success,
    agent: "user-profile-agent",
    duration: Date.now() - start,
    error: result.error,
  });
}
