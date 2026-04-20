// Garbage brand değerlerini temizle; title'dan bilinen marka listesi ile yeniden çıkar
// node --env-file=.env.local scripts/normalize-brands.mjs

import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BRANDS = {
  phone: [
    "iPhone", "Apple", "Samsung Galaxy", "Samsung", "Xiaomi", "Redmi", "Poco",
    "Huawei", "Honor", "Oppo", "Vivo", "Realme", "OnePlus", "Nokia", "TCL", "Reeder",
    "Tecno", "Infinix", "Sony", "LG", "Motorola", "Alcatel", "Casper", "General Mobile",
  ],
  tv: [
    "Samsung", "LG", "Philips", "Sony", "Panasonic", "Grundig", "Arçelik", "Beko",
    "Vestel", "Dijitsu", "Profilo", "Altus", "Premier", "Kumtel", "TCL", "Hisense",
    "Awox", "Next", "Sunny", "Regal", "Finlux", "Telefunken", "Toshiba", "Sharp",
    "Axen", "High Power",
  ],
  appliance: [
    "Bosch", "Siemens", "Arçelik", "Beko", "Vestel", "Profilo", "Altus", "Samsung",
    "LG", "Whirlpool", "Indesit", "Electrolux", "Candy", "Hoover", "Miele",
    "Arzum", "Fakir", "Karaca", "Tefal", "Philips", "Braun", "Silverline", "Franke",
    "Kumtel", "Luxell", "Simfer", "Finlux", "Dijitsu", "Hotpoint", "Ariston",
  ],
  laptop: [
    "MacBook", "Apple", "HP", "Dell", "Lenovo", "ASUS", "Asus", "Acer", "MSI",
    "Huawei", "Samsung", "Monster", "Casper", "LG", "Microsoft", "Razer",
    "Gigabyte", "Toshiba", "Fujitsu", "Xiaomi",
  ],
  audio: [
    "JBL", "Bose", "Sony", "Apple", "AirPods", "Beats", "Sennheiser", "AKG",
    "Philips", "Marshall", "Harman Kardon", "Boltune", "Samsung", "Logitech",
    "Razer", "Edifier", "Anker", "Soundcore", "Xiaomi", "Huawei", "Oppo", "Realme",
    "Nothing", "OnePlus", "HyperX", "SteelSeries", "Creative", "Yamaha",
  ],
  small_appliance: [
    "Tefal", "Philips", "Bosch", "Arzum", "Fakir", "Karaca", "Braun", "Delonghi",
    "Kenwood", "Moulinex", "Russell Hobbs", "Korkmaz", "Premier", "Kumtel",
    "Arçelik", "Beko", "Sinbo", "King", "Black Decker", "Rowenta", "Electrolux",
  ],
  fashion: [
    "Nike", "Adidas", "Puma", "Reebok", "Asics", "New Balance", "Converse",
    "Vans", "Skechers", "Timberland", "Under Armour", "Fila", "Kappa", "Columbia",
    "North Face", "Mavi", "Koton", "LC Waikiki", "Defacto", "DeFacto", "Mudo",
    "Beymen", "Polo", "Tommy Hilfiger", "Lacoste", "Calvin Klein", "Guess",
    "Levi's", "Wrangler", "H&M", "Zara", "Mango", "Only", "Vero Moda",
    "Pull & Bear", "Bershka", "Stradivarius", "U.S. Polo", "Jack & Jones",
    "Hugo Boss", "Diesel", "G-Star", "Ted Baker", "Armani", "Prada", "Gucci",
    "Versace", "Superga", "Geox",
  ],
  watch: [
    "Apple", "Samsung", "Huawei", "Xiaomi", "Amazfit", "Garmin", "Fitbit", "Casio",
    "Honor", "Realme", "Oppo", "Polar", "Suunto", "Withings", "Mibro",
  ],
  cosmetics: [
    "L'Oreal", "Loreal", "Maybelline", "NYX", "MAC", "Nars", "Urban Decay",
    "Nivea", "Dove", "Rexona", "Axe", "Old Spice", "Gillette", "Garnier",
    "Avon", "Oriflame", "Farmasi", "Flormar", "Gabrini", "Golden Rose",
    "Revlon", "Essence", "Catrice", "Bioderma", "La Roche-Posay", "Vichy",
    "Eucerin", "Cetaphil", "Neutrogena", "Olay", "Pantene", "Head & Shoulders",
    "Elseve", "Elvive", "Schwarzkopf", "Wella", "TRESemmé", "Palmolive",
  ],
  gaming: [
    "Sony", "Microsoft", "Nintendo", "Razer", "Logitech", "SteelSeries",
    "HyperX", "Corsair", "Redragon", "Rampage", "Gamepower", "Hadron",
  ],
  camera: [
    "Canon", "Nikon", "Sony", "Fujifilm", "Panasonic", "Olympus", "GoPro",
    "DJI", "Insta360", "Leica", "Pentax", "Sigma", "Tamron",
  ],
};

const ALL_BRANDS = [...new Set(Object.values(BRANDS).flat())].sort((a, b) => b.length - a.length);

const CAT_BRANDS = {
  "akilli-telefon": "phone",
  "tv": "tv",
  "bilgisayar-laptop": "laptop",
  "ses-kulaklik": "audio",
  "beyaz-esya": "appliance",
  "kucuk-ev-aletleri": "small_appliance",
  "tablet": "laptop",
  "akilli-saat": "watch",
  "fotograf-kamera": "camera",
  "oyun-konsol": "gaming",
  "makyaj": "cosmetics",
  "parfum": "cosmetics",
  "cilt-bakimi": "cosmetics",
  "sac-bakimi": "cosmetics",
  "kisisel-hijyen": "cosmetics",
  "erkek-bakimi": "cosmetics",
  "erkek-giyim": "fashion",
  "kadin-giyim": "fashion",
  "cocuk-giyim": "fashion",
  "bebek-giyim": "fashion",
  "spor-giyim": "fashion",
  "outdoor-giyim": "fashion",
  "ic-giyim": "fashion",
  "erkek-ayakkabi": "fashion",
  "kadin-ayakkabi": "fashion",
  "canta-cuzdan": "fashion",
};

function isGarbageBrand(b) {
  if (!b) return true;
  const t = b.trim();
  if (t.length < 2 || t.length > 30) return true;
  if (/^[0-9]/.test(t)) return true;
  if (/^[®™©%&*\-_|\s/\\.]/.test(t)) return true;
  if (/^[0-9.]+$/.test(t)) return true;
  if (/^\d+[a-zA-Z]+\b/i.test(t)) return true;
  if (/[®™]/.test(t)) return true;
  return false;
}

function extractBrand(title, brandList) {
  if (!title) return null;
  for (const b of brandList) {
    const re = new RegExp(`\\b${b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(title)) return b;
  }
  return null;
}

async function fetchCatMap() {
  const { data } = await sb.from("categories").select("id, slug");
  return new Map(data.map(c => [c.id, c.slug]));
}

(async () => {
  const catMap = await fetchCatMap();

  let totalFixed = 0, totalTrimmed = 0, totalUnchanged = 0, totalSkipped = 0;
  const brandCounts = {};

  for (let page = 0; page < 60; page++) {
    const { data } = await sb
      .from("products")
      .select("id, brand, title, category_id")
      .range(page * 1000, page * 1000 + 999);

    if (!data || data.length === 0) break;

    for (const p of data) {
      const catSlug = catMap.get(p.category_id);
      const brandKey = CAT_BRANDS[catSlug];
      const candidateList = brandKey ? BRANDS[brandKey] : ALL_BRANDS;

      const rawBrand = p.brand;
      const trimmed = rawBrand?.trim() ?? null;

      // Case 1: valid non-garbage, but has whitespace — trim
      if (trimmed && !isGarbageBrand(trimmed) && trimmed !== rawBrand) {
        await sb.from("products").update({ brand: trimmed }).eq("id", p.id);
        totalTrimmed++;
        brandCounts[trimmed] = (brandCounts[trimmed] || 0) + 1;
        continue;
      }

      // Case 2: already valid
      if (trimmed && !isGarbageBrand(trimmed)) {
        totalUnchanged++;
        continue;
      }

      // Case 3: garbage or null — extract from title
      const extracted = extractBrand(p.title, candidateList);
      if (extracted) {
        await sb.from("products").update({ brand: extracted }).eq("id", p.id);
        totalFixed++;
        brandCounts[extracted] = (brandCounts[extracted] || 0) + 1;
      } else {
        totalSkipped++;
      }
    }

    if (data.length < 1000) break;
    if ((page + 1) % 5 === 0) {
      process.stdout.write(`\r  page ${page + 1}: fixed=${totalFixed} trimmed=${totalTrimmed} skipped=${totalSkipped}`);
    }
  }

  console.log(`\n\nFixed: ${totalFixed}, Trimmed: ${totalTrimmed}, Unchanged: ${totalUnchanged}, Skipped: ${totalSkipped}`);
  console.log("\nTop brands updated:");
  Object.entries(brandCounts).sort((a, b) => b[1] - a[1]).slice(0, 30).forEach(([k, v]) => {
    console.log(`  ${String(v).padStart(5)}  ${k}`);
  });
})();
