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

function extractFromHtml(html) {
  const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!ld) return null;
  try {
    const j = JSON.parse(ld[1]);
    return {
      category: j.category || null,
      description: j.description || null,
      brand: j.brand?.name || null,
      sku: j.sku || null,
      mpn: j.mpn || null,
    };
  } catch {
    return null;
  }
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

  const specs = { ...(p.specs || {}) };
  if (data.category) specs.pttavm_category = data.category;
  if (data.mpn) specs.mpn = data.mpn;
  if (data.sku) specs.sku = data.sku;

  const update = { specs };
  if (data.description && data.description.length > 10) {
    update.description = data.description;
  }

  await sb.from("products").update(update).eq("id", p.id);
  return { status: "ok", category: data.category, hasDesc: !!data.description };
}

(async () => {
  const { data: products, error } = await sb
    .from("products")
    .select("id, title, source_url, description, specs")
    .eq("source", "pttavm")
    .not("source_url", "is", null)
    .is("description", null)
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
