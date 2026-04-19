// Enrichment kategorisi → bizim slug mapping (PttAVM + MediaMarkt)
// node --env-file=.env.local scripts/apply-enrichment-mapping.mjs

import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PTTAVM_MAP = {
  "iPhone iOS Telefonlar": "akilli-telefon",
  "Telefon": "akilli-telefon",
  "Android Telefonlar": "akilli-telefon",
  "Cep Telefonu": "akilli-telefon",
  "Kılıflar": "telefon-aksesuar",
  "Çantalar ve Kılıflar": "telefon-aksesuar",
  "Ekran Koruyucular": "telefon-aksesuar",
  "Ekran": "telefon-aksesuar",
  "Şarj Aletleri": "telefon-aksesuar",
  "Powerbank": "telefon-aksesuar",
  "Power Banklar": "telefon-aksesuar",
  "Notebook Bataryaları": "bilgisayar-bilesenleri",
  "Laptop Bataryaları": "bilgisayar-bilesenleri",
  "Ekran Kartları (GPU)": "bilgisayar-bilesenleri",
  "SSD": "bilgisayar-bilesenleri",
  "RAM": "bilgisayar-bilesenleri",
  "İşlemci": "bilgisayar-bilesenleri",
  "Anakart": "bilgisayar-bilesenleri",
  "Laptop": "bilgisayar-laptop",
  "Notebook": "bilgisayar-laptop",
  "Dizüstü Bilgisayar": "bilgisayar-laptop",
  "Masaüstü Bilgisayar": "bilgisayar-laptop",
  "Klavye": "bilgisayar-bilesenleri",
  "Mouse": "bilgisayar-bilesenleri",
  "Monitör": "bilgisayar-bilesenleri",
  "Notebook Adaptörleri": "bilgisayar-bilesenleri",
  "Notebook Standları": "telefon-aksesuar",
  "Soğutucu ve Fan": "bilgisayar-bilesenleri",
  "Ağ & Modem": "networking",
  "Modem": "networking",
  "Router": "networking",
  "Ağ": "networking",
  "Access Point": "networking",
  "Mesh Wi-Fi": "networking",
  "Akıllı Saatler": "akilli-saat",
  "Akıllı Saat": "akilli-saat",
  "Akıllı Bileklik": "akilli-saat",
  "Kulaklık": "ses-kulaklik",
  "Kulaklıklar": "ses-kulaklik",
  "Hoparlör": "ses-kulaklik",
  "Bluetooth Hoparlör": "ses-kulaklik",
  "Soundbar": "ses-kulaklik",
  "Televizyon": "tv",
  "Smart TV": "tv",
  "OLED TV": "tv",
  "Kamera Aksesuarları": "fotograf-kamera",
  "Fotoğraf Makinesi": "fotograf-kamera",
  "Kamera": "fotograf-kamera",
  "Dron": "fotograf-kamera",
  "Tripod": "fotograf-kamera",
  "Selfie Çubuğu": "fotograf-kamera",
  "Gimbal": "fotograf-kamera",
  "Fırınlar": "beyaz-esya",
  "Fırın, Beyaz Eşya Temizleme": "beyaz-esya",
  "Buzdolabı": "beyaz-esya",
  "Çamaşır Makinesi": "beyaz-esya",
  "Bulaşık Makinesi": "beyaz-esya",
  "Klima": "beyaz-esya",
  "Klimalar": "beyaz-esya",
  "Derin Dondurucu": "beyaz-esya",
  "Süpürge": "kucuk-ev-aletleri",
  "Robot Süpürge": "kucuk-ev-aletleri",
  "Kahve Makinesi": "kucuk-ev-aletleri",
  "Blender": "kucuk-ev-aletleri",
  "Mikser": "kucuk-ev-aletleri",
  "Tost Makinesi": "kucuk-ev-aletleri",
  "Air Fryer": "kucuk-ev-aletleri",
  "Fritöz": "kucuk-ev-aletleri",
  "Ütü": "kucuk-ev-aletleri",
  "Çadır": "outdoor-kamp",
  "Uyku Tulumu": "outdoor-kamp",
  "Kamp Malzemeleri": "outdoor-kamp",
  "Termos": "outdoor-kamp",
  "Yürüyüş Ayakkabısı": "outdoor-kamp",
  "Bluz": "kadin-giyim",
  "Büyük Beden Bluz": "kadin-giyim",
  "Büyük Beden Pantolon": "kadin-giyim",
  "Günlük Etek": "kadin-giyim",
  "Günlük Elbise": "kadin-giyim",
  "Mini Etek": "kadin-giyim",
  "Elbise": "kadin-giyim",
  "Tayt": "kadin-giyim",
  "Gömlek": "erkek-giyim",
  "Gömlekler": "erkek-giyim",
  "Tişört": "erkek-giyim",
  "Polo Tişört": "erkek-giyim",
  "Eşofman": "erkek-giyim",
  "İş Elbiseleri": "erkek-giyim",
  "Klasik": "erkek-ayakkabi",
  "Klasik Bot": "erkek-ayakkabi",
  "Bot": "erkek-ayakkabi",
  "Bootie": "kadin-ayakkabi",
  "Topuklu Bot": "kadin-ayakkabi",
  "Bot & Çizme": "kadin-ayakkabi",
  "Yağmur Çizmesi": "kadin-ayakkabi",
  "Spor Ayakkabı": "spor-giyim",
  "Kız Çocuk Ayakkabı": "cocuk-giyim",
  "Erkek Çocuk Ayakkabı": "cocuk-giyim",
  "Takım Çantaları": "canta-cuzdan",
  "Sırt Çantası": "canta-cuzdan",
  "El Çantası": "canta-cuzdan",
  "Jel ve Sabunlar": "kisisel-hijyen",
  "Şampuan": "sac-bakimi",
  "Parfüm": "parfum",
  "Peeling Ürünleri": "cilt-bakimi",
  "Eyeliner": "makyaj",
  "Ruj": "makyaj",
  "Maskara": "makyaj",
  "Fondöten": "makyaj",
  "Saç Kurutma Makinesi": "sac-bakimi",
  "Saç Düzleştirici": "sac-bakimi",
  "Saç Şekillendirme Cihazları": "sac-bakimi",
  "Traş Makinesi": "erkek-bakimi",
  "Epilatör": "kisisel-hijyen",
  "Tuvalet Temizleyiciler": "temizlik",
  "Çamaşır Deterjanı": "temizlik",
  "Bulaşık Deterjanı": "temizlik",
  "Bebek Giyim": "bebek-giyim",
  "Tekne Bakımı": "arac-aksesuar",
  "Oto Aksesuar": "arac-aksesuar",
  "Bahçe & Balkon": "bahce-balkon",
  "Balık & Akvaryum": "balik-akvaryum",
  "Yoga Matı": "yoga",
  "Dambıl": "fitness",
  "Koşu Bandı": "fitness",
  "Bisiklet": "bisiklet",
};

const MEDIAMARKT_MAP = {
  "Android Telefonlar": "akilli-telefon",
  "Huawei Telefon": "akilli-telefon",
  "General Mobile Telefon": "akilli-telefon",
  "Samsung Telefon": "akilli-telefon",
  "Xiaomi Telefon": "akilli-telefon",
  "Apple Telefon": "akilli-telefon",
  "iPhone": "akilli-telefon",
  "Cep Telefonları": "akilli-telefon",
  "Solid State Disk Drive (SSD)": "bilgisayar-bilesenleri",
  "Hard Disk (HDD)": "bilgisayar-bilesenleri",
  "Bellek (RAM)": "bilgisayar-bilesenleri",
  "İşlemci (CPU)": "bilgisayar-bilesenleri",
  "Ekran Kartı (VGA)": "bilgisayar-bilesenleri",
  "Anakart": "bilgisayar-bilesenleri",
  "Kasa": "bilgisayar-bilesenleri",
  "Bilgisayar Bileşenleri": "bilgisayar-bilesenleri",
  "Oyuncu Mouse": "bilgisayar-bilesenleri",
  "Oyuncu Klavye": "bilgisayar-bilesenleri",
  "Oyuncu Kulaklığı": "ses-kulaklik",
  "Aksiyon Kamerası": "fotograf-kamera",
  "Gimbal": "fotograf-kamera",
  "Dron": "fotograf-kamera",
  "Fotoğraf Makinesi": "fotograf-kamera",
  "Video Kamera": "fotograf-kamera",
  "Android Tabletler": "tablet",
  "iPad": "tablet",
  "Tabletler": "tablet",
  "Akıllı Saat": "akilli-saat",
  "Akıllı Saatler": "akilli-saat",
  "Akıllı Bileklik": "akilli-saat",
  "Kulaklık": "ses-kulaklik",
  "Bluetooth Kulaklık": "ses-kulaklik",
  "Hoparlör": "ses-kulaklik",
  "Televizyon": "tv",
  "Smart TV": "tv",
  "OLED TV": "tv",
  "Buzdolabı": "beyaz-esya",
  "Çamaşır Makinesi": "beyaz-esya",
  "Bulaşık Makinesi": "beyaz-esya",
  "Fırın": "beyaz-esya",
  "Süpürge": "kucuk-ev-aletleri",
  "Robot Süpürge": "kucuk-ev-aletleri",
  "Kahve Makinesi": "kucuk-ev-aletleri",
  "Mikrodalga": "kucuk-ev-aletleri",
  "Air Fryer": "kucuk-ev-aletleri",
};

(async () => {
  const { data: cats } = await sb.from("categories").select("id,slug");
  const slugToId = Object.fromEntries(cats.map(c => [c.slug, c.id]));

  const { data: products } = await sb
    .from("products")
    .select("id, category_id, specs")
    .or("specs->pttavm_category.not.is.null,specs->mediamarkt_category.not.is.null");

  console.log(`Enriched ürün: ${products.length}`);

  const updates = {};
  const unmapped = {};
  let alreadyCorrect = 0, skipped = 0;

  for (const p of products) {
    let targetSlug = null;
    const mmCat = p.specs?.mediamarkt_category?.trim();
    const pttCat = p.specs?.pttavm_category?.trim();

    if (mmCat && MEDIAMARKT_MAP[mmCat]) targetSlug = MEDIAMARKT_MAP[mmCat];
    else if (pttCat && PTTAVM_MAP[pttCat]) targetSlug = PTTAVM_MAP[pttCat];
    else if (mmCat) unmapped["mm:" + mmCat] = (unmapped["mm:" + mmCat] || 0) + 1;
    else if (pttCat) unmapped["ptt:" + pttCat] = (unmapped["ptt:" + pttCat] || 0) + 1;

    if (!targetSlug) { skipped++; continue; }
    const targetId = slugToId[targetSlug];
    if (!targetId) { skipped++; continue; }
    if (p.category_id === targetId) { alreadyCorrect++; continue; }
    (updates[targetSlug] ||= []).push(p.id);
  }

  console.log("\n=== Uygulanacak değişiklikler ===");
  for (const [slug, ids] of Object.entries(updates)) {
    console.log(`  ${slug.padEnd(26)} ${ids.length} ürün`);
  }

  console.log("\n=== En çok geçen unmapped kategoriler (top 20) ===");
  Object.entries(unmapped).sort((a, b) => b[1] - a[1]).slice(0, 20).forEach(([c, n]) => {
    console.log(`  ${String(n).padStart(3)}  "${c}"`);
  });

  console.log(`\nZaten doğru: ${alreadyCorrect}, atlanan: ${skipped}`);

  let total = 0;
  for (const [slug, ids] of Object.entries(updates)) {
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100);
      await sb.from("products").update({ category_id: slugToId[slug] }).in("id", chunk);
      total += chunk.length;
    }
  }
  console.log(`Toplam güncellenen: ${total}`);
})();
