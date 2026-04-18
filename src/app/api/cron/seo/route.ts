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

  if (!(await shouldRun("seo-agent", MIN_INTERVAL_MS))) {
    return NextResponse.json({ success: true, agent: "seo-agent", skipped: true, duration: 0 });
  }

  console.log(`[${new Date().toISOString()}] CRON /api/cron/seo started`);

  const { data: products } = await supabaseAdmin
    .from("products")
    .select("id, title, slug")
    .or("meta_title.is.null,meta_description.is.null")
    .limit(100);

  const result = await runAgent(
    "seo-agent",
    "Generate meta titles and descriptions for products missing them",
    { products: products ?? [], count: products?.length ?? 0 }
  );

  return NextResponse.json({
    success: result.success,
    agent: "seo-agent",
    duration: Date.now() - start,
    products_processed: products?.length ?? 0,
    error: result.error,
  });
}
