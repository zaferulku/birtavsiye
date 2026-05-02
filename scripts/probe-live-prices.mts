import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local', 'utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Find an iPhone with active listings from multiple sources
const { data } = await sb.from('listings')
  .select('product_id, source, price, products!inner(id, slug, title)')
  .eq('is_active', true)
  .ilike('source_title', '%iphone 15%')
  .limit(50);

const byProduct: Record<string, any> = {};
data?.forEach((l: any) => {
  if (!byProduct[l.product_id]) byProduct[l.product_id] = { sources: new Set(), prices: [], product: l.products };
  byProduct[l.product_id].sources.add(l.source);
  byProduct[l.product_id].prices.push({ source: l.source, price: l.price });
});

const multiSource = Object.entries(byProduct).filter(([_, v]: any) => v.sources.size >= 2);
console.log(`Multi-source products (≥2 mağaza): ${multiSource.length}`);
multiSource.slice(0, 3).forEach(([id, v]: any) => {
  console.log(`\n  ${v.product?.title?.slice(0,60)} [${id}]`);
  console.log(`    slug: ${v.product?.slug}`);
  console.log(`    sources: ${[...v.sources].join(', ')}`);
  v.prices.forEach((p: any) => console.log(`    ${p.source}: ${p.price}`));
});

// Single-source products (1 mağaza, daha çok)
const singleSource = Object.entries(byProduct).filter(([_, v]: any) => v.sources.size === 1);
console.log(`\nSingle-source: ${singleSource.length}`);
