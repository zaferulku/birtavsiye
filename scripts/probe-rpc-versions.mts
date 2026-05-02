import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local', 'utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Test smart_search RPC 11-param call (matches v2)
const dummyEmb = Array.from({length:768},()=>0);
console.log("=== 11-param call (with variant_*) ===");
const { data: d1, error: e1 } = await sb.rpc('smart_search', {
  query_embedding: dummyEmb,
  category_filter: 'spor-cantasi',
  specs_must: null,
  keyword_patterns: ['çanta','spor'],
  price_min: null,
  price_max: null,
  brand_filter: null,
  match_count: 10,
  match_threshold: 0.3,
  variant_color_patterns: null,
  variant_storage_patterns: null,
});
console.log("count:", d1?.length, "err:", e1?.message);

// Try category with embedded products (telefon-kilifi has 52)
console.log("\n=== telefon-kilifi (52 embeddings) ===");
const { data: d2, error: e2 } = await sb.rpc('smart_search', {
  query_embedding: dummyEmb,
  category_filter: 'telefon-kilifi',
  specs_must: null,
  keyword_patterns: ['kılıf'],
  price_min: null,
  price_max: null,
  brand_filter: null,
  match_count: 10,
  match_threshold: 0.0,
  variant_color_patterns: null,
  variant_storage_patterns: null,
});
console.log("count:", d2?.length, "err:", e2?.message);
d2?.slice(0,2).forEach((r:any) => console.log(`  ${r.title?.slice(0,60)} | ${r.match_source}`));
