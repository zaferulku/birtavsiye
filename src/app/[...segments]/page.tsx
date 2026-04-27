import { supabaseAdmin } from "../../lib/supabaseServer";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { fetchDescendantIds, modelFamilyToSlug } from "../../lib/categoryTree";
import type { Metadata } from "next";
import KategoriSayfasi from "../kategori/[slug]/page";
import ModelPageView from "../components/marka/ModelPageView";
import { resolveCategorySlug } from "../../lib/categoryAliases";
import { mergeClusteredProducts } from "../../lib/productCluster";
import { getActiveOfferCount, getLowestActivePrice } from "../../lib/listingSignals";
import {
  getDiscoveryProductLabel,
  shouldHideDiscoveryProduct,
} from "../../lib/productDiscovery";

export const revalidate = 120;

type PageProps = {
  params: Promise<{ segments: string[] }>;
  searchParams: Promise<Record<string, string | undefined>>;
};
type CategoryNode = { id: string; slug: string; name: string; parent_id: string | null; icon: string | null };

async function resolveSegments(segments: string[]) {
  // "anasayfa" prefix'ini yok say (breadcrumb-as-URL konvansiyonu)
  if (segments[0] === "anasayfa") segments = segments.slice(1);

  const { data: allCatsData } = await supabaseAdmin
    .from("categories")
    .select("id, slug, name, parent_id, icon");
  const allCats = (allCatsData ?? []) as CategoryNode[];
  const bySlug = new Map(allCats.map(c => [c.slug, c]));
  const byId = new Map(allCats.map(c => [c.id, c]));

  const categories: CategoryNode[] = [];
  let idx = 0;

  while (idx < segments.length) {
    const seg = resolveCategorySlug(segments[idx]);
    const cat = bySlug.get(seg);
    if (!cat) break;
    if (categories.length > 0) {
      const prev = categories[categories.length - 1];
      if (cat.parent_id !== prev.id) break;
    }
    categories.push(cat);
    idx++;
  }

  if (categories.length > 0 && categories[0].parent_id) {
    const expanded: CategoryNode[] = [];
    let currentParentId: string | null = categories[0].parent_id;

    while (currentParentId) {
      const parent = byId.get(currentParentId);
      if (!parent) break;
      expanded.unshift(parent);
      currentParentId = parent.parent_id;
    }

    categories.unshift(...expanded);
  }

  const brandSlug = segments[idx] ?? null;
  const modelSlug = segments[idx + 1] ?? null;

  return { categories, brandSlug, modelSlug };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { segments } = await params;
  const { categories, brandSlug, modelSlug } = await resolveSegments(segments);
  const parts = [...categories.map(c => c.name)];
  if (brandSlug) parts.push(brandSlug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()));
  if (modelSlug) parts.push(modelSlug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()));
  const title = parts.join(" - ") || "birtavsiye";
  return { title, description: `${title} — fiyat karşılaştırma ve tavsiyeler.` };
}

export default async function Page({ params, searchParams }: PageProps) {
  const { segments } = await params;
  const sp = await searchParams;
  const { categories, brandSlug, modelSlug } = await resolveSegments(segments);

  if (categories.length === 0 && !brandSlug) notFound();

  const breadcrumbLinks: { href: string; label: string }[] = [{ href: "/", label: "Anasayfa" }];
  let acc: string[] = [];
  for (const c of categories) {
    acc = [...acc, c.slug];
    breadcrumbLinks.push({ href: "/anasayfa/" + acc.join("/"), label: c.name });
  }

  const leafCategory = categories[categories.length - 1] ?? null;
  const descendantIds = leafCategory ? await fetchDescendantIds(leafCategory.id) : [];

  // === CASE 1: kategori zinciri (brand yok) → kategori sayfasını render et
  // (filter sidebar, marka/model/hafıza/renk/fiyat filtreleri hepsi aktif) ===
  if (!brandSlug && leafCategory) {
    return (
      <KategoriSayfasi
        params={Promise.resolve({ slug: leafCategory.slug })}
        searchParams={Promise.resolve(sp)}
      />
    );
  }

  // === CASE 2: kategori + brand ===
  if (brandSlug && !modelSlug) {
    const brandGuess = brandSlug.replace(/-/g, " ");

    const { data: productsData } = await supabaseAdmin
      .from("products")
      .select("id, title, slug, brand, model_code, model_family, variant_storage, variant_color, image_url, category_id, created_at, prices:listings(id, price, source, last_seen, is_active, in_stock)")
      .ilike("brand", brandGuess)
      .in("category_id", descendantIds.length > 0 ? descendantIds : [leafCategory?.id ?? ""])
      .not("model_family", "is", null)
      .eq("is_active", true)
      .limit(1000);

    type Row = {
      id: string;
      title: string;
      slug: string;
      brand: string | null;
      model_code: string | null;
      model_family: string | null;
      variant_storage: string | null;
      variant_color: string | null;
      image_url: string | null;
      category_id: string | null;
      created_at: string | null;
      prices: {
        id: string;
        price: number;
        source: string | null;
        last_seen?: string | null;
        is_active?: boolean | null;
        in_stock?: boolean | null;
      }[] | null;
    };
    const rows = (productsData ?? []) as unknown as Row[];
    const mergedRows = mergeClusteredProducts(
      rows.map((row) => ({
        ...row,
        listings: (row.prices ?? []).map((listing) => ({
          ...listing,
          source: listing.source ?? null,
          last_seen: listing.last_seen ?? null,
        })),
      }))
    ).map((row) => ({
      ...row,
      prices: row.listings ?? [],
    }));

    const visibleRows = mergedRows.filter((row) => !shouldHideDiscoveryProduct(row));

    if (visibleRows.length === 0) {
      return (
        <main className="bg-white min-h-screen">
          <Header />
          <div className="max-w-6xl mx-auto px-6 py-20 text-center">
            <h1 className="font-bold text-2xl mb-4">Ürün bulunamadı</h1>
            <Link href="/" className="text-[#E8460A]">Anasayfaya dön</Link>
          </div>
          <Footer />
        </main>
      );
    }

    const actualBrand = visibleRows[0].brand ?? brandGuess;
    // Aksesuar/parça/kategori-mismatch model_family'leri liste sayfasında gösterme.
    // Bunlar genelde yanlış model_family'ye düşmüş ürünler (kategori re-eval gerekir).
    const GENERIC_EXCLUDE = /^(Kılıf|Kılıfı|Ekran\s*Koruyucu|Aksesuar|Batarya|Adaptör|Kordon|Kayış|Tablet|Akıllı\s*Saat|Android\s*Tablet|Android\s*Telefon|Güç\s*Kablosu|Hoparlör|Mouse|Klavye|Powerbank|Tripod|Ölçüm\s*Aletleri|Ölçüm|Ekran\s*Yansıtıcı|Yansıtıcı|Lens|Lens\s*Koruyucu|Kamera\s*Lens|Kamera\s*Koruma|Şarj|Şarj\s*Kablosu|Şarj\s*Aleti|Speaker|Mikrofon|Anten|Sim\s*Tray|Soket|Kapak|Gimbal|Tutucu|Stand|Stylus|Kalem|Yedek|Yedek\s*Pil|Yedek\s*Ekran|Yedek\s*Kamera|Filtre|Hortum|Torba|Motor|Vibratör|Anakart|Flex|Joko|PRANHA|Tkgz|Mettzchrom|Pdx|Cep|Akıllı|Eğitici|Paraply|Aptal|Yenilenmi|Yenilenmiş)$/i;

    type Group = { rep: Row; count: number; minPrice: number };
    const groups = new Map<string, Group>();
    for (const p of visibleRows) {
      const mf = p.model_family!;
      if (GENERIC_EXCLUDE.test(mf)) continue;
      const minP = getLowestActivePrice(p.prices) ?? Infinity;
      const existing = groups.get(mf);
      if (!existing) {
        groups.set(mf, { rep: p, count: getActiveOfferCount(p.prices), minPrice: minP });
      } else {
        existing.count += getActiveOfferCount(p.prices);
        if (minP < existing.minPrice) { existing.rep = p; existing.minPrice = minP; }
      }
    }
    const models = [...groups.entries()].sort((a, b) => a[1].minPrice - b[1].minPrice);

    return (
      <main className="bg-white min-h-screen">
        <Header />
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-4 md:py-6">
          <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 text-xs md:text-sm text-gray-500 mb-5">
            {breadcrumbLinks.map((b) => (
              <span key={b.href} className="flex gap-2">
                <Link href={b.href} className="hover:text-[#E8460A]">{b.label}</Link>
                <span>/</span>
              </span>
            ))}
            <span className="text-gray-800 font-semibold">{actualBrand}</span>
          </nav>

          <h1 className="text-2xl md:text-3xl font-bold mb-2">{actualBrand} Modelleri</h1>
          <div className="text-xs text-gray-500 mb-5">{models.length} model · {rows.length} ürün</div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {models.map(([mf, info]) => (
              <Link key={mf} href={`/anasayfa/${[...acc, brandSlug, modelFamilyToSlug(mf)].join("/")}`} className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition flex flex-col">
                <div className="relative w-full h-40 flex items-center justify-center">
                  {info.rep.image_url
                    ? <Image src={info.rep.image_url} alt={mf} fill className="object-contain" sizes="(max-width: 768px) 50vw, 25vw" />
                    : <div className="text-gray-300 text-4xl">📦</div>}
                </div>
                <div className="font-semibold text-sm mt-3 line-clamp-2">
                  {getDiscoveryProductLabel(info.rep, { includeBrand: false })}
                </div>
                <div className="text-xs text-gray-500 mt-1">{info.count} satıcı</div>
                {isFinite(info.minPrice) && <div className="text-[#E8460A] font-bold mt-1">{info.minPrice.toLocaleString("tr-TR")} TL&apos;den</div>}
              </Link>
            ))}
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  // === CASE 3: kategori + brand + model → ModelPageView component (hiyerarşik URL korunur)
  if (brandSlug && modelSlug) {
    return <ModelPageView brand={brandSlug} model={modelSlug} />;
  }

  notFound();
}
