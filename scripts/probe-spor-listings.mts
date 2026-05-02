import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local', 'utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Test smart_search RPC directly with spor-cantasi keyword
const { data: prods } = await sb.from('products').select('id, title, is_active').eq('category_id', 'a448094d-f724-4043-940f-427f4faf1751').eq('is_active', true).limit(3);
console.log("Active products in spor-cantasi:", prods?.length);
if (prods?.length) {
  const ids = prods.map(p=>p.id);
  const { data: lst } = await sb.from('listings').select('product_id, price, is_active').in('product_id', ids);
  console.log("Listings for those:", lst?.length, "active:", lst?.filter(l=>l.is_active).length);
}
// Test RPC keyword path with dummy embedding
const dummyEmb = Array.from({length:768},()=>0);
const { data: ssResults, error: ssErr } = await sb.rpc('smart_search', {
  query_embedding: dummyEmb,
  category_filter: 'spor-cantasi',
  specs_must: null,
  keyword_patterns: ['çanta','spor'],
  price_min: null,
  price_max: null,
  brand_filter: null,
  match_count: 10,
  match_threshold: 0.3,
});
console.log("smart_search RPC results:", ssResults?.length, "err:", ssErr?.message);
ssResults?.slice(0,3).forEach((r:any) => console.log(`  ${r.title?.slice(0,60)} | ${r.match_source} | sim=${r.similarity}`));
