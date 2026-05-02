import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local','utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'');});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { count: total } = await sb.from('products').select('*',{count:'exact',head:true});
const { count: inhouse } = await sb.from('products').select('*',{count:'exact',head:true}).eq('classified_by','inhouse-faz1');
const { count: accCount } = await sb.from('products').select('*',{count:'exact',head:true}).eq('classified_by','inhouse-faz1').eq('is_accessory',true);
console.log("Canonical products toplam :", total);
console.log("inhouse-faz1 ile eklenen  :", inhouse);
console.log("  → aksesuar olarak işar  :", accCount);
console.log("  → ana ürün              :", (inhouse ?? 0) - (accCount ?? 0));
