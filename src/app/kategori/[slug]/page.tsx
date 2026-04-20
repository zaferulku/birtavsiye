import { supabase } from "../../../lib/supabase";
import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";
import Link from "next/link";
import Image from "next/image";
import { fetchCategoryPath, fetchChildCategories, fetchDescendantIds } from "../../../lib/categoryTree";
import SortDropdown from "../../components/kategori/SortDropdown";
import { CATEGORY_IMAGE_OVERRIDES } from "../../../lib/categoryImageOverrides";

export const revalidate = 60;

export default async function KategoriSayfasi({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ marka?: string; model?: string; q?: string; siralama?: string; hafiza?: string; renk?: string; min?: string; max?: string }>;
}) {
  const { slug } = await params;
  const { marka, model, q, siralama, hafiza, renk, min, max } = await searchParams;

  const { data: category } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
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
      const { data: prodData } = await supabase
        .from("products")
        .select("image_url, category_id")
        .in("category_id", allDescIds)
        .not("image_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(1000);
      for (const row of prodData ?? []) {
        const childId = row.category_id ? catToChild.get(row.category_id) : null;
        if (childId && row.image_url && !childImageMap.has(childId)) {
          childImageMap.set(childId, row.image_url);
        }
      }
    }
  }


  // Variant dedup için daha geniş bir havuz çekip in-memory birleştiriyoruz
  let query = supabase
    .from("products")
    .select("id, title, slug, brand, description, image_url, model_family, variant_storage, variant_color, prices(price)", { count: "exact" })
    .in("category_id", descendantIds.length > 0 ? descendantIds : [category?.id ?? ""]);

  if (marka) query = query.eq("brand", marka);
  if (model) query = query.eq("model_family", model);
  if (q) query = query.ilike("title", `%${q}%`);

  if (siralama === "az") query = query.order("title", { ascending: true });
  else if (siralama === "za") query = query.order("title", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  // Paralel: ana ürün query + marka/model count (aynı descendantIds kullanıyor)
  const allBrandsPromise = supabase
    .from("products")
    .select("brand, model_family")
    .in("category_id", descendantIds.length > 0 ? descendantIds : [category?.id ?? ""]);
  const mainPromise = query.limit(300);
  const [mainRes, allRes] = await Promise.all([mainPromise, allBrandsPromise]);
  const { data: rawProducts, count } = mainRes;
  const allProducts = allRes.data;

  // Aynı (brand, model_family) birden fazla kayıt varsa sadece en ucuzunu listele
  type Row = NonNullable<typeof rawProducts>[number];
  const familyGroups = new Map<string, Row[]>();
  const singletons: Row[] = [];
  for (const p of rawProducts ?? []) {
    if (p.brand && p.model_family) {
      const key = `${p.brand}|${p.model_family}`;
      const arr = familyGroups.get(key) ?? [];
      arr.push(p);
      familyGroups.set(key, arr);
    } else {
      singletons.push(p);
    }
  }

  const minPriceOf = (p: Row): number => {
    const list = (p.prices as { price: number }[] | undefined) ?? [];
    return list.length > 0 ? Math.min(...list.map(x => x.price)) : Infinity;
  };

  const dedupedRepresentatives: (Row & { _variantCount?: number })[] = [];
  for (const arr of familyGroups.values()) {
    const sorted = arr.slice().sort((a, b) => minPriceOf(a) - minPriceOf(b));
    const rep = { ...sorted[0], _variantCount: arr.length };
    dedupedRepresentatives.push(rep);
  }

  let products = [...dedupedRepresentatives, ...singletons];

  // Filtreler
  if (hafiza) {
    products = products.filter(p => (p as any).variant_storage === hafiza);
  }
  if (renk) {
    products = products.filter(p => (p as any).variant_color === renk);
  }
  const minN = min ? Number(min) : null;
  const maxN = max ? Number(max) : null;
  if (minN != null || maxN != null) {
    products = products.filter(p => {
      const list = ((p as any).prices ?? []) as { price: number }[];
      if (list.length === 0) return false;
      const mp = Math.min(...list.map(x => x.price));
      if (minN != null && mp < minN) return false;
      if (maxN != null && mp > maxN) return false;
      return true;
    });
  }

  // Fiyata göre sıralama
  const getMin = (p: typeof products[number]): number => {
    const list = ((p as any).prices ?? []) as { price: number }[];
    return list.length > 0 ? Math.min(...list.map(x => x.price)) : Infinity;
  };
  if (siralama === "ucuz") products.sort((a, b) => getMin(a) - getMin(b));
  else if (siralama === "pahali") products.sort((a, b) => getMin(b) - getMin(a));

  products = products.slice(0, 96);

  // Filtre seçenekleri (sidebar için)
  const storageSet = new Set<string>();
  const colorSet = new Set<string>();
  (rawProducts ?? []).forEach(p => {
    if (p.variant_storage) storageSet.add(p.variant_storage);
    if (p.variant_color) colorSet.add(p.variant_color);
  });
  const storageOptions = [...storageSet].sort((a, b) => parseInt(a) - parseInt(b));
  const colorOptions = [...colorSet].sort();

  // allProducts yukarıda paralel fetch edildi (mainPromise ile birlikte)

  const brandCounts: Record<string, number> = {};
  const modelsByBrand: Record<string, Record<string, number>> = {};
  (allProducts || []).forEach(p => {
    if (p.brand) {
      brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1;
      if (p.model_family) {
        modelsByBrand[p.brand] = modelsByBrand[p.brand] ?? {};
        modelsByBrand[p.brand][p.model_family] = (modelsByBrand[p.brand][p.model_family] || 0) + 1;
      }
    }
  });
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
    rootSlug === "kozmetik" ? "Ürün" :
    rootSlug === "kitap-hobi" ? "Tip" :
    rootSlug === "evcil-hayvan" ? "Tip" :
    rootSlug === "anne-bebek" ? "Tip" :
    rootSlug === "spor-outdoor" ? "Tip" :
    rootSlug === "otomotiv" ? "Tip" :
    "Model";

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
            <span className="text-xs sm:text-sm text-gray-500 flex-shrink-0">{count || 0} ürün</span>
          </div>
        </div>
      </div>

      {/* Alt kategoriler (varsa) */}
      {children.length > 0 && (
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 pt-4">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3">
            {children.map((c) => {
              const img = CATEGORY_IMAGE_OVERRIDES[c.slug] ?? childImageMap.get(c.id);
              return (
                <Link
                  key={c.id}
                  href={`/kategori/${c.slug}`}
                  className="bg-white rounded-xl p-2 text-center shadow-sm hover:shadow-md hover:border-[#E8460A] border border-transparent transition group"
                >
                  <div className="relative w-full aspect-square mb-2 overflow-hidden rounded-lg bg-gray-50 flex items-center justify-center">
                    {img ? (
                      <Image
                        src={img}
                        alt={c.name}
                        fill
                        className="object-contain p-1 group-hover:scale-105 transition-transform"
                        sizes="(max-width: 640px) 33vw, (max-width: 1024px) 16vw, 12vw"
                      />
                    ) : (
                      <span className="text-3xl">{c.icon ?? "📦"}</span>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-gray-800 line-clamp-2">{c.name}</div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-4 sm:py-6 flex flex-col md:flex-row gap-4 md:gap-6">

        {(() => {
          const buildUrl = (overrides: Record<string, string | null>): string => {
            const params: Record<string, string | undefined> = { marka, model, q, siralama, hafiza, renk, min, max };
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
              {/* Sol: Filtreler sidebar */}
              <aside className="w-full md:w-60 flex-shrink-0 space-y-3">
                {/* Aktif filtreler (varsa) clear linki */}
                {(marka || model || q || hafiza || renk || min || max) && (
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
                        <div className={`flex items-center justify-between px-4 py-2 text-sm cursor-pointer transition-colors ${!marka ? "text-[#E8460A] font-semibold bg-orange-50" : "text-gray-700 hover:bg-gray-50"}`}>
                          <span>Tümü</span>
                          <span className="text-xs text-gray-400">{count || 0}</span>
                        </div>
                      </Link>
                      {brands.map((b) => {
                        const isSelected = marka === b.name;
                        return (
                          <div key={b.name}>
                            <Link href={buildUrl({ marka: isSelected ? null : b.name, model: null })}>
                              <div className={`flex items-center justify-between px-4 py-2 text-sm cursor-pointer transition-colors ${isSelected ? "text-[#E8460A] font-semibold bg-orange-50" : "text-gray-700 hover:bg-gray-50"}`}>
                                <span className="flex items-center gap-1">
                                  <span className={`inline-block transition-transform ${isSelected ? "rotate-90" : ""}`}>›</span>
                                  {b.name}
                                </span>
                                <span className="text-xs text-gray-400">{b.count}</span>
                              </div>
                            </Link>
                            {isSelected && modelsForSelected.length > 0 && (
                              <div className="bg-gray-50 border-l-2 border-[#E8460A] ml-4">
                                <Link href={buildUrl({ model: null })}>
                                  <div className={`flex items-center justify-between px-4 py-1.5 text-xs cursor-pointer transition-colors ${!model ? "text-[#E8460A] font-semibold" : "text-gray-600 hover:bg-gray-100"}`}>
                                    <span>Tüm {subLabel.toLowerCase()} seçenekleri</span>
                                    <span className="text-gray-400">{b.count}</span>
                                  </div>
                                </Link>
                                {modelsForSelected.map(m => (
                                  <Link key={m.name} href={buildUrl({ model: model === m.name ? null : m.name })}>
                                    <div className={`flex items-center justify-between px-4 py-1.5 text-xs cursor-pointer transition-colors ${model === m.name ? "text-[#E8460A] font-semibold" : "text-gray-600 hover:bg-gray-100"}`}>
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
                          <div className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all ${hafiza === s ? "bg-[#E8460A] text-white border-[#E8460A]" : "border-gray-200 text-gray-700 hover:border-[#E8460A]"}`}>{s}</div>
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
                          <div className={`px-4 py-2 text-sm cursor-pointer transition-colors ${renk === c ? "text-[#E8460A] font-semibold bg-orange-50" : "text-gray-700 hover:bg-gray-50"}`}>
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
                          <div className={`px-4 py-2 text-sm cursor-pointer transition-colors ${active ? "text-[#E8460A] font-semibold bg-orange-50" : "text-gray-700 hover:bg-gray-50"}`}>
                            {r.label}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </aside>

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
                    {products?.length || 0} ürün
                  </div>
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
                    const priceList = (p as any).prices as { price: number }[] | undefined;
                    const minPrice = priceList?.length
                      ? priceList.reduce((m: { price: number }, x: { price: number }) => x.price < m.price ? x : m, priceList[0])
                      : null;
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
                            {(p as any).model_family && (p as any).brand
                              ? `${(p as any).brand} ${(p as any).model_family}`
                              : p.title}
                          </div>
                          {minPrice ? (
                            <div className="flex items-baseline justify-between gap-2">
                              <div className="text-sm font-bold text-gray-900">{Number(minPrice.price).toLocaleString("tr-TR")} <span className="text-xs font-normal text-gray-400">₺</span></div>
                              {(p as any)._variantCount > 1 && (
                                <span className="text-[9px] text-gray-500 font-medium bg-gray-100 rounded-full px-1.5 py-0.5">
                                  {(p as any)._variantCount} seçenek
                                </span>
                              )}
                            </div>
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
