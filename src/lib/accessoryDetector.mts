/**
 * accessoryDetector — Bir ürünün belirli bir ana kategoriye ait
 * "ana ürün" mü yoksa "aksesuar/yedek parça/sarf malzeme" mi olduğunu tespit eder.
 *
 * Kullanıldığı yerler:
 *  - Frontend: kategori sayfası filter
 *  - Ingestion: scraper DB'ye yazmadan önce
 *  - Audit: mevcut DB'yi flag'le
 */

export type AccessoryReason =
  | "title_keyword"
  | "title_main_product_missing"
  | "category_context_mismatch"
  | "price_too_low"
  | null;

export interface AccessoryCheckResult {
  isAccessory: boolean;
  reason: AccessoryReason;
  matchedKeyword?: string;
  confidence: "high" | "medium" | "low";
}

interface AccessoryRule {
  mainProductKeywords: string[];
  accessoryKeywords: string[];
  minPriceTRY?: number;
}

const ACCESSORY_RULES: Record<string, AccessoryRule> = {
  "kahve-makinesi": {
    mainProductKeywords: [
      "kahve makinesi", "espresso", "espresso makinesi", "kahve makinası",
      "tam otomatik", "yarı otomatik", "kapsül makinesi", "filtre kahve makinesi",
      "french press", "moka pot", "moka express", "bialetti", "türk kahvesi makinesi", "öğütücü değirmen",
      "coffee maker", "espresso machine", "kahve robotu",
    ],
    accessoryKeywords: [
      "filtre kağıdı", "filtre kagidi", "kahve filtresi", "filtre seti",
      "su tankı", "su deposu", "su filtresi",
      "süt köpürtücü aparat", "buhar başlığı", "çift cidarlı bardak",
      "kahve bardağı", "espresso bardağı", "fincan", "fincan seti", "fincan takımı",
      "demleme aparatı", "portafiltre", "tamper", "tamping mat",
      "kahve kaşığı", "kahve ölçek", "ölçek kaşığı",
      "kireç sökücü", "kirec sokucu", "temizleme tableti", "kahve makinesi temizleyici",
      "yedek parça", "değirmen taşı",
      "kahve çekirdeği", "kahve kapsülü", "kapsül paket",
      "kahve termosu", "termos", "kupa", "mug",
      "barista çantası", "barista seti",
    ],
    minPriceTRY: 800,
  },

  "bulasik-makinesi": {
    mainProductKeywords: [
      "bulaşık makinesi", "bulasik makinesi", "ankastre bulaşık",
      "dishwasher", "solo bulaşık",
    ],
    accessoryKeywords: [
      "bulaşık deterjanı", "bulaşık tableti", "bulasik tableti",
      "parlatıcı", "tuz", "yedek sepet", "üst sepet", "alt sepet",
      "rayı", "ray seti", "filtresi", "kireç önleyici",
      "temizleyici", "machine cleaner", "yağ sökücü",
    ],
    minPriceTRY: 5000,
  },

  "camasir-makinesi": {
    mainProductKeywords: [
      "çamaşır makinesi", "camasir makinesi", "ankastre çamaşır",
      "washing machine", "kurutmalı çamaşır",
    ],
    accessoryKeywords: [
      "çamaşır deterjanı", "çamaşır tozu", "yumuşatıcı", "leke çıkarıcı",
      "çamaşır torbası", "kireç önleyici", "filtre", "tahliye hortumu",
      "su giriş hortumu", "hortum", "yedek conta", "amortisör",
      "drum cleaner", "machine cleaner", "tambur temizleyici",
    ],
    minPriceTRY: 6000,
  },

  "sac-kurutma-makinesi": {
    mainProductKeywords: [
      "saç kurutma", "sac kurutma", "fön makinesi", "fon makinesi",
      "hairdryer", "hair dryer", "sessiz fön",
    ],
    accessoryKeywords: [
      "fön başlığı", "difüzör", "diffuser başlık", "yedek başlık",
      "ısı koruyucu", "saç fırçası", "elektrikli fırça",
      "tarak", "saç bandı",
    ],
    minPriceTRY: 300,
  },

  "televizyon": {
    mainProductKeywords: [
      "televizyon", "televizyonu", "tv", "led tv", "oled tv", "qled tv",
      "smart tv", "uhd tv", "4k tv", "8k tv", "android tv", "google tv",
    ],
    accessoryKeywords: [
      "tv askı aparatı", "duvar askı", "tv standı", "tv sehpası",
      "hdmi kablo", "hdmi kablosu", "anten", "uydu alıcı",
      "kumanda", "uzaktan kumanda", "tv kumandası",
      "tv koruyucu", "ekran koruyucu", "ekran temizleyici",
      "soundbar", "ses sistemi", "yan hoparlör",
      "tv ünitesi", "tv tablası",
    ],
    minPriceTRY: 4000,
  },

  "laptop": {
    mainProductKeywords: [
      "laptop", "notebook", "dizüstü", "macbook", "ultrabook",
      "gaming laptop", "ideapad", "thinkpad", "vivobook", "zenbook",
      "pavilion", "envy", "spectre", "elitebook", "probook",
    ],
    accessoryKeywords: [
      "laptop çantası", "notebook çantası", "sırt çantası",
      "laptop standı", "soğutucu pad", "cooling pad",
      "şarj cihazı", "adaptör", "adapter", "güç kablosu", "yedek batarya",
      "klavye kılıfı", "klavye koruyucu", "ekran koruyucu",
      "usb hub", "type-c hub", "dock istasyon", "docking station",
      "ekran kartı yükseltme",
    ],
    minPriceTRY: 8000,
  },

  "akilli-telefon": {
    mainProductKeywords: [
      "telefon", "smartphone", "iphone", "galaxy", "redmi", "poco",
      "honor", "huawei p", "huawei mate", "oppo", "vivo", "realme",
      "nubia", "tecno", "infinix", "xiaomi", "pixel",
    ],
    accessoryKeywords: [
      "kılıf", "kilif", "kapak",
      "ekran koruyucu", "cam koruyucu", "screen protector", "tempered glass",
      "şarj cihazı", "şarj aleti", "şarj kablosu",
      "earbuds", "airpods kılıf",
      "selfie çubuğu", "tripod", "telefon tutucu",
      "popsocket", "yüzük tutucu",
      "mıknatıslı tutucu", "araç tutucu",
      "stylus",
      "yedek parça", "yedek ekran", "yedek batarya", "yedek pil",
    ],
    minPriceTRY: 3000,
  },
};

const UNIVERSAL_ACCESSORY_KEYWORDS = [
  "yedek parça", "spare part",
  "aparatı",
  "kılıf", "kilif", "kapak",
  "kablosu", "cable",
  "adaptör", "adapter", "şarj cihazı", "şarj aleti",
  "filtre kağıdı", "filtre seti",
  "temizleme seti", "cleaning kit",
  "deterjanı", "deterjan tableti",
  "yedek başlık", "yedek bıçak",
];

// Türkçe normalize merkezi util'den (İ.toLowerCase combining-dot bug fix).
import { trNormalize } from "./turkishNormalize.mts";

function normalize(s: string): string {
  return trNormalize(s);
}

// Word-boundary keyword match: "kablosu" "kablosuz" icinde yakalamasin diye.
// Multi-word keyword'lerde de calisir (ornek: "kahve makinesi temizleyici").
function matchesKeyword(haystackNorm: string, keyword: string): boolean {
  const kwNorm = normalize(keyword);
  if (!kwNorm) return false;
  const escaped = kwNorm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(haystackNorm);
}

// Aksesuar kategorileri — bu kategorilerin sayfasinda detector devre disi
// (ornek: powerbank kategori page'inde "kablosu" gecen powerbank gizlenmemeli)
const ACCESSORY_CATEGORY_SLUGS = new Set([
  "powerbank",
  "telefon-kilifi",
  "telefon-aksesuar",
  "sarj-kablo",
  "tv-aksesuar",
  "bilgisayar-cevre",
  "arac-aksesuar",
  "ses-kulaklik",
  "kulaklik",
  "klavye",
  "mouse",
  "fotograf-kamera",
  "drone",
  "akilli-saat",
  "oyun-konsol",
  "oto-aku",
  "elektrikli-aletler",
  "networking",
  "tablet",
  "mutfak-sofra",
]);

export function checkAccessory(
  title: string,
  categorySlug: string,
  priceTRY?: number,
): AccessoryCheckResult {
  if (!title) {
    return { isAccessory: false, reason: null, confidence: "low" };
  }

  // Aksesuar/yan urun kategorilerinde detector calistirmiyoruz
  if (ACCESSORY_CATEGORY_SLUGS.has(categorySlug)) {
    return { isAccessory: false, reason: null, confidence: "high" };
  }

  const titleNorm = normalize(title);
  const rule = ACCESSORY_RULES[categorySlug];

  if (rule) {
    for (const kw of rule.accessoryKeywords) {
      if (matchesKeyword(titleNorm, kw)) {
        return {
          isAccessory: true,
          reason: "title_keyword",
          matchedKeyword: kw,
          confidence: "high",
        };
      }
    }
  }

  for (const kw of UNIVERSAL_ACCESSORY_KEYWORDS) {
    if (matchesKeyword(titleNorm, kw)) {
      return {
        isAccessory: true,
        reason: "title_keyword",
        matchedKeyword: kw,
        confidence: "high",
      };
    }
  }

  if (rule && rule.mainProductKeywords.length > 0) {
    const hasMainKeyword = rule.mainProductKeywords.some((kw) =>
      matchesKeyword(titleNorm, kw),
    );
    if (!hasMainKeyword) {
      return {
        isAccessory: true,
        reason: "title_main_product_missing",
        confidence: "medium",
      };
    }
  }

  if (rule?.minPriceTRY && priceTRY && priceTRY > 0 && priceTRY < rule.minPriceTRY) {
    return {
      isAccessory: true,
      reason: "price_too_low",
      confidence: "medium",
    };
  }

  return { isAccessory: false, reason: null, confidence: "high" };
}

export function hasAccessoryRule(categorySlug: string): boolean {
  return categorySlug in ACCESSORY_RULES;
}

export function getAccessoryRule(categorySlug: string): AccessoryRule | null {
  return ACCESSORY_RULES[categorySlug] ?? null;
}
