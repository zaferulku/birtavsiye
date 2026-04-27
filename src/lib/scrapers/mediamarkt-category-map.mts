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
      'Tuşlu Telefon', 'Yenilenmiş Cep Telefonu',
      'iPhone Yenilenmiş Telefon', 'Yapay Zeka Destekli Telefonlar',
    ],
    priority: 1,
  },
  { dbSlug: 'kulaklik', mmBreadcrumbNames: ['Kulaklıklar', 'Bluetooth Kulaklıklar', 'Kulak İçi Kulaklıklar', 'Kulak Üstü Kulaklık', 'Mikrofonlu Kulaklıklar'], priority: 1 },
  { dbSlug: 'akilli-saat', mmBreadcrumbNames: ['Akıllı Saatler'], priority: 1 },
  { dbSlug: 'powerbank', mmBreadcrumbNames: ['Taşınabilir Şarj Cihazları'], priority: 2 },
  { dbSlug: 'laptop', mmBreadcrumbNames: ['Laptop'], priority: 1 },
  { dbSlug: 'tablet', mmBreadcrumbNames: ['Tabletler', 'Android Tabletler', 'iPad'], priority: 1 },
  { dbSlug: 'mouse', mmBreadcrumbNames: ['Mouse', 'Oyuncu Mouse'], priority: 2 },
  { dbSlug: 'klavye', mmBreadcrumbNames: ['Klavye', 'Oyuncu Klavye'], priority: 2 },
  { dbSlug: 'televizyon', mmBreadcrumbNames: ['Televizyon', '32 inc TV', '43 inc TV', '4K TV', '50 inc TV'], priority: 1 },
  { dbSlug: 'hoparlor', mmBreadcrumbNames: ['Hoparlör', 'Bluetooth Hoparlörler', 'Bilgisayar Hoparlörü'], priority: 2 },
  { dbSlug: 'oyun-konsol', mmBreadcrumbNames: ['Oyun Konsolları', 'PlayStation', 'Xbox', 'Nintendo'], priority: 2 },
  { dbSlug: 'buzdolabi', mmBreadcrumbNames: ['Buzdolabı', 'Alttan Donduruculu Buzdolabı', 'Ankastre Buzdolabı'], priority: 1 },
  { dbSlug: 'camasir-makinesi', mmBreadcrumbNames: ['Çamaşır Makineleri'], priority: 1 },
  { dbSlug: 'bulasik-makinesi', mmBreadcrumbNames: ['Bulaşık Makineleri', 'Ankastre Bulaşık Makineleri'], priority: 1 },
  { dbSlug: 'firin-ocak', mmBreadcrumbNames: ['Ankastre Fırın'], priority: 2 },
  { dbSlug: 'supurge', mmBreadcrumbNames: ['Robot Süpürge'], priority: 1 },
  { dbSlug: 'kahve-makinesi', mmBreadcrumbNames: ['Kahve Makinesi', 'Espresso Kahve Makineleri', 'Filtre Kahve Makineleri'], priority: 2 },
  { dbSlug: 'mikrodalga', mmBreadcrumbNames: ['Mikrodalga'], priority: 2 },
  { dbSlug: 'blender-robot', mmBreadcrumbNames: ['Blender'], priority: 2 },
  { dbSlug: 'klima', mmBreadcrumbNames: ['Klimalar', '12000 BTU Klima', '18000 BTU Klima', '24000 BTU Klima', '9000 BTU Klima'], priority: 2 },
  { dbSlug: 'drone', mmBreadcrumbNames: ['Drone'], priority: 3 },
];

export function findDbSlugForMmBreadcrumb(
  breadcrumb: { name: string; position: number }[]
): { dbSlug: string; matchedSegment: string } | null {
  if (!breadcrumb || breadcrumb.length < 2) return null;
  for (let i = breadcrumb.length - 1; i >= 1; i--) {
    const segName = breadcrumb[i].name?.trim();
    if (!segName) continue;
    for (const target of MEDIAMARKT_CATEGORY_MAP) {
      if (target.mmBreadcrumbNames.some(name =>
        name.localeCompare(segName, 'tr', { sensitivity: 'base' }) === 0
      )) {
        return { dbSlug: target.dbSlug, matchedSegment: segName };
      }
    }
  }
  return null;
}
