/**
 * Yanlış-bağlanmış listing'leri doğru canonical'a relink eder.
 *
 * Geçmiş: Eski migrate sırasında listing matching çok gevşekti — aksesuar
 * listing'leri (kılıf/kapak/şarj/lens) telefon canonical'larına yanlış
 * eşleştirildi. Bu script:
 *   1. Aksesuar source_title'lı + akilli-telefon canonical'a bağlı listing'leri çeker
 *   2. Her biri için inferProductIdentity ile yeni identity üret
 *   3. resolveExistingProduct ile aksesuar canonical bul, yoksa yarat
 *   4. listing.product_id'yi yeni canonical'a yönlendir
 *
 * Çalıştırma:
 *   npx tsx --env-file=.env.local scripts/relink-misplaced-listings.ts
 *   DRY_RUN=1 npx tsx --env-file=.env.local scripts/relink-misplaced-listings.ts
 */
import { createClient } from "@supabase/supabase-js";
import {
  inferProductIdentity,
  resolveExistingProduct,
  buildProductCreatePayload,
} from "../src/lib/productIdentity";
import { trMatchKeyword } from "../src/lib/turkishNormalize";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const DRY = process.env.DRY_RUN === "1";

// Aksesuar göstergeleri (source_title'da varsa listing aksesuar)
const ACC_KEYWORDS = [
  "uyumlu", "kılıf", "kapak", "case", "cover",
  "ekran koruyucu", "cam koruyucu", "kamera lens", "kamera koruma",
  "kordon", "kayış", "tutucu", "stand",
  "şarj kablo", "powerbank", "kulaklık", "airpods kapak", "airpods kılıf",
  "lens koruyucu", "iç speaker", "iç hoparlör",
];

// Title pattern → target slug
const PATTERN_TO_SLUG: Array<[RegExp, string]> = [
  [/(şarj kablo|şarj alet|şarj cihaz|şarj adaptör|usb-c kablo|lightning kablo|qi2|kablosuz şarj|magsafe.*şarj)/i, "sarj-kablo"],
  [/(powerbank|power bank|taşınabilir şarj|harici batarya)/i, "powerbank"],
  [/(ekran koruyucu|cam koruyucu|tempered glass|temperli cam|9d cam|9h cam|kırılmaz cam|nano cam|hayalet ekran|jelly cam|seramik koruyucu)/i, "ekran-koruyucu"],
  [/(bluetooth kulaklık|kablosuz kulaklık|tws kulaklık|earbuds|airpods (?!kapak|kılıf))/i, "ses-kulaklik"],
  [/(iç speaker|iç hoparlör|lcd panel|lcd dokunmatik|yedek pil|yedek batarya|orjinal pil|sim tray|şarj soketi|vibratör motor|titreşim motoru|flex kablo)/i, "telefon-yedek-parca"],
  [/(selfie çubuğu|selfie stick|popsocket|telefon tutucu|araç tutucu|stylus kalem|lens koruyucu|kamera lens koruyucu|gimbal|tripod)/i, "telefon-aksesuar"],
  [/(kılıf|kapak|case|cover|airbag|cüzdanlı|silikon kapak|deri kılıf|magsafe kılıf)/i, "telefon-kilifi"],
];

interface ListingRow {
  id: string;
  source_title: string | null;
  product_id: string | null;
  source_url: string | null;
}

async function main() {
  console.log(`=== Relink misplaced listings ${DRY ? "(DRY-RUN)" : ""} ===`);

  const { data: cats } = await sb.from("categories").select("id,slug");
  const slugToId = new Map<string, string>(
    (cats ?? []).map((c) => [c.slug, c.id])
  );
  const PHONE_CAT = slugToId.get("akilli-telefon");
  if (!PHONE_CAT) throw new Error("akilli-telefon kategorisi bulunamadı");

  // Aksesuar source_title'lı + akilli-telefon canonical'a bağlı listing'leri çek
  const candidates: ListingRow[] = [];
  let from = 0;
  while (true) {
    const { data } = await sb
      .from("listings")
      .select("id,source_title,product_id,source_url,products!inner(category_id)")
      .eq("is_active", true)
      .range(from, from + 999);
    if (!data?.length) break;
    for (const l of data) {
      const t = l.source_title || "";
      const isAcc = ACC_KEYWORDS.some((kw) => trMatchKeyword(t, kw));
      // @ts-expect-error nested type
      const cat = l.products?.category_id;
      if (isAcc && cat === PHONE_CAT) {
        candidates.push(l as ListingRow);
      }
    }
    if (data.length < 1000) break;
    from += 1000;
  }
  console.log(`Yanlış-bağlanmış aksesuar listing: ${candidates.length}`);

  let relinked = 0;
  let createdNew = 0;
  let skipped = 0;
  let fail = 0;
  const startTime = Date.now();

  for (let i = 0; i < candidates.length; i++) {
    const listing = candidates[i];
    const title = listing.source_title!;

    let targetSlug: string | null = null;
    for (const [pat, slug] of PATTERN_TO_SLUG) {
      if (pat.test(title)) {
        targetSlug = slug;
        break;
      }
    }
    if (!targetSlug) {
      skipped++;
      continue;
    }
    const targetCatId = slugToId.get(targetSlug);
    if (!targetCatId) {
      skipped++;
      continue;
    }

    const identity = inferProductIdentity({ title });

    let canonicalId: string | null = null;
    const existing = await resolveExistingProduct({ sb, identity, categoryId: targetCatId });
    if (existing) {
      canonicalId = existing.id;
    } else {
      if (DRY) {
        createdNew++;
        relinked++;
        continue;
      }
      const payload = buildProductCreatePayload({
        identity,
        categoryId: targetCatId,
        imageUrl: null,
        specs: undefined,
      });
      const { data: newProd, error } = await sb.from("products").insert(payload).select("id").single();
      if (error || !newProd) {
        const altSlug = identity.slug + "-" + Math.random().toString(36).slice(2, 6);
        const { data: retry } = await sb
          .from("products")
          .insert({ ...payload, slug: altSlug })
          .select("id")
          .single();
        if (!retry) {
          fail++;
          continue;
        }
        canonicalId = retry.id;
      } else {
        canonicalId = newProd.id;
      }
      createdNew++;
    }

    if (!canonicalId) {
      fail++;
      continue;
    }

    if (DRY) {
      relinked++;
      continue;
    }

    const { error } = await sb.from("listings").update({ product_id: canonicalId }).eq("id", listing.id);
    if (error) {
      fail++;
      if (fail <= 3) console.log(`  FAIL ${listing.id.slice(0, 8)}: ${error.message.slice(0, 80)}`);
    } else {
      relinked++;
    }

    if ((i + 1) % 25 === 0) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(` progress: ${i + 1}/${candidates.length} | relinked=${relinked} new=${createdNew} skip=${skipped} fail=${fail} | ${elapsed}s`);
    }
  }

  const totalSec = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n=== SONUC (${totalSec}s) ===`);
  console.log(`Total candidate:  ${candidates.length}`);
  console.log(`Relinked:         ${relinked}`);
  console.log(`New canonical:    ${createdNew}`);
  console.log(`Skipped (no-tgt): ${skipped}`);
  console.log(`Failed:           ${fail}`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
