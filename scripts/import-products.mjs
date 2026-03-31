import { createClient } from "@supabase/supabase-js";
import { createReadStream } from "fs";
import { createInterface } from "readline";

const SUPABASE_URL = "https://ugnxddvbrvjyzbqxmbdr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnbnhkZHZicnZqeXpicXhtYmRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwOTQ2OTYsImV4cCI6MjA4OTY3MDY5Nn0.ZSyfd-uONUgZ9GEfPLtPDplkeQdVLZlLiMk4Y0Nd4j0";
const ICECAT_USER = process.env.ICECAT_USERNAME || "0xstraub";
const ICECAT_PASS = process.env.ICECAT_PASSWORD || "Zafer21+";
const INDEX_FILE  = "scripts/icecat-index.xml";
const MAX_PER_KEY = 30; // Supplier+Category kombinasyonu başına max ürün

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Doğrulanmış Icecat Catid → DB Kategori Slug eşlemesi
// (find-catids.mjs çıktısından elde edildi)
const CATID_TO_SLUG = {
  "1893": "telefon",      // Smartphones
  "117":  "telefon",      // Telephones (akıllı)
  "151":  "laptop",       // Laptops
  "1584": "tv",           // TVs
  "1637": "ses",          // Headphones & Headsets
  "219":  "ses",          // Headsets (genel)
  "261":  "ses",          // Wireless Earbuds
  "1081": "ses",          // Loudspeakers/Hoparlörler
  "575":  "fotograf",     // Digital Cameras
  "588":  "fotograf",     // Camera Lenses
  "2647": "spor",         // Smartwatches & Sport Watches
  "193":  "oyun",         // Gaming Controllers
  "2898": "oyun",         // Head-Mounted Displays (VR)
  "897":  "laptop",       // Tablets (tablet yok, laptop'a koy)
  "222":  "tv",           // Monitors (TV ile birlikte)
  "2344": "tv",           // Portable TVs & Monitors
};

// Supplier ID → Marka adı
const SUPPLIERS = {
  "26":    "Samsung",
  "710":   "Apple",
  "5":     "Sony",
  "293":   "LG",
  "728":   "Lenovo",
  "1":     "HP",
  "176":   "Asus",
  "19":    "Dell",
  "11434": "Xiaomi",
  "3780":  "Huawei",
  "431":   "Bose",
  "1360":  "JBL",
  "91":    "Logitech",
  "196":   "Jabra",
  "21":    "Canon",
  "82":    "Nikon",
};

function makeSlug(str) {
  return str.toLowerCase()
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
    .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    + "-" + Math.random().toString(36).slice(2, 6);
}

async function getExistingIcecatIds() {
  const { data } = await supabase.from("products").select("icecat_id").not("icecat_id", "is", null);
  return new Set((data || []).map(p => p.icecat_id));
}

// Index'i tara, supplier+catid kombinasyonlarına göre ürün ID'leri topla
async function parseIndex(existingIds) {
  console.log("🔍 Index taranıyor...");
  const collected = {}; // "supplierId-catid" → [productId, ...]

  const rl = createInterface({
    input: createReadStream(INDEX_FILE, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  let lineCount = 0;
  let totalFound = 0;

  for await (const line of rl) {
    if (line.startsWith("<file ")) {
      const suppId = line.match(/Supplier_id="(\d+)"/)?.[1];
      const catid  = line.match(/Catid="(\d+)"/)?.[1];
      const pid    = line.match(/Product_ID="(\d+)"/)?.[1];
      const year   = line.match(/Date_Added="(\d{4})/)?.[1];

      if (suppId && catid && pid && SUPPLIERS[suppId] && CATID_TO_SLUG[catid]) {
        if (parseInt(year) >= 2021 && !existingIds.has(pid)) {
          const key = `${suppId}-${catid}`;
          if (!collected[key]) collected[key] = [];
          if (collected[key].length < MAX_PER_KEY) {
            collected[key].push(pid);
            totalFound++;
          }
        }
      }
    }
    lineCount++;
    if (lineCount % 2000000 === 0) {
      process.stdout.write(`  ${lineCount / 1000000}M satır... ${totalFound} ürün\r`);
    }
  }

  console.log(`\n✅ ${totalFound} aday ürün bulundu\n`);

  // Özet
  const byBrand = {};
  for (const [key, ids] of Object.entries(collected)) {
    const [suppId, catid] = key.split("-");
    const brand = SUPPLIERS[suppId];
    const slug  = CATID_TO_SLUG[catid];
    const k = `${brand}/${slug}`;
    byBrand[k] = (byBrand[k] || 0) + ids.length;
  }
  for (const [k, count] of Object.entries(byBrand).sort()) {
    console.log(`  ${k}: ${count}`);
  }
  console.log();

  return collected;
}

async function fetchIcecat(pid) {
  const auth = Buffer.from(`${ICECAT_USER}:${ICECAT_PASS}`).toString("base64");
  try {
    const res = await fetch(`https://live.icecat.biz/api?UserName=${ICECAT_USER}&Language=EN&icecat_id=${pid}`, {
      headers: { Authorization: `Basic ${auth}` }
    });
    if (!res.ok) return null;
    const d = await res.json();
    return d.data || null;
  } catch { return null; }
}

function getBestImage(product) {
  const img = product?.Image;
  if (!img) return null;
  return img.HighPic || img.Pic500x500 || img.LowPic || null;
}

async function main() {
  console.log("🚀 Import başlıyor...\n");

  const { data: categories } = await supabase.from("categories").select("id, slug");
  const catMap = Object.fromEntries(categories.map(c => [c.slug, c.id]));
  console.log("✅ Kategoriler:", Object.keys(catMap).join(", "), "\n");

  const existingIds = await getExistingIcecatIds();
  console.log(`ℹ️  Mevcut ${existingIds.size} ürün atlanacak\n`);

  const collected = await parseIndex(existingIds);

  // Görsel hash tracker — aynı görseli iki farklı ürüne koyma
  const usedImageHashes = new Set();

  let success = 0, skipped = 0, failed = 0;

  for (const [key, pids] of Object.entries(collected)) {
    const [suppId, catid] = key.split("-");
    const brand = SUPPLIERS[suppId];
    const slug  = CATID_TO_SLUG[catid];
    const categoryId = catMap[slug];

    for (const pid of pids) {
      process.stdout.write(`⏳ ${brand} [${slug}] #${pid} `);

      const product = await fetchIcecat(pid);
      await new Promise(r => setTimeout(r, 400));

      if (!product) { console.log("❌ API'den gelmedi"); failed++; continue; }

      const imgUrl = getBestImage(product);
      if (!imgUrl) { console.log("⚠️  Görsel yok"); skipped++; continue; }

      const imgHash = imgUrl.split("/").pop()?.split(".")[0] || "";
      if (usedImageHashes.has(imgHash)) { console.log("= Görsel tekrarı, atlandı"); skipped++; continue; }

      const brandName = product.GeneralInfo?.BrandName || brand;
      const name      = product.GeneralInfo?.ProductName || product.GeneralInfo?.Title || "";
      const title     = `${brandName} ${name}`.trim();
      const slug2     = makeSlug(title);
      const description = product.GeneralInfo?.SummaryDescription?.LongSummaryDescription ||
                          product.GeneralInfo?.SummaryDescription?.ShortSummaryDescription || "";
      const specs     = product.FeaturesGroups ? JSON.stringify(product.FeaturesGroups) : null;

      const { error } = await supabase.from("products").insert({
        title, slug: slug2, brand: brandName, description,
        image_url: imgUrl, specs,
        icecat_id: String(pid),
        category_id: categoryId || null,
      });

      if (error) {
        if (error.message.includes("unique")) { console.log("⚠️  Slug çakışması"); skipped++; }
        else { console.log(`❌ ${error.message}`); failed++; }
      } else {
        console.log(`✅ ${title.slice(0, 55)}`);
        usedImageHashes.add(imgHash);
        existingIds.add(String(pid));
        success++;
      }
    }
  }

  console.log(`\n🎉 Tamamlandı:`);
  console.log(`   ✅ ${success} ürün eklendi`);
  console.log(`   ⚠️  ${skipped} atlandı`);
  console.log(`   ❌ ${failed} hata`);
}

main().catch(console.error);
