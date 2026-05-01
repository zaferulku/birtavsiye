import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local','utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'');});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const newCats = [
  { slug: 'spor-besin', name: 'Spor Besin Takviyesi' },
  { slug: 'parti-eglence', name: 'Parti & Eğlence' },
];

const { data: existing } = await sb.from('categories').select('slug').in('slug', newCats.map(c=>c.slug));
const exist = new Set((existing ?? []).map((c:any)=>c.slug));
const toInsert = newCats.filter(c => !exist.has(c.slug));
console.log(`Eklenecek: ${toInsert.length}, zaten var: ${exist.size}`);
if (toInsert.length > 0) {
  const { data: ins, error } = await sb.from('categories').insert(toInsert).select('id, slug, name');
  if (error) { console.error(error); process.exit(1); }
  ins?.forEach((c:any) => console.log(`  ${c.slug.padEnd(20)} (${c.name}) id=${c.id}`));
}
