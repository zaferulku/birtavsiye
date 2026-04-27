/**
 * Backfill price_history for existing listings.
 *
 * Idempotent: zaten history'de olan listing'leri atla.
 * recorded_at: listings.first_seen ?? now()
 *
 * Sema: price_history(id serial, listing_id uuid, price numeric, recorded_at timestamptz)
 *
 * Calistirma:
 *   node --env-file=.env.local scripts/backfill-price-history.mjs
 *   DRY_RUN=1 node --env-file=.env.local scripts/backfill-price-history.mjs
 */

import { createClient } from '@supabase/supabase-js';

const DRY_RUN = process.env.DRY_RUN === '1';
const BATCH = 100;
const PAGE = 1000;

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fetchAll(table, columns, orderCol) {
  const all = [];
  let from = 0;
  while (true) {
    const { data, error } = await sb
      .from(table)
      .select(columns)
      .order(orderCol, { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`${table} fetch failed: ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

async function main() {
  console.log(`Backfill price_history${DRY_RUN ? ' (DRY-RUN)' : ''}`);

  const allListings = await fetchAll('listings', 'id, price, first_seen', 'id');
  console.log(`Toplam listings: ${allListings.length}`);

  const histRows = await fetchAll('price_history', 'listing_id', 'listing_id');
  const existing = new Set();
  for (const r of histRows) if (r.listing_id) existing.add(r.listing_id);
  console.log(`price_history'de zaten olan listing sayisi: ${existing.size}`);

  const missing = allListings.filter(l => !existing.has(l.id) && l.price != null);
  console.log(`Backfill edilecek listing sayisi: ${missing.length}`);

  if (DRY_RUN) {
    console.log('DRY-RUN: insert atlandi.');
    const sample = missing.slice(0, 5).map(l => ({
      id: l.id, price: l.price, first_seen: l.first_seen,
    }));
    console.log('Ornek 5 satir:', sample);
    return;
  }

  let inserted = 0;
  let failed = 0;
  for (let i = 0; i < missing.length; i += BATCH) {
    const slice = missing.slice(i, i + BATCH);
    const rows = slice.map(l => ({
      listing_id: l.id,
      price: l.price,
      recorded_at: l.first_seen ?? new Date().toISOString(),
    }));
    const { error } = await sb.from('price_history').insert(rows);
    if (error) {
      failed += rows.length;
      console.error(`Batch ${Math.floor(i / BATCH) + 1} fail:`, error.message);
    } else {
      inserted += rows.length;
      process.stdout.write(`\rInserted: ${inserted}/${missing.length}`);
    }
  }
  console.log(`\nDone. inserted=${inserted} failed=${failed}`);

  const { count: phCount } = await sb
    .from('price_history')
    .select('*', { count: 'exact', head: true });
  const totalCovered = existing.size + inserted;
  const coverage = (totalCovered / allListings.length * 100).toFixed(1);
  console.log(`price_history toplam satir: ${phCount}`);
  console.log(`Coverage: ${totalCovered}/${allListings.length} = ${coverage}%`);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
