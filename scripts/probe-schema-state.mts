import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local','utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'');});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Mevcut tablolar — sadece public schema, base table
const tables = ['products','categories','listings','price_history','stores','merchants','offers','raw_offers','product_attributes','agent_decisions','topics','community_posts','favorites','profiles'];
console.log("Mevcut tablolar (sample 1 row):");
for (const t of tables) {
  const { data, error } = await sb.from(t).select('*').limit(1);
  if (error) { console.log(`  ❌ ${t.padEnd(25)} ${error.code}: ${error.message?.slice(0,40)}`); continue; }
  const cols = data?.[0] ? Object.keys(data[0]) : [];
  console.log(`  ✅ ${t.padEnd(25)} ${cols.length} kolon: ${cols.slice(0,12).join(', ')}${cols.length>12?'...':''}`);
}
