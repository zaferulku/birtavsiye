import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agentRunner";
import { shouldRun } from "@/lib/agentScheduler";

const SOURCES = ["trendyol", "hepsiburada", "mediamarkt", "pttavm"] as const;
const MIN_INTERVAL_MS = 25 * 60 * 1000; // 25 min guard (cron fires every 30)

function verifyCron(req: Request): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: Request) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();

  if (!(await shouldRun("tr-ecommerce-scraper", MIN_INTERVAL_MS))) {
    return NextResponse.json({ success: true, agent: "tr-ecommerce-scraper", skipped: true, duration: 0 });
  }

  console.log(`[${new Date().toISOString()}] CRON /api/cron/scrape started`);

  const result = await runAgent("tr-ecommerce-scraper", "Run full scrape cycle for all sources", {
    sources: SOURCES,
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json({
    success: result.success,
    agent: "tr-ecommerce-scraper",
    duration: Date.now() - start,
    sources: SOURCES,
    error: result.error,
  });
}
