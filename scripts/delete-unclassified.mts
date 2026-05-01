import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local','utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'');});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: cat } = await sb.from('categories').select('id').eq('slug','siniflandirilmamis').single();
const unId = (cat as any).id;

const { count: before } = await sb.from('products').select('*',{count:'exact',head:true}).eq('category_id', unId);
console.log(`Silinecek: ${before}`);

const { error, count } = await sb.from('products').delete({ count: 'exact' }).eq('category_id', unId);
if (error) { console.error("DELETE error:", error); process.exit(1); }
console.log(`Silinen: ${count}`);

const { count: after } = await sb.from('products').select('*',{count:'exact',head:true}).eq('category_id', unId);
console.log(`Kalan unclassified: ${after}`);

const { count: total } = await sb.from('products').select('*',{count:'exact',head:true});
console.log(`Toplam canonical: ${total}`);
