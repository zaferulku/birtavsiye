import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agentRunner";
import { shouldRun } from "@/lib/agentScheduler";
import { supabaseAdmin } from "@/lib/supabaseServer";

const MIN_INTERVAL_MS = 25 * 60 * 1000;

function verifyCron(req: Request): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: Request) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();

  if (!(await shouldRun("price-intelligence", MIN_INTERVAL_MS))) {
    return NextResponse.json({ success: true, agent: "price-intelligence", skipped: true, duration: 0 });
  }

  console.log(`[${new Date().toISOString()}] CRON /api/cron/prices started`);

  const since = new Date(Date.now() - 35 * 60 * 1000).toISOString();
  const { data: recentPrices } = await supabaseAdmin
    .from("price_history")
    .select("product_id, price, recorded_at")
    .gte("recorded_at", since)
    .order("recorded_at", { ascending: false })
    .limit(200);

  const result = await runAgent(
    "price-intelligence",
    "Analyze recent price changes and detect significant drops",
    { recent_prices: recentPrices ?? [], since, drop_threshold_pct: 5 }
  );

  const drops = Array.isArray(result.data.price_drops) ? result.data.price_drops : [];
  let notifResult = null;
  if (drops.length > 0) {
    notifResult = await runAgent(
      "notification-dispatcher",
      "Send price drop notifications to subscribed users",
      { price_drops: drops }
    );
  }

  return NextResponse.json({
    success: result.success,
    agent: "price-intelligence",
    duration: Date.now() - start,
    analyzed: recentPrices?.length ?? 0,
    drops_detected: drops.length,
    notifications_sent: notifResult?.success ?? false,
  });
}
