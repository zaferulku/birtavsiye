/**
 * Brand-based classifier:
 *   1. Tüm classified products'tan brand → category dağılımı çıkar
 *   2. Her brand için baskın kategori (% > threshold) tespit et
 *   3. Aynı brand'ta unclassified ürünleri baskın kategoriye ata
 *
 * --dry-run: rapor, update yok
 * --threshold N: brand baskınlık eşiği (default 0.7 = %70)
 * --min-count N: min sample (default 10)
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local','utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'');});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const TH = parseFloat(args.find(a=>a.startsWith('--threshold='))?.split('=')[1] ?? '0.7');
const MIN = parseInt(args.find(a=>a.startsWith('--min-count='))?.split('=')[1] ?? '10', 10);

const { data: cats } = await sb.from('categories').select('id, slug');
type CatRow = { id: string; slug: string };
const catBySlug = new Map<string, string>(((cats ?? []) as CatRow[]).map((c) => [c.slug, c.id]));
const slugById = new Map<string, string>(((cats ?? []) as CatRow[]).map((c) => [c.id, c.slug]));
const unId = catBySlug.get('siniflandirilmamis');
if (!unId) { console.error("siniflandirilmamis yok"); process.exit(1); }

// 1. Tüm products: brand+category dağılımı (range pagination)
type ProductRow = { brand: string | null; category_id: string };
const all: ProductRow[] = [];
const PAGE = 1000;
let fromIdx = 0;
while (true) {
  const { data, error } = await sb.from('products').select('brand, category_id').range(fromIdx, fromIdx+PAGE-1);
  if (error) { console.error("read err:", error); process.exit(1); }
  if (!data || data.length === 0) break;
  all.push(...(data as ProductRow[]));
  process.stdout.write(`.`);
  if (data.length < PAGE) break;
  fromIdx += PAGE;
}
console.log("");
console.log(`Toplam product: ${all.length}`);

// brand → {catId: count}
const brandStats = new Map<string, Map<string, number>>();
all.forEach((p) => {
  const b = (p.brand ?? '').trim();
  if (!b) return;
  if (!brandStats.has(b)) brandStats.set(b, new Map());
  const m = brandStats.get(b)!;
  m.set(p.category_id, (m.get(p.category_id) ?? 0) + 1);
});

// brand → baskın kategori (sadece classified arasında)
const brandDominant = new Map<string, { catId: string; ratio: number; total: number; classified: number }>();
brandStats.forEach((catMap, brand) => {
  let total = 0;
  let totalClassified = 0;
  let bestCat = '';
  let bestCount = 0;
  catMap.forEach((cnt, cid) => {
    total += cnt;
    if (cid === unId) return;
    totalClassified += cnt;
    if (cnt > bestCount) { bestCount = cnt; bestCat = cid; }
  });
  if (totalClassified < MIN) return;
  const ratio = bestCount / totalClassified;
  if (ratio >= TH) brandDominant.set(brand, { catId: bestCat, ratio, total, classified: totalClassified });
});
console.log(`Baskın brand sayısı (≥${MIN} classified, ≥%${TH*100}): ${brandDominant.size}`);

// 2. Unclassified ürünleri baskın brand'a göre yeniden ata
const unclByBrand = new Map<string, string[]>(); // brand → [productIds]
let unclTotal = 0;
let unclFrom = 0;
while (true) {
  const { data } = await sb.from('products').select('id, brand').eq('category_id', unId).range(unclFrom, unclFrom+PAGE-1);
  if (!data || data.length === 0) break;
  (data as { id: string; brand: string | null }[]).forEach((p) => {
    const b = (p.brand ?? '').trim();
    if (!b || !brandDominant.has(b)) return;
    if (!unclByBrand.has(b)) unclByBrand.set(b, []);
    unclByBrand.get(b)!.push(p.id);
    unclTotal++;
  });
  if (data.length < PAGE) break;
  unclFrom += PAGE;
}
console.log(`Atanacak unclassified ürün: ${unclTotal}, brand sayısı: ${unclByBrand.size}`);

// 3. Update per category
let updated = 0; let errors = 0;
const byCategorySlug = new Map<string, number>();
for (const [brand, ids] of unclByBrand) {
  const dom = brandDominant.get(brand)!;
  const slug = slugById.get(dom.catId) ?? '?';
  byCategorySlug.set(slug, (byCategorySlug.get(slug) ?? 0) + ids.length);
  if (DRY) { updated += ids.length; continue; }
  // Chunked update (in 200 max)
  for (let i=0; i<ids.length; i+=200) {
    const chunk = ids.slice(i, i+200);
    const { error } = await sb.from('products')
      .update({ category_id: dom.catId, classified_at: new Date().toISOString() })
      .in('id', chunk);
    if (error) { errors += chunk.length; console.error(`  ${brand}: ${error.message}`); }
    else updated += chunk.length;
  }
}

console.log(`\n${DRY ? 'Atanacak' : 'Atandı'}: ${updated}, hata: ${errors}`);
console.log("\nKategori dağılımı:");
[...byCategorySlug.entries()].sort(([,a],[,b])=>b-a).slice(0,15).forEach(([s,n])=>console.log(`  ${s.padEnd(35)} ${n}`));

// Top 10 brand
console.log("\nTop 10 brand kullanılan:");
[...unclByBrand.entries()].map(([b,ids])=>[b,ids.length] as [string,number]).sort(([,a],[,b])=>b-a).slice(0,10).forEach(([b,n])=>{
  const dom = brandDominant.get(b)!;
  const slug = slugById.get(dom.catId) ?? '?';
  console.log(`  ${b.padEnd(20)} → ${slug.padEnd(28)} ${n} (brand %${(dom.ratio*100).toFixed(0)}, sample=${dom.classified})`);
});
