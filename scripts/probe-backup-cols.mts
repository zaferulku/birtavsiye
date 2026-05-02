import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local','utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'');});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// backup_20260430_categories tablosu var mı + kolonları
console.log("=== backup_20260430_categories ===");
const { data: c, error: ce } = await sb.from('backup_20260430_categories').select('*').limit(1);
if (ce) console.log("ERR:", ce.message);
else console.log("Kolonlar:", Object.keys(c?.[0] ?? {}).join(', '));
const { count: cc } = await sb.from('backup_20260430_categories').select('*',{count:'exact',head:true});
console.log("Satır sayısı:", cc);

console.log("\n=== backup_20260430_products_categories ===");
const { data: p, error: pe } = await sb.from('backup_20260430_products_categories').select('*').limit(1);
if (pe) console.log("ERR:", pe.message);
else console.log("Kolonlar:", Object.keys(p?.[0] ?? {}).join(', '));
const { count: pc } = await sb.from('backup_20260430_products_categories').select('*',{count:'exact',head:true});
console.log("Satır sayısı:", pc);

// products.gtin doluluk kontrolü
console.log("\n=== products.gtin doluluk ===");
const { count: gtinFilled } = await sb.from('products').select('*',{count:'exact',head:true}).not('gtin','is',null);
console.log("gtin dolu olan ürün sayısı:", gtinFilled);
