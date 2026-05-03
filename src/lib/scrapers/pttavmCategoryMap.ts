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
  "oyuncu kulakliklari": "elektronik/tv-ses-goruntu/kulaklik",
  hoparlor: "elektronik/tv-ses-goruntu/bluetooth-hoparlor",
  "bluetooth hoparlor": "elektronik/tv-ses-goruntu/bluetooth-hoparlor",
  "bluetooth hoparlorler": "elektronik/tv-ses-goruntu/bluetooth-hoparlor",
  soundbar: "elektronik/tv-ses-goruntu/soundbar",
  "oyun konsollari aksesuarlar": "elektronik/oyun/konsol",
  laptop: "elektronik/bilgisayar-tablet/laptop",
  notebook: "elektronik/bilgisayar-tablet/laptop",
  "dizustu bilgisayar": "elektronik/bilgisayar-tablet/laptop",
  "masaustu bilgisayar": "elektronik/bilgisayar-tablet/masaustu-bilgisayar",
  "notebook bataryalari": "elektronik/bilgisayar-tablet/bilesenler",
  "laptop bataryalari": "elektronik/bilgisayar-tablet/bilesenler",
  klavye: "elektronik/bilgisayar-tablet/klavye-mouse",
  "ekran kartlari gpu": "elektronik/bilgisayar-tablet/bilesenler",
  ssd: "elektronik/bilgisayar-tablet/bilesenler",
  "ssd solid state drive": "elektronik/bilgisayar-tablet/bilesenler",
  "sabit disk hdd": "elektronik/bilgisayar-tablet/bilesenler",
  ram: "elektronik/bilgisayar-tablet/bilesenler",
  "bellek ram": "elektronik/bilgisayar-tablet/bilesenler",
  islemci: "elektronik/bilgisayar-tablet/bilesenler",
  anakart: "elektronik/bilgisayar-tablet/bilesenler",
  "ag modem": "elektronik/ag-guvenlik/modem",
  modem: "elektronik/ag-guvenlik/modem",
  router: "elektronik/ag-guvenlik/modem",
  ag: "elektronik/ag-guvenlik/modem",
  "access point": "elektronik/ag-guvenlik/modem",
  "mesh wi fi": "elektronik/ag-guvenlik/modem",
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
  "filtre cekirdek kahveler": "supermarket/kahve",
  blender: "kucuk-ev-aletleri/mutfak/blender",
  blenderler: "kucuk-ev-aletleri/mutfak/blender",
  mikser: "kucuk-ev-aletleri/mutfak/mikser",
  "tost makinesi": "kucuk-ev-aletleri/mutfak/tost-makinesi",
  "air fryer": "kucuk-ev-aletleri/mutfak/airfryer",
  fritoz: "kucuk-ev-aletleri/mutfak/airfryer",
  buzdolabi: "beyaz-esya/buzdolabi",
  "camasir makinesi": "beyaz-esya/camasir-makinesi",
  "bulasik makinesi": "beyaz-esya/bulasik-makinesi",
  klima: "beyaz-esya/klima",
  "derin dondurucu": "beyaz-esya/buzdolabi",
  firinlar: "beyaz-esya/firin-ocak",
  "firin beyaz esya temizleme": "beyaz-esya/firin-ocak",
  sampuan: "kozmetik/sac-bakim/sampuan",
  parfum: "kozmetik/parfum",
  deodorant: "kozmetik/parfum/deodorant",
  "jel ve sabunlar": "kozmetik/kisisel-bakim/hijyen/dus-banyo/sabun",
  "agiz ve dis bakimi": "kozmetik/kisisel-bakim/agiz-dis",
  "agiz dis bakimi": "kozmetik/kisisel-bakim/agiz-dis",
  "sac bakim urunleri": "kozmetik/sac-bakim",
  "sac sekillendirici urunleri": "kozmetik/sac-bakim/sac-sekillendirici",
  "sac sekillendirici urun": "kozmetik/sac-bakim/sac-sekillendirici",
  "gunes urunleri": "kozmetik/cilt-bakim/gunes-koruyucu",
  "cilt bakim urunleri": "kozmetik/cilt-bakim",
  "kisisel bakim": "kozmetik/kisisel-bakim/hijyen",
  "kisisel bakim urunleri": "kozmetik/kisisel-bakim/hijyen",
  "dus ve banyo urunleri": "kozmetik/kisisel-bakim/hijyen/dus-banyo",
  "vucut bakim urunleri": "kozmetik/cilt-bakim/vucut-bakimi",
  "masaj yaglari": "kozmetik/kisisel-bakim/hijyen/dus-banyo/masaj-yaglari",
  "bitkisel sabit yaglar": "kozmetik/kisisel-bakim/hijyen/dus-banyo/masaj-yaglari",
  "ucucu yaglar": "kozmetik/kisisel-bakim/hijyen/dus-banyo/masaj-yaglari",
  "erkek sneaker spor ayakkabi": "moda/erkek-ayakkabi/sneaker",
  "kadin sneaker spor ayakkabi": "moda/kadin-ayakkabi/sneaker",
  "spor ayakkabi": "moda/erkek-ayakkabi/sneaker",
  elbise: "moda/kadin-giyim/elbise",
  bluz: "moda/kadin-giyim/ust",
  gomlek: "moda/erkek-giyim/gomlek",
  tisort: "moda/erkek-giyim/tisort",
  polo: "moda/erkek-giyim/tisort",
  esofman: "moda/erkek-giyim/esofman",
  "sirt cantasi": "moda/aksesuar/canta-cuzdan",
  "el cantasi": "moda/aksesuar/canta-cuzdan",
  "takim cantalari": "moda/aksesuar/canta-cuzdan",
  gumus: "moda/aksesuar/saat-taki",
  ampuller: "ev-yasam/aydinlatma",
  "kulot bez": "anne-bebek/bebek-bakim/bebek-bezi",
  kordonlar: "elektronik/giyilebilir/akilli-saat",
  "kilif ve kapaklar": "elektronik/telefon/kilif",
  "el fenerleri": "spor-outdoor/outdoor/kamp-kampcilik-malzemeleri/el-fenerleri",
  "uyku tulumu": "spor-outdoor/outdoor/kamp-kampcilik-malzemeleri/uyku-tulumu",
};

const PTTAVM_ROOT_CATEGORY_MAP: Record<string, { slug: string; name: string }> = {
  elektronik: { slug: "elektronik", name: "Elektronik" },
  "tuketici elektronigi": { slug: "elektronik", name: "Elektronik" },
  moda: { slug: "moda", name: "Moda" },
  "giyim ayakkabi": { slug: "moda", name: "Moda" },
  "kozmetik kisisel bakim": { slug: "kozmetik", name: "Kozmetik" },
  kozmetik: { slug: "kozmetik", name: "Kozmetik" },
  "kisisel bakim": { slug: "kozmetik/kisisel-bakim", name: "Kisisel Bakim" },
  supermarket: { slug: "supermarket", name: "Supermarket" },
  "supermarket pet shop": { slug: "supermarket", name: "Supermarket" },
  "pet shop": { slug: "pet-shop", name: "Pet Shop" },
  "ev yasam kirtasiye ofis": { slug: "ev-yasam", name: "Ev Yasam" },
  "oto bahce yapi market": { slug: "oto-bahce-yapi-market", name: "Oto Bahce Yapi Market" },
  "spor outdoor": { slug: "spor-outdoor", name: "Spor Outdoor" },
  "anne bebek oyuncak": { slug: "anne-bebek", name: "Anne Bebek" },
  "kitap muzik film hobi": { slug: "hobi-eglence", name: "Hobi Eglence" },
  "saglik vitamin": { slug: "saglik-vitamin", name: "Saglik Vitamin" },
};

const PTTAVM_AUTO_SEGMENT_SLUG_OVERRIDES: Record<string, string> = {
  "kisisel bakim": "kisisel-bakim",
  "kisisel bakim urunleri": "hijyen",
  "hijyenik urunler": "hijyen",
  "dus ve banyo urunleri": "dus-banyo",
  "dus ve banyo": "dus-banyo",
  urunleri: "",
  "masaj yaglari": "masaj-yaglari",
  "bitkisel sabit yaglar": "masaj-yaglari",
  "ucucu yaglar": "masaj-yaglari",
  "cep telefonu": "akilli-telefon",
  "akilli telefon": "akilli-telefon",
  "erkek sneaker spor ayakkabi": "sneaker",
  "kadin sneaker spor ayakkabi": "sneaker",
  "cantalar ve kiliflar": "aksesuar",
  "sarj aletleri": "sarj-kablo",
  "power banklar": "powerbank",
  "ag modem": "modem",
  "air fryer": "airfryer",
};

export interface PttavmCategoryChainNode {
  slug: string;
  name: string;
}

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

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function collectBreadcrumbSegments(node: unknown, results: string[][]): void {
  if (!node) return;

  if (Array.isArray(node)) {
    for (const item of node) collectBreadcrumbSegments(item, results);
    return;
  }

  if (typeof node !== "object") return;

  const record = node as Record<string, unknown>;
  const type = record["@type"];

  if (type === "BreadcrumbList" && Array.isArray(record.itemListElement)) {
    const segments = record.itemListElement
      .map((item) => {
        if (!item || typeof item !== "object") return null;

        const entry = item as Record<string, unknown>;
        const directName =
          typeof entry.name === "string" ? decodeHtmlEntities(entry.name) : null;
        const nested =
          entry.item && typeof entry.item === "object"
            ? (entry.item as Record<string, unknown>)
            : null;
        const nestedName =
          nested && typeof nested.name === "string"
            ? decodeHtmlEntities(nested.name)
            : null;

        return directName ?? nestedName;
      })
      .filter((segment): segment is string => Boolean(segment));

    if (segments.length > 0) results.push(segments);
  }

  for (const value of Object.values(record)) {
    collectBreadcrumbSegments(value, results);
  }
}

export function extractPttavmBreadcrumbSegmentsFromHtml(html: string): string[] {
  const results: string[][] = [];

  for (const match of html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    const raw = match[1]?.trim();
    if (!raw) continue;

    try {
      const parsed: unknown = JSON.parse(raw);
      collectBreadcrumbSegments(parsed, results);
    } catch {
      continue;
    }
  }

  return results[0] ?? [];
}

export function slugifyPttavmCategorySegment(value: string): string {
  return normalizePttavmCategoryLabel(value)
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function splitPttavmCategoryPath(rawPath?: string | null): string[] {
  if (!rawPath) return [];

  return dedupePreserveOrder(
    rawPath
      .split(/\s*(?:\/|>|\u203a|\u00bb|\|)\s*/g)
      .map((segment) => segment.trim())
      .filter(Boolean),
  );
}

function cleanPttavmCategorySegments(
  rawPath: string,
  productTitle?: string | null,
): string[] {
  const cleaned = splitPttavmCategoryPath(rawPath);
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

  return stripProductTitleTail(filtered, normalizedTitle);
}

function stripProductTitleTail(
  segments: string[],
  normalizedTitle: string,
): string[] {
  if (!normalizedTitle || segments.length === 0) return segments;

  const maxTailLength = Math.min(4, segments.length);

  for (let tailLength = maxTailLength; tailLength >= 1; tailLength -= 1) {
    const tailSegments = segments.slice(-tailLength);
    const normalizedTailSegments = tailSegments.map((segment) =>
      normalizePttavmCategoryLabel(segment),
    );
    const tail = normalizedTailSegments
      .join(" ")
      .trim();

    if (tail.length < 4) continue;

    const tailMatchesTitle =
      normalizedTitle.includes(tail) || tail.includes(normalizedTitle);
    const hasProductLikeSegment =
      tail.length >= 35 &&
      normalizedTailSegments.some((segment) => looksLikePttavmProductSegment(segment));
    const hasSplitProductTail =
      tailLength === 2 &&
      looksLikePttavmProductSegment(normalizedTailSegments[0] ?? "") &&
      (normalizedTailSegments[1]?.length ?? 0) <= 25 &&
      /\d/.test(normalizedTailSegments[1] ?? "");
    const productLikeFallback =
      (tailLength === 1 && hasProductLikeSegment) || hasSplitProductTail;

    if (!tailMatchesTitle && !productLikeFallback) continue;

    const titleRatio = tail.length / Math.max(normalizedTitle.length, 1);
    const looksLikeProductTail =
      tail.length >= 40 && (/\d/.test(tail) || tail.split(" ").length >= 5);

    if (tailLength > 1 || titleRatio > 0.45 || looksLikeProductTail) {
      return segments.slice(0, -tailLength);
    }

    if (productLikeFallback) {
      return segments.slice(0, -tailLength);
    }
  }

  return segments;
}

function looksLikePttavmProductSegment(normalizedSegment: string): boolean {
  if (normalizedSegment.length < 30) return false;

  const tokenCount = normalizedSegment.split(" ").filter(Boolean).length;
  const hasDigit = /\d/.test(normalizedSegment);
  const hasKnownProductBrand =
    /\b(apple|asus|bosch|canon|dyson|gopro|harman|iphone|kingston|lenovo|microsoft|nikon|nintendo|philips|samsung|sony|xbox)\b/.test(
      normalizedSegment,
    );

  return (
    (normalizedSegment.length >= 40 && tokenCount >= 5) ||
    (hasDigit && tokenCount >= 4) ||
    (hasKnownProductBrand && tokenCount >= 4)
  );
}

export function buildPttavmCategoryPath(
  segments: string[],
  productTitle?: string | null,
): { sourceCategory: string | null; sourceCategoryPath: string | null } {
  const filtered = cleanPttavmCategorySegments(segments.join(" / "), productTitle);

  if (filtered.length === 0) {
    return { sourceCategory: null, sourceCategoryPath: null };
  }

  return {
    sourceCategory: filtered[filtered.length - 1] ?? null,
    sourceCategoryPath: filtered.join(" / "),
  };
}

export function buildPttavmAutoCategoryChain(
  rawPath?: string | null,
  productTitle?: string | null,
): PttavmCategoryChainNode[] {
  const segments = cleanPttavmCategorySegments(rawPath ?? "", productTitle);
  if (segments.length === 0) return [];

  const firstSegment = segments[0] ?? "";
  const firstNormalized = normalizePttavmCategoryLabel(firstSegment);
  const root =
    PTTAVM_ROOT_CATEGORY_MAP[firstNormalized] ?? {
      slug: slugifyPttavmCategorySegment(firstSegment),
      name: firstSegment.trim(),
    };

  if (!root.slug || !root.name) return [];

  const chain: PttavmCategoryChainNode[] = [{ ...root }];
  let currentSlug = root.slug;
  const rootParts = root.slug.split("/");

  for (let index = 1; index < segments.length; index += 1) {
    const segment = segments[index];
    const normalized = normalizePttavmCategoryLabel(segment);
    const part =
      PTTAVM_AUTO_SEGMENT_SLUG_OVERRIDES[normalized] ??
      slugifyPttavmCategorySegment(segment);

    if (!part) continue;
    if (rootParts.includes(part) || currentSlug.endsWith(`/${part}`)) continue;

    currentSlug = `${currentSlug}/${part}`;
    chain.push({
      slug: currentSlug,
      name: segment.trim(),
    });
  }

  return chain;
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
