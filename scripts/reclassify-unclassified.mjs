import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { SOURCE_CATEGORY_MAP, KEYWORD_FALLBACK } from './source-category-mapping.mjs';

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

// 1. Sınıflandırılmamış kategori UUID
const { data: unclassCat } = await sb
  .from('categories')
  .select('id')
  .or('slug.ilike.sınıfla%,slug.ilike.sinifla%,name.ilike.%sınıflandırılmamış%')
  .limit(1)
  .single();

if (!unclassCat) {
  console.error('Sınıflandırılmamış kategori bulunamadı');
  process.exit(1);
}

// 2. Tüm kategori taxonomy (slug → id)
const { data: allCats } = await sb
  .from('categories')
  .select('id, slug');
const slugToId = Object.fromEntries(allCats.map(c => [c.slug, c.id]));

// 3. Sınıflandırılmamış ürünleri çek
let query = sb
  .from('products')
  .select('id, title, brand')
  .eq('category_id', unclassCat.id)
  .eq('is_active', true);

if (LIMIT) query = query.limit(LIMIT);

const { data: products, error } = await query;
if (error) { console.error(error); process.exit(1); }

console.log(`[reclassify] ${products.length} ürün işlenecek (DRY_RUN=${DRY_RUN}, LIMIT=${LIMIT})`);

// 4. Her ürün için listing'leri ve source_category'lerini topla
// PostgREST URL limit (~100 id/batch güvenli)
const productIds = products.map(p => p.id);
const BATCH_SIZE = 100;
let listings = [];
for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
  const batch = productIds.slice(i, i + BATCH_SIZE);
  const { data, error: lerr } = await sb
    .from('listings')
    .select('product_id, source_category, source_title')
    .in('product_id', batch)
    .eq('is_active', true);
  if (lerr) { console.error(lerr); process.exit(1); }
  if (data) listings = listings.concat(data);
}

// product_id → [listings]
const listingsByProduct = {};
for (const l of listings) {
  if (!listingsByProduct[l.product_id]) listingsByProduct[l.product_id] = [];
  listingsByProduct[l.product_id].push(l);
}

// 5. Karar tablosu
const stats = {
  total: products.length,
  by_source_category: 0,
  by_keyword: 0,
  no_match: 0,
  no_listing: 0,
  decisions: [],
  failures: [],
};

for (const p of products) {
  const productListings = listingsByProduct[p.id] || [];

  let resolvedSlug = null;
  let method = null;
  let reason = null;

  if (productListings.length === 0) {
    stats.no_listing++;
    reason = 'no_listings';
  } else {
    for (const l of productListings) {
      if (l.source_category && SOURCE_CATEGORY_MAP[l.source_category]) {
        resolvedSlug = SOURCE_CATEGORY_MAP[l.source_category].ourSlug;
        method = 'source_category';
        reason = `mapped from "${l.source_category}"`;
        break;
      }
    }
  }

  if (!resolvedSlug) {
    const rawTitle = p.title || '';
    // Hem title hem pattern source'unu NFD ile aç + combining mark strip.
    // Bu sayede İ→i, ş→s, ç→c, ö→o, ü→u — kayıpsız sembol eşleşmesi.
    const titleNorm = rawTitle.normalize('NFD').replace(/\p{M}/gu, '');
    for (const rule of KEYWORD_FALLBACK) {
      // Pattern source'unu da aynı şekilde normalize et.
      const patternNorm = new RegExp(
        rule.pattern.source.normalize('NFD').replace(/\p{M}/gu, ''),
        rule.pattern.flags,
      );
      if (patternNorm.test(titleNorm)) {
        resolvedSlug = rule.slug;
        method = 'keyword';
        reason = `pattern ${rule.pattern} matched in title (NFD-normalized)`;
        break;
      }
    }
  }

  if (!resolvedSlug) {
    stats.no_match++;
    stats.failures.push({
      id: p.id,
      title: p.title,
      brand: p.brand,
      source_categories: [...new Set(productListings.map(l => l.source_category).filter(Boolean))],
      listing_count: productListings.length,
    });
    continue;
  }

  const targetCategoryId = slugToId[resolvedSlug];
  if (!targetCategoryId) {
    stats.no_match++;
    stats.failures.push({
      id: p.id,
      title: p.title,
      resolved_slug: resolvedSlug,
      error: `Slug "${resolvedSlug}" DB'de yok`,
    });
    continue;
  }

  if (method === 'source_category') stats.by_source_category++;
  else stats.by_keyword++;

  stats.decisions.push({
    product_id: p.id,
    title: p.title,
    brand: p.brand,
    from_slug: 'sinifla...',
    to_slug: resolvedSlug,
    to_category_id: targetCategoryId,
    method,
    reason,
  });
}

// 6. Rapor
console.log('\n═══════════════ RAPOR ═══════════════');
console.log(`Toplam: ${stats.total}`);
console.log(`Source category ile çözülen: ${stats.by_source_category}`);
console.log(`Keyword ile çözülen: ${stats.by_keyword}`);
console.log(`Listing'i yok: ${stats.no_listing}`);
console.log(`Eşleşmedi: ${stats.no_match}`);
const successPct = stats.total > 0 ? ((stats.by_source_category + stats.by_keyword) / stats.total * 100).toFixed(1) : 0;
console.log(`Başarı oranı: ${successPct}%`);

const slugDistribution = {};
for (const d of stats.decisions) {
  slugDistribution[d.to_slug] = (slugDistribution[d.to_slug] || 0) + 1;
}
console.log('\nSlug dağılımı (top 20):');
Object.entries(slugDistribution)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)
  .forEach(([slug, count]) => console.log(`  ${slug}: ${count}`));

fs.writeFileSync(
  'scripts/.reclassify-plan.json',
  JSON.stringify(stats, null, 2)
);
console.log('\n→ scripts/.reclassify-plan.json yazıldı');

if (stats.failures.length > 0) {
  console.log(`\nEşleşmeyen ${stats.failures.length} ürün (top 10 örnek):`);
  stats.failures.slice(0, 10).forEach(f => {
    console.log(`  - ${(f.title || '').substring(0, 80)} | brand: ${f.brand} | source_cat: ${(f.source_categories || []).join(',')}`);
  });
}

if (APPLY) {
  console.log('\n═══════════════ APPLY ═══════════════');
  let updated = 0;
  let failed = 0;

  for (const d of stats.decisions) {
    const { error } = await sb
      .from('products')
      .update({ category_id: d.to_category_id })
      .eq('id', d.product_id);

    if (error) {
      console.error(`FAIL ${d.product_id}: ${error.message}`);
      failed++;
    } else {
      updated++;
    }

    if ((updated + failed) % 100 === 0) {
      console.log(`  Progress: ${updated + failed}/${stats.decisions.length}`);
    }
  }

  console.log(`\nUPDATE tamamlandı: ${updated} başarılı, ${failed} fail`);

  const { count } = await sb
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', unclassCat.id)
    .eq('is_active', true);

  console.log(`Sınıflandırılmamış kalan: ${count}`);
}

console.log('\n=== Bitti ===');
