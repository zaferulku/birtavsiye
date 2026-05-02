/**
 * Smoke test for all 6 live fetchers.
 *
 * 1. URL-based: DB'den her source için aktif source_url'lü 1 listing seç,
 *    fetcher.fetch() ile gerçek fiyat çek.
 * 2. Search-based: searchByTitle destekleyen fetcher'lar için sabit bir
 *    popüler ürün başlığıyla discover et.
 *
 * Output: matrix tablo — source × {URL fetch result, search result}.
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const text = readFileSync(".env.local", "utf8");
const env: Record<string, string> = {};
text.split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
});

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { pttavmFetcher } = await import("../src/lib/scrapers/live/pttavm.ts");
const { mediamarktFetcher } = await import("../src/lib/scrapers/live/mediamarkt.ts");
const { trendyolFetcher } = await import("../src/lib/scrapers/live/trendyol.ts");
const { hepsiburadaFetcher } = await import("../src/lib/scrapers/live/hepsiburada.ts");
const { amazonTrFetcher } = await import("../src/lib/scrapers/live/amazon-tr.ts");
const { n11Fetcher } = await import("../src/lib/scrapers/live/n11.ts");

const FETCHERS = {
  pttavm: pttavmFetcher,
  mediamarkt: mediamarktFetcher,
  trendyol: trendyolFetcher,
  hepsiburada: hepsiburadaFetcher,
  "amazon-tr": amazonTrFetcher,
  n11: n11Fetcher,
};

console.log("════════════════════════════════════════════");
console.log("  PHASE 1: URL-based fetch (real listings)");
console.log("════════════════════════════════════════════\n");

for (const [source, fetcher] of Object.entries(FETCHERS)) {
  const { data, error } = await sb
    .from("listings")
    .select("id, source_product_id, source_url, products!inner(title)")
    .eq("source", source)
    .eq("is_active", true)
    .not("source_url", "is", null)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    console.log(`[${source.padEnd(11)}] no listing found`);
    continue;
  }

  const title = (data.products as { title?: string } | null)?.title ?? "?";
  const t0 = Date.now();
  try {
    const result = await fetcher.fetch({
      sourceProductId: data.source_product_id,
      sourceUrl: data.source_url,
    });
    const ms = Date.now() - t0;
    console.log(
      `[${source.padEnd(11)}] OK  ${ms}ms  ₺${result.price}  stock=${result.in_stock}  ${title.slice(0, 40)}`
    );
  } catch (err) {
    const ms = Date.now() - t0;
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`[${source.padEnd(11)}] FAIL ${ms}ms  ${msg.slice(0, 60)}  ${title.slice(0, 40)}`);
  }
}

console.log("\n════════════════════════════════════════════");
console.log("  PHASE 2: searchByTitle (discover flow)");
console.log("════════════════════════════════════════════\n");

const searchTargets = [
  { title: "iPhone 15 128GB", brand: "Apple" },
  { title: "AirPods Pro 2", brand: "Apple" },
];

for (const target of searchTargets) {
  console.log(`\n→ "${target.title}" (brand: ${target.brand})`);
  for (const [source, fetcher] of Object.entries(FETCHERS)) {
    if (!fetcher.searchByTitle) {
      console.log(`  [${source.padEnd(11)}] no_search_support`);
      continue;
    }
    const t0 = Date.now();
    try {
      const result = await fetcher.searchByTitle(target);
      const ms = Date.now() - t0;
      if (result) {
        console.log(
          `  [${source.padEnd(11)}] OK  ${ms}ms  ₺${result.price}  ${result.affiliate_url?.slice(0, 60) ?? "—"}`
        );
      } else {
        console.log(`  [${source.padEnd(11)}] no_match  ${ms}ms`);
      }
    } catch (err) {
      const ms = Date.now() - t0;
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  [${source.padEnd(11)}] FAIL ${ms}ms  ${msg.slice(0, 60)}`);
    }
  }
}

console.log("\nDone.");
