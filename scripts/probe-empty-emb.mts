import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local', 'utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
// Total products
const { count: total } = await sb.from('products').select('*', { count: 'exact', head: true });
// With embedding
const { count: withEmb } = await sb.from('products').select('*', { count: 'exact', head: true }).not('embedding', 'is', null);
console.log(`Products: total=${total}  with_embedding=${withEmb}  missing=${(total||0)-(withEmb||0)}`);
// Per-category breakdown for those missing
const { data: catBreakdown } = await sb.rpc('exec_sql' as any, {} as any).select?.() ?? { data: null };
// Direct query
const { data } = await sb.from('products').select('category_id').is('embedding', null).limit(2000);
const counts: Record<string,number> = {};
data?.forEach(p => { counts[p.category_id || 'null'] = (counts[p.category_id || 'null'] || 0) + 1; });
const top = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0, 10);
const ids = top.map(([id])=>id);
const { data: cats } = await sb.from('categories').select('id, slug').in('id', ids);
const slugMap = new Map(cats?.map(c=>[c.id, c.slug]));
console.log("Top 10 categories with missing embeddings:");
top.forEach(([id, n]) => console.log(`  ${slugMap.get(id) ?? id}: ${n}`));
