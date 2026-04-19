// PttAVM kategorisi → bizim slug mapping uygula
// node --env-file=.env.local scripts/apply-pttavm-mapping.mjs

import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PTTAVM_MAP = {
  // Telefon & aksesuar
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

  // Bilgisayar
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

  // Networking
  "Ağ & Modem": "networking",
  "Modem": "networking",
  "Router": "networking",
  "Ağ": "networking",

  // Akıllı saat
  "Akıllı Saatler": "akilli-saat",
  "Akıllı Saat": "akilli-saat",
  "Akıllı Bileklik": "akilli-saat",

  // Ses
  "Kulaklık": "ses-kulaklik",
  "Kulaklıklar": "ses-kulaklik",
  "Hoparlör": "ses-kulaklik",
  "Bluetooth Hoparlör": "ses-kulaklik",
  "Soundbar": "ses-kulaklik",

  // TV
  "Televizyon": "tv",
  "Smart TV": "tv",
  "OLED TV": "tv",

  // Fotoğraf
  "Kamera Aksesuarları": "fotograf-kamera",
  "Fotoğraf Makinesi": "fotograf-kamera",
  "Kamera": "fotograf-kamera",
  "Dron": "fotograf-kamera",

  // Beyaz eşya
  "Fırınlar": "beyaz-esya",
  "Fırın, Beyaz Eşya Temizleme": "beyaz-esya",
  "Buzdolabı": "beyaz-esya",
  "Çamaşır Makinesi": "beyaz-esya",
  "Bulaşık Makinesi": "beyaz-esya",
  "Klima": "beyaz-esya",
  "Derin Dondurucu": "beyaz-esya",

  // Küçük ev aletleri
  "Süpürge": "kucuk-ev-aletleri",
  "Robot Süpürge": "kucuk-ev-aletleri",
  "Kahve Makinesi": "kucuk-ev-aletleri",
  "Blender": "kucuk-ev-aletleri",
  "Mikser": "kucuk-ev-aletleri",
  "Tost Makinesi": "kucuk-ev-aletleri",
  "Air Fryer": "kucuk-ev-aletleri",
  "Fritöz": "kucuk-ev-aletleri",

  // Outdoor
  "Çadır": "outdoor-kamp",
  "Uyku Tulumu": "outdoor-kamp",
  "Kamp Malzemeleri": "outdoor-kamp",
  "Termos": "outdoor-kamp",
  "Yürüyüş Ayakkabısı": "outdoor-kamp",

  // Giyim (kadın/erkek)
  "Bluz": "kadin-giyim",
  "Büyük Beden Bluz": "kadin-giyim",
  "Büyük Beden Pantolon": "kadin-giyim",
  "Günlük Etek": "kadin-giyim",
  "Elbise": "kadin-giyim",
  "Tayt": "kadin-giyim",
  "Gömlek": "erkek-giyim",
  "Tişört": "erkek-giyim",
  "Polo Tişört": "erkek-giyim",
  "Eşofman": "erkek-giyim",

  // Ayakkabı
  "Klasik": "erkek-ayakkabi",
  "Klasik Bot": "erkek-ayakkabi",
  "Bot": "erkek-ayakkabi",
  "Bootie": "kadin-ayakkabi",
  "Topuklu Bot": "kadin-ayakkabi",
  "Bot & Çizme": "kadin-ayakkabi",
  "Yağmur Çizmesi": "kadin-ayakkabi",
  "Spor Ayakkabı": "spor-giyim",

  // Çanta
  "Takım Çantaları": "canta-cuzdan",
  "Sırt Çantası": "canta-cuzdan",
  "El Çantası": "canta-cuzdan",

  // Güzellik
  "Jel ve Sabunlar": "kisisel-hijyen",
  "Şampuan": "sac-bakimi",
  "Parfüm": "parfum",

  // Araç
  "Tekne Bakımı": "arac-aksesuar",
  "Oto Aksesuar": "arac-aksesuar",

  // Ek mapping'ler (keşfettikçe eklendi)
  "Klavye": "bilgisayar-bilesenleri",
  "Mouse": "bilgisayar-bilesenleri",
  "Monitör": "bilgisayar-bilesenleri",
  "Access Point": "networking",
  "Mesh Wi-Fi": "networking",
  "Notebook Adaptörleri": "bilgisayar-bilesenleri",
  "Soğutucu ve Fan": "bilgisayar-bilesenleri",
  "Günlük Elbise": "kadin-giyim",
  "Mini Etek": "kadin-giyim",
  "İş Elbiseleri": "erkek-giyim",
  "Peeling Ürünleri": "cilt-bakimi",
  "Eyeliner": "makyaj",
  "Ruj": "makyaj",
  "Maskara": "makyaj",
  "Fondöten": "makyaj",
  "Tuvalet Temizleyiciler": "temizlik",
  "Çamaşır Deterjanı": "temizlik",
  "Bulaşık Deterjanı": "temizlik",
  "Kız Çocuk Ayakkabı": "cocuk-giyim",
  "Erkek Çocuk Ayakkabı": "cocuk-giyim",
  "Bebek Giyim": "bebek-giyim",
  "Klimalar": "beyaz-esya",
  "Tripod": "fotograf-kamera",
  "Selfie Çubuğu": "fotograf-kamera",
  "Gimbal": "fotograf-kamera",
  "Ütü": "kucuk-ev-aletleri",
  "Saç Kurutma Makinesi": "sac-bakimi",
  "Saç Düzleştirici": "sac-bakimi",
  "Traş Makinesi": "erkek-bakimi",
  "Epilatör": "kisisel-hijyen",
  "Bahçe & Balkon": "bahce-balkon",
  "Balık & Akvaryum": "balik-akvaryum",
  "Yoga Matı": "yoga",
  "Dambıl": "fitness",
  "Koşu Bandı": "fitness",
  "Bisiklet": "bisiklet",
};

(async () => {
  const { data: cats } = await sb.from("categories").select("id,slug");
  const slugToId = Object.fromEntries(cats.map(c => [c.slug, c.id]));

  for (const slug of new Set(Object.values(PTTAVM_MAP))) {
    if (!slugToId[slug]) console.warn(`[!] Bizim kategoriler içinde slug yok: ${slug}`);
  }

  const { data: products } = await sb
    .from("products")
    .select("id, category_id, specs")
    .not("specs->pttavm_category", "is", null);

  console.log(`Enriched ürün: ${products.length}`);

  const updates = {};
  const unmapped = {};
  let alreadyCorrect = 0;

  for (const p of products) {
    const pttCat = p.specs?.pttavm_category?.trim();
    if (!pttCat) continue;
    const targetSlug = PTTAVM_MAP[pttCat];
    if (!targetSlug) {
      unmapped[pttCat] = (unmapped[pttCat] || 0) + 1;
      continue;
    }
    const targetId = slugToId[targetSlug];
    if (!targetId) continue;
    if (p.category_id === targetId) {
      alreadyCorrect++;
      continue;
    }
    (updates[targetSlug] ||= []).push(p.id);
  }

  console.log("");
  console.log("=== Yapılacak güncellemeler ===");
  for (const [slug, ids] of Object.entries(updates)) {
    console.log(`  ${slug.padEnd(26)} ${ids.length} ürün`);
  }

  console.log("");
  console.log("=== Mapping'de olmayan PttAVM kategoriler ===");
  for (const [c, n] of Object.entries(unmapped).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(3)}  "${c}"`);
  }

  console.log("");
  console.log(`Zaten doğru kategoride: ${alreadyCorrect}`);

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
