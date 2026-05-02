import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local', 'utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const dummyEmb = Array.from({length:768},()=>0);
// Test with brand=LCW
const { data, error } = await sb.rpc('smart_search', {
  query_embedding: dummyEmb,
  category_filter: 'erkek-giyim-ust',
  keyword_patterns: ['erkek','tişört'],
  match_threshold: 0.3,
  match_count: 10,
  variant_color_patterns: null,
  variant_storage_patterns: null,
  specs_must: null,
  price_min: null,
  price_max: null,
  brand_filter: ['LCW'],
});
console.log(`brand=LCW: ${data?.length} results, err=${error?.message}`);
data?.slice(0,3).forEach((r:any) => console.log(`  ${r.match_source} | ${r.title?.slice(0,55)} | brand=${r.brand}`));

// What brands are in erkek-giyim-ust?
const { data: cat } = await sb.from('categories').select('id').eq('slug', 'erkek-giyim-ust').single();
const { data: brands } = await sb.from('products').select('brand').eq('category_id', cat?.id).eq('is_active', true).limit(2000);
const bset = new Set(brands?.map(p=>p.brand).filter(Boolean));
console.log(`erkek-giyim-ust brands (${bset.size}):`);
[...bset].slice(0, 20).forEach(b => console.log(`  ${b}`));
const lcw = [...bset].filter(b => b?.toLowerCase().includes('lcw') || b?.toLowerCase().includes('waikiki'));
console.log(`LCW-like:`, lcw);
