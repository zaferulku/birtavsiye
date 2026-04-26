import { supabaseAdmin } from "../../../lib/supabaseServer";
import Header from "../layout/Header";
import Footer from "../layout/Footer";
import Link from "next/link";
import Image from "next/image";
import { fetchCategoryPath } from "../../../lib/categoryTree";
import {
  getActiveOfferCount,
  formatFreshnessLabel,
  getFreshestSeenAt,
  getLowestActivePrice,
  getUniqueActiveSources,
  sourceTrustScore,
} from "../../../lib/listingSignals";
import { mergeClusteredProducts } from "../../../lib/productCluster";

type PriceRow = {
  id: string;
  price: number;
  source: string | null;
  is_active?: boolean | null;
  in_stock?: boolean | null;
  last_seen?: string | null;
};
type Row = {
  id: string;
  slug: string;
  title: string;
  brand: string | null;
  model_code: string | null;
  model_family: string | null;
  image_url: string | null;
  variant_storage: string | null;
  variant_color: string | null;
  category_id: string | null;
  created_at: string | null;
  specs: Record<string, unknown> | null;
  prices: PriceRow[] | null;
};

function isAccessoryTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  const t = title.toLowerCase().replace(/İ/g, "i").replace(/I/g, "ı").replace(/Ş/g, "ş").replace(/Ç/g, "ç").replace(/Ğ/g, "ğ").replace(/Ü/g, "ü").replace(/Ö/g, "ö");
  const patterns = [
    /\bkordon\b/, /\bkayış\b/, /\bkılıf\b/, /\btelefon\s*kılıfı?\b/,
    /\bkasa\s*koruyucu\b/, /\bekran\s*koruyucu\b/, /\bcam\s*koruyucu\b/,
    /\bşarj\s*kablos/, /\bmanyetik\s*kablo/,
    /\buyumlu\s*(kordon|kayış|kılıf|pil|batarya|koruyucu|şarj)/,
    /\bstrap\b/, /\bband[- ]\d+/, /\b(hasır|metal|silikon|spor|örgü)\s*kordon/,
    /\bpil\s*(batarya)?\s*a\d{4}/, /\bbatarya\s*a\d{4}/,
    /\baksesuar\b/, /\bparasoley\b/, /\bmenteşe\b/,
  ];
  return patterns.some(re => re.test(t));
}

export default async function ModelPageView({ brand, model }: { brand: string; model: string }) {
  const brandGuess = brand.replace(/-/g, " ");
  const modelGuess = model.replace(/-/g, " ");

  const { data } = await supabaseAdmin
    .from("products")
    .select("id, slug, title, brand, model_code, model_family, image_url, variant_storage, variant_color, category_id, created_at, specs, prices:listings(id, price, source, last_seen, is_active, in_stock)")
    .ilike("brand", brandGuess)
    .ilike("model_family", modelGuess)
    .limit(200);

  const rows = (data ?? []) as unknown as Row[];
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

  if (mergedRows.length === 0) {
    return (
      <main className="bg-white min-h-screen">
        <Header />
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h1 className="font-bold text-2xl mb-4">Model bulunamadı</h1>
          <Link href="/" className="text-[#E8460A]">Anasayfaya dön</Link>
        </div>
        <Footer />
      </main>
    );
  }

  const actualBrand = mergedRows[0].brand ?? brandGuess;
  const actualModel = modelGuess.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  const catCounts = new Map<string, number>();
  for (const r of mergedRows) {
    if (r.category_id) catCounts.set(r.category_id, (catCounts.get(r.category_id) ?? 0) + 1);
  }
  const dominantCatId = [...catCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const categoryPath = dominantCatId ? await fetchCategoryPath(dominantCatId) : [];

  const minPriceOf = (r: Row): number => {
    return getLowestActivePrice(r.prices) ?? Infinity;
  };

  const trustOf = (row: Row): number => {
    const sources = getUniqueActiveSources(row.prices);
    return sources.length > 0 ? Math.max(...sources.map((source) => sourceTrustScore(source ?? null))) : 0;
  };

  const legitByTitleInitial = mergedRows.filter(r => !isAccessoryTitle(r.title));
  const legitByTitle = legitByTitleInitial.length > 0 ? legitByTitleInitial : mergedRows;
  const allMinPrices = legitByTitle.map(minPriceOf).filter(p => isFinite(p) && p > 0).sort((a, b) => a - b);
  const medianPrice = allMinPrices.length > 0 ? allMinPrices[Math.floor(allMinPrices.length / 2)] : 0;
  const minValidPrice = medianPrice > 1000 ? medianPrice * 0.6 : 0;

  const legitRowsFiltered = legitByTitle.filter(r => {
    const mp = minPriceOf(r);
    if (!isFinite(mp)) return true;
    return mp >= minValidPrice;
  });
  const legitRows = legitRowsFiltered.length > 0 ? legitRowsFiltered : legitByTitle;

  type VariantGroup = { rep: Row; minPrice: number; count: number; image: string | null };
  const groups = new Map<string, VariantGroup>();
  for (const r of legitRows) {
    const key = `${r.variant_storage ?? ""}|${r.variant_color ?? ""}`;
    const mp = minPriceOf(r);
    const existing = groups.get(key);
    if (!existing) {
        groups.set(key, { rep: r, minPrice: mp, count: getActiveOfferCount(r.prices), image: r.image_url });
        continue;
      }
      existing.count += getActiveOfferCount(r.prices);
    if (mp < existing.minPrice) existing.minPrice = mp;
    const curTrust = trustOf(existing.rep);
    const newTrust = trustOf(r);
    if (newTrust > curTrust || (newTrust === curTrust && mp < minPriceOf(existing.rep))) {
      existing.rep = r;
      existing.image = r.image_url;
    }
  }

  const variants = [...groups.values()].sort((a, b) => a.minPrice - b.minPrice);
  const cheapest = variants[0];
  const samplePrice = cheapest && isFinite(cheapest.minPrice) ? cheapest.minPrice : null;

  const brandHref = categoryPath.length > 0
    ? `/anasayfa/${categoryPath.map(c => c.slug).join("/")}/${brand}`
    : "/";

  return (
    <main className="bg-white min-h-screen">
      <Header />
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-4 md:py-6">
        <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 text-xs md:text-sm text-gray-500 mb-5">
          <Link href="/" className="hover:text-[#E8460A] flex-shrink-0">Anasayfa</Link>
          {categoryPath.map((c) => (
            <span key={c.id} className="flex gap-2">
              <span className="flex-shrink-0">/</span>
              <Link href={`/anasayfa/${categoryPath.slice(0, categoryPath.indexOf(c) + 1).map(x => x.slug).join("/")}`} className="hover:text-[#E8460A] flex-shrink-0">{c.name}</Link>
            </span>
          ))}
          <span className="flex gap-2">
            <span className="flex-shrink-0">/</span>
            <Link href={brandHref} className="hover:text-[#E8460A] flex-shrink-0">{actualBrand}</Link>
          </span>
          <span className="flex gap-2 min-w-0">
            <span className="flex-shrink-0">/</span>
            <span className="text-gray-800 font-semibold truncate">{actualModel}</span>
          </span>
        </nav>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{actualBrand} {actualModel}</h1>
            <div className="text-sm text-gray-500 mt-1">{variants.length} varyant · {rows.length} satıcı</div>
          </div>
          {samplePrice !== null && (
            <div className="text-right">
              <div className="text-xs text-gray-500">En ucuz varyanttan</div>
              <div className="text-xl font-bold text-[#E8460A]">{samplePrice.toLocaleString("tr-TR")} TL&apos;den</div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
          {variants.map((v, i) => {
            const freshestSeenAt = getFreshestSeenAt(v.rep.prices);
            return (
            <Link key={i} href={`/urun/${v.rep.slug}`} className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md hover:border-gray-300 transition group">
              <div className="relative aspect-square bg-white">
                {v.image ? (
                  <Image src={v.image} alt={v.rep.title} fill className="object-contain p-3 group-hover:scale-105 transition-transform" sizes="(max-width: 768px) 50vw, 20vw" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>
                )}
              </div>
              <div className="p-3">
                <div className="flex flex-wrap gap-1 mb-2">
                  {v.rep.variant_storage && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{v.rep.variant_storage}</span>
                  )}
                  {v.rep.variant_color && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-[#E8460A]">{v.rep.variant_color}</span>
                  )}
                </div>
                {isFinite(v.minPrice) ? (
                  <div>
                    <div className="font-bold text-sm">{v.minPrice.toLocaleString("tr-TR")} <span className="text-[10px] font-normal text-gray-400">TL&apos;den</span></div>
                    <div className="mt-1 text-[10px] text-gray-400">Son fiyat: {formatFreshnessLabel(freshestSeenAt)}</div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400">Fiyat yok</div>
                )}
              </div>
            </Link>
          )})}
        </div>
      </div>
      <Footer />
    </main>
  );
}
