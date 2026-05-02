export type FlowStepKey =
  | "brand"
  | "storage"
  | "budget"
  | "scent"
  | "skin_type"
  | "capacity"
  | "btu"
  | "size"
  | "shoe_size"
  | "color"
  | "usage"
  | "screen_size"
  | "panel_type"
  | "refresh_rate"
  | "coffee_type"
  | "vacuum_type"
  | "pet_need"
  | "age_range"
  | "bag_type";

export type FlowStepDefinition = {
  key: FlowStepKey;
  question: string;
  options: string[];
  icon?: string;
};

const PHONE_LIKE_CATEGORIES = new Set([
  "akilli-telefon",
  "tablet",
  "laptop",
  "akilli-saat",
]);

const AUDIO_CATEGORIES = new Set([
  "kulaklik",
  "bluetooth-hoparlor",
  "soundbar",
]);

const DISPLAY_CATEGORIES = new Set([
  "televizyon",
  "monitor",
  "projeksiyon",
]);

const SCENT_CATEGORIES = new Set(["parfum", "deodorant"]);
const SKIN_CATEGORIES = new Set(["serum-ampul", "yuz-nemlendirici", "yuz-temizleyici"]);
const WHITE_GOODS_CAPACITY_CATEGORIES = new Set([
  "buzdolabi",
  "camasir-makinesi",
  "bulasik-makinesi",
  "kurutma-makinesi",
]);
const KITCHEN_APPLIANCE_CATEGORIES = new Set([
  "airfryer",
  "kahve-makinesi",
  "kahve-cay-makinesi",
  "blender",
  "mikser",
  "tost-makinesi",
]);
const CLEANING_CATEGORIES = new Set([
  "robot-supurge",
  "supurge",
]);
const CLIMATE_CATEGORIES = new Set(["klima"]);
const SPORTS_OUTDOOR_PREFIX = "spor-outdoor/";
const BOOK_HOBBY_PREFIX = "kitap-hobi/";
const HOME_LIVING_PREFIX = "ev-yasam/";
const AUTOMOTIVE_PREFIX = "otomotiv/";
const SUPERMARKET_PREFIX = "supermarket/";

const CHAT_CATEGORY_LEAF_ALIASES: Record<string, string> = {
  telefon: "akilli-telefon",
  "cep-telefonu": "akilli-telefon",
  "kahve-makinesi": "kahve-makinesi",
  "kedi-mamasi": "mama",
  "kopek-mamasi": "mama",
  "kedi-kumu": "kum",
  tv: "televizyon",
};

export function normalizeCategoryFlowText(value: string): string {
  return value
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveCategoryLabel(
  categorySlug: string | null | undefined,
  userMessage: string
): string {
  const path = normalizeCategoryFlowText(categorySlug ?? "");
  const rawLeaf = getLeafCategorySlug(categorySlug);
  if (rawLeaf === "kedi-mamasi") return "kedi mamasi";
  if (rawLeaf === "kopek-mamasi") return "kopek mamasi";
  if (rawLeaf === "kedi-kumu") return "kedi kumu";
  const leaf = canonicalizeCategoryLeaf(rawLeaf);

  if (path.includes("pet-shop/kedi/mama")) return "kedi mamasi";
  if (path.includes("pet-shop/kopek/mama")) return "kopek mamasi";
  if (path.includes("pet-shop/kedi/kum")) return "kedi kumu";
  if (path.includes("bebek-arabasi")) return "bebek arabasi";
  if (path.includes("oto-koltugu")) return "oto koltugu";

  const map: Record<string, string> = {
    "akilli-telefon": "telefon",
    tablet: "tablet",
    laptop: "laptop",
    "akilli-saat": "akilli saat",
    kulaklik: "kulaklik",
    "bluetooth-hoparlor": "hoparlor",
    soundbar: "soundbar",
    televizyon: "televizyon",
    monitor: "monitor",
    projeksiyon: "projeksiyon",
    parfum: "parfum",
    deodorant: "deodorant",
    "serum-ampul": "serum",
    "yuz-nemlendirici": "nemlendirici",
    "yuz-temizleyici": "temizleyici",
    buzdolabi: "buzdolabi",
    "camasir-makinesi": "camasir makinesi",
    "bulasik-makinesi": "bulasik makinesi",
    "kurutma-makinesi": "kurutma makinesi",
    klima: "klima",
    "kahve-makinesi": "kahve makinesi",
    "kahve-cay-makinesi": "kahve makinesi",
    airfryer: "airfryer",
    "robot-supurge": "robot supurge",
    supurge: "supurge",
    elbise: "elbise",
    sneaker: "ayakkabi",
    ayakkabi: "ayakkabi",
    bot: "bot",
    babet: "babet",
    terlik: "terlik",
    canta: "canta",
    mama: "mama",
    kum: "kum",
    kahve: "kahve",
  };

  if (leaf && map[leaf]) {
    return map[leaf];
  }

  const normalized = normalizeCategoryFlowText(userMessage);
  if (normalized.includes("telefon")) return "telefon";
  if (normalized.includes("tablet")) return "tablet";
  if (normalized.includes("laptop")) return "laptop";
  if (normalized.includes("kulaklik")) return "kulaklik";
  if (normalized.includes("televizyon") || normalized.includes("tv")) return "televizyon";
  if (normalized.includes("kahve makinesi")) return "kahve makinesi";
  if (normalized.includes("kahve")) return "kahve";
  if (normalized.includes("klima")) return "klima";
  if (normalized.includes("parfum")) return "parfum";
  if (normalized.includes("deodorant")) return "deodorant";
  if (normalized.includes("serum")) return "serum";
  if (normalized.includes("robot supurge")) return "robot supurge";
  if (normalized.includes("elbise")) return "elbise";
  if (normalized.includes("bisiklet")) return "bisiklet";
  if (normalized.includes("kitap")) return "kitap";
  if (normalized.includes("kamp")) return "kamp urunu";
  if (normalized.includes("arac") || normalized.includes("oto")) return "otomotiv urunu";
  return "urun";
}

export function getNextCategoryFlowStep(options: {
  categorySlug: string | null | undefined;
  userMessage: string;
  hasBrand: boolean;
  hasPricePreference: boolean;
}): FlowStepDefinition | null {
  const { categorySlug, userMessage, hasBrand, hasPricePreference } = options;
  const normalized = normalizeCategoryFlowText(userMessage);
  const path = normalizeCategoryFlowText(categorySlug ?? "");
  const leafRaw = getLeafCategorySlug(categorySlug);
  const leaf = canonicalizeCategoryLeaf(leafRaw);

  if (!leaf && !path) return null;

  if (PHONE_LIKE_CATEGORIES.has(leaf)) {
    if (leaf === "tablet") {
      if (!hasUsagePreference(normalized, leaf)) {
        return makeUsageStep("Tablet daha cok ne icin olacak?", ["Not alma", "Cizim", "Oyun", "Gunluk"]);
      }
    }

    if (leaf === "laptop") {
      if (!hasUsagePreference(normalized, leaf)) {
        return makeUsageStep("Laptopu daha cok ne icin istiyorsun?", [
          "Ofis",
          "Oyun",
          "Yazilim",
          "Gunluk",
        ]);
      }
    }

    if (leaf === "akilli-saat") {
      if (!hasUsagePreference(normalized, leaf)) {
        return makeUsageStep("Saatte oncelik ne olsun?", [
          "Spor",
          "Gunluk",
          "Pil omru",
          "Bildirim",
        ]);
      }
      if (!hasBrand) return makeBrandStep();
      if (!hasPricePreference) return makeBudgetStep();
      return null;
    }

    if (!hasBrand) return makeBrandStep();
    if (!hasStoragePreference(normalized)) {
      return {
        key: "storage",
        question: leaf === "laptop" ? "Depolama kac GB olsun?" : "Hafiza kac GB olsun?",
        options:
          leaf === "laptop"
            ? ["256 GB", "512 GB", "1 TB"]
            : ["128 GB", "256 GB", "512 GB", "1 TB"],
        icon: "💾",
      };
    }
    if (!hasPricePreference) return makeBudgetStep();
    return null;
  }

  if (AUDIO_CATEGORIES.has(leaf)) {
    if (!hasUsagePreference(normalized, leaf)) {
      if (leaf === "kulaklik") {
        return makeUsageStep("Kulaklik tipi nasil olsun?", [
          "Kulak ici",
          "Kulak ustu",
          "Kablosuz",
          "Oyuncu",
        ]);
      }
      if (leaf === "bluetooth-hoparlor") {
        return makeUsageStep("Hoparloru daha cok nerede kullanacaksin?", [
          "Tasınabilir",
          "Ev tipi",
          "Parti",
          "Su gecirmez",
        ]);
      }
      return makeUsageStep("Ses urununde oncelik ne olsun?", [
        "Film",
        "Muzik",
        "Oyun",
        "Gunluk",
      ]);
    }
    if (!hasBrand) return makeBrandStep();
    if (!hasPricePreference) return makeBudgetStep();
    return null;
  }

  if (DISPLAY_CATEGORIES.has(leaf)) {
    if (leaf === "monitor") {
      if (!hasUsagePreference(normalized, leaf)) {
        return makeUsageStep("Monitorde oncelik ne olsun?", [
          "Oyun",
          "Ofis",
          "Tasarim",
          "Gunluk",
        ]);
      }
      if (!hasScreenSizePreference(normalized)) {
        return makeScreenSizeStep("Monitor kac inc olsun?", ["24 inc", "27 inc", "32 inc", "34 inc"]);
      }
      if (!hasRefreshRatePreference(normalized)) {
        return {
          key: "refresh_rate",
          question: "Yenileme hizi kac Hz olsun?",
          options: ["60 Hz", "120 Hz", "144 Hz", "240 Hz"],
          icon: "⚡",
        };
      }
      if (!hasPricePreference) return makeBudgetStep();
      return null;
    }

    if (!hasScreenSizePreference(normalized)) {
      return makeScreenSizeStep(
        leaf === "televizyon" ? "Televizyon kac inc olsun?" : "Ekran boyutu ne olsun?",
        leaf === "televizyon"
          ? ["43 inc", "50 inc", "55 inc", "65 inc"]
          : ["100 inc", "120 inc", "4K", "Tasınabilir"]
      );
    }
    if (leaf === "televizyon" && !hasPanelTypePreference(normalized)) {
      return {
        key: "panel_type",
        question: "Goruntu tipi nasil olsun?",
        options: ["LED", "QLED", "OLED", "Mini LED"],
        icon: "📺",
      };
    }
    if (!hasPricePreference) return makeBudgetStep();
    return null;
  }

  if (SCENT_CATEGORIES.has(leaf)) {
    if (!hasScentPreference(normalized)) {
      return {
        key: "scent",
        question: "Nasil bir koku istiyorsun?",
        options: ["Ciceksi", "Fresh", "Odunsu", "Vanilyali"],
        icon: "🌸",
      };
    }
    if (!hasBrand) return makeBrandStep();
    if (!hasPricePreference) return makeBudgetStep();
    return null;
  }

  if (SKIN_CATEGORIES.has(leaf) || isMakeupCategory(path, leaf)) {
    if (isMakeupCategory(path, leaf)) {
      if (!hasColorPreference(normalized)) {
        return {
          key: "color",
          question: "Renk veya ton tercihin var mi?",
          options: ["Nude", "Pembe", "Kirmizi", "Seftali"],
          icon: "🎨",
        };
      }
    } else if (!hasSkinTypePreference(normalized)) {
      return {
        key: "skin_type",
        question: "Cilt tipi nasil olsun?",
        options: ["Yagli cilt", "Kuru cilt", "Hassas cilt", "Lekeli cilt"],
        icon: "🧴",
      };
    }
    if (!hasPricePreference) return makeBudgetStep();
    return null;
  }

  if (WHITE_GOODS_CAPACITY_CATEGORIES.has(leaf)) {
    if (!hasCapacityPreference(normalized)) {
      return {
        key: "capacity",
        question: "Kapasite veya tip ne olsun?",
        options:
          leaf === "buzdolabi"
            ? ["Mini", "No Frost", "Gardrop tipi", "Genis hacim"]
            : leaf === "bulasik-makinesi"
              ? ["12 kisilik", "13 kisilik", "14 kisilik", "Ankastre"]
              : ["8 kg", "9 kg", "10 kg", "12 kg"],
        icon: "📦",
      };
    }
    if (!hasBrand) return makeBrandStep();
    if (!hasPricePreference) return makeBudgetStep();
    return null;
  }

  if (CLIMATE_CATEGORIES.has(leaf)) {
    if (!hasBtuPreference(normalized)) {
      return {
        key: "btu",
        question: "Kac BTU olsun?",
        options: ["9000 BTU", "12000 BTU", "18000 BTU", "24000 BTU"],
        icon: "❄️",
      };
    }
    if (!hasBrand) return makeBrandStep();
    if (!hasPricePreference) return makeBudgetStep();
    return null;
  }

  if (KITCHEN_APPLIANCE_CATEGORIES.has(leaf)) {
    if (leaf === "kahve-makinesi" || leaf === "kahve-cay-makinesi") {
      if (!hasCoffeeTypePreference(normalized)) {
        return {
          key: "coffee_type",
          question: "Hangi tip olsun?",
          options: ["Espresso", "Filtre", "Kapsullu", "Turk kahvesi"],
          icon: "☕",
        };
      }
    } else if (!hasCapacityPreference(normalized)) {
      return {
        key: "capacity",
        question: leaf === "airfryer" ? "Kapasite ne olsun?" : "Hacim veya guc ne olsun?",
        options:
          leaf === "airfryer"
            ? ["3-4 L", "5-6 L", "7 L+", "Cift hazneli"]
            : ["Kompakt", "Orta boy", "Yuksek guc", "Cok amacli"],
        icon: "🍳",
      };
    }
    if (!hasBrand) return makeBrandStep();
    if (!hasPricePreference) return makeBudgetStep();
    return null;
  }

  if (CLEANING_CATEGORIES.has(leaf)) {
    if (leaf === "robot-supurge" && !hasPetNeedPreference(normalized, leaf)) {
      return {
        key: "pet_need",
        question: "Ne onemli olsun?",
        options: ["Haritalama", "Paspas", "Evcil hayvan", "Kendini bosaltan"],
        icon: "🤖",
      };
    }
    if (leaf === "supurge" && !hasVacuumTypePreference(normalized)) {
      return {
        key: "vacuum_type",
        question: "Supurge tipi nasil olsun?",
        options: ["Dikey", "Torbasiz", "Toz torbali", "Islak kuru"],
        icon: "🧹",
      };
    }
    if (!hasBrand) return makeBrandStep();
    if (!hasPricePreference) return makeBudgetStep();
    return null;
  }

  if (isBabyCategory(path, leaf)) {
    if (!hasAgeRangePreference(normalized)) {
      return {
        key: "age_range",
        question: babyQuestionFor(path, leaf),
        options: babyOptionsFor(path, leaf),
        icon: "🍼",
      };
    }
    if (needsBabyBrand(path, leaf) && !hasBrand) return makeBrandStep();
    if (!hasPricePreference) return makeBudgetStep();
    return null;
  }

  if (isPetCategory(path, leafRaw)) {
    if (!hasPetNeedPreference(normalized, leaf)) {
      return {
        key: "pet_need",
        question: petQuestionFor(path),
        options: petOptionsFor(path),
        icon: "🐾",
      };
    }
    if (!hasBrand) return makeBrandStep();
    if (!hasPricePreference) return makeBudgetStep();
    return null;
  }

  if (isSupermarketCoffeeCategory(path, leafRaw)) {
    if (!hasCoffeeTypePreference(normalized)) {
      return {
        key: "coffee_type",
        question: "Hangi kahve tipini istiyorsun?",
        options: ["Turk kahvesi", "Filtre", "Espresso", "Cekirdek"],
        icon: "☕",
      };
    }
    if (!hasBrand) return makeBrandStep();
    if (!hasPricePreference) return makeBudgetStep();
    return null;
  }

  if (isSportsCategory(path, leaf)) {
    const options = sportsOptionsFor(path, leaf);
    if (!hasOptionPreference(normalized, options)) {
      return makeUsageStep(sportsQuestionFor(path, leaf), options);
    }
    if (!hasBrand) return makeBrandStep();
    if (!hasPricePreference) return makeBudgetStep();
    return null;
  }

  if (isBookHobbyCategory(path)) {
    const options = ["Roman", "Cocuk", "Bilim", "Sanat"];
    if (!hasOptionPreference(normalized, options)) {
      return makeUsageStep("Ne tur ariyorsun?", options);
    }
    if (!hasPricePreference) return makeBudgetStep();
    return null;
  }

  if (isHomeLivingCategory(path)) {
    const options = homeLivingOptionsFor(path, leaf);
    if (!hasOptionPreference(normalized, options)) {
      return makeUsageStep(homeLivingQuestionFor(path, leaf), options);
    }
    if (!hasColorPreference(normalized)) {
      return {
        key: "color",
        question: "Renk veya stil tercihin var mi?",
        options: ["Beyaz", "Siyah", "Gri", "Ahsap"],
        icon: "🎨",
      };
    }
    if (!hasPricePreference) return makeBudgetStep();
    return null;
  }

  if (isAutomotiveCategory(path)) {
    const options = automotiveOptionsFor(path, leaf);
    if (!hasOptionPreference(normalized, options)) {
      return makeUsageStep(automotiveQuestionFor(path, leaf), options);
    }
    if (!hasBrand) return makeBrandStep();
    if (!hasPricePreference) return makeBudgetStep();
    return null;
  }

  if (isGeneralSupermarketCategory(path, leafRaw)) {
    const options = supermarketOptionsFor(path, leaf);
    if (!hasOptionPreference(normalized, options)) {
      return makeUsageStep(supermarketQuestionFor(path, leaf), options);
    }
    if (!hasBrand) return makeBrandStep();
    if (!hasPricePreference) return makeBudgetStep();
    return null;
  }

  if (isFashionCategory(path, leaf)) {
    if (isBagCategory(path, leaf)) {
      if (!hasBagTypePreference(normalized)) {
        return {
          key: "bag_type",
          question: "Canta tipi nasil olsun?",
          options: ["Sirt", "Omuz", "Capraz", "Laptop"],
          icon: "👜",
        };
      }
    } else if (needsShoeSize(path, leaf)) {
      if (!hasShoeSizePreference(normalized)) {
        return {
          key: "shoe_size",
          question: "Numara kac olsun?",
          options: ["37", "38", "39", "40"],
          icon: "👟",
        };
      }
    } else if (!hasClothingSizePreference(normalized)) {
      return {
        key: "size",
        question: "Beden ne olsun?",
        options: ["S", "M", "L", "XL"],
        icon: "📏",
      };
    }

    if (!hasColorPreference(normalized)) {
      return {
        key: "color",
        question: "Renk tercihin var mi?",
        options: ["Siyah", "Beyaz", "Mavi", "Bej"],
        icon: "🎨",
      };
    }

    if (!hasPricePreference) return makeBudgetStep();
    return null;
  }

  if (!hasBrand) return makeBrandStep();
  if (!hasPricePreference) return makeBudgetStep();
  return null;
}

function getLeafCategorySlug(categorySlug: string | null | undefined): string {
  if (!categorySlug) return "";
  const normalized = normalizeCategoryFlowText(categorySlug);
  const parts = normalized.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? normalized;
}

function canonicalizeCategoryLeaf(leaf: string): string {
  return CHAT_CATEGORY_LEAF_ALIASES[leaf] ?? leaf;
}

function makeBrandStep(): FlowStepDefinition {
  return {
    key: "brand",
    question: "Hangi marka olsun?",
    options: [],
    icon: "🏷️",
  };
}

function makeBudgetStep(): FlowStepDefinition {
  return {
    key: "budget",
    question: "Butce araligin ne olsun?",
    options: ["Uygun", "Orta", "Premium"],
    icon: "💰",
  };
}

function makeUsageStep(question: string, options: string[]): FlowStepDefinition {
  return {
    key: "usage",
    question,
    options,
    icon: "✨",
  };
}

function makeScreenSizeStep(question: string, options: string[]): FlowStepDefinition {
  return {
    key: "screen_size",
    question,
    options,
    icon: "📐",
  };
}

function hasStoragePreference(normalized: string): boolean {
  return /\b\d+\s?(gb|tb|mb)\b/i.test(normalized);
}

function hasScentPreference(normalized: string): boolean {
  return /\b(ciceksi|fresh|odunsu|vanilya|baharatli|meyveli|lavanta)\b/i.test(normalized);
}

function hasSkinTypePreference(normalized: string): boolean {
  return /\b(yagli|kuru|hassas|lekeli|karma)\b/i.test(normalized);
}

function hasCapacityPreference(normalized: string): boolean {
  return /\b(\d+\s?kg|\d+\s?kisilik|\d+\s?l|mini|orta boy|genis hacim|no frost|ankastre|cift hazneli|gardrop tipi)\b/i.test(
    normalized
  );
}

function hasBtuPreference(normalized: string): boolean {
  return /\b\d{4,5}\s?btu\b/i.test(normalized);
}

function hasClothingSizePreference(normalized: string): boolean {
  return /\b(xs|s|m|l|xl|xxl)\b/i.test(normalized);
}

function hasShoeSizePreference(normalized: string): boolean {
  return /\b(36|37|38|39|40|41|42|43|44|45)\b/i.test(normalized);
}

function hasColorPreference(normalized: string): boolean {
  return /\b(siyah|beyaz|mavi|bej|gri|yesil|kirmizi|pembe|mor|nude|krem|kahverengi|lacivert)\b/i.test(
    normalized
  );
}

function hasUsagePreference(normalized: string, leaf: string): boolean {
  if (leaf === "kulaklik") {
    return /\b(kulak ici|kulak ustu|kablosuz|oyuncu|tws|anc|spor)\b/i.test(normalized);
  }
  if (leaf === "bluetooth-hoparlor") {
    return /\b(tasinabilir|ev tipi|parti|su gecirmez|outdoor)\b/i.test(normalized);
  }
  if (leaf === "monitor") {
    return /\b(oyun|ofis|tasarim|gunluk)\b/i.test(normalized);
  }
  if (leaf === "tablet") {
    return /\b(not alma|cizim|oyun|gunluk|ders)\b/i.test(normalized);
  }
  if (leaf === "laptop") {
    return /\b(ofis|oyun|yazilim|gunluk|tasarim|ogrenci)\b/i.test(normalized);
  }
  if (leaf === "akilli-saat") {
    return /\b(spor|gunluk|pil omru|bildirim|saglik)\b/i.test(normalized);
  }
  return /\b(oyun|gunluk|ofis|tasarim|spor|muzik|film)\b/i.test(normalized);
}

function hasScreenSizePreference(normalized: string): boolean {
  return /\b(24|27|32|34|43|50|55|65|75|85)\s?(inc|inç)\b/i.test(normalized);
}

function hasPanelTypePreference(normalized: string): boolean {
  return /\b(led|qled|oled|mini led|ips|va|tn)\b/i.test(normalized);
}

function hasRefreshRatePreference(normalized: string): boolean {
  return /\b(60|75|100|120|144|165|240)\s?hz\b/i.test(normalized);
}

function hasCoffeeTypePreference(normalized: string): boolean {
  return /\b(espresso|filtre|kapsul|kapsullu|turk kahvesi|cekirdek)\b/i.test(normalized);
}

function hasVacuumTypePreference(normalized: string): boolean {
  return /\b(dikey|torbasiz|toz torbali|islak kuru)\b/i.test(normalized);
}

function hasPetNeedPreference(normalized: string, leaf: string): boolean {
  if (leaf === "robot-supurge") {
    return /\b(haritalama|paspas|evcil hayvan|kendini bosaltan)\b/i.test(normalized);
  }
  return /\b(yavru|yetiskin|kisir|tahilsiz|topaklanan|tozsuz|silika|bentonit)\b/i.test(normalized);
}

function hasAgeRangePreference(normalized: string): boolean {
  return /\b(0-6 ay|6-12 ay|1-3 yas|3-6 yas|7\+ yas|grup 0\+|grup 1-2-3|travel|kabin)\b/i.test(
    normalized
  );
}

function hasBagTypePreference(normalized: string): boolean {
  return /\b(sirt|omuz|capraz|laptop)\b/i.test(normalized);
}

function hasOptionPreference(normalized: string, options: string[]): boolean {
  return options.some((option) => {
    const normalizedOption = normalizeCategoryFlowText(option);
    return normalized.includes(normalizedOption);
  });
}

function isFashionCategory(path: string, leaf: string): boolean {
  return (
    path.startsWith("moda/") ||
    leaf.includes("giyim") ||
    leaf.includes("elbise") ||
    leaf.includes("ayakkabi") ||
    leaf.includes("sneaker") ||
    leaf.includes("bot") ||
    leaf.includes("babet") ||
    leaf.includes("terlik") ||
    leaf.includes("canta")
  );
}

function needsShoeSize(path: string, leaf: string): boolean {
  return (
    path.includes("/ayakkabi") ||
    leaf.includes("ayakkabi") ||
    leaf.includes("sneaker") ||
    leaf.includes("bot") ||
    leaf.includes("babet") ||
    leaf.includes("terlik")
  );
}

function isBagCategory(path: string, leaf: string): boolean {
  return path.includes("/canta") || leaf.includes("canta");
}

function isMakeupCategory(path: string, leaf: string): boolean {
  return (
    path.includes("dudak-makyaji") ||
    path.includes("yuz-makyaji") ||
    path.includes("goz-makyaji") ||
    leaf.includes("makyaj")
  );
}

function isBabyCategory(path: string, leaf: string): boolean {
  return (
    path.startsWith("anne-bebek/") ||
    path.includes("oyuncak") ||
    leaf.includes("bebek") ||
    leaf.includes("puset") ||
    leaf.includes("oyuncak")
  );
}

function babyQuestionFor(path: string, leaf: string): string {
  if (path.includes("bebek-arabasi") || leaf.includes("puset")) {
    return "Ne tip bir model istiyorsun?";
  }
  if (path.includes("oto-koltugu")) {
    return "Kullanim araligi nasil olsun?";
  }
  return "Yas araligi ne olsun?";
}

function babyOptionsFor(path: string, leaf: string): string[] {
  if (path.includes("bebek-arabasi") || leaf.includes("puset")) {
    return ["Travel sistem", "Kabin tipi", "Cift yonlu", "Hafif"];
  }
  if (path.includes("oto-koltugu")) {
    return ["Grup 0+", "1-3 yas", "Grup 1-2-3", "Yuksek tabanli"];
  }
  return ["0-6 ay", "6-12 ay", "1-3 yas", "3-6 yas"];
}

function needsBabyBrand(path: string, leaf: string): boolean {
  return path.includes("bebek-arabasi") || path.includes("oto-koltugu") || leaf.includes("bebek");
}

function isPetCategory(path: string, leaf: string): boolean {
  return path.startsWith("pet-shop/") || leaf === "kedi-mamasi" || leaf === "kopek-mamasi" || leaf === "kedi-kumu";
}

function petQuestionFor(path: string): string {
  if (path.includes("/kum")) {
    return "Kum tipi nasil olsun?";
  }
  return "Ne tip ihtiyacin var?";
}

function petOptionsFor(path: string): string[] {
  if (path.includes("/kum")) {
    return ["Topaklanan", "Tozsuz", "Silika", "Bentonit"];
  }
  return ["Yavru", "Yetiskin", "Kisir", "Tahilsiz"];
}

function isSupermarketCoffeeCategory(path: string, leaf: string): boolean {
  return path.includes("supermarket/kahve") || path.includes("supermarket/kahvalti-kahve") || leaf === "kahve";
}

function isSportsCategory(path: string, leaf: string): boolean {
  return path.startsWith(SPORTS_OUTDOOR_PREFIX) || ["bisiklet", "scooter", "kamp", "yoga-pilates"].includes(leaf);
}

function sportsQuestionFor(path: string, leaf: string): string {
  if (leaf === "bisiklet") return "Bisikleti daha cok ne icin istiyorsun?";
  if (leaf === "scooter") return "Scooter nasil kullanilacak?";
  if (path.includes("kamp")) return "Kamp urununde oncelik ne olsun?";
  return "Daha cok hangi kullanim icin bakiyorsun?";
}

function sportsOptionsFor(path: string, leaf: string): string[] {
  if (leaf === "bisiklet") return ["Sehir ici", "Dag", "Cocuk", "Elektrikli"];
  if (leaf === "scooter") return ["Elektrikli", "Sehir ici", "Cocuk", "Performans"];
  if (path.includes("kamp")) return ["Kamp", "Trekking", "Gunluk", "Plaj"];
  return ["Spor", "Gunluk", "Outdoor", "Performans"];
}

function isBookHobbyCategory(path: string): boolean {
  return path.startsWith(BOOK_HOBBY_PREFIX);
}

function isHomeLivingCategory(path: string): boolean {
  return path.startsWith(HOME_LIVING_PREFIX);
}

function homeLivingQuestionFor(path: string, leaf: string): string {
  if (leaf.includes("aydinlatma")) return "Aydinlatmayi daha cok nerede kullanacaksin?";
  if (path.includes("ev-tekstili")) return "Hangi alan icin bakiyorsun?";
  if (path.includes("mutfak")) return "Mutfakta ne tip urun bakiyorsun?";
  if (path.includes("mobilya")) return "Hangi alan icin bakiyorsun?";
  return "Bu urunu daha cok hangi alanda kullanacaksin?";
}

function homeLivingOptionsFor(path: string, leaf: string): string[] {
  if (leaf.includes("aydinlatma")) return ["Masa", "Salon", "Yatak odasi", "Dekoratif"];
  if (path.includes("ev-tekstili")) return ["Yatak odasi", "Banyo", "Salon", "Cocuk odasi"];
  if (path.includes("mutfak")) return ["Gunluk", "Sunum", "Saklama", "Pisirme"];
  if (path.includes("ofis")) return ["Calisma", "Depolama", "Ergonomi", "Dekoratif"];
  return ["Salon", "Yatak odasi", "Mutfak", "Ofis"];
}

function isAutomotiveCategory(path: string): boolean {
  return path.startsWith(AUTOMOTIVE_PREFIX);
}

function automotiveQuestionFor(path: string, leaf: string): string {
  if (leaf.includes("lastik")) return "Lastikte oncelik ne olsun?";
  if (leaf.includes("elektron")) return "Arac elektroniğinde ne ariyorsun?";
  if (leaf.includes("multimedya")) return "Multimedyada ne onemli olsun?";
  return "Otomotiv urununde oncelik ne olsun?";
}

function automotiveOptionsFor(path: string, leaf: string): string[] {
  if (leaf.includes("lastik")) return ["Yaz", "Kis", "Dort mevsim", "Jant"];
  if (leaf.includes("elektron")) return ["Telefon tutucu", "Kamera", "Sarj", "Guvenlik"];
  if (leaf.includes("multimedya")) return ["Ekran", "Ses", "Navigasyon", "Geri gorus"];
  if (path.includes("motor-yagi")) return ["5W30", "5W40", "10W40", "Bakim"];
  return ["Aksesuar", "Bakim", "Elektronik", "Performans"];
}

function isGeneralSupermarketCategory(path: string, leaf: string): boolean {
  return path.startsWith(SUPERMARKET_PREFIX) && !isSupermarketCoffeeCategory(path, leaf);
}

function supermarketQuestionFor(path: string, leaf: string): string {
  if (leaf.includes("icecek")) return "Icecekte ne tercih edersin?";
  if (leaf.includes("atistirmalik")) return "Atistirmalikta ne olsun?";
  if (leaf.includes("bakliyat")) return "Bakliyatta hangi tip urun ariyorsun?";
  return "Ne tip urun ariyorsun?";
}

function supermarketOptionsFor(path: string, leaf: string): string[] {
  if (leaf.includes("icecek")) return ["Sekersiz", "Gazli", "Kahve", "Enerji"];
  if (leaf.includes("atistirmalik")) return ["Cikolata", "Kraker", "Sekersiz", "Protein"];
  if (leaf.includes("bakliyat")) return ["Pirinç", "Makarna", "Bakliyat", "Glutensiz"];
  return ["Gunluk", "Ekonomik", "Sekersiz", "Premium"];
}
