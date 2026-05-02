import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local','utf8');
const env: Record<string,string>={};
text.split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'');});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// 1. Backup unique source dağılımı
const { data: sources } = await sb.from('backup_20260422_products')
  .select('source').limit(50000);
const srcCount: Record<string,number> = {};
sources?.forEach((r:any)=>{srcCount[r.source ?? 'null'] = (srcCount[r.source ?? 'null']??0)+1;});
console.log("Backup source dağılımı:");
Object.entries(srcCount).sort(([,a],[,b])=>b-a).forEach(([s,n])=>console.log(`  ${s.padEnd(15)} ${n}`));

// 2. Backup'taki category_id'ler → categories tablosundan slug'lara map
const { data: cats } = await sb.from('categories').select('id, slug, name');
const catBySlug = new Map(cats?.map((c:any)=>[c.id,c.slug]) ?? []);
console.log(`\nToplam kategori: ${cats?.length}`);

// 3. Backup category_id dağılımı (top 20)
const { data: catData } = await sb.from('backup_20260422_products')
  .select('category_id').limit(50000);
const catCount: Record<string,number> = {};
catData?.forEach((r:any)=>{const slug=catBySlug.get(r.category_id) ?? 'NULL/NOT_FOUND'; catCount[slug] = (catCount[slug]??0)+1;});
console.log("\nBackup category dağılımı (top 20):");
Object.entries(catCount).sort(([,a],[,b])=>b-a).slice(0,20).forEach(([s,n])=>console.log(`  ${s.padEnd(35)} ${n}`));

// 4. Mevcut canonical products tablosu
const { count: canonTotal } = await sb.from('products').select('*',{count:'exact',head:true});
console.log(`\nMevcut canonical products tablosu: ${canonTotal} satır`);

// 5. Backup ↔ canonical overlap (slug ile)
const { data: backupSlugs } = await sb.from('backup_20260422_products').select('slug').limit(50000);
const allBackupSlugs = (backupSlugs ?? []).map((r:any)=>r.slug).filter(Boolean);
console.log(`Backup unique slug: ${new Set(allBackupSlugs).size}`);

// 6. Slug çakışması (kaç backup slug zaten canonical'da)
let chunks = 0, found = 0;
for (let i=0; i<allBackupSlugs.length; i+=1000) {
  const chunk = allBackupSlugs.slice(i,i+1000);
  const { data: existing } = await sb.from('products').select('slug').in('slug', chunk);
  found += existing?.length ?? 0;
  chunks++;
}
console.log(`Backup slug'ı zaten canonical'da olan: ${found} (= bunları skip edebiliriz)`);
console.log(`Migrasyon adayı (slug bazında yeni): ${allBackupSlugs.length - found}`);
