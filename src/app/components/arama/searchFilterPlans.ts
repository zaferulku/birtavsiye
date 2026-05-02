import type { SearchSidebarSection } from "./SearchFiltersSidebar";

export type RelatedSuggestion = {
  label: string;
  hint: string;
  query: string;
};

type SearchFilterProfile = "phone" | "tablet" | "laptop" | "default";
type SearchSectionKey = "storage" | "related" | "active-filters" | "brands";

type RelatedSuggestionTemplate = {
  label: string;
  hint: string;
  suffix: string;
};

const relatedQuerySuffixes = [
  "kilif",
  "sarj aleti",
  "kulaklik",
  "powerbank",
  "ekran koruyucu",
  "kalem",
  "klavye",
  "mouse",
  "canta",
  "sogutucu",
  "usb c hub",
  "aksesuar",
  "benzer urunler",
  "en uygun",
];

const searchProfileSignals: Record<SearchFilterProfile, string[]> = {
  phone: [
    "iphone",
    "telefon",
    "galaxy",
    "redmi",
    "xiaomi",
    "samsung",
    "oppo",
    "vivo",
    "honor",
    "akilli telefon",
  ],
  tablet: ["tablet", "ipad", "galaxy tab"],
  laptop: ["laptop", "notebook", "macbook", "dizustu", "oyuncu laptopu"],
  default: [],
};

const relatedSuggestionTemplates: Record<SearchFilterProfile, RelatedSuggestionTemplate[]> = {
  phone: [
    { label: "Kilif", hint: "Koruyucu aksesuar", suffix: "kilif" },
    { label: "Sarj Aleti", hint: "Hizli sarj", suffix: "sarj aleti" },
    { label: "Kulaklik", hint: "Kablosuz modeller", suffix: "kulaklik" },
    { label: "Powerbank", hint: "Tasinabilir enerji", suffix: "powerbank" },
    { label: "Ekran Koruyucu", hint: "Cam ve film", suffix: "ekran koruyucu" },
  ],
  tablet: [
    { label: "Kilif", hint: "Standli kapaklar", suffix: "kilif" },
    { label: "Kalem", hint: "Not alma ve cizim", suffix: "kalem" },
    { label: "Klavye", hint: "Tasinabilir kullanim", suffix: "klavye" },
    { label: "Sarj Aleti", hint: "Hizli sarj", suffix: "sarj aleti" },
  ],
  laptop: [
    { label: "Mouse", hint: "Kablosuz modeller", suffix: "mouse" },
    { label: "Canta", hint: "Tasima cozumleri", suffix: "canta" },
    { label: "Sogutucu", hint: "Performans destegi", suffix: "sogutucu" },
    { label: "USB-C Hub", hint: "Baglanti genisletme", suffix: "usb c hub" },
  ],
  default: [
    { label: "Benzer Urunler", hint: "Alternatif aramalar", suffix: "benzer urunler" },
    { label: "Aksesuarlar", hint: "Tamamlayici urunler", suffix: "aksesuar" },
    { label: "En Uygunlar", hint: "Daha avantajli sonuclar", suffix: "en uygun" },
  ],
};

const filterSectionPlans: Record<SearchFilterProfile, SearchSectionKey[]> = {
  phone: ["storage", "related", "active-filters", "brands"],
  tablet: ["storage", "related", "active-filters", "brands"],
  laptop: ["related", "active-filters", "brands", "storage"],
  default: ["related", "active-filters", "storage", "brands"],
};

export function normalizeSearchText(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/Ä±/g, "i")
    .replace(/Ã§/g, "c")
    .replace(/ÄŸ/g, "g")
    .replace(/Ã¶/g, "o")
    .replace(/ÅŸ/g, "s")
    .replace(/Ã¼/g, "u")
    .replace(/\s+/g, " ")
    .trim();
}

export function getAccessoryBaseQuery(query: string): string {
  const normalized = normalizeSearchText(query);

  for (const suffix of relatedQuerySuffixes) {
    const token = ` ${suffix}`;
    if (normalized.endsWith(token)) {
      return normalized.slice(0, -token.length).trim();
    }
  }

  return normalized;
}

export function getSuggestionSuffix(baseQuery: string, suggestionQuery: string): string {
  const normalizedBase = normalizeSearchText(baseQuery);
  const normalizedSuggestion = normalizeSearchText(suggestionQuery);

  if (!normalizedBase) return normalizedSuggestion;
  if (!normalizedSuggestion.startsWith(normalizedBase)) return normalizedSuggestion;

  return normalizedSuggestion.slice(normalizedBase.length).trim();
}

export function detectSearchFilterProfile(query: string): SearchFilterProfile {
  const normalized = getAccessoryBaseQuery(query);

  for (const [profile, signals] of Object.entries(searchProfileSignals) as [
    SearchFilterProfile,
    string[],
  ][]) {
    if (signals.some((signal) => normalized.includes(signal))) {
      return profile;
    }
  }

  return "default";
}

export function getRelatedSuggestions(query: string): RelatedSuggestion[] {
  const baseQuery = getAccessoryBaseQuery(query);
  if (!baseQuery) return [];

  const profile = detectSearchFilterProfile(query);

  return relatedSuggestionTemplates[profile].map((template) => ({
    label: template.label,
    hint: template.hint,
    query: `${baseQuery} ${template.suffix}`.trim(),
  }));
}

export function orderSearchFilterSections(
  query: string,
  sectionsByKey: Partial<Record<SearchSectionKey, SearchSidebarSection>>
): SearchSidebarSection[] {
  const profile = detectSearchFilterProfile(query);
  const orderedKeys = filterSectionPlans[profile];

  return orderedKeys
    .map((key) => sectionsByKey[key])
    .filter((section): section is SearchSidebarSection => Boolean(section));
}
