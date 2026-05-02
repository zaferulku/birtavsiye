import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local','utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'');});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: cats } = await sb.from('categories').select('id, slug, name, parent_id');
const inDb = new Map((cats ?? []).map((c:any)=>[c.slug, c]));
console.log("Categories tablosunda:", inDb.size, "slug");

// All cft slugs (read file & extract)
const fs = await import('node:fs');
const src = fs.readFileSync('src/lib/categorizeFromTitle.ts', 'utf8');
const cftSlugs = [...src.matchAll(/slug:\s*"([a-z0-9-]+)"/g)].map(m=>m[1]).filter(s=>!['siniflandirilmamis'].includes(s));
const uniqueCftSlugs = [...new Set(cftSlugs)];
console.log(`categorizeFromTitle'da ${uniqueCftSlugs.length} unique slug.`);

const missing = uniqueCftSlugs.filter(s => !inDb.has(s));
const present = uniqueCftSlugs.filter(s => inDb.has(s));
console.log(`\n  DB'de var:  ${present.length}`);
console.log(`  DB'de yok:  ${missing.length}`);

console.log("\n=== Eksik kategoriler (DB'ye eklenmesi gerek):");
missing.forEach(s => console.log(`  ${s}`));
