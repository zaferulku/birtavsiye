/**
 * Identity refresh + tuple-based merge.
 *
 * Tüm products için inferProductIdentity yeniden çalıştırır:
 *  - brand normalize (APPLE → Apple, "iPhone X" → Apple)
 *  - model_family extract (numeric ID → "iPhone 17 Pro Max")
 *  - variant_storage normalize ("256 GB" → "256GB")
 *  - variant_color alias (blue → Mavi, vb.)
 *  - model_code extract (MG6U4TU/A)
 *
 * Sonra: aynı (brand, model_family, storage, color) tuple'a sahip canonical
 * row'ları multi-SKU safety check'i ile merge eder.
 *
 * Kapsamlı: tüm BRAND_TITLE_ALIASES + MODEL_FAMILY_OVERRIDES + COLOR_ALIASES +
 * isAccessoryTitle + extractModelCode aktif (productIdentity.ts'den import).
 *
 * Çalıştırma:
 *   npx tsx --env-file=.env.local scripts/refresh-identity.ts
 *   DRY_RUN=1 npx tsx --env-file=.env.local scripts/refresh-identity.ts
 */
import { createClient } from "@supabase/supabase-js";
import { inferProductIdentity } from "../src/lib/productIdentity";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const DRY = process.env.DRY_RUN === "1";

interface ProductRow {
  id: string;
  title: string | null;
  slug: string | null;
  brand: string | null;
  model_family: string | null;
  model_code: string | null;
  variant_storage: string | null;
  variant_color: string | null;
  specs?: Record<string, unknown> | null;
  created_at?: string;
}

async function fetchAll(columns: string): Promise<ProductRow[]> {
  const all: ProductRow[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await sb.from("products").select(columns).range(from, from + 499);
    if (error) {
      console.error("FETCH err:", error.message);
      break;
    }
    if (!data?.length) break;
    all.push(...(data as unknown as ProductRow[]));
    if (data.length < 500) break;
    from += 500;
    if (from % 2000 === 0) console.log(` fetched: ${all.length}`);
  }
  return all;
}

async function main() {
console.log(`=== PHASE 1: Identity refresh ${DRY ? "(DRY-RUN)" : ""} ===`);
const products = await fetchAll("id,title,brand,model_family,model_code,variant_storage,variant_color,specs");
console.log(`Total products: ${products.length}`);

let normalized = 0;
let fail = 0;
const startP1 = Date.now();
for (let i = 0; i < products.length; i++) {
  const p = products[i];
  if (!p.title) continue;

  const id = inferProductIdentity({
    title: p.title,
    brand: p.brand,
    specs: p.specs as Record<string, unknown> | undefined,
  });

  const patch: Record<string, string | null> = {};

  if (id.brand && id.brand !== p.brand && id.brand !== "Unknown" && id.brand !== "Iphone" && id.brand !== "Phone") {
    patch.brand = id.brand;
  }
  const mfNumeric = p.model_family && /^\d+$/.test(p.model_family);
  if ((mfNumeric || !p.model_family) && id.modelFamily) {
    patch.model_family = id.modelFamily;
  }
  if (id.variantStorage && id.variantStorage !== p.variant_storage && (!p.variant_storage || / /.test(p.variant_storage))) {
    patch.variant_storage = id.variantStorage;
  }
  if (id.variantColor && id.variantColor !== p.variant_color && (!p.variant_color || p.variant_color === p.variant_color.toLowerCase())) {
    patch.variant_color = id.variantColor;
  }
  if (id.modelCode && id.modelCode !== p.model_code) {
    patch.model_code = id.modelCode;
  }

  if (Object.keys(patch).length === 0) continue;

  if (DRY) {
    normalized++;
  } else {
    const { error } = await sb.from("products").update(patch).eq("id", p.id);
    if (error) {
      fail++;
      if (fail <= 3) console.log(`  FAIL ${p.id.slice(0, 8)}: ${error.message.slice(0, 80)}`);
    } else {
      normalized++;
    }
  }

  if ((i + 1) % 500 === 0) {
    console.log(` progress: ${i + 1}/${products.length} upd=${normalized}`);
  }
}
console.log(`PHASE 1 done in ${Math.round((Date.now() - startP1) / 1000)}s. Normalized: ${normalized} | fail: ${fail}`);

if (DRY) {
  console.log("\nDRY-RUN, Phase 2 atlandı.");
  process.exit(0);
}

// =====================================================
// PHASE 2: Tuple-based merge
// =====================================================
console.log("\n=== PHASE 2: Tuple merge ===");
const products2 = await fetchAll("id,title,slug,brand,model_family,model_code,variant_storage,variant_color,created_at");
console.log(`Refetched: ${products2.length}`);

const groups: Record<string, ProductRow[]> = {};
for (const p of products2) {
  if (!p.brand || !p.model_family || !p.variant_storage || !p.variant_color) continue;
  const key = [p.brand, p.model_family, p.variant_storage, p.variant_color]
    .map((s) => String(s).toLowerCase().trim())
    .join("|");
  (groups[key] = groups[key] || []).push(p);
}
const dups = Object.values(groups).filter((g) => g.length > 1);
console.log(`Tuple duplicate groups: ${dups.length} | fazlalık: ${dups.reduce((s, g) => s + g.length - 1, 0)}`);

let totalDel = 0;
let totalListings = 0;
let skipUnsafe = 0;
const startP2 = Date.now();
for (let gi = 0; gi < dups.length; gi++) {
  const group = dups[gi];

  // Multi-SKU safety: model_code'lar farklıysa SKIP (HP EliteBook KN29 vs KN30)
  const codes = new Set(group.map((p) => p.model_code).filter((c): c is string => Boolean(c)));
  if (codes.size > 1) {
    skipUnsafe++;
    continue;
  }

  // Winner = en çok listing'li, tie ise en eski
  const counts = await Promise.all(
    group.map(async (p) => {
      const { count } = await sb.from("listings").select("*", { count: "exact", head: true }).eq("product_id", p.id);
      return { p, n: count || 0 };
    }),
  );
  counts.sort((a, b) =>
    b.n !== a.n ? b.n - a.n : new Date(a.p.created_at!).getTime() - new Date(b.p.created_at!).getTime(),
  );
  const winner = counts[0].p;

  for (const { p: loser } of counts.slice(1)) {
    const { count: lc } = await sb.from("listings").update({ product_id: winner.id }, { count: "exact" }).eq("product_id", loser.id);
    totalListings += lc || 0;
    const { error } = await sb.from("products").delete().eq("id", loser.id);
    if (!error) totalDel++;
  }

  if ((gi + 1) % 20 === 0) {
    console.log(` merge progress: ${gi + 1}/${dups.length} del=${totalDel}`);
  }
}
console.log(
  `PHASE 2 done in ${Math.round((Date.now() - startP2) / 1000)}s. Deleted: ${totalDel} | Listings redirected: ${totalListings} | Skipped multi-SKU: ${skipUnsafe}`,
);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
