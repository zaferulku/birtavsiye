/**
 * Variant-mismatch split: aynı canonical'a yapışmış ama identity tuple'ı
 * (brand, model_family, storage, color) farklı olan listing'leri kendi
 * canonical'larına ayırır.
 *
 * Örn: apple-iphone-16-plus-8gb canonical'ında HEM Pembe HEM Laciverttaş
 * listing'i var. Pembe kendi (storage=256GB, color=Pembe) tuple'ına ait olmalı.
 *
 * Mantık:
 *   1. Her canonical'ın listing'lerini topla
 *   2. Her listing için inferProductIdentity(source_title) ile yeni identity üret
 *   3. Listing'in identity tuple'ı canonical'ın tuple'ı ile uyuşmuyorsa:
 *      - resolveExistingProduct ile doğru canonical'ı bul (kategori sınırı içinde)
 *      - Yoksa yeni canonical yarat
 *      - Listing'in product_id'sini doğru canonical'a yönlendir
 *
 * Sadece phone kategorisinde başlat — diğer kategorilerde variant kavramı farklı.
 *
 * Kullanım:
 *   DRY_RUN=1 npx tsx --env-file=.env.local scripts/split-variant-listings.ts
 *   npx tsx --env-file=.env.local scripts/split-variant-listings.ts
 */
import { createClient } from "@supabase/supabase-js";
import {
  inferProductIdentity,
  resolveExistingProduct,
  buildProductCreatePayload,
} from "../src/lib/productIdentity";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const DRY = process.env.DRY_RUN === "1";

interface CanonicalRow {
  id: string;
  title: string | null;
  brand: string | null;
  model_family: string | null;
  variant_storage: string | null;
  variant_color: string | null;
  category_id: string | null;
}
interface ListingRow {
  id: string;
  source_title: string | null;
  product_id: string;
}

function tupleKey(brand: string | null, family: string | null, storage: string | null, color: string | null) {
  return [
    (brand ?? "").toLowerCase().trim(),
    (family ?? "").toLowerCase().trim(),
    (storage ?? "").toLowerCase().trim(),
    (color ?? "").toLowerCase().trim(),
  ].join("|");
}

async function main() {
  console.log(`=== Split variant-mismatched listings ${DRY ? "(DRY-RUN)" : ""} ===`);

  const { data: phoneCat } = await sb.from("categories").select("id").eq("slug", "akilli-telefon").maybeSingle();
  if (!phoneCat) throw new Error("akilli-telefon kategorisi yok");
  const phoneCatId = phoneCat.id;

  const { data: prods } = await sb
    .from("products")
    .select("id, title, brand, model_family, variant_storage, variant_color, category_id, listings!inner(id)")
    .eq("category_id", phoneCatId)
    .eq("is_active", true)
    .limit(2000);

  const candidates: CanonicalRow[] = (prods ?? [])
    .filter((p: any) => Array.isArray(p.listings) && p.listings.length >= 2)
    .map((p: any) => ({
      id: p.id,
      title: p.title,
      brand: p.brand,
      model_family: p.model_family,
      variant_storage: p.variant_storage,
      variant_color: p.variant_color,
      category_id: p.category_id,
    }));
  console.log(`Multi-listing phone canonicals: ${candidates.length}`);

  let moved = 0;
  let createdNew = 0;
  let kept = 0;
  let fail = 0;
  const startTime = Date.now();

  for (let i = 0; i < candidates.length; i++) {
    const canon = candidates[i];

    const { data: listings } = await sb
      .from("listings")
      .select("id, source_title, product_id")
      .eq("product_id", canon.id);
    if (!listings?.length) continue;

    const canonKey = tupleKey(canon.brand, canon.model_family, canon.variant_storage, canon.variant_color);

    for (const listing of listings as ListingRow[]) {
      if (!listing.source_title) continue;
      const id = inferProductIdentity({ title: listing.source_title, brand: canon.brand });
      const lKey = tupleKey(id.brand, id.modelFamily, id.variantStorage, id.variantColor);

      if (lKey === canonKey || !id.modelFamily) {
        kept++;
        continue;
      }

      if ((id.brand ?? "").toLowerCase() !== (canon.brand ?? "").toLowerCase()) {
        kept++;
        continue;
      }
      if ((id.modelFamily ?? "").toLowerCase() !== (canon.model_family ?? "").toLowerCase()) {
        kept++;
        continue;
      }

      const existing = await resolveExistingProduct({ sb, identity: id, categoryId: canon.category_id ?? phoneCatId });
      let targetId: string | null = null;
      if (existing && existing.id !== canon.id) {
        targetId = existing.id;
      } else if (!existing) {
        if (DRY) {
          createdNew++;
          moved++;
          continue;
        }
        const payload = buildProductCreatePayload({
          identity: id,
          categoryId: canon.category_id ?? phoneCatId,
          imageUrl: null,
          specs: undefined,
        });
        const { data: newP, error } = await sb.from("products").insert(payload).select("id").single();
        if (error || !newP) {
          const altSlug = id.slug + "-" + Math.random().toString(36).slice(2, 6);
          const { data: retry } = await sb.from("products").insert({ ...payload, slug: altSlug }).select("id").single();
          if (!retry) { fail++; continue; }
          targetId = retry.id;
        } else {
          targetId = newP.id;
        }
        createdNew++;
      } else {
        kept++;
        continue;
      }

      if (!targetId) { fail++; continue; }

      if (DRY) { moved++; continue; }
      const { error } = await sb.from("listings").update({ product_id: targetId }).eq("id", listing.id);
      if (error) {
        fail++;
        if (fail <= 3) console.log(`  FAIL ${listing.id.slice(0, 8)}: ${error.message.slice(0, 80)}`);
      } else {
        moved++;
      }
    }

    if ((i + 1) % 50 === 0 || i + 1 === candidates.length) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(` progress: ${i + 1}/${candidates.length} | moved=${moved} new=${createdNew} kept=${kept} fail=${fail} | ${elapsed}s`);
    }
  }

  console.log(`\n=== SONUC ===`);
  console.log(`Canonical taranan: ${candidates.length}`);
  console.log(`Moved listings:    ${moved}`);
  console.log(`New canonicals:    ${createdNew}`);
  console.log(`Kept (match):      ${kept}`);
  console.log(`Failed:            ${fail}`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
