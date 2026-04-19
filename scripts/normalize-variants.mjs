// Mevcut ürünler için model_family / variant_storage / variant_color alanlarını doldur
// node --env-file=.env.local scripts/normalize-variants.mjs [category-slug]

import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Türkçe + İngilizce renkler (uzundan kısaya sıralı — spesifik önce)
const COLORS = [
  "Natürel Titanyum", "Natural Titanyum", "Natural Titanium",
  "Beyaz Titanyum", "White Titanium",
  "Siyah Titanyum", "Black Titanium",
  "Çöl Titanyum", "Desert Titanium",
  "Ciol Titanyum", "Ciol Titanium",
  "Kozmik Turuncu", "Cosmic Orange",
  "Sis Mavisi", "Mist Blue",
  "Uzay Grisi", "Space Gray", "Space Grey",
  "Gece Siyahı", "Midnight Black",
  "Derin Mor", "Deep Purple",
  "Deep Blue", "Derin Mavi",
  "Jet Black", "Parlak Siyah",
  "Pearl White", "İnci Beyazı",
  "Lotus Blue", "Lotus Mavi",
  "Pink Gold", "Rose Gold",
  "Kırmızı", "Red",
  "Turuncu", "Orange",
  "Sarı", "Yellow",
  "Yeşil", "Green",
  "Mavi", "Blue",
  "Mor", "Purple",
  "Pembe", "Pink",
  "Gri", "Grey", "Gray",
  "Siyah", "Black",
  "Beyaz", "White",
  "Altın", "Gold",
  "Gümüş", "Silver",
  "Bej", "Beige",
  "Kahve", "Brown",
  "Lila", "Lilac", "Lavanta", "Lavender",
  "Bordo", "Burgundy",
  "Haki", "Khaki",
  "Lacivert", "Navy",
  "Teal", "Ultramarine",
  "Titanium", "Titanyum",
  "Abis", "Midnight", "Starlight", "Yıldız Işığı",
];

const STORAGE_RE = /\b(\d{1,3})\s*(GB|TB|gb|tb)\b/;

const BRAND_FAMILIES = {
  "Apple": [
    "iPhone 17 Pro Max", "iPhone 17 Pro", "iPhone 17 Plus", "iPhone 17",
    "iPhone 16 Pro Max", "iPhone 16 Pro", "iPhone 16 Plus", "iPhone 16e", "iPhone 16",
    "iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15 Plus", "iPhone 15",
    "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 14 Plus", "iPhone 14",
    "iPhone 13 Pro Max", "iPhone 13 Pro", "iPhone 13 mini", "iPhone 13",
    "iPhone 12 Pro Max", "iPhone 12 Pro", "iPhone 12 mini", "iPhone 12",
    "iPhone 11 Pro Max", "iPhone 11 Pro", "iPhone 11",
    "iPhone SE", "iPhone XS Max", "iPhone XS", "iPhone XR", "iPhone X",
  ],
  "Samsung": [
    "Galaxy S26 Ultra", "Galaxy S25 Ultra", "Galaxy S24 Ultra", "Galaxy S23 Ultra",
    "Galaxy S26 Plus", "Galaxy S25 Plus", "Galaxy S24 Plus", "Galaxy S23 Plus",
    "Galaxy S26 FE", "Galaxy S25 FE", "Galaxy S24 FE", "Galaxy S23 FE",
    "Galaxy S26", "Galaxy S25", "Galaxy S24", "Galaxy S23", "Galaxy S22",
    "Galaxy Z Fold", "Galaxy Z Flip",
    "Galaxy Note 20 Ultra", "Galaxy Note 20", "Galaxy Note 10", "Galaxy Note 9",
    "Galaxy A55", "Galaxy A54", "Galaxy A53", "Galaxy A35", "Galaxy A34",
    "Galaxy A26", "Galaxy A25", "Galaxy A24", "Galaxy A15", "Galaxy A14",
    "Galaxy A13", "Galaxy A12", "Galaxy A07", "Galaxy A06", "Galaxy A05",
    "Galaxy M55", "Galaxy M34", "Galaxy M15", "Galaxy M14",
  ],
  "Xiaomi": [
    "Redmi Note 14 Pro Plus", "Redmi Note 14 Pro", "Redmi Note 14",
    "Redmi Note 13 Pro Plus", "Redmi Note 13 Pro", "Redmi Note 13",
    "Redmi 14C", "Redmi 13C", "Redmi 12C",
    "Xiaomi 15 Pro", "Xiaomi 15", "Xiaomi 14 Pro", "Xiaomi 14", "Xiaomi 13 Pro", "Xiaomi 13",
    "Poco X7 Pro", "Poco X6 Pro", "Poco F6 Pro", "Poco F6", "Poco M6",
  ],
  "Huawei": [
    "Mate X6", "Mate 60 Pro Plus", "Mate 60 Pro", "Mate 60",
    "Pura 80 Ultra", "Pura 80 Pro Plus", "Pura 80 Pro", "Pura 80",
    "Pura 70 Ultra", "Pura 70 Pro Plus", "Pura 70 Pro", "Pura 70",
    "Nova 14 Pro", "Nova 14", "Nova 13 Pro", "Nova 13", "Nova 12",
  ],
};

function extractStorage(title) {
  const m = title.match(STORAGE_RE);
  if (!m) return null;
  return m[1] + m[2].toUpperCase();
}

function extractColor(title) {
  const t = title.toLowerCase();
  for (const c of COLORS) {
    if (t.includes(c.toLowerCase())) return c;
  }
  return null;
}

function extractModelFamily(title, brand) {
  const families = BRAND_FAMILIES[brand];
  if (!families) return null;
  const sorted = families.slice().sort((a, b) => b.length - a.length);
  const lc = title.toLowerCase();
  for (const f of sorted) {
    if (lc.includes(f.toLowerCase())) return f;
  }
  return null;
}

async function processBatch(rows) {
  const updates = [];
  for (const r of rows) {
    const storage = extractStorage(r.title);
    const color = extractColor(r.title);
    const family = extractModelFamily(r.title, r.brand);
    if (!storage && !color && !family) continue;
    updates.push({ id: r.id, update: { model_family: family, variant_storage: storage, variant_color: color } });
  }
  for (const u of updates) {
    await sb.from("products").update(u.update).eq("id", u.id);
  }
  return updates.length;
}

(async () => {
  const categorySlug = process.argv[2] || null;

  let query = sb.from("products").select("id, title, brand").is("model_family", null).limit(5000);

  if (categorySlug) {
    const { data: cat } = await sb.from("categories").select("id").eq("slug", categorySlug).single();
    if (cat) query = query.eq("category_id", cat.id);
  }

  const { data: products } = await query;

  if (!products?.length) {
    console.log("Güncellenecek ürün yok.");
    return;
  }

  console.log(`${products.length} ürün taranıyor...`);

  const BATCH = 200;
  let totalUpdated = 0;

  for (let i = 0; i < products.length; i += BATCH) {
    const batch = products.slice(i, i + BATCH);
    const n = await processBatch(batch);
    totalUpdated += n;
    const pct = ((i + batch.length) / products.length * 100).toFixed(0);
    process.stdout.write(`\r  [${pct}%] updated=${totalUpdated}`);
  }
  console.log(`\nDone. Toplam: ${totalUpdated}`);

  const { data: summary } = await sb
    .from("products")
    .select("brand, model_family")
    .not("model_family", "is", null)
    .limit(10000);

  const familyCounts = {};
  summary?.forEach(r => {
    const key = `${r.brand} ${r.model_family}`;
    familyCounts[key] = (familyCounts[key] || 0) + 1;
  });
  const sorted = Object.entries(familyCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.log("\nTop 10 model family:");
  sorted.forEach(([k, n]) => console.log(`  ${String(n).padStart(4)}  ${k}`));
})();
