import { NextResponse } from "next/server";

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? "";

// Her cron çağrısında bu query rotasyonundan birini çekeriz.
const ROTATIONS = [
  { source: "pttavm",     query: "iphone 15",      category_id: "9f8b9ba9-ec64-4254-9e2c-b7d795d31ab7" },
  { source: "pttavm",     query: "samsung galaxy", category_id: "9f8b9ba9-ec64-4254-9e2c-b7d795d31ab7" },
  { source: "pttavm",     query: "laptop",         category_id: "1a988f7b-0510-4fee-bb03-a7cfa5e5c1dc" },
  { source: "mediamarkt", query: "samsung",        category_id: "9f8b9ba9-ec64-4254-9e2c-b7d795d31ab7" },
  { source: "mediamarkt", query: "laptop",         category_id: "1a988f7b-0510-4fee-bb03-a7cfa5e5c1dc" },
  { source: "pttavm",     query: "akıllı saat",    category_id: "f373d503-4637-425f-a9b8-3ecbe9637065" },
  { source: "pttavm",     query: "televizyon",     category_id: "2044ca2d-8b30-40e3-89bb-545018c35fa3" },
  { source: "vatan",      query: "iphone",         category_id: "9f8b9ba9-ec64-4254-9e2c-b7d795d31ab7" },
];

function verifyCron(req: Request): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: Request) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();
  console.log(`[${new Date().toISOString()}] CRON /api/cron/scrape started`);

  const hour = new Date().getUTCHours();
  const task = ROTATIONS[hour % ROTATIONS.length];

  const results: Array<{ page: number; fetched?: number; inserted?: number; newProducts?: number; error?: string }> = [];

  for (const page of [1, 2]) {
    try {
      const res = await fetch(`${BASE_URL}/api/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": INTERNAL_SECRET,
        },
        body: JSON.stringify({ ...task, page }),
      });
      const body = await res.json() as { fetched?: number; inserted?: number; newProducts?: number; error?: string };
      results.push({ page, ...body });
    } catch (err) {
      results.push({
        page,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const totalFetched = results.reduce((s, r) => s + (r.fetched ?? 0), 0);
  const totalInserted = results.reduce((s, r) => s + (r.inserted ?? 0), 0);
  const totalNew = results.reduce((s, r) => s + (r.newProducts ?? 0), 0);

  console.log(`[cron/scrape] task="${task.source}:${task.query}" fetched=${totalFetched} inserted=${totalInserted} new=${totalNew}`);

  return NextResponse.json({
    success: true,
    duration: Date.now() - start,
    rotation: `${task.source}:${task.query}`,
    fetched: totalFetched,
    inserted: totalInserted,
    newProducts: totalNew,
    results,
  });
}
