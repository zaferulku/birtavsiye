import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local','utf8');
const env: Record<string,string>={};
text.split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'');});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// 1. Mevcut canonical products: kategori dağılımı
const { data: cats } = await sb.from('categories').select('id, slug');
const catBySlug = new Map(cats?.map((c:any)=>[c.id,c.slug]) ?? []);

// Pagination ile tam tara
let allProducts: any[] = [];
let from = 0; const PAGE = 1000;
while (true) {
  const { data, error } = await sb.from('products').select('category_id, brand, model_family, source').range(from, from+PAGE-1);
  if (error || !data || data.length === 0) break;
  allProducts.push(...data);
  if (data.length < PAGE) break;
  from += PAGE;
  if (allProducts.length > 50000) break;
}
console.log(`Canonical products toplam: ${allProducts.length}`);

// Kategori dağılımı top 15
const catCount: Record<string,number> = {};
allProducts.forEach((p:any)=>{const slug = catBySlug.get(p.category_id) ?? 'NULL'; catCount[slug] = (catCount[slug]??0)+1;});
const topCats = Object.entries(catCount).sort(([,a],[,b])=>b-a);
console.log("\nKategori dağılımı (top 15):");
topCats.slice(0,15).forEach(([s,n])=>console.log(`  ${s.padEnd(35)} ${n}`));
console.log(`  ... toplam ${topCats.length} farklı kategori`);

// Source dağılımı
const srcCount: Record<string,number> = {};
allProducts.forEach((p:any)=>{srcCount[p.source ?? 'null'] = (srcCount[p.source ?? 'null']??0)+1;});
console.log("\nCanonical source dağılımı:");
Object.entries(srcCount).sort(([,a],[,b])=>b-a).forEach(([s,n])=>console.log(`  ${s.padEnd(15)} ${n}`));

// Top 10 brand
const brandCount: Record<string,number> = {};
allProducts.forEach((p:any)=>{brandCount[p.brand ?? 'null'] = (brandCount[p.brand ?? 'null']??0)+1;});
console.log("\nTop 10 brand:");
Object.entries(brandCount).sort(([,a],[,b])=>b-a).slice(0,10).forEach(([s,n])=>console.log(`  ${s.padEnd(20)} ${n}`));

// Yapay/garip brand (length=1, sayı, generic)
const weirdBrand = Object.entries(brandCount).filter(([b])=>b.length<3 || /^\d+$/.test(b) || ['Big','Boy','Damatlık','Bluz','Buyuk','Büyük'].includes(b));
console.log(`\nŞüpheli brand sayısı: ${weirdBrand.length}`);
weirdBrand.slice(0,10).forEach(([b,n])=>console.log(`  "${b}": ${n}`));
