/**
 * Product comparison page: /karsilastir?ids=id1,id2,id3
 * Side-by-side comparison of 2-4 products in same/compatible category.
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";

type ComparisonProduct = {
  id: string;
  slug: string;
  title: string;
  brand: string | null;
  model_family: string | null;
  variant_storage: string | null;
  variant_color: string | null;
  image_url: string | null;
  specs: Record<string, any> | null;
  category_id: string;
  category_name: string;
  category_slug: string;
  min_price: number | null;
  listing_count: number;
};

async function loadComparison(productIds: string[]): Promise<{
  products: ComparisonProduct[];
  categoryMatch: boolean;
}> {
  if (productIds.length < 2 || productIds.length > 4) {
    return { products: [], categoryMatch: false };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("products")
    .select(`
      id, slug, title, brand, model_family, variant_storage, variant_color,
      image_url, specs, category_id,
      category:categories!inner(id, slug, name),
      listings!inner(price, is_active)
    `)
    .in("id", productIds)
    .eq("is_active", true);

  if (error || !data) return { products: [], categoryMatch: false };

  const products: ComparisonProduct[] = (data as any[]).map((p) => {
    const activePrices = p.listings
      .filter((l: any) => l.is_active)
      .map((l: any) => Number(l.price));
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      brand: p.brand,
      model_family: p.model_family,
      variant_storage: p.variant_storage,
      variant_color: p.variant_color,
      image_url: p.image_url,
      specs: p.specs,
      category_id: p.category_id,
      category_name: p.category.name,
      category_slug: p.category.slug,
      min_price: activePrices.length > 0 ? Math.min(...activePrices) : null,
      listing_count: activePrices.length,
    };
  });

  const ordered = productIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is ComparisonProduct => p !== undefined);

  const categoryMatch = new Set(ordered.map((p) => p.category_id)).size === 1;
  return { products: ordered, categoryMatch };
}

type ComparisonAttribute = {
  key: string;
  label: string;
  values: Array<{ productId: string; display: string; raw: any }>;
  winnerIds: string[];
  comparisonType: "higher" | "lower" | "boolean" | "categorical";
};

const ATTRIBUTE_LABELS: Record<string, { label: string; type: ComparisonAttribute["comparisonType"] }> = {
  "display.size_inches": { label: "Ekran Boyutu (inç)", type: "higher" },
  "display.resolution": { label: "Çözünürlük", type: "categorical" },
  "display.refresh_rate_hz": { label: "Yenileme Hızı (Hz)", type: "higher" },
  "display.technology": { label: "Ekran Teknolojisi", type: "categorical" },
  "processor.name": { label: "İşlemci", type: "categorical" },
  "processor.cores": { label: "Çekirdek Sayısı", type: "higher" },
  "memory.ram_gb": { label: "RAM (GB)", type: "higher" },
  "memory.storage_gb": { label: "Depolama (GB)", type: "higher" },
  "camera.main_mp": { label: "Ana Kamera (MP)", type: "higher" },
  "camera.front_mp": { label: "Ön Kamera (MP)", type: "higher" },
  "camera.telephoto_mp": { label: "Telefoto (MP)", type: "higher" },
  "battery.capacity_mah": { label: "Batarya (mAh)", type: "higher" },
  "battery.charging_w": { label: "Şarj Gücü (W)", type: "higher" },
  "physical.weight_g": { label: "Ağırlık (g)", type: "lower" },
  "physical.water_resistance": { label: "Su Dayanımı", type: "categorical" },
  "physical.colors": { label: "Renkler", type: "categorical" },
  "connectivity.5g": { label: "5G", type: "boolean" },
  "connectivity.nfc": { label: "NFC", type: "boolean" },
  "connectivity.wifi": { label: "Wi-Fi", type: "categorical" },
  "connectivity.bluetooth": { label: "Bluetooth", type: "categorical" },
  "graphics.discrete": { label: "Ekran Kartı", type: "categorical" },
  "storage.type": { label: "Depolama Tipi", type: "categorical" },
  "battery.claimed_hours": { label: "Pil Ömrü (saat)", type: "higher" },
  "os.name": { label: "İşletim Sistemi", type: "categorical" },
};

function buildComparisonAttributes(products: ComparisonProduct[]): ComparisonAttribute[] {
  const flatSpecs = products.map((p) => ({
    productId: p.id,
    flat: p.specs ? flattenObject(p.specs) : {},
  }));

  const keyCount = new Map<string, number>();
  for (const { flat } of flatSpecs) {
    for (const k of Object.keys(flat)) {
      keyCount.set(k, (keyCount.get(k) ?? 0) + 1);
    }
  }

  const candidateKeys = Array.from(keyCount.entries())
    .filter(([k, count]) => count >= 2 && ATTRIBUTE_LABELS[k])
    .map(([k]) => k);

  const orderedKeys = Object.keys(ATTRIBUTE_LABELS).filter((k) => candidateKeys.includes(k));

  const attributes: ComparisonAttribute[] = [];

  for (const key of orderedKeys) {
    const meta = ATTRIBUTE_LABELS[key];
    const values = flatSpecs.map(({ productId, flat }) => ({
      productId,
      display: formatValue(flat[key], meta.type),
      raw: flat[key],
    }));

    const winnerIds = determineWinners(values, meta.type);
    attributes.push({ key, label: meta.label, values, winnerIds, comparisonType: meta.type });
  }

  return attributes;
}

function determineWinners(
  values: Array<{ productId: string; raw: any }>,
  type: ComparisonAttribute["comparisonType"]
): string[] {
  const valid = values.filter((v) => v.raw !== null && v.raw !== undefined);
  if (valid.length < 2) return [];

  switch (type) {
    case "higher": {
      const nums = valid
        .map((v) => ({ id: v.productId, n: parseNumber(v.raw) }))
        .filter((x): x is { id: string; n: number } => x.n !== null);
      if (nums.length < 2) return [];
      const max = Math.max(...nums.map((x) => x.n));
      return nums.filter((x) => max - x.n < max * 0.02).map((x) => x.id);
    }
    case "lower": {
      const nums = valid
        .map((v) => ({ id: v.productId, n: parseNumber(v.raw) }))
        .filter((x): x is { id: string; n: number } => x.n !== null);
      if (nums.length < 2) return [];
      const min = Math.min(...nums.map((x) => x.n));
      return nums.filter((x) => x.n - min < min * 0.02).map((x) => x.id);
    }
    case "boolean": {
      const truthy = valid.filter((v) => Boolean(v.raw));
      if (truthy.length > 0 && truthy.length < valid.length) {
        return truthy.map((v) => v.productId);
      }
      return [];
    }
    case "categorical":
      return [];
  }
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}): Promise<Metadata> {
  const { ids } = await searchParams;
  const productIds = (ids ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  if (productIds.length < 2) {
    return { title: "Karşılaştırma — birtavsiye" };
  }

  const { products } = await loadComparison(productIds);
  if (products.length < 2) {
    return { title: "Karşılaştırma — birtavsiye" };
  }

  const titles = products.map((p) => p.title).join(" vs ");
  return {
    title: truncate(`${titles} Karşılaştırma — birtavsiye`, 60),
    description: truncate(
      `${titles} ürünlerini yan yana karşılaştır. Fiyat, özellik ve mağaza bilgisi tek sayfada.`,
      160
    ),
    alternates: {
      canonical: `/karsilastir?ids=${productIds.join(",")}`,
    },
  };
}

export default async function ComparisonPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids } = await searchParams;
  const productIds = (ids ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  if (productIds.length < 2) {
    return (
      <>
        <Header />
        <div className="comparison-error">
          <h1>En az 2 ürün seçin</h1>
          <p>Karşılaştırma sayfasına ürün seçmeden gelinmiş. Bir kategori sayfasından 2-4 ürün seçerek karşılaştırabilirsiniz.</p>
          <Link href="/" className="btn">Anasayfaya dön</Link>
          <style>{COMPARISON_STYLES}</style>
        </div>
        <Footer />
      </>
    );
  }

  const { products, categoryMatch } = await loadComparison(productIds);

  if (products.length < 2) {
    notFound();
  }

  if (!categoryMatch) {
    return (
      <>
        <Header />
        <div className="comparison-error">
          <h1>Bu ürünler karşılaştırılamaz</h1>
          <p>Seçtiğiniz ürünler farklı kategorilerde. Adil bir karşılaştırma için aynı kategorideki ürünleri seçin.</p>
          <ul>
            {products.map((p) => (
              <li key={p.id}>
                <a href={`/urun/${p.slug}`}>{p.title}</a> — {p.category_name}
              </li>
            ))}
          </ul>
          <Link href="/" className="btn">Anasayfaya dön</Link>
          <style>{COMPARISON_STYLES}</style>
        </div>
        <Footer />
      </>
    );
  }

  const attributes = buildComparisonAttributes(products);
  const categoryName = products[0].category_name;

  const priced = products.filter((p) => p.min_price !== null);
  const cheapestId = priced.length > 0
    ? priced.reduce((a, b) => (a.min_price! < b.min_price! ? a : b)).id
    : null;

  return (
    <>
      <Header />
      <article className="comparison-page">
        <header className="comparison-header">
        <nav className="breadcrumb" aria-label="Navigasyon">
          <Link href="/">Anasayfa</Link>
          <span aria-hidden="true"> › </span>
          <Link href={`/anasayfa/${products[0].category_slug}`}>{categoryName}</Link>
          <span aria-hidden="true"> › </span>
          <span>Karşılaştırma</span>
        </nav>
        <h1>{products.map((p) => p.title).join(" vs ")}</h1>
        <p className="subtitle">{products.length} ürün yan yana</p>
      </header>

      <div className="comparison-table-wrapper">
        <table className="comparison-table">
          <thead>
            <tr>
              <th scope="col" className="label-col"></th>
              {products.map((p) => (
                <th key={p.id} scope="col" className="product-col">
                  <div className="product-head">
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_url} alt={p.title} className="product-img" />
                    ) : (
                      <div className="product-img-placeholder" aria-hidden="true" />
                    )}
                    <a href={`/urun/${p.slug}`} className="product-link">
                      {p.title}
                    </a>
                    {p.brand && <span className="product-brand">{p.brand}</span>}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="row-price">
              <th scope="row">En Düşük Fiyat</th>
              {products.map((p) => (
                <td key={p.id} className={p.id === cheapestId ? "cell-winner" : ""}>
                  {p.min_price !== null ? (
                    <>
                      <strong>{formatTL(p.min_price)}</strong>
                      <span className="price-meta">{p.listing_count} mağaza</span>
                      {p.id === cheapestId && <span className="winner-chip">En Uygun</span>}
                    </>
                  ) : (
                    <span className="na">Fiyat yok</span>
                  )}
                </td>
              ))}
            </tr>

            {products.some((p) => p.variant_storage) && (
              <tr>
                <th scope="row">Depolama</th>
                {products.map((p) => (
                  <td key={p.id}>{p.variant_storage ?? <span className="na">—</span>}</td>
                ))}
              </tr>
            )}
            {products.some((p) => p.variant_color) && (
              <tr>
                <th scope="row">Renk</th>
                {products.map((p) => (
                  <td key={p.id}>{p.variant_color ?? <span className="na">—</span>}</td>
                ))}
              </tr>
            )}

            {attributes.map((attr) => (
              <tr key={attr.key}>
                <th scope="row">{attr.label}</th>
                {attr.values.map((v) => {
                  const isWinner = attr.winnerIds.includes(v.productId);
                  return (
                    <td key={v.productId} className={isWinner ? "cell-winner" : ""}>
                      {v.display || <span className="na">—</span>}
                      {isWinner && attr.winnerIds.length < products.length && (
                        <span className="winner-check" aria-label="Bu daha iyi">✓</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr>
              <th scope="row"></th>
              {products.map((p) => (
                <td key={p.id}>
                  <a href={`/urun/${p.slug}`} className="cta">
                    Ürün Detayı
                  </a>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      <style>{COMPARISON_STYLES}</style>
    </article>
      <Footer />
    </>
  );
}

function flattenObject(obj: Record<string, any>, prefix = ""): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flattenObject(v, key));
    } else {
      out[key] = v;
    }
  }
  return out;
}

function formatValue(v: any, type: ComparisonAttribute["comparisonType"]): string {
  if (v === null || v === undefined) return "";
  if (type === "boolean") return v ? "Var" : "Yok";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

function parseNumber(v: unknown): number | null {
  if (typeof v === "number" && !isNaN(v)) return v;
  if (typeof v === "string") {
    const parsed = parseFloat(v);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

function formatTL(n: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(n);
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}

const COMPARISON_STYLES = `
  .comparison-page { max-width: 1400px; margin: 0 auto; padding: 24px 16px; }
  .comparison-header { margin-bottom: 24px; }
  .breadcrumb { font-size: 0.875rem; color: var(--text-muted, #6b7280); margin-bottom: 12px; }
  .breadcrumb a { color: var(--text-muted, #6b7280); text-decoration: none; }
  .breadcrumb a:hover { color: var(--text, #111); text-decoration: underline; }
  .comparison-header h1 { margin: 0 0 4px; font-size: 1.5rem; line-height: 1.3; }
  .subtitle { margin: 0; color: var(--text-muted, #6b7280); font-size: 0.9375rem; }
  .comparison-table-wrapper { overflow-x: auto; border: 1px solid var(--border, #e5e7eb); border-radius: 12px; background: #fff; }
  .comparison-table { width: 100%; border-collapse: collapse; min-width: 640px; }
  .comparison-table th, .comparison-table td { padding: 12px 16px; border-bottom: 1px solid var(--border-subtle, #f3f4f6); text-align: left; vertical-align: top; }
  .comparison-table tbody tr:last-child th, .comparison-table tbody tr:last-child td { border-bottom: 1px solid var(--border, #e5e7eb); }
  .label-col { width: 18%; min-width: 140px; background: var(--surface-subtle, #f9fafb); font-weight: 500; color: var(--text-muted, #6b7280); font-size: 0.875rem; }
  .product-col { padding: 16px; text-align: center; border-left: 1px solid var(--border-subtle, #f3f4f6); background: var(--surface-subtle, #f9fafb); }
  .product-head { display: flex; flex-direction: column; align-items: center; gap: 8px; }
  .product-img, .product-img-placeholder { width: 100px; height: 100px; object-fit: contain; background: #fff; border-radius: 8px; }
  .product-img-placeholder { background: linear-gradient(135deg, #f3f4f6, #e5e7eb); }
  .product-link { font-size: 0.875rem; font-weight: 500; color: var(--text, #111); text-decoration: none; line-height: 1.3; }
  .product-link:hover { text-decoration: underline; }
  .product-brand { font-size: 0.75rem; color: var(--text-muted, #6b7280); }
  .comparison-table tbody td { font-size: 0.9375rem; color: var(--text, #111); border-left: 1px solid var(--border-subtle, #f3f4f6); }
  .comparison-table tbody th { font-weight: 500; color: var(--text-muted, #6b7280); font-size: 0.875rem; background: var(--surface-subtle, #fafafa); }
  .cell-winner { background: var(--success-soft, #ecfdf5); font-weight: 500; position: relative; }
  .winner-check { display: inline-block; margin-left: 6px; color: var(--success, #059669); font-weight: 700; }
  .winner-chip { display: inline-block; margin-left: 8px; padding: 2px 8px; background: var(--accent, #dc2626); color: #fff; font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.05em; border-radius: 4px; font-weight: 600; }
  .row-price strong { font-size: 1.125rem; font-weight: 700; color: var(--accent, #dc2626); display: block; }
  .price-meta { font-size: 0.75rem; color: var(--text-muted, #6b7280); }
  .na { color: var(--text-muted, #9ca3af); font-style: italic; }
  .cta { display: inline-block; padding: 8px 16px; background: var(--accent, #dc2626); color: #fff; font-size: 0.875rem; text-decoration: none; border-radius: 6px; font-weight: 500; }
  .cta:hover { background: var(--accent-hover, #b91c1c); }
  .comparison-table tfoot td { text-align: center; padding: 16px; background: var(--surface-subtle, #f9fafb); }
  .comparison-error { max-width: 600px; margin: 60px auto; padding: 32px; text-align: center; }
  .comparison-error h1 { margin: 0 0 12px; font-size: 1.25rem; }
  .comparison-error .btn { display: inline-block; margin-top: 16px; padding: 10px 20px; background: var(--accent, #dc2626); color: #fff; text-decoration: none; border-radius: 8px; }
`;
