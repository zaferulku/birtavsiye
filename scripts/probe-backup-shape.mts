import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local','utf8');
const env: Record<string,string>={};
text.split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'');});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Total
const { count: total } = await sb.from('backup_20260422_products').select('*',{count:'exact',head:true});
console.log("Toplam satır:", total);

// 1. Sample 3 satır → şema
const { data: sample } = await sb.from('backup_20260422_products').select('*').limit(3);
console.log("\nÖrnek 3 satır:");
sample?.forEach((r,i)=>{console.log(`\n[${i+1}]`); Object.entries(r).forEach(([k,v])=>{const s=String(v??'').slice(0,80);console.log(`  ${k.padEnd(20)}: ${s}`);});});

// 2. category dağılımı (varsa source_category veya category alanı)
console.log("\n\nKolon adları (1. satırdan):");
if(sample?.[0]) console.log(Object.keys(sample[0]).join(', '));
