/**
 * P6.2a ADIM 1 — SOURCE_CATEGORY_MAP audit.
 *
 * Source: src/lib/scrapers/scrapeClassifier.ts:23-91 SOURCE_CATEGORY_MAP
 * Method: validateOrFuzzyMatchSlug benzeri leaf-suffix match (Phase 5C helper)
 *
 * Output: scripts/scrape-classifier-map-audit.json
 *
 * Run: node --env-file=.env.local scripts/build-scrape-classifier-audit.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  const env = readFileSync(".env.local", "utf8");
  env.split(/\r?\n/).forEach((l) => {
    const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  });
}

const SOURCE_CATEGORY_MAP = {
  "Android Telefonlar": "akilli-telefon",
  "iPhone 11": "akilli-telefon",
  "iPhone 14 Pro Max": "akilli-telefon",
  "iPhone 17 Pro Max": "akilli-telefon",
  "Galaxy A": "akilli-telefon",
  "Galaxy S": "akilli-telefon",
  "Galaxy Z": "akilli-telefon",
  "Samsung Telefon": "akilli-telefon",
  "General Mobile Telefon": "akilli-telefon",
  "Casper Laptop": "laptop",
  "HP Laptop": "laptop",
  "Asus Laptop": "laptop",
  "Acer Laptop": "laptop",
  "Huawei Laptop": "laptop",
  "Lenovo Laptop": "laptop",
  "Lenovo Laptop Modelleri": "laptop",
  Laptop: "laptop",
  "Akıllı Saatler": "akilli-saat",
  "Bilicra Akıllı Saat": "akilli-saat",
  "Android Tabletler": "tablet",
  Tabletler: "tablet",
  Blender: "blender",
  "Kahve Makinesi": "kahve-makinesi",
  "Espresso Kahve Makineleri": "kahve-makinesi",
  "Filtre Kahve Makineleri": "kahve-makinesi",
  "Robot Süpürge": "robot-supurge",
  "Ankastre Fırın": "firin",
  "Ankastre Bulaşık Makineleri": "bulasik-makinesi",
  "Çamaşır Makineleri": "camasir-makinesi",
  Buzdolabi: "buzdolabi",
  Klimalar: "klima",
  "Taşınabilir Şarj Cihazları": "powerbank",
  "MagSafe Powerbank": "powerbank",
  "Ttec Powerbank": "powerbank",
  "Ugreen Powerbank": "powerbank",
  Drone: "drone",
  "Oyun Konsolları": "oyun-konsol",
  "akilli-telefon": "akilli-telefon",
  "telefon-kilifi": "telefon-kilifi",
  "telefon-yedek-parca": "telefon-yedek-parca",
  "telefon-aksesuar": "telefon-aksesuar",
  "ekran-koruyucu": "ekran-koruyucu",
  "sarj-kablo": "sarj-kablo",
  "akilli-saat": "akilli-saat",
  "kahve-makinesi": "kahve-makinesi",
  buzdolabi: "buzdolabi",
  "tost-makinesi": "tost-makinesi",
  televizyon: "tv",
  "tv-aksesuar": "tv-aksesuar",
  "fotograf-kamera": "fotograf-kamera",
  "guvenlik-kamerasi": "guvenlik-kamerasi",
  "bilgisayar-bilesenleri": "bilgisayar-bilesenleri",
};

// Manuel mapping: leaf-suffix auto-match başarısız olanlar (5D-3.3 + 029 audit'iyle uyumlu)
const MANUAL_MAPPINGS = {
  "telefon-kilifi": "elektronik/telefon/kilif",
  "telefon-yedek-parca": "elektronik/telefon/yedek-parca",
  "telefon-aksesuar": "elektronik/telefon/aksesuar",
  "fotograf-kamera": "elektronik/kamera",
  "guvenlik-kamerasi": "elektronik/ag-guvenlik/guvenlik-kamera",
  "bilgisayar-bilesenleri": "elektronik/bilgisayar-tablet/bilesenler",
  tv: "elektronik/tv-ses-goruntu/televizyon",
  firin: "beyaz-esya/firin-ocak",
  blender: "kucuk-ev-aletleri/mutfak/blender",
  "robot-supurge": "kucuk-ev-aletleri/temizlik/robot-supurge",
  "oyun-konsol": "elektronik/oyun/konsol",
};

const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const { data: rows, error } = await sb.from("categories").select("slug");
if (error) {
  console.error("DB fetch fail:", error.message);
  process.exit(1);
}
const taxonomy = new Set(rows.map((r) => r.slug));

const proposed = {};
const ambiguous = [];
const unmatched = [];

for (const [key, value] of Object.entries(SOURCE_CATEGORY_MAP)) {
  const direct = [];
  for (const t of taxonomy) {
    if (t === value || t.endsWith("/" + value)) direct.push(t);
  }

  if (direct.length === 1) {
    proposed[key] = direct[0];
    continue;
  }
  if (direct.length === 0) {
    if (MANUAL_MAPPINGS[value] && taxonomy.has(MANUAL_MAPPINGS[value])) {
      proposed[key] = MANUAL_MAPPINGS[value];
    } else {
      unmatched.push({ key, value, reason: "no DB match (manual override yok)" });
    }
    continue;
  }
  if (MANUAL_MAPPINGS[value] && taxonomy.has(MANUAL_MAPPINGS[value])) {
    proposed[key] = MANUAL_MAPPINGS[value];
  } else {
    ambiguous.push({
      key,
      value,
      reason: `ambiguous (${direct.length} matches)`,
      candidates: direct,
    });
  }
}

const output = {
  _meta: {
    total: Object.keys(SOURCE_CATEGORY_MAP).length,
    matched: Object.keys(proposed).length,
    ambiguous: ambiguous.length,
    unmatched: unmatched.length,
    generated_at: new Date().toISOString(),
  },
  current: SOURCE_CATEGORY_MAP,
  proposed,
  ambiguous,
  unmatched,
};

writeFileSync(
  "scripts/scrape-classifier-map-audit.json",
  JSON.stringify(output, null, 2),
);

console.log(`=== SOURCE_CATEGORY_MAP AUDIT ===`);
console.log(`Total: ${output._meta.total}`);
console.log(`Matched (proposed): ${output._meta.matched}`);
console.log(`Ambiguous: ${output._meta.ambiguous}`);
console.log(`Unmatched: ${output._meta.unmatched}\n`);

console.log(`--- PROPOSED MAPPING (full liste) ---`);
for (const [k, v] of Object.entries(proposed)) {
  console.log(`  "${k}" → "${v}"`);
}

if (ambiguous.length > 0) {
  console.log(`\n--- AMBIGUOUS ---`);
  for (const a of ambiguous) {
    console.log(`  "${a.key}" → "${a.value}" (${a.reason})`);
    for (const c of a.candidates) console.log(`    candidate: ${c}`);
  }
}

if (unmatched.length > 0) {
  console.log(`\n--- UNMATCHED ---`);
  for (const u of unmatched) {
    console.log(`  "${u.key}" → "${u.value}" — ${u.reason}`);
  }
}

console.log(`\nWrote: scripts/scrape-classifier-map-audit.json`);
