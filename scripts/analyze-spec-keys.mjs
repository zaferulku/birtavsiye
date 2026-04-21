// Products.specs JSONB'sindeki tüm anahtarları tarar, frekansa göre raporlar.
// PRIORITY_KEYS'te olmayan ama yaygın olan anahtarları SpecsTable'a eklemek için kullan.
//
// node --env-file=.env.local scripts/analyze-spec-keys.mjs [--min=20] [--category=<slug>]

import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const MIN = parseInt((process.argv.find(a => a.startsWith("--min=")) || "").split("=")[1] || "20", 10);
const CATEGORY = (process.argv.find(a => a.startsWith("--category=")) || "").split("=")[1];

// SpecsTable içindeki tanımlar (tutarlı olması için buraya senkron)
const HIDDEN_KEYS = new Set([
  "pttavm_category", "pttavm_path",
  "mediamarkt_category", "mediamarkt_path",
  "merchant", "mpn", "sku",
  "original_title",
  "_akakce", "_akakce_offers", "_offers",
]);
const HIDDEN_KEY_PATTERNS = /fiyat|satıcı|satici|price|seller|url|mağaza|magaza|store|kargo|stock|stok|indirim|kampanya/i;
const PRIORITY_KEYS = new Set([
  "Seri", "Dahili Hafıza", "RAM Kapasitesi", "Batarya Kapasitesi",
  "Çıkış Yılı", "Mobil Erişim Teknolojisi",
  "Ekran Boyutu", "Ekran Boyutu (inç)", "Ekran boyutu cm / inç",
  "Ekran Çözünürlüğü", "Ekran Yenileme Hızı", "Ekran Teknolojisi",
  "Ekran Parlaklık Değeri", "Ekran Gövde Oranı", "Ekran Dayanıklılığı",
  "Dokunmatik", "HDR", "Always on Display", "Çerçevesiz",
  "Arka Kamera Sayısı", "Arka Kamera", "İkinci Arka Kamera", "Üçüncü Arka Kamera",
  "Video Kayıt Çözünürlüğü", "Video FPS Değeri", "Piksel Yoğunluğu",
  "Ön Kamera", "Ön Kamera Video Çözünürlüğü", "Ön Kamera Video FPS Değeri",
  "Ekran İçinde Ön Kamera", "Optik Görüntü Sabitleme",
  "İşletim Sistemi", "İşlemci", "İşlemci Hızı", "Çekirdek Sayısı",
  "Grafik İşlemcisi (GPU)", "Chipset", "Oyun",
  "Hızlı Şarj", "Kablosuz Şarj", "Kablosuz Şarj Gücü", "Pil Türü",
  "USB Türü", "SIM Türü", "eSIM", "Çift Hatlı",
  "Kulaklık Bağlantısı", "Hoparlör", "Bluetooth", "Bluetooth Versiyonu",
  "Wi-Fi", "WİFİ", "NFC", "GPS", "Ekran Yansıtma",
  "Gövde Malzemesi", "Çerçeve Malzemesi",
  "Suya Dayanıklı", "Suya Dayanıklılık Seviyesi", "Ağırlık",
  "Barometre", "İvmeölçer", "Jiroskop", "Yüz Tanıma",
  "Dolby Vision", "Yapay Zeka Destekli", "Boyut", "Akıllı",
  "Antutu", "Şarj Döngü Sayısı", "Onarılabilirlik Sınıfı", "Düşme Direnci Sınıfı",
  "Geekbench (Multi-Core)", "Renk", "Renk (Üreticiye Göre)",
  "Ürün Tipi", "Çıkış Tarihi", "Depolama", "Pil Kapasitesi",
  "RAM", "Bellek Kapasitesi", "Mobil Telefon Standardı", "Çift SİM", "SIM-kart boyutu",
]);

(async () => {
  let filterIds = null;
  if (CATEGORY) {
    const { data: cat } = await sb.from("categories").select("id").eq("slug", CATEGORY).maybeSingle();
    if (!cat) { console.error(`Category not found: ${CATEGORY}`); process.exit(1); }
    const { data: allCats } = await sb.from("categories").select("id, parent_id");
    const childMap = new Map();
    for (const c of allCats) {
      const arr = childMap.get(c.parent_id) ?? [];
      arr.push(c.id);
      childMap.set(c.parent_id, arr);
    }
    filterIds = [cat.id];
    const stack = [cat.id];
    while (stack.length) {
      const id = stack.pop();
      for (const c of childMap.get(id) ?? []) { filterIds.push(c); stack.push(c); }
    }
  }

  const freq = new Map();
  let totalProducts = 0;
  let off = 0;
  while (true) {
    let q = sb.from("products").select("specs").not("specs", "is", null).range(off, off + 999);
    if (filterIds) q = q.in("category_id", filterIds);
    const { data } = await q;
    if (!data || data.length === 0) break;
    for (const p of data) {
      if (!p.specs || typeof p.specs !== "object") continue;
      totalProducts++;
      for (const k of Object.keys(p.specs)) {
        if (HIDDEN_KEYS.has(k) || HIDDEN_KEY_PATTERNS.test(k)) continue;
        freq.set(k, (freq.get(k) || 0) + 1);
      }
    }
    if (data.length < 1000) break;
    off += 1000;
  }

  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
  const filtered = sorted.filter(([, c]) => c >= MIN);
  const inPriority = filtered.filter(([k]) => PRIORITY_KEYS.has(k));
  const notInPriority = filtered.filter(([k]) => !PRIORITY_KEYS.has(k));

  console.log(`Toplam ürün (specs'li): ${totalProducts}`);
  console.log(`Unique spec key: ${freq.size}`);
  console.log(`Frekans ≥${MIN}: ${filtered.length}\n`);

  console.log("=== PRIORITY_KEYS'e EKLENEBİLECEK yaygın anahtarlar ===");
  notInPriority.slice(0, 40).forEach(([k, c]) => {
    const pct = ((c / totalProducts) * 100).toFixed(1);
    console.log(`  ${String(c).padStart(5)} (${pct}%) │ ${k}`);
  });

  console.log("\n=== Mevcut PRIORITY_KEYS (frekansa göre) ===");
  inPriority.slice(0, 30).forEach(([k, c]) => {
    console.log(`  ${String(c).padStart(5)} │ ${k}`);
  });
})();
