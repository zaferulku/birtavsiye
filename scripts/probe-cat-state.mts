import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local','utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'');});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// 0a
const { count: catActive } = await sb.from('categories').select('*',{count:'exact',head:true}).eq('is_active', true);
const { count: catTotal } = await sb.from('categories').select('*',{count:'exact',head:true});
const { count: prodActive } = await sb.from('products').select('*',{count:'exact',head:true}).eq('is_active', true);
console.log(`Aktif kategori    : ${catActive} (toplam: ${catTotal})`);
console.log(`Aktif ürün        : ${prodActive}`);

// 0b — Top 30 kategori (ürün sayısına göre)
const { data: cats } = await sb.from('categories').select('id, slug, name');
const catMap = new Map<string, {slug: string; name: string}>(((cats??[]) as any[]).map(c=>[c.id, {slug: c.slug, name: c.name}]));

let from = 0;
const counts = new Map<string, number>();
while (true) {
  const { data } = await sb.from('products').select('category_id').eq('is_active', true).range(from, from+999);
  if (!data || data.length === 0) break;
  data.forEach((p:any) => { if (p.category_id) counts.set(p.category_id, (counts.get(p.category_id) ?? 0) + 1); });
  if (data.length < 1000) break; from += 1000;
}
console.log("\nTop 30 kategori (ürün sayısı):");
[...counts.entries()].sort(([,a],[,b])=>b-a).slice(0,30).forEach(([id, n]) => {
  const info = catMap.get(id);
  console.log(`  ${String(n).padStart(5)}  ${info?.slug ?? '?'}`);
});

// 0c — Boş kategori sayısı
const emptyCount = (cats?.length ?? 0) - counts.size;
console.log(`\nBoş kategori (0 ürün): ${emptyCount}`);

// Toplam taşınacak ürün
console.log(`\nToplam taşınacak ürün: ${[...counts.values()].reduce((a,b)=>a+b,0)}`);
