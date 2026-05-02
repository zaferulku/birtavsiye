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

async function probe(name: string, params: any) {
  const { data, error } = await sb.rpc('smart_search', params);
  if (error) {
    console.log(`❌ ${name}: ERROR ${error.message}`);
    return;
  }
  console.log(`✓ ${name}: ${data?.length ?? 0} sonuç`);
  data?.slice(0,2).forEach((r:any) => console.log(`    ${r.match_source}/${r.similarity?.toFixed(2)} | ${r.title?.slice(0,55)} | listings=${r.listing_count}`));
}

// 1. orphan + 0 emb (spor-cantasi)
await probe("spor-cantasi (orphan, 0 emb)", {
  query_embedding: dummyEmb,
  category_filter: 'spor-cantasi',
  keyword_patterns: ['çanta'],
  match_threshold: 0.3,
  match_count: 10,
  variant_color_patterns: null,
  variant_storage_patterns: null,
  specs_must: null,
  price_min: null,
  price_max: null,
  brand_filter: null,
});

// 2. orphan + 0 emb + brand
await probe("spor-cantasi + brand=Nike (orphan)", {
  query_embedding: dummyEmb,
  category_filter: 'spor-cantasi',
  keyword_patterns: null,
  match_threshold: 0.3,
  match_count: 10,
  variant_color_patterns: null,
  variant_storage_patterns: null,
  specs_must: null,
  price_min: null,
  price_max: null,
  brand_filter: ['Nike'],
});

// 3. erkek-giyim-ust (orphan)
await probe("erkek-giyim-ust", {
  query_embedding: dummyEmb,
  category_filter: 'erkek-giyim-ust',
  keyword_patterns: ['tişört'],
  match_threshold: 0.3,
  match_count: 10,
  variant_color_patterns: null,
  variant_storage_patterns: null,
  specs_must: null,
  price_min: null,
  price_max: null,
  brand_filter: null,
});

// 4. telefon-kilifi (regression — vector path)
await probe("telefon-kilifi (52 emb, vector regression)", {
  query_embedding: dummyEmb,
  category_filter: 'telefon-kilifi',
  keyword_patterns: ['kılıf'],
  match_threshold: 0.0,
  match_count: 5,
  variant_color_patterns: null,
  variant_storage_patterns: null,
  specs_must: null,
  price_min: null,
  price_max: null,
  brand_filter: null,
});

// 5. price filter aktif → orphan ürünler ELENMELI
await probe("spor-cantasi + price_max=1000 (orphan elenmeli)", {
  query_embedding: dummyEmb,
  category_filter: 'spor-cantasi',
  keyword_patterns: ['çanta'],
  match_threshold: 0.3,
  match_count: 10,
  variant_color_patterns: null,
  variant_storage_patterns: null,
  specs_must: null,
  price_min: null,
  price_max: 1000,
  brand_filter: null,
});
