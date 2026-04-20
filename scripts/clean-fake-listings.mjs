// Aynı (brand, model_family) grubunun median fiyatının 0.6x altında fiyatlı
// ürünleri sahte listing olarak işaretle (specs.is_fake=true).
// Silmek yerine işaretlemek daha güvenli — UI'da filtrelenir, geri alınabilir.
// node --env-file=.env.local scripts/clean-fake-listings.mjs [--dry-run] [--apply]

import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DRY = process.argv.includes("--dry-run") || !process.argv.includes("--apply");
const MIN_MEDIAN_TRIGGER = 1000;
const OUTLIER_RATIO = 0.6;

(async () => {
  const byGroup = new Map();
  for (let page = 0; page < 60; page++) {
    const { data } = await sb
      .from("products")
      .select("id, title, brand, model_family, source, prices(price)")
      .not("brand", "is", null)
      .not("model_family", "is", null)
      .range(page * 1000, page * 1000 + 999);
    if (!data || data.length === 0) break;
    for (const p of data) {
      const minP = (p.prices ?? []).length > 0 ? Math.min(...p.prices.map(x => x.price)) : null;
      if (minP == null) continue;
      const key = `${p.brand}|${p.model_family}`;
      if (!byGroup.has(key)) byGroup.set(key, []);
      byGroup.get(key).push({ id: p.id, title: p.title, source: p.source, price: minP });
    }
    if (data.length < 1000) break;
  }

  console.log(`Groups with price: ${byGroup.size}`);

  let flagged = 0, groupsAffected = 0;
  const examples = [];

  for (const [key, items] of byGroup.entries()) {
    if (items.length < 3) continue;
    const prices = items.map(x => x.price).sort((a, b) => a - b);
    const median = prices[Math.floor(prices.length / 2)];
    if (median < MIN_MEDIAN_TRIGGER) continue;

    const threshold = median * OUTLIER_RATIO;
    const fakes = items.filter(x => x.price < threshold);
    if (fakes.length === 0) continue;

    groupsAffected++;
    for (const f of fakes) {
      flagged++;
      if (examples.length < 30) examples.push({ group: key, median: Math.round(median), price: f.price, title: f.title.slice(0, 60), source: f.source });
      if (!DRY) {
        const { data: current } = await sb.from("products").select("specs").eq("id", f.id).maybeSingle();
        const newSpecs = { ...(current?.specs || {}), is_fake: true, fake_reason: "outlier_low_price", fake_median: Math.round(median) };
        await sb.from("products").update({ specs: newSpecs }).eq("id", f.id);
      }
    }
  }

  console.log(`\n=== ${DRY ? "DRY RUN" : "APPLIED"} ===`);
  console.log(`Groups affected: ${groupsAffected}`);
  console.log(`Fake listings:   ${flagged}`);

  console.log(`\nExamples:`);
  examples.forEach(e => console.log(`  ${e.group} | median=${e.median} | ${e.price} TL | [${e.source}] | ${e.title}`));

  if (DRY) console.log("\n[DRY RUN] — Uygulamak için --apply ile çalıştır.");
})();
