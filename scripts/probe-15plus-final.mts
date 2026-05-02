import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local', 'utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: cat } = await sb.from('categories').select('id').eq('slug', 'akilli-telefon').single();
const { data: phones } = await sb.from('products').select('id, title, brand, is_accessory, slug').eq('category_id', cat?.id).eq('is_active', true).ilike('title', '%iphone 15 plus%128%');
console.log(`iPhone 15 Plus 128GB phones: ${phones?.length}`);

for (const p of phones || []) {
  const { data: lst } = await sb.from('listings').select('source, price, is_active, in_stock').eq('product_id', p.id);
  const active = lst?.filter(l => l.is_active);
  console.log(`\n${p.title?.slice(0,70)}`);
  console.log(`  brand=${p.brand} acc=${p.is_accessory} listings=${lst?.length} active=${active?.length}`);
  active?.forEach(l => console.log(`    ${l.source} | ${l.price} | in_stock=${l.in_stock}`));
}
