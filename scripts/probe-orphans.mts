import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local', 'utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Products with listings vs orphans
const { data: stats } = await sb.rpc('exec_sql' as any, { sql: '' }).select?.() ?? { data: null };
// Direct: sample 5000 products active, check their listings
const { data: prods } = await sb.from('products').select('id, category_id').eq('is_active', true).limit(5000);
const ids = prods?.map(p=>p.id) ?? [];
const chunkSize = 1000;
const productsWithListing = new Set<string>();
for (let i=0; i<ids.length; i+=chunkSize) {
  const chunk = ids.slice(i, i+chunkSize);
  const { data: lst } = await sb.from('listings').select('product_id').in('product_id', chunk).eq('is_active', true);
  lst?.forEach(l => l.product_id && productsWithListing.add(l.product_id));
}
console.log(`Sample 5000 products: ${productsWithListing.size} have ≥1 active listing (${(productsWithListing.size/ids.length*100).toFixed(1)}%)`);

// Per-category breakdown of orphans
const orphanByCat: Record<string, number> = {};
const totalByCat: Record<string, number> = {};
prods?.forEach(p => {
  const c = p.category_id || 'null';
  totalByCat[c] = (totalByCat[c]||0) + 1;
  if (!productsWithListing.has(p.id)) orphanByCat[c] = (orphanByCat[c]||0) + 1;
});
const top = Object.entries(orphanByCat).sort((a,b)=>b[1]-a[1]).slice(0, 15);
const cats = await sb.from('categories').select('id, slug').in('id', top.map(([id])=>id));
const slugMap = new Map(cats.data?.map(c=>[c.id, c.slug]));
console.log("Top 15 orphan categories (active products without active listings):");
top.forEach(([id, n]) => {
  const slug = slugMap.get(id) ?? id;
  console.log(`  ${slug}: ${n}/${totalByCat[id]}`);
});
