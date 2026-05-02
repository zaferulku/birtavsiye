import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local', 'utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data: cat } = await sb.from('categories').select('id, slug, is_active, is_leaf').eq('slug', 'kahve').single();
console.log("kahve cat:", JSON.stringify(cat));
if (cat) {
  const { count } = await sb.from('products').select('*', { count: 'exact', head: true }).eq('category_id', cat.id).eq('is_active', true);
  console.log(`kahve active products: ${count}`);
}
const dummyEmb = Array.from({length:768},()=>0);
const { data, error } = await sb.rpc('smart_search', {
  query_embedding: dummyEmb,
  category_filter: 'kahve',
  keyword_patterns: ['kahve'],
  match_threshold: 0.3,
  match_count: 10,
  variant_color_patterns: null,
  variant_storage_patterns: null,
  specs_must: null,
  price_min: null,
  price_max: null,
  brand_filter: null,
});
console.log(`smart_search RPC kahve: ${data?.length} results, err=${error?.message}`);
data?.slice(0,3).forEach((r:any) => console.log(`  ${r.match_source} | ${r.title?.slice(0,55)} | listings=${r.listing_count}`));
