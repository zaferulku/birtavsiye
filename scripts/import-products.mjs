import { createClient } from "@supabase/supabase-js";
import { createReadStream } from "fs";
import { createInterface } from "readline";

const SUPABASE_URL = "https://ugnxddvbrvjyzbqxmbdr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnbnhkZHZicnZqeXpicXhtYmRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwOTQ2OTYsImV4cCI6MjA4OTY3MDY5Nn0.ZSyfd-uONUgZ9GEfPLtPDplkeQdVLZlLiMk4Y0Nd4j0";
const ICECAT_USER = process.env.ICECAT_USERNAME || "0xstraub";
const ICECAT_PASS = process.env.ICECAT_PASSWORD || "Zafer21+";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const INDEX_FILE = "scripts/icecat-index.xml";
const MAX_PER_BRAND = 50;

// Icecat Supplier ID → { brand, cat (DB slug), catids (Icecat category IDs) }
const SUPPLIERS = {
  // === TELEFON ===
  "26":    { brand: "Samsung",   cat: "telefon",  catids: ["1584","897","222","2779","232","3174"] },
  "710":   { brand: "Apple",     cat: "telefon",  catids: ["1584","232","897","3174","2779","222"] },
  "11434": { brand: "Xiaomi",    cat: "telefon",  catids: ["1584","897","222","1331","2509","232"] },
  "3780":  { brand: "Huawei",    cat: "telefon",  catids: ["1584","232","897","3174","222"] },

  // === LAPTOP ===
  "728":   { brand: "Lenovo",    cat: "laptop",   catids: ["897","222","156","989","194","388"] },
  "1":     { brand: "HP",        cat: "laptop",   catids: ["897","156","159","989","194","222"] },
  "176":   { brand: "Asus",      cat: "laptop",   catids: ["897","194","222","388","400","989"] },
  "19":    { brand: "Dell",      cat: "laptop",   catids: ["897","194","222","989","388","400"] },
  "23":    { brand: "Acer",      cat: "laptop",   catids: ["897","194","222","989","156","388"] },
  "3":     { brand: "Microsoft", cat: "laptop",   catids: ["897","232","388","400","222","194"] },

  // === TV ===
  "293":   { brand: "LG",        cat: "tv",       catids: ["222","1584","1331","1873","2672","194"] },
  "25":    { brand: "Philips",   cat: "tv",       catids: ["222","1584","194","195","1337","1873"] },
  "7":     { brand: "Panasonic", cat: "tv",       catids: ["222","193","575","156","1873","195"] },

  // === KULAKLIK ===
  "5":     { brand: "Sony",      cat: "kulaklik", catids: ["219","261","575","94","1060","193","232"] },
  "91":    { brand: "Logitech",  cat: "kulaklik", catids: ["388","396","400","486","219","786","261"] },
  "196":   { brand: "Jabra",     cat: "kulaklik", catids: ["219","261","543","1584","388","486"] },
  "1360":  { brand: "JBL",       cat: "kulaklik", catids: ["219","261","543","388","1873"] },
  "431":   { brand: "Bose",      cat: "kulaklik", catids: ["219","261","1873","388","543"] },

  // === DİĞER ===
  "21":    { brand: "Canon",     cat: "diger",    catids: ["193","575","156","94","1060","486"] },
  "82":    { brand: "Nikon",     cat: "diger",    catids: ["193","575","94","1060","486"] },
  "342":   { brand: "Garmin",    cat: "diger",    catids: ["3174","2509","219","193","575"] },
  "1093":  { brand: "Dyson",     cat: "diger",    catids: ["3034","1337","194","222"] },
};

async function parseIndex() {
  console.log("🔍 Index parse ediliyor...");

  const brandProducts = {};
  for (const { brand } of Object.values(SUPPLIERS)) {
    brandProducts[brand] = [];
  }

  const rl = createInterface({
    input: createReadStream(INDEX_FILE, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  let count = 0;
  let totalFound = 0;

  for await (const line of rl) {
    if (line.startsWith("<file ")) {
      const supplierMatch = line.match(/Supplier_id="(\d+)"/);
      const productIdMatch = line.match(/Product_ID="(\d+)"/);
      const dateMatch = line.match(/Date_Added="(\d{4})/);
      const catidMatch = line.match(/Catid="(\d+)"/);

      if (supplierMatch && productIdMatch) {
        const supplierId = supplierMatch[1];
        const supplierInfo = SUPPLIERS[supplierId];
        const year = dateMatch ? parseInt(dateMatch[1]) : 0;
        const catid = catidMatch ? catidMatch[1] : "";

        if (supplierInfo && year >= 2020 && supplierInfo.catids.includes(catid)) {
          const { brand } = supplierInfo;
          if (brandProducts[brand].length < MAX_PER_BRAND) {
            brandProducts[brand].push(productIdMatch[1]);
            totalFound++;
          }
        }
      }
    }

    count++;
    if (count % 1000000 === 0) {
      process.stdout.write(`  ${count / 1000000}M satır... ${totalFound} ürün bulundu\r`);
    }

    const allFull = Object.values(brandProducts).every(ids => ids.length >= MAX_PER_BRAND);
    if (allFull) break;
  }

  console.log(`\n✅ Parse tamamlandı: ${totalFound} ürün bulundu`);
  return brandProducts;
}

async function fetchProduct(productId) {
  const auth = Buffer.from(`${ICECAT_USER}:${ICECAT_PASS}`).toString("base64");
  const url = `https://live.icecat.biz/api?UserName=${ICECAT_USER}&Language=EN&icecat_id=${productId}`;
  try {
    const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data || null;
  } catch (e) {
    return null;
  }
}

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

async function main() {
  console.log("🚀 Başlıyor...");
  console.log(`📦 ${Object.keys(SUPPLIERS).length} marka, marka başına max ${MAX_PER_BRAND} ürün\n`);

  const { data: categories, error } = await supabase.from("categories").select("id, slug");
  if (error) { console.log("❌ Supabase hatası:", error.message); return; }
  console.log("✅ Kategoriler:", categories.map(c => c.slug).join(", "));

  // Zaten import edilmiş ürünleri atla
  const existingIds = await getExistingIcecatIds();
  console.log(`ℹ️  Mevcut ${existingIds.size} ürün atlanacak\n`);

  const brandProducts = await parseIndex();

  console.log("\n📊 Bulunacak ürünler:");
  let total = 0;
  for (const [brand, ids] of Object.entries(brandProducts)) {
    const newIds = ids.filter(id => !existingIds.has(String(id)));
    console.log(`  ${brand}: ${ids.length} (${newIds.length} yeni)`);
    total += newIds.length;
  }
  console.log(`  TOPLAM: ${total} yeni ürün\n`);

  let success = 0;
  let fail = 0;
  let skipped = 0;

  for (const [, { brand, cat }] of Object.entries(SUPPLIERS)) {
    const ids = brandProducts[brand] || [];
    const category = categories.find(c => c.slug === cat);

    for (const id of ids) {
      if (existingIds.has(String(id))) { skipped++; continue; }

      process.stdout.write(`⏳ ${brand} #${id} `);
      const product = await fetchProduct(id);

      if (!product) { console.log("❌ Çekilemedi"); fail++; continue; }

      const brandName = product.GeneralInfo?.BrandName || brand;
      const name = product.GeneralInfo?.ProductName || "";
      const title = `${brandName} ${name}`.trim();
      const slug = makeSlug(title);
      const description = product.GeneralInfo?.SummaryDescription?.LongSummaryDescription ||
                          product.GeneralInfo?.SummaryDescription?.ShortSummaryDescription || "";
      const imageUrl = product.Image?.HighPic || product.Image?.LowPic || product.Image?.Pic500x500 || "";
      const specs = product.FeaturesGroups ? JSON.stringify(product.FeaturesGroups) : null;

      const { error: dbErr } = await supabase.from("products").insert({
        title, slug, brand: brandName, description,
        image_url: imageUrl, specs,
        icecat_id: String(id),
        category_id: category?.id || null,
      });

      if (dbErr) {
        if (dbErr.message.includes("unique")) {
          console.log(`⚠️  Slug çakışması, atlandı`);
          skipped++;
        } else {
          console.log(`❌ ${dbErr.message}`);
          fail++;
        }
      } else {
        console.log(`✅ ${title}`);
        success++;
      }

      await new Promise(r => setTimeout(r, 400));
    }
  }

  console.log(`\n🎉 Tamamlandı:`);
  console.log(`   ✅ ${success} ürün eklendi`);
  console.log(`   ⚠️  ${skipped} atlandı (zaten var veya slug çakışması)`);
  console.log(`   ❌ ${fail} hata`);
}

main().catch(console.error);
