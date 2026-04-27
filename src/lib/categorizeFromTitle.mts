/**
 * categorizeFromTitle — Ürün başlığından kategori slug'ı çıkarır.
 *
 * Kullanım:
 *  - PttAVM (ve diğer scraper) live data → canonical product oluştururken
 *  - Faz1 classifier bypass (Gemini kotası tasarrufu)
 *  - Match yoksa null döner — fallback Gemini classifier
 *
 * Sıra önemli: aksesuar/yedek parça önce match etsin (telefon kılıfı önce, telefon sonra).
 */

export interface CategoryMatchResult {
  slug: string | null;
  confidence: "high" | "medium" | "low";
  matchedKeyword?: string;
}

interface CategoryRule {
  slug: string;
  keywords: string[];
  excludeIfPresent?: string[];
  confidence?: "high" | "medium";
}

const RULES: CategoryRule[] = [
  // --- Aksesuarlar ---
  {
    slug: "telefon-kilifi",
    keywords: ["telefon kılıfı", "silikon kılıf", "kılıf siyah", "kılıf gold", "kılıf şeffaf",
               "uyumlu kılıf", "uyumlu silikon", "silikon kapak", "arka kapak", "cüzdanlı kılıf",
               "kılıf negro", "kılıf first", "kılıf silikon", "kılıf airbagli", "kılıf mat",
               "kılıf kamera korumalı", "kılıf biye", "kılıf bright simli", "kılıf kelvin",
               "kılıf renkli", "kılıf resimli", "kılıf yumuşak", "kılıf darbeye",
               "kılıf magnum", "kılıf kapaklı", "kılıf aras deri", "kılıf ananas"],
    excludeIfPresent: ["watch", "ipad", "tablet", "tv "],
    confidence: "high",
  },
  {
    slug: "ekran-koruyucu",
    keywords: ["ekran koruyucu", "cam koruyucu", "mat seramik", "9d temperli",
               "tempered glass", "screen protector"],
    confidence: "high",
  },
  {
    slug: "sarj-kablo",
    keywords: ["şarj kablosu", "usb-c kablo", "lightning kablo", "type-c kablo",
               "data kablosu", "fast charge kablo",
               "şarj aleti", "şarj adaptörü", "güç adaptörü", "süper hızlı şarj",
               "type-c süper hızlı", "laptop şarj aleti", "adaptör plastik kasa",
               "type-c / usb kablo"],
    confidence: "high",
  },
  {
    slug: "telefon-aksesuar",
    keywords: ["telefon tutucu", "araç tutucu", "selfie çubuğu", "selfie stick",
               "popsocket", "yüzük tutucu", "telefon askısı", "boyun askısı",
               "watch kordon", "saat kordon", "kordon naylon", "kamera lens koruyucu",
               "magsafe", "stylus kalem", "dokunmatik kalem",
               "kordon", "kayış silikon", "süet kordon", "metal tokalı",
               "kamera lens", "raze metal kamera", "watch kasa", "watch kılıf",
               "watch gard", "watch ekran koruma", "kasa koruyucu watch", "watch ppma"],
    excludeIfPresent: ["tv askı", "akıllı saat ", "smart watch ", "akıllı telefon"],
    confidence: "high",
  },
  {
    slug: "tv-aksesuar",
    keywords: ["tv duvar askı", "tv standı", "tv sehpası", "tv kumandası", "uzaktan kumanda",
               "smart tv kumanda", "hdmi kablosu", "uydu alıcı",
               "tv askı aparatı", "askı aparatı", "tavan askı", "askı aparat",
               "lcd led tv", "tv mönitör", "tv lcd led", "tv duvar",
               "smart tv akıllı kumanda", "tv kumanda", "tv evolution kit",
               "tüplü televizyon kumandası", "ses komutlu kumanda", "android tv kumanda",
               "android tv box", "tv yedek kumandası"],
    confidence: "high",
  },
  {
    slug: "bilgisayar-cevre",
    keywords: ["kablosuz mouse", "gaming mouse", "kablosuz klavye", "mekanik klavye",
               "webcam", "usb hub", "type-c hub", "dock istasyon", "docking station"],
    confidence: "high",
  },

  // --- Yedek parça ---
  {
    slug: "telefon-yedek-parca",
    keywords: ["batarya pil", "telefon pili", "telefon bataryası", "yedek pil",
               "lcd dokunmatik", "lcd ekran", "yedek ekran", "uyumlu pil", "uyumlu batarya",
               "pil batarya", "şarj soketi", "arka pil batarya kapağı", "batarya kapağı",
               "güçlendirilmiş batarya", "ithal pil", "lenovo pil", "kamera pili",
               "kamera bataryası", "şarj cihazı dock"],
    confidence: "high",
  },

  // --- Oyun konsol ---
  {
    slug: "oyun-konsol",
    keywords: ["nintendo switch", "playstation 5", "ps5 konsol", "xbox series",
               "switch konsol", "ps4 konsol", "ps5 dualsense", "joy-con",
               "kontrolfreek", "oyun kolu", "gamepad",
               "retro oyun konsolu", "taşınabilir oyun konsolu", "video oyun konsolu",
               "oyun konsolu", "atari ", "hdmi oyun konsolu", "emülatör destekli",
               "klasik oyunlu", "1000 oyun yüklü", "oyun yüklü"],
    confidence: "high",
  },

  // --- Bilgisayar bileşenleri (RAM/SSD/Anakart vs) ---
  {
    slug: "bilgisayar-bilesenleri",
    keywords: ["ddr4 ram", "ddr5 ram", "ddr4 bellek", "ddr5 bellek", "ecc rdimm",
               "rdimm", "udimm", "sodimm", "ssd nvme", "ssd m.2", "ssd sata",
               "tb ssd ", "gb ssd ", "pc4-2133", "pc5-", "ram bellek",
               "8gb ddr4", "16gb ddr4", "32gb ddr4", "64gb ddr4", "ddr4 2133",
               "soğutucu pad", "notebook soğutucu"],
    excludeIfPresent: ["telefon", "tablet"],
    confidence: "high",
  },

  // --- Klima ---
  {
    slug: "klima",
    keywords: ["btu klima", "duvar tipi split", "windfree", "multi inverter",
               "inverter klima", "9000 btu", "12000 btu", "18000 btu", "24000 btu",
               "duvar tipi multi"],
    confidence: "high",
  },

  // --- Mikrodalga ---
  {
    slug: "mikrodalga",
    keywords: ["mikrodalga", "ankastre mikrodalga", "dijital mikrodalga", "retro mikrodalga"],
    confidence: "high",
  },

  // --- Akıllı saat ---
  {
    slug: "akilli-saat",
    keywords: ["akıllı saat", "smart watch", "smartwatch", "fitness saat", "spor saati",
               "garmin fenix", "garmin forerunner", "garmin descent", "garmin venu",
               "apple watch series", "apple watch ultra",
               "galaxy watch ", "huawei watch gt", "xiaomi watch s", "mi band",
               "vivowatch", "asus vivowatch", "smartwatch silikon", "watch s88",
               "imıkı sf1", "linktech watch"],
    excludeIfPresent: ["kordon", "kasa koruyucu", "ekran koruyucu", "kılıf",
                        "watch gard", "watch ppma", "watch kasa", "watch kayış"],
    confidence: "high",
  },

  // --- Akıllı telefon ---
  {
    slug: "akilli-telefon",
    keywords: ["akıllı telefon", "cep telefonu", "smartphone",
               "iphone 11", "iphone 12", "iphone 13", "iphone 14", "iphone 15",
               "iphone 16", "iphone 17", "iphone air", "iphone se",
               "galaxy s23", "galaxy s24", "galaxy s25", "galaxy a", "galaxy z",
               "redmi note", "redmi 1", "xiaomi 1", "poco f", "poco x",
               "huawei pura", "huawei nova", "huawei mate",
               "honor magic", "honor 400", "honor 200",
               "oppo reno", "oppo find x", "oppo a",
               "vivo y", "vivo v", "vivo x",
               "tecno spark", "tecno camon", "tecno pop",
               "infinix hot", "infinix note",
               "realme c", "realme gt", "realme note",
               "tuşlu telefon", "tuşlu cep telefonu"],
    excludeIfPresent: ["kılıf", "kapak", "ekran koruyucu", "cam koruyucu", "kablo",
                        "şarj cihazı", "şarj aleti", "tutucu", "askı", "stylus",
                        "lcd", "batarya", "pil", "yedek"],
    confidence: "high",
  },

  // --- Tablet ---
  {
    slug: "tablet",
    keywords: ["ipad pro", "ipad air", "ipad mini", "ipad a16", "ipad 11", "ipad 10",
               "galaxy tab s", "galaxy tab a", "matepad", "xiaomi pad", "redmi pad",
               "lenovo tab", "android tablet"],
    excludeIfPresent: ["kılıf", "kapak", "ekran koruyucu", "kalem"],
    confidence: "high",
  },

  // --- Laptop ---
  {
    slug: "laptop",
    keywords: ["macbook pro", "macbook air", "thinkpad", "ideapad", "vivobook", "zenbook",
               "rog strix", "rog zephyrus", "tuf gaming", "pavilion", "elitebook", "probook",
               "zbook", "omen", "victus", "omnibook", "yoga slim", "yoga pro",
               "legion pro", "legion slim", "ideapad slim", "predator helios",
               "nitro 5", "aspire", "swift go", "nirvana", "excalibur",
               "msi stealth", "msi katana", "msi raider", "msi prestige", "msi modern"],
    excludeIfPresent: ["çantası", "standı", "soğutucu", "klavye kılıfı", "şarj cihazı"],
    confidence: "high",
  },

  // --- Beyaz eşya ---
  {
    slug: "buzdolabi",
    keywords: ["buzdolabı", "no frost", "no-frost", "kombi tipi", "ankastre buzdolabı",
               "alttan donduruculu"],
    excludeIfPresent: ["kapak", "filtre", "raf"],
    confidence: "high",
  },
  {
    slug: "camasir-makinesi",
    keywords: ["çamaşır makinesi", "camasir makinesi", "kurutmalı çamaşır", "ankastre çamaşır"],
    excludeIfPresent: ["deterjanı", "tableti", "yumuşatıcı", "filtre"],
    confidence: "high",
  },
  {
    slug: "bulasik-makinesi",
    keywords: ["bulaşık makinesi", "bulasik makinesi", "ankastre bulaşık"],
    excludeIfPresent: ["deterjanı", "tableti", "tuz", "parlatıcı"],
    confidence: "high",
  },
  {
    slug: "firin-ocak",
    keywords: ["ankastre fırın", "set üstü ocak", "ankastre ocak", "elektrikli fırın",
               "mini fırın"],
    confidence: "high",
  },

  // --- Küçük ev aletleri ---
  {
    slug: "kahve-makinesi",
    keywords: ["kahve makinesi", "espresso makinesi", "kapsül makinesi", "filtre kahve makinesi",
               "moka pot", "french press", "türk kahvesi makinesi"],
    excludeIfPresent: ["filtre kağıdı", "su filtresi", "fincan", "bardağı", "kireç sökücü"],
    confidence: "high",
  },
  {
    slug: "supurge",
    keywords: ["robot süpürge", "dik süpürge", "dikey süpürge", "şarjlı süpürge", "ev süpürgesi",
               "elektrikli süpürge", "torbasız süpürge"],
    excludeIfPresent: ["filtre", "fırça başlığı"],
    confidence: "high",
  },
  {
    slug: "blender-robot",
    keywords: ["blender", "el blender", "smoothie maker", "mutfak robotu", "rondo", "doğrayıcı"],
    confidence: "high",
  },
  {
    slug: "sac-kurutma-sekillendirici",
    keywords: ["saç kurutma", "fön makinesi", "fön cihazı", "saç düzleştirici", "saç maşası",
               "şekillendirici"],
    excludeIfPresent: ["fön başlığı", "yedek başlık"],
    confidence: "high",
  },
  {
    slug: "tost-makinesi",
    keywords: ["tost makinesi", "ızgara tost", "multi grill"],
    confidence: "high",
  },

  // --- Audio ---
  {
    slug: "kulaklik",
    keywords: ["bluetooth kulaklık", "kablosuz kulaklık", "airpods pro", "airpods 2", "airpods 3",
               "kulak içi kulaklık", "kulak üstü kulaklık", "earbuds"],
    excludeIfPresent: ["kılıf", "kasa", "stand", "tutucu"],
    confidence: "high",
  },
  {
    slug: "bluetooth-hoparlor",
    keywords: ["bluetooth hoparlör", "kablosuz hoparlör", "taşınabilir hoparlör"],
    confidence: "high",
  },

  // --- Powerbank ---
  {
    slug: "powerbank",
    keywords: ["powerbank", "taşınabilir şarj", "harici batarya", "yedek şarj cihazı"],
    confidence: "high",
  },

  // --- Drone / kamera ---
  {
    slug: "drone",
    keywords: ["drone", "dji mavic", "dji mini", "dji air", "dji avata"],
    confidence: "high",
  },
  {
    slug: "fotograf-kamera",
    keywords: ["dslr kamera", "mirrorless kamera", "kompakt kamera", "vlog kamera", "fotokapan kamera"],
    excludeIfPresent: ["aksiyon kamera", "tripod"],
    confidence: "high",
  },
  {
    slug: "aksiyon-kamera",
    keywords: ["gopro hero", "aksiyon kamera", "action camera"],
    excludeIfPresent: ["ekran koruyucu", "kılıf", "kasa"],
    confidence: "high",
  },

  // --- Televizyon ---
  {
    slug: "televizyon",
    keywords: ["smart tv", "led tv", "oled tv", "qled tv", "uhd tv", "4k tv", "8k tv",
               "android tv", "google tv",
               "ultra hd (4k) tv", "tv 4k", "55 inç tv", "65 inç tv", "75 inç tv",
               "lg ultra hd", "tcl 4k", "samsung qled", "beko crystal pro"],
    excludeIfPresent: ["askı", "kumanda", "duvar", "stand", "kablosu", "yedek"],
    confidence: "high",
  },

  // --- Buzdolabı/Beyaz eşya ek ---
  {
    slug: "firin-ocak",
    keywords: ["ocaklı", "ocaklı fırın", "siemens fırın", "ankastre buhar destekli"],
    confidence: "high",
  },
  {
    slug: "guvenlik-kamerasi",
    keywords: ["güvenlik kamerası", "outdoor güvenlik", "dış mekan güvenlik kamerası",
               "wi-fi 5mp outdoor", "ip kamera"],
    confidence: "high",
  },
];

function normalize(s: string): string {
  return s.toLowerCase()
    .replace(/ı/g, "i").replace(/İ/g, "i")
    .replace(/ş/g, "s").replace(/Ş/g, "s")
    .replace(/ğ/g, "g").replace(/Ğ/g, "g")
    .replace(/ü/g, "u").replace(/Ü/g, "u")
    .replace(/ö/g, "o").replace(/Ö/g, "o")
    .replace(/ç/g, "c").replace(/Ç/g, "c")
    .trim();
}

export function categorizeFromTitle(title: string): CategoryMatchResult {
  if (!title) return { slug: null, confidence: "low" };
  const norm = normalize(title);

  for (const rule of RULES) {
    let matchedKw: string | null = null;
    for (const kw of rule.keywords) {
      if (norm.includes(normalize(kw))) {
        matchedKw = kw;
        break;
      }
    }
    if (!matchedKw) continue;

    if (rule.excludeIfPresent) {
      const hasExclude = rule.excludeIfPresent.some((ex) => norm.includes(normalize(ex)));
      if (hasExclude) continue;
    }

    return {
      slug: rule.slug,
      confidence: rule.confidence ?? "high",
      matchedKeyword: matchedKw,
    };
  }

  return { slug: null, confidence: "low" };
}
