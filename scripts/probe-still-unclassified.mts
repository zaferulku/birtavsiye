import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local','utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'');});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: cats } = await sb.from('categories').select('id, slug').eq('slug','siniflandirilmamis').single();
const unId = (cats as any)?.id;

let all: any[] = [];
let lastId: string | null = null;
while (true) {
  let q = sb.from('products').select('id, title, brand').eq('category_id', unId).order('id', {ascending: true}).limit(1000);
  if (lastId) q = q.gt('id', lastId);
  const { data } = await q;
  if (!data || data.length === 0) break;
  all.push(...data);
  lastId = data[data.length - 1].id;
  if (data.length < 1000) break;
}
console.log(`Hâlâ unclassified: ${all.length}`);

const norm = (s:string) => (s ?? '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g,' ').trim();
const STOP = new Set(['için','olan','ile','adet','tane','set','seti','siz','sız','yeni','eski']);
const wordCount: Record<string, number> = {};
all.forEach(p => {
  const tokens = norm(p.title ?? '').split(' ').filter(t => t.length >= 3 && !STOP.has(t) && !/^\d+$/.test(t));
  tokens.forEach(t => { wordCount[t] = (wordCount[t] ?? 0) + 1; });
});
const top = Object.entries(wordCount).sort(([,a],[,b])=>b-a).slice(0, 30);
console.log("\n=== Top 30 yaygın kelime (kalan unclassified):");
top.forEach(([w,n]) => console.log(`  ${w.padEnd(20)} ${n}`));

const brands: Record<string, number> = {};
all.forEach(p => { brands[p.brand ?? 'null'] = (brands[p.brand ?? 'null'] ?? 0) + 1; });
console.log("\n=== Top 10 brand:");
Object.entries(brands).sort(([,a],[,b])=>b-a).slice(0,10).forEach(([b,n])=>console.log(`  ${b.padEnd(20)} ${n}`));
