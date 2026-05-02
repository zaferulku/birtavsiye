import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local','utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'');});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: cat } = await sb.from('categories').select('id').eq('slug','siniflandirilmamis').single();
const unId = (cat as any).id;

const { count: prodCount } = await sb.from('products').select('*',{count:'exact',head:true}).eq('category_id', unId);
console.log("Silinecek products:", prodCount);

// Bağlı kayıtlar
let allIds: string[] = [];
let from = 0;
while (true) {
  const { data } = await sb.from('products').select('id').eq('category_id', unId).range(from, from+999);
  if (!data || data.length === 0) break;
  allIds.push(...data.map((p:any)=>p.id));
  if (data.length < 1000) break;
  from += 1000;
}
console.log("Toplam ID toplandı:", allIds.length);

// Chunked count
async function countIn(table: string, fk: string): Promise<number> {
  let total = 0;
  for (let i=0; i<allIds.length; i+=200) {
    const chunk = allIds.slice(i, i+200);
    const { count } = await sb.from(table).select('*',{count:'exact',head:true}).in(fk, chunk);
    total += count ?? 0;
  }
  return total;
}

const tables = [
  ['listings', 'product_id'],
  ['price_history', 'product_id'],
  ['favorites', 'product_id'],
  ['community_posts', 'product_id'],
  ['topics', 'product_slug'],  // muhtemelen slug — skip değil
];
for (const [t, fk] of tables) {
  try {
    if (t === 'topics') continue; // slug-based, skip
    const c = await countIn(t, fk);
    console.log(`  ${t.padEnd(20)} (${fk}): ${c}`);
  } catch (e:any) { console.log(`  ${t}: err ${e.message}`); }
}
