import { supabaseAdmin } from "../../../lib/supabaseServer";
import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";
import Link from "next/link";
import Image from "next/image";
import { fetchCategoryPath, fetchChildCategories, fetchDescendantIds } from "../../../lib/categoryTree";
import SortDropdown from "../../components/kategori/SortDropdown";
import FilterModal from "../../components/kategori/FilterModal";
import CategoryFiltersSidebar from "../../components/kategori/CategoryFiltersSidebar";
import { CATEGORY_IMAGE_OVERRIDES } from "../../../lib/categoryImageOverrides";
import { getCategoryQueryHint, resolveCategorySlug } from "../../../lib/categoryAliases";
import {
  CATEGORY_SPEC_FILTERS,
  extractSpecFilterValue,
  normalizeFilterValue,
  sortFilterValues,
  type CategorySpecFilterParam,
} from "../../../lib/categoryFilterSpecs";
import {
  getActiveListings,
  getActiveOfferCount,
  getFreshestSeenAt,
  getLowestActivePrice,
  getUniqueActiveSources,
  formatFreshnessLabel,
  sourceTrustScore,
} from "../../../lib/listingSignals";
import { mergeClusteredProducts } from "../../../lib/productCluster";
import { checkAccessory } from "../../../lib/accessoryDetector";
import {
  getDiscoveryProductLabel,
  shouldHideDiscoveryProduct,
} from "../../../lib/productDiscovery";

export const revalidate = 60;

type ListingRow = {
  id?: string | null;
  price?: number | null;
  source?: string | null;
  is_active?: boolean | null;
  in_stock?: boolean | null;
  last_seen?: string | null;
};

type ProductCard = {
  id: string;
  title: string;
  slug: string;
  brand: string | null;
  description?: string | null;
  image_url?: string | null;
  specs?: Record<string, unknown> | null;
  category_id: string | null;
  model_code: string | null;
  model_family: string | null;
  variant_storage: string | null;
  variant_color: string | null;
  created_at?: string | null;
  prices: ListingRow[] | null;
};

type CategoryFilterSection = {
  id: string;
  label: string;
  options: Array<{ value: string; label: string; count: number }>;
  selected: string[];
  searchable?: boolean;
  defaultOpen?: boolean;
};

function parseMultiParam(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function matchesSelectedValue(value: string | null | undefined, selected: string[]): boolean {
  if (selected.length === 0) return true;
  const normalizedValue = normalizeFilterValue(value).toLocaleLowerCase("tr");
  return selected.some((item) => normalizeFilterValue(item).toLocaleLowerCase("tr") === normalizedValue);
}

function getStorageValue(product: ProductCard): string | null {
  return (
    normalizeFilterValue(product.variant_storage) ||
    extractSpecFilterValue(product.specs, ["Dahili Hafiza", "Dahili Hafıza", "Depolama"])
  );
}

function getColorValue(product: ProductCard): string | null {
  return (
    normalizeFilterValue(product.variant_color) ||
    extractSpecFilterValue(product.specs, ["Renk", "Color", "Renk (Ureticiye Gore)"])
  );
}

export default async function KategoriSayfasi({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    marka?: string;
    model?: string;
    q?: string;
    siralama?: string;
    hafiza?: string;
    renk?: string;
    min?: string;
    max?: string;
    kaynak?: string;
    ram?: string;
    batarya?: string;
    yil?: string;
    mobil?: string;
    ekran?: string;
    cozunurluk?: string;
    yenileme?: string;
  }>;
}) {
  const { slug } = await params;
  const resolvedSlug = resolveCategorySlug(slug);
  const {
    marka,
    model,
    q,
    siralama,
    hafiza,
    renk,
    min,
    max,
    kaynak,
    ram,
    batarya,
    yil,
    mobil,
    ekran,
    cozunurluk,
    yenileme,
  } = await searchParams;
  const effectiveQuery = q ?? getCategoryQueryHint(slug);
  const selectedBrands = parseMultiParam(marka);
  const selectedModels = parseMultiParam(model);
  const selectedStorages = parseMultiParam(hafiza);
  const selectedColors = parseMultiParam(renk);
  const selectedSpecFilters: Record<CategorySpecFilterParam, string[]> = {
    ram: parseMultiParam(ram),
    batarya: parseMultiParam(batarya),
    yil: parseMultiParam(yil),
    mobil: parseMultiParam(mobil),
    ekran: parseMultiParam(ekran),
    cozunurluk: parseMultiParam(cozunurluk),
    yenileme: parseMultiParam(yenileme),
  };

  const { data: category } = await supabaseAdmin
    .from("categories")
    .select("*")
    .eq("slug", resolvedSlug)
    .maybeSingle();

  // Paralel: ancestors + children + descendants (birbirine bağımlı değil, hepsi category.id'ye)
  const [ancestors, children, descendantIds] = await Promise.all([
    category?.parent_id ? fetchCategoryPath(category.parent_id) : Promise.resolve([]),
    category?.id ? fetchChildCategories(category.id) : Promise.resolve([]),
    category?.id ? fetchDescendantIds(category.id) : Promise.resolve([]),
  ]);

  // Her child kategori için örnek ürün görseli çek (tek bulk query)
  const childImageMap = new Map<string, string>();
  if (children.length > 0) {
    const childDescendants = await Promise.all(children.map(c => fetchDescendantIds(c.id).then(ids => ({ childId: c.id, ids }))));
    const catToChild = new Map<string, string>();
    for (const { childId, ids } of childDescendants) {
      for (const id of ids) if (!catToChild.has(id)) catToChild.set(id, childId);
    }
    const allDescIds = [...catToChild.keys()];
    if (allDescIds.length > 0) {
      const { data: prodData } = await supabaseAdmin
        .from("products")
        .select("image_url, category_id, prices:listings(source, is_active, in_stock)")
        .in("category_id", allDescIds)
        .not("image_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(2000);
      // Her child için en güvenilir source'un görselini seç
      const bestPerChild = new Map<string, { url: string; trustScore: number }>();
      for (const row of prodData ?? []) {
        const childId = row.category_id ? catToChild.get(row.category_id) : null;
        if (!childId || !row.image_url) continue;
        const sources = (((row.prices as ListingRow[] | null) ?? [])
          .filter((listing) => listing.is_active !== false && listing.in_stock !== false)
          .map((listing) => listing.source)
          .filter(Boolean)) as string[];
        const t = sources.length > 0 ? Math.max(...sources.map(sourceTrustScore)) : 0;
        const cur = bestPerChild.get(childId);
        if (!cur || t > cur.trustScore) {
          bestPerChild.set(childId, { url: row.image_url, trustScore: t });
        }
      }
      for (const [childId, { url }] of bestPerChild) childImageMap.set(childId, url);
    }
  }


  // Variant dedup için daha geniş bir havuz çekip in-memory birleştiriyoruz
  let query = supabaseAdmin
    .from("products")
    .select("id, title, slug, brand, description, image_url, specs, category_id, model_code, model_family, variant_storage, variant_color, created_at, prices:listings(id, price, source, is_active, in_stock, last_seen)")
    .in("category_id", descendantIds.length > 0 ? descendantIds : [category?.id ?? ""])
    .eq("is_active", true);

  if (selectedBrands.length === 1) query = query.eq("brand", selectedBrands[0]);
  if (selectedModels.length === 1) query = query.eq("model_family", selectedModels[0]);
  if (effectiveQuery) query = query.ilike("title", `%${effectiveQuery}%`);

  if (siralama === "az") query = query.order("title", { ascending: true });
  else if (siralama === "za") query = query.order("title", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  // Paralel: ana ürün query + marka/model count (aynı descendantIds kullanıyor)
  const allBrandsPromise = supabaseAdmin
    .from("products")
    .select("id, title, slug, brand, image_url, specs, category_id, model_code, model_family, variant_storage, variant_color, created_at, prices:listings(id, price, source, is_active, in_stock, last_seen)")
    .in("category_id", descendantIds.length > 0 ? descendantIds : [category?.id ?? ""])
    .eq("is_active", true);
  const mainPromise = query.limit(300);
  const [mainRes, allRes] = await Promise.all([mainPromise, allBrandsPromise]);
  const { data: rawProducts } = mainRes;
  const allProducts = allRes.data;

  // Aynı (brand, model_family) birden fazla kayıt varsa sadece en ucuzunu listele
  const visibleListingsOf = (p: { prices: ListingRow[] | null | undefined }) =>
    getActiveListings(p.prices, kaynak ?? null);
  const allSourcesOf = (p: { prices: ListingRow[] | null | undefined }): string[] =>
    getUniqueActiveSources(p.prices);
  const normalizeProducts = (items: ProductCard[]): ProductCard[] =>
    mergeClusteredProducts(
      items.map((product) => ({
        ...product,
        prices: ((product.prices ?? []).map((listing) => ({
          id: listing.id ?? `${product.id}:${listing.source ?? "unknown"}:${listing.price ?? "0"}`,
          price: Number(listing.price ?? 0),
          source: listing.source ?? null,
          is_active: listing.is_active ?? null,
          in_stock: listing.in_stock ?? null,
          last_seen: listing.last_seen ?? null,
        }))).filter(
          (listing) =>
            listing.is_active !== false &&
            listing.in_stock !== false &&
            Number.isFinite(listing.price) &&
            listing.price > 0
        ),
      }))
    );

  const categorySlug = category?.slug ?? "";
  const mergedRawProducts = normalizeProducts((rawProducts as ProductCard[] | null) ?? []).filter(
    (product) => !shouldHideDiscoveryProduct(product)
  ).filter((product) => {
    // PAKET 1: high-confidence aksesuarlari gizle
    const lowestPrice = getLowestActivePrice(product.prices, kaynak ?? null);
    const acc = checkAccessory(
      product.title ?? "",
      categorySlug,
      typeof lowestPrice === "number" && lowestPrice > 0 ? lowestPrice : undefined,
    );
    return !(acc.isAccessory && acc.confidence === "high");
  });
  let products: ProductCard[] = mergedRawProducts.filter(
    (product) => !kaynak || visibleListingsOf(product).length > 0
  );

  // Filtreler
  if (selectedBrands.length > 0) {
    products = products.filter((product) => matchesSelectedValue(product.brand, selectedBrands));
  }
  if (selectedModels.length > 0) {
    products = products.filter((product) => matchesSelectedValue(product.model_family, selectedModels));
  }
  if (selectedStorages.length > 0) {
    products = products.filter((product) => matchesSelectedValue(getStorageValue(product), selectedStorages));
  }
  if (selectedColors.length > 0) {
    products = products.filter((product) => matchesSelectedValue(getColorValue(product), selectedColors));
  }
  for (const config of CATEGORY_SPEC_FILTERS) {
    const selectedValues = selectedSpecFilters[config.param];
    if (selectedValues.length === 0) continue;
    products = products.filter((product) =>
      matchesSelectedValue(extractSpecFilterValue(product.specs, config.keys), selectedValues)
    );
  }
  const minN = min ? Number(min) : null;
  const maxN = max ? Number(max) : null;
  if (minN != null || maxN != null) {
    products = products.filter(p => {
      const mp = getLowestActivePrice(p.prices, kaynak ?? null);
      if (mp === null) return false;
      if (minN != null && mp < minN) return false;
      if (maxN != null && mp > maxN) return false;
      return true;
    });
  }

  // Fiyata göre sıralama
  const getMin = (p: ProductCard): number => getLowestActivePrice(p.prices, kaynak ?? null) ?? Infinity;
  if (siralama === "ucuz") products.sort((a, b) => getMin(a) - getMin(b));
  else if (siralama === "pahali") products.sort((a, b) => getMin(b) - getMin(a));

  const filteredProductCount = products.length;
  products = products.slice(0, 96);

  // Filtre seçenekleri (sidebar için)
  const storageSet = new Set<string>();
  const colorSet = new Set<string>();
  mergedRawProducts.forEach((product) => {
    if (product.variant_storage) storageSet.add(product.variant_storage);
    if (product.variant_color) colorSet.add(product.variant_color);
  });
  const storageOptions = [...storageSet].sort((a, b) => parseInt(a) - parseInt(b));
  const colorOptions = [...colorSet].sort();

  // allProducts yukarıda paralel fetch edildi (mainPromise ile birlikte)

  const brandCounts: Record<string, number> = {};
  const modelsByBrand: Record<string, Record<string, number>> = {};
  const sourceCounts: Record<string, number> = {};
  const countBaseProducts = normalizeProducts((allProducts as ProductCard[] | null) ?? [])
    .filter((product) => !shouldHideDiscoveryProduct(product))
    .filter((product) => !kaynak || getActiveListings(product.prices, kaynak).length > 0);
  // Filter listesinde invalid model_family (SKU/EAN sayisal, Apple SKU MTPxxxTU/A) gizlensin
  const isInvalidFamily = (v: string | null | undefined): boolean => {
    if (!v) return true;
    const t = v.trim();
    if (/^\d{6,13}$/.test(t)) return true;
    if (/^[A-Z]{2}[A-Z0-9]{2,6}TU\/A$/i.test(t)) return true;
    if (t.length < 3) return true;
    return false;
  };
  countBaseProducts.forEach(p => {
    if (p.brand) {
      brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1;
      if (p.model_family && !isInvalidFamily(p.model_family)) {
        modelsByBrand[p.brand] = modelsByBrand[p.brand] ?? {};
        modelsByBrand[p.brand][p.model_family] = (modelsByBrand[p.brand][p.model_family] || 0) + 1;
      }
    }
  });
  countBaseProducts.forEach((p) => {
    for (const src of allSourcesOf({ prices: p.prices ?? null })) {
      sourceCounts[src] = (sourceCounts[src] || 0) + 1;
    }
  });
  const SOURCE_LABELS: Record<string, string> = {
    mediamarkt: "MediaMarkt",
    vatan: "Vatan",
    trendyol: "Trendyol",
    hepsiburada: "Hepsiburada",
    amazon: "Amazon",
    n11: "n11",
    pttavm: "PttAVM",
    teknosa: "Teknosa",
  };
  const brands = Object.entries(brandCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  const modelsForSelected = marka && modelsByBrand[marka]
    ? Object.entries(modelsByBrand[marka]).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }))
    : [];

  // Category-aware sub-filter label
  const rootSlug = ancestors[0]?.slug ?? category?.slug ?? "";
  const subLabel =
    rootSlug === "moda" ? "Ürün Tipi" :
    rootSlug === "ev-yasam" ? "Tip" :
    rootSlug === "kozmetik-bakim" ? "Ürün" :
    rootSlug === "kitap-hobi" ? "Tip" :
    rootSlug === "pet-shop" ? "Tip" :
    rootSlug === "anne-bebek" ? "Tip" :
    rootSlug === "spor-outdoor" ? "Tip" :
    rootSlug === "otomotiv" ? "Tip" :
    "Model";

  const mergedModelCounts = Object.values(modelsByBrand).reduce<Record<string, number>>((acc, modelMap) => {
    for (const [name, count] of Object.entries(modelMap)) {
      acc[name] = (acc[name] || 0) + count;
    }
    return acc;
  }, {});

  const specCounts: Record<CategorySpecFilterParam, Record<string, number>> = {
    ram: {},
    batarya: {},
    yil: {},
    mobil: {},
    ekran: {},
    cozunurluk: {},
    yenileme: {},
  };

  countBaseProducts.forEach((product) => {
    for (const config of CATEGORY_SPEC_FILTERS) {
      const specValue = extractSpecFilterValue(product.specs, config.keys);
      if (!specValue) continue;
      specCounts[config.param][specValue] = (specCounts[config.param][specValue] || 0) + 1;
    }
  });

  // Seri (Model) filter: 1+ marka secildiyse sadece o markalarin modelleri,
  // hicbir marka secili degilse tum markalarin merged modelleri.
  const filteredModelCounts: Record<string, number> = selectedBrands.length > 0
    ? selectedBrands.reduce<Record<string, number>>((acc, brand) => {
        const m = modelsByBrand[brand] ?? {};
        for (const [k, v] of Object.entries(m)) acc[k] = (acc[k] || 0) + v;
        return acc;
      }, {})
    : mergedModelCounts;

  const sidebarModelOptions = Object.entries(filteredModelCounts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "tr"))
    .map(([value, count]) => ({ value, label: value, count }));

  const sidebarStorageOptions = storageOptions.map((value) => ({
    value,
    label: value,
    count: countBaseProducts.filter((product) => matchesSelectedValue(getStorageValue(product), [value])).length,
  }));

  const sidebarColorOptions = colorOptions.map((value) => ({
    value,
    label: value,
    count: countBaseProducts.filter((product) => matchesSelectedValue(getColorValue(product), [value])).length,
  }));

  const sidebarSections: CategoryFilterSection[] = [
    brands.length > 1
      ? {
          id: "marka",
          label: "Marka",
          options: brands.map((brand) => ({ value: brand.name, label: brand.name, count: brand.count })),
          selected: selectedBrands,
          searchable: brands.length > 10,
          defaultOpen: true,
        }
      : null,
    sidebarModelOptions.length > 1
      ? {
          id: "model",
          label: subLabel === "Model" ? "Seri" : subLabel,
          options: sidebarModelOptions,
          selected: selectedModels,
          searchable: sidebarModelOptions.length > 10,
          defaultOpen: true,
        }
      : null,
    sidebarStorageOptions.length > 1
      ? {
          id: "hafiza",
          label: "Dahili Hafiza",
          options: sidebarStorageOptions,
          selected: selectedStorages,
          defaultOpen: true,
        }
      : null,
    sidebarColorOptions.length > 1
      ? {
          id: "renk",
          label: "Renk",
          options: sidebarColorOptions,
          selected: selectedColors,
          searchable: sidebarColorOptions.length > 10,
          defaultOpen: false,
        }
      : null,
    ...CATEGORY_SPEC_FILTERS.map((config) => ({
      id: config.param,
      label: config.label,
      options: sortFilterValues(Object.keys(specCounts[config.param]), config.sort).map((value) => ({
        value,
        label: value,
        count: specCounts[config.param][value] ?? 0,
      })),
      selected: selectedSpecFilters[config.param],
      searchable: Object.keys(specCounts[config.param]).length > 10,
      defaultOpen: false,
    })).filter((section) => section.options.length > 1),
  ].filter(Boolean) as CategoryFilterSection[];

  const pricePresets = [
    { label: "199 - 19.999 TL", min: "199", max: "19999", active: (min ?? null) === "199" && (max ?? null) === "19999" },
    { label: "20.000 - 50.000 TL", min: "20000", max: "50000", active: (min ?? null) === "20000" && (max ?? null) === "50000" },
    { label: "50.000 - 80.000 TL", min: "50000", max: "80000", active: (min ?? null) === "50000" && (max ?? null) === "80000" },
    { label: "80.000 TL ve ustu", min: "80000", max: null, active: (min ?? null) === "80000" && !max },
  ];

  const hasActiveSidebarFilters =
    selectedBrands.length > 0 ||
    selectedModels.length > 0 ||
    selectedStorages.length > 0 ||
    selectedColors.length > 0 ||
    Object.values(selectedSpecFilters).some((items) => items.length > 0) ||
    Boolean(min || max);

  if (!category) {
    return (
      <main>
        <Header />
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h1 className="font-bold text-2xl mb-4">Kategori bulunamadı</h1>
          <Link href="/" className="text-[#E8460A]">Anasayfaya dön</Link>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="bg-white min-h-screen">
      <Header />

      {/* Hero */}
      <div className="bg-white text-gray-900 px-3 sm:px-6 py-4 sm:py-6 border-b border-gray-100">
        <div className="max-w-[1400px] mx-auto">
          <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 text-xs sm:text-sm text-gray-500 mb-2">
            <Link href="/" className="hover:text-[#E8460A] transition-colors flex-shrink-0">Anasayfa</Link>
            {ancestors.map((c) => (
              <span key={c.id} className="flex gap-2">
                <span className="flex-shrink-0">/</span>
                <Link href={`/anasayfa/${ancestors.slice(0, ancestors.indexOf(c) + 1).map(x => x.slug).join("/")}`} className="hover:text-[#E8460A] transition-colors flex-shrink-0">{c.name}</Link>
              </span>
            ))}
            <span className="flex gap-2 min-w-0">
              <span className="flex-shrink-0">/</span>
              <span className="text-gray-800 truncate">{category.name}</span>
            </span>
          </nav>
          <div className="flex items-center justify-between gap-3">
            <h1 className="font-extrabold text-lg sm:text-2xl text-gray-900 min-w-0 truncate">{category.name}</h1>
            <span className="text-xs sm:text-sm text-gray-500 flex-shrink-0">{filteredProductCount} ürün</span>
          </div>
        </div>
      </div>

      {/* Alt kategoriler (varsa) — tek satırda, gerekirse yatay scroll */}
      {children.length > 0 && (
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 pt-4">
          <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
            {children.map((c) => {
              const img = CATEGORY_IMAGE_OVERRIDES[c.slug] ?? childImageMap.get(c.id);
              return (
                <Link
                  key={c.id}
                  href={`/kategori/${c.slug}`}
                  className="flex-shrink-0 w-24 sm:w-28 lg:w-32 bg-white rounded-xl p-2 text-center shadow-sm hover:shadow-md hover:border-[#E8460A] border border-transparent transition group"
                >
                  <div className="relative w-full aspect-square mb-1.5 overflow-hidden rounded-lg bg-gray-50 flex items-center justify-center">
                    {img ? (
                      <Image
                        src={img}
                        alt={c.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                        sizes="128px"
                      />
                    ) : (
                      <span className="text-3xl">{c.icon ?? "📦"}</span>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-gray-800 line-clamp-2 leading-tight">{c.name}</div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-4 sm:py-6 flex flex-col md:flex-row gap-4 md:gap-6">

        {(() => {
          const buildUrl = (overrides: Record<string, string | null>): string => {
            const params: Record<string, string | undefined> = {
              marka,
              model,
              q,
              siralama,
              hafiza,
              renk,
              min,
              max,
              kaynak,
              ram,
              batarya,
              yil,
              mobil,
              ekran,
              cozunurluk,
              yenileme,
            };
            for (const [k, v] of Object.entries(overrides)) {
              if (v === null || v === "") delete params[k];
              else params[k] = v;
            }
            const qs = Object.entries(params)
              .filter(([, v]) => v != null && v !== "")
              .map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`)
              .join("&");
            return `/kategori/${slug}${qs ? "?" + qs : ""}`;
          };

          return (
            <>
              <CategoryFiltersSidebar
                sections={sidebarSections}
                pricePresets={pricePresets}
                hasActiveFilters={hasActiveSidebarFilters}
              />
              {false && (
                <>
              {/* Sol: Filtreler sidebar */}
              <aside className="w-full md:w-60 flex-shrink-0 space-y-3">
                {/* Aktif filtreler (varsa) clear linki */}
                {(marka || model || q || hafiza || renk || min || max || kaynak) && (
                  <Link href={`/kategori/${slug}${siralama ? "?siralama=" + siralama : ""}`}>
                    <div className="text-xs text-[#E8460A] font-semibold hover:underline cursor-pointer px-1">
                      × Filtreleri temizle
                    </div>
                  </Link>
                )}

                {/* Marka */}
                {brands.length > 1 && (
            <div className="bg-white rounded-2xl border border-[#E8E4DF] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#E8E4DF]">
                <div className="font-bold text-sm text-gray-800">Marka</div>
              </div>
              <div className="py-2 max-h-60 overflow-y-auto">
                <Link href={buildUrl({ marka: null })}>
                  <div className={`flex items-center justify-between px-4 py-2 text-sm cursor-pointer transition-colors ${!marka ? "text-slate-900 font-semibold bg-slate-100" : "text-gray-700 hover:bg-gray-50"}`}>
                    <span>Tümü</span>
                    <span className="text-xs text-gray-400">{countBaseProducts.length}</span>
                  </div>
                </Link>
                      {brands.map((b) => {
                        const isSelected = marka === b.name;
                        return (
                          <div key={b.name}>
                            <Link href={buildUrl({ marka: isSelected ? null : b.name, model: null })}>
                              <div className={`flex items-center justify-between px-4 py-2 text-sm cursor-pointer transition-colors ${isSelected ? "text-slate-900 font-semibold bg-slate-100" : "text-gray-700 hover:bg-gray-50"}`}>
                                <span className="flex items-center gap-1">
                                  <span className={`inline-block transition-transform ${isSelected ? "rotate-90" : ""}`}>›</span>
                                  {b.name}
                                </span>
                                <span className="text-xs text-gray-400">{b.count}</span>
                              </div>
                            </Link>
                            {isSelected && modelsForSelected.length > 0 && (
                              <div className="bg-slate-50 border-l-2 border-slate-300 ml-4">
                                <Link href={buildUrl({ model: null })}>
                                  <div className={`flex items-center justify-between px-4 py-1.5 text-xs cursor-pointer transition-colors ${!model ? "text-slate-900 font-semibold" : "text-gray-600 hover:bg-gray-100"}`}>
                                    <span>Tüm {subLabel.toLowerCase()} seçenekleri</span>
                                    <span className="text-gray-400">{b.count}</span>
                                  </div>
                                </Link>
                                {modelsForSelected.map(m => (
                                  <Link key={m.name} href={buildUrl({ model: model === m.name ? null : m.name })}>
                                    <div className={`flex items-center justify-between px-4 py-1.5 text-xs cursor-pointer transition-colors ${model === m.name ? "text-slate-900 font-semibold" : "text-gray-600 hover:bg-gray-100"}`}>
                                      <span className="truncate">{m.name}</span>
                                      <span className="text-gray-400 flex-shrink-0 ml-2">{m.count}</span>
                                    </div>
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Dahili Hafıza */}
                {storageOptions.length > 1 && (
                  <div className="bg-white rounded-2xl border border-[#E8E4DF] overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#E8E4DF]">
                      <div className="font-bold text-sm text-gray-800">Dahili Hafıza</div>
                    </div>
                    <div className="p-3 flex flex-wrap gap-2">
                      {storageOptions.map(s => (
                        <Link key={s} href={buildUrl({ hafiza: hafiza === s ? null : s })}>
                          <div className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all ${hafiza === s ? "bg-slate-100 text-slate-900 border-slate-400" : "border-gray-200 text-gray-700 hover:border-slate-400"}`}>{s}</div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Renk */}
                {colorOptions.length > 1 && (
                  <div className="bg-white rounded-2xl border border-[#E8E4DF] overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#E8E4DF]">
                      <div className="font-bold text-sm text-gray-800">Renk</div>
                    </div>
                    <div className="py-2 max-h-60 overflow-y-auto">
                      {colorOptions.map(c => (
                        <Link key={c} href={buildUrl({ renk: renk === c ? null : c })}>
                          <div className={`px-4 py-2 text-sm cursor-pointer transition-colors ${renk === c ? "text-slate-900 font-semibold bg-slate-100" : "text-gray-700 hover:bg-gray-50"}`}>
                            {c}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fiyat aralığı presetleri */}
                <div className="bg-white rounded-2xl border border-[#E8E4DF] overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#E8E4DF]">
                    <div className="font-bold text-sm text-gray-800">Fiyat</div>
                  </div>
                  <div className="py-2">
                    {[
                      { label: "Hepsi", mn: null, mx: null },
                      { label: "0 - 5.000 ₺", mn: "0", mx: "5000" },
                      { label: "5.000 - 15.000 ₺", mn: "5000", mx: "15000" },
                      { label: "15.000 - 30.000 ₺", mn: "15000", mx: "30000" },
                      { label: "30.000 - 60.000 ₺", mn: "30000", mx: "60000" },
                      { label: "60.000 ₺ +", mn: "60000", mx: null },
                    ].map(r => {
                      const active = (min ?? null) === r.mn && (max ?? null) === r.mx;
                      return (
                        <Link key={r.label} href={buildUrl({ min: r.mn, max: r.mx })}>
                          <div className={`px-4 py-2 text-sm cursor-pointer transition-colors ${active ? "text-slate-900 font-semibold bg-slate-100" : "text-gray-700 hover:bg-gray-50"}`}>
                            {r.label}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </aside>
                </>
              )}

              {/* Sağ: Ürün grid */}
              <div className="flex-1 min-w-0">
                {/* Sıralama bar */}
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div className="text-sm text-gray-500">
                    {(marka || hafiza || renk) && (
                      <span className="font-semibold text-gray-800">
                        {[marka, hafiza, renk].filter(Boolean).join(" · ")}
                      </span>
                    )}
                    {(marka || hafiza || renk) && " · "}
                    {filteredProductCount} ürün
                  </div>
                  <div className="flex items-center gap-2">
                    <FilterModal
                      currentSource={kaynak ?? null}
                      clearHref={buildUrl({ kaynak: null })}
                      sources={Object.entries(sourceCounts)
                        .sort((a, b) => b[1] - a[1])
                        .map(([name, count]) => ({
                          name,
                          label: SOURCE_LABELS[name] ?? name,
                          count,
                          href: buildUrl({ kaynak: kaynak === name ? null : name }),
                        }))}
                    />
                    <SortDropdown
                      currentSort={siralama || ""}
                      options={[
                        { label: "En Yeni", val: "", href: buildUrl({ siralama: null }) },
                        { label: "En Ucuz", val: "ucuz", href: buildUrl({ siralama: "ucuz" }) },
                        { label: "En Pahalı", val: "pahali", href: buildUrl({ siralama: "pahali" }) },
                        { label: "A → Z", val: "az", href: buildUrl({ siralama: "az" }) },
                      ]}
                    />
                  </div>
                </div>

          {!products || products.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-[#E8E4DF]">
              <div className="text-4xl mb-3">{category.icon}</div>
              <div className="text-sm font-medium text-gray-700 mb-1">Ürün bulunamadı</div>
              <div className="text-xs text-gray-400">Farklı bir marka seç veya filtreyi kaldır</div>
              <Link href={"/kategori/" + slug} className="text-xs text-[#E8460A] mt-3 block hover:underline">
                Filtreyi kaldır →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
              {products.map((p) => (
                <Link href={"/urun/" + p.slug} key={p.id}>
                  {(() => {
                    const priceList = visibleListingsOf(p);
                    const minPrice = priceList?.length
                      ? priceList.reduce((m, x) => (x.price ?? Infinity) < (m.price ?? Infinity) ? x : m, priceList[0])
                      : null;
                    const offerCount = getActiveOfferCount(p.prices, kaynak ?? null);
                    const freshestSeenAt = getFreshestSeenAt(p.prices, kaynak ?? null);
                    return (
                      <div className="bg-white border border-[#E8E4DF] rounded-2xl overflow-hidden hover:shadow-lg hover:border-[#E8460A]/30 transition-all group">
                        <div className="h-44 bg-white flex items-center justify-center overflow-hidden">
                          {p.image_url
                            ? <img src={p.image_url} alt={p.title} className="h-full w-full object-contain p-4 group-hover:scale-105 transition-transform duration-300" />
                            : <span className="text-5xl">{category.icon}</span>
                          }
                        </div>
                        <div className="p-3 pb-2">
                          <div className="text-[10px] font-bold text-[#E8460A] uppercase tracking-wider mb-0.5">{p.brand}</div>
                          <div className="text-xs font-medium text-gray-800 leading-snug line-clamp-2 min-h-[2.5rem] mb-2">
                            {getDiscoveryProductLabel(p)}
                          </div>
                          {minPrice ? (
                            <>
                            <div className="flex items-baseline justify-between gap-2">
                              <div className="text-sm font-bold text-gray-900">{Number(minPrice.price).toLocaleString("tr-TR")} <span className="text-xs font-normal text-gray-400">₺</span></div>
                              {offerCount > 1 && (
                                <span className="text-[9px] text-gray-500 font-medium bg-gray-100 rounded-full px-1.5 py-0.5">
                                  {offerCount} satıcı
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-[10px] text-gray-400">
                              Son fiyat: {formatFreshnessLabel(freshestSeenAt)}
                            </div>
                            </>
                          ) : (
                            <div className="text-xs text-[#E8460A] font-semibold">Fiyatları Karşılaştır →</div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </Link>
              ))}
            </div>
          )}
        </div>
            </>
          );
        })()}
      </div>

      <Footer />
    </main>
  );
}
