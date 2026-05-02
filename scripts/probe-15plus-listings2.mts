import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local', 'utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const ids = ['62edcd3d-', '6c475bd5-', '55c546b7-'];
for (const idPrefix of ids) {
  const { data: ps } = await sb.from('products').select('id, title, brand, is_active, is_accessory, model_family, slug').gte('id', idPrefix).lt('id', idPrefix.slice(0, -1) + 'z').limit(2);
  if (!ps?.length) { console.log(`${idPrefix}: NOT FOUND`); continue; }
  const p = ps[0];
  const { data: lst } = await sb.from('listings').select('id, source, price, is_active, in_stock, last_seen').eq('product_id', p.id);
  console.log(`\n${p.title?.slice(0,70)}`);
  console.log(`  id=${p.id} brand=${p.brand} acc=${p.is_accessory} active=${p.is_active}`);
  console.log(`  slug=${p.slug?.slice(0,80)}`);
  console.log(`  model_family=${p.model_family}`);
  console.log(`  listings: ${lst?.length} (active=${lst?.filter(l=>l.is_active).length}, in_stock=${lst?.filter(l=>l.in_stock).length})`);
  lst?.forEach(l => console.log(`    ${l.source} | ${l.price} | active=${l.is_active} in_stock=${l.in_stock} seen=${l.last_seen?.slice(0,10)}`));
}
