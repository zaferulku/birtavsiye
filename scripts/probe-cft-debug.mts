import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local','utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'');});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: catUn } = await sb.from('categories').select('id').eq('slug','siniflandirilmamis').single();
const unId = (catUn as any)?.id;

// Fondöten içeren unclassified ürünleri al
const { data: rows } = await sb.from('products').select('id, title')
  .eq('category_id', unId).ilike('title', '%fondöten%').limit(5);
console.log("Fondöten içeren unclassified örnekleri:");
const cftMod = await import("../src/lib/categorizeFromTitle.ts");
const cft = (cftMod as any).categorizeFromTitle;
(rows ?? []).forEach((r: any) => {
  const res = cft(r.title);
  console.log(`  slug=${res.slug ?? '—'} kw=${res.matchedKeyword ?? '—'} ${r.title.slice(0,80)}`);
});

// Allık örnek
const { data: rows2 } = await sb.from('products').select('id, title')
  .eq('category_id', unId).ilike('title', '%allık%').limit(5);
console.log("\nAllık içeren unclassified örnekleri:");
(rows2 ?? []).forEach((r: any) => {
  const res = cft(r.title);
  console.log(`  slug=${res.slug ?? '—'} kw=${res.matchedKeyword ?? '—'} ${r.title.slice(0,80)}`);
});

// Kremi örnek
const { data: rows3 } = await sb.from('products').select('id, title')
  .eq('category_id', unId).ilike('title', '%kremi%').limit(5);
console.log("\nKremi içeren unclassified örnekleri:");
(rows3 ?? []).forEach((r: any) => {
  const res = cft(r.title);
  console.log(`  slug=${res.slug ?? '—'} kw=${res.matchedKeyword ?? '—'} ${r.title.slice(0,80)}`);
});
