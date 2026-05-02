import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local','utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'');});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const NEW_ROOTS = ['elektronik','beyaz-esya','kucuk-ev-aletleri','moda','kozmetik','ev-yasam','anne-bebek','spor-outdoor','saglik-vitamin','otomotiv','supermarket','yapi-market','hobi-eglence','pet-shop'];
const PRESERVE = ['siniflandirilmamis', ...NEW_ROOTS];

// Total
const { count: total } = await sb.from('categories').select('*',{count:'exact',head:true});
console.log("Toplam kategori:", total);

// Yeni hierarchik (slug LIKE %/% veya 14 root)
const { count: newCount } = await sb.from('categories').select('*',{count:'exact',head:true}).or('slug.in.('+NEW_ROOTS.join(',')+'),slug.like.%/%');
console.log("Yeni hierarchik kategori:", newCount);

// 14 root
const { data: roots } = await sb.from('categories').select('slug, name').is('parent_id', null).in('slug', NEW_ROOTS).order('slug');
console.log("\n14 root:");
roots?.forEach((r:any) => console.log(`  ${r.slug.padEnd(20)} ${r.name}`));

// Eski flat kategoriler (slug NOT LIKE '%/%' AND not in PRESERVE)
const { data: oldCats } = await sb.from('categories').select('slug').not('slug', 'like', '%/%');
const oldFlatList = (oldCats ?? []).map((c:any)=>c.slug).filter(s => !PRESERVE.includes(s));
console.log(`\nEski flat kategori sayısı: ${oldFlatList.length}`);

// Her birinde kaç ürün var
let from = 0;
const counts = new Map<string, number>();
const oldFlatSet = new Set(oldFlatList);
const { data: idMap } = await sb.from('categories').select('id, slug');
const slugById = new Map<string, string>(((idMap??[]) as any[]).map(c=>[c.id, c.slug]));
while (true) {
  const { data } = await sb.from('products').select('category_id').eq('is_active', true).range(from, from+999);
  if (!data || data.length === 0) break;
  data.forEach((p:any) => {
    const slug = slugById.get(p.category_id);
    if (slug && oldFlatSet.has(slug)) counts.set(slug, (counts.get(slug) ?? 0) + 1);
  });
  if (data.length < 1000) break; from += 1000;
}

console.log("\nEski flat kategori → ürün sayısı (top 50, taşınacak):");
const sorted = [...counts.entries()].sort(([,a],[,b])=>b-a);
sorted.slice(0,50).forEach(([s,n])=>console.log(`  ${String(n).padStart(5)}  ${s}`));
console.log(`\nToplam taşınacak ürün: ${[...counts.values()].reduce((a,b)=>a+b,0)}`);
console.log(`0-ürünlü eski kategori (DROP'a hazır): ${oldFlatList.length - counts.size}`);

// Eski flat slug listesini dosyaya yaz (mapping için)
import { writeFileSync } from 'node:fs';
writeFileSync('/tmp/old-flat-slugs.json', JSON.stringify({all: oldFlatList, withProducts: [...counts.entries()].sort(([,a],[,b])=>b-a)}, null, 2));
console.log("\nDetay /tmp/old-flat-slugs.json'da");
