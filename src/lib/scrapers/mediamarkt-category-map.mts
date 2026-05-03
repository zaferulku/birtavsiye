export interface MmCategoryTarget {
  dbSlug: string;
  mmBreadcrumbNames: string[];
  priority: 1 | 2 | 3;
}

export const MEDIAMARKT_CATEGORY_MAP: MmCategoryTarget[] = [
  {
    dbSlug: 'akilli-telefon',
    mmBreadcrumbNames: [
      // Mevcut parent kategoriler
      'iPhone', 'Android Telefonlar', 'Katlanabilir Telefonlar',
      // Marka-leaf (Android altinda)
      'Samsung Telefon', 'Xiaomi Telefon', 'Huawei Telefon', 'Oppo Telefon',
      'Realme Telefon', 'Tecno Telefon', 'Vivo Telefon', 'Casper Telefon',
      'TCL Telefon', 'Omix Telefon', 'General Mobile Telefon',
      'Honor Telefon', 'Reeder Telefon', 'POCO Telefon',
      // Samsung sub-leaf
      'Galaxy A', 'Galaxy S', 'Galaxy Z', 'Galaxy Note', 'Galaxy M',
      // iPhone model-leaf
      'iPhone 11', 'iPhone 12', 'iPhone 13', 'iPhone 13 Pro Max',
      'iPhone 14', 'iPhone 14 Plus', 'iPhone 14 Pro', 'iPhone 14 Pro Max',
      'iPhone 15', 'iPhone 15 Plus', 'iPhone 15 Pro', 'iPhone 15 Pro Max',
      'iPhone 16', 'iPhone 16e', 'iPhone 16 Plus', 'iPhone 16 Pro', 'iPhone 16 Pro Max',
      'iPhone 17', 'iPhone 17 Pro', 'iPhone 17 Pro Max', 'iPhone 17e',
      // Diger
      'Tuşlu Telefon',
      // BLACKLIST — yenilenmis ve AI-flagged segmentler hic scrape edilmez (karar: 2026-04-27)
      // 'Yenilenmiş Cep Telefonu',
      // 'iPhone Yenilenmiş Telefon',
      // 'Yapay Zeka Destekli Telefonlar',
    ],
    priority: 1,
  },
  { dbSlug: 'kulaklik', mmBreadcrumbNames: ['Kulaklıklar', 'Bluetooth Kulaklıklar', 'Kulak İçi Kulaklıklar', 'Kulak Üstü Kulaklık', 'Mikrofonlu Kulaklıklar'], priority: 1 },
  { dbSlug: 'akilli-saat', mmBreadcrumbNames: ['Akıllı Saatler', 'Amazfit Akıllı Saat', 'Bilicra Akıllı Saat', 'Huawei Akıllı Saatler', 'Samsung Akıllı Saatler', 'TCL Akıllı Saatler', 'Xiaomi Akıllı Saatler', 'Giyilebilir Teknoloji', 'Giyilebilir Teknoloji Aksesuarları'], priority: 1 },
  { dbSlug: 'powerbank', mmBreadcrumbNames: ['Taşınabilir Şarj Cihazları', 'Baseus Powerbank', 'MagSafe Powerbank', 'Ttec Powerbank', 'Ugreen Powerbank'], priority: 2 },
  { dbSlug: 'laptop', mmBreadcrumbNames: ['Laptop', 'Acer Laptop', 'Asus Laptop', 'Casper Laptop', 'HP Laptop', 'Huawei Laptop', 'Lenovo Laptop Modelleri', 'Oyuncu Laptop', 'Yapay Zeka Destekli Laptoplar', 'Asus Oyuncu Laptop', 'Casper Oyuncu Laptop', 'Monster Oyuncu Laptop'], priority: 1 },
  { dbSlug: 'tablet', mmBreadcrumbNames: ['Tabletler', 'Android Tabletler', 'iPad', 'iPad Air', 'iPad Mini', 'iPad Pro', 'E-Kitap Okuyucu'], priority: 1 },
  { dbSlug: 'mouse', mmBreadcrumbNames: ['Mouse', 'Oyuncu Mouse', 'Kablosuz Mouse', 'Logitech Oyuncu Mouse'], priority: 2 },
  { dbSlug: 'klavye', mmBreadcrumbNames: ['Klavye', 'Oyuncu Klavye', 'Mekanik Klavye'], priority: 2 },
  { dbSlug: 'televizyon', mmBreadcrumbNames: ['Televizyon', '32 inc TV', '43 inc TV', '4K TV', '50 inc TV', 'OLED TV', 'QLED TV', 'Smart TV'], priority: 1 },
  { dbSlug: 'hoparlor', mmBreadcrumbNames: ['Hoparlör', 'Bluetooth Hoparlörler', 'Bilgisayar Hoparlörü'], priority: 2 },
  { dbSlug: 'oyun-konsol', mmBreadcrumbNames: ['Oyun Konsolları', 'PlayStation', 'Xbox', 'Nintendo', 'Nintendo Oyunları', 'Playstation Oyunları', 'Xbox Oyunları', 'Oyunlar'], priority: 2 },
  { dbSlug: 'buzdolabi', mmBreadcrumbNames: ['Buzdolabı', 'Alttan Donduruculu Buzdolabı', 'Ankastre Buzdolabı', 'Altus Buzdolabı', 'Bosch Buzdolabı', 'Çift Kapılı Gardrop Tipi Buzdolabı', 'Electrolux Buzdolabı', 'Grundig Buzdolabı', 'Mini Buzdolabı', 'No Frost Buzdolabı', 'Profilo Buzdolabı', 'Samsung Buzdolabı', 'Siemens Buzdolabı', 'Üstten Donduruculu Buzdolabı', 'Derin Dondurucular', 'Altus Derin Dondurucu', 'Çekmeceli Derin Dondurucu', 'Sandık Tipi Derin Dondurucu'], priority: 1 },
  { dbSlug: 'camasir-makinesi', mmBreadcrumbNames: ['Çamaşır Makineleri', 'Altus Çamaşır Makinesi', 'Bosch Çamaşır Makinesi', 'Electrolux Çamaşır Makinesi', 'Grundig Çamaşır Makinesi', 'Hoover Çamaşır Makinesi', 'LG Çamaşır Makinesi', 'Profilo Çamaşır Makinesi', 'Siemens Çamaşır Makinesi'], priority: 1 },
  { dbSlug: 'bulasik-makinesi', mmBreadcrumbNames: ['Bulaşık Makineleri', 'Ankastre Bulaşık Makineleri', 'Altus Bulaşık Makinesi', 'Bosch Bulaşık Makinesi', 'Electrolux Bulaşık Makinesi', 'Grundig Bulaşık Makinesi', 'Profilo Bulaşık Makinesi', 'Samsung Bulaşık Makinesi', 'Siemens Bulaşık Makinesi'], priority: 1 },
  { dbSlug: 'firin-ocak', mmBreadcrumbNames: ['Ankastre Fırın', 'Fırın', 'Ocak', 'Ankastre Ocaklar', 'Ocaklı Fırınlar', 'Altus Ankastre Ocak'], priority: 2 },
  { dbSlug: 'supurge', mmBreadcrumbNames: ['Robot Süpürge', 'Süpürgeler', 'Arnica Süpürge', 'Arzum Süpürge', 'Bosch Süpürge', 'Dikey Süpürge', 'Dyson Süpürge', 'Electrolux Süpürge', 'Fakir Süpürge', 'Islak Kuru Süpürgeler', 'Karcher Süpürge', 'Miele Süpürge', 'Philips Süpürge', 'Roborock Süpürge', 'Samsung Süpürge', 'Şarjlı El Süpürgeleri', 'Shark Süpürge', 'Tefal Süpürge', 'Toz Torbalı Süpürge', 'Toz Torbasız Süpürge', 'Kablolu Dikey Süpürge', 'Şarjlı Dikey Süpürge'], priority: 1 },
  { dbSlug: 'kahve-makinesi', mmBreadcrumbNames: ['Kahve Makinesi', 'Espresso Kahve Makineleri', 'Filtre Kahve Makineleri', 'Kahve Öğütücüleri', 'Espresso Kahve', 'Nespresso Kahve Makinesi'], priority: 2 },
  { dbSlug: 'mikrodalga', mmBreadcrumbNames: ['Mikrodalga', 'Bosch Mikrodalga Fırın'], priority: 2 },
  { dbSlug: 'blender-robot', mmBreadcrumbNames: ['Blender', 'Cam Silme Robotu', 'Arzum Blender', 'Braun Blender', 'Electrolux Blender', 'Korkmaz Blender', 'Philips Blender', 'Smoothie Blender'], priority: 2 },
  { dbSlug: 'klima', mmBreadcrumbNames: ['Klimalar', '12000 BTU Klima', '18000 BTU Klima', '24000 BTU Klima', '9000 BTU Klima', 'Altus Klima', 'Baymak Klima', 'Bosch Klima', 'Daikin Klima', 'Daylux Klima', 'Fujiplus Klima', 'LG Klima', 'Samsung Klima'], priority: 2 },
  { dbSlug: 'drone', mmBreadcrumbNames: ['Drone', 'DJI Drone'], priority: 3 },
  { dbSlug: 'fotograf-kamera', mmBreadcrumbNames: ['Fotoğraf Makineleri', 'Aynasız Fotoğraf Makineleri', 'Dijital Kompakt Fotoğraf Makinesi', 'Profesyonel DSLR Fotoğraf Makineleri', 'Şipşak Fotoğraf Makineleri', 'Gimbal', 'Tripod', 'Video Kamera', '360 Derece Kamera', 'DJI Gimbal'], priority: 2 },
  { dbSlug: 'aksiyon-kamera', mmBreadcrumbNames: ['Aksiyon Kamerası'], priority: 2 },
  { dbSlug: 'aspirator-davlumbaz', mmBreadcrumbNames: ['Aspiratörler', 'Davlumbazlar', 'Altus Davlumbaz', 'Bosch Davlumbaz', 'Siemens Davlumbaz'], priority: 2 },
  { dbSlug: 'sac-kurutma-sekillendirici', mmBreadcrumbNames: ['Saç Kurutma', 'Arzum Saç Kurutma Makinesi', 'Babyliss Saç Düzleştirici', 'Babyliss Saç Kurutma Makinesi', 'Philips Saç Düzleştirici', 'Philips Saç Kurutma Makinesi'], priority: 2 },
];

const DB_SLUG_ALIASES: Record<string, string> = {
  "akilli-telefon": "elektronik/telefon/akilli-telefon",
  "telefon-aksesuar": "elektronik/telefon/aksesuar",
  powerbank: "elektronik/telefon/powerbank",
  kulaklik: "elektronik/tv-ses-goruntu/kulaklik",
  hoparlor: "elektronik/tv-ses-goruntu/bluetooth-hoparlor",
  "akilli-saat": "elektronik/giyilebilir/akilli-saat",
  laptop: "elektronik/bilgisayar-tablet/laptop",
  tablet: "elektronik/bilgisayar-tablet/tablet",
  mouse: "elektronik/bilgisayar-tablet/klavye-mouse",
  klavye: "elektronik/bilgisayar-tablet/klavye-mouse",
  televizyon: "elektronik/tv-ses-goruntu/televizyon",
  "oyun-konsol": "elektronik/oyun/konsol",
  buzdolabi: "beyaz-esya/buzdolabi",
  "camasir-makinesi": "beyaz-esya/camasir-makinesi",
  "bulasik-makinesi": "beyaz-esya/bulasik-makinesi",
  "firin-ocak": "beyaz-esya/firin-ocak",
  supurge: "kucuk-ev-aletleri/temizlik/supurge",
  "kahve-makinesi": "kucuk-ev-aletleri/mutfak/kahve-makinesi",
  mikrodalga: "beyaz-esya/mikrodalga",
  "blender-robot": "kucuk-ev-aletleri/mutfak/blender-mutfak-robotu",
  klima: "beyaz-esya/klima",
  drone: "elektronik/kamera/drone",
  "fotograf-kamera": "elektronik/kamera/fotograf-makinesi",
  "aksiyon-kamera": "elektronik/kamera/aksiyon-kamera",
  "aspirator-davlumbaz": "beyaz-esya/aspirator-davlumbaz",
  "sac-kurutma-sekillendirici": "kucuk-ev-aletleri/kisisel-bakim/sac-kurutma",
};

export function resolveMediaMarktDbSlug(dbSlug: string): string {
  return DB_SLUG_ALIASES[dbSlug] ?? dbSlug;
}

function normalizeMmSegment(value: string): string {
  return value.trim();
}

export function buildMediaMarktCategoryPath(
  breadcrumb: { name: string; position: number }[],
  productTitle?: string | null,
): { sourceCategory: string | null; sourceCategoryPath: string | null } {
  const normalizedTitle = productTitle?.trim().toLocaleLowerCase("tr") ?? "";
  const segments = breadcrumb
    .map((item) => normalizeMmSegment(item.name ?? ""))
    .filter((segment) => segment && segment.toLocaleLowerCase("tr") !== "home")
    .filter((segment, index, arr) => {
      if (index !== arr.length - 1 || !normalizedTitle) return true;
      return segment.toLocaleLowerCase("tr") !== normalizedTitle;
    });

  if (segments.length === 0) {
    return { sourceCategory: null, sourceCategoryPath: null };
  }

  return {
    sourceCategory: segments[segments.length - 1] ?? null,
    sourceCategoryPath: segments.join(" > "),
  };
}

export function findDbSlugForMmBreadcrumb(
  breadcrumb: { name: string; position: number }[]
): { dbSlug: string; matchedSegment: string } | null {
  if (!breadcrumb || breadcrumb.length < 1) return null;
  for (let i = breadcrumb.length - 1; i >= 0; i--) {
    const segName = breadcrumb[i].name?.trim();
    if (!segName) continue;
    for (const target of MEDIAMARKT_CATEGORY_MAP) {
      if (target.mmBreadcrumbNames.some(name =>
        name.localeCompare(segName, 'tr', { sensitivity: 'base' }) === 0
      )) {
        return { dbSlug: resolveMediaMarktDbSlug(target.dbSlug), matchedSegment: segName };
      }
    }
  }
  return null;
}
