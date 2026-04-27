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

// "uyumlu" en güçlü aftermarket göstergesi: aftermarket bir aksesuarın başlığı
// neredeyse her zaman "<Marka> <Model> uyumlu" kalıbıyla başlar.
const STRONG_AFTERMARKET = ["uyumlu"];

// Tek başına yüksek kesinlikle aksesuar belirten kelimeler (gerçek bir telefon/watch/
// tablet/kulaklık/buzdolabı başlığında nadiren bağımsız geçer).
const UNAMBIGUOUS_ACC = [
  "kılıf", "kapak",
  "ekran koruyucu", "cam koruyucu", "tempered glass", "temperli cam",
  "kamera lens koruyucu", "lens koruyucu", "kamera koruma lens",
  "şarj kablo", "şarj cihaz", "şarj adaptör", "data kablo",
  "powerbank", "power bank", "taşınabilir şarj",
  "airpods kapak", "airpods kılıf",
  "iç speaker", "iç hoparlör", "lcd panel", "yedek pil",
  "flash bellek", "usb hub", "otg kablo", "otg adaptör",
  "hafıza kartı", "sd kart", "micro sd", "memory card",
  "type c girişli flash",
  // Silikon kılıf çeşitleri ("Apple iPhone 16E Kelvin Kartvizitli Silikon - Bordo")
  // gerçek telefon başlığında geçmez. Kartvizit hazneli/bölmeli, mat silikon, vs.
  "kartvizitli", "kartvizit hazneli", "kartvizit bölmeli",
  "silikon - ", // "Silikon - Bordo" gibi suffix kalıbı (renk öncesi tire)
  "şeffaf silikon", "darbe emici silikon", "mat silikon",
  "kelvin kartvizit", "magsafe silikon",
];

const ACC_KEYWORDS = [...STRONG_AFTERMARKET, ...UNAMBIGUOUS_ACC];

// Listing aksesuar mı? "uyumlu" varsa kesin aftermarket — başka kelime şart değil.
// Yoksa kesin aksesuar kelimesi olmalı. ("case", "cover", "kordon", "kayış" gibi
// muğlak kelimeler tek başına yetmez — gerçek ürün başlığında da geçebiliyor.)
function isAccessoryListing(title: string): boolean {
  if (STRONG_AFTERMARKET.some((kw) => trMatchKeyword(title, kw))) return true;
  if (UNAMBIGUOUS_ACC.some((kw) => trMatchKeyword(title, kw))) return true;
  return false;
}

// Title pattern → target slug
const PATTERN_TO_SLUG: Array<[RegExp, string]> = [
  // Şarj/kablo (geniş)
  [/(şarj kablo|şarj alet|şarj cihaz|şarj adaptör|usb-c kablo|usb c kablo|lightning kablo|type-c kablo|type c kablo|qi2|kablosuz şarj|wireless charger|magsafe.*şarj|şarj seti|şarj istasyon|şarj dock|otg kablo|otg adaptör|usb hub|data kablo)/i, "sarj-kablo"],
  // Powerbank
  [/(powerbank|power bank|taşınabilir şarj|harici batarya|magsafe powerbank)/i, "powerbank"],
  // Hafıza/flash
  [/(flash bellek|hafıza kartı|sd kart|micro sd|memory card|usb stick|usb flash|type c girişli flash|type-c.*flash bellek)/i, "telefon-aksesuar"],
  // Ekran koruyucu
  [/(ekran koruyucu|cam koruyucu|tempered glass|temperli cam|9d cam|9h cam|kırılmaz cam|nano cam|hayalet ekran|jelly cam|seramik koruyucu|film koruyucu)/i, "ekran-koruyucu"],
  // Kulaklık
  [/(bluetooth kulaklık|kablosuz kulaklık|tws kulaklık|earbuds|airpods (?!kapak|kılıf)|anc kulaklık)/i, "ses-kulaklik"],
  // Yedek parça
  [/(iç speaker|iç hoparlör|lcd panel|lcd dokunmatik|yedek pil|yedek batarya|orjinal pil|sim tray|sim yuva|şarj soketi|vibratör motor|titreşim motoru|flex kablo|telefon anakart|kamera değişim|ekran değişim|şarj portu yedek)/i, "telefon-yedek-parca"],
  // Genel aksesuar (tutucu/stand/lens koruma/selfie/kamera lens/kordon/kayış)
  [/(selfie çubuğu|selfie stick|popsocket|telefon tutucu|araç tutucu|stylus kalem|lens koruyucu|kamera lens|metal kamera lens|kamera koruma lens|kamera koruma|metal çerçeveli kamera|gimbal|tripod|monopod|kordon|kayış|saat kordonu|saat kayışı|silikon kordon|hasır kordon|deri kordon|spor kordon|metal kordon|dokunmatik lens)/i, "telefon-aksesuar"],
  // Kılıf/kapak (fallback) — "Silikon" tek başına eskiden eksikti; artık silikon
  // + (renk|kartvizit|magsafe|mat|şeffaf|darbe) kombinasyonu da kılıf sayılır.
  [/(kılıf|kapak|case|cover|airbag|cüzdanlı|silikon kapak|deri kılıf|magsafe kılıf|hasır kılıf|spigen|ringke|gpack|youngkit|kartvizitli|kartvizit hazneli|kartvizit bölmeli|silikon\s*-\s*(bordo|mavi|siyah|beyaz|sarı|kırmızı|yeşil|mor|gri|kahve|pembe|turuncu|lacivert|gümüş|altın)|şeffaf silikon|darbe emici silikon|mat silikon|kelvin kartvizit|magsafe silikon|stüdyolux|epico)/i, "telefon-kilifi"],
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

  // Yanlış kategoriye düşmüş aksesuar tarama hedefleri (kategori → kabul edilen "ana ürün" slug'ları).
  // Bir aksesuar listing'i bu kategorilerden birinin canonical'ına bağlıysa relink edilir.
  const SCAN_CATEGORY_SLUGS = [
    "akilli-telefon",
    "laptop",
    "tablet",
    "akilli-saat",
    "ses-kulaklik",
    "kulaklik",
    "buzdolabi",
    "camasir-makinesi",
    "bulasik-makinesi",
    "firin",
    "tv",
    "klima",
  ];
  const SCAN_CAT_IDS = new Set(
    SCAN_CATEGORY_SLUGS.map((s) => slugToId.get(s)).filter((x): x is string => Boolean(x))
  );
  if (SCAN_CAT_IDS.size === 0) throw new Error("Hiçbir tarama kategorisi bulunamadı");

  // Aksesuar source_title'lı + ana ürün kategorisi canonical'a bağlı listing'leri çek
  const candidates: ListingRow[] = [];
  let from = 0;
  while (true) {
    const { data } = await sb
      .from("listings")
      .select("id,source_title,product_id,source_url,products!inner(category_id)")
      .range(from, from + 999);
    if (!data?.length) break;
    for (const l of data) {
      const t = l.source_title || "";
      // @ts-expect-error nested type
      const cat = l.products?.category_id;
      if (!cat || !SCAN_CAT_IDS.has(cat)) continue;

      // Telefon kategorisi için lenient: "uyumlu" YA DA kesin aksesuar kelimesi yeterli.
      // Diğer kategoriler (saat/tablet/laptop/kulaklık/buzdolabı/...) için strict:
      // mutlaka "uyumlu" kelimesi olmalı (gerçek-ürün bundle'larını yanlış işaretlememek için).
      const phoneCatId = slugToId.get("akilli-telefon");
      const isPhone = cat === phoneCatId;
      const isAcc = isPhone
        ? isAccessoryListing(t)
        : trMatchKeyword(t, "uyumlu");
      if (isAcc) candidates.push(l as ListingRow);
    }
    if (data.length < 1000) break;
    from += 1000;
  }
  console.log(`Yanlış-bağlanmış aksesuar listing: ${candidates.length}`);
  if (process.env.DEBUG === "1") {
    for (const c of candidates) {
      let slug: string | null = null;
      for (const [pat, s] of PATTERN_TO_SLUG) {
        if (pat.test(c.source_title || "")) { slug = s; break; }
      }
      console.log(`  [${slug ?? "NO-MATCH"}] ${(c.source_title || "").slice(0, 100)}`);
    }
  }

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
