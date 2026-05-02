import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local', 'utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Sample 5 active listings
const { data } = await sb.from('listings').select('*').eq('is_active', true).limit(5);
console.log("Sample listing keys:", data?.[0] ? Object.keys(data[0]).join(', ') : 'no data');
console.log("Sample listings:");
data?.forEach(l => console.log(`  product_id=${l.product_id} | source=${l.source} | price=${l.price} | url=${l.url?.slice(0,60)}`));

// Distinct product_ids in active listings
const { data: lpm } = await sb.from('listings').select('product_id').eq('is_active', true).limit(5000);
const distinctPids = new Set(lpm?.map(l=>l.product_id).filter(Boolean));
console.log(`\nDistinct product_ids in 5000 active listings: ${distinctPids.size}`);

// Are those in products table?
if (distinctPids.size > 0) {
  const ids = [...distinctPids].slice(0, 100);
  const { data: matched } = await sb.from('products').select('id, is_active').in('id', ids);
  console.log(`First 100 listing product_ids → ${matched?.length} found in products. ${matched?.filter(p=>p.is_active).length} active.`);
  // Get one matched product's category
  if (matched?.length) {
    const { data: p1 } = await sb.from('products').select('id, title, category_id').eq('id', matched[0].id).single();
    console.log("Sample matched product:", JSON.stringify(p1));
  }
}
