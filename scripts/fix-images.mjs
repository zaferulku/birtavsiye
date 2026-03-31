import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ugnxddvbrvjyzbqxmbdr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnbnhkZHZicnZqeXpicXhtYmRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwOTQ2OTYsImV4cCI6MjA4OTY3MDY5Nn0.ZSyfd-uONUgZ9GEfPLtPDplkeQdVLZlLiMk4Y0Nd4j0";
const ICECAT_USER = process.env.ICECAT_USERNAME || "0xstraub";
const ICECAT_PASS = process.env.ICECAT_PASSWORD || "Zafer21+";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Bir hash'in kaç üründe tekrarlandığına bak — tekrarlananlar placeholder
async function findDuplicateImages() {
  const { data } = await supabase.from("products").select("id, title, image_url, icecat_id");
  const hashCount = {};
  for (const p of data) {
    const hash = p.image_url?.split("/").pop()?.split(".")[0] || "";
    hashCount[hash] = (hashCount[hash] || 0) + 1;
  }
  // 2'den fazla üründe görünen hash'ler placeholder
  const placeholderHashes = new Set(Object.entries(hashCount).filter(([, c]) => c > 1).map(([h]) => h));
  console.log(`🔍 ${placeholderHashes.size} adet tekrarlanan (placeholder) görsel hash'i bulundu`);
  return { data, placeholderHashes };
}

async function fetchIcecatProduct(icecatId) {
  const auth = Buffer.from(`${ICECAT_USER}:${ICECAT_PASS}`).toString("base64");
  const url = `https://live.icecat.biz/api?UserName=${ICECAT_USER}&Language=EN&icecat_id=${icecatId}`;
  try {
    const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data || null;
  } catch {
    return null;
  }
}

function getBestImage(product) {
  const img = product?.Image;
  if (!img) return null;

  // Öncelik sırası: HighPic > Pic500x500 > LowPic
  // Icecat bazen gallery resmi yerine gerçek ürün resmini farklı alanlarda verir
  const candidates = [
    img.HighPic,
    img.Pic500x500,
    img.LowPic,
  ].filter(Boolean);

  // Gallery URL'leri dışında bir URL varsa onu tercih et
  const nonGallery = candidates.find(u => !u.includes("/img/gallery/"));
  if (nonGallery) return nonGallery;

  // Hepsi gallery ise en yüksek çözünürlüklüyü döndür
  return candidates[0] || null;
}

async function main() {
  console.log("🔍 Placeholder görseller tespit ediliyor...\n");
  const { data: products, placeholderHashes } = await findDuplicateImages();

  // Düzeltilecek ürünler: placeholder hash'i olan veya görseli olmayan
  const toFix = products.filter(p => {
    const hash = p.image_url?.split("/").pop()?.split(".")[0] || "";
    return !p.image_url || placeholderHashes.has(hash);
  });

  console.log(`📦 ${toFix.length} ürün düzeltilecek (${products.length - toFix.length} ürün zaten iyi)\n`);

  if (toFix.length === 0) {
    console.log("✅ Tüm görseller zaten iyi durumda!");
    return;
  }

  let fixed = 0;
  let failed = 0;
  let noImage = 0;

  for (const product of toFix) {
    if (!product.icecat_id) {
      console.log(`⚠️  ${product.title?.slice(0, 40)} — icecat_id yok, atlandı`);
      failed++;
      continue;
    }

    process.stdout.write(`⏳ #${product.icecat_id} ${product.title?.slice(0, 35)}... `);
    const icecatData = await fetchIcecatProduct(product.icecat_id);

    if (!icecatData) {
      console.log("❌ API'den çekilemedi");
      failed++;
      await new Promise(r => setTimeout(r, 300));
      continue;
    }

    const newImageUrl = getBestImage(icecatData);

    if (!newImageUrl) {
      console.log("⚠️  Görsel bulunamadı");
      noImage++;
      await new Promise(r => setTimeout(r, 300));
      continue;
    }

    const newHash = newImageUrl.split("/").pop()?.split(".")[0] || "";
    const oldHash = product.image_url?.split("/").pop()?.split(".")[0] || "";

    if (newHash === oldHash) {
      console.log("= Değişmedi (Icecat aynı görseli veriyor)");
      noImage++;
      await new Promise(r => setTimeout(r, 300));
      continue;
    }

    const { error } = await supabase
      .from("products")
      .update({ image_url: newImageUrl })
      .eq("id", product.id);

    if (error) {
      console.log(`❌ DB güncelleme hatası: ${error.message}`);
      failed++;
    } else {
      console.log(`✅ Güncellendi`);
      fixed++;
    }

    await new Promise(r => setTimeout(r, 400));
  }

  console.log(`\n🎉 Tamamlandı:`);
  console.log(`   ✅ ${fixed} görsel güncellendi`);
  console.log(`   ⚠️  ${noImage} ürün için farklı görsel bulunamadı`);
  console.log(`   ❌ ${failed} hata`);
}

main().catch(console.error);
