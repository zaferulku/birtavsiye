import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local','utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'');});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Hangi kategori bu ID
const { data: cat } = await sb.from('categories').select('slug, name, parent_id').eq('id', '0aaf3b08-d108-4f2f-bd9d-b680c1bd347a').single();
console.log("Bu category id:", cat);

// Bu category'de kaç ürün (aktif/pasif)
const { count: active } = await sb.from('products').select('*',{count:'exact',head:true}).eq('category_id', '0aaf3b08-d108-4f2f-bd9d-b680c1bd347a').eq('is_active', true);
const { count: total } = await sb.from('products').select('*',{count:'exact',head:true}).eq('category_id', '0aaf3b08-d108-4f2f-bd9d-b680c1bd347a');
console.log(`Active: ${active}, Total (aktif+pasif): ${total}`);

// Genel: tüm eski flat kategorilerde pasif ürün sayısı
const NEW_ROOTS = ['elektronik','beyaz-esya','kucuk-ev-aletleri','moda','kozmetik','ev-yasam','anne-bebek','spor-outdoor','saglik-vitamin','otomotiv','supermarket','yapi-market','hobi-eglence','pet-shop'];
const PRESERVE = new Set(['siniflandirilmamis', ...NEW_ROOTS]);

const { data: cats } = await sb.from('categories').select('id, slug');
const slugById = new Map<string, string>(((cats??[]) as any[]).map(c=>[c.id, c.slug]));

// All products (aktif+pasif) → eski flat?
let from = 0;
const stuckActive = new Map<string, number>();
const stuckInactive = new Map<string, number>();
while (true) {
  const { data } = await sb.from('products').select('category_id, is_active').range(from, from+999);
  if (!data || data.length === 0) break;
  data.forEach((p:any) => {
    const slug = slugById.get(p.category_id);
    if (!slug || slug.includes('/') || PRESERVE.has(slug)) return;
    if (p.is_active) stuckActive.set(slug, (stuckActive.get(slug) ?? 0) + 1);
    else stuckInactive.set(slug, (stuckInactive.get(slug) ?? 0) + 1);
  });
  if (data.length < 1000) break; from += 1000;
}
console.log(`\nEski flat kategoride aktif ürün: ${[...stuckActive.values()].reduce((a,b)=>a+b,0)}`);
console.log(`Eski flat kategoride PASİF ürün: ${[...stuckInactive.values()].reduce((a,b)=>a+b,0)}`);
console.log("\nPasif ürünlü eski flat kategoriler (top 20):");
[...stuckInactive.entries()].sort(([,a],[,b])=>b-a).slice(0,20).forEach(([s,n])=>console.log(`  ${String(n).padStart(5)}  ${s}`));
