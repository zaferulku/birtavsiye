"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useMemo } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase";
import { findCanonicalSlugSync } from "@/lib/chatbot/categoryValidation";
import HeaderSearchBar from "./HeaderSearchBar";

// NAV constant'ı eski flat slug'lar barındırıyor; DB hierarchik path'e geçti.
// Tekrarlı warn'ı önlemek için per-session bir kez log'la.
const warnedSlugs = new Set<string>();

// Turkish-aware slug helper — Header tag'leri DB leaf path'iyle eslesmeyi dener.
function slugifyTagForUrl(text: string): string {
  return text
    .toLocaleLowerCase("tr")
    .replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i")
    .replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
    .replace(/&/g, " ")
    .replace(/'/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// categories.slug artik DB'de full hierarchik path. URL uretimi iki katmanli:
// 1) catMap.get(slug) — exact lookup, hizli yol
// 2) findCanonicalSlugSync — eski flat slug'i leaf-suffix/token-set ile tam
//    path'e cevir (Turkce normalize dahil). Hala yoksa console.warn + /?q= fallback.
//
// P6.26 (Migration 041): tag click "smart resolve". q parametresi geliyorsa
// once <slug>/<slugify(q)> leaf'ini ara — DB'de varsa direkt o kategoriye
// git (q-filter degil). Tag'ler artik kendi sayfalarini acar (orn. "Vucut
// Losyonu" tag'i kozmetik/cilt-bakim/vucut-bakimi/vucut-losyonu sayfasina).
// Marka tag'leri (Nivea, Apple) DB'de leaf yok -> q-filter fallback.
function hierUrl(
  slug: string,
  catMap: Map<string, { id: string; slug: string; parent_id: string | null }>,
  _byId: Map<string, { id: string; slug: string; parent_id: string | null }>,
  q?: string,
): string {
  // Smart tag-as-leaf resolve (q varsa)
  if (q) {
    const tagSlug = slugifyTagForUrl(q);
    if (tagSlug) {
      const baseCat = catMap.get(slug);
      const baseSlug = baseCat?.slug ?? slug;
      const tagLeafPath = `${baseSlug}/${tagSlug}`;
      const leafCat = catMap.get(tagLeafPath);
      if (leafCat) {
        return "/anasayfa/" + leafCat.slug;
      }
    }
  }

  const cat = catMap.get(slug);
  if (cat) {
    const base = "/anasayfa/" + cat.slug;
    return q ? `${base}?q=${encodeURIComponent(q)}` : base;
  }

  const resolved = findCanonicalSlugSync(slug, catMap.keys());
  if (resolved) {
    const base = "/anasayfa/" + resolved;
    return q ? `${base}?q=${encodeURIComponent(q)}` : base;
  }

  if (!warnedSlugs.has(slug)) {
    warnedSlugs.add(slug);
    console.warn(`[Header] Unknown NAV slug: "${slug}" — DB taxonomy'de eşleşme yok`);
  }
  // P6.20-B: SSR'da catMap empty kaldığında eski fallback /?q=<slug> ana
  // sayfaya yönlendiriyordu (kullanıcı raporu: linkler ana sayfaya dönüyor).
  // Yeni davranış: /anasayfa/<slug> raw passthrough — segment route resolver
  // (full-path veya leaf-suffix) sunucu tarafında çözer. DB'de hiç match
  // yoksa 404 ana sayfa redirect'ten daha açık UX. Kalıcı çözüm SSR-side
  // cats prefetch (P6.20-A, Codex Header sprint sonrası).
  const fallbackBase = "/anasayfa/" + slug;
  return q ? `${fallbackBase}?q=${encodeURIComponent(q)}` : fallbackBase;
}

type NavTag = string;
type NavSub = { label: string; slug: string; tags: NavTag[]; q?: string };
type NavCat = { label: string; slug: string; icon: string; subs: NavSub[] };
type NavGroup = { title: string; icon: string; cats: NavCat[] };

const NAV: NavGroup[] = [
  {
    title: "Elektronik", icon: "📱",
    cats: [
      {
        label: "Bilgisayar & Tablet", slug: "elektronik/bilgisayar-tablet/laptop", icon: "💻",
        subs: [
          { label: "Laptop", slug: "elektronik/bilgisayar-tablet/laptop", tags: ["Lenovo", "Asus", "MSI", "MacBook", "HP", "Casper", "Acer", "Monster", "Dell", "Gaming Laptop"] },
          { label: "Tablet", slug: "elektronik/bilgisayar-tablet/tablet", tags: ["iPad", "Samsung", "Lenovo", "Huawei", "Xiaomi", "Honor", "Tablet Kılıfı", "Tablet Klavyesi"] },
          { label: "Masaüstü Bilgisayar", slug: "elektronik/bilgisayar-tablet/masaustu", tags: ["All-in-One", "MacBook Mini", "Mini PC", "Gaming PC", "İş İstasyonu"] },
          { label: "Oyuncu Donanımları", slug: "elektronik/oyun/konsol", tags: ["Oyuncu Klavyesi", "Gaming Laptop", "Oyuncu Mouse", "Oyuncu Kulaklığı", "Oyuncu Monitörü", "Mekanik Klavye", "Oyuncu Koltuk"] },
          { label: "Monitör", slug: "elektronik/bilgisayar-tablet/monitor", tags: ["OLED", "Kavisli", "27 inç", "32 inç", "4K", "Asus", "Dell", "MSI", "LG", "Samsung"] },
          { label: "Bilgisayar Parçaları", slug: "elektronik/bilgisayar-tablet/bilesenler/parca", tags: ["Anakart", "Ekran Kartı", "RAM", "SSD", "İşlemci", "Kasa", "Nvidia", "AMD", "Intel"] },
          { label: "Klavye & Mouse", slug: "elektronik/bilgisayar-tablet/klavye-mouse", tags: ["Mekanik Klavye", "Kablosuz", "Logitech", "Razer", "Microsoft", "HyperX", "SteelSeries"] },
          { label: "Çevre Birimleri", slug: "elektronik/bilgisayar-tablet/bilesenler/cevre-birim", tags: ["Klavye & Mouse Set", "Mouse", "Klavye", "Webcam", "Yazıcı", "Tarayıcı", "VR Gözlük"] },
          { label: "Veri Depolama", slug: "elektronik/bilgisayar-tablet/bilesenler/veri-depolama", tags: ["USB Bellek", "SSD", "Hard Disk", "Hafıza Kartı", "Taşınabilir SSD", "NAS"] },
          { label: "Ağ & Modem & Akıllı Ev", slug: "elektronik/ag-guvenlik/modem", tags: ["Router", "Modem", "Access Point", "Switch", "Powerline", "Akıllı Priz", "Akıllı Ampul"] },
          { label: "Bilgisayar Aksesuarları", slug: "elektronik/telefon/aksesuar", tags: ["Laptop Çantası", "Tablet Çantası", "Kablo & Hub", "Soğutucu", "Mouse Pad"] },
        ]
      },
      {
        label: "Telefon & Aksesuar", slug: "elektronik/telefon/akilli-telefon", icon: "📱",
        subs: [
          { label: "Akıllı Telefon", slug: "elektronik/telefon/akilli-telefon", tags: ["iPhone", "Samsung Galaxy", "Xiaomi", "Huawei", "OnePlus", "Realme", "Oppo"] },
          { label: "Telefon Kılıfı", slug: "elektronik/telefon/kilif", tags: ["iPhone Kılıfı", "Samsung Kılıfı", "Deri Kılıf", "Şeffaf Kılıf", "Cüzdanlı Kılıf"] },
          { label: "Şarj & Kablo", slug: "elektronik/telefon/sarj-kablo", tags: ["Hızlı Şarj", "Kablosuz Şarj", "USB-C Kablo", "Lightning Kablo", "Power Bank", "Araç Şarjı"] },
          { label: "Kulaklık", slug: "elektronik/tv-ses-goruntu/kulaklik", tags: ["AirPods", "Samsung Buds", "Bluetooth", "Kulak İçi", "Kulak Üstü", "ANC", "Sony", "JBL", "Jabra"] },
          { label: "Akıllı Saat & Bileklik", slug: "elektronik/giyilebilir/akilli-saat", tags: ["Apple Watch", "Samsung Galaxy Watch", "Xiaomi Band", "Garmin", "Huawei Watch", "Fitbit"] },
          { label: "Powerbank", slug: "elektronik/telefon/powerbank", tags: ["20000 mAh", "Hızlı Şarj", "Kablosuz", "Anker", "Xiaomi", "Baseus", "Aukey"] },
          { label: "Yedek Parça", slug: "elektronik/telefon/yedek-parca", tags: ["Ekran", "Batarya", "Şarj Soketi", "Hoparlör", "Kamera Cam", "Tampon"] },
          { label: "Ekran Koruyucu & Aksesuar", slug: "elektronik/telefon/ekran-koruyucu", tags: ["Cam Koruyucu", "Selfie Çubuğu", "Tripod", "Gimbal", "Lens"] },
        ]
      },
      {
        label: "TV, Görüntü & Ses", slug: "elektronik/tv-ses-goruntu", icon: "📺",
        subs: [
          { label: "Televizyon", slug: "elektronik/tv-ses-goruntu/televizyon", tags: ["OLED", "QLED", "4K", "8K", "55 inç", "65 inç", "75 inç", "Samsung", "LG", "Sony", "Philips", "Hisense", "TCL"] },
          { label: "TV Aksesuar", slug: "elektronik/tv-ses-goruntu/tv-aksesuar", tags: ["Kumanda", "Duvar Askı", "TV Sehpa", "HDMI Kablo", "Anten", "VESA"] },
          { label: "Soundbar & Ev Sinema", slug: "elektronik/tv-ses-goruntu/soundbar", tags: ["Soundbar", "2.1 Ses Sistemi", "5.1 Ev Sinema", "Dolby Atmos", "Samsung", "Sony", "Bose", "JBL"] },
          { label: "Bluetooth Hoparlör", slug: "elektronik/tv-ses-goruntu/bluetooth-hoparlor", tags: ["Taşınabilir", "Su Geçirmez", "JBL", "Bose", "Sony", "Marshall", "Harman Kardon"] },
          { label: "Projeksiyon", slug: "elektronik/tv-ses-goruntu/projeksiyon", tags: ["Full HD", "4K", "Mini LED", "Taşınabilir", "Epson", "BenQ", "Optoma", "ViewSonic"] },
          { label: "Akıllı Ev", slug: "elektronik/akilli-ev", tags: ["Google Nest", "Amazon Echo", "Akıllı Priz", "Akıllı Ampul", "Philips Hue", "Xiaomi"] },
        ]
      },
      {
        label: "Yazıcı & Tarayıcı", slug: "elektronik/bilgisayar-tablet/yazici", icon: "🖨️",
        subs: [
          { label: "Yazıcı", slug: "elektronik/bilgisayar-tablet/yazici", tags: ["Lazer Yazıcı", "Mürekkepli Yazıcı", "Fotoğraf Yazıcısı", "HP", "Canon", "Epson", "Brother"] },
          { label: "Çok Fonksiyonlu Yazıcı", slug: "elektronik/bilgisayar-tablet/yazici/cok-fonksiyonlu-yazici", tags: ["Fotokopi", "Faks", "Tarayıcı", "Wi-Fi", "HP", "Canon", "Brother"] },
          { label: "Mürekkep & Toner", slug: "elektronik/bilgisayar-tablet/yazici/murekkep-toner", tags: ["Orijinal Kartuş", "Muadil Kartuş", "Toner", "Şerit", "Drum"] },
        ]
      },
      {
        label: "Foto & Kamera", slug: "elektronik/kamera", icon: "📷",
        subs: [
          { label: "Fotoğraf Makinesi", slug: "elektronik/kamera/fotograf-makinesi", tags: ["DSLR", "Mirrorless", "Kompakt", "Sony", "Canon", "Nikon", "Fujifilm", "Olympus"] },
          { label: "Drone", slug: "elektronik/kamera/drone", tags: ["DJI Mini", "DJI Air", "DJI Mavic", "FPV Drone", "Yarış Drone"] },
          { label: "Aksiyon Kamera", slug: "elektronik/kamera/aksiyon-kamera", tags: ["GoPro Hero", "DJI Osmo Action", "Insta360", "Su Altı", "360° Kamera"] },
          { label: "Kamera Aksesuar", slug: "elektronik/kamera/kamera-aksesuar", q: "aksesuar", tags: ["Lens", "Tripod", "Gimbal", "Filtre", "Flaş", "Kamera Çantası"] },
          { label: "Güvenlik Kamerası", slug: "elektronik/ag-guvenlik/guvenlik-kamera", tags: ["IP Kamera", "Dome Kamera", "Gece Görüş", "Wi-Fi Kamera", "Kapalı Devre"] },
        ]
      },
      {
        label: "Oyun & Konsol", slug: "elektronik/oyun/konsol", icon: "🎮",
        subs: [
          { label: "Oyun Konsolu", slug: "elektronik/oyun/konsol/oyun-konsolu", tags: ["PlayStation 5", "Xbox Series X", "Nintendo Switch", "PS4", "Xbox One", "Retro Konsol"] },
          { label: "Oyun & Aksesuar", slug: "elektronik/oyun/konsol/aksesuar", tags: ["PS5 Oyun", "Xbox Oyun", "Nintendo Oyun", "DualSense Kol", "Xbox Kol", "Şarj İstasyonu"] },
          { label: "PC Oyun Ekipmanları", slug: "elektronik/oyun/konsol/pc-oyun", tags: ["Oyuncu Kulaklığı", "Gaming Mouse", "Mekanik Klavye", "Mousepad", "Headset Stand"] },
          { label: "VR & Simülasyon", slug: "elektronik/oyun/konsol/vr-sim", tags: ["Meta Quest", "PlayStation VR", "Sim Racing", "Joystick", "HOTAS"] },
        ]
      },
    ]
  },
  {
    title: "Moda", icon: "👗",
    cats: [
      {
        label: "Kadın Giyim", slug: "moda/kadin-giyim", icon: "👗",
        subs: [
          { label: "Elbise", slug: "moda/kadin-giyim/elbise", tags: ["Günlük Elbise", "Abiye", "Mini Elbise", "Midi Elbise", "Maxi Elbise", "Tül Elbise", "Çiçekli"] },
          { label: "Üst Giyim", slug: "moda/kadin-giyim/ust", tags: ["Tişört", "Bluz", "Crop Top", "Atlet", "Body"] },
          { label: "Tişört & Bluz", slug: "moda/kadin-giyim/tisort-bluz", tags: ["Basic Tişört", "Oversize Tişört", "Crop Top", "Polo Yaka", "Pamuklu", "Keten"] },
          { label: "Alt Giyim", slug: "moda/kadin-giyim/alt", tags: ["Pantolon", "Jean", "Şort", "Tayt"] },
          { label: "Pantolon & Jean", slug: "moda/kadin-giyim/pantolon-jean", tags: ["Skinny Jean", "Mom Jean", "Wide Leg", "Yüksek Bel", "Kumaş Pantolon", "Tayt"] },
          { label: "Dış Giyim", slug: "moda/kadin-giyim/dis-giyim", tags: ["Ceket", "Mont", "Trençkot", "Yağmurluk", "Yelek"] },
          { label: "Ceket & Mont", slug: "moda/kadin-giyim/ceket-mont", tags: ["Blazer", "Deri Ceket", "Kaban", "Parka", "Trençkot", "Puffer Mont"] },
          { label: "Etek", slug: "moda/kadin-giyim/etek", tags: ["Mini Etek", "Midi Etek", "Maxi Etek", "Pileli Etek", "Deri Etek", "Tül Etek"] },
          { label: "Kazak & Hırka", slug: "moda/kadin-giyim/kazak-hirka", tags: ["Oversize Kazak", "Crop Kazak", "Örgü Kazak", "Polar", "Sweatshirt", "Kapüşonlu"] },
          { label: "Büyük Beden", slug: "moda/kadin-giyim/buyuk-beden", tags: ["Büyük Beden Elbise", "Büyük Beden Tişört", "Büyük Beden Jean", "Tunik"] },
          { label: "Tesettür", slug: "moda/kadin-giyim/tesettur", tags: ["Tunik", "Abaya", "Tesettür Elbise", "Pardesü", "Şal", "Eşarp", "Tesettür Takım"] },
        ]
      },
      {
        label: "Erkek Giyim", slug: "moda/erkek-giyim", icon: "👔",
        subs: [
          { label: "Üst Giyim", slug: "moda/erkek-giyim/ust", tags: ["Tişört", "Gömlek", "Polo", "Sweatshirt", "Kazak"] },
          { label: "Tişört", slug: "moda/erkek-giyim/tisort", tags: ["Basic", "Polo Yaka", "Oversize", "V Yaka", "Pamuklu", "Baskılı"] },
          { label: "Gömlek", slug: "moda/erkek-giyim/gomlek", tags: ["Slim Fit", "Regular Fit", "Oxford", "Çizgili", "Keten", "Denim", "Flannel"] },
          { label: "Alt Giyim", slug: "moda/erkek-giyim/alt", tags: ["Pantolon", "Jean", "Şort", "Bermuda"] },
          { label: "Pantolon & Jean", slug: "moda/erkek-giyim/pantolon-jean", tags: ["Slim Fit Jean", "Regular Jean", "Cargo", "Chino", "Spor Şort", "Bermuda"] },
          { label: "Dış Giyim", slug: "moda/erkek-giyim/dis-giyim", tags: ["Ceket", "Mont", "Kaban", "Yağmurluk", "Yelek"] },
          { label: "Ceket & Mont", slug: "moda/erkek-giyim/ceket-mont", tags: ["Blazer", "Deri Ceket", "Kaban", "Parka", "Puffer", "Denim Ceket"] },
          { label: "Takım Elbise", slug: "moda/erkek-giyim/takim-elbise", tags: ["Slim Fit", "Regular Fit", "2 Parça Takım", "3 Parça Takım", "Düğün Takımı"] },
          { label: "Eşofman & Spor", slug: "moda/erkek-giyim/esofman", tags: ["Eşofman Takım", "Eşofman Altı", "Sweatshirt", "Kapüşonlu", "Polar"] },
          { label: "İç Giyim", slug: "moda/kadin-giyim/ic-giyim", tags: ["Boxer", "Slip", "Atlet", "Çorap", "Pijama", "Termal İçlik"] },
        ]
      },
      {
        label: "Kadın Ayakkabı", slug: "moda/kadin-ayakkabi", icon: "👠",
        subs: [
          { label: "Topuklu Ayakkabı", slug: "moda/kadin-ayakkabi/topuklu", tags: ["Stiletto", "Platform Topuk", "Dolgu Topuk", "Kısa Topuk", "Abiye Topuklu"] },
          { label: "Sneaker & Spor", slug: "moda/kadin-ayakkabi/sneaker", tags: ["Nike Air Force", "Adidas Stan Smith", "New Balance", "Puma", "Converse", "Vans"] },
          { label: "Sandalet & Terlik", slug: "moda/kadin-ayakkabi/sandalet", tags: ["Düz Sandalet", "Topuklu Sandalet", "Havuzbaşı Terlik", "Parmak Arası"] },
          { label: "Bot & Çizme", slug: "moda/kadin-ayakkabi/bot", tags: ["Diz Altı Bot", "Diz Üstü Çizme", "Chelsea Bot", "Kar Botu", "Combat Boot"] },
          { label: "Babet & Loafer", slug: "moda/kadin-ayakkabi/babet", tags: ["Deri Babet", "Tokalı Babet", "Loafer", "Espadrille", "Mokasen"] },
        ]
      },
      {
        label: "Erkek Ayakkabı", slug: "moda/erkek-ayakkabi", icon: "👞",
        subs: [
          { label: "Sneaker", slug: "moda/erkek-ayakkabi/sneaker", tags: ["Nike", "Adidas", "New Balance", "Puma", "Skechers", "Asics", "Converse"] },
          { label: "Klasik Ayakkabı", slug: "moda/erkek-ayakkabi/klasik", tags: ["Oxford", "Derby", "Loafer", "Deri Ayakkabı", "Mokasen"] },
          { label: "Bot & Çizme", slug: "moda/erkek-ayakkabi/bot", tags: ["Chelsea Bot", "Timberland", "Kar Botu", "Combat Boot", "Deri Bot"] },
          { label: "Spor & Koşu", slug: "moda/erkek-ayakkabi/spor-kosu", tags: ["Koşu Ayakkabısı", "Training", "Basketbol", "Futsal", "Trek"] },
          { label: "Sandalet & Terlik", slug: "moda/erkek-ayakkabi/sandalet-terlik", tags: ["Deri Sandalet", "Flip Flop", "Ev Terliği", "Casual Sandalet"] },
        ]
      },
      {
        label: "Çanta & Cüzdan", slug: "moda/aksesuar/canta-cuzdan", icon: "👜",
        subs: [
          { label: "Kadın Çanta", slug: "moda/aksesuar/canta-cuzdan/kadin-canta", tags: ["Omuz Çantası", "Sırt Çantası", "El Çantası", "Crossbody", "Tote Çanta", "Bel Çantası", "Abiye Çanta"] },
          { label: "Erkek Çanta", slug: "moda/aksesuar/canta-cuzdan/erkek-canta", tags: ["Sırt Çantası", "Laptop Çantası", "Postacı Çantası", "Bel Çantası", "Evrak Çantası"] },
          { label: "Valiz & Bavul", slug: "moda/aksesuar/canta-cuzdan/valiz-bavul", tags: ["Kabin Boy", "Orta Boy", "Büyük Boy", "Set Valiz", "Samsonite", "American Tourister"] },
          { label: "Cüzdan & Kartlık", slug: "moda/aksesuar/canta-cuzdan/cuzdan-kartlik", tags: ["Deri Cüzdan", "Kartlık", "Bozuk Para Kesesi", "Pasaport Kılıfı"] },
        ]
      },
      {
        label: "Saat & Takı", slug: "moda/aksesuar/saat-taki", icon: "💍",
        subs: [
          { label: "Kadın Saati", slug: "moda/aksesuar/saat-taki/kadin-saati", tags: ["Casio", "Fossil", "Michael Kors", "Guess", "Emporio Armani", "Kate Spade"] },
          { label: "Erkek Saati", slug: "moda/aksesuar/saat-taki/erkek-saati", tags: ["Casio G-Shock", "Seiko", "Tissot", "Fossil", "Hugo Boss", "Citizen"] },
          { label: "Takı", slug: "moda/aksesuar/saat-taki/taki", tags: ["Kolye", "Yüzük", "Bileklik", "Küpe", "Takı Seti", "Gümüş", "Altın Kaplama"] },
          { label: "Güneş Gözlüğü", slug: "moda/aksesuar/gozluk", tags: ["Ray-Ban", "Oakley", "Carrera", "Polarize", "Pilot", "Wayfarer", "Spor Gözlük"] },
          { label: "Kemer & Aksesuar", slug: "moda/aksesuar/saat-taki/kemer-aksesuar", tags: ["Deri Kemer", "Şapka", "Bere", "Atkı", "Eldiven", "Kravat", "Boyunluk"] },
        ]
      },
      {
        label: "Çocuk Giyim", slug: "moda/cocuk-moda/giyim", icon: "🧒",
        subs: [
          { label: "Kız Çocuk", slug: "moda/cocuk-moda/giyim/kiz-cocuk", tags: ["Elbise", "Tişört", "Tayt", "Sweatshirt", "Etek", "Mont", "LC Waikiki", "Zara Kids"] },
          { label: "Erkek Çocuk", slug: "moda/cocuk-moda/giyim/erkek-cocuk", tags: ["Tişört", "Jean", "Eşofman", "Şort", "Gömlek", "Mont", "LC Waikiki"] },
          { label: "Bebek Giyim", slug: "moda/cocuk-moda/giyim/bebek-giyim", tags: ["Body", "Tulum", "Pijama Set", "Hastane Çıkışı", "Çorap", "Şapka & Eldiven"] },
          { label: "Çocuk Ayakkabı", slug: "moda/cocuk-moda/ayakkabi", tags: ["Spor Ayakkabı", "Bot", "Sandalet", "Nike Kids", "Adidas Kids", "Converse"] },
        ]
      },
    ]
  },
  {
    title: "Ev, Yaşam, Kırtasiye, Ofis", icon: "🏠",
    cats: [
      {
        label: "Beyaz Eşya", slug: "beyaz-esya", icon: "🫙",
        subs: [
          { label: "Çamaşır Makinesi", slug: "beyaz-esya/camasir-makinesi", tags: ["Arçelik", "Bosch", "LG", "Samsung", "Beko", "Vestel", "Siemens", "Grundig"] },
          { label: "Bulaşık Makinesi", slug: "beyaz-esya/bulasik-makinesi", tags: ["Arçelik", "Bosch", "Beko", "Siemens", "Grundig", "Franke", "Ankastre"] },
          { label: "Buzdolabı", slug: "beyaz-esya/buzdolabi", tags: ["No-Frost", "A+++", "Çift Kapılı", "Arçelik", "LG", "Bosch", "Vestel", "Side by Side"] },
          { label: "Fırın & Ocak", slug: "beyaz-esya/firin-ocak", tags: ["Ankastre Fırın", "Bağımsız Ocak", "Ankastre Ocak", "Arçelik", "Bosch", "Siemens", "Franke"] },
          { label: "Kurutma Makinesi", slug: "beyaz-esya/kurutma-makinesi", tags: ["Isı Pompalı", "Yoğuşmalı", "Bosch", "LG", "Beko", "Siemens"] },
          { label: "Klima & Isıtıcı", slug: "beyaz-esya/klima", tags: ["Split Klima", "Inverter Klima", "Taşınabilir Klima", "Daikin", "Mitsubishi", "Arçelik", "Vestel"] },
          { label: "Aspiratör & Davlumbaz", slug: "beyaz-esya/aspirator-davlumbaz", tags: ["Davlumbaz", "Aspiratör", "Ankastre", "Bosch", "Siemens", "Arçelik", "Franke"] },
          { label: "Isıtıcı & Soba", slug: "beyaz-esya/isitici-soba", tags: ["Elektrikli Isıtıcı", "Yağlı Radyatör", "Halojen", "Soba", "Şömine", "Argo", "Sinbo"] },
          { label: "Mikrodalga", slug: "beyaz-esya/mikrodalga", tags: ["Ankastre Mikrodalga", "Tezgah Üstü", "Grill", "Inverter", "Samsung", "LG", "Arçelik"] },
        ]
      },
      {
        label: "Küçük Ev Aletleri", slug: "kucuk-ev-aletleri", icon: "🔌",
        subs: [
          { label: "Süpürge", slug: "kucuk-ev-aletleri/temizlik/supurge", tags: ["Robot Süpürge", "Dikey Süpürge", "Torbası", "Dyson", "Roomba", "Xiaomi", "Philips", "Miele"] },
          { label: "Robot Süpürge", slug: "kucuk-ev-aletleri/temizlik/robot-supurge", tags: ["Roborock", "Roomba", "Xiaomi Mi", "Lazerli", "Eufy", "Dreame"] },
          { label: "Temizlik Cihazları", slug: "kucuk-ev-aletleri/temizlik", tags: ["Buharlı Temizleyici", "Halı Yıkama", "Cam Temizleyici", "Dezenfektan"] },
          { label: "Kahve & Çay", slug: "kucuk-ev-aletleri/mutfak/kahve-makinesi", tags: ["Espresso Makinesi", "Nespresso", "Çay Makinesi", "French Press", "Delonghi", "Bialetti"] },
          { label: "Mutfak Aletleri", slug: "kucuk-ev-aletleri/mutfak", tags: ["Blender", "Mutfak Robotu", "Airfryer", "Çok Pişirici", "Tost Makinesi", "Waffle"] },
          { label: "Airfryer", slug: "kucuk-ev-aletleri/mutfak/airfryer", tags: ["Philips Airfryer", "Tefal Actifry", "Ninja Foodi", "Xiaomi", "Sinbo", "Arzum"] },
          { label: "Blender & Mutfak Robotu", slug: "kucuk-ev-aletleri/mutfak/blender-mutfak-robotu", tags: ["Süt Putirici", "Smoothie Maker", "Bosch MUM", "KitchenAid", "Tefal", "Arzum"] },
          { label: "Mikser", slug: "kucuk-ev-aletleri/mutfak/mikser", tags: ["El Mikseri", "Stand Mikser", "Hamur Yoğurma", "KitchenAid", "Bosch", "Arzum"] },
          { label: "Tost Makinesi", slug: "kucuk-ev-aletleri/mutfak/tost-makinesi", tags: ["Granitli", "Çıkarılabilir", "Sinbo", "Tefal", "Arzum", "Goldmaster"] },
          { label: "Su Isıtıcısı (Kettle)", slug: "kucuk-ev-aletleri/mutfak/su-isiticisi", tags: ["Cam Kettle", "Sıcaklık Ayarlı", "Russell Hobbs", "Philips", "Tefal"] },
          { label: "Hava Temizleyici", slug: "kucuk-ev-aletleri/ev-cihazlari/hava-temizleyici", tags: ["HEPA Filtre", "Nem Cihazı", "Air Purifier", "Xiaomi", "Philips", "Dyson"] },
          { label: "Tartı", slug: "kucuk-ev-aletleri/ev-cihazlari/tarti", tags: ["Dijital Tartı", "Bluetooth Tartı", "Vücut Analiz", "Xiaomi", "Sinbo", "Korona"] },
          { label: "Ütü & Buharlı", slug: "kucuk-ev-aletleri/ev-cihazlari/utu", tags: ["Buharlı Ütü", "Buharlı Dikey", "Philips", "Tefal", "Rowenta", "Braun"] },
          { label: "Saç Kurutma Makinesi", slug: "kucuk-ev-aletleri/kisisel-bakim/sac-kurutma", tags: ["Dyson Supersonic", "Babyliss", "Philips", "Remington", "Rowenta"] },
          { label: "Saç Stilizasyon", slug: "kozmetik/sac-bakim", tags: ["Saç Kurutma Makinesi", "Düzleştirici", "Maşa", "Dyson Airwrap", "Philips", "Remington"] },
          { label: "Kişisel Bakım Aleti", slug: "kucuk-ev-aletleri/kisisel-bakim-aleti", tags: ["Tıraş Makinesi", "Epilatör", "Yüz Temizleyici", "Diş Fırçası", "Braun", "Philips"] },
        ]
      },
      {
        label: "Mobilya & Dekorasyon", slug: "ev-yasam/mobilya", icon: "🛋️",
        subs: [
          { label: "Oturma Odası", slug: "ev-yasam/mobilya", tags: ["Koltuk Takımı", "Tekli Koltuk", "Sehpa", "TV Ünitesi", "Kitaplık", "Köşe Koltuk"] },
          { label: "Yatak Odası", slug: "ev-yasam/mobilya", tags: ["Yatak", "Baza", "Başlık", "Gardırop", "Komodin", "Şifonyer"] },
          { label: "Yemek & Çalışma", slug: "ev-yasam/mobilya/yemek-calisma", tags: ["Yemek Masası", "Sandalye", "Çalışma Masası", "Ofis Koltuğu", "Raf", "Kitaplık"] },
          { label: "Dekorasyon", slug: "ev-yasam/mobilya/dekorasyon", tags: ["Tablo", "Ayna", "Vazo", "Mum", "Mumluk", "Duvar Saati", "Heykelcik"] },
          { label: "Aydınlatma", slug: "ev-yasam/aydinlatma", tags: ["Avize", "Lambader", "Duvar Apliki", "Masa Lambası", "LED Şerit", "Gece Lambası"] },
          { label: "Bahçe & Balkon", slug: "ev-yasam/bahce-balkon", tags: ["Bahçe Mobilyası", "Şezlong", "Hamak", "Saksı", "Fener", "Güneşlik"] },
        ]
      },
      {
        label: "Mutfak & Sofra", slug: "ev-yasam/mutfak-sofra", icon: "🍽️",
        subs: [
          { label: "Pişirme Grubu", slug: "ev-yasam/mutfak-sofra/pisirme-grubu", tags: ["Tencere Seti", "Döküm Tencere", "Tava", "Wok", "Düdüklü Tencere", "Tefal", "WMF", "Le Creuset"] },
          { label: "Yemek & Kahvaltı Takımı", slug: "ev-yasam/mutfak-sofra/yemek-kahvalti-takimi", tags: ["Seramik Set", "Porselen Set", "Bardak Seti", "Çatal Bıçak", "Kahvaltı Seti", "Karaca"] },
          { label: "Saklama & Depolama", slug: "ev-yasam/mutfak-sofra/saklama-depolama", tags: ["Saklama Kabı", "Kavanoz", "Vakumlu Kap", "Baharat Seti", "Organizer"] },
          { label: "Temizlik & Aksesuar", slug: "ev-yasam/mutfak-sofra/temizlik-aksesuar", tags: ["Mutfak Havlusu", "Önlük", "Fırın Eldiveni", "Süzgeç", "Rende"] },
        ]
      },
      {
        label: "Ev Tekstili", slug: "ev-yasam/ev-tekstili", icon: "🛏️",
        subs: [
          { label: "Nevresim & Yatak", slug: "ev-yasam/ev-tekstili/nevresim-yatak", tags: ["Nevresim Takımı", "Yorgan", "Yastık", "Uyku Seti", "Pike", "Çarşaf"] },
          { label: "Havlu & Bornoz", slug: "ev-yasam/ev-tekstili/havlu-bornoz", tags: ["Banyo Havlusu", "El Havlusu", "Bornoz", "Peshtemal", "Bambu Havlu"] },
          { label: "Halı & Perde", slug: "ev-yasam/ev-tekstili/hali-perde", tags: ["Makine Halısı", "Kilim", "Tül Perde", "Fon Perde", "Stor Perde", "Jaluzi"] },
          { label: "Koltuk Örtüsü & Kırlent", slug: "ev-yasam/ev-tekstili/koltuk-ortusu-kirlent", tags: ["Kanepe Örtüsü", "Kırlent", "Yastık Kılıfı", "Koltuk Kılıfı"] },
        ]
      },
      {
        label: "Yapı Market & Bahçe", slug: "yapi-market", icon: "🔧",
        subs: [
          { label: "Elektrikli El Aletleri", slug: "yapi-market/elektrikli-el-aletleri", tags: ["Matkap", "Testere", "Taşlama Makinesi", "Bosch", "Makita", "DeWalt", "Black+Decker"] },
          { label: "El Aletleri", slug: "yapi-market", tags: ["Tornavida Seti", "Çekiç", "Pense", "Anahtar Seti", "Stanley", "Bahçe Seti"] },
          { label: "Boya & Yapıştırıcı", slug: "yapi-market/boya-yapistirici", tags: ["İç Cephe Boyası", "Dış Cephe", "Silikon", "Macun", "Astar", "Rulo Fırça"] },
          { label: "Bahçe Aletleri", slug: "ev-yasam/bahce-balkon/bahce-aletleri", tags: ["Çim Biçme", "Çalı Kesme", "Sulama Sistemi", "Bosch", "Gardena", "Husqvarna"] },
        ]
      },
      {
        label: "Kırtasiye & Ofis", slug: "hobi-eglence/kitap-kirtasiye/kirtasiye", icon: "✏️",
        subs: [
          { label: "Okul Malzemeleri", slug: "hobi-eglence/kitap-kirtasiye/kirtasiye/okul-malzemeleri", tags: ["Defter", "Kalem Seti", "Silgi", "Cetvel", "Pergel", "Boya Kalemi", "Faber-Castell"] },
          { label: "Ofis Malzemeleri", slug: "hobi-eglence/kitap-kirtasiye/kirtasiye/ofis-malzemeleri", tags: ["Ajanda", "Dosyalama", "Klasör", "Zımba", "Delgeç", "Beyaz Tahta"] },
          { label: "Ofis Mobilyası", slug: "ev-yasam/mobilya/ofis", tags: ["Ergonomik Koltuk", "Ayaklı Masa", "Çekmeceli Raf", "Gaming Koltuk", "Herman Miller"] },
          { label: "Hesap Makinesi & Ofis Ekipmanı", slug: "ev-yasam/mobilya/ofis", tags: ["Bilimsel Hesap Makinesi", "Grafik", "Masaüstü", "Casio", "Barkod Okuyucu"] },
        ]
      },
    ]
  },
  {
    title: "Oto, Bahçe, Yapı Market", icon: "🚗",
    cats: [
      {
        label: "Araç Elektroniği", slug: "otomotiv/arac-elektronigi", icon: "📻",
        subs: [
          { label: "Teyp & Multimedya", slug: "otomotiv", tags: ["2 DIN", "Android Auto", "Apple CarPlay", "Pioneer", "Sony", "Kenwood", "JVC"] },
          { label: "Navigasyon & GPS", slug: "otomotiv/navigasyon", tags: ["Garmin", "TomTom", "Oto GPS", "Navigasyon Ekranı", "Taşınabilir GPS"] },
          { label: "Dashcam & Geri Görüş", slug: "otomotiv/arac-elektronigi/dashcam-geri-gorus", tags: ["Araç İçi Kamera", "Geri Görüş Kamerası", "360° Kamera", "Gece Görüş"] },
          { label: "Araç Ses Sistemi", slug: "otomotiv/arac-elektronigi/arac-ses-sistemi", tags: ["Hoparlör", "Subwoofer", "Amfi", "Pioneer", "JBL", "Hertz"] },
          { label: "Araç Güvenliği", slug: "otomotiv/arac-elektronigi/arac-guvenligi", tags: ["Alarm", "Takip Cihazı", "Kilit", "İmmobilizer"] },
        ]
      },
      {
        label: "Lastik & Jant", slug: "otomotiv/lastik-jant", icon: "🛞",
        subs: [
          { label: "Yaz Lastiği", slug: "otomotiv/lastik-jant/yaz-lastigi", tags: ["Michelin", "Bridgestone", "Pirelli", "Goodyear", "Continental", "Dunlop"] },
          { label: "Kış & 4 Mevsim Lastiği", slug: "otomotiv/lastik-jant/kis-4-mevsim-lastigi", tags: ["Michelin Kış", "Nokian", "Bridgestone Blizzak", "4 Mevsim", "Dunlop Winter"] },
          { label: "Jant", slug: "otomotiv/lastik-jant/jant", tags: ["Çelik Jant", "Alüminyum Jant", "15 inç", "17 inç", "18 inç", "19 inç"] },
          { label: "Lastik Aksesuar", slug: "otomotiv/lastik-jant/lastik-aksesuar", tags: ["Kar Zinciri", "Lastik Basınç Ölçer", "Çivi Lastiği", "Nitrojen Valfi"] },
        ]
      },
      {
        label: "Araç Bakım & Aksesuar", slug: "otomotiv/arac-aksesuar", icon: "🔧",
        subs: [
          { label: "Dış Aksesuar", slug: "otomotiv/arac-aksesuar/dis-aksesuar", tags: ["Oto Paspas", "Güneşlik", "Kar Fırçası", "Silecek Süpürgesi", "Anten", "Spoiler"] },
          { label: "İç Aksesuar", slug: "otomotiv/arac-aksesuar/ic-aksesuar", tags: ["Kol Dayama", "Deri Kılıf", "Oto Organizeri", "Vantuz Tutucu", "Araç Parfümü"] },
          { label: "Bakım & Temizlik", slug: "otomotiv/arac-aksesuar/bakim-temizlik", tags: ["Motor Yağı", "Antifriz", "Araç Cilası", "Fren Sıvısı", "Castrol", "Mobil", "Shell"] },
          { label: "Akü & Elektrik", slug: "otomotiv/arac-aksesuar/aku-elektrik", tags: ["Akü", "Taşınabilir Şarj", "OBD2 Tarayıcı", "Atlama Kablosu"] },
        ]
      },
      {
        label: "Motor & Scooter", slug: "otomotiv/motor-scooter", icon: "🏍️",
        subs: [
          { label: "Motosiklet Ekipmanı", slug: "otomotiv/motor-scooter/motosiklet-ekipmani", tags: ["Kask", "Motosiklet Eldiveni", "Motosiklet Montu", "Motosiklet Botu", "Bel Kemeri"] },
          { label: "Elektrikli Scooter", slug: "spor-outdoor/bisiklet/elektrikli-scooter", tags: ["Xiaomi", "Segway Ninebot", "Kaabo", "Motus"] },
          { label: "Motosiklet Aksesuar", slug: "otomotiv/motor-scooter/motosiklet-aksesuar", tags: ["Yan Çanta", "GPS Tutucu", "Kilit", "Örtü", "Hava Filtresi"] },
        ]
      },
      {
        label: "Bahçe & Dış Mekan", slug: "ev-yasam/bahce-balkon", icon: "🌿",
        subs: [
          { label: "Bahçe Aletleri", slug: "ev-yasam/bahce-balkon/bahce-aletleri", tags: ["Çim Biçme Makinesi", "Çalı Kesme", "Budama Makası", "Bosch", "Gardena", "Husqvarna"] },
          { label: "Sulama Sistemi", slug: "ev-yasam/bahce-balkon/sulama-sistemi", tags: ["Otomatik Sulama", "Hortum", "Sulama Başlığı", "Karavan Sulama", "Gardena"] },
          { label: "Bahçe Mobilyası", slug: "ev-yasam/mobilya", tags: ["Bahçe Masası", "Plastik Sandalye", "Hamak", "Şezlong", "Kamp Sandalyesi"] },
          { label: "Bitki & Saksı", slug: "ev-yasam/bahce-balkon/bitki-saksi", tags: ["Saksı", "Toprak", "Gübre", "Tohum", "İç Mekan Bitkisi"] },
        ]
      },
      {
        label: "Yapı Market", slug: "yapi-market", icon: "🔨",
        subs: [
          { label: "Elektrikli El Aletleri", slug: "yapi-market/elektrikli-aletler", tags: ["Matkap", "Açılı Taşlama", "Daire Testere", "Bosch", "Makita", "DeWalt", "Hikoki"] },
          { label: "El Aletleri", slug: "yapi-market/el-aletleri", tags: ["Tornavida", "Çekiç", "Pense Seti", "İngiliz Anahtarı", "Stanley"] },
          { label: "Boya & Malzeme", slug: "yapi-market/boya", tags: ["İç Cephe", "Dış Cephe", "Astar", "Silikon", "Filli Boya", "Marshall"] },
          { label: "Elektrik Malzeme", slug: "yapi-market/elektrik", tags: ["Priz", "Anahtar", "LED Ampul", "Uzatma Kablo", "Multimetre"] },
          { label: "Su Tesisat", slug: "yapi-market/su-tesisati", tags: ["Duş Hortumu", "Vana", "Musluk Contası"] },
          { label: "Hırdavat & Vida", slug: "yapi-market/hirdavat", tags: ["Vida", "Dübel", "Çivi", "Menteşe"] },
        ]
      },
      {
        label: "Oto Yedek Parça & Bakım", slug: "otomotiv/oto-yedek-parca", icon: "🔩",
        subs: [
          { label: "Oto Akü", slug: "otomotiv/oto-aku", tags: ["60 AH", "75 AH", "Mutlu", "İnci", "Varta"] },
          { label: "Oto Yağ & Bakım", slug: "otomotiv/motor-yagi-bakim", tags: ["10W40", "5W30", "Antifriz", "Castrol", "Shell Helix", "Mobil"] },
          { label: "Fren & Süspansiyon", slug: "otomotiv/oto-yedek-parca/fren-suspansiyon", tags: ["Fren Balata", "Fren Diski", "Amortisör", "Debriyaj"] },
          { label: "Silecek & Ampul", slug: "otomotiv/oto-yedek-parca/silecek-ampul", tags: ["Silecek", "Far Ampul", "Xenon", "Stop Ampul"] },
        ]
      },
    ]
  },
  {
    title: "Anne, Bebek, Oyuncak", icon: "🧸",
    cats: [
      {
        label: "Bebek Bakım", slug: "anne-bebek/bebek-bakim", icon: "🍼",
        subs: [
          { label: "Bebek Bezi & Islak Mendil", slug: "anne-bebek/bebek-bakim/bebek-bezi", tags: ["Pampers", "Huggies", "Sleepy", "Molfix", "Prima", "Bebek Bezi Kovası"] },
          { label: "Beslenme & Emzirme", slug: "anne-bebek/bebek-beslenme/biberon-emzik", tags: ["Biberon", "Emzik", "Göğüs Pompası", "Mama", "Sterilizatör", "Biberon Isıtıcı", "Philips Avent"] },
          { label: "Bebek Kozmetik", slug: "anne-bebek/bebek-bakim/bebek-kozmetik", tags: ["Bebek Şampuanı", "Bebek Kremi", "Bebek Yağı", "Bebek Sabunu", "Johnson's", "Sebamed"] },
          { label: "Bebek Sağlığı", slug: "anne-bebek/bebek-bakim/bebek-sagligi", tags: ["Ateş Ölçer", "Burun Aspiratörü", "Tırnak Makası", "Bebek Monitörü", "Nazal Aspiratör"] },
        ]
      },
      {
        label: "Bebek Arabası & Güvenlik", slug: "anne-bebek/bebek-tasima", icon: "🛒",
        subs: [
          { label: "Bebek Arabası", slug: "anne-bebek/bebek-tasima/araba-puset", tags: ["Tam Yatar Araba", "Puset", "3'ü 1 Arada", "Çift Bebek", "Chicco", "Joie", "Bugaboo", "Stokke"] },
          { label: "Oto Koltuğu", slug: "anne-bebek/bebek-tasima/oto-koltugu", tags: ["0-13 kg", "9-36 kg", "9-18 kg", "Maxi-Cosi", "Chicco", "BeSafe", "Cybex"] },
          { label: "Yürüteç & Salıncak", slug: "anne-bebek/bebek-tasima/yurutec-salincak", tags: ["Yürüteç", "Bebek Salıncağı", "Ana Kucağı", "Portbebe", "Kanguru"] },
          { label: "Ev Güvenliği", slug: "anne-bebek/bebek-bakim", tags: ["Kapı Kilidi", "Köşe Koruyucu", "Priz Kapağı", "Merdiven Kapısı", "Kamera"] },
        ]
      },
      {
        label: "Bebek Odası", slug: "anne-bebek/cocuk-odasi", icon: "🛏️",
        subs: [
          { label: "Beşik & Bebek Yatağı", slug: "anne-bebek/bebek-tasima/besik", tags: ["Ahşap Beşik", "Park Yatak", "Tekerlekli Beşik", "Co-Sleeper", "Çok Fonksiyonlu Beşik"] },
          { label: "Bebek Nevresimi", slug: "ev-yasam/ev-tekstili", tags: ["Nevresim Seti", "Uyku Seti", "Bebek Yorgan", "Bebek Yastığı", "Battaniye"] },
          { label: "Oyun Matı & Parkı", slug: "anne-bebek/cocuk-odasi/oyun-mati-parki", tags: ["Aktivite Matı", "Oyun Parkı", "Oyun Halısı", "Çadır Ev", "Kum Havuzu"] },
        ]
      },
      {
        label: "Oyuncak", slug: "anne-bebek/oyuncak", icon: "🎁",
        subs: [
          { label: "LEGO", slug: "anne-bebek/oyuncak/lego", tags: ["LEGO City", "LEGO Technic", "LEGO Star Wars", "LEGO Friends", "LEGO Creator", "LEGO Duplo"] },
          { label: "Eğitici Oyuncak", slug: "anne-bebek/oyuncak/egitici", tags: ["Montessori", "Ahşap Oyuncak", "Puzzle", "Dil Öğreten", "Fisher-Price", "Vtech"] },
          { label: "Figür & Oyuncak Bebek", slug: "anne-bebek/oyuncak/figur", tags: ["Barbie", "Hot Wheels", "Marvel Figür", "DC Figür", "Funko Pop", "Playmobil"] },
          { label: "RC & Robot", slug: "anne-bebek/oyuncak/rc-robot", tags: ["Kumandalı Araba", "RC Helikopter", "Mini Drone", "Robot", "Yarış Pisti"] },
          { label: "Açık Hava & Spor", slug: "anne-bebek/oyuncak/acik-hava-spor", tags: ["Bisiklet", "Scooter", "Trambolin", "Kaydırak", "Kum Havuzu", "Akülü Araba"] },
          { label: "Masa Oyunları", slug: "anne-bebek/oyuncak/masa-oyunu", tags: ["Monopoly", "Scrabble", "UNO", "Chess", "Jenga", "Cluedo"] },
          { label: "Diğer Oyuncak", slug: "anne-bebek/oyuncak/diger", tags: ["Akıllı Oyuncak", "Yapboz", "Müzikli", "Bebek Yatak Oyuncağı", "Banyo Oyuncağı"] },
        ]
      },
      {
        label: "Çocuk Giyim & Ayakkabı", slug: "moda/cocuk-moda", icon: "👟",
        subs: [
          { label: "Kız Çocuk", slug: "moda/cocuk-moda/giyim/kiz-cocuk", tags: ["Elbise", "Tişört", "Tayt", "Mont", "Sweatshirt", "LC Waikiki", "DeFacto"] },
          { label: "Erkek Çocuk", slug: "moda/cocuk-moda/giyim/erkek-cocuk", tags: ["Tişört", "Eşofman", "Jean", "Gömlek", "Mont", "LC Waikiki", "DeFacto"] },
          { label: "Çocuk Ayakkabı", slug: "moda/cocuk-moda/giyim", tags: ["Spor Ayakkabı", "Bot", "Sandalet", "Nike Kids", "Adidas Kids", "Superfit"] },
          { label: "Bebek Giyim", slug: "moda/cocuk-moda/giyim/bebek-giyim", tags: ["Body", "Tulum", "Pijama", "Zıbın", "Çorap", "Şapka"] },
        ]
      },
    ]
  },
  {
    title: "Spor, Outdoor", icon: "🏃",
    cats: [
      {
        label: "Spor Giyim & Ayakkabı", slug: "spor-outdoor", icon: "👟",
        subs: [
          { label: "Kadın Spor Giyim", slug: "spor-outdoor/kadin-spor-giyim", tags: ["Tayt", "Spor Sütyeni", "Crop Sweatshirt", "Eşofman Takım", "Yağmurluk", "Termal"] },
          { label: "Erkek Spor Giyim", slug: "spor-outdoor/erkek-spor-giyim", tags: ["Spor Tişört", "Şort", "Eşofman Takım", "Polar", "Parka", "Rüzgarlık"] },
          { label: "Koşu Ayakkabısı", slug: "spor-outdoor/kosu-ayakkabisi", tags: ["Nike", "Adidas", "ASICS", "New Balance", "Brooks", "Saucony", "Hoka"] },
          { label: "Outdoor Giyim", slug: "moda/erkek-giyim/dis-giyim", tags: ["The North Face", "Columbia", "Jack Wolfskin", "Patagonia", "Mammut", "Salomon"] },
          { label: "Termal & Outdoor Alt Katman", slug: "moda/erkek-giyim/dis-giyim", tags: ["Termal Tayt", "Termal Tişört", "Polar Yelek", "Softshell"] },
        ]
      },
      {
        label: "Fitness & Kondisyon", slug: "spor-outdoor/fitness", icon: "🏋️",
        subs: [
          { label: "Kondisyon Aleti", slug: "spor-outdoor/fitness/kondisyon-aleti", tags: ["Koşu Bandı", "Eliptik Bisiklet", "Kondisyon Bisikleti", "Kürek Makinesi", "NordicTrack", "Technogym"] },
          { label: "Ağırlık & Güç", slug: "spor-outdoor/fitness/agirlik-guc", tags: ["Dumbbell Seti", "Olimpik Halter", "Ağırlık Plakası", "Rack", "Bench Press", "EZ Bar"] },
          { label: "Fonksiyonel Ekipman", slug: "spor-outdoor/fitness/fonksiyonel-ekipman", tags: ["Kettlebell", "TRX", "Resistance Band", "Pull-up Bar", "Battle Rope", "Ab Tekerleği"] },
          { label: "Yoga & Pilates", slug: "spor-outdoor/fitness/yoga-pilates", tags: ["Yoga Matı", "Yoga Bloku", "Pilates Topu", "Foam Roller", "Manduka", "Gaiam"] },
          { label: "Sporcu Beslenmesi", slug: "spor-outdoor/fitness/sporcu-beslenmesi", tags: ["Whey Protein", "BCAA", "Kreatin", "Multivitamin", "Pre-Workout", "Protein Bar"] },
        ]
      },
      {
        label: "Outdoor & Kamp", slug: "spor-outdoor/kamp", icon: "🏕️",
        subs: [
          { label: "Kamp Ekipmanları", slug: "spor-outdoor/kamp/kamp-ekipmanlari", tags: ["Kamp Çadırı", "Uyku Tulumu", "Kamp Matı", "Kamp Ocağı", "Kamp Lambası", "Çakmak"] },
          { label: "Tırmanma & Dağcılık", slug: "spor-outdoor/kamp/tirmanma-dagcilik", tags: ["Tırmanma Ayakkabısı", "Emniyet Kemeri", "Karabina", "Kask", "Bel Çantası"] },
          { label: "Av & Balıkçılık", slug: "spor-outdoor/kamp/av-balikcilik", tags: ["Olta Takımı", "Balık Makinesi", "Misina", "Balık Çantası", "Kuru Kafa"] },
          { label: "Baş Lambası & Pusula", slug: "spor-outdoor/kamp/bas-lambasi-pusula", tags: ["Baş Lambası", "Fener", "Pusula", "Düdük", "Acil Set"] },
        ]
      },
      {
        label: "Bisiklet & Scooter", slug: "spor-outdoor/bisiklet", icon: "🚴",
        subs: [
          { label: "Bisiklet", slug: "spor-outdoor/bisiklet", tags: ["Dağ Bisikleti", "Yol Bisikleti", "Kent Bisikleti", "Elektrikli Bisiklet", "BMX", "Çocuk Bisikleti"] },
          { label: "Elektrikli Scooter", slug: "spor-outdoor/bisiklet/elektrikli-scooter", tags: ["Xiaomi Scooter", "Segway", "Ninebot", "Kaabo", "Motus"] },
          { label: "Bisiklet Aksesuar", slug: "spor-outdoor/bisiklet/bisiklet-aksesuar", tags: ["Kask", "Kilit", "Su Şişesi", "Bisiklet Çantası", "Işık Seti", "Tamir Kiti"] },
          { label: "Paten & Kaykay", slug: "spor-outdoor/bisiklet/paten-kaykay", tags: ["Inline Paten", "Buz Pateni", "Skateboard", "Longboard", "Paten Koruyucu"] },
        ]
      },
      {
        label: "Takım & Su Sporları", slug: "spor-outdoor/takim-sporlari", icon: "⚽",
        subs: [
          { label: "Futbol", slug: "spor-outdoor/takim-sporlari/futbol", tags: ["Top", "Krampon", "Halı Saha Ayakkabısı", "Kale Eldiveni", "Forma", "Nike", "Adidas", "Puma"] },
          { label: "Basketbol & Voleybol", slug: "spor-outdoor/takim-sporlari/basketbol-voleybol", tags: ["Basketbol Topu", "Voleybol Topu", "Pota", "Wilson", "Spalding", "Molten"] },
          { label: "Tenis & Badminton", slug: "spor-outdoor/takim-sporlari/tenis-badminton", tags: ["Tenis Raketi", "Badminton Raketi", "Top", "Wilson", "Head", "Babolat", "Yonex"] },
          { label: "Su Sporları", slug: "spor-outdoor/su-sporlari", tags: ["Mayo", "Yüzücü Gözlüğü", "Palet", "Çıkış Takımı", "Speedo", "Arena"] },
          { label: "Boks & Dövüş", slug: "spor-outdoor/takim-sporlari/boks-dovus", tags: ["Boks Eldiveni", "Kum Torbası", "Koruyucu", "Atlatik", "Venum", "Everlast"] },
        ]
      },
    ]
  },
  {
    title: "Kozmetik, Kişisel Bakım", icon: "💄",
    cats: [
      {
        label: "Cilt Bakımı", slug: "kozmetik/cilt-bakim", icon: "🧴",
        subs: [
          { label: "Yüz Nemlendirici", slug: "kozmetik/cilt-bakim/nemlendirici", tags: ["Normal Cilt", "Yağlı Cilt", "Kuru Cilt", "Karma Cilt", "Olay", "Neutrogena", "La Roche-Posay"] },
          { label: "Yüz Temizleme", slug: "kozmetik/cilt-bakim/yuz-temizleme", tags: ["Yüz Köpüğü", "Yüz Jeli", "Misel Suyu", "Tonik", "Yüz Ovası", "Garnier", "Cetaphil"] },
          { label: "Güneş Koruyucu", slug: "kozmetik/cilt-bakim/gunes-koruyucu", tags: ["SPF 50+", "SPF 30", "Renkli Güneş Kremi", "Avene", "Eucerin", "Isola", "Altruist"] },
          { label: "Serum & Ampul", slug: "kozmetik/cilt-bakim/serum", tags: ["C Vitamini Serumu", "Niacinamide", "Retinol", "Hyaluronik Asit", "The Ordinary", "Garnier"] },
          { label: "Yüz Maskesi", slug: "kozmetik/cilt-bakim/maske", tags: ["Kil Maskesi", "Soyulabilir", "Yaprak Maske", "Gözenek Temizleyici", "Origins", "Freeman"] },
          { label: "Vücut Bakımı", slug: "kozmetik/cilt-bakim/vucut-bakimi", tags: ["Vücut Losyonu", "Vücut Peelingi", "Selülit Kremi", "Sıkılaştırıcı", "Nivea", "Dove"] },
        ]
      },
      {
        label: "Makyaj", slug: "kozmetik/makyaj", icon: "💋",
        subs: [
          { label: "Yüz Makyajı", slug: "kozmetik/makyaj/yuz", tags: ["Fondöten", "Kapatıcı", "Pudra", "Allık", "Highlighter", "Kontür", "BB Krem"] },
          { label: "Göz Makyajı", slug: "kozmetik/makyaj/goz", tags: ["Maskara", "Eyeliner", "Far Paleti", "Göz Kalemi", "Kaş Kalemi", "Kaş Jeli", "Kaş Penci"] },
          { label: "Dudak Makyajı", slug: "kozmetik/makyaj/dudak", tags: ["Ruj", "Lip Gloss", "Dudak Kalemi", "Lip Liner", "MAC", "Charlotte Tilbury", "NARS"] },
          { label: "Makyaj Aksesuarı", slug: "kozmetik/makyaj/makyaj-aksesuari", tags: ["Fırça Seti", "Makyaj Süngeri", "Makyaj Çantası", "Ayna", "Göz Kırpağı"] },
          { label: "Tırnak", slug: "kozmetik/makyaj/tirnak", tags: ["Oje", "Tırnak Jeli", "UV Lamba", "Bazlı Oje", "Tırnak Bakım", "OPI", "Essie"] },
        ]
      },
      {
        label: "Saç Bakımı", slug: "kozmetik/sac-bakim", icon: "💇",
        subs: [
          { label: "Şampuan & Saç Kremi", slug: "kozmetik/sac-bakim/sampuan", tags: ["Kepek Önleyici", "Boyalı Saç", "Kuru Saç", "Argan Yağlı", "Pantene", "Head & Shoulders", "Elvive"] },
          { label: "Saç Maskesi & Serum", slug: "kozmetik/sac-bakim/sac-maskesi-serum", tags: ["Keratin Maskesi", "Onarıcı Maske", "Saç Serumu", "Wella", "Schwarzkopf", "Tresemmé"] },
          { label: "Saç Boyası", slug: "kozmetik/sac-bakim/boya", tags: ["Kalıcı Boya", "Yarı Kalıcı", "Röfle & Balyaj", "Garnier Olia", "L'Oréal", "Schwarzkopf"] },
          { label: "Saç Şekillendirici", slug: "kozmetik/sac-bakim/sac-sekillendirici", tags: ["Wax", "Jöle", "Saç Spreyi", "Kuru Şampuan", "Isı Koruyucu", "Saç Köpüğü"] },
        ]
      },
      {
        label: "Parfüm & Deodorant", slug: "kozmetik/parfum", icon: "🌸",
        subs: [
          { label: "Kadın Parfümü", slug: "kozmetik/parfum/kadin", tags: ["Chanel No 5", "Dior Miss Dior", "Versace Bright Crystal", "YSL Black Opium", "Lancôme", "Gucci"] },
          { label: "Erkek Parfümü", slug: "kozmetik/parfum/erkek", tags: ["Dior Sauvage", "Armani Acqua di Gio", "Hugo Boss Bottled", "Paco Rabanne 1 Million", "Bleu de Chanel"] },
          { label: "Unisex Parfüm", slug: "kozmetik/parfum/unisex", tags: ["Maison Margiela", "Jo Malone", "Acqua di Parma", "Tom Ford", "Byredo"] },
          { label: "Deodorant", slug: "kozmetik/parfum/deodorant", tags: ["Dove", "Rexona", "Nivea", "Axe", "Old Spice", "Roll-on", "Sprey Deodorant"] },
          { label: "Kolonya", slug: "kozmetik/parfum/kolonya", tags: ["Limon Kolonyası", "Çiçek Kolonyası", "Eyüp Sabri Tuncer", "Rebul", "Arko"] },
        ]
      },
      {
        label: "Ağız & Diş Sağlığı", slug: "kozmetik/kisisel-bakim/agiz-dis", icon: "🦷",
        subs: [
          { label: "Diş Fırçası", slug: "kozmetik/kisisel-bakim/agiz-dis/dis-fircasi", tags: ["Elektrikli Diş Fırçası", "Sonik Diş Fırçası", "Oral-B", "Philips Sonicare", "Braun"] },
          { label: "Diş Macunu & Gargara", slug: "kozmetik/kisisel-bakim/agiz-dis/dis-macunu-gargara", tags: ["Beyazlatıcı", "Hassas Diş", "Florürsüz", "Colgate", "Signal", "Sensodyne", "Listerine"] },
          { label: "Ağız Duşu & Diş İpi", slug: "kozmetik/kisisel-bakim/agiz-dis/agiz-dusu-dis-ipi", tags: ["Waterpik", "Oral-B Ağız Duşu", "Diş İpi", "Ara Yüz Fırçası"] },
        ]
      },
      {
        label: "Erkek Bakımı", slug: "kozmetik/kisisel-bakim/erkek", icon: "🪒",
        subs: [
          { label: "Tıraş Makinesi", slug: "kozmetik/kisisel-bakim/erkek/tiras-makinesi", tags: ["Döner Başlık", "Folyo Başlık", "Islak/Kuru", "Braun Series", "Philips Series", "Panasonic"] },
          { label: "Tıraş Ürünleri", slug: "kozmetik/kisisel-bakim/erkek/tiras-urunleri", tags: ["Tıraş Jeli", "Köpük", "Tıraş Sonrası Balm", "Bıçak Kartuşu", "Gillette Fusion", "Wilkinson"] },
          { label: "Saç & Sakal Makinesi", slug: "kozmetik/kisisel-bakim/erkek/sac-sakal-makinesi", tags: ["Saç Kesme Makinesi", "Sakal Makinesi", "Tırım Makinesi", "Philips", "Wahl", "Remington"] },
          { label: "Erkek Cilt Bakımı", slug: "kozmetik/kisisel-bakim/erkek/erkek-cilt-bakimi", tags: ["Erkek Yüz Kremi", "Güneş Kremi", "Göz Kremi", "Nivea Men", "L'Oréal Men Expert"] },
        ]
      },
    ]
  },
  {
    title: "Süpermarket, Pet Shop", icon: "🛒",
    cats: [
      {
        label: "Ev Temizliği", slug: "ev-yasam/temizlik", icon: "🧹",
        subs: [
          { label: "Çamaşır", slug: "ev-yasam/temizlik/camasir", tags: ["Toz Deterjan", "Sıvı Deterjan", "Kapsül", "Leke Çıkarıcı", "Çamaşır Suyu", "Yumuşatıcı", "Ariel", "Omo", "Persil"] },
          { label: "Bulaşık", slug: "ev-yasam/temizlik/bulasik", tags: ["Bulaşık Deterjanı", "Tablet", "Kapsül", "Makine Tuzu", "Parlatıcı", "Fairy", "Pril", "Finish"] },
          { label: "Yüzey Temizleyici", slug: "ev-yasam/temizlik/yuzey-temizleyici", tags: ["Çok Amaçlı", "Banyo Temizleyici", "Mutfak Temizleyici", "Cam Sileceği", "Domestos", "Cillit Bang"] },
          { label: "Kağıt Ürünleri", slug: "ev-yasam/temizlik/kagit-urunleri", tags: ["Tuvalet Kağıdı", "Kağıt Havlu", "Peçete", "Islak Mendil", "Selpak", "Lotus", "Papia"] },
          { label: "Çöp Torbası & Temizlik Araçları", slug: "ev-yasam/temizlik/cop-torbasi-temizlik-araclari", tags: ["Çöp Torbası", "Temizlik Bezi", "Paspas", "Fırça", "Süpürge"] },
        ]
      },
      {
        label: "Kişisel Bakım (Market)", slug: "kozmetik/kisisel-bakim/hijyen", icon: "🧼",
        subs: [
          { label: "Duş & Banyo", slug: "kozmetik/kisisel-bakim/hijyen/dus-banyo", tags: ["Duş Jeli", "Sabun", "Banyo Köpüğü", "Vücut Fırçası", "Dove", "Nivea", "Palmolive", "Lux"] },
          { label: "Kadın Hijyen", slug: "kozmetik/kisisel-bakim/hijyen/kadin-hijyen", tags: ["Günlük Ped", "Tampon", "Emici Iç Çamaşırı", "Always", "Kotex", "Orkid", "Naturella"] },
          { label: "Kıl Giderme & Epilasyon", slug: "kozmetik/kisisel-bakim/hijyen/kil-giderme-epilasyon", tags: ["Ağda", "Epilasyon Bandı", "Epilasyon Kremi", "Bıçak", "Braun Silk-épil"] },
          { label: "Güneş Ürünleri (Gıda)", slug: "kozmetik/cilt-bakim", tags: ["SPF 50 Krem", "Bronzlaştırıcı", "Güneş Sonrası Losyon"] },
        ]
      },
      {
        label: "Gıda & İçecek", slug: "supermarket/gida-icecek", icon: "🛒",
        subs: [
          { label: "Atıştırmalık & Çikolata", slug: "supermarket/gida-icecek/atistirmalik", tags: ["Çikolata", "Bisküvi", "Gofret", "Cips", "Kraker", "Milka", "Ülker", "M&M"] },
          { label: "İçecek", slug: "supermarket/gida-icecek/icecek", tags: ["Kola", "Pepsi", "Meyve Suyu", "Maden Suyu", "Ayran", "Red Bull"] },
          { label: "Kahvaltı & Kahve", slug: "supermarket/gida-icecek/kahvalti-kahve", tags: ["Granola", "Mısır Gevreği", "Reçel", "Tahin", "Bal"] },
          { label: "Kahve", slug: "supermarket/gida-icecek/kahve", tags: ["Filtre Kahve", "Espresso", "Türk Kahvesi", "Kahve Kapsülleri", "Nespresso Kapsül", "Lavazza", "Illy", "Starbucks"] },
          { label: "Bakliyat & Makarna", slug: "supermarket/gida-icecek/bakliyat-makarna", tags: ["Mercimek", "Nohut", "Pirinç", "Bulgur", "Makarna", "Spagetti"] },
          { label: "Konserve & Sos", slug: "supermarket/gida-icecek/konserve-sos", tags: ["Ton Balığı", "Domates Sos", "Mayonez", "Ketçap", "Zeytinyağı"] },
          { label: "Dondurma & Tatlı", slug: "supermarket/gida-icecek/dondurma-tatli", tags: ["Algida", "Magnum", "Panda", "Puding", "Jöle Toz"] },
        ]
      },
      {
        label: "Kedi", slug: "pet-shop/kedi", icon: "🐈",
        subs: [
          { label: "Kedi Maması", slug: "pet-shop/kedi/mama", tags: ["Yavru Kedi", "Yetişkin", "Kısırlaştırılmış", "Yaşlı Kedi", "Royal Canin", "Hill's Science", "Purina Pro Plan", "Whiskas", "Felix"] },
          { label: "Kedi Kumu", slug: "pet-shop/kedi/kum", tags: ["Topaklaşan Kum", "Silika Kum", "Doğal Kum", "Bentonit"] },
          { label: "Pet Aksesuar", slug: "pet-shop/aksesuar", tags: ["Tırmalama Tahtası", "Kedi Evi", "Mama Kabı", "Taşıma Çantası", "Lazer"] },
        ]
      },
      {
        label: "Köpek", slug: "pet-shop", icon: "🐕",
        subs: [
          { label: "Köpek Maması", slug: "pet-shop/kopek/mama", tags: ["Yavru Köpek", "Irk Maması", "Büyük Irk", "Royal Canin", "Pedigree", "Pro Plan"] },
          { label: "Köpek Tasma & Aksesuar", slug: "pet-shop/aksesuar", tags: ["Tasma", "Köpek Yeleği", "Yatak", "Oyuncak", "Kemirlik"] },
          { label: "Pet Bakım & Hijyen", slug: "pet-shop/bakim-hijyen", tags: ["Köpek Şampuanı", "Kene & Pire", "Diş Bakım", "Deodorant"] },
          { label: "Akvaryum & Balık", slug: "pet-shop/akvaryum", tags: ["Akvaryum", "Balık Yemi", "Filtre", "Isıtıcı"] },
        ]
      },
      {
        label: "Diğer Evcil Hayvan", slug: "pet-shop/diger", icon: "🐾",
        subs: [
          { label: "Kuş", slug: "pet-shop/kus", tags: ["Kuş Kafesi", "Kuş Yemi", "Vucut Spreyi", "Vitakraft", "Versele-Laga", "Trill"] },
          { label: "Balık & Akvaryum", slug: "pet-shop/akvaryum", tags: ["Akvaryum", "Filtre", "Pompa", "Isıtıcı", "Balık Yemi", "Tetra", "JBL", "Aquael"] },
          { label: "Kemirgen & Küçük Hayvan", slug: "pet-shop", tags: ["Hamster Kafesi", "Tavşan Kafesi", "Kemirgen Yemi", "Talaş", "Oyuncak"] },
        ]
      },
    ]
  },
  {
    title: "Kitap, Müzik, Film, Hobi", icon: "📚",
    cats: [
      {
        label: "Kitap", slug: "hobi-eglence/kitap-kirtasiye/kitap", icon: "📖",
        subs: [
          { label: "Roman & Edebiyat", slug: "hobi-eglence/kitap-kirtasiye/kitap/roman-edebiyat", tags: ["Türk Edebiyatı", "Dünya Klasikleri", "Polisiye", "Bilim Kurgu", "Fantastik", "Distopik"] },
          { label: "Kişisel Gelişim", slug: "hobi-eglence/kitap-kirtasiye/kitap/kisisel-gelisim", tags: ["Psikoloji", "Motivasyon", "Liderlik", "Finans & Yatırım", "Farkındalık", "Koçluk"] },
          { label: "Sınav Hazırlık", slug: "hobi-eglence/kitap-kirtasiye/kitap/sinav-hazirlik", tags: ["TYT", "AYT", "KPSS", "DGS", "YÖKDİL", "IELTS", "TOEFL"] },
          { label: "Çocuk & Genç Kitapları", slug: "hobi-eglence/kitap-kirtasiye/cocuk-kitap", tags: ["Resimli Masal", "İlk Okuma", "Boyama Kitabı", "0-3 Yaş", "4-8 Yaş", "9-12 Yaş"] },
          { label: "Bilim & Akademik", slug: "hobi-eglence/kitap-kirtasiye/kitap/bilim-akademik", tags: ["Tarih", "Felsefe", "Tıp", "Hukuk", "Mühendislik", "Ekonomi"] },
        ]
      },
      {
        label: "Müzik Aleti", slug: "hobi-eglence/sanat-muzik/muzik-aleti", icon: "🎸",
        subs: [
          { label: "Gitar", slug: "hobi-eglence/sanat-muzik/muzik-aleti/gitar", tags: ["Akustik Gitar", "Elektro Gitar", "Klasik Gitar", "Fender", "Gibson", "Yamaha", "Cort"] },
          { label: "Klavye & Piyano", slug: "hobi-eglence/sanat-muzik/muzik-aleti/klavye-piyano", tags: ["Dijital Piyano", "Tuş Takımı", "Synthesizer", "Roland", "Yamaha PSR", "Casio", "Korg"] },
          { label: "Davul & Perküsyon", slug: "hobi-eglence/sanat-muzik/muzik-aleti/davul-perkusyon", tags: ["Akustik Davul", "Elektronik Davul", "Cajon", "Pearl", "Tama", "Yamaha Davul"] },
          { label: "Stüdyo & Kayıt", slug: "hobi-eglence/sanat-muzik/muzik-aleti/studyo-kayit", tags: ["Kondenser Mikrofon", "Ses Kartı", "Stüdyo Monitörü", "Shure", "Audio-Technica", "Focusrite"] },
          { label: "Nefesli & Yaylı", slug: "hobi-eglence/sanat-muzik/muzik-aleti/nefesli-yayli", tags: ["Keman", "Flüt", "Saksofon", "Trompet", "Klarnet", "Bağlama"] },
        ]
      },
      {
        label: "Film & Dizi", slug: "hobi-eglence/kitap-kirtasiye/film-dizi", icon: "🎬",
        subs: [
          { label: "Blu-ray & DVD", slug: "hobi-eglence/kitap-kirtasiye/film-dizi/blu-ray-dvd", tags: ["4K Blu-ray", "Aksiyon", "Komedi", "Dram", "Animasyon", "Belgesel", "Korku"] },
          { label: "Dijital Film & Dizi", slug: "hobi-eglence/kitap-kirtasiye/film-dizi/dijital-film-dizi", tags: ["Netflix", "Amazon Prime", "Disney+", "BluTV", "Gain", "Mubi"] },
        ]
      },
      {
        label: "Hobi & Sanat", slug: "hobi-eglence", icon: "🎨",
        subs: [
          { label: "Resim & Çizim", slug: "hobi-eglence/sanat-muzik/resim", tags: ["Yağlı Boya", "Suluboya", "Akrilik Boya", "Pastel", "Renk Kalemi", "Faber-Castell", "Arteza"] },
          { label: "El Sanatları", slug: "hobi-eglence/sanat-muzik/el-sanatlari", tags: ["Örgü İpliği", "Amigurumi", "Dikiş", "Scrapbooking", "Boncuk", "Takı Yapımı", "Reçine"] },
          { label: "Maket & Model", slug: "hobi-eglence/koleksiyon", tags: ["Maket Araba", "Maket Uçak", "Askeri Maket", "Airfix", "Tamiya", "Revell", "Hasegawa"] },
          { label: "Bulmaca & Masa Oyunu", slug: "anne-bebek/oyuncak/masa-oyunu", tags: ["Puzzle 1000 Parça", "Satranç", "Monopoly", "Catan", "Ticket to Ride", "Codenames"] },
          { label: "Koleksiyon & Figür", slug: "hobi-eglence/koleksiyon", tags: ["Funko Pop", "LEGO Figür", "Metal Araba", "Manga", "Anime Figür", "Hot Wheels"] },
          { label: "Parti Malzemeleri", slug: "hobi-eglence/parti-malzemeleri", tags: ["Balon", "Doğum Günü Süsü", "Pasta Mumu", "Kağıt Tabak", "Folyo Balon"] },
        ]
      },
      {
        label: "Kırtasiye & Ofis", slug: "hobi-eglence/kitap-kirtasiye/kirtasiye", icon: "✏️",
        subs: [
          { label: "Kalem & Yazı Gereçleri", slug: "hobi-eglence/kitap-kirtasiye/kirtasiye/kalem-yazi-gerecleri", tags: ["Kurşun Kalem", "Tükenmez Kalem", "Pilot FriXion", "Faber-Castell", "Staedtler", "Artline"] },
          { label: "Defter & Ajanda", slug: "hobi-eglence/kitap-kirtasiye/kirtasiye/defter-ajanda", tags: ["Spiralli Defter", "Kareli Defter", "Noktalı Defter", "Bullet Journal", "Moleskine", "Leuchtturm"] },
          { label: "Okul Çantası", slug: "hobi-eglence/kitap-kirtasiye/kirtasiye/okul-cantasi", tags: ["İlkokul Çantası", "Ortaokul Çantası", "Ergonomik", "Çekçekli", "Herlitz", "Step by Step"] },
          { label: "Sanatsal Malzeme", slug: "hobi-eglence", tags: ["Yapıştırıcı", "Makas", "Kesici", "Kesim Matı", "Karton", "Özel Kağıt"] },
        ]
      },
    ]
  },
  {
    title: "Sağlık & Vitamin", icon: "💊",
    cats: [
      {
        label: "Vitamin & Mineral", slug: "saglik-vitamin/vitamin-mineral", icon: "💊",
        subs: [
          { label: "Multivitamin", slug: "saglik-vitamin/vitamin-mineral/multivitamin", tags: ["Centrum", "Solgar", "Supradyn", "Solaray", "GNC", "Now Foods"] },
          { label: "C Vitamini", slug: "saglik-vitamin/vitamin-mineral/c-vitamini", tags: ["Liposomal C", "1000 mg", "Çiğnenebilir", "Solgar", "Solaray", "Nature's Way"] },
          { label: "D Vitamini", slug: "saglik-vitamin/vitamin-mineral/d-vitamini", tags: ["1000 IU", "2000 IU", "K2 ile", "Damla", "Solgar", "Now Foods"] },
          { label: "B Vitamini", slug: "saglik-vitamin/vitamin-mineral/b-vitamini", tags: ["B12", "B Kompleks", "Folik Asit", "Solgar", "Now Foods"] },
          { label: "Magnezyum & Çinko", slug: "saglik-vitamin/vitamin-mineral/magnezyum-cinko", tags: ["Magnezyum Sitrat", "Çinko Pikolinat", "Demir", "Kalsiyum", "Selenyum"] },
          { label: "Omega 3 & Balık Yağı", slug: "saglik-vitamin/vitamin-mineral/omega-3-balik-yagi", tags: ["EPA", "DHA", "Solgar", "Now Foods", "Balıkçı Adam"] },
        ]
      },
      {
        label: "Bitkisel Sağlık", slug: "saglik-vitamin/bitkisel", icon: "🌿",
        subs: [
          { label: "Bitkisel Çay", slug: "saglik-vitamin/bitkisel/bitkisel-cay", tags: ["Yeşil Çay", "Adaçayı", "Papatya", "Rezene", "Karadut", "Ekinezya"] },
          { label: "Bitkisel Takviye", slug: "saglik-vitamin/bitkisel/bitkisel-takviye", tags: ["Ginseng", "Sarımsak Hapı", "Kurkumin", "Maca", "Spirulina", "Ginkgo Biloba"] },
          { label: "Süt Kardeleni & Karaciğer", slug: "saglik-vitamin/bitkisel/sut-kardeleni-karaciger", tags: ["Süt Kardeleni", "Karahindiba", "Detox", "Karaciğer Desteği"] },
          { label: "Bağışıklık Destek", slug: "saglik-vitamin/bitkisel/bagisiklik-destek", tags: ["Propolis", "Arı Sütü", "Karadut", "Karaağaç", "Zerdeçal", "Zencefil"] },
        ]
      },
      {
        label: "Spor Besin Takviyesi", slug: "saglik-vitamin/spor-besin", icon: "💪",
        subs: [
          { label: "Protein Tozu", slug: "saglik-vitamin/spor-besin/protein-tozu", tags: ["Whey Protein", "Casein", "Vegan Protein", "Optimum Nutrition", "ON Gold", "Nutricost"] },
          { label: "Kreatin", slug: "saglik-vitamin/spor-besin/kreatin", tags: ["Kreatin Monohidrat", "Mikronize", "Optimum Nutrition", "MyProtein"] },
          { label: "BCAA & Aminoasit", slug: "saglik-vitamin/spor-besin/bcaa-aminoasit", tags: ["BCAA", "EAA", "Glutamin", "Optimum Nutrition", "Scivation Xtend"] },
          { label: "Pre-Workout", slug: "saglik-vitamin/spor-besin/pre-workout", tags: ["Pre-Workout", "Cellucor C4", "Gat Nitraflex", "Kafein", "Beta Alanin"] },
          { label: "Mass Gainer", slug: "saglik-vitamin/spor-besin/mass-gainer", tags: ["Weight Gainer", "Carb Gainer", "Optimum Nutrition", "MyProtein", "Dymatize"] },
          { label: "Yağ Yakıcı", slug: "saglik-vitamin/spor-besin/yag-yakici", tags: ["L-Karnitin", "CLA", "Termojenik", "Cellucor", "Optimum Nutrition"] },
        ]
      },
    ]
  },
];

type HeaderCat = { id: string; slug: string; parent_id: string | null };

interface HeaderProps {
  // P6.20-A: Server-component sayfaları SSR'da prefetch edilmiş categories
  // listesini geçirir → catMap initial render'da dolu, linkFor exact match
  // tutuyor, /?q= fallback'e düşmez. Client sayfaları prop geçmezse eski
  // CSR useEffect fetch davranışı korunur (P6.20-B hotfix fallback yeterince
  // koruyor).
  initialCats?: HeaderCat[];
}

export default function Header({ initialCats }: HeaderProps = {}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileExpandedGroup, setMobileExpandedGroup] = useState<string | null>(null);
  const profileTimer = useRef<NodeJS.Timeout | null>(null);
  const groupTimer = useRef<NodeJS.Timeout | null>(null);
  const groupOpenTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // P6.20-A: SSR initialCats prop varsa onunla başla (server pages),
  // yoksa eski CSR fetch davranışı (client pages, fallback).
  const [cats, setCats] = useState<HeaderCat[]>(initialCats ?? []);
  useEffect(() => {
    // initialCats varsa fetch atla (zaten SSR'da geldi). Yoksa client-side fetch.
    if (initialCats && initialCats.length > 0) return;
    fetch("/api/public/categories")
      .then(r => r.json())
      .then(j => { if (Array.isArray(j.categories)) setCats(j.categories); })
      .catch(() => {});
  }, [initialCats]);
  const catMap = useMemo(() => new Map(cats.map(c => [c.slug, c])), [cats]);
  const catById = useMemo(() => new Map(cats.map(c => [c.id, c])), [cats]);
  const linkFor = (slug: string, q?: string) => hierUrl(slug, catMap, catById, q);

  const submitSearchQuery = (value: string) => {
    if (value.trim()) router.push("/ara?q=" + encodeURIComponent(value.trim()));
  };

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] || "";

  const openProfile = () => { if (profileTimer.current) clearTimeout(profileTimer.current); setProfileOpen(true); };
  const closeProfile = () => { profileTimer.current = setTimeout(() => setProfileOpen(false), 150); };

  const openGroup = (title: string) => {
    if (groupTimer.current) clearTimeout(groupTimer.current);
    if (groupOpenTimer.current) clearTimeout(groupOpenTimer.current);
    // Zaten bir dropdown açıksa anında geç, değilse 300ms bekle
    if (activeGroup) {
      setActiveGroup(title);
      setActiveCat(null);
    } else {
      groupOpenTimer.current = setTimeout(() => {
        setActiveGroup(title);
        setActiveCat(null);
      }, 300);
    }
  };
  const closeGroup = () => {
    if (groupOpenTimer.current) clearTimeout(groupOpenTimer.current);
    groupTimer.current = setTimeout(() => setActiveGroup(null), 150);
  };

  const activeGroupData = NAV.find(g => g.title === activeGroup);
  const displayCat = activeGroupData?.cats.find(c => c.label === activeCat) ?? activeGroupData?.cats[0];

  return (
    <header className="bg-white sticky top-0 z-50" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>

      {/* ── ÜST BAR ── */}
      <div className="border-b border-gray-100">
        <div className="max-w-[1400px] mx-auto px-3 md:px-6 flex items-center gap-2 md:gap-5 h-14 md:h-16">

          {/* Mobil hamburger (md altında görünür) */}
          <button
            type="button"
            aria-label="Menüyü aç"
            className="md:hidden p-2 -ml-1 text-gray-700 hover:text-[#E8460A] transition-colors flex-shrink-0 min-w-11 min-h-11 flex items-center justify-center"
            onClick={() => setMobileMenuOpen(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <Link href="/" className="flex-shrink-0">
            <div className="text-xl md:text-2xl font-extrabold tracking-tight whitespace-nowrap">
              <span className="text-[#E8460A]">bir</span>
              <span className="text-gray-900">tavsiye</span>
              <span className="text-[#E8460A]">.net</span>
            </div>
          </Link>

          <HeaderSearchBar query={query} onQueryChange={setQuery} onSubmitQuery={submitSearchQuery} />

          <div className="flex items-center gap-3 md:gap-5">
            <div className="relative" onMouseEnter={openProfile} onMouseLeave={closeProfile}>
              <Link href={user ? "/profil" : "/giris"}>
                <div className="flex flex-col items-center gap-0.5 text-gray-600 hover:text-[#E8460A] transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  <span className="text-[10px] font-medium">{user ? displayName.split(" ")[0].slice(0, 10) : "Hesabım"}</span>
                </div>
              </Link>
              {profileOpen && (
                <div className="absolute right-0 top-12 w-52 bg-white rounded-2xl overflow-hidden z-50"
                  style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
                  onMouseEnter={openProfile} onMouseLeave={closeProfile}>
                  {user ? (
                    <>
                      <div className="px-4 py-3 bg-gradient-to-br from-orange-50 to-red-50 border-b border-gray-100">
                        <div className="font-semibold text-sm truncate">{displayName}</div>
                        <div className="text-xs text-gray-400 truncate">{user.email}</div>
                      </div>
                      {[
                        { href: "/profil", icon: "👤", label: "Profilim" },
                        { href: "/profil", icon: "♡", label: "Favorilerim" },
                        { href: "/admin", icon: "⚙️", label: "Admin Paneli" },
                      ].map(item => (
                        <Link key={item.label} href={item.href} onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-orange-50 hover:text-[#E8460A] transition-colors border-b border-gray-50 last:border-0">
                          <span>{item.icon}</span><span className="font-medium">{item.label}</span>
                        </Link>
                      ))}
                      <button onClick={() => { supabase.auth.signOut(); setUser(null); setProfileOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors font-medium">
                        <span>🚪</span><span>Çıkış Yap</span>
                      </button>
                    </>
                  ) : (
                    <div className="p-3 flex flex-col gap-2">
                      <Link href="/giris" onClick={() => setProfileOpen(false)}>
                        <div className="w-full py-2.5 bg-[#E8460A] text-white text-sm font-bold rounded-xl text-center hover:bg-[#C93A08] transition-colors">Giriş Yap</div>
                      </Link>
                      <Link href="/giris" onClick={() => setProfileOpen(false)}>
                        <div className="w-full py-2.5 border-2 border-gray-200 text-sm font-medium rounded-xl text-center hover:border-[#E8460A] hover:text-[#E8460A] transition-colors">Kayıt Ol</div>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Link href={user ? "/profil" : "/giris"} className="hidden md:flex flex-col items-center gap-0.5 text-gray-600 hover:text-[#E8460A] transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
              <span className="text-[10px] font-medium">Favoriler</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── KATEGORİ NAV BARI (desktop/tablet) ── */}
      <div className="bg-white border-b border-gray-100 hidden md:block">
        <div className="max-w-[1400px] mx-auto px-2 md:px-6 flex items-center h-10 md:h-11 overflow-x-auto scrollbar-hide">
          {NAV.map(group => (
            <div
              key={group.title}
              className="relative flex-shrink-0"
              onMouseEnter={() => openGroup(group.title)}
              onMouseLeave={closeGroup}
            >
              <button className={`flex items-center gap-1 px-3 h-11 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                activeGroup === group.title
                  ? "text-[#E8460A] border-[#E8460A]"
                  : "text-gray-700 border-transparent hover:text-[#E8460A]"
              }`}>
                <span>{group.title}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {/* ── MEGA DROPDOWN ── */}
              {activeGroup === group.title && activeGroupData && displayCat && (
                <div
                  className="fixed left-0 right-0 bg-white z-50 flex"
                  style={{ top: "calc(var(--header-h, 88px))", boxShadow: "0 12px 40px rgba(0,0,0,0.12)", borderTop: "2px solid #E8460A" }}
                  onMouseEnter={() => openGroup(group.title)}
                  onMouseLeave={closeGroup}
                >
                  <div className="max-w-[1400px] mx-auto w-full flex" style={{ minHeight: 320 }}>

                    {/* Sol: Kategori listesi */}
                    <div className="w-52 flex-shrink-0 border-r border-gray-100 py-3 bg-white">
                      {activeGroupData.cats.map(cat => (
                        <button
                          key={cat.slug + cat.label}
                          onMouseEnter={() => setActiveCat(cat.label)}
                          onClick={() => { router.push(linkFor(cat.slug)); setActiveGroup(null); }}
                          className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm text-left transition-colors ${
                            displayCat.label === cat.label
                              ? "bg-white text-[#E8460A] font-semibold border-r-2 border-[#E8460A]"
                              : "text-gray-700 hover:bg-white hover:text-[#E8460A]"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span>{cat.icon}</span>
                            <span>{cat.label}</span>
                          </span>
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </button>
                      ))}
                    </div>

                    {/* Sağ: Alt kategoriler + etiketler */}
                    <div className="flex-1 py-5 px-6 overflow-y-auto" style={{ maxHeight: 440 }}>
                      <div className="grid grid-cols-3 gap-x-8 gap-y-5">
                        {displayCat.subs.map(sub => (
                          <div key={sub.label}>
                            <Link
                              href={linkFor(sub.slug, sub.q)}
                              onClick={() => setActiveGroup(null)}
                              className="block text-sm font-bold text-[#E8460A] hover:underline mb-1.5"
                            >
                              {sub.label}
                            </Link>
                            <div className="flex flex-wrap gap-1">
                              {sub.tags.map(tag => (
                                <Link
                                  key={tag}
                                  href={linkFor(sub.slug, tag)}
                                  onClick={() => setActiveGroup(null)}
                                  className="text-xs text-gray-500 hover:text-[#E8460A] transition-colors"
                                >
                                  {tag},
                                </Link>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <Link
                          href={linkFor(displayCat.slug)}
                          onClick={() => setActiveGroup(null)}
                          className="text-xs font-semibold text-[#E8460A] hover:underline"
                        >
                          Tüm {displayCat.label} →
                        </Link>
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── MOBIL DRAWER (md altı) ── */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[60]" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="absolute left-0 top-0 h-full w-[82vw] max-w-[340px] bg-white shadow-xl overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="text-lg font-extrabold">
                <span className="text-[#E8460A]">bir</span>
                <span className="text-gray-900">tavsiye</span>
              </div>
              <button
                type="button"
                aria-label="Menüyü kapat"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 -mr-2 text-gray-500 hover:text-gray-900 min-w-11 min-h-11 flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Quick links */}
            <div className="px-4 py-3 border-b border-gray-100 space-y-1">
              {user ? (
                <Link
                  href="/profil"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-sm font-medium text-gray-700"
                >
                  <span className="text-base">👤</span>
                  <span className="truncate">{displayName || "Profilim"}</span>
                </Link>
              ) : (
                <Link
                  href="/giris"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full text-center py-2.5 bg-[#E8460A] text-white text-sm font-bold rounded-xl hover:bg-[#C93A08]"
                >
                  Giriş Yap / Kayıt Ol
                </Link>
              )}
              <Link
                href="/karsilastir"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-sm font-medium text-gray-700"
              >
                <span className="text-base">💰</span><span>Fiyat Karşılaştır</span>
              </Link>
              <Link
                href="/tavsiyeler"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-sm font-medium text-gray-700"
              >
                <span className="text-base">💬</span><span>Tavsiyeler</span>
              </Link>
            </div>

            {/* Category groups — accordion */}
            <div className="px-4 py-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 px-3">Kategoriler</div>
              {NAV.map(group => {
                const isExpanded = mobileExpandedGroup === group.title;
                return (
                  <div key={group.title} className="border-b border-gray-50 last:border-0">
                    <button
                      type="button"
                      onClick={() => setMobileExpandedGroup(isExpanded ? null : group.title)}
                      className="w-full flex items-center justify-between gap-3 px-3 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 rounded-xl"
                    >
                      <span className="flex items-center gap-3">
                        <span className="text-base">{group.icon}</span>
                        <span>{group.title}</span>
                      </span>
                      <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                    {isExpanded && (
                      <div className="pl-5 pb-2 space-y-0.5">
                        {group.cats.map(cat => (
                          <Link
                            key={cat.label}
                            href={linkFor(cat.slug)}
                            onClick={() => { setMobileMenuOpen(false); setMobileExpandedGroup(null); }}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-[#E8460A] hover:bg-orange-50 rounded-lg"
                          >
                            <span className="text-sm">{cat.icon}</span>
                            <span>{cat.label}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {user && (
              <div className="px-4 py-3 border-t border-gray-100">
                <button
                  onClick={() => { supabase.auth.signOut(); setUser(null); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 rounded-xl font-medium"
                >
                  <span>🚪</span><span>Çıkış Yap</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </header>
  );
}
