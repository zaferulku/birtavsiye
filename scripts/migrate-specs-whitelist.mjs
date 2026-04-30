import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { filterSpecsWhitelist, ALL_ALLOWED_KEYS, EXPLICIT_BLACKLIST } from './specs-whitelist.mjs';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes('--dry-run');
const APPLY = ARGS.includes('--apply');
const LIMIT = (() => {
  const idx = ARGS.indexOf('--limit');
  return idx >= 0 ? parseInt(ARGS[idx + 1]) : null;
})();

if (!DRY_RUN && !APPLY) {
  console.error('Usage: --dry-run [--limit N] | --apply');
  process.exit(1);
}

console.log(`[specs-whitelist] mode=${DRY_RUN ? 'DRY-RUN' : 'APPLY'} limit=${LIMIT}`);
console.log(`[specs-whitelist] ${ALL_ALLOWED_KEYS.size} allowed keys, ${EXPLICIT_BLACKLIST.size} blacklisted`);

// 1) Tüm specs olan ürünleri çek (batch sayfalama)
const PAGE = 500;
let allProducts = [];
let from = 0;
while (true) {
  const q = sb.from('products').select('id, slug, specs').not('specs', 'is', null).range(from, from + PAGE - 1);
  if (LIMIT && allProducts.length >= LIMIT) break;
  const { data, error } = await q;
  if (error) { console.error(error); process.exit(1); }
  if (!data || data.length === 0) break;
  allProducts = allProducts.concat(data);
  if (data.length < PAGE) break;
  from += PAGE;
  if (LIMIT && allProducts.length >= LIMIT) {
    allProducts = allProducts.slice(0, LIMIT);
    break;
  }
}
console.log(`[specs-whitelist] ${allProducts.length} products loaded`);

// 2) Karar tablosu
const stats = {
  total: allProducts.length,
  changed: 0,
  unchanged: 0,
  total_keys_before: 0,
  total_keys_after: 0,
  keys_dropped: 0,
  drop_reasons: {},
  decisions: [],
};

for (const p of allProducts) {
  const before = p.specs && typeof p.specs === 'object' ? p.specs : {};
  const beforeKeys = Object.keys(before);
  const after = filterSpecsWhitelist(before);
  const afterKeys = Object.keys(after);

  stats.total_keys_before += beforeKeys.length;
  stats.total_keys_after += afterKeys.length;

  const droppedKeys = beforeKeys.filter(k => !(k in after));
  stats.keys_dropped += droppedKeys.length;
  for (const k of droppedKeys) {
    stats.drop_reasons[k] = (stats.drop_reasons[k] || 0) + 1;
  }

  if (droppedKeys.length === 0) {
    stats.unchanged++;
    continue;
  }
  stats.changed++;

  if (stats.decisions.length < 200) {
    stats.decisions.push({
      product_id: p.id,
      slug: p.slug,
      keys_before: beforeKeys.length,
      keys_after: afterKeys.length,
      dropped_count: droppedKeys.length,
    });
  }
}

// 3) Rapor
console.log('\n═══════════════ RAPOR ═══════════════');
console.log(`Toplam ürün: ${stats.total}`);
console.log(`Değişecek (specs filtre uygulanır): ${stats.changed}`);
console.log(`Değişmeyen (zaten temiz): ${stats.unchanged}`);
console.log(`Toplam key — önce: ${stats.total_keys_before}, sonra: ${stats.total_keys_after}`);
console.log(`Atılacak key sayısı: ${stats.keys_dropped}`);
console.log(`Avg key/ürün — önce: ${(stats.total_keys_before / stats.total).toFixed(1)}, sonra: ${(stats.total_keys_after / stats.total).toFixed(1)}`);

console.log('\nEn çok atılan 30 key:');
Object.entries(stats.drop_reasons)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 30)
  .forEach(([k, n]) => console.log(`  ${k}: ${n}`));

fs.writeFileSync('scripts/.specs-whitelist-plan.json', JSON.stringify({
  total: stats.total,
  changed: stats.changed,
  unchanged: stats.unchanged,
  keys_dropped: stats.keys_dropped,
  drop_reasons: stats.drop_reasons,
  sample_decisions: stats.decisions,
}, null, 2));
console.log('\n→ scripts/.specs-whitelist-plan.json yazıldı');

// 4) APPLY (varsa)
if (APPLY) {
  console.log('\n═══════════════ APPLY ═══════════════');
  let updated = 0;
  let failed = 0;

  for (const p of allProducts) {
    const before = p.specs && typeof p.specs === 'object' ? p.specs : {};
    const after = filterSpecsWhitelist(before);
    const droppedKeys = Object.keys(before).filter(k => !(k in after));
    if (droppedKeys.length === 0) continue;

    const { error } = await sb
      .from('products')
      .update({ specs: after })
      .eq('id', p.id);

    if (error) {
      console.error(`FAIL ${p.id}: ${error.message}`);
      failed++;
    } else {
      updated++;
    }
    if ((updated + failed) % 200 === 0) {
      console.log(`  Progress: ${updated + failed}/${stats.changed}`);
    }
  }

  console.log(`\nUPDATE tamamlandı: ${updated} başarılı, ${failed} fail`);
}

console.log('\n=== Bitti ===');
