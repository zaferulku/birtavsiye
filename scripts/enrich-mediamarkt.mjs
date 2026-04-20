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
    .in("category_id", ELEKTRONIK_IDS)
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
