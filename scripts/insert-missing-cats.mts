import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local','utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'');});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const missing = [
  { slug: 'makyaj', name: 'Makyaj' },
  { slug: 'cilt-bakim', name: 'Cilt Bakım' },
  { slug: 'kamp-outdoor', name: 'Kamp & Outdoor' },
  { slug: 'televizyon', name: 'Televizyon' },
];

const { data: existing } = await sb.from('categories').select('slug').in('slug', missing.map(c=>c.slug));
const existSlugs = new Set((existing ?? []).map((c:any)=>c.slug));
const toInsert = missing.filter(c => !existSlugs.has(c.slug));
console.log(`Eklenecek: ${toInsert.length}, zaten var: ${existSlugs.size}`);

if (toInsert.length > 0) {
  const { data: inserted, error } = await sb.from('categories').insert(toInsert).select('id, slug, name');
  if (error) { console.error("Insert error:", error); process.exit(1); }
  console.log("\nEklenenler:");
  inserted?.forEach((c:any) => console.log(`  ${c.slug.padEnd(20)} (${c.name}) id=${c.id}`));
} else {
  console.log("Hiç ekleme gerekmedi.");
}
