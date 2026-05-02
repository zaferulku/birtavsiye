import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local','utf8');
const env: Record<string,string>={};
text.split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'');});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Önce 1 satır al → şema gör
const { data: sample, error } = await sb.from('products').select('*').limit(1);
if (error) { console.error("ERR:", error); process.exit(1); }
console.log("products kolonları:", Object.keys(sample?.[0] ?? {}).join(', '));

// Pagination tüm canonical
const { data: cats } = await sb.from('categories').select('id, slug');
const catBySlug = new Map(cats?.map((c:any)=>[c.id,c.slug]) ?? []);

let allProducts: any[] = [];
let from = 0; const PAGE = 1000;
while (true) {
  const { data, error: e } = await sb.from('products').select('category_id, brand, model_family').range(from, from+PAGE-1);
  if (e) { console.error("page err:", e); break; }
  if (!data || data.length === 0) break;
  allProducts.push(...data);
  if (data.length < PAGE) break;
  from += PAGE;
  if (from > 50000) break;
}
console.log(`\nCanonical products toplam: ${allProducts.length}`);

// Kategori
const catCount: Record<string,number> = {};
allProducts.forEach((p:any)=>{const slug = catBySlug.get(p.category_id) ?? 'NULL'; catCount[slug] = (catCount[slug]??0)+1;});
const topCats = Object.entries(catCount).sort(([,a],[,b])=>b-a);
console.log(`\n${topCats.length} farklı kategori. Top 15:`);
topCats.slice(0,15).forEach(([s,n])=>console.log(`  ${s.padEnd(35)} ${n}`));

// Brand
const brandCount: Record<string,number> = {};
allProducts.forEach((p:any)=>{brandCount[p.brand ?? 'null'] = (brandCount[p.brand ?? 'null']??0)+1;});
console.log(`\n${Object.keys(brandCount).length} farklı brand. Top 10:`);
Object.entries(brandCount).sort(([,a],[,b])=>b-a).slice(0,10).forEach(([s,n])=>console.log(`  ${s.padEnd(20)} ${n}`));

// Şüpheli brand
const weirdBrands = Object.entries(brandCount).filter(([b])=>b.length<3 && b!=='LG' && b!=='HP' || ['Büyük','Buyuk','Bluz','Erkek','Kadın','Çocuk','Damatlık','Genç'].includes(b));
console.log(`\nŞüpheli brand: ${weirdBrands.length}`);
weirdBrands.slice(0,15).forEach(([b,n])=>console.log(`  "${b}": ${n}`));
