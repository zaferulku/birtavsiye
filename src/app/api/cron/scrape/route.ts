import { NextResponse } from "next/server";

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? "";

// Her cron çağrısında bu query rotasyonundan birini çekeriz.
const PHONE_CAT  = "9f8b9ba9-ec64-4254-9e2c-b7d795d31ab7"; // akilli-telefon
const LAPTOP_CAT = "1a988f7b-0510-4fee-bb03-a7cfa5e5c1dc"; // laptop
const WATCH_CAT  = "f373d503-4637-425f-a9b8-3ecbe9637065"; // akilli-saat
const TV_CAT     = "2044ca2d-8b30-40e3-89bb-545018c35fa3"; // televizyon

// Saatlik rotation — saat % length ile rotate edilir.
// 32 query: ~32 saatte komple tur. Yeni model serileri eklendikçe genişlet.
const ROTATIONS = [
  // iPhone modelleri (mevcut + yeni nesil)
  { source: "pttavm",     query: "iphone 17 pro max",      category_id: PHONE_CAT },
  { source: "pttavm",     query: "iphone 17 pro",          category_id: PHONE_CAT },
  { source: "pttavm",     query: "iphone 17",              category_id: PHONE_CAT },
  { source: "pttavm",     query: "iphone 16 pro",          category_id: PHONE_CAT },
  { source: "pttavm",     query: "iphone 16",              category_id: PHONE_CAT },
  { source: "pttavm",     query: "iphone 15",              category_id: PHONE_CAT },
  { source: "mediamarkt", query: "iphone 17",              category_id: PHONE_CAT },
  { source: "mediamarkt", query: "iphone 16",              category_id: PHONE_CAT },
  { source: "vatan",      query: "iphone 17",              category_id: PHONE_CAT },

  // Samsung Galaxy
  { source: "pttavm",     query: "samsung galaxy s25",     category_id: PHONE_CAT },
  { source: "pttavm",     query: "samsung galaxy s24",     category_id: PHONE_CAT },
  { source: "pttavm",     query: "samsung galaxy a",       category_id: PHONE_CAT },
  { source: "mediamarkt", query: "samsung galaxy s25",     category_id: PHONE_CAT },
  { source: "mediamarkt", query: "samsung galaxy",         category_id: PHONE_CAT },

  // Diğer telefonlar
  { source: "pttavm",     query: "xiaomi 15",              category_id: PHONE_CAT },
  { source: "pttavm",     query: "huawei pura",            category_id: PHONE_CAT },
  { source: "pttavm",     query: "redmi note",             category_id: PHONE_CAT },

  // Laptop
  { source: "pttavm",     query: "macbook pro",            category_id: LAPTOP_CAT },
  { source: "pttavm",     query: "macbook air",            category_id: LAPTOP_CAT },
  { source: "pttavm",     query: "asus rog",               category_id: LAPTOP_CAT },
  { source: "pttavm",     query: "lenovo thinkpad",        category_id: LAPTOP_CAT },
  { source: "pttavm",     query: "laptop",                 category_id: LAPTOP_CAT },
  { source: "mediamarkt", query: "laptop",                 category_id: LAPTOP_CAT },
  { source: "mediamarkt", query: "macbook",                category_id: LAPTOP_CAT },

  // Akıllı saat
  { source: "pttavm",     query: "apple watch series",     category_id: WATCH_CAT },
  { source: "pttavm",     query: "apple watch ultra",      category_id: WATCH_CAT },
  { source: "pttavm",     query: "samsung galaxy watch",   category_id: WATCH_CAT },
  { source: "pttavm",     query: "akıllı saat",            category_id: WATCH_CAT },
  { source: "mediamarkt", query: "akıllı saat",            category_id: WATCH_CAT },

  // TV
  { source: "pttavm",     query: "televizyon",             category_id: TV_CAT },
  { source: "mediamarkt", query: "televizyon",             category_id: TV_CAT },
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
