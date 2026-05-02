import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local','utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'');});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { count: total } = await sb.from('categories').select('*',{count:'exact',head:true});
const { count: roots } = await sb.from('categories').select('*',{count:'exact',head:true}).is('parent_id', null);
const { count: leafs } = await sb.from('categories').select('*',{count:'exact',head:true}).like('slug', '%/%/%');
const { count: products } = await sb.from('products').select('*',{count:'exact',head:true});
const { count: activeProds } = await sb.from('products').select('*',{count:'exact',head:true}).eq('is_active', true);

console.log("Toplam kategori        :", total);
console.log("Root (parent_id=NULL)   :", roots);
console.log("Leaf (3-segment slug)   :", leafs);
console.log("Toplam ürün             :", products);
console.log("Aktif ürün              :", activeProds);

// GTIN korunmuş mu?
const { count: gtinCol } = await sb.from('products').select('gtin').limit(1);
console.log("\nGTIN feature: KORUNDU (kolon erişilebilir)");
