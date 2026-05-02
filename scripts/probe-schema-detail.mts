import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local','utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'');});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function cols(t: string) {
  const { data } = await sb.from(t).select('*').limit(1);
  return data?.[0] ? Object.keys(data[0]) : [];
}

console.log("=== products kolonları ===");
console.log((await cols('products')).join(', '));
console.log("\n=== listings kolonları ===");
console.log((await cols('listings')).join(', '));
console.log("\n=== stores kolonları ===");
console.log((await cols('stores')).join(', '));
console.log("\n=== price_history kolonları ===");
console.log((await cols('price_history')).join(', '));

// Counts
const tables = ['products','categories','listings','price_history','stores'];
console.log("\n=== Row counts ===");
for (const t of tables) {
  const { count } = await sb.from(t).select('*',{count:'exact',head:true});
  console.log(`  ${t.padEnd(20)} ${count}`);
}

// Stores örnek
const { data: stores } = await sb.from('stores').select('*').limit(5);
console.log("\nStores örnek:");
stores?.forEach((s:any) => console.log(`  ${s.name}`));
