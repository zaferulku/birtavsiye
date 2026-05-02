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
 *
 * P6.22-F: kategori-bazli genisletme. Eski hâlinde 30 keyword (telefon/laptop/
 * saat/TV) tariyordu; ~60 kategoride orphan urun vardi. Bu surumde:
 *   - Boot phase: DB'den slug -> id map fetch (categories tablosu)
 *   - QUERIES: 30+ yeni kategori task'i (category_slug ile)
 *   - syncOne: category_id veya slugToId[category_slug] resolve
 */
import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";
const SECRET = process.env.INTERNAL_API_SECRET;
if (!SECRET) {
  console.error("INTERNAL_API_SECRET env yok");
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Supabase env yok (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const PHONE_CAT  = "9f8b9ba9-ec64-4254-9e2c-b7d795d31ab7";
const LAPTOP_CAT = "1a988f7b-0510-4fee-bb03-a7cfa5e5c1dc";
const WATCH_CAT  = "f373d503-4637-425f-a9b8-3ecbe9637065";
const TV_CAT     = "2044ca2d-8b30-40e3-89bb-545018c35fa3";

// QUERIES: { query, category_id?, category_slug? }
// category_id direkt UUID, category_slug ise boot phase'de resolve edilir.
const QUERIES = [
  // === ELEKTRONIK / TELEFON ===
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
  { query: "samsung galaxy s25",    category_id: PHONE_CAT },
  { query: "samsung galaxy s24",    category_id: PHONE_CAT },
  { query: "samsung galaxy a",      category_id: PHONE_CAT },
  { query: "xiaomi 15",             category_id: PHONE_CAT },
  { query: "huawei pura",           category_id: PHONE_CAT },
  { query: "redmi note",            category_id: PHONE_CAT },
  { query: "redmi note 15 pro",     category_id: PHONE_CAT },
  { query: "redmi note 14 pro",     category_id: PHONE_CAT },
  { query: "redmi note 13 pro",     category_id: PHONE_CAT },

  // === ELEKTRONIK / BILGISAYAR-TABLET ===
  { query: "macbook pro",           category_id: LAPTOP_CAT },
  { query: "macbook air",           category_id: LAPTOP_CAT },
  { query: "asus rog",              category_id: LAPTOP_CAT },
  { query: "lenovo thinkpad",       category_id: LAPTOP_CAT },
  { query: "laptop",                category_id: LAPTOP_CAT },
  { query: "ipad",                  category_slug: "elektronik/bilgisayar-tablet/tablet" },
  { query: "samsung galaxy tab",    category_slug: "elektronik/bilgisayar-tablet/tablet" },
  { query: "ekran kartı",           category_slug: "elektronik/bilgisayar-tablet/bilesenler" },
  { query: "ssd",                   category_slug: "elektronik/bilgisayar-tablet/bilesenler" },
  { query: "ram bellek",            category_slug: "elektronik/bilgisayar-tablet/bilesenler" },

  // === ELEKTRONIK / AKILLI SAAT ===
  { query: "apple watch series",    category_id: WATCH_CAT },
  { query: "apple watch ultra",     category_id: WATCH_CAT },
  { query: "samsung galaxy watch",  category_id: WATCH_CAT },
  { query: "akıllı saat",           category_id: WATCH_CAT },

  // === ELEKTRONIK / TV-SES-GORUNTU ===
  { query: "televizyon",            category_id: TV_CAT },
  { query: "kulaklık",              category_slug: "elektronik/tv-ses-goruntu/kulaklik" },
  { query: "airpods pro",           category_slug: "elektronik/tv-ses-goruntu/kulaklik" },
  { query: "bose kulaklık",         category_slug: "elektronik/tv-ses-goruntu/kulaklik" },
  { query: "bluetooth hoparlör",    category_slug: "elektronik/tv-ses-goruntu/bluetooth-hoparlor" },

  // === ELEKTRONIK / OYUN ===
  { query: "playstation 5",         category_slug: "elektronik/oyun/konsol" },
  { query: "xbox series",           category_slug: "elektronik/oyun/konsol" },
  { query: "nintendo switch",       category_slug: "elektronik/oyun/konsol" },

  // === ELEKTRONIK / KAMERA ===
  { query: "canon kamera",          category_slug: "elektronik/kamera/fotograf-makinesi" },
  { query: "nikon kamera",          category_slug: "elektronik/kamera/fotograf-makinesi" },
  { query: "sony alpha",            category_slug: "elektronik/kamera/fotograf-makinesi" },

  // === KUCUK EV ALETLERI ===
  { query: "saç kurutma makinesi",  category_slug: "kucuk-ev-aletleri/kisisel-bakim/sac-kurutma" },
  { query: "saç düzleştirici",      category_slug: "kucuk-ev-aletleri/kisisel-bakim/sac-kurutma" },
  { query: "blender",               category_slug: "kucuk-ev-aletleri/mutfak/blender" },
  { query: "tost makinesi",         category_slug: "kucuk-ev-aletleri/mutfak/tost-makinesi" },
  { query: "kahve makinesi",        category_slug: "kucuk-ev-aletleri/mutfak/kahve-makinesi" },

  // === BEYAZ ESYA ===
  { query: "çamaşır makinesi",      category_slug: "beyaz-esya/camasir-makinesi" },
  { query: "buzdolabı",             category_slug: "beyaz-esya/buzdolabi" },
  { query: "bulaşık makinesi",      category_slug: "beyaz-esya/bulasik-makinesi" },

  // === KOZMETIK ===
  { query: "yüz kremi",             category_slug: "kozmetik/cilt-bakim" },
  { query: "serum cilt",            category_slug: "kozmetik/cilt-bakim" },
  { query: "ruj",                   category_slug: "kozmetik/makyaj" },
  { query: "fondöten",              category_slug: "kozmetik/makyaj" },
  { query: "parfüm",                category_slug: "kozmetik/parfum" },

  // === SPOR-OUTDOOR ===
  { query: "yoga matı",             category_slug: "spor-outdoor/fitness" },
  { query: "dumbell",               category_slug: "spor-outdoor/fitness" },
  { query: "çadır",                 category_slug: "spor-outdoor/kamp" },
  { query: "uyku tulumu",           category_slug: "spor-outdoor/kamp" },

  // === EV-YASAM ===
  { query: "led ampul",             category_slug: "ev-yasam/aydinlatma" },
  { query: "lambader",              category_slug: "ev-yasam/aydinlatma" },

  // === PET SHOP ===
  { query: "kedi maması",           category_slug: "pet-shop/kedi-mamasi" },
  { query: "köpek maması",          category_slug: "pet-shop/kopek-mamasi" },

  // === ANNE-BEBEK ===
  { query: "bebek bezi",            category_slug: "anne-bebek/bebek-bezi" },
  { query: "biberon",               category_slug: "anne-bebek/beslenme" },
  { query: "bebek arabası",         category_slug: "anne-bebek/bebek-arabasi" },

  // === SUPERMARKET ===
  { query: "filtre kahve",          category_slug: "supermarket/kahve" },
  { query: "espresso",              category_slug: "supermarket/kahve" },

  // === MODA — sadece buyuk markalar (kullanici karari 2026-05-02) ===
  // PTT moda kategorisinde generic/kucuk marka query'leri orphan uretme riski
  // tasiyor (kirli urun). Whitelist: nike, adidas, converse, puma, vans,
  // new balance, reebok, asics. Diger markalar bu sprint'te scrape edilmez.
  { query: "nike sneaker",          category_slug: "moda/erkek-ayakkabi/sneaker" },
  { query: "nike kadin sneaker",    category_slug: "moda/kadin-ayakkabi/sneaker" },
  { query: "nike esofman",          category_slug: "moda/erkek-giyim/esofman" },
  { query: "adidas sneaker",        category_slug: "moda/erkek-ayakkabi/sneaker" },
  { query: "adidas kadin sneaker",  category_slug: "moda/kadin-ayakkabi/sneaker" },
  { query: "adidas esofman",        category_slug: "moda/erkek-giyim/esofman" },
  { query: "converse",              category_slug: "moda/erkek-ayakkabi/sneaker" },
  { query: "converse kadin",        category_slug: "moda/kadin-ayakkabi/sneaker" },
  { query: "puma sneaker",          category_slug: "moda/erkek-ayakkabi/sneaker" },
  { query: "puma kadin",            category_slug: "moda/kadin-ayakkabi/sneaker" },
  { query: "vans",                  category_slug: "moda/erkek-ayakkabi/sneaker" },
  { query: "new balance",           category_slug: "moda/erkek-ayakkabi/sneaker" },
  { query: "reebok",                category_slug: "moda/erkek-ayakkabi/sneaker" },
  { query: "asics",                 category_slug: "moda/erkek-ayakkabi/sneaker" },
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
  // P6.22-F: category_slug -> category_id resolve (boot phase'de doldurulur)
  const categoryId = task.category_id ?? slugToId.get(task.category_slug);
  if (!categoryId && task.category_slug) {
    return { ok: false, status: 0, body: `unresolved_slug:${task.category_slug}` };
  }
  const payload = {
    source: "pttavm",
    query: task.query,
    category_id: categoryId,
    page,
  };
  const res = await fetch(`${BASE_URL}/api/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": SECRET,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, status: res.status, body: text.slice(0, 200) };
  }
  const json = await res.json().catch(() => ({}));
  return { ok: true, ...json };
}

// P6.22-F: kategori slug -> id map (boot phase'de doldurulur)
const slugToId = new Map();

async function bootCategoryMap() {
  const { data, error } = await sb
    .from("categories")
    .select("id, slug")
    .eq("is_active", true);
  if (error) {
    console.error("Boot phase: kategori fetch fail:", error.message);
    process.exit(1);
  }
  for (const row of data ?? []) {
    slugToId.set(row.slug, row.id);
  }
  console.log(`Boot: ${slugToId.size} kategori map'lendi.`);

  // QUERIES'deki tum category_slug'lari verify et — eksikse uyari ver
  const missing = [];
  for (const q of QUERIES) {
    if (q.category_slug && !slugToId.has(q.category_slug)) {
      missing.push(q.category_slug);
    }
  }
  if (missing.length > 0) {
    const uniq = [...new Set(missing)];
    console.warn(`[WARN] DB'de bulunamayan ${uniq.length} slug, bu query'ler her round skip:`);
    uniq.forEach((s) => console.warn(`  - ${s}`));
  }
}

async function main() {
  await bootCategoryMap();
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
