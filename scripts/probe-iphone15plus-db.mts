import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local','utf8');
const env: Record<string,string>={};
text.split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'');});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

console.log("=== DB ham veri: 'iphone 15 plus' içeren ürünler ===\n");
const { data: matches } = await sb
  .from('products')
  .select('id, title, brand, category_id, categories!inner(slug)')
  .eq('is_active', true)
  .ilike('title', '%iphone 15 plus%')
  .limit(50);
console.log(`Toplam match: ${matches?.length ?? 0}\n`);

const byCat: Record<string, number> = {};
matches?.forEach((p: any) => {
  const slug = p.categories?.slug ?? '?';
  byCat[slug] = (byCat[slug] ?? 0) + 1;
});
console.log("Kategori dağılımı:");
Object.entries(byCat).sort(([,a],[,b])=>b-a).forEach(([s,n])=>console.log(`  ${s.padEnd(30)} ${n}`));

console.log("\nİlk 10 örnek (sort: telefon önce):");
matches?.slice(0, 10).forEach((p: any) => {
  console.log(`  [${p.categories?.slug ?? '?'}] ${p.title?.slice(0,80)}`);
});

// "iphone 15 pro" sızması — DB'de doğrudan yok, ama search yanlış title döndürüyor mu?
console.log("\n\n=== 'iphone 15 pro' içerenler (sızıyor mu?) ===");
const { count: proCount } = await sb
  .from('products').select('*', { count: 'exact', head: true })
  .eq('is_active', true).ilike('title', '%iphone 15 pro%');
console.log(`Toplam 'pro': ${proCount}`);
