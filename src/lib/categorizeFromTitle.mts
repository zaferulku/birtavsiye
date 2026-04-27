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
               "uyumlu kılıf", "uyumlu silikon", "silikon kapak", "arka kapak", "cüzdanlı kılıf"],
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
               "data kablosu", "fast charge kablo"],
    confidence: "high",
  },
  {
    slug: "telefon-aksesuar",
    keywords: ["telefon tutucu", "araç tutucu", "selfie çubuğu", "selfie stick",
               "popsocket", "yüzük tutucu", "telefon askısı", "boyun askısı",
               "watch kordon", "saat kordon", "kordon naylon", "kamera lens koruyucu",
               "magsafe", "stylus kalem", "dokunmatik kalem"],
    confidence: "high",
  },
  {
    slug: "tv-aksesuar",
    keywords: ["tv duvar askı", "tv standı", "tv sehpası", "tv kumandası", "uzaktan kumanda",
               "smart tv kumanda", "hdmi kablosu", "uydu alıcı"],
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
               "lcd dokunmatik", "lcd ekran", "yedek ekran", "uyumlu pil", "uyumlu batarya"],
    confidence: "high",
  },

  // --- Oyun konsol ---
  {
    slug: "oyun-konsol",
    keywords: ["nintendo switch", "playstation 5", "ps5 konsol", "xbox series",
               "switch konsol", "ps4 konsol", "ps5 dualsense", "joy-con",
               "kontrolfreek", "oyun kolu", "gamepad"],
    confidence: "high",
  },

  // --- Akıllı saat ---
  {
    slug: "akilli-saat",
    keywords: ["akıllı saat", "smart watch", "smartwatch", "fitness saat", "spor saati",
               "garmin fenix", "garmin forerunner", "apple watch series", "apple watch ultra",
               "galaxy watch ", "huawei watch gt", "xiaomi watch s", "mi band"],
    excludeIfPresent: ["kordon", "kasa koruyucu", "ekran koruyucu", "kılıf"],
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
               "android tv", "google tv"],
    excludeIfPresent: ["askı", "kumanda", "duvar", "stand", "kablosu"],
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
