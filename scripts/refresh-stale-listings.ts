/**
 * Stale price=0 MM listing'leri canlı detail-page fetch ile re-validate eder.
 *
 * Geçmiş: MM search JSON-LD'sinde bazı ürünler price'sız gelir, bu listing'ler
 * price=0 + is_active=false olarak DB'de durur (önceki temizlik turunda hide).
 * Bu script her birini detail page üzerinden fetchMediaMarkt ile çekip
 * gerçek fiyat varsa is_active=true yapar.
 *
 * Çalıştırma:
 *   npx tsx --env-file=.env.local scripts/refresh-stale-listings.ts
 *   DRY_RUN=1 npx tsx --env-file=.env.local scripts/refresh-stale-listings.ts
 *
 * Concurrency: 4 paralel fetch (MM rate limit dostu).
 * Progress: her 50 listing'de log.
 */
import { createClient } from "@supabase/supabase-js";
import { fetchMediaMarkt } from "../src/lib/scrapers/live/mediamarkt";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const DRY = process.env.DRY_RUN === "1";
const CONCURRENCY = 4;
// MODE=price (default): price=0 + is_active=false → re-fetch, recover
// MODE=stock          : price>0 + is_active=true + in_stock=false → revalidate
const MODE = (process.env.MODE === "stock" ? "stock" : "price") as "price" | "stock";

interface ListingRow {
  id: string;
  source_url: string | null;
  product_id: string | null;
}

async function main() {
  console.log(`=== Stale MM listing refresh [mode=${MODE}] ${DRY ? "(DRY-RUN)" : ""} ===`);

  const stale: ListingRow[] = [];
  let from = 0;
  while (true) {
    let query = sb
      .from("listings")
      .select("id,source_url,product_id")
      .eq("source", "mediamarkt");
    if (MODE === "price") {
      query = query.eq("price", 0).eq("is_active", false);
    } else {
      query = query.gt("price", 0).eq("is_active", true).eq("in_stock", false);
    }
    const { data, error } = await query.range(from, from + 499);
    if (error) {
      console.error("FETCH err:", error.message);
      break;
    }
    if (!data?.length) break;
    stale.push(...(data as ListingRow[]));
    if (data.length < 500) break;
    from += 500;
  }
  console.log(`Stale listing: ${stale.length}`);

  if (stale.length === 0) {
    console.log("Stale yok, exit.");
    return;
  }

  let recovered = 0;
  let stillNoPrice = 0;
  let fetchFail = 0;
  let dbFail = 0;
  const startTime = Date.now();

  for (let i = 0; i < stale.length; i += CONCURRENCY) {
    const batch = stale.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (l) => {
        if (!l.source_url) {
          stillNoPrice++;
          return;
        }
        try {
          const live = await fetchMediaMarkt({
            sourceUrl: l.source_url,
            productId: l.product_id ?? "",
            sourceProductId: "",
            store: { id: "", name: "MediaMarkt", source: "mediamarkt" as const },
            listingId: l.id,
          });
          if (!live.price || live.price <= 0) {
            stillNoPrice++;
            return;
          }
          if (DRY) {
            recovered++;
            return;
          }
          const { error } = await sb
            .from("listings")
            .update({
              price: live.price,
              original_price: live.original_price,
              is_active: true,
              in_stock: live.in_stock,
              last_seen: new Date().toISOString(),
              currency: live.currency || "TRY",
            })
            .eq("id", l.id);
          if (error) {
            dbFail++;
            if (dbFail <= 3) console.log(`  DB FAIL ${l.id.slice(0, 8)}: ${error.message.slice(0, 80)}`);
          } else {
            recovered++;
          }
        } catch {
          fetchFail++;
        }
      }),
    );

    if ((i + batch.length) % 50 === 0 || i + batch.length === stale.length) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(
        ` progress: ${i + batch.length}/${stale.length} | recovered=${recovered} no-price=${stillNoPrice} fetch-fail=${fetchFail} db-fail=${dbFail} | ${elapsed}s`,
      );
    }
  }

  const totalMin = Math.round((Date.now() - startTime) / 60000);
  console.log(`\n=== SONUC (${totalMin} dk) ===`);
  console.log(`Total stale:      ${stale.length}`);
  console.log(`Recovered:        ${recovered}`);
  console.log(`Still no price:   ${stillNoPrice}`);
  console.log(`Fetch failed:     ${fetchFail}`);
  console.log(`DB update failed: ${dbFail}`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
