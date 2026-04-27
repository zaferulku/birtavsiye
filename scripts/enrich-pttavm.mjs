// PttAVM ürünlerinin detay sayfalarından description + category çek
// node --env-file=.env.local scripts/enrich-pttavm.mjs [limit]
//
// JSON-LD schema'dan category, description, brand bilgisini çeker
// products.description'a yazar, specs.pttavm_category merge eder.
// Rate: 800ms/istek = ~75/dakika = 43k için ≈10 saat

import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DELAY_MS = 800;
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120",
  "Accept-Language": "tr-TR,tr;q=0.9",
};

const limit = parseInt(process.argv[2] || "100", 10);

// Elektronik kategorileri — öncelik bunlar
const ELEKTRONIK_IDS = [
  "9f8b9ba9-ec64-4254-9e2c-b7d795d31ab7", // akilli-telefon
  "f373d503-4637-425f-a9b8-3ecbe9637065", // akilli-saat
  "1a988f7b-0510-4fee-bb03-a7cfa5e5c1dc", // bilgisayar-laptop
  "f7465a62-ac44-4614-a65b-36b51c87fc85", // bilgisayar-bilesenleri
  "0f421871-f3db-438d-ab3f-2104daf88b2a", // tablet
  "2044ca2d-8b30-40e3-89bb-545018c35fa3", // tv
  "32faf798-439a-4fcc-a63f-134ad11161a0", // ses-kulaklik
  "778d77ff-006f-428e-82be-c584adfa6c60", // oyun-konsol
  "5bb18bbb-8fe8-4ecf-9aab-655d5637206f", // fotograf-kamera
  "89f22c9f-6622-46e8-b672-cfdfcc0a10c3", // ofis-elektronigi
  "5e53d648-7ce3-48e3-89aa-81330694747b", // yazici-tarayici
  "9def2d42-3d49-4bcd-a398-7c80d9cae043", // networking
  "97af4bfd-ed08-44b6-8f28-09131ae7920f", // telefon-aksesuar
  "5609a1ba-bfe8-4d08-b1ee-cc3a76f35cbf", // navigasyon
];

function extractMetaContent(html, pattern) {
  const m = html.match(pattern);
  if (!m) return null;
  return m[1]
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function extractFromHtml(html) {
  let category = null, description = null, brand = null, sku = null, mpn = null, merchant = null;

  const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (ld) {
    try {
      const j = JSON.parse(ld[1]);
      category = j.category || null;
      description = j.description || null;
      brand = j.brand?.name || null;
      sku = j.sku || null;
      mpn = j.mpn || null;
      merchant = j.offers?.seller?.name || null;
    } catch { /* ignore */ }
  }

  if (!description || description.length < 10) {
    description =
      extractMetaContent(html, /<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
      extractMetaContent(html, /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ||
      description;
  }

  if (!category && !description && !merchant) return null;
  return { category, description, brand, sku, mpn, merchant };
}

async function processOne(p) {
  const res = await fetch(p.source_url, {
    headers: HEADERS,
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return { status: "http-" + res.status };

  const html = await res.text();
  const data = extractFromHtml(html);
  if (!data) return { status: "no-ld" };

  // MM-source field oncelikli: specs'in MM key'leri (RAM/battery/screen_size vs.)
  // korunur (spread). PttAVM sadece kendi meta key'lerini (pttavm_category/mpn/sku/merchant)
  // ekler. Description: sadece mevcut yoksa yaz (MM description varsa OVERWRITE etme).
  const specs = { ...(p.specs || {}) };
  if (data.category) specs.pttavm_category = data.category;
  if (data.mpn) specs.mpn = data.mpn;
  if (data.sku) specs.sku = data.sku;
  if (data.merchant) specs.merchant = data.merchant;

  const update = { specs };
  if (data.description && data.description.length > 10
      && (!p.description || p.description.length < 10)) {
    update.description = data.description;
  }

  await sb.from("products").update(update).eq("id", p.id);
  return { status: "ok", category: data.category, hasDesc: !!data.description };
}

(async () => {
  // Backfill: elektronik + (merchant yok OR description yok)
  const { data: products, error } = await sb
    .from("products")
    .select("id, title, source_url, description, specs")
    .eq("source", "pttavm")
    .not("source_url", "is", null)
    .in("category_id", ELEKTRONIK_IDS)
    .or("description.is.null,specs->>merchant.is.null")
    .limit(limit);

  if (error) { console.error("ERR:", error.message); process.exit(1); }

  console.log(`Enriching ${products.length} PttAVM products from detail pages...`);

  let ok = 0, noLd = 0, httpErr = 0, exc = 0;
  const startTs = Date.now();

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    try {
      const r = await processOne(p);
      if (r.status === "ok") ok++;
      else if (r.status === "no-ld") noLd++;
      else httpErr++;
    } catch (e) {
      exc++;
    }

    if ((i + 1) % 25 === 0 || i === products.length - 1) {
      const pct = ((i + 1) / products.length * 100).toFixed(0);
      const elapsed = ((Date.now() - startTs) / 1000).toFixed(0);
      process.stdout.write(`\r  [${pct}%] ${i + 1}/${products.length} ok=${ok} no-ld=${noLd} http-err=${httpErr} exc=${exc} ${elapsed}s`);
    }
    await new Promise(r => setTimeout(r, DELAY_MS));
  }
  console.log(`\nDone. Total: ${ok} enriched, ${noLd} no-JSON-LD, ${httpErr} HTTP error, ${exc} exception.`);
})();
