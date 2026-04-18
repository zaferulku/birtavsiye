import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agentRunner";
import { shouldRun } from "@/lib/agentScheduler";
import { supabaseAdmin } from "@/lib/supabaseServer";

const MIN_INTERVAL_MS = 55 * 60 * 1000;

function verifyCron(req: Request): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: Request) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();

  if (!(await shouldRun("trend-detector", MIN_INTERVAL_MS))) {
    return NextResponse.json({ success: true, agent: "trend-detector", skipped: true, duration: 0 });
  }

  console.log(`[${new Date().toISOString()}] CRON /api/cron/trends started`);

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: recentLogs } = await supabaseAdmin
    .from("agent_logs")
    .select("agent_name, task, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(500);

  const result = await runAgent(
    "trend-detector",
    "Analyze recent platform activity to detect trending products and search patterns",
    { activity_logs: recentLogs ?? [], since, timestamp: new Date().toISOString() }
  );

  return NextResponse.json({
    success: result.success,
    agent: "trend-detector",
    duration: Date.now() - start,
    activity_count: recentLogs?.length ?? 0,
    error: result.error,
  });
}
