import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local', 'utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { count: prodTotal } = await sb.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true);
const { count: listingsActive } = await sb.from('listings').select('*', { count: 'exact', head: true }).eq('is_active', true);
console.log(`Products active: ${prodTotal}  Listings active: ${listingsActive}`);

// spor-cantasi products with listing count
const { data } = await sb.from('products').select('id, title').eq('category_id', 'a448094d-f724-4043-940f-427f4faf1751').eq('is_active', true).limit(20);
const ids = data?.map(p=>p.id) ?? [];
const { data: lst } = await sb.from('listings').select('product_id, is_active, price').in('product_id', ids);
const map: Record<string, {active:number, total:number}> = {};
lst?.forEach(l => {
  if (!l.product_id) return;
  if (!map[l.product_id]) map[l.product_id] = {active:0,total:0};
  map[l.product_id].total++;
  if (l.is_active) map[l.product_id].active++;
});
console.log("Sample 20 spor-cantasi products listing coverage:");
data?.forEach(p => {
  const m = map[p.id] ?? {active:0,total:0};
  console.log(`  ${p.title?.slice(0,60)} | listings active=${m.active} total=${m.total}`);
});
