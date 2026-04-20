import { supabase } from "../../../lib/supabase";
import Link from "next/link";
import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";
import ProductGallery from "../../components/urun/ProductGallery";
import ProductInfo from "../../components/urun/ProductInfo";
import SpecsTable from "../../components/urun/SpecsTable";
import CommunitySection from "../../components/urun/CommunitySection";
import StoreLogo from "../../components/ui/StoreLogo";
import PriceHistoryChart from "../../components/urun/PriceHistoryChart";
import PriceAlertModal from "../../components/urun/PriceAlertModal";
import PriceRefresher from "../../components/urun/PriceRefresher";
import VariantSwitcher from "../../components/urun/VariantSwitcher";
import { fetchCategoryPath, brandToSlug, modelFamilyToSlug } from "../../../lib/categoryTree";
import type { Metadata } from "next";

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const { data: product } = await supabase
    .from("products").select("title, description, brand, image_url").eq("slug", slug).maybeSingle();

  if (!product) return { title: "Ürün Bulunamadı" };

  const title = `${product.title}${product.brand ? ` - ${product.brand}` : ""}`;
  const description = product.description
    ? product.description.slice(0, 155)
    : `${title} fiyatları, özellikleri ve kullanıcı tavsiyeleri`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: product.image_url ? [{ url: product.image_url }] : undefined,
    },
  };
}

export default async function UrunDetay({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ s?: string; c?: string }>;
}) {
  const { slug } = await params;
  const { s: storageParam, c: colorParam } = await searchParams;

  const { data: baseProduct } = await supabase
    .from("products").select("*").eq("slug", slug).maybeSingle();

  // Aynı brand+model_family tüm variant satırları
  let siblings = baseProduct ? [baseProduct] : [];
  if (baseProduct?.brand && baseProduct?.model_family) {
    const { data } = await supabase
      .from("products")
      .select("id, slug, title, brand, image_url, specs, category_id, model_family, variant_storage, variant_color")
      .eq("brand", baseProduct.brand)
      .eq("model_family", baseProduct.model_family);
    if (data?.length) siblings = data;
  }

  // Variant matrix: (storage, color) -> product row[]
  const variantMap = new Map<string, typeof siblings>();
  for (const s of siblings) {
    const key = `${s.variant_storage ?? ""}|${s.variant_color ?? ""}`;
    const arr = variantMap.get(key) ?? [];
    arr.push(s);
    variantMap.set(key, arr);
  }

  const storages = [...new Set(siblings.map(s => s.variant_storage).filter(Boolean) as string[])]
    .sort((a, b) => {
      const na = parseInt(a, 10);
      const nb = parseInt(b, 10);
      const unitA = a.toUpperCase().includes("TB") ? 1000 : 1;
      const unitB = b.toUpperCase().includes("TB") ? 1000 : 1;
      return (na * unitA) - (nb * unitB);
    });
  const colors = [...new Set(siblings.map(s => s.variant_color).filter(Boolean) as string[])].sort();

  // Seçili variant
  const selectedStorage = storageParam ?? baseProduct?.variant_storage ?? storages[0] ?? null;
  const selectedColor = colorParam ?? baseProduct?.variant_color ?? colors[0] ?? null;
  const selectedKey = `${selectedStorage ?? ""}|${selectedColor ?? ""}`;
  const selectedProducts = variantMap.get(selectedKey) ?? (baseProduct ? [baseProduct] : []);
  const product = selectedProducts[0] ?? baseProduct;

  // Variants meta (her variant'ın min fiyatı için count lazım — basit count yeterli)
  const variants = [...variantMap.entries()].map(([key, arr]) => {
    const [st, col] = key.split("|");
    return {
      storage: st || null,
      color: col || null,
      count: arr.length,
      minPrice: null as number | null,
      anyInStock: true,
    };
  });

  // Seçili variant'ın tüm product id'lerinden fiyatlar
  const variantIds = selectedProducts.map(p => p.id).filter(Boolean);
  type PriceRow = { id: string; product_id: string; price: number; affiliate_url: string | null; store_id: string; stores: { name: string; url: string | null } | null };
  let pricesRaw: PriceRow[] = [];
  if (variantIds.length > 0) {
    const { data } = await supabase
      .from("prices").select("*, stores(name, url)")
      .in("product_id", variantIds)
      .order("price", { ascending: true });
    pricesRaw = (data ?? []) as PriceRow[];
  }

  // Aynı product_id'de birden fazla fiyat varsa en düşüğünü tut
  // (ama PttAVM gibi marketplace'ler aynı ürünü farklı merchant'larla satıyor —
  // her listing farklı product_id → hepsini göster, sadece 1 row/product_id/store)
  const pricesByProd = new Map<string, PriceRow>();
  for (const p of pricesRaw) {
    const key = `${p.product_id}|${p.stores?.name ?? p.store_id}`;
    const existing = pricesByProd.get(key);
    if (!existing || p.price < existing.price) pricesByProd.set(key, p);
  }
  const prices = [...pricesByProd.values()].sort((a, b) => a.price - b.price);

  const { data: history } = await supabase
    .from("price_history")
    .select("recorded_at, price, stores(name)")
    .in("product_id", variantIds.length > 0 ? variantIds : [product?.id])
    .order("recorded_at", { ascending: true })
    .limit(300);

  const { data: reviews } = await supabase
    .from("community_posts").select("rating")
    .eq("product_id", product?.id).is("parent_id", null)
    .not("rating", "is", null);

  const reviewCount = reviews?.length || 0;
  const avgRating = reviewCount > 0
    ? Math.round(reviews!.reduce((acc, r) => acc + (r.rating || 0), 0) / reviewCount)
    : 0;

  if (!product) {
    return (
      <main>
        <Header />
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h1 className="font-bold text-2xl mb-4">Urun bulunamadi</h1>
          <Link href="/" className="text-[#E8460A]">Anasayfaya don</Link>
        </div>
        <Footer />
      </main>
    );
  }

  const minPrice = prices && prices.length > 0 ? prices[0].price : null;
  const cheapestStore = prices && prices.length > 0 ? prices[0].stores?.name : null;

  const categoryPath = await fetchCategoryPath(product.category_id ?? null);

  return (
    <main className="bg-gray-50 min-h-screen">
      <Header />
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-4 md:py-6">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 text-xs md:text-sm text-gray-400 mb-4 md:mb-5">
          <Link href="/" className="hover:text-[#E8460A] flex-shrink-0">Anasayfa</Link>
          {categoryPath.map((c) => (
            <span key={c.id} className="flex gap-2">
              <span className="flex-shrink-0">/</span>
              <Link href={`/kategori/${c.slug}`} className="hover:text-[#E8460A] flex-shrink-0">{c.name}</Link>
            </span>
          ))}
          {product.brand && (
            <span className="flex gap-2">
              <span className="flex-shrink-0">/</span>
              <Link href={`/marka/${brandToSlug(product.brand)}`} className="hover:text-[#E8460A] flex-shrink-0">{product.brand}</Link>
            </span>
          )}
          {product.brand && product.model_family && (
            <span className="flex gap-2">
              <span className="flex-shrink-0">/</span>
              <Link
                href={`/marka/${brandToSlug(product.brand)}/${modelFamilyToSlug(product.model_family)}`}
                className="hover:text-[#E8460A] flex-shrink-0"
              >
                {product.model_family}
              </Link>
            </span>
          )}
          <span className="flex gap-2 min-w-0">
            <span className="flex-shrink-0">/</span>
            <span className="text-gray-700 truncate">{product.title}</span>
          </span>
        </nav>

        {/* Üst Bölüm: Resim + Bilgi + Fiyat */}
        <div className="bg-white rounded-2xl p-3 sm:p-5 md:p-6 mb-4 md:mb-6 shadow-sm">
          <div className="grid gap-5 md:gap-6 lg:gap-8 grid-cols-1 md:grid-cols-2 lg:[grid-template-columns:2fr_3fr_2fr]">
            <ProductGallery imageUrl={product.image_url} />
            <div className="space-y-5">
              <ProductInfo product={product} avgRating={avgRating} reviewCount={reviewCount} />
              {(storages.length > 1 || colors.length > 1) && (
                <div className="border-t border-gray-100 pt-4">
                  <VariantSwitcher
                    slug={slug}
                    storages={storages}
                    colors={colors}
                    selectedStorage={selectedStorage}
                    selectedColor={selectedColor}
                    variants={variants}
                  />
                </div>
              )}
            </div>
            <div className="lg:sticky lg:top-20 md:col-span-2 lg:col-span-1">
              <div className="bg-white border-2 border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-gray-900 px-5 py-5">
                  <div className="text-xs text-gray-400 mb-1">En ucuz fiyat{cheapestStore ? ` - ${cheapestStore}` : ""}</div>
                  <div className="font-extrabold text-3xl text-white">
                    {minPrice ? Number(minPrice).toLocaleString("tr-TR") + " TL" : "Fiyat bekleniyor"}
                  </div>
                </div>
                {cheapestStore && prices && prices.length > 0 && (
                  <a href={prices[0].affiliate_url || prices[0].stores?.url || "#"} target="_blank" rel="nofollow sponsored"
                    className="block w-full bg-[#E8460A] text-white py-3 text-sm font-bold hover:bg-[#C93A08] transition-all text-center">
                    {cheapestStore} sitesine git →
                  </a>
                )}
                <div>
                  {prices?.map((p, i) => (
                    <div key={p.id} className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 border-b border-gray-50 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? "bg-yellow-100 text-yellow-700" : i === 1 ? "bg-gray-100 text-gray-500" : "bg-orange-50 text-orange-600"}`}>
                        {i + 1}
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                        <StoreLogo name={p.stores?.name ?? ""} size={18} />
                        <span className="text-xs sm:text-sm font-medium text-gray-800 truncate">{p.stores?.name}</span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-bold text-xs sm:text-sm whitespace-nowrap">{Number(p.price).toLocaleString("tr-TR")} TL</div>
                        {i === 0 && <div className="text-[10px] sm:text-xs text-green-600 font-medium">En ucuz</div>}
                        {i > 0 && minPrice && (
                          <div className="text-[10px] sm:text-xs text-red-400">+{(Number(p.price) - Number(minPrice)).toLocaleString("tr-TR")} TL</div>
                        )}
                      </div>
                      <a href={p.affiliate_url || p.stores?.url || "#"} target="_blank" rel="nofollow sponsored"
                        className="bg-orange-50 text-[#E8460A] text-xs px-3 py-2 rounded-lg font-semibold hover:bg-[#E8460A] hover:text-white transition-all flex-shrink-0 min-h-11 min-w-11 flex items-center justify-center">
                        Git
                      </a>
                    </div>
                  ))}
                </div>
                <PriceAlertModal productId={product.id} currentPrice={minPrice} />
              </div>
            </div>
          </div>
        </div>

        {/* Teknik Özellikler */}
        <SpecsTable specs={product.specs ?? null} />

        {/* Fiyat Geçmişi */}
        {history && history.length > 0 && (
          <div className="bg-white rounded-2xl p-3 sm:p-5 md:p-6 mb-4 md:mb-6 shadow-sm overflow-hidden">
            <PriceHistoryChart history={history as any} />
          </div>
        )}

        {/* Yorumlar Bölümü - tam genişlik */}
        <div className="bg-white rounded-2xl p-3 sm:p-5 md:p-6 shadow-sm">
          <CommunitySection
            productId={product.id}
            specs={product.specs}
            categoryId={product.category_id}
          />
        </div>

      </div>
      <PriceRefresher productId={product.id} />
      <Footer />
    </main>
  );
}