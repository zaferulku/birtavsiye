import { NextResponse } from "next/server";
import { getAdminUser } from "../../../../../lib/apiAdmin";
import { getPriceHealthSnapshot } from "../../../../../lib/priceHealth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const productId = url.searchParams.get("product_id");
  const staleHours = Number(url.searchParams.get("stale_hours") || "36");

  const snapshot = await getPriceHealthSnapshot({
    productId,
    staleHours,
  });

  return NextResponse.json(snapshot, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
