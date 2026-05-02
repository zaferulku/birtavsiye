import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local','utf8');
const env: Record<string,string>={};
text.split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'');});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Apple/Samsung telefonları, mediamarkt'ta aktif, listing fiyatı düşük olmayan
const { data } = await sb
  .from('listings')
  .select('product_id, source, price, products!inner(slug, title, brand, category_slug)')
  .eq('source', 'mediamarkt')
  .eq('is_active', true)
  .eq('in_stock', true)
  .gte('price', 30000)
  .ilike('products.brand', 'Apple')
  .order('price', { ascending: false })
  .limit(15);

console.log("mediamarkt'taki popüler iPhone'lar (in_stock, ≥₺30K):\n");
data?.forEach((l: any) => {
  console.log(`  ₺${l.price}  ${l.products?.title?.slice(0,55)}`);
  console.log(`    slug: ${l.products?.slug}`);
  console.log(`    cat:  ${l.products?.category_slug}`);
  console.log();
});
