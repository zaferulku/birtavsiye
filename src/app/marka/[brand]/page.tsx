import { supabase } from "../../../lib/supabase";
import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";
import Link from "next/link";
import Image from "next/image";
import { modelFamilyToSlug, fetchCategoryPath, fetchDescendantIds } from "../../../lib/categoryTree";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const revalidate = 120;

export async function generateMetadata(
  { params }: { params: Promise<{ brand: string }> }
): Promise<Metadata> {
  const { brand } = await params;
  const name = brand.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  return {
    title: `${name} Modelleri - Fiyat Karşılaştırması`,
    description: `${name} tüm modelleri ve en ucuz fiyatları birtavsiye.net'te.`,
  };
}

export default async function MarkaPage({ params }: { params: Promise<{ brand: string }> }) {
  const { brand: brandSlug } = await params;
  const brandGuess = brandSlug.replace(/-/g, " ");

  type Row = {
    id: string;
    slug: string;
    brand: string | null;
    model_family: string | null;
    image_url: string | null;
    category_id: string | null;
    prices: { price: number }[] | null;
  };

  const { data: products } = await supabase
    .from("products")
    .select("id, slug, brand, model_family, image_url, category_id, prices(price)")
    .ilike("brand", brandGuess)
    .not("model_family", "is", null)
    .limit(1000);

  const rows = (products ?? []) as Row[];

  if (rows.length === 0) {
    return (
      <main className="bg-white min-h-screen">
        <Header />
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h1 className="font-bold text-2xl mb-4">Marka bulunamadı</h1>
          <Link href="/" className="text-[#E8460A]">Anasayfaya dön</Link>
        </div>
        <Footer />
      </main>
    );
  }

  const actualBrand = rows[0].brand ?? brandGuess;

  // Dominant kategori (en çok ürünün olduğu) üzerinden breadcrumb chain çıkar
  const catCounts = new Map<string, number>();
  for (const r of rows) {
    if (r.category_id) catCounts.set(r.category_id, (catCounts.get(r.category_id) ?? 0) + 1);
  }
  const dominantCatId = [...catCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const categoryPath = dominantCatId ? await fetchCategoryPath(dominantCatId) : [];

  // URL hiyerarşiyle uyumlu olsun — dominant kategorinin tam zincirini kullanarak
  // hiyerarşik URL'e redirect
  if (categoryPath.length > 0) {
    const hierPath = categoryPath.map(c => c.slug).join("/");
    redirect(`/${hierPath}/${brandSlug}`);
  }

  // Breadcrumb ile URL içeriği uyumlu olsun: dominant kategorinin
  // root'undaki tüm descendants'ları al, sadece o kategorideki ürünleri göster.
  // (Apple sayfası "Akıllı Telefon" altındaysa → sadece telefon ürünleri;
  // MacBook/iPad Apple-altı ama farklı kategoride → ayrı marka sayfasına düşerler
  // ya da kategori filtresiyle ayrılırlar)
  let rowsInScope = rows;
  if (categoryPath.length > 0) {
    const rootCat = categoryPath[0]; // en üst seviye (Elektronik, Moda, vb.)
    const scopedIds = await fetchDescendantIds(rootCat.id);
    const scopedSet = new Set(scopedIds);
    rowsInScope = rows.filter(r => r.category_id && scopedSet.has(r.category_id));
  }

  // Jenerik/aksesuar model_family değerleri markaya özgü değildir, filtreleme
  // (Örn. Apple markası altında "Kılıf", "Ekran Koruyucu", "Android Tablet"
  // Apple marka ürünü olamaz — bu aksesuar/yanlış etiketlemeyi dışla)
  const GENERIC_EXCLUDE = /^(Kılıf|Kılıfı|Ekran\s*Koruyucu|Aksesuar|Aksesuarı|Batarya|Bataryası|Adaptör|Adaptörü|Kordon|Kayış|Kamera\s*Aksesuarı|Android\s*Tablet|Android\s*Telefon|Tablet\s*Kılıfı|Notebook\s*Bataryası|Notebook\s*Adaptörü|Tablet|Akıllı\s*Saat|Akıllı\s*Saatler|Güç\s*Kablosu|Güç\s*Kabloları|Tripod|Stand|Kablo|Kablolar|Hoparlör|Mouse|Klavye|Powerbank|Taşınabilir\s*Şarj)$/i;

  type Group = { rep: Row; count: number; minPrice: number };
  const groups = new Map<string, Group>();
  for (const p of rowsInScope) {
    const mf = p.model_family!;
    if (GENERIC_EXCLUDE.test(mf)) continue; // aksesuar filtrele

    const priceList = p.prices ?? [];
    const minP = priceList.length > 0 ? Math.min(...priceList.map(x => x.price)) : Infinity;
    const existing = groups.get(mf);
    if (!existing) {
      groups.set(mf, { rep: p, count: 1, minPrice: minP });
    } else {
      existing.count += 1;
      if (minP < existing.minPrice) {
        existing.rep = p;
        existing.minPrice = minP;
      }
    }
  }

  const models = [...groups.entries()].sort((a, b) => a[1].minPrice - b[1].minPrice);

  return (
    <main className="bg-white min-h-screen">
      <Header />
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-4 md:py-6">
        <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 text-xs md:text-sm text-gray-500 mb-4 md:mb-5">
          <Link href="/" className="hover:text-[#E8460A] flex-shrink-0">Anasayfa</Link>
          {categoryPath.map((c) => (
            <span key={c.id} className="flex gap-2">
              <span className="flex-shrink-0">/</span>
              <Link href={`/kategori/${c.slug}`} className="hover:text-[#E8460A] flex-shrink-0">{c.name}</Link>
            </span>
          ))}
          <span className="flex gap-2">
            <span className="flex-shrink-0">/</span>
            <span className="text-gray-800 font-semibold">{actualBrand}</span>
          </span>
        </nav>
        <h1 className="text-2xl md:text-3xl font-bold mb-6">{actualBrand} Modelleri</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {models.map(([mf, info]) => (
            <Link
              key={mf}
              href={`/marka/${brandSlug}/${modelFamilyToSlug(mf)}`}
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition flex flex-col"
            >
              <div className="relative w-full h-40 flex items-center justify-center">
                {info.rep.image_url ? (
                  <Image src={info.rep.image_url} alt={mf} fill className="object-contain" sizes="(max-width: 768px) 50vw, 25vw" />
                ) : (
                  <div className="text-gray-300 text-4xl">📦</div>
                )}
              </div>
              <div className="font-semibold text-sm mt-3 line-clamp-2">{mf}</div>
              <div className="text-xs text-gray-500 mt-1">{info.count} seçenek</div>
              {isFinite(info.minPrice) && (
                <div className="text-[#E8460A] font-bold mt-1">{info.minPrice.toLocaleString("tr-TR")} TL&apos;den</div>
              )}
            </Link>
          ))}
        </div>
      </div>
      <Footer />
    </main>
  );
}
