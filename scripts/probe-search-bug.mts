import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local', 'utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Tüm "iphone 15 plus" ürünleri
const { data: plus } = await sb.from('products').select('id, title, brand, embedding').ilike('title', '%iphone 15 plus%').eq('is_active', true).limit(20);
console.log(`"iphone 15 plus" ile match eden ürün: ${plus?.length}`);
plus?.slice(0,10).forEach(p => console.log(`  ${p.title?.slice(0,75)} | brand=${p.brand} | emb=${p.embedding ? 'Y' : 'N'}`));

// Yine "iphone 15 plus" listings'leri var mı (active)?
const ids = plus?.map(p=>p.id) ?? [];
if (ids.length) {
  const { data: lst } = await sb.from('listings').select('product_id, source, price, is_active').in('product_id', ids);
  const byPid: Record<string, any[]> = {};
  lst?.forEach(l => { if(!byPid[l.product_id]) byPid[l.product_id]=[]; byPid[l.product_id].push(l); });
  console.log("\nListings:");
  Object.entries(byPid).slice(0,5).forEach(([pid, ls]: any) => {
    const p = plus?.find(x=>x.id===pid);
    console.log(`  ${p?.title?.slice(0,60)}: ${ls.length} listing (active=${ls.filter((l:any)=>l.is_active).length})`);
  });
}
