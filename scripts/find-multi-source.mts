import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local','utf8');
const env: Record<string,string>={};
text.split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'');});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data } = await sb
  .from('listings')
  .select('product_id, source, price, products!inner(slug, title, brand)')
  .eq('is_active', true)
  .limit(20000);

const m: Record<string, { sources: Set<string>; product: any; prices: Array<{s:string; p:number}> }> = {};
data?.forEach((l: any) => {
  const id = l.product_id;
  if (!m[id]) m[id] = { sources: new Set(), product: l.products, prices: [] };
  m[id].sources.add(l.source);
  m[id].prices.push({ s: l.source, p: l.price });
});

const sorted = Object.entries(m).sort(([,a], [,b]) => b.sources.size - a.sources.size);
console.log("Top 10 multi-source products:");
sorted.slice(0, 10).forEach(([id, v]) => {
  console.log(`\n  [${v.sources.size} mağaza] ${v.product?.title?.slice(0,60)}`);
  console.log(`    slug: ${v.product?.slug}`);
  console.log(`    brand: ${v.product?.brand}`);
  console.log(`    sources: ${[...v.sources].join(', ')}`);
  console.log(`    URL:    /urun/${v.product?.slug}`);
});
