#!/usr/bin/env node
/**
 * product-matcher-audit.mjs
 *
 * product-matcher agent için periodic dedup audit.
 *
 * Mantık (.claude/agents/product-matcher.md ile uyumlu):
 *   Canonical key = (brand, model_family, variant_storage, variant_color)
 *   DB'de UNIQUE index var ama trim/normalize sapmaları nedeniyle aynı ürünün
 *   iki farklı kaydı oluşabilir. Bu script aynı normalize-edilmiş key'e sahip
 *   farklı product ID'leri tespit eder → merge_candidates.
 *
 * Output:
 *   - scripts/.product-matcher-audit.json (full report)
 *   - stdout: __AUDIT_JSON__<summary>
 *
 * Patch policy: patch_proposed=true when merge_candidates>0.
 * Admin onayı şart — yanlış merge = kullanıcı favorisini kaybeder.
 *
 * NOT: Auto-merge YAPMAZ. Sadece adayları listeler.
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('product-matcher-audit: dedup taraması başlıyor');

// Türkçe normalize (matching için, DISPLAY için DEĞİL)
function normalizeKey(s) {
  if (s == null) return '';
  return s
    .toLowerCase()
    .trim()
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
}

// 1. Tüm aktif products
const products = [];
let page = 0;
while (page < 100) {
  const { data, error } = await sb
    .from('products')
    .select('id, title, slug, brand, model_family, variant_storage, variant_color, created_at')
    .eq('is_active', true)
    .not('brand', 'is', null)
    .range(page * 1000, page * 1000 + 999);
  if (error) { console.error('products error:', error.message); break; }
  if (!data || data.length === 0) break;
  products.push(...data);
  if (data.length < 1000) break;
  page++;
}
console.log(`product-matcher-audit: ${products.length} aktif (brand'i olan) ürün taranıyor`);

// 2. Canonical key bazında grupla
const groups = new Map(); // key → [product]
for (const p of products) {
  const key = [
    normalizeKey(p.brand),
    normalizeKey(p.model_family),
    normalizeKey(p.variant_storage),
    normalizeKey(p.variant_color),
  ].join('|');
  // Sadece anlamlı key'ler — sadece brand varsa skip (çok geniş, false positive)
  if (key.split('|').filter(Boolean).length < 2) continue;
  const arr = groups.get(key) ?? [];
  arr.push(p);
  groups.set(key, arr);
}

// 3. Duplicate gruplar (>1 üye)
const duplicates = [];
for (const [key, members] of groups.entries()) {
  if (members.length < 2) continue;
  // En eski olan winner adayı (created_at ASC ilk)
  members.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  duplicates.push({
    canonical_key: key,
    count: members.length,
    winner_candidate_id: members[0].id,
    winner_title: members[0].title,
    winner_slug: members[0].slug,
    losers: members.slice(1).map(m => ({
      id: m.id,
      title: m.title,
      slug: m.slug,
      created_at: m.created_at,
    })),
    sample_brand: members[0].brand,
    sample_model: members[0].model_family,
  });
}

// 4. En çok duplicate olanlar başta
duplicates.sort((a, b) => b.count - a.count);

const totalDupeProducts = duplicates.reduce((s, d) => s + d.count, 0);
const totalLosers = duplicates.reduce((s, d) => s + d.losers.length, 0);

let severity = 'low';
if (duplicates.length > 50) severity = 'high';
else if (duplicates.length > 10) severity = 'medium';

const summary = {
  total_active_with_brand: products.length,
  exact_dup_groups: duplicates.length,
  total_duplicate_products: totalDupeProducts,
  total_loser_products: totalLosers,
  patchProposed: duplicates.length > 0,
  severity,
};

const report = {
  generatedAt: new Date().toISOString(),
  summary,
  // Top 50 duplicate group örnekleri admin görsün
  duplicate_groups: duplicates.slice(0, 50),
};

writeFileSync('./scripts/.product-matcher-audit.json', JSON.stringify(report, null, 2));

console.log('\n=== PRODUCT MATCHER AUDIT ===');
console.log(`Aktif ürün (brand'li):       ${summary.total_active_with_brand}`);
console.log(`Duplicate grup sayısı:        ${summary.exact_dup_groups}`);
console.log(`Toplam duplicate ürün:        ${summary.total_duplicate_products}`);
console.log(`Loser sayısı (merge target):  ${summary.total_loser_products}`);
console.log(`Severity:                     ${summary.severity}`);
console.log(`Patch proposed:               ${summary.patchProposed}`);
if (duplicates.length > 0) {
  console.log('\nİlk 5 duplicate grup:');
  for (const d of duplicates.slice(0, 5)) {
    console.log(`  [${d.count}] "${d.sample_brand} ${d.sample_model ?? ''}"`);
    console.log(`    winner: ${d.winner_slug} (${d.winner_candidate_id})`);
    for (const l of d.losers.slice(0, 3)) console.log(`    loser:  ${l.slug} (${l.id})`);
    if (d.losers.length > 3) console.log(`    ... ${d.losers.length - 3} loser daha`);
  }
}
console.log(`\nReport: scripts/.product-matcher-audit.json`);

console.log('\n__AUDIT_JSON__' + JSON.stringify(summary));
