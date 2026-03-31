import { createClient } from "@supabase/supabase-js";
import { createReadStream } from "fs";
import { createInterface } from "readline";

const SUPABASE_URL = "https://ugnxddvbrvjyzbqxmbdr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnbnhkZHZicnZqeXpicXhtYmRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwOTQ2OTYsImV4cCI6MjA4OTY3MDY5Nn0.ZSyfd-uONUgZ9GEfPLtPDplkeQdVLZlLiMk4Y0Nd4j0";
const ICECAT_USER = process.env.ICECAT_USERNAME || "0xstraub";
const ICECAT_PASS = process.env.ICECAT_PASSWORD || "Zafer21+";
const INDEX_FILE  = "scripts/icecat-index.xml";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Hangi supplier → kategori slug eşlemesi
const SUPPLIER_MAP = {
  "26":    { brand: "Samsung",   cat: "tv",       catids: ["222","1584","1331","1873","2672","194"] },
  "710":   { brand: "Apple",     cat: "telefon",  catids: ["1584","232","897","3174","2779","222"] },
  "11434": { brand: "Xiaomi",    cat: "telefon",  catids: ["1584","897","222","1331","2509","232"] },
  "3780":  { brand: "Huawei",    cat: "telefon",  catids: ["1584","232","897","3174","222"] },
  "728":   { brand: "Lenovo",    cat: "laptop",   catids: ["897","222","156","989","194","388"] },
  "1":     { brand: "HP",        cat: "laptop",   catids: ["897","156","159","989","194","222"] },
  "176":   { brand: "Asus",      cat: "laptop",   catids: ["897","194","222","388","400","989"] },
  "19":    { brand: "Dell",      cat: "laptop",   catids: ["897","194","222","989","388","400"] },
  "293":   { brand: "LG",        cat: "tv",       catids: ["222","1584","1331","1873","2672","194"] },
  "25":    { brand: "Philips",   cat: "tv",       catids: ["222","1584","194","195","1337","1873"] },
  "5":     { brand: "Sony",      cat: "kulaklik", catids: ["219","261","575","94","1060","193","232"] },
  "91":    { brand: "Logitech",  cat: "kulaklik", catids: ["388","396","400","486","219","786","261"] },
  "196":   { brand: "Jabra",     cat: "kulaklik", catids: ["219","261","543","1584","388","486"] },
  "1360":  { brand: "JBL",       cat: "kulaklik", catids: ["219","261","543","388","1873"] },
  "431":   { brand: "Bose",      cat: "kulaklik", catids: ["219","261","1873","388","543"] },
};

function makeSlug(str) {
  return str.toLowerCase()
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
    .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    + "-" + Math.random().toString(36).slice(2, 6);
}

function imageHash(url) {
  return url?.split("/").pop()?.split(".")[0] || "";
}

async function fetchIcecat(icecatId) {
  const auth = Buffer.from(`${ICECAT_USER}:${ICECAT_PASS}`).toString("base64");
  const url = `https://live.icecat.biz/api?UserName=${ICECAT_USER}&Language=EN&icecat_id=${icecatId}`;
  try {
    const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
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

// ──────────────────────────────────────────────
// ADIM 1: Placeholder görselli ürünleri bul ve sil
// ──────────────────────────────────────────────
async function deleteBadProducts() {
  const { data: all } = await supabase.from("products").select("id, title, brand, image_url, icecat_id, category_id");

  const hashCount = {};
  for (const p of all) {
    const h = imageHash(p.image_url);
    if (h) hashCount[h] = (hashCount[h] || 0) + 1;
  }

  const bad = all.filter(p => {
    const h = imageHash(p.image_url);
    return !p.image_url || (h && hashCount[h] > 1);
  });

  console.log(`🗑  ${bad.length} ürün silinecek (placeholder görsel):`);
  for (const p of bad) {
    console.log(`   - ${p.brand} | ${p.title?.slice(0, 45)}`);
  }

  if (bad.length === 0) return { deleted: [], goodHashes: new Set(), categories: [], existingIds: new Set() };

  const ids = bad.map(p => p.id);
  const { error } = await supabase.from("products").delete().in("id", ids);
  if (error) { console.log("❌ Silme hatası:", error.message); process.exit(1); }
  console.log(`\n✅ ${bad.length} ürün silindi\n`);

  // Silme sonrası kalan iyi hash'ler (yeni ürünlerde tekrar etmemeli)
  const good = all.filter(p => !ids.includes(p.id) && p.image_url);
  const goodHashes = new Set(good.map(p => imageHash(p.image_url)));

  // Var olan icecat_id'ler (tekrar import edilmemeli)
  const { data: remaining } = await supabase.from("products").select("icecat_id").not("icecat_id", "is", null);
  const existingIds = new Set((remaining || []).map(p => p.icecat_id));

  // Silinen ürünlerin brandlarına göre ihtiyaç listesi
  const brandNeeds = {};
  for (const p of bad) {
    brandNeeds[p.brand] = (brandNeeds[p.brand] || 0) + 1;
  }

  const { data: categories } = await supabase.from("categories").select("id, slug");
  return { deleted: bad, goodHashes, categories, existingIds, brandNeeds };
}

// ──────────────────────────────────────────────
// ADIM 2: İndex'ten aday ürünler topla (silinen markalar için)
// ──────────────────────────────────────────────
async function collectCandidates(brandNeeds, existingIds) {
  const needed = {};
  for (const [, { brand, catids }] of Object.entries(SUPPLIER_MAP)) {
    if (brandNeeds[brand]) {
      needed[brand] = { need: brandNeeds[brand] * 3, catids, candidates: [] }; // 3x fazla al, kötüler elenecek
    }
  }

  if (Object.keys(needed).length === 0) return {};

  console.log(`🔍 Index taranıyor (aday ürünler için)...`);

  const rl = createInterface({
    input: createReadStream(INDEX_FILE, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  let count = 0;
  for await (const line of rl) {
    if (line.startsWith("<file ")) {
      const supplierMatch = line.match(/Supplier_id="(\d+)"/);
      const productIdMatch = line.match(/Product_ID="(\d+)"/);
      const dateMatch = line.match(/Date_Added="(\d{4})/);
      const catidMatch = line.match(/Catid="(\d+)"/);

      if (supplierMatch && productIdMatch) {
        const info = SUPPLIER_MAP[supplierMatch[1]];
        const year = dateMatch ? parseInt(dateMatch[1]) : 0;
        const catid = catidMatch ? catidMatch[1] : "";
        const pid = productIdMatch[1];

        if (info && year >= 2020 && info.catids.includes(catid) && !existingIds.has(pid)) {
          const n = needed[info.brand];
          if (n && n.candidates.length < n.need) {
            n.candidates.push({ id: pid, cat: info.cat });
          }
        }
      }
    }
    count++;
    if (count % 1000000 === 0) process.stdout.write(`  ${count / 1000000}M satır...\r`);

    const allDone = Object.values(needed).every(n => n.candidates.length >= n.need);
    if (allDone) break;
  }

  console.log("\n");
  for (const [brand, n] of Object.entries(needed)) {
    console.log(`  ${brand}: ${n.candidates.length} aday bulundu (${n.need} aranıyordu)`);
  }
  return needed;
}

// ──────────────────────────────────────────────
// ADIM 3: Adayları tek tek çek, görseli benzersizse ekle
// ──────────────────────────────────────────────
async function importCandidates(needed, goodHashes, categories, existingIds, brandNeeds) {
  let added = 0;
  let skipped = 0;
  let failed = 0;

  // Her marka için kaç tane eklememiz gerekiyor
  const stillNeeded = { ...brandNeeds };

  console.log(`\n📥 Yeni ürünler import ediliyor...\n`);

  for (const [brand, { candidates, cat }] of Object.entries(needed)) {
    for (const { id, cat: candidateCat } of candidates) {
      if ((stillNeeded[brand] || 0) <= 0) break;

      process.stdout.write(`⏳ ${brand} #${id} `);
      const product = await fetchIcecat(id);
      await new Promise(r => setTimeout(r, 400));

      if (!product) { console.log("❌ API'den gelmedi"); failed++; continue; }

      const imgUrl = getBestImage(product);
      if (!imgUrl) { console.log("⚠️  Görsel yok"); skipped++; continue; }

      const hash = imageHash(imgUrl);
      if (goodHashes.has(hash)) { console.log("= Görsel zaten var, atlandı"); skipped++; continue; }

      const brandName = product.GeneralInfo?.BrandName || brand;
      const name = product.GeneralInfo?.ProductName || "";
      const title = `${brandName} ${name}`.trim();
      const slug = makeSlug(title);
      const description = product.GeneralInfo?.SummaryDescription?.LongSummaryDescription ||
                          product.GeneralInfo?.SummaryDescription?.ShortSummaryDescription || "";
      const specs = product.FeaturesGroups ? JSON.stringify(product.FeaturesGroups) : null;
      const usedCat = candidateCat || cat;
      const category = categories.find(c => c.slug === usedCat);

      const { error } = await supabase.from("products").insert({
        title, slug, brand: brandName, description,
        image_url: imgUrl, specs,
        icecat_id: String(id),
        category_id: category?.id || null,
      });

      if (error) {
        if (error.message.includes("unique")) {
          console.log("⚠️  Slug çakışması"); skipped++;
        } else {
          console.log(`❌ ${error.message}`); failed++;
        }
      } else {
        console.log(`✅ ${title.slice(0, 50)}`);
        goodHashes.add(hash); // Bu hash'i artık kullanma
        existingIds.add(String(id));
        stillNeeded[brand] = (stillNeeded[brand] || 1) - 1;
        added++;
      }
    }
  }

  return { added, skipped, failed };
}

// ──────────────────────────────────────────────
// ANA AKIŞ
// ──────────────────────────────────────────────
async function main() {
  console.log("🚀 Placeholder görsel düzeltme başlıyor...\n");

  // 1. Kötü ürünleri sil
  const { deleted, goodHashes, categories, existingIds, brandNeeds } = await deleteBadProducts();

  if (deleted.length === 0) {
    console.log("✅ Tüm görseller zaten benzersiz, yapacak bir şey yok!");
    return;
  }

  // 2. Aynı markalardan aday topla
  const needed = await collectCandidates(brandNeeds, existingIds);

  if (Object.keys(needed).length === 0) {
    console.log("⚠️  Hiç aday bulunamadı.");
    return;
  }

  // 3. Adayları import et
  const { added, skipped, failed } = await importCandidates(needed, goodHashes, categories, existingIds, brandNeeds);

  console.log(`\n🎉 Tamamlandı:`);
  console.log(`   🗑  ${deleted.length} kötü ürün silindi`);
  console.log(`   ✅ ${added} yeni ürün eklendi`);
  console.log(`   ⚠️  ${skipped} atlandı`);
  console.log(`   ❌ ${failed} hata`);
}

main().catch(console.error);
