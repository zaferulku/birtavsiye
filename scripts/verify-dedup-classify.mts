import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local', 'utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// 1) Son 10 dk PttAVM listings — mükerrer URL kontrolü
const since10m = new Date(Date.now() - 10*60*1000).toISOString();
const { data: lst } = await sb.from('listings').select('source_url, source_product_id, product_id, source_category').eq('source','pttavm').gte('last_seen', since10m).limit(500);
console.log(`Son 10 dk PttAVM listings: ${lst?.length ?? 0}`);
const urls = new Set(lst?.map(l=>l.source_url));
const sourcePids = new Set(lst?.map(l=>l.source_product_id));
console.log(`  unique URLs: ${urls.size}, unique source_product_ids: ${sourcePids.size}`);
console.log(`  duplicate URLs: ${(lst?.length ?? 0) - urls.size}`);

// 2) Aynı source_product_id mükerrer listing satırı var mı?
const { data: dupCheck } = await sb.rpc('exec' as any, {} as any).select?.() ?? { data: null };
const counts: Record<string, number> = {};
lst?.forEach(l => {
  const k = `${l.source_product_id}`;
  counts[k] = (counts[k]||0)+1;
});
const dups = Object.entries(counts).filter(([_,n])=>n>1);
console.log(`  source_product_id mükerrer satır: ${dups.length}`);

// 3) source_category dağılımı — classifier kullanıyor mu?
const catCounts: Record<string, number> = {};
lst?.forEach(l => { catCounts[l.source_category||'(null)'] = (catCounts[l.source_category||'(null)']||0)+1; });
console.log(`\nSon 10 dk source_category dağılımı:`);
Object.entries(catCounts).sort((a,b)=>b[1]-a[1]).slice(0,5).forEach(([k,n])=>console.log(`  ${k}: ${n}`));

// 4) Bu listings'lerin product_id'leri unique mi (yoksa hep aynı 23 yeni product mu)?
const productIds = new Set(lst?.map(l=>l.product_id));
console.log(`\nUnique product_id count in 10m: ${productIds.size}`);

// 5) Bu product'ların kategori dağılımı (classifier işe yarıyor mu?)
const ids = [...productIds].slice(0, 50);
if (ids.length > 0) {
  const { data: prods } = await sb.from('products').select('id, category_id').in('id', ids);
  const catIds = [...new Set(prods?.map(p=>p.category_id).filter(Boolean))] as string[];
  const { data: cats } = await sb.from('categories').select('id, slug').in('id', catIds);
  const slugMap = new Map(cats?.map(c=>[c.id, c.slug]));
  const dist: Record<string, number> = {};
  prods?.forEach(p => {
    const slug = slugMap.get(p.category_id) ?? '(unknown)';
    dist[slug] = (dist[slug]||0)+1;
  });
  console.log(`\nİlk 50 product'un kategori dağılımı:`);
  Object.entries(dist).sort((a,b)=>b[1]-a[1]).forEach(([k,n])=>console.log(`  ${k}: ${n}`));
}

// 6) Total listings vs total products — global oran
const { count: totalP } = await sb.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true);
const { count: totalL } = await sb.from('listings').select('*', { count: 'exact', head: true }).eq('is_active', true);
console.log(`\nGlobal: products=${totalP} active_listings=${totalL}`);
