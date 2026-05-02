import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local','utf8');
const env: Record<string,string>={};
text.split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'');});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Önce source dağılımı
const sources = ['pttavm', 'mediamarkt', 'trendyol', 'hepsiburada', 'amazon-tr', 'n11'];
console.log("Per-source listing count:");
for (const s of sources) {
  const { count } = await sb.from('listings').select('*', { count: 'exact', head: true }).eq('is_active', true).eq('source', s);
  console.log(`  ${s.padEnd(12)}: ${count}`);
}

// mediamarkt + pttavm overlap
console.log("\nOverlap analiz - mediamarkt'taki ürünlerden pttavm'da da olanlar:");
const { data: mmListings } = await sb.from('listings').select('product_id').eq('source', 'mediamarkt').eq('is_active', true).limit(1000);
const mmIds = new Set((mmListings ?? []).map((l: any) => l.product_id));
console.log(`  mediamarkt unique products: ${mmIds.size}`);

// Bu ID'lerin pttavm'da da olanları
const ids = [...mmIds];
const { data: ptListings } = await sb.from('listings').select('product_id, products!inner(slug, title, brand)').eq('source', 'pttavm').eq('is_active', true).in('product_id', ids).limit(20);
console.log(`  Both mm+pt: ${ptListings?.length ?? 0}`);
ptListings?.slice(0, 10).forEach((l: any) => {
  console.log(`    ${l.products?.title?.slice(0,55)}`);
  console.log(`      slug: ${l.products?.slug}`);
});
