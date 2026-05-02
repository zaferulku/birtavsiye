import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local','utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'');});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// siniflandirilmamis cat id
const { data: cats } = await sb.from('categories').select('id, slug').eq('slug', 'siniflandirilmamis').single();
const unId = (cats as { id: string; slug: string } | null)?.id;
console.log("siniflandirilmamis_id:", unId);

// 12,918 unclassified ürün → pagination ile çek
const all: { id: string; title: string; brand: string }[] = [];
let from = 0;
while (true) {
  const { data, error } = await sb.from('products').select('id, title, brand').eq('category_id', unId).eq('classified_by', 'inhouse-faz1').range(from, from+999);
  if (error) { console.error("err:", error); break; }
  if (!data || data.length === 0) break;
  all.push(...data);
  if (data.length < 1000) break;
  from += 1000;
}
console.log(`Total unclassified: ${all.length}`);

// 1. Sample 30 title (rastgele dağılım için her 400'den 1)
console.log("\n=== Sample 30 title (her 400'den 1):");
const step = Math.max(1, Math.floor(all.length / 30));
for (let i=0; i<all.length && i<30*step; i+=step) {
  console.log(`  [${all[i].brand?.slice(0,15).padEnd(15)}] ${all[i].title?.slice(0, 90)}`);
}

// 2. Word frequency (lowercase, normalize, len>=3)
const norm = (s:string) => (s ?? '').toLowerCase()
  .replace(/[^\p{L}\p{N}\s]/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();
const wordCount: Record<string, number> = {};
const STOP = new Set(['için','olan','olarak','ile','adet','tane','adet','siz','sız','yeni','büyük','küçük','siyah','beyaz','mavi','kırmızı','sarı','yeşil','renkli','dijital','akıllı','smart','set','seti','original','orijinal']);
all.forEach(p => {
  const tokens = norm(p.title).split(' ').filter(t => t.length >= 3 && !STOP.has(t) && !/^\d+$/.test(t));
  tokens.forEach(t => { wordCount[t] = (wordCount[t] ?? 0) + 1; });
});
const top = Object.entries(wordCount).sort(([,a],[,b])=>b-a).slice(0, 50);
console.log("\n=== Top 50 frekanslı kelime:");
top.forEach(([w,n]) => console.log(`  ${w.padEnd(25)} ${n}`));

// 3. Top brand'lar
const brandCount: Record<string, number> = {};
all.forEach(p => { brandCount[p.brand ?? 'null'] = (brandCount[p.brand ?? 'null'] ?? 0) + 1; });
const topB = Object.entries(brandCount).sort(([,a],[,b])=>b-a).slice(0, 20);
console.log("\n=== Top 20 brand (unclassified):");
topB.forEach(([b,n]) => console.log(`  ${b.padEnd(25)} ${n}`));
