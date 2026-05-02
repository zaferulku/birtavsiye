import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local','utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'');});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// listings kolonları gör
const { data: sample } = await sb.from('listings').select('*').limit(1);
console.log("Listings kolonları:", Object.keys(sample?.[0] ?? {}).join(', '));

// source_category_mappings tablosu
console.log("\n=== source_category_mappings tablosu ===");
const { data: mappings } = await sb.from('source_category_mappings').select('*').limit(10);
console.log("Sample:", JSON.stringify(mappings?.[0] ?? {}, null, 2));

// MM ve PttAVM için source_category dağılımı
for (const src of ['mediamarkt', 'pttavm']) {
  console.log(`\n\n══════════════════════════════════════`);
  console.log(`  ${src.toUpperCase()} — Scrape edilen kategoriler (listing source_category)`);
  console.log(`══════════════════════════════════════`);
  let from = 0;
  const counts = new Map<string, number>();
  while (true) {
    const { data } = await sb.from('listings').select('source_category').eq('source', src).range(from, from+999);
    if (!data || data.length === 0) break;
    data.forEach((l:any) => {
      const c = l.source_category ?? '(null)';
      counts.set(c, (counts.get(c) ?? 0) + 1);
    });
    if (data.length < 1000) break; from += 1000;
  }
  const sorted = [...counts.entries()].sort(([,a],[,b])=>b-a);
  console.log(`\n${sorted.length} unique kategori, total ${[...counts.values()].reduce((a,b)=>a+b,0)} listing`);
  sorted.slice(0, 60).forEach(([cat, n]) => console.log(`  ${String(n).padStart(5)}  ${cat}`));
  if (sorted.length > 60) console.log(`  ... +${sorted.length - 60} kategori daha`);
}
