import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local', 'utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Get all spor-cantasi product IDs
const { data: prods } = await sb.from('products').select('id').eq('category_id', 'a448094d-f724-4043-940f-427f4faf1751').eq('is_active', true);
console.log(`spor-cantasi active products: ${prods?.length}`);
const ids = prods?.map(p=>p.id) ?? [];

// Listings (active and inactive)
const { count: lstActive } = await sb.from('listings').select('*', { count: 'exact', head: true }).in('product_id', ids).eq('is_active', true);
const { count: lstAll } = await sb.from('listings').select('*', { count: 'exact', head: true }).in('product_id', ids);
console.log(`Listings: total=${lstAll} active=${lstActive}`);

// Sample inactive listings to see why
const { data: inact } = await sb.from('listings').select('product_id, source, price, in_stock, last_seen, is_active').in('product_id', ids).limit(5);
console.log("Sample 5 listings (active+inactive):");
inact?.forEach(l => console.log(`  src=${l.source} price=${l.price} active=${l.is_active} in_stock=${l.in_stock} last_seen=${l.last_seen?.slice(0,10)}`));

// All-time global stats per category
console.log("\n=== Global per-source listings ===");
const { data: src } = await sb.from('listings').select('source, is_active');
const byS: Record<string, {a:number, t:number}> = {};
src?.forEach(l => {
  const s = l.source || 'null';
  if (!byS[s]) byS[s] = {a:0,t:0};
  byS[s].t++;
  if (l.is_active) byS[s].a++;
});
Object.entries(byS).forEach(([s, v]) => console.log(`  ${s}: active=${v.a} total=${v.t}`));
