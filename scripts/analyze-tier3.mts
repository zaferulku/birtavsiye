import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local','utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'');});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: catUn } = await sb.from('categories').select('id').eq('slug','siniflandirilmamis').single();
const unId = (catUn as { id: string } | null)?.id;

const all: { id: string; title: string; brand: string }[] = [];
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

// Word frequency
const norm = (s:string) => (s ?? '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g,' ').trim();
const STOP = new Set(['için','olan','ile','adet','tane','set','seti','siz','sız','yeni','eski','tip','model','marka','siyah','beyaz','mavi','kırmızı','sarı','yeşil','renkli','akıllı','smart','original','orijinal']);
const wordCount: Record<string, number> = {};
all.forEach(p => {
  const tokens = norm(p.title ?? '').split(' ').filter(t => t.length >= 3 && !STOP.has(t) && !/^\d+$/.test(t));
  tokens.forEach(t => { wordCount[t] = (wordCount[t] ?? 0) + 1; });
});
const top = Object.entries(wordCount).sort(([,a],[,b])=>b-a).slice(0, 50);
console.log("\n=== Top 50 yaygın kelime:");
top.forEach(([w,n]) => console.log(`  ${w.padEnd(25)} ${n}`));

// 2-gram (bigram) — daha akıllı kategori sinyalleri için
const bigramCount: Record<string, number> = {};
all.forEach(p => {
  const tokens = norm(p.title ?? '').split(' ').filter(t => t.length >= 3);
  for (let i = 0; i < tokens.length - 1; i++) {
    const bg = tokens[i] + ' ' + tokens[i+1];
    bigramCount[bg] = (bigramCount[bg] ?? 0) + 1;
  }
});
const topBg = Object.entries(bigramCount).sort(([,a],[,b])=>b-a).slice(0, 25);
console.log("\n=== Top 25 yaygın bigram:");
topBg.forEach(([w,n]) => console.log(`  ${w.padEnd(35)} ${n}`));

// Top brands
const brands: Record<string, number> = {};
all.forEach(p => { brands[p.brand ?? 'null'] = (brands[p.brand ?? 'null'] ?? 0) + 1; });
console.log("\n=== Top 15 brand:");
Object.entries(brands).sort(([,a],[,b])=>b-a).slice(0,15).forEach(([b,n])=>console.log(`  ${b.padEnd(20)} ${n}`));

// Sample 25 title (her ~320'den 1)
console.log("\n=== Sample 25 title:");
const step = Math.max(1, Math.floor(all.length / 25));
for (let i = 0; i < all.length && i < 25*step; i += step) {
  console.log(`  [${(all[i].brand ?? '').slice(0,15).padEnd(15)}] ${all[i].title?.slice(0, 90)}`);
}
