import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local', 'utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { count } = await sb.from('products').select('*', { count: 'exact', head: true }).eq('category_id', 'a448094d-f724-4043-940f-427f4faf1751');
console.log('Total products in spor-cantasi:', count);
const { data } = await sb.from('products').select('id, title, brand, slug, embedding').eq('category_id', 'a448094d-f724-4043-940f-427f4faf1751').limit(3);
console.log('Sample 3:');
data?.forEach(p => console.log(`  - ${p.title?.slice(0,80)} | brand=${p.brand} | embedding=${p.embedding ? 'yes' : 'NO'}`));
