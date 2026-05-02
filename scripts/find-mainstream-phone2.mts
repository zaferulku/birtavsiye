import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local','utf8');
const env: Record<string,string>={};
text.split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'');});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Apple iPhone (stoğa bakmadan), discover flow için en iyi adaylar
const { data } = await sb
  .from('listings')
  .select('product_id, source, price, in_stock, products!inner(slug, title, brand, category_slug)')
  .eq('source', 'mediamarkt')
  .eq('is_active', true)
  .ilike('products.title', '%iPhone 15%')
  .order('price', { ascending: false })
  .limit(10);

console.log("mediamarkt'taki iPhone 15'ler:\n");
data?.forEach((l: any) => {
  console.log(`  ₺${l.price}  stock=${l.in_stock}  ${l.products?.title?.slice(0,55)}`);
  console.log(`    slug: ${l.products?.slug}`);
});

// Samsung da kontrol
const { data: s } = await sb
  .from('listings')
  .select('product_id, source, price, in_stock, products!inner(slug, title, brand)')
  .eq('source', 'mediamarkt')
  .eq('is_active', true)
  .ilike('products.title', '%Samsung Galaxy S2%')
  .order('price', { ascending: false })
  .limit(5);

console.log("\nSamsung Galaxy S2x:\n");
s?.forEach((l: any) => {
  console.log(`  ₺${l.price}  ${l.products?.title?.slice(0,55)}`);
  console.log(`    slug: ${l.products?.slug}`);
});
