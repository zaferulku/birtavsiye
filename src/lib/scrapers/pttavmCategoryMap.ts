const PTTAVM_SEGMENT_CATEGORY_MAP: Record<string, string> = {
  "cep telefonu": "elektronik/telefon/akilli-telefon",
  telefon: "elektronik/telefon/akilli-telefon",
  "android telefonlar": "elektronik/telefon/akilli-telefon",
  "iphone ios telefonlar": "elektronik/telefon/akilli-telefon",
  kiliflar: "elektronik/telefon/kilif",
  "cantalar ve kiliflar": "elektronik/telefon/aksesuar",
  "ekran koruyucular": "elektronik/telefon/ekran-koruyucu",
  ekran: "elektronik/telefon/ekran-koruyucu",
  "sarj aletleri": "elektronik/telefon/sarj-kablo",
  powerbank: "elektronik/telefon/powerbank",
  "power banklar": "elektronik/telefon/powerbank",
  "akilli saatler": "elektronik/giyilebilir/akilli-saat",
  "akilli saat": "elektronik/giyilebilir/akilli-saat",
  "akilli bileklik": "elektronik/giyilebilir/akilli-saat",
  kulaklik: "elektronik/tv-ses-goruntu/kulaklik",
  kulakliklar: "elektronik/tv-ses-goruntu/kulaklik",
  hoparlor: "elektronik/tv-ses-goruntu/bluetooth-hoparlor",
  "bluetooth hoparlor": "elektronik/tv-ses-goruntu/bluetooth-hoparlor",
  soundbar: "elektronik/tv-ses-goruntu/soundbar",
  laptop: "elektronik/bilgisayar-tablet/laptop",
  notebook: "elektronik/bilgisayar-tablet/laptop",
  "dizustu bilgisayar": "elektronik/bilgisayar-tablet/laptop",
  "masaustu bilgisayar": "elektronik/bilgisayar-tablet/masaustu-bilgisayar",
  "notebook bataryalari": "elektronik/bilgisayar-tablet/bilesenler",
  "laptop bataryalari": "elektronik/bilgisayar-tablet/bilesenler",
  "ekran kartlari gpu": "elektronik/bilgisayar-tablet/bilesenler",
  ssd: "elektronik/bilgisayar-tablet/bilesenler",
  ram: "elektronik/bilgisayar-tablet/bilesenler",
  islemci: "elektronik/bilgisayar-tablet/bilesenler",
  anakart: "elektronik/bilgisayar-tablet/bilesenler",
  "ag modem": "elektronik/ag-guvenlik/modem-ag",
  modem: "elektronik/ag-guvenlik/modem-ag",
  router: "elektronik/ag-guvenlik/modem-ag",
  ag: "elektronik/ag-guvenlik/modem-ag",
  "access point": "elektronik/ag-guvenlik/modem-ag",
  "mesh wi fi": "elektronik/ag-guvenlik/modem-ag",
  televizyon: "elektronik/tv-ses-goruntu/televizyon",
  "smart tv": "elektronik/tv-ses-goruntu/televizyon",
  "oled tv": "elektronik/tv-ses-goruntu/televizyon",
  "kamera aksesuarlari": "elektronik/kamera/fotograf-makinesi",
  "fotograf makinesi": "elektronik/kamera/fotograf-makinesi",
  kamera: "elektronik/kamera/fotograf-makinesi",
  dron: "elektronik/kamera/drone",
  supurge: "kucuk-ev-aletleri/temizlik/supurge",
  "robot supurge": "kucuk-ev-aletleri/temizlik/robot-supurge",
  "kahve makinesi": "kucuk-ev-aletleri/mutfak/kahve-makinesi",
  blender: "kucuk-ev-aletleri/mutfak/blender",
  mikser: "kucuk-ev-aletleri/mutfak/mikser-cirpici",
  "tost makinesi": "kucuk-ev-aletleri/mutfak/tost-makinesi",
  "air fryer": "kucuk-ev-aletleri/mutfak/fritoz-airfryer",
  fritoz: "kucuk-ev-aletleri/mutfak/fritoz-airfryer",
  buzdolabi: "beyaz-esya/buzdolabi",
  "camasir makinesi": "beyaz-esya/camasir-makinesi",
  "bulasik makinesi": "beyaz-esya/bulasik-makinesi",
  klima: "beyaz-esya/klima",
  "derin dondurucu": "beyaz-esya/buzdolabi",
  firinlar: "beyaz-esya/firin-ocak",
  "firin beyaz esya temizleme": "beyaz-esya/firin-ocak",
  sampuan: "kozmetik-bakim/sampuan",
  parfum: "kozmetik-bakim/parfum",
  deodorant: "kozmetik-bakim/deodorant",
  "jel ve sabunlar": "kozmetik-bakim/kisisel-hijyen",
  "agiz ve dis bakimi": "kozmetik-bakim/agiz-dis-bakim",
  "agiz dis bakimi": "kozmetik-bakim/agiz-dis-bakim",
  "sac bakim urunleri": "kozmetik-bakim/sac-bakim",
  "sac sekillendirici urunleri": "kozmetik-bakim/sac-sekillendirme",
  "sac sekillendirici urun": "kozmetik-bakim/sac-sekillendirme",
  "gunes urunleri": "kozmetik-bakim/gunes-koruyucu",
  "cilt bakim urunleri": "kozmetik-bakim/yuz-nemlendirici",
  "kisisel bakim": "kozmetik-bakim/kisisel-hijyen",
  "kisisel bakim urunleri": "kozmetik-bakim/kisisel-hijyen",
  "dus ve banyo urunleri": "kozmetik-bakim/kisisel-hijyen",
  "vucut bakim urunleri": "kozmetik-bakim/vucut-bakim",
  "masaj yaglari": "kozmetik-bakim/vucut-bakim",
  "bitkisel sabit yaglar": "kozmetik-bakim/vucut-bakim",
  "ucucu yaglar": "kozmetik-bakim/vucut-bakim",
  "erkek sneaker spor ayakkabi": "moda/erkek-ayakkabi-sneaker",
  "kadin sneaker spor ayakkabi": "moda/kadin-ayakkabi-sneaker",
  "spor ayakkabi": "moda/erkek-ayakkabi-sneaker",
  elbise: "moda/kadin-elbise",
  bluz: "moda/kadin-giyim-ust",
  gomlek: "moda/erkek-giyim-ust",
  tisort: "moda/erkek-giyim-ust",
  polo: "moda/erkek-giyim-ust",
  esofman: "moda/esofman-spor-giyim",
  "sirt cantasi": "moda/canta-cuzdan",
  "el cantasi": "moda/canta-cuzdan",
  "takim cantalari": "moda/canta-cuzdan",
};

export function normalizePttavmCategoryLabel(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\u0131/g, "i")
    .replace(/&/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupePreserveOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = normalizePttavmCategoryLabel(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(value.trim());
  }

  return result;
}

export function splitPttavmCategoryPath(rawPath?: string | null): string[] {
  if (!rawPath) return [];

  return dedupePreserveOrder(
    rawPath
      .split(/\s*(?:\/|>|›|»|\|)\s*/g)
      .map((segment) => segment.trim())
      .filter(Boolean),
  );
}

export function buildPttavmCategoryPath(
  segments: string[],
  productTitle?: string | null,
): { sourceCategory: string | null; sourceCategoryPath: string | null } {
  const cleaned = splitPttavmCategoryPath(segments.join(" / "));
  const normalizedTitle = productTitle
    ? normalizePttavmCategoryLabel(productTitle)
    : "";

  const filtered = cleaned.filter((segment, index) => {
    const normalized = normalizePttavmCategoryLabel(segment);
    if (!normalized) return false;
    if (normalized === "anasayfa") return false;
    if (
      normalizedTitle &&
      index === cleaned.length - 1 &&
      normalized === normalizedTitle
    ) {
      return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    return { sourceCategory: null, sourceCategoryPath: null };
  }

  return {
    sourceCategory: filtered[filtered.length - 1] ?? null,
    sourceCategoryPath: filtered.join(" / "),
  };
}

export function resolvePttavmSourceCategory(rawPath?: string | null, rawLeaf?: string | null): {
  canonicalSlug: string;
  matchedSegment: string;
} | null {
  const segments = splitPttavmCategoryPath(rawPath);
  const candidates = [...segments].reverse();
  if (rawLeaf) candidates.unshift(rawLeaf);

  for (const candidate of candidates) {
    const mapped = PTTAVM_SEGMENT_CATEGORY_MAP[normalizePttavmCategoryLabel(candidate)];
    if (!mapped) continue;
    return {
      canonicalSlug: mapped,
      matchedSegment: candidate.trim(),
    };
  }

  return null;
}
