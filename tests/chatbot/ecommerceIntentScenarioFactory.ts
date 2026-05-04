import type { EcommerceProductType } from "../../src/lib/chatbot/ecommerceIntentRules";

export type ExpectedAudit = {
  activeIntent?: "product_search";
  category?: string | null;
  productType?: EcommerceProductType | null;
  brand?: string | null;
  color?: string | null;
  priceRange?: { min: number | null; max: number | null };
  storage?: string | null;
  sort?: string | null;
  searchQuery?: string;
  searchActionHref?: string;
  shouldResetContext?: boolean;
  shouldKeepContext?: boolean;
  exactProduct?: boolean;
  model?: string | null;
  action?: string;
};

export type EcommerceIntentScenario = {
  name: string;
  bucket: string;
  messages: string[];
  expected: string[];
  expectedAudit: ExpectedAudit[];
};

function href(query: string): string {
  return `/ara?q=${encodeURIComponent(query)}`;
}

const C = {
  phone: "akilli-telefon",
  phoneCase: "elektronik/telefon/kilif",
  charger: "elektronik/telefon/sarj-kablo",
  laptop: "laptop",
  gamingLaptop: "elektronik/bilgisayar-tablet/laptop",
  laptopBag: "elektronik/telefon/aksesuar/laptop-cantasi",
  mouse: "elektronik/bilgisayar-tablet/bilesenler/cevre-birim/mouse",
  mousePad: "elektronik/telefon/aksesuar/mouse-pad",
  coffeeMachine: "kucuk-ev-aletleri/mutfak/kahve-makinesi",
  filterCoffee: "supermarket/kahve/filtre-kahve",
  coffee: "supermarket/gida-icecek/kahve",
  yogaMat: "spor-outdoor/fitness/yoga-pilates",
  doorMat: "ev-yasam/temizlik/cop-torbasi-temizlik-araclari/paspas",
  airfryer: "kucuk-ev-aletleri/mutfak/airfryer",
  fryerOil: "supermarket/konserve-sos/zeytinyagi",
  gamingChair: "elektronik/oyun/konsol/oyuncu-koltuk",
  perfume: "parfum",
  shoes: "moda/erkek-ayakkabi/sneaker",
  lipstick: "kozmetik/makyaj/ruj",
} as const;

const manualScenarios: EcommerceIntentScenario[] = [
  {
    name: "Renk + kategori + marka + renk değişimi + marka genişletme",
    bucket: "context_carry",
    messages: [
      "Kırmızı telefon istiyorum",
      "Apple seçtim",
      "Sarı olsun",
      "Diğer sarı telefonları göster",
    ],
    expected: [
      "Kırmızı telefonlar listelenir",
      "Kırmızı Apple/iPhone telefonlar listelenir",
      "Sarı iPhone telefonlar listelenir",
      "Tüm sarı telefonlar listelenir",
    ],
    expectedAudit: [
      { category: C.phone, productType: "phone", color: "Kırmızı", brand: null, shouldKeepContext: false, action: "merge_with_new_dims" },
      { category: C.phone, productType: "phone", color: "Kırmızı", brand: "Apple", shouldKeepContext: true, action: "merge_with_new_dims" },
      { category: C.phone, productType: "phone", color: "Sarı", brand: "Apple", shouldKeepContext: true, action: "merge_with_new_dims" },
      { category: C.phone, productType: "phone", color: "Sarı", brand: null, shouldKeepContext: true, action: "user_requested_removal" },
    ],
  },
  {
    name: "Telefon bağlamından kahve makinesine niyet değişimi",
    bucket: "intent_reset",
    messages: ["Siyah Samsung telefon", "Kahve makinelerini göster", "En ucuz olanı göster"],
    expected: [
      "Siyah Samsung telefonlar listelenir",
      "Telefon bağlamı bırakılır ve kahve makineleri listelenir",
      "En ucuz kahve makineleri listelenir",
    ],
    expectedAudit: [
      { category: C.phone, productType: "phone", brand: "Samsung", color: "Siyah", shouldResetContext: false },
      { category: C.coffeeMachine, productType: "coffee_machine", brand: null, color: null, shouldResetContext: true, action: "category_changed_reset" },
      { category: C.coffeeMachine, productType: "coffee_machine", sort: "price_asc", shouldKeepContext: true, action: "best_value_sort_applied" },
    ],
  },
  {
    name: "Fiyat aralığı korunur ve daha ucuz komutu aralığı aşağı taşır",
    bucket: "price_context",
    messages: ["50k - 80k arası telefon göster", "Pahalı geldi", "Daha pahalı modellere bak"],
    expected: [
      "50.000-80.000 TL arası telefonlar listelenir",
      "Telefon niyeti korunup daha düşük fiyat aralığına geçilir",
      "Telefon niyeti korunup daha yüksek fiyat aralığına geçilir",
    ],
    expectedAudit: [
      { category: C.phone, productType: "phone", priceRange: { min: 50000, max: 80000 } },
      { category: C.phone, productType: "phone", priceRange: { min: 30000, max: 50000 }, shouldKeepContext: true },
      { category: C.phone, productType: "phone", priceRange: { min: 50000, max: 70000 }, shouldKeepContext: true },
    ],
  },
  {
    name: "Filtre kahve ürünleri filtre kahve makinesinden ayrılır",
    bucket: "product_disambiguation",
    messages: ["En ucuz filtre kahve", "En ucuz filtre kahve makinesi"],
    expected: [
      "Filtre kahve ürünleri listelenir, makine gösterilmez",
      "Filtre kahve makineleri listelenir, kahve ürünü gösterilmez",
    ],
    expectedAudit: [
      { category: C.filterCoffee, productType: "filter_coffee", sort: "price_asc" },
      { category: C.coffeeMachine, productType: "filter_coffee_machine", sort: "price_asc", shouldResetContext: true },
    ],
  },
  {
    name: "Tek kelimelik mat önceki bağlamı bırakır",
    bucket: "single_word",
    messages: ["Apple telefon göster", "Mat"],
    expected: [
      "Apple telefonlar listelenir",
      "Telefon bağlamı bırakılır ve yoga matı/mat kategorisi listelenir",
    ],
    expectedAudit: [
      { category: C.phone, productType: "phone", brand: "Apple" },
      { category: C.yogaMat, productType: "yoga_mat", brand: null, shouldResetContext: true, action: "category_changed_reset" },
    ],
  },
  {
    name: "Telefon kılıfı telefon değildir",
    bucket: "product_disambiguation",
    messages: ["Telefon göster", "Telefon kılıfı göster", "Apple"],
    expected: [
      "Telefonlar listelenir",
      "Telefon bağlamı bırakılır ve telefon kılıfları listelenir",
      "Apple/iPhone kılıfları listelenir",
    ],
    expectedAudit: [
      { category: C.phone, productType: "phone" },
      { category: C.phoneCase, productType: "phone_case", shouldResetContext: true },
      { category: C.phoneCase, productType: "phone_case", brand: "Apple", shouldKeepContext: true },
    ],
  },
  {
    name: "Şarj aleti telefon değildir",
    bucket: "product_disambiguation",
    messages: ["Telefon göster", "Şarj aleti", "Samsung olsun"],
    expected: [
      "Telefonlar listelenir",
      "Şarj cihazı/kablo kategorisine geçilir",
      "Samsung uyumlu/markalı şarj ürünleri listelenir",
    ],
    expectedAudit: [
      { category: C.phone, productType: "phone" },
      { category: C.charger, productType: "charger", shouldResetContext: true },
      { category: C.charger, productType: "charger", brand: "Samsung", shouldKeepContext: true },
    ],
  },
  {
    name: "Mouse pad mouse değildir",
    bucket: "product_disambiguation",
    messages: ["Mouse", "Mouse pad", "Oyuncu mouse"],
    expected: [
      "Mouse ürünleri listelenir",
      "Mouse pad kategorisine geçilir",
      "Mouse pad bağlamı bırakılıp oyuncu mouse listelenir",
    ],
    expectedAudit: [
      { category: C.mouse, productType: "mouse" },
      { category: C.mousePad, productType: "mouse_pad", shouldResetContext: true },
      { category: C.mouse, productType: "mouse", shouldResetContext: true },
    ],
  },
  {
    name: "Yoga matı ve kapı matı ayrılır",
    bucket: "same_word_different_meaning",
    messages: ["Yoga matı", "Kapı matı"],
    expected: [
      "Yoga/pilates matları listelenir",
      "Kapı matı/paspas kategorisine geçilir",
    ],
    expectedAudit: [
      { category: C.yogaMat, productType: "yoga_mat" },
      { category: C.doorMat, productType: "door_mat", shouldResetContext: true },
    ],
  },
  {
    name: "Kahve makinesi ve kahve ürünü ayrılır",
    bucket: "product_disambiguation",
    messages: ["Kahve makinesi", "Jacobs filtre kahve"],
    expected: [
      "Kahve makineleri listelenir",
      "Kahve makinesi bağlamı bırakılır ve Jacobs filtre kahve ürünleri listelenir",
    ],
    expectedAudit: [
      { category: C.coffeeMachine, productType: "coffee_machine" },
      { category: C.filterCoffee, productType: "filter_coffee", brand: "Jacobs", shouldResetContext: true },
    ],
  },
  {
    name: "Airfryer fritöz yağından ayrılır",
    bucket: "product_disambiguation",
    messages: ["Airfryer", "Fritöz yağı"],
    expected: [
      "Airfryer cihazları listelenir",
      "Cihaz bağlamı bırakılır ve kızartma/fritöz yağı listelenir",
    ],
    expectedAudit: [
      { category: C.airfryer, productType: "airfryer" },
      { category: C.fryerOil, productType: "fryer_oil", shouldResetContext: true },
    ],
  },
  {
    name: "Laptop çantası laptop değildir",
    bucket: "product_disambiguation",
    messages: ["Laptop", "Laptop çantası"],
    expected: [
      "Laptoplar listelenir",
      "Laptop çantası/aksesuar kategorisine geçilir",
    ],
    expectedAudit: [
      { category: C.laptop, productType: "laptop" },
      { category: C.laptopBag, productType: "laptop_bag", shouldResetContext: true },
    ],
  },
  {
    name: "Oyuncu koltuğu oyuncu laptopu değildir",
    bucket: "same_word_different_meaning",
    messages: ["Oyuncu laptopu", "Oyuncu koltuğu"],
    expected: [
      "Oyuncu laptopları listelenir",
      "Laptop bağlamı bırakılır ve oyuncu koltukları listelenir",
    ],
    expectedAudit: [
      { category: C.gamingLaptop, productType: "gaming_laptop" },
      { category: C.gamingChair, productType: "gaming_chair", shouldResetContext: true },
    ],
  },
  {
    name: "Net ürün/model araması da genel arama sayfasına gider",
    bucket: "exact_product_search",
    messages: ["iphone 17 pro 1tb"],
    expected: [
      "Apple/iPhone marka, iPhone 17 Pro model, 1TB depolama ile telefon araması yapılır; ürün detayına otomatik gidilmez",
    ],
    expectedAudit: [
      {
        category: C.phone,
        productType: "phone",
        brand: "Apple",
        storage: "1TB",
        exactProduct: true,
        model: "iPhone 17 Pro",
        searchQuery: "iphone 17 pro 1tb",
        searchActionHref: href("iphone 17 pro 1tb"),
      },
    ],
  },
  {
    name: "Net marka + ürün tipi filtre kahve araması makineye gitmez",
    bucket: "exact_product_search",
    messages: ["jacobs filtre kahve"],
    expected: [
      "Jacobs filtre kahve için genel arama yapılır; filtre kahve makinesi gösterilmez ve ürün detayına otomatik gidilmez",
    ],
    expectedAudit: [
      {
        category: C.filterCoffee,
        productType: "filter_coffee",
        brand: "Jacobs",
        exactProduct: false,
        searchActionHref: href("Jacobs filtre kahve"),
      },
    ],
  },
  {
    name: "Beğenmedim aktif bağlamda alternatif üretir",
    bucket: "short_commands",
    messages: ["Kırmızı Apple telefon", "Beğenmedim"],
    expected: [
      "Kırmızı Apple telefonlar listelenir",
      "Telefon bağlamı korunur, renk/storage gevşetilerek alternatifler listelenir",
    ],
    expectedAudit: [
      { category: C.phone, productType: "phone", brand: "Apple", color: "Kırmızı" },
      { category: C.phone, productType: "phone", brand: null, color: null, shouldKeepContext: true, action: "user_requested_removal" },
    ],
  },
  {
    name: "Parfümden ayakkabıya ana kategori değişimi",
    bucket: "intent_reset",
    messages: ["Parfüm göster", "Ayakkabı göster"],
    expected: [
      "Parfümler listelenir",
      "Parfüm bağlamı sıfırlanır ve ayakkabılar listelenir",
    ],
    expectedAudit: [
      { category: C.perfume, productType: "perfume" },
      { category: C.shoes, productType: "shoes", shouldResetContext: true },
    ],
  },
  {
    name: "Kısa özellik komutları bağlamı korur",
    bucket: "short_commands",
    messages: ["Samsung telefon", "256 GB", "Pro olan", "En popüler"],
    expected: [
      "Samsung telefonlar listelenir",
      "Samsung telefon bağlamında 256GB depolama uygulanır",
      "Aynı bağlamda Pro özelliği uygulanır",
      "Aynı filtreler korunup popüler sıralama uygulanır",
    ],
    expectedAudit: [
      { category: C.phone, productType: "phone", brand: "Samsung" },
      { category: C.phone, productType: "phone", brand: "Samsung", storage: "256GB", shouldKeepContext: true },
      { category: C.phone, productType: "phone", brand: "Samsung", storage: "256GB", shouldKeepContext: true },
      { category: C.phone, productType: "phone", brand: "Samsung", storage: "256GB", sort: "best_value", shouldKeepContext: true },
    ],
  },
  {
    name: "Mat kelimesi kozmetikte mat ruj olarak ayrılır",
    bucket: "same_word_different_meaning",
    messages: ["Mat ruj", "Mat"],
    expected: [
      "Mat ruj ürünleri listelenir",
      "Tek kelime mat yeni yoga/pilates matı aramasına döner",
    ],
    expectedAudit: [
      { category: C.lipstick, productType: "matte_lipstick" },
      { category: C.yogaMat, productType: "yoga_mat", shouldResetContext: true },
    ],
  },
];

const generatedRefinementProducts: Array<{
  label: string;
  productType: EcommerceProductType;
  category: string;
  brands: string[];
  colors: string[];
}> = [
  { label: "telefon", productType: "phone", category: C.phone, brands: ["Apple", "Samsung", "Xiaomi"], colors: ["Kırmızı", "Siyah", "Mavi"] },
  { label: "laptop", productType: "laptop", category: C.laptop, brands: ["Lenovo", "Asus", "MSI"], colors: ["Siyah", "Gri", "Beyaz"] },
  { label: "telefon kılıfı", productType: "phone_case", category: C.phoneCase, brands: ["Apple", "Samsung", "Xiaomi"], colors: ["Sarı", "Siyah", "Şeffaf"] },
  { label: "filtre kahve", productType: "filter_coffee", category: C.filterCoffee, brands: ["Jacobs", "Tchibo", "Lavazza"], colors: ["Kahverengi", "Siyah", "Beyaz"] },
  { label: "kahve makinesi", productType: "coffee_machine", category: C.coffeeMachine, brands: ["DeLonghi", "Philips", "Krups"], colors: ["Siyah", "Beyaz", "Gri"] },
  { label: "yoga matı", productType: "yoga_mat", category: C.yogaMat, brands: ["Nike", "Adidas", "Decathlon"], colors: ["Mor", "Mavi", "Siyah"] },
];

function generatedRefinementScenarios(): EcommerceIntentScenario[] {
  const scenarios: EcommerceIntentScenario[] = [];
  for (const item of generatedRefinementProducts) {
    item.brands.forEach((brand, index) => {
      const firstColor = item.colors[index % item.colors.length];
      const secondColor = item.colors[(index + 1) % item.colors.length];
      scenarios.push({
        name: `Kombinasyonlu daraltma: ${firstColor} ${item.label} -> ${brand} -> ${secondColor}`,
        bucket: "generated_refinement",
        messages: [`${firstColor} ${item.label}`, `${brand} olsun`, `${secondColor} olsun`, "Başka göster"],
        expected: [
          `${firstColor} ${item.label} listelenir`,
          `${brand} markasıyla daraltılır`,
          `${secondColor} rengine geçilir`,
          "Aynı kategoride alternatifler listelenir",
        ],
        expectedAudit: [
          { category: item.category, productType: item.productType, color: firstColor },
          { category: item.category, productType: item.productType, color: firstColor, brand, shouldKeepContext: true },
          { category: item.category, productType: item.productType, color: secondColor, brand, shouldKeepContext: true },
          { category: item.category, productType: item.productType, brand: null, shouldKeepContext: true, action: "user_requested_removal" },
        ],
      });
    });
  }
  return scenarios;
}

const resetPairs: Array<[string, string, string, EcommerceProductType, string, string, EcommerceProductType]> = [
  ["Telefon -> Kahve makinesi", "telefon", C.phone, "phone", "kahve makinesi", C.coffeeMachine, "coffee_machine"],
  ["Kahve makinesi -> Filtre kahve", "kahve makinesi", C.coffeeMachine, "coffee_machine", "filtre kahve", C.filterCoffee, "filter_coffee"],
  ["Filtre kahve -> Yoga matı", "filtre kahve", C.filterCoffee, "filter_coffee", "yoga matı", C.yogaMat, "yoga_mat"],
  ["Telefon -> Kılıf", "telefon", C.phone, "phone", "telefon kılıfı", C.phoneCase, "phone_case"],
  ["Laptop -> Mouse", "laptop", C.laptop, "laptop", "mouse", C.mouse, "mouse"],
  ["Parfüm -> Ayakkabı", "parfüm", C.perfume, "perfume", "ayakkabı", C.shoes, "shoes"],
];

function generatedResetScenarios(): EcommerceIntentScenario[] {
  return resetPairs.map(([name, first, firstCategory, firstType, second, secondCategory, secondType]) => ({
    name: `Niyet değişimi: ${name}`,
    bucket: "generated_reset",
    messages: [first, second, "En ucuz"],
    expected: [
      `${first} listelenir`,
      `Yeni ana kategori olan ${second} listelenir ve eski bağlam sıfırlanır`,
      `Aktif ${second} bağlamında en ucuz sonuçlar listelenir`,
    ],
    expectedAudit: [
      { category: firstCategory, productType: firstType },
      { category: secondCategory, productType: secondType, shouldResetContext: true, action: "category_changed_reset" },
      { category: secondCategory, productType: secondType, sort: "price_asc", shouldKeepContext: true },
    ],
  }));
}

export function createEcommerceIntentScenarios(): EcommerceIntentScenario[] {
  return [
    ...manualScenarios,
    ...generatedRefinementScenarios(),
    ...generatedResetScenarios(),
  ];
}
