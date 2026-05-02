import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local','utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'');});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data: cat } = await sb.from('categories').select('id').eq('slug','siniflandirilmamis').single();
const unId = (cat as any).id;
let all: any[] = []; let from = 0;
while (true) {
  const { data } = await sb.from('products').select('id, title, brand').eq('category_id', unId).range(from, from+999);
  if (!data || data.length === 0) break;
  all.push(...data); if (data.length < 1000) break; from += 1000;
}
console.log("Total:", all.length);

// Sample 80 title
const step = Math.max(1, Math.floor(all.length / 80));
console.log("\n=== Sample 80:");
for (let i=0; i<all.length && i<80*step; i+=step) {
  console.log(`[${(all[i].brand??'').slice(0,12).padEnd(12)}] ${all[i].title?.slice(0,100)}`);
}
