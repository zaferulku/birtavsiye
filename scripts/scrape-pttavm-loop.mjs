#!/usr/bin/env node
/**
 * PttAVM scrape loop (local, sustained).
 *
 * Cron'da PttAVM her 4 saatte bir 1 query atıyordu — yetersiz. Bu script
 * tüm PttAVM rotation query'lerini sırayla çalıştırır, her tur sonu bekler.
 *
 * Çalıştırma:
 *   node --env-file=.env.local scripts/scrape-pttavm-loop.mjs
 *   nohup node --env-file=.env.local scripts/scrape-pttavm-loop.mjs > /tmp/ptt-scrape.log 2>&1 &
 *
 * Durdurmak için: PID'i bul (ps -ef | grep scrape-pttavm), kill <PID>.
 */
const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";
const SECRET = process.env.INTERNAL_API_SECRET;
if (!SECRET) {
  console.error("INTERNAL_API_SECRET env yok");
  process.exit(1);
}

const PHONE_CAT  = "9f8b9ba9-ec64-4254-9e2c-b7d795d31ab7";
const LAPTOP_CAT = "1a988f7b-0510-4fee-bb03-a7cfa5e5c1dc";
const WATCH_CAT  = "f373d503-4637-425f-a9b8-3ecbe9637065";
const TV_CAT     = "2044ca2d-8b30-40e3-89bb-545018c35fa3";

const QUERIES = [
  // iPhone — yeni ve eski
  { query: "iphone 17 pro max",     category_id: PHONE_CAT },
  { query: "iphone 17 pro",         category_id: PHONE_CAT },
  { query: "iphone 17",             category_id: PHONE_CAT },
  { query: "iphone 17e",            category_id: PHONE_CAT },
  { query: "iphone 16 pro max",     category_id: PHONE_CAT },
  { query: "iphone 16 pro",         category_id: PHONE_CAT },
  { query: "iphone 16 plus",        category_id: PHONE_CAT },
  { query: "iphone 16",             category_id: PHONE_CAT },
  { query: "iphone 16e",            category_id: PHONE_CAT },
  { query: "iphone 15 pro max",     category_id: PHONE_CAT },
  { query: "iphone 15 pro",         category_id: PHONE_CAT },
  { query: "iphone 15 plus",        category_id: PHONE_CAT },
  { query: "iphone 15",             category_id: PHONE_CAT },
  // Samsung
  { query: "samsung galaxy s25",    category_id: PHONE_CAT },
  { query: "samsung galaxy s24",    category_id: PHONE_CAT },
  { query: "samsung galaxy a",      category_id: PHONE_CAT },
  // Diğer telefon
  { query: "xiaomi 15",             category_id: PHONE_CAT },
  { query: "huawei pura",           category_id: PHONE_CAT },
  { query: "redmi note",            category_id: PHONE_CAT },
  { query: "redmi note 15 pro",     category_id: PHONE_CAT },
  { query: "redmi note 14 pro",     category_id: PHONE_CAT },
  { query: "redmi note 13 pro",     category_id: PHONE_CAT },
  // Laptop
  { query: "macbook pro",           category_id: LAPTOP_CAT },
  { query: "macbook air",           category_id: LAPTOP_CAT },
  { query: "asus rog",              category_id: LAPTOP_CAT },
  { query: "lenovo thinkpad",       category_id: LAPTOP_CAT },
  { query: "laptop",                category_id: LAPTOP_CAT },
  // Akıllı saat
  { query: "apple watch series",    category_id: WATCH_CAT },
  { query: "apple watch ultra",     category_id: WATCH_CAT },
  { query: "samsung galaxy watch",  category_id: WATCH_CAT },
  { query: "akıllı saat",           category_id: WATCH_CAT },
  // TV
  { query: "televizyon",            category_id: TV_CAT },
];

const SLEEP_MS = 30_000; // 30 sn rate-limit koruma
const PAGES = [1, 2];

// SKIP_PHONE=1 ile telefon kategorisini atla (boş kategorilere odaklanmak için)
const SKIP_PHONE = process.env.SKIP_PHONE === "1";
const FILTERED_QUERIES = SKIP_PHONE
  ? QUERIES.filter((q) => q.category_id !== PHONE_CAT)
  : QUERIES;
if (SKIP_PHONE) {
  console.log(`[SKIP_PHONE=1] ${QUERIES.length - FILTERED_QUERIES.length} telefon query atlandı, ${FILTERED_QUERIES.length} kalan`);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function syncOne(task, page) {
  const res = await fetch(`${BASE_URL}/api/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": SECRET,
    },
    body: JSON.stringify({ source: "pttavm", ...task, page }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, status: res.status, body: text.slice(0, 200) };
  }
  const json = await res.json().catch(() => ({}));
  return { ok: true, ...json };
}

async function main() {
  let round = 0;
  while (true) {
    round++;
    console.log(`\n━━━ Round ${round} | ${new Date().toISOString()} ━━━`);
    let totalFetched = 0, totalInserted = 0, totalNew = 0;
    for (const task of FILTERED_QUERIES) {
      for (const page of PAGES) {
        const r = await syncOne(task, page);
        if (!r.ok) {
          console.log(`  ✗ "${task.query}" p${page} HTTP ${r.status} ${r.body}`);
        } else {
          const f = r.fetched ?? 0, i = r.inserted ?? 0, n = r.newProducts ?? 0;
          totalFetched += f; totalInserted += i; totalNew += n;
          console.log(`  ✓ "${task.query}" p${page} fetched=${f} inserted=${i} new=${n}`);
        }
        await sleep(SLEEP_MS);
      }
    }
    console.log(`\nRound ${round} TOTAL: fetched=${totalFetched} inserted=${totalInserted} new=${totalNew}`);
    console.log(`Sleeping 5 dakika next round için...`);
    await sleep(5 * 60_000);
  }
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
