"use client";

import { Suspense, useEffect, useEffectEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import SearchFiltersSidebar, {
  type SearchSidebarSection,
} from "../components/arama/SearchFiltersSidebar";
import { orderSearchFilterSections } from "../components/arama/searchFilterPlans";
import Footer from "../components/layout/Footer";
import Header from "../components/layout/Header";
import StoreLogo from "../components/ui/StoreLogo";
import {
  formatFreshnessLabel,
  getActiveListings,
  getActiveOfferCount,
  getFreshestSeenAt,
  getLowestActivePrice,
} from "../../lib/listingSignals";
import { getDiscoveryProductLabel } from "../../lib/productDiscovery";
import { cleanProductTitle } from "../../lib/productTitle";

type Product = {
  id: string;
  title: string;
  slug: string;
  brand: string | null;
  description?: string;
  image_url?: string;
  category_id?: string;
  model_code?: string | null;
  model_family?: string | null;
  variant_storage?: string | null;
  variant_color?: string | null;
  created_at?: string | null;
  prices?: {
    id: string;
    price: number;
    source: string | null;
    last_seen: string | null;
    is_active?: boolean | null;
    in_stock?: boolean | null;
  }[];
};

type RelatedSuggestion = {
  label: string;
  hint: string;
  query: string;
};

const popularSearches = [
  "iPhone 16",
  "Samsung Galaxy",
  "MacBook",
  "AirPods",
  "PlayStation 5",
  "Xbox",
  "iPad",
  "Dyson",
];

const sourceDisplayLabels: Record<string, string> = {
  amazon: "Amazon",
  hepsiburada: "Hepsiburada",
  idefix: "idefix",
  mediamarkt: "MediaMarkt",
  n11: "n11",
  pasaj: "Turkcell Pasaj",
  pttavm: "PttAVM",
  trendyol: "Trendyol",
  vatan: "Vatan Bilgisayar",
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

function getSourceDisplayName(source: string | null): string {
  if (!source) return "Magaza";

  return (
    sourceDisplayLabels[source] ??
    source
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (character) => character.toUpperCase())
  );
}

function getOfferHighlights(prices: Product["prices"]) {
  const listings = getActiveListings(prices).sort((left, right) => left.price - right.price);
  const lowestBySource = new Map<string, (typeof listings)[number]>();

  listings.forEach((listing, index) => {
    const sourceKey = listing.source ?? `unknown-${index}`;
    if (!lowestBySource.has(sourceKey)) lowestBySource.set(sourceKey, listing);
  });

  return Array.from(lowestBySource.values())
    .slice(0, 3)
    .map((listing, index) => ({
      ...listing,
      badge: index === 0 ? "En dusuk" : `${index + 1}. teklif`,
    }));
}

function normalizeSearchText(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/\s+/g, " ")
    .trim();
}

function getAccessoryBaseQuery(query: string): string {
  const normalized = normalizeSearchText(query);

  for (const suffix of relatedQuerySuffixes) {
    const token = ` ${suffix}`;
    if (normalized.endsWith(token)) {
      return normalized.slice(0, -token.length).trim();
    }
  }

  return normalized;
}

function getSuggestionSuffix(baseQuery: string, suggestionQuery: string): string {
  const normalizedBase = normalizeSearchText(baseQuery);
  const normalizedSuggestion = normalizeSearchText(suggestionQuery);

  if (!normalizedBase) return normalizedSuggestion;
  if (!normalizedSuggestion.startsWith(normalizedBase)) return normalizedSuggestion;

  return normalizedSuggestion.slice(normalizedBase.length).trim();
}

function getRelatedSuggestions(query: string): RelatedSuggestion[] {
  const baseQuery = getAccessoryBaseQuery(query);
  if (!baseQuery) return [];

  const phoneSignals = [
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
  ];
  const laptopSignals = ["laptop", "notebook", "macbook", "dizustu", "oyuncu laptopu"];
  const tabletSignals = ["tablet", "ipad", "galaxy tab"];

  if (phoneSignals.some((signal) => baseQuery.includes(signal))) {
    return [
      { label: "Kilif", hint: "Koruyucu aksesuar", query: `${baseQuery} kilif` },
      { label: "Sarj Aleti", hint: "Hizli sarj", query: `${baseQuery} sarj aleti` },
      { label: "Kulaklik", hint: "Kablosuz modeller", query: `${baseQuery} kulaklik` },
      { label: "Powerbank", hint: "Tasinabilir enerji", query: `${baseQuery} powerbank` },
      { label: "Ekran Koruyucu", hint: "Cam ve film", query: `${baseQuery} ekran koruyucu` },
    ];
  }

  if (tabletSignals.some((signal) => baseQuery.includes(signal))) {
    return [
      { label: "Kilif", hint: "Standli kapaklar", query: `${baseQuery} kilif` },
      { label: "Kalem", hint: "Not alma ve cizim", query: `${baseQuery} kalem` },
      { label: "Klavye", hint: "Tasinabilir kullanim", query: `${baseQuery} klavye` },
      { label: "Sarj Aleti", hint: "Hizli sarj", query: `${baseQuery} sarj aleti` },
    ];
  }

  if (laptopSignals.some((signal) => baseQuery.includes(signal))) {
    return [
      { label: "Mouse", hint: "Kablosuz modeller", query: `${baseQuery} mouse` },
      { label: "Canta", hint: "Tasima cozumleri", query: `${baseQuery} canta` },
      { label: "Sogutucu", hint: "Performans destegi", query: `${baseQuery} sogutucu` },
      { label: "USB-C Hub", hint: "Baglanti genisletme", query: `${baseQuery} usb c hub` },
    ];
  }

  return [
    { label: "Benzer Urunler", hint: "Alternatif aramalar", query: `${baseQuery} benzer urunler` },
    { label: "Aksesuarlar", hint: "Tamamlayici urunler", query: `${baseQuery} aksesuar` },
    { label: "En Uygunlar", hint: "Daha avantajli sonuclar", query: `${baseQuery} en uygun` },
  ];
}

function FavoriteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 20.25s-6.716-4.29-8.66-8.162C1.925 9.267 3.46 5.75 7.126 5.75c1.915 0 3.143 1.003 3.874 2.073.73-1.07 1.958-2.073 3.873-2.073 3.667 0 5.202 3.517 3.786 6.338C18.716 15.96 12 20.25 12 20.25Z"
      />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.25 18.5a2.25 2.25 0 0 1-4.5 0M5.75 16.5h12.5c-.88-.94-1.5-2.242-1.5-3.75v-1.5a4.75 4.75 0 1 0-9.5 0v1.5c0 1.508-.62 2.81-1.5 3.75Z"
      />
    </svg>
  );
}

function AramaIcerik({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState("populer");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedStorage, setSelectedStorage] = useState("");

  const search = useEffectEvent(async (term: string) => {
    if (!term.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const response = await fetch(`/api/public/products?q=${encodeURIComponent(term)}&limit=48`, {
      cache: "no-store",
    });

    if (!response.ok) {
      setLoading(false);
      return;
    }

    const payload = (await response.json()) as { products?: Product[] };
    setResults((payload.products ?? []).filter((product) => (product.prices?.length ?? 0) > 0));
    setLoading(false);
  });

  useEffect(() => {
    if (initialQuery.trim()) {
      void search(initialQuery);
    }
  }, [initialQuery]);

  const navigateToQuery = (nextQuery: string) => {
    const trimmed = nextQuery.trim();
    setQuery(trimmed);
    setSelectedBrands([]);
    setSelectedStorage("");
    router.push(`/ara?q=${encodeURIComponent(trimmed)}`, { scroll: false });
  };

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (query.trim()) navigateToQuery(query);
  };

  const brands = [...new Set(results.map((product) => product.brand?.trim()).filter(Boolean))];
  const relatedSuggestions = getRelatedSuggestions(initialQuery);
  const normalizedCurrentQuery = normalizeSearchText(initialQuery);
  const relatedBaseQuery = getAccessoryBaseQuery(initialQuery);
  const selectedRelatedSuffixes = relatedSuggestions
    .map((suggestion) => ({
      suggestion,
      suffix: getSuggestionSuffix(relatedBaseQuery, suggestion.query),
    }))
    .filter(({ suffix }) => Boolean(suffix) && normalizedCurrentQuery.includes(suffix));
  const storages = [
    ...new Set(
      results
        .map((product) => product.variant_storage?.trim())
        .filter((value): value is string => Boolean(value))
    ),
  ];
  const sectionsByKey: Partial<Record<"storage" | "related" | "active-filters" | "brands", SearchSidebarSection>> = {};

  if (storages.length > 1) {
    sectionsByKey.storage = {
      id: "storage",
      kind: "pills",
      title: "Kapasite",
      count: storages.length,
      items: [
        {
          id: "storage-all",
          label: "Tumu",
          selected: selectedStorage === "",
          onToggle: () => setSelectedStorage(""),
        },
        ...storages.slice(0, 8).map((storage) => ({
          id: `storage-${storage}`,
          label: storage,
          selected: selectedStorage === storage,
          onToggle: () => setSelectedStorage(storage),
        })),
      ],
    };
  }

  if (relatedSuggestions.length > 0) {
    sectionsByKey.related = {
      id: "related",
      kind: "checkbox",
      title: "Ilgili Alt Kategoriler",
      count: relatedSuggestions.length,
      items: relatedSuggestions.map((suggestion) => {
        const suffix = getSuggestionSuffix(relatedBaseQuery, suggestion.query);
        const isSelected = Boolean(suffix) && normalizedCurrentQuery.includes(suffix);

        return {
          id: suggestion.query,
          label: suggestion.label,
          selected: isSelected,
          onToggle: () => {
            const nextSuffixes = isSelected
              ? selectedRelatedSuffixes
                  .map((item) => getSuggestionSuffix(relatedBaseQuery, item.suggestion.query))
                  .filter((item) => item !== suffix)
              : [
                  ...selectedRelatedSuffixes.map((item) =>
                    getSuggestionSuffix(relatedBaseQuery, item.suggestion.query)
                  ),
                  suffix,
                ];

            navigateToQuery([relatedBaseQuery, ...nextSuffixes].join(" ").trim());
          },
        };
      }),
    };
  }

  const activeFilterItems = [
    ...selectedRelatedSuffixes.map(({ suggestion }) => ({
      id: `related-chip-${suggestion.query}`,
      label: suggestion.label,
      onRemove: () => {
        const removedSuffix = getSuggestionSuffix(relatedBaseQuery, suggestion.query);
        const suffixes = selectedRelatedSuffixes
          .map((item) => getSuggestionSuffix(relatedBaseQuery, item.suggestion.query))
          .filter((suffix) => suffix !== removedSuffix);
        navigateToQuery([relatedBaseQuery, ...suffixes].join(" ").trim());
      },
    })),
    ...(selectedStorage
      ? [
          {
            id: `storage-chip-${selectedStorage}`,
            label: selectedStorage,
            onRemove: () => setSelectedStorage(""),
          },
        ]
      : []),
    ...selectedBrands.map((brand) => ({
      id: `brand-chip-${brand}`,
      label: brand,
      onRemove: () => setSelectedBrands((current) => current.filter((item) => item !== brand)),
    })),
  ];

  if (activeFilterItems.length > 0) {
    sectionsByKey["active-filters"] = {
      id: "active-filters",
      kind: "chips",
      title: "Aktif filtreler",
      items: activeFilterItems,
    };
  }

  if (brands.length > 1) {
    sectionsByKey.brands = {
      id: "brands",
      kind: "checkbox",
      title: "Marka",
      count: brands.length,
      allOption: {
        id: "brand-all",
        label: "Tumu",
        selected: selectedBrands.length === 0,
        count: results.length,
        onToggle: () => setSelectedBrands([]),
      },
      items: brands.map((brand) => ({
        id: `brand-${brand}`,
        label: brand ?? "",
        selected: selectedBrands.includes(brand ?? ""),
        count: results.filter((product) => product.brand?.trim() === brand).length,
        onToggle: () =>
          setSelectedBrands((current) =>
            current.includes(brand ?? "")
              ? current.filter((item) => item !== brand)
              : [...current, brand ?? ""]
          ),
      })),
    };
  }

  const sidebarSections = orderSearchFilterSections(initialQuery, sectionsByKey);

  const filteredResults = results
    .filter((product) => selectedBrands.length === 0 || selectedBrands.includes(product.brand?.trim() ?? ""))
    .filter((product) => selectedStorage === "" || product.variant_storage?.trim() === selectedStorage)
    .sort((left, right) => {
      if (sortBy === "guncel") {
        return (getFreshestSeenAt(right.prices) ?? "").localeCompare(getFreshestSeenAt(left.prices) ?? "");
      }
      if (sortBy === "ucuz") {
        return (getLowestActivePrice(left.prices) ?? Infinity) - (getLowestActivePrice(right.prices) ?? Infinity);
      }
      if (sortBy === "pahali") {
        return (getLowestActivePrice(right.prices) ?? -Infinity) - (getLowestActivePrice(left.prices) ?? -Infinity);
      }
      if (sortBy === "magaza") {
        return getActiveOfferCount(right.prices) - getActiveOfferCount(left.prices);
      }
      if (sortBy === "a-z") return left.title.localeCompare(right.title);
      if (sortBy === "z-a") return right.title.localeCompare(left.title);
      return 0;
    });

  return (
    <div className="mx-auto max-w-[1480px] px-3 py-4 sm:px-6 md:py-6 lg:px-8">
      {!initialQuery && (
        <form onSubmit={handleSearch} className="mb-4 flex gap-2 sm:gap-3 md:mb-6">
          <div className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-3 transition-all focus-within:border-[#E8460A] sm:gap-3 sm:px-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 flex-shrink-0 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Urun, kategori veya marka ara..."
              className="min-w-0 flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  router.push("/ara?q=", { scroll: false });
                }}
                className="flex min-h-11 min-w-11 flex-shrink-0 items-center justify-center text-lg text-gray-400 hover:text-gray-600"
              >
                x
              </button>
            )}
          </div>
          <button
            type="submit"
            className="h-12 flex-shrink-0 rounded-xl bg-[#E8460A] px-4 text-sm font-bold text-white transition-all hover:bg-[#C93A08] sm:px-8"
          >
            Ara
          </button>
        </form>
      )}

      {!initialQuery && !loading && (
        <div className="py-12 text-center">
          <div className="mb-4 text-5xl">Ara</div>
          <div className="mb-2 text-base font-bold text-gray-800">Ne aramak istersiniz?</div>
          <div className="mb-8 text-sm text-gray-500">Urun adi, marka veya kategori yazin</div>
          <div className="flex flex-wrap justify-center gap-2">
            {popularSearches.map((term) => (
              <button
                key={term}
                onClick={() => navigateToQuery(term)}
                className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 transition-all hover:border-[#E8460A] hover:text-[#E8460A]"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && results.length === 0 && (
        <div className="py-16 text-center">
          <div className="mb-3 animate-pulse text-4xl">Ara</div>
          <div className="text-sm text-gray-500">Araniyor...</div>
        </div>
      )}

      {!loading && initialQuery && results.length === 0 && (
        <div className="py-16 text-center">
          <div className="mb-4 text-5xl">Sonuc yok</div>
          <div className="mb-2 text-base font-bold text-gray-800">
            &quot;{initialQuery}&quot; icin sonuc bulunamadi
          </div>
          <div className="mb-6 text-sm text-gray-500">Farkli bir kelime deneyin</div>
          <div className="flex flex-wrap justify-center gap-2">
            {popularSearches.map((term) => (
              <button
                key={term}
                onClick={() => navigateToQuery(term)}
                className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 transition-all hover:border-[#E8460A] hover:text-[#E8460A]"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && initialQuery && results.length > 0 && filteredResults.length === 0 && (
        <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
          <div className="mb-2 text-lg font-bold text-slate-900">Secili filtrelerle urun bulunamadi</div>
          <div className="mb-6 text-sm text-slate-500">Marka veya kapasite filtresini gevsetmeyi deneyin.</div>
          <div className="flex flex-wrap justify-center gap-2">
            {selectedBrands.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedBrands([])}
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:border-[#E8460A] hover:text-[#E8460A]"
              >
                Marka filtresini temizle
              </button>
            )}
            {selectedStorage && (
              <button
                type="button"
                onClick={() => setSelectedStorage("")}
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:border-[#E8460A] hover:text-[#E8460A]"
              >
                Hafiza filtresini temizle
              </button>
            )}
          </div>
        </div>
      )}

      {initialQuery && results.length > 0 && (
        <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
          <SearchFiltersSidebar sections={sidebarSections} />

          <section className="min-w-0 flex-1">
            <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-[0_8px_32px_rgba(15,23,42,0.05)]">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-xl font-bold text-slate-900">
                    &quot;{initialQuery}&quot; icin arama sonuclari
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Aramana uygun <span className="font-semibold text-slate-900">{filteredResults.length}</span> urun
                    listelendi.
                  </div>
                  {loading && results.length > 0 && (
                    <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-[#FAD9CA] bg-[#FFF6F1] px-3 py-1 text-[11px] font-semibold text-[#E8460A]">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#E8460A]" />
                      Sonuclar guncelleniyor...
                    </div>
                  )}
                </div>
                <label className="flex items-center gap-3 text-sm text-slate-500">
                  <span className="font-medium">Sirala</span>
                  <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value)}
                    className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-[#E8460A]"
                  >
                    <option value="populer">En Populer Urunler</option>
                    <option value="ucuz">En Ucuz</option>
                    <option value="pahali">En Pahali</option>
                    <option value="magaza">En Fazla Magaza</option>
                    <option value="guncel">En Guncel Fiyatlar</option>
                    <option value="a-z">A-Z</option>
                    <option value="z-a">Z-A</option>
                  </select>
                </label>
              </div>

              {storages.length > 1 && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  {storages.slice(0, 8).map((storage) => (
                    <button
                      key={storage}
                      type="button"
                      onClick={() => setSelectedStorage((current) => (current === storage ? "" : storage))}
                      className={`rounded-full border px-3 py-2 text-xs font-semibold transition-all ${
                        selectedStorage === storage
                          ? "border-[#E8460A] bg-[#FFF4EE] text-[#E8460A]"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:border-[#E8460A]/35"
                      }`}
                    >
                      Dahili Hafiza {storage}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 space-y-4">
              {filteredResults.map((product) => {
                const minPrice = getLowestActivePrice(product.prices);
                const offerCount = getActiveOfferCount(product.prices);
                const freshestSeenAt = getFreshestSeenAt(product.prices);
                const offers = getOfferHighlights(product.prices);
                const title = cleanProductTitle(product.title) || getDiscoveryProductLabel(product);

                return (
                  <Link href={`/urun/${product.slug}`} key={product.id} className="group block">
                    <article className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.07)] transition-all hover:-translate-y-0.5 hover:border-[#E8460A]/35 hover:shadow-[0_18px_48px_rgba(15,23,42,0.12)]">
                      <div className="grid lg:grid-cols-[152px_minmax(0,1fr)_186px]">
                        <div className="relative flex items-center justify-center border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-1 py-1 lg:border-b-0 lg:border-r">
                          <div className="absolute left-4 top-4 rounded-full bg-[#EAF8F0] px-2.5 py-1 text-[10px] font-bold text-[#0B8A44]">
                            %{Math.min(offerCount * 2, 12)}+
                          </div>
                          {product.image_url ? (
                            <div className="flex h-[172px] w-[138px] items-center justify-center overflow-hidden">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={product.image_url}
                                alt={title}
                                className="h-full w-full scale-[1.62] object-contain transition-transform duration-300 group-hover:scale-[1.68]"
                              />
                            </div>
                          ) : (
                            <div className="flex h-[172px] w-[138px] items-center justify-center rounded-3xl bg-slate-100 text-5xl text-slate-300">
                              ?
                            </div>
                          )}
                        </div>

                        <div className="px-4 py-2.5 md:px-[18px]">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            {product.brand && (
                              <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#E8460A]">
                                {product.brand}
                              </span>
                            )}
                            {product.variant_storage && (
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
                                {product.variant_storage}
                              </span>
                            )}
                            {product.variant_color && (
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
                                {product.variant_color}
                              </span>
                            )}
                            <div className="flex gap-2 text-slate-400">
                              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white transition hover:border-[#E8460A]/30 hover:text-[#E8460A]">
                                <FavoriteIcon />
                              </span>
                              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white transition hover:border-[#E8460A]/30 hover:text-[#E8460A]">
                                <BellIcon />
                              </span>
                            </div>
                          </div>

                          <h2 className="max-w-4xl text-[14px] font-bold leading-5 text-slate-900 md:text-[15px]">
                            {title}
                          </h2>

                          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            <span className="font-medium text-slate-700">{offerCount} fiyat bulundu</span>
                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                            <span>Son fiyat kontrolu {formatFreshnessLabel(freshestSeenAt)}</span>
                          </div>

                          <div className="mt-2.5 grid gap-2 xl:grid-cols-3">
                            {offers.length > 0 ? (
                              offers.map((offer) => (
                                <div
                                  key={`${product.id}-${offer.source}-${offer.price}`}
                                  className="rounded-[17px] border border-slate-200 bg-white px-3 py-2.5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-all group-hover:border-slate-300"
                                >
                                  <div className="mb-2 inline-flex rounded-full bg-[#EEF8F2] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#159857]">
                                    {offer.badge}
                                  </div>
                                  <div className="text-[21px] font-black tracking-tight text-slate-900">
                                    {offer.price.toLocaleString("tr-TR")}
                                    <span className="ml-1 text-sm font-semibold text-slate-400">TL</span>
                                  </div>
                                  <div className="mt-2.5 flex items-center justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-2.5">
                                      <StoreLogo name={getSourceDisplayName(offer.source)} size={20} />
                                      <div className="min-w-0">
                                        <div className="truncate text-xs font-bold text-slate-700">
                                          {getSourceDisplayName(offer.source)}
                                        </div>
                                        <div className="text-[11px] text-slate-400">
                                          {formatFreshnessLabel(offer.last_seen)}
                                        </div>
                                      </div>
                                    </div>
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
                                      Teklif
                                    </span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-400 xl:col-span-3">
                                Aktif fiyat bilgisi yok.
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="border-t border-slate-100 bg-[#F5FAFF] px-3 py-2.5 lg:border-l lg:border-t-0">
                          <div className="flex h-full flex-col justify-between gap-3.5">
                            <div className="rounded-[20px] border border-[#D4E7FB] bg-white/90 px-3.5 py-3.5 shadow-[0_8px_24px_rgba(29,112,224,0.08)]">
                              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1D70E0]/70">
                                En uygun teklif
                              </div>
                              <div className="mt-2 text-[27px] font-black tracking-tight text-slate-900">
                                {minPrice !== null ? minPrice.toLocaleString("tr-TR") : "-"}
                                {minPrice !== null && <span className="ml-1 text-sm font-semibold text-slate-400">TL</span>}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                Son fiyat kontrolu {formatFreshnessLabel(freshestSeenAt)}
                              </div>
                            </div>

                            <div className="rounded-[20px] bg-[#E9F4FF] px-3.5 py-3.5 text-center transition-all group-hover:bg-[#DDF0FF]">
                              <div className="text-[13px] font-bold text-[#1D70E0]">
                                {Math.max(offerCount, 1)}+ Fiyat daha incele
                              </div>
                              <div className="mt-1 text-[11px] text-[#5A87C7]">Urun detayina git</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function AramaSayfasiIcerik() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";

  return <AramaIcerik initialQuery={q} />;
}

export default function AramaSayfasi() {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      <Suspense fallback={<div className="py-20 text-center text-gray-400">Yukleniyor...</div>}>
        <AramaSayfasiIcerik />
      </Suspense>
      <Footer />
    </main>
  );
}
