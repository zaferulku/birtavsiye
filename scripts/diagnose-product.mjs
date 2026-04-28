/**
 * Tekil ürün tanısı: variant alanları, listings, benzer canonical'lar.
 *
 * Calistirma:
 *   npx tsx --env-file=.env.local scripts/diagnose-product.mjs --slug=<urun-slug>
 *   npx tsx --env-file=.env.local scripts/diagnose-product.mjs --search="redmi note 15 pro 12"
 *   npx tsx --env-file=.env.local scripts/diagnose-product.mjs --slug=<slug> --search="<title-pattern>"
 *
 * Cikti:
 *   1) Product row (variant_storage, variant_color, model_family, brand)
 *   2) Bu canonical'a bagli listings (source, title, price, in_stock, is_active)
 *   3) Benzer title'da olup farkli canonical'a bagli listings (matching gap teshisi)
 */
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const args = process.argv.slice(2);
const slug = args.find((a) => a.startsWith("--slug="))?.split("=")[1];
const search = args.find((a) => a.startsWith("--search="))?.split("=")[1];

if (!slug && !search) {
  console.error("Kullanim: --slug=<slug> veya --search=<title-pattern>");
  process.exit(1);
}

async function dumpProduct(productId) {
  const { data: p, error } = await sb
    .from("products")
    .select("id, slug, title, brand, model_family, model_code, variant_storage, variant_color, category_id, is_active, created_at")
    .eq("id", productId)
    .single();
  if (error || !p) {
    console.error("Product bulunamadi:", error?.message);
    return null;
  }

  console.log("\n=== PRODUCT ===");
  console.log("  id:             ", p.id);
  console.log("  slug:           ", p.slug);
  console.log("  title:          ", p.title);
  console.log("  brand:          ", p.brand);
  console.log("  model_family:   ", p.model_family);
  console.log("  model_code:     ", p.model_code);
  console.log("  variant_storage:", p.variant_storage);
  console.log("  variant_color:  ", p.variant_color);
  console.log("  is_active:      ", p.is_active);

  const { data: listings, error: lErr } = await sb
    .from("listings")
    .select("id, source, source_title, price, in_stock, is_active, last_seen, warranty_type")
    .eq("product_id", productId)
    .order("price", { ascending: true });

  if (lErr) {
    console.error("Listings:", lErr.message);
    return p;
  }

  console.log("\n=== LISTINGS (" + (listings?.length ?? 0) + ") ===");
  for (const l of listings ?? []) {
    console.log(
      `  [${l.source}] ${l.is_active ? "A" : "-"}${l.in_stock ? "S" : "-"} ${Number(l.price).toFixed(0).padStart(7)}TL  ${l.warranty_type ?? ""}  ${l.source_title?.slice(0, 90)}`,
    );
  }

  return p;
}

async function searchSimilar(pattern) {
  console.log(`\n=== LISTINGS title ILIKE '%${pattern}%' (cross-canonical) ===`);
  const { data, error } = await sb
    .from("listings")
    .select("id, product_id, source, source_title, price, in_stock, is_active, warranty_type")
    .ilike("source_title", `%${pattern}%`)
    .order("source");

  if (error) {
    console.error("Search:", error.message);
    return;
  }

  console.log(`  ${data?.length ?? 0} listing bulundu, canonical'a gore gruplandi:`);
  const byProduct = new Map();
  for (const l of data ?? []) {
    if (!byProduct.has(l.product_id)) byProduct.set(l.product_id, []);
    byProduct.get(l.product_id).push(l);
  }

  for (const [pid, lst] of byProduct.entries()) {
    const { data: prod } = await sb
      .from("products")
      .select("slug, brand, model_family, variant_storage, variant_color")
      .eq("id", pid)
      .single();
    console.log(`\n  >> Canonical: ${pid}`);
    console.log(
      `     ${prod?.brand} | ${prod?.model_family} | storage=${prod?.variant_storage} color=${prod?.variant_color}`,
    );
    console.log(`     slug: ${prod?.slug}`);
    console.log(`     ${lst.length} listing:`);
    for (const l of lst) {
      console.log(
        `       [${l.source}] ${l.is_active ? "A" : "-"}${l.in_stock ? "S" : "-"} ${Number(l.price).toFixed(0).padStart(7)}TL ${l.warranty_type ?? ""}  ${l.title?.slice(0, 80)}`,
      );
    }
  }
}

if (slug) {
  const { data: p, error } = await sb
    .from("products")
    .select("id")
    .eq("slug", slug)
    .single();
  if (error || !p) {
    console.error("Slug bulunamadi:", slug, error?.message);
    process.exit(1);
  }
  await dumpProduct(p.id);
}

if (search) {
  await searchSimilar(search);
}

console.log("");
