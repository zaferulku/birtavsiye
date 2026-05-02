import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Header.tsx'ten slug regex extract
const header = readFileSync('./src/app/components/layout/Header.tsx', 'utf8');
const navRaw = [...header.matchAll(/slug:\s*"([^"]+)"/g)].map(m => m[1]).filter(s => s && s !== '${slug}');
const navUnique = [...new Set(navRaw)].sort();
console.log('NAV slug satir toplam:', navRaw.length, 'unique:', navUnique.length);

// DB slug fetch
let all = []; let p = 0;
while (true) {
  const { data } = await sb.from('categories').select('id,slug,name,parent_id').eq('is_active', true).range(p * 1000, p * 1000 + 999);
  if (!data || !data.length) break;
  all = all.concat(data);
  if (data.length < 1000) break;
  p++;
}
const dbSlugs = all.map(c => c.slug);
const slugSet = new Set(dbSlugs);
const slugByName = new Map(all.map(c => [c.slug, c.name]));
console.log('DB unique slug:', dbSlugs.length);

const exactMatch = [];
const leafMatch = [];
const ambiguous = [];
const broken = [];

for (const nav of navUnique) {
  if (slugSet.has(nav)) {
    exactMatch.push({ nav, db: nav, name: slugByName.get(nav) });
    continue;
  }
  const candidates = dbSlugs.filter(s => s.endsWith('/' + nav));
  if (candidates.length === 1) {
    leafMatch.push({ nav, db: candidates[0], name: slugByName.get(candidates[0]) });
  } else if (candidates.length > 1) {
    ambiguous.push({ nav, candidates });
  } else {
    broken.push(nav);
  }
}

console.log('\n=== OZET ===');
console.log('Exact match:    ', exactMatch.length);
console.log('Leaf-suffix:    ', leafMatch.length);
console.log('Ambiguous (>1): ', ambiguous.length);
console.log('BROKEN:         ', broken.length);

console.log('\n=== EXACT (ilk 10 ornek) ===');
exactMatch.slice(0, 10).forEach(e => console.log(' ', e.nav));

console.log('\n=== LEAF-SUFFIX (tumu) ===');
leafMatch.forEach(e => console.log(' ', e.nav.padEnd(30), '->', e.db));

console.log('\n=== AMBIGUOUS ===');
ambiguous.forEach(a => console.log(' ', a.nav, '->', a.candidates.join(' | ')));

console.log('\n=== BROKEN ===');
broken.forEach(b => console.log(' ', b));

// === REVERSE AUDIT: DB'de olup NAV'da olmayan kategoriler ===
const navResolved = new Set([
  ...exactMatch.map(e => e.db),
  ...leafMatch.map(e => e.db),
]);

const orphanDb = dbSlugs.filter(s => !navResolved.has(s));

// Kategori derinliği grupla (root, sub, leaf)
const byDepth = { 1: [], 2: [], 3: [], 4: [] };
orphanDb.forEach(s => {
  const depth = s.split('/').length;
  if (byDepth[depth]) byDepth[depth].push(s);
});

console.log('\n=== DB\'DE OLUP NAV\'DA OLMAYAN (orphan kategoriler) ===');
console.log('Toplam orphan DB slug:', orphanDb.length, '(toplam DB:', dbSlugs.length, ', NAV resolved:', navResolved.size + ')');
console.log('\n  Root (depth 1):', byDepth[1].length);
byDepth[1].forEach(s => console.log('   ', s));
console.log('\n  Sub  (depth 2):', byDepth[2].length);
byDepth[2].forEach(s => console.log('   ', s));
console.log('\n  Leaf (depth 3):', byDepth[3].length);
byDepth[3].slice(0, 50).forEach(s => console.log('   ', s));
if (byDepth[3].length > 50) console.log('   ...', byDepth[3].length - 50, 'daha');
console.log('\n  Deep (depth 4+):', byDepth[4].length);
byDepth[4].slice(0, 20).forEach(s => console.log('   ', s));

// === WEAK-LINK AUDIT: bir cat'in tüm sub'ları cat slug'una mı gidiyor? ===
// "Erkek Spor Giyim" gibi sub'lar parent slug'ına işaret ediyorsa kullanıcı
// sub'a tıklayınca parent sayfası açılıyor (UX bug).
//
// NAV yapısını parse et: cat slug + sub slug listesi
const navStructure = [];
const catBlockRe = /label:\s*"([^"]+)",\s*slug:\s*"([^"]+)",\s*icon:[^,]+,\s*subs:\s*\[([\s\S]*?)\n\s*\]/g;
let m;
while ((m = catBlockRe.exec(header)) !== null) {
  const [, catLabel, catSlug, subsBlock] = m;
  const subRe = /\{\s*label:\s*"([^"]+)",\s*slug:\s*"([^"]+)"/g;
  const subs = [];
  let sm;
  while ((sm = subRe.exec(subsBlock)) !== null) {
    subs.push({ label: sm[1], slug: sm[2] });
  }
  navStructure.push({ catLabel, catSlug, subs });
}

const weakLinks = [];
const partialWeak = [];
for (const cat of navStructure) {
  const allSame = cat.subs.length > 0 && cat.subs.every(s => s.slug === cat.catSlug);
  const someSame = cat.subs.filter(s => s.slug === cat.catSlug);
  if (allSame) {
    weakLinks.push(cat);
  } else if (someSame.length > 0) {
    partialWeak.push({ ...cat, weakSubs: someSame });
  }
}

console.log('\n=== WEAK LINKS (cat.slug == sub.slug, tüm sub\'lar parent\'a gidiyor) ===');
weakLinks.forEach(c => {
  console.log(`\n  cat: "${c.catLabel}" -> ${c.catSlug}`);
  c.subs.forEach(s => console.log(`    sub: "${s.label}" -> ${s.slug}`));
});

console.log('\n=== PARTIAL WEAK (bazı sub\'lar parent\'a, bazıları değil) ===');
partialWeak.forEach(c => {
  console.log(`\n  cat: "${c.catLabel}" -> ${c.catSlug}`);
  c.weakSubs.forEach(s => console.log(`    weak sub: "${s.label}" -> ${s.slug}`));
});

// JSON çıktı dosyası — fix script kullanabilir
import('node:fs').then(({ writeFileSync }) => {
  const report = {
    exactMatch: exactMatch.map(e => e.nav),
    leafMatch: leafMatch.map(e => ({ flat: e.nav, full: e.db })),
    broken,
    orphanDb,
    weakLinks: weakLinks.map(c => ({ cat: c.catLabel, slug: c.catSlug, subs: c.subs })),
    partialWeak: partialWeak.map(c => ({ cat: c.catLabel, slug: c.catSlug, weakSubs: c.weakSubs })),
  };
  writeFileSync('./scripts/.nav-audit.json', JSON.stringify(report, null, 2));
  console.log('\nAudit JSON: scripts/.nav-audit.json');
});
