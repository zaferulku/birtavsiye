import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agentRunner";
import { shouldRun } from "@/lib/agentScheduler";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { getPriceHealthSnapshot, recordPriceHealthWatch } from "@/lib/priceHealth";

const MIN_INTERVAL_MS = 25 * 60 * 1000;
const HEALTH_MIN_INTERVAL_MS = 25 * 60 * 1000;

type RecentPriceHistoryRow = {
  listing_id: string;
  price: number;
  recorded_at: string;
  listings:
    | {
        product_id: string | null;
        source: string | null;
      }
    | Array<{
        product_id: string | null;
        source: string | null;
      }>
    | null;
};

function verifyCron(req: Request): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: Request) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();
  const shouldRunPriceIntelligence = await shouldRun("price-intelligence", MIN_INTERVAL_MS);
  const shouldRunHealthWatch = await shouldRun("price-health-watch", HEALTH_MIN_INTERVAL_MS);

  if (!shouldRunPriceIntelligence && !shouldRunHealthWatch) {
    return NextResponse.json({ success: true, agent: "price-intelligence", skipped: true, duration: 0 });
  }

  console.log(`[${new Date().toISOString()}] CRON /api/cron/prices started`);

  let healthSnapshot: Awaited<ReturnType<typeof getPriceHealthSnapshot>> | null = null;
  let healthChecked = false;
  if (shouldRunHealthWatch) {
    const healthStart = Date.now();
    healthSnapshot = await getPriceHealthSnapshot();
    await recordPriceHealthWatch(healthSnapshot, {
      trigger: "cron:/api/cron/prices",
      durationMs: Date.now() - healthStart,
    });
    healthChecked = true;
  }

  if (!shouldRunPriceIntelligence) {
    return NextResponse.json({
      success: true,
      agent: "price-intelligence",
      skipped: true,
      duration: Date.now() - start,
      health_checked: healthChecked,
      health_status: healthSnapshot?.status ?? null,
      health_alerts: healthSnapshot?.alerts.length ?? 0,
    });
  }

  const since = new Date(Date.now() - 35 * 60 * 1000).toISOString();
  const { data: recentHistoryRows, error: recentPricesError } = await supabaseAdmin
    .from("price_history")
    .select("listing_id, price, recorded_at, listings!inner(product_id, source)")
    .gte("recorded_at", since)
    .order("recorded_at", { ascending: false })
    .limit(200);

  if (recentPricesError) {
    return NextResponse.json(
      { success: false, agent: "price-intelligence", error: recentPricesError.message },
      { status: 500 }
    );
  }

  const recentPrices = ((recentHistoryRows ?? []) as RecentPriceHistoryRow[]).map((row) => {
    const listing = Array.isArray(row.listings) ? row.listings[0] : row.listings;
    return {
      listing_id: row.listing_id,
      product_id: listing?.product_id ?? null,
      source: listing?.source ?? null,
      price: row.price,
      recorded_at: row.recorded_at,
    };
  });

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
    health_checked: healthChecked,
    health_status: healthSnapshot?.status ?? null,
    health_alerts: healthSnapshot?.alerts.length ?? 0,
  });
}
