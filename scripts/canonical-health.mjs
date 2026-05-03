#!/usr/bin/env node
/**
 * canonical-health.mjs
 *
 * canonical-data-manager agent için DB sağlık raporu (read-only).
 * Audit kapsamı:
 *   - Orphan products (is_active=true ama active listing yok)
 *   - Null brand
 *   - Null category_id
 *   - Null/empty image_url
 *   - Null gtin (Migration 020 sonrası backfill borcu)
 *   - Null model_family (canonical key incomplete)
 *
 * Output:
 *   - scripts/.canonical-health.json (full report)
 *   - stdout: __AUDIT_JSON__<summary> (agentRunner okur)
 *
 * Patch policy: NO patches proposed. Read-only insight.
 * Admin görür → manuel düzeltir veya başka agent tetikler.
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('canonical-health: starting audit');

// 1. Total active products
const { count: totalActive } = await sb
  .from('products')
  .select('id', { count: 'exact', head: true })
  .eq('is_active', true);

// 2. Active listings'i olan product_id seti
const listingProductIds = new Set();
let page = 0;
while (true) {
  const { data, error } = await sb
    .from('listings')
    .select('product_id')
    .eq('is_active', true)
    .range(page * 1000, page * 1000 + 999);
  if (error) { console.error('listings query error:', error.message); break; }
  if (!data || data.length === 0) break;
  for (const row of data) if (row.product_id) listingProductIds.add(row.product_id);
  if (data.length < 1000) break;
  page++;
}
console.log(`canonical-health: ${listingProductIds.size} unique product_id'li active listing var`);

// 3. Active products listesi → orphan check
const orphans = [];
let nullBrand = 0;
let nullCategory = 0;
let nullImage = 0;
let nullGtin = 0;
let nullModelFamily = 0;
let pageP = 0;
while (true) {
  const { data, error } = await sb
    .from('products')
    .select('id, title, brand, slug, category_id, image_url, gtin, model_family')
    .eq('is_active', true)
    .range(pageP * 1000, pageP * 1000 + 999);
  if (error) { console.error('products query error:', error.message); break; }
  if (!data || data.length === 0) break;
  for (const p of data) {
    if (!listingProductIds.has(p.id)) {
      if (orphans.length < 50) orphans.push({ id: p.id, title: p.title, brand: p.brand, slug: p.slug });
    }
    if (!p.brand || p.brand.trim() === '') nullBrand++;
    if (!p.category_id) nullCategory++;
    if (!p.image_url || p.image_url.trim() === '') nullImage++;
    if (!p.gtin || p.gtin.trim() === '') nullGtin++;
    if (!p.model_family || p.model_family.trim() === '') nullModelFamily++;
  }
  if (data.length < 1000) break;
  pageP++;
}

const orphanCount = (totalActive ?? 0) - listingProductIds.size;
const orphanRate = totalActive ? Math.round((orphanCount / totalActive) * 100) : 0;
const noGtinRate = totalActive ? Math.round((nullGtin / totalActive) * 100) : 0;

let severity = 'low';
if (orphanRate > 20) severity = 'high';
else if (orphanRate > 5 || nullBrand > 100 || nullCategory > 50) severity = 'medium';

const summary = {
  total_active: totalActive ?? 0,
  with_active_listing: listingProductIds.size,
  orphans: orphanCount,
  orphan_rate_percent: orphanRate,
  null_brand: nullBrand,
  null_category: nullCategory,
  null_image: nullImage,
  null_gtin: nullGtin,
  no_gtin_rate_percent: noGtinRate,
  null_model_family: nullModelFamily,
  patchProposed: false,           // read-only audit, no patches
  severity,
};

const report = {
  generatedAt: new Date().toISOString(),
  summary,
  orphan_samples: orphans,
};

writeFileSync('./scripts/.canonical-health.json', JSON.stringify(report, null, 2));

console.log('\n=== CANONICAL HEALTH ===');
console.log(`Total active products:      ${summary.total_active}`);
console.log(`With active listing:        ${summary.with_active_listing}`);
console.log(`Orphans (no listing):       ${summary.orphans} (${summary.orphan_rate_percent}%)`);
console.log(`Null brand:                 ${summary.null_brand}`);
console.log(`Null category_id:           ${summary.null_category}`);
console.log(`Null image_url:             ${summary.null_image}`);
console.log(`Null gtin:                  ${summary.null_gtin} (${summary.no_gtin_rate_percent}%)`);
console.log(`Null model_family:          ${summary.null_model_family}`);
console.log(`Severity:                   ${summary.severity}`);
console.log(`\nReport:                     scripts/.canonical-health.json`);

console.log('\n__AUDIT_JSON__' + JSON.stringify(summary));
