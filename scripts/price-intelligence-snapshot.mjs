#!/usr/bin/env node
/**
 * price-intelligence-snapshot.mjs
 *
 * price-intelligence agent için 24h fiyat değişim analizi (read-only insight).
 *
 * Output:
 *   - scripts/.price-intelligence.json (full report)
 *   - stdout: __AUDIT_JSON__<summary>
 *
 * Logic:
 *  1. Son 24h price_history kayıtlarını çek
 *  2. Listing bazında ilk vs son kayıt → değişim %
 *  3. Drop (>10% düşüş) ve spike (>10% yükseliş) say
 *  4. En büyük 20 drop ve 20 spike'ı kaydet (admin ilgilenir)
 *
 * Patch policy: NO patches proposed (insight only).
 * İleride notification-dispatcher bu output'tan kullanıcılara fiyat alarmı gönderir.
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('price-intelligence: 24h snapshot başlıyor');

const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

// 1. price_history kayıtları (page-by-page, max 10000 satır)
const allRows = [];
let page = 0;
while (page < 10) {
  const { data, error } = await sb
    .from('price_history')
    .select('listing_id, price, recorded_at')
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: true })
    .range(page * 1000, page * 1000 + 999);
  if (error) { console.error('price_history error:', error.message); break; }
  if (!data || data.length === 0) break;
  allRows.push(...data);
  if (data.length < 1000) break;
  page++;
}
console.log(`price-intelligence: ${allRows.length} price_history satırı çekildi (son 24h)`);

// 2. Listing bazında grupla
const byListing = new Map();
for (const row of allRows) {
  const arr = byListing.get(row.listing_id) ?? [];
  arr.push(row);
  byListing.set(row.listing_id, arr);
}

// 3. İlk vs son fiyat karşılaştırma
const drops = [];   // {listing_id, from, to, change_percent}
const spikes = [];
let stable = 0;

for (const [listingId, history] of byListing.entries()) {
  if (history.length < 2) { stable++; continue; }
  const first = Number(history[0].price);
  const last = Number(history[history.length - 1].price);
  if (!isFinite(first) || !isFinite(last) || first === 0) continue;
  const change = ((last - first) / first) * 100;
  if (change <= -10) {
    drops.push({ listing_id: listingId, from: first, to: last, change_percent: Number(change.toFixed(2)) });
  } else if (change >= 10) {
    spikes.push({ listing_id: listingId, from: first, to: last, change_percent: Number(change.toFixed(2)) });
  } else {
    stable++;
  }
}

// 4. En büyük 20 drop ve spike için product info çek (joinli select)
async function enrichWithProduct(items, limit = 20) {
  if (items.length === 0) return [];
  const top = items.slice(0, limit);
  const ids = top.map(x => x.listing_id);
  const { data } = await sb
    .from('listings')
    .select('id, product_id, source, products!inner(id, title, brand, slug)')
    .in('id', ids);
  const lookup = new Map((data ?? []).map(l => [l.id, l]));
  return top.map(x => {
    const l = lookup.get(x.listing_id);
    return {
      ...x,
      product_id: l?.product_id ?? null,
      product_title: l?.products?.title ?? null,
      brand: l?.products?.brand ?? null,
      slug: l?.products?.slug ?? null,
      source: l?.source ?? null,
    };
  });
}

drops.sort((a, b) => a.change_percent - b.change_percent);   // en büyük düşüş başta
spikes.sort((a, b) => b.change_percent - a.change_percent);  // en büyük yükseliş başta

const topDrops = await enrichWithProduct(drops, 20);
const topSpikes = await enrichWithProduct(spikes, 20);

// 5. Severity
let severity = 'low';
if (drops.length > 100) severity = 'high';
else if (drops.length > 20 || spikes.length > 50) severity = 'medium';

const summary = {
  rows_24h: allRows.length,
  listings_analyzed: byListing.size,
  price_drops_10p: drops.length,
  price_spikes_10p: spikes.length,
  stable: stable,
  biggest_drop_percent: drops[0]?.change_percent ?? 0,
  biggest_spike_percent: spikes[0]?.change_percent ?? 0,
  patchProposed: false,
  severity,
};

const report = {
  generatedAt: new Date().toISOString(),
  windowHours: 24,
  summary,
  top_drops: topDrops,
  top_spikes: topSpikes,
};

writeFileSync('./scripts/.price-intelligence.json', JSON.stringify(report, null, 2));

console.log('\n=== PRICE INTELLIGENCE (24h) ===');
console.log(`Analyzed listings:     ${summary.listings_analyzed}`);
console.log(`Drops ≥10%:            ${summary.price_drops_10p}`);
console.log(`Spikes ≥10%:           ${summary.price_spikes_10p}`);
console.log(`Stable:                ${summary.stable}`);
console.log(`Biggest drop:          ${summary.biggest_drop_percent}%`);
console.log(`Biggest spike:         ${summary.biggest_spike_percent}%`);
console.log(`Severity:              ${summary.severity}`);
console.log(`\nReport:                scripts/.price-intelligence.json`);

console.log('\n__AUDIT_JSON__' + JSON.stringify(summary));
