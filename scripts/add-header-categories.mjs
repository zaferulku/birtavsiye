// Header NAV'daki sub-item'lar için eksik alt-kategorileri DB'ye ekle
// Hiyerarşik URL standardına uygun (docs/HIERARCHICAL_URL_STANDARD.md)
// node --env-file=.env.local scripts/add-header-categories.mjs

import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const NEW_LEAVES = {
  // --- ANNE-BEBEK ---
  "bebek-bezi":        { name: "Bebek Bezi & Islak Mendil", icon: "🍼", parent: "bebek-bakim" },
  "biberon":           { name: "Biberon & Emzik", icon: "🍼", parent: "bebek-bakim" },
  "mama":              { name: "Mama & Beslenme", icon: "🥣", parent: "bebek-bakim" },
  "bebek-kozmetik":    { name: "Bebek Kozmetik", icon: "🧴", parent: "bebek-bakim" },
  "bebek-sagligi":     { name: "Bebek Sağlığı", icon: "🌡️", parent: "bebek-bakim" },
  "puset-araba":       { name: "Puset & Bebek Arabası", icon: "🍼", parent: "bebek-arabasi" },
  "oto-koltugu":       { name: "Oto Koltuğu", icon: "💺", parent: "bebek-arabasi" },
  "bebek-guvenligi":   { name: "Bebek Güvenliği", icon: "🛡️", parent: "bebek-arabasi" },
  "besik":             { name: "Beşik & Bebek Yatağı", icon: "🛏️", parent: "cocuk-odasi" },

  // --- ELEKTRONIK - TELEFON-AKSESUAR ---
  "telefon-kilifi":    { name: "Telefon Kılıfı", icon: "📱", parent: "telefon-aksesuar" },
  "sarj-kablo":        { name: "Şarj & Kablo", icon: "🔌", parent: "telefon-aksesuar" },
  "powerbank":         { name: "Powerbank", icon: "🔋", parent: "telefon-aksesuar" },
  "ekran-koruyucu":    { name: "Ekran Koruyucu", icon: "🛡️", parent: "telefon-aksesuar" },

  // --- ELEKTRONIK - BILGISAYAR ---
  "masaustu-bilgisayar": { name: "Masaüstü Bilgisayar", icon: "🖥️", parent: "bilgisayar-laptop" },
  "monitor":           { name: "Monitör", icon: "🖥️", parent: "bilgisayar-bilesenleri" },

  // --- ELEKTRONIK - SES ---
  "soundbar":          { name: "Soundbar & Ev Sinema", icon: "🔊", parent: "ses-kulaklik" },
  "bluetooth-hoparlor":{ name: "Bluetooth Hoparlör", icon: "🔊", parent: "ses-kulaklik" },

  // --- ELEKTRONIK - TV ---
  "projeksiyon":       { name: "Projeksiyon", icon: "📽️", parent: "tv" },

  // --- ELEKTRONIK - FOTO ---
  "drone":             { name: "Drone", icon: "🚁", parent: "fotograf-kamera" },
  "aksiyon-kamera":    { name: "Aksiyon Kamera", icon: "📹", parent: "fotograf-kamera" },
  "guvenlik-kamerasi": { name: "Güvenlik Kamerası", icon: "📹", parent: "fotograf-kamera" },

  // --- MODA - KADIN ---
  "elbise":            { name: "Elbise", icon: "👗", parent: "kadin-giyim" },
  "kadin-tisort-bluz": { name: "Tişört & Bluz (Kadın)", icon: "👚", parent: "kadin-giyim" },
  "kadin-pantolon":    { name: "Pantolon & Jean (Kadın)", icon: "👖", parent: "kadin-giyim" },
  "kadin-ceket-mont":  { name: "Ceket & Mont (Kadın)", icon: "🧥", parent: "kadin-giyim" },
  "etek":              { name: "Etek", icon: "👗", parent: "kadin-giyim" },
  "kadin-kazak":       { name: "Kazak & Hırka (Kadın)", icon: "🧶", parent: "kadin-giyim" },

  // --- MODA - ERKEK ---
  "erkek-tisort":      { name: "Tişört (Erkek)", icon: "👕", parent: "erkek-giyim" },
  "erkek-gomlek":      { name: "Gömlek", icon: "👔", parent: "erkek-giyim" },
  "erkek-pantolon":    { name: "Pantolon & Jean (Erkek)", icon: "👖", parent: "erkek-giyim" },
  "erkek-ceket-mont":  { name: "Ceket & Mont (Erkek)", icon: "🧥", parent: "erkek-giyim" },
  "takim-elbise":      { name: "Takım Elbise", icon: "🎩", parent: "erkek-giyim" },
  "esofman":           { name: "Eşofman & Spor Giyim", icon: "🏃", parent: "spor-giyim" },

  // --- AYAKKABI ---
  "topuklu":           { name: "Topuklu Ayakkabı", icon: "👠", parent: "kadin-ayakkabi" },
  "kadin-sneaker":     { name: "Sneaker (Kadın)", icon: "👟", parent: "kadin-ayakkabi" },
  "kadin-sandalet":    { name: "Sandalet & Terlik (Kadın)", icon: "🩴", parent: "kadin-ayakkabi" },
  "kadin-bot":         { name: "Bot & Çizme (Kadın)", icon: "🥾", parent: "kadin-ayakkabi" },
  "babet":             { name: "Babet & Loafer", icon: "👠", parent: "kadin-ayakkabi" },
  "erkek-sneaker":     { name: "Sneaker (Erkek)", icon: "👟", parent: "erkek-ayakkabi" },
  "klasik-ayakkabi":   { name: "Klasik Ayakkabı", icon: "👞", parent: "erkek-ayakkabi" },
  "erkek-bot":         { name: "Bot & Çizme (Erkek)", icon: "🥾", parent: "erkek-ayakkabi" },

  // --- BEYAZ EŞYA ---
  "camasir-makinesi":  { name: "Çamaşır Makinesi", icon: "🧺", parent: "beyaz-esya" },
  "bulasik-makinesi":  { name: "Bulaşık Makinesi", icon: "🍽️", parent: "beyaz-esya" },
  "buzdolabi":         { name: "Buzdolabı", icon: "🧊", parent: "beyaz-esya" },
  "firin-ocak":        { name: "Fırın & Ocak", icon: "🍳", parent: "beyaz-esya" },
  "kurutma-makinesi":  { name: "Kurutma Makinesi", icon: "🧺", parent: "beyaz-esya" },
  "klima":             { name: "Klima & Isıtıcı", icon: "❄️", parent: "beyaz-esya" },

  // --- KÜÇÜK EV ALETLERI ---
  "supurge":           { name: "Süpürge", icon: "🧹", parent: "kucuk-ev-aletleri" },
  "kahve-cay-makinesi":{ name: "Kahve & Çay Makinesi", icon: "☕", parent: "kucuk-ev-aletleri" },
  "mutfak-aleti":      { name: "Mutfak Aletleri", icon: "🍳", parent: "kucuk-ev-aletleri" },
  "utu":               { name: "Ütü & Buharlı", icon: "👔", parent: "kucuk-ev-aletleri" },
  "sac-stilizasyon":   { name: "Saç Stilizasyon", icon: "💇", parent: "sac-bakimi" },

  // --- KOZMETIK ---
  "yuz-nemlendirici":  { name: "Yüz Nemlendirici", icon: "🧴", parent: "cilt-bakimi" },
  "yuz-temizleme":     { name: "Yüz Temizleme", icon: "🧼", parent: "cilt-bakimi" },
  "gunes-koruyucu":    { name: "Güneş Koruyucu", icon: "☀️", parent: "cilt-bakimi" },
  "serum":             { name: "Serum & Ampul", icon: "💧", parent: "cilt-bakimi" },
  "yuz-maskesi":       { name: "Yüz Maskesi", icon: "🧖", parent: "cilt-bakimi" },
  "yuz-makyaji":       { name: "Yüz Makyajı", icon: "💄", parent: "makyaj" },
  "goz-makyaji":       { name: "Göz Makyajı", icon: "👁️", parent: "makyaj" },
  "dudak-makyaji":     { name: "Dudak Makyajı", icon: "👄", parent: "makyaj" },
  "sampuan":           { name: "Şampuan & Saç Kremi", icon: "🧴", parent: "sac-bakimi" },
  "sac-boyasi":        { name: "Saç Boyası", icon: "🎨", parent: "sac-bakimi" },

  // --- OYUNCAK ---
  "lego":              { name: "LEGO", icon: "🧱", parent: "oyuncak" },
  "egitici-oyuncak":   { name: "Eğitici Oyuncak", icon: "🎓", parent: "oyuncak" },
  "figur-oyuncak":     { name: "Figür & Oyuncak Bebek", icon: "🎎", parent: "oyuncak" },
  "rc-robot":          { name: "RC & Robot", icon: "🤖", parent: "oyuncak" },

  // --- OTOMOTIV ---
  "oto-teyp":          { name: "Teyp & Multimedya", icon: "📻", parent: "arac-elektronigi" },

  // --- HOBI ---
  "resim-cizim":       { name: "Resim & Çizim", icon: "🎨", parent: "hobi-sanat" },
  "el-sanatlari":      { name: "El Sanatları", icon: "🧵", parent: "hobi-sanat" },
};

(async () => {
  const { data: cats } = await sb.from("categories").select("id, slug");
  const bySlug = new Map(cats.map(c => [c.slug, c.id]));

  let added = 0, skipped = 0, missingParent = 0;

  for (const [slug, info] of Object.entries(NEW_LEAVES)) {
    if (bySlug.has(slug)) {
      skipped++;
      continue;
    }
    const parentId = bySlug.get(info.parent);
    if (!parentId) {
      console.warn("⚠ Missing parent:", info.parent, "for", slug);
      missingParent++;
      continue;
    }
    const { error } = await sb.from("categories").insert({
      slug,
      name: info.name,
      parent_id: parentId,
      icon: info.icon,
    });
    if (error) {
      console.warn("⚠ Error adding", slug, ":", error.message);
    } else {
      added++;
      console.log("+", slug, "→", info.parent, "(" + info.name + ")");
    }
  }

  console.log(`\n=== DONE ===`);
  console.log(`Added:          ${added}`);
  console.log(`Already exists: ${skipped}`);
  console.log(`Missing parent: ${missingParent}`);
})();
