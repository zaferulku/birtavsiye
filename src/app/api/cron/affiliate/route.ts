import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agentRunner";
import { shouldRun } from "@/lib/agentScheduler";
import { supabaseAdmin } from "@/lib/supabaseServer";

const MIN_INTERVAL_MS = 23 * 60 * 60 * 1000;

function verifyCron(req: Request): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: Request) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();

  if (!(await shouldRun("affiliate-link-manager", MIN_INTERVAL_MS))) {
    return NextResponse.json({ success: true, agent: "affiliate-link-manager", skipped: true, duration: 0 });
  }

  console.log(`[${new Date().toISOString()}] CRON /api/cron/affiliate started`);

  const { data: links } = await supabaseAdmin
    .from("affiliate_links")
    .select("id, product_id, platform, url, valid")
    .limit(200);

  const result = await runAgent(
    "affiliate-link-manager",
    "Validate and refresh all affiliate links, mark broken ones as invalid",
    { links: links ?? [], count: links?.length ?? 0 }
  );

  return NextResponse.json({
    success: result.success,
    agent: "affiliate-link-manager",
    duration: Date.now() - start,
    links_checked: links?.length ?? 0,
    error: result.error,
  });
}
