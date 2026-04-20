// MediaMarkt detay sayfasından breadcrumb kategorisi çek
// node --env-file=.env.local scripts/enrich-mediamarkt.mjs [limit]

import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DELAY_MS = 1200;
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120",
  "Accept-Language": "tr-TR,tr;q=0.9",
};

const limit = parseInt(process.argv[2] || "50", 10);

function extractCategory(html) {
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      const j = JSON.parse(m[1]);
      if (j["@type"] === "BreadcrumbList" && Array.isArray(j.itemListElement)) {
        const names = j.itemListElement.map(e => e.name).filter(n => n && n !== "home");
        return {
          path: names.join(" > "),
          category: names[names.length - 2] || names[names.length - 1] || null,
        };
      }
    } catch { /* skip */ }
  }
  return null;
}

function extractSpecs(html) {
  const specs = {};
  const re = /<tr[^>]*><td[^>]*><p[^>]*>([^<]+)<\/p><\/td><td[^>]*><p[^>]*>([^<]+)<\/p><\/td><\/tr>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const key = m[1].trim();
    const val = m[2].trim();
    if (key && val && val.length < 200) specs[key] = val;
  }
  const KEEP = [
    "Ekran Boyutu (inç)",
    "Ekran boyutu cm / inç",
    "Mobil Telefon Standardı",
    "İşlemci",
    "Bellek Kapasitesi",
    "Pil Kapasitesi",
    "RAM Kapasitesi",
    "Arka Kamera",
    "Ön Kamera",
    "İşletim Sistemi",
    "Çıkış Tarihi",
    "Ağırlık",
    "SIM-kart boyutu",
    "Çift SİM",
    "WİFİ",
    "Renk (Üreticiye Göre)",
    "Ürün Tipi",
  ];
  const filtered = {};
  for (const k of KEEP) if (specs[k]) filtered[k] = specs[k];
  return filtered;
}

async function processOne(p) {
  const res = await fetch(p.source_url, {
    headers: HEADERS,
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) return { status: "http-" + res.status };

  const html = await res.text();
  const data = extractCategory(html);
  const techSpecs = extractSpecs(html);

  if (!data && Object.keys(techSpecs).length === 0) return { status: "no-breadcrumb" };

  const specs = { ...(p.specs || {}) };
  if (data?.category) specs.mediamarkt_category = data.category;
  if (data?.path) specs.mediamarkt_path = data.path;
  Object.assign(specs, techSpecs);

  await sb.from("products").update({ specs }).eq("id", p.id);
  return { status: "ok", category: data?.category, specsCount: Object.keys(techSpecs).length };
}

(async () => {
  // specs->Ürün Tipi yoksa re-enrich et (yeni tech specs extraction)
  const { data: products, error } = await sb
    .from("products")
    .select("id, title, source_url, specs")
    .eq("source", "mediamarkt")
    .not("source_url", "is", null)
    .is("specs->Ürün Tipi", null)
    .limit(limit);

  if (error) { console.error("ERR:", error.message); process.exit(1); }

  console.log(`Enriching ${products.length} MediaMarkt products...`);

  let ok = 0, noBc = 0, httpErr = 0, exc = 0;
  const startTs = Date.now();

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    try {
      const r = await processOne(p);
      if (r.status === "ok") ok++;
      else if (r.status === "no-breadcrumb") noBc++;
      else httpErr++;
    } catch (e) {
      exc++;
    }

    if ((i + 1) % 25 === 0 || i === products.length - 1) {
      const pct = ((i + 1) / products.length * 100).toFixed(0);
      const elapsed = ((Date.now() - startTs) / 1000).toFixed(0);
      process.stdout.write(`\r  [${pct}%] ${i + 1}/${products.length} ok=${ok} no-bc=${noBc} http-err=${httpErr} exc=${exc} ${elapsed}s`);
    }
    await new Promise(r => setTimeout(r, DELAY_MS));
  }
  console.log(`\nDone. Total: ${ok} enriched, ${noBc} no-breadcrumb, ${httpErr} HTTP error, ${exc} exception.`);
})();
