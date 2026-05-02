import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local', 'utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Sadece akilli-telefon kategorisindeki iphone 15 plus
const { data: cat } = await sb.from('categories').select('id').eq('slug', 'akilli-telefon').single();
const { data: phones } = await sb.from('products').select('id, title, brand, embedding, category_id, is_accessory').eq('category_id', cat?.id).eq('is_active', true).ilike('title', '%iphone%15%plus%').limit(20);
console.log(`akilli-telefon + iphone 15 plus: ${phones?.length} ürün`);
phones?.forEach(p => {
  console.log(`  [${p.id.slice(0,8)}] ${p.title?.slice(0,80)} | brand=${p.brand} | emb=${p.embedding?'Y':'N'} | acc=${p.is_accessory}`);
});

// Olası multi-source product 6c475bd5
const { data: target } = await sb.from('products').select('*').eq('id', '6c475bd5-d58e-46e8-832e-b0c0cc9c26b3').single();
console.log("\n6c475bd5 product:", JSON.stringify({ title: target?.title, brand: target?.brand, category_id: target?.category_id, is_accessory: target?.is_accessory, is_active: target?.is_active }));
