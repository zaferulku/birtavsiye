import { supabase } from "../../lib/supabase";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { fetchChildCategories, fetchDescendantIds, modelFamilyToSlug } from "../../lib/categoryTree";
import type { Metadata } from "next";

export const revalidate = 120;

type PageProps = { params: Promise<{ segments: string[] }> };
type CategoryNode = { id: string; slug: string; name: string; parent_id: string | null; icon: string | null };

async function resolveSegments(segments: string[]) {
  // "anasayfa" prefix'ini yok say (breadcrumb-as-URL konvansiyonu)
  if (segments[0] === "anasayfa") segments = segments.slice(1);

  const { data: allCatsData } = await supabase
    .from("categories")
    .select("id, slug, name, parent_id, icon");
  const allCats = (allCatsData ?? []) as CategoryNode[];
  const bySlug = new Map(allCats.map(c => [c.slug, c]));

  const categories: CategoryNode[] = [];
  let idx = 0;

  while (idx < segments.length) {
    const seg = segments[idx];
    const cat = bySlug.get(seg);
    if (!cat) break;
    if (categories.length > 0) {
      const prev = categories[categories.length - 1];
      if (cat.parent_id !== prev.id) break;
    } else if (cat.parent_id) {
      break;
    }
    categories.push(cat);
    idx++;
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

export default async function Page({ params }: PageProps) {
  const { segments } = await params;
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

  // === CASE 1: kategori zinciri (brand yok) ===
  if (!brandSlug) {
    const children = leafCategory ? await fetchChildCategories(leafCategory.id) : [];

    const { data: productsData, count } = await supabase
      .from("products")
      .select("id, slug, title, brand, model_family, image_url, prices(price)", { count: "exact" })
      .in("category_id", descendantIds.length > 0 ? descendantIds : [leafCategory?.id ?? ""])
      .order("created_at", { ascending: false })
      .limit(60);

    type Row = { id: string; slug: string; title: string; brand: string | null; model_family: string | null; image_url: string | null; prices: { price: number }[] | null };
    const products = (productsData ?? []) as unknown as Row[];

    return (
      <main className="bg-white min-h-screen">
        <Header />
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-4 md:py-6">
          <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 text-xs md:text-sm text-gray-500 mb-5">
            {breadcrumbLinks.map((b, i) => (
              <span key={b.href} className="flex gap-2">
                {i > 0 && <span>/</span>}
                {i === breadcrumbLinks.length - 1
                  ? <span className="text-gray-800 font-semibold">{b.label}</span>
                  : <Link href={b.href} className="hover:text-[#E8460A]">{b.label}</Link>}
              </span>
            ))}
          </nav>

          <div className="flex items-end justify-between mb-4">
            <h1 className="text-2xl md:text-3xl font-bold">{leafCategory?.name ?? "Kategori"}</h1>
            <span className="text-xs text-gray-500">{count ?? 0} ürün</span>
          </div>

          {children.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-6">
              {children.map(c => (
                <Link key={c.id} href={`/anasayfa/${[...acc, c.slug].join("/")}`} className="bg-white border border-gray-100 rounded-xl p-3 text-center hover:border-[#E8460A] hover:shadow-sm transition">
                  <div className="text-2xl mb-1">{c.icon ?? "📦"}</div>
                  <div className="text-xs font-semibold text-gray-800">{c.name}</div>
                </Link>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {products.map(p => {
              const minP = (p.prices ?? []).length > 0 ? Math.min(...p.prices!.map(x => x.price)) : null;
              return (
                <Link key={p.id} href={`/urun/${p.slug}`} className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-md hover:border-gray-300 transition group">
                  <div className="relative aspect-square bg-white">
                    {p.image_url
                      ? <Image src={p.image_url} alt={p.title} fill className="object-contain p-3 group-hover:scale-105 transition" sizes="(max-width: 768px) 50vw, 20vw" />
                      : <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>}
                  </div>
                  <div className="p-2">
                    {p.brand && <div className="text-[9px] font-bold text-[#E8460A] uppercase truncate">{p.brand}</div>}
                    <div className="text-[11px] font-medium text-gray-800 line-clamp-2 leading-tight">{p.title}</div>
                    {minP && <div className="text-sm font-bold mt-1">{minP.toLocaleString("tr-TR")} <span className="text-[10px] text-gray-400">TL</span></div>}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  // === CASE 2: kategori + brand ===
  if (brandSlug && !modelSlug) {
    const brandGuess = brandSlug.replace(/-/g, " ");

    const { data: productsData } = await supabase
      .from("products")
      .select("id, slug, brand, model_family, image_url, category_id, source, prices(price)")
      .ilike("brand", brandGuess)
      .in("category_id", descendantIds.length > 0 ? descendantIds : [leafCategory?.id ?? ""])
      .not("model_family", "is", null)
      .limit(1000);

    type Row = { id: string; slug: string; brand: string | null; model_family: string | null; image_url: string | null; category_id: string | null; source: string | null; prices: { price: number }[] | null };
    const rows = (productsData ?? []) as unknown as Row[];

    if (rows.length === 0) {
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

    const actualBrand = rows[0].brand ?? brandGuess;
    const GENERIC_EXCLUDE = /^(Kılıf|Kılıfı|Ekran\s*Koruyucu|Aksesuar|Batarya|Adaptör|Kordon|Kayış|Tablet|Akıllı\s*Saat|Android\s*Tablet|Android\s*Telefon|Güç\s*Kablosu|Hoparlör|Mouse|Klavye|Powerbank)$/i;

    type Group = { rep: Row; count: number; minPrice: number };
    const groups = new Map<string, Group>();
    for (const p of rows) {
      const mf = p.model_family!;
      if (GENERIC_EXCLUDE.test(mf)) continue;
      const priceList = p.prices ?? [];
      const minP = priceList.length > 0 ? Math.min(...priceList.map(x => x.price)) : Infinity;
      const existing = groups.get(mf);
      if (!existing) {
        groups.set(mf, { rep: p, count: 1, minPrice: minP });
      } else {
        existing.count += 1;
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
                <div className="font-semibold text-sm mt-3 line-clamp-2">{mf}</div>
                <div className="text-xs text-gray-500 mt-1">{info.count} seçenek</div>
                {isFinite(info.minPrice) && <div className="text-[#E8460A] font-bold mt-1">{info.minPrice.toLocaleString("tr-TR")} TL&apos;den</div>}
              </Link>
            ))}
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  // === CASE 3: kategori + brand + model → mevcut marka/[brand]/[model]'e yönlendir
  if (brandSlug && modelSlug) {
    redirect(`/marka/${brandSlug}/${modelSlug}`);
  }

  notFound();
}
