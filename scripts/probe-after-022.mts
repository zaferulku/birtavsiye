import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local','utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'');});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const NEW_ROOTS = ['elektronik','beyaz-esya','kucuk-ev-aletleri','moda','kozmetik','ev-yasam','anne-bebek','spor-outdoor','saglik-vitamin','otomotiv','supermarket','yapi-market','hobi-eglence','pet-shop'];
const PRESERVE = new Set(['siniflandirilmamis', ...NEW_ROOTS]);

const { data: cats } = await sb.from('categories').select('id, slug');
const slugById = new Map<string, string>(((cats??[]) as any[]).map(c=>[c.id, c.slug]));

// Eski flat slug'larda aktif ürün kaldı mı?
let from = 0;
const stuck = new Map<string, number>();
while (true) {
  const { data } = await sb.from('products').select('category_id').eq('is_active', true).range(from, from+999);
  if (!data || data.length === 0) break;
  data.forEach((p:any) => {
    const slug = slugById.get(p.category_id);
    if (!slug) return;
    // Eski flat = / yok ve PRESERVE'de değil
    if (!slug.includes('/') && !PRESERVE.has(slug)) {
      stuck.set(slug, (stuck.get(slug) ?? 0) + 1);
    }
  });
  if (data.length < 1000) break; from += 1000;
}

console.log("Eski flat kategoride kalan aktif ürün:", [...stuck.values()].reduce((a,b)=>a+b,0));
console.log("Eski flat kategori sayısı (ürünlü):", stuck.size);
if (stuck.size > 0) {
  console.log("\nKalanlar:");
  [...stuck.entries()].sort(([,a],[,b])=>b-a).slice(0,20).forEach(([s,n])=>console.log(`  ${String(n).padStart(5)}  ${s}`));
}

// Yeni hierarchik kategoride toplam aktif ürün
let hierProducts = 0;
from = 0;
while (true) {
  const { data } = await sb.from('products').select('category_id').eq('is_active', true).range(from, from+999);
  if (!data || data.length === 0) break;
  data.forEach((p:any) => {
    const slug = slugById.get(p.category_id);
    if (slug && (slug.includes('/') || NEW_ROOTS.includes(slug))) hierProducts++;
  });
  if (data.length < 1000) break; from += 1000;
}
console.log(`\nYeni hierarchik kategoride aktif ürün: ${hierProducts}`);
