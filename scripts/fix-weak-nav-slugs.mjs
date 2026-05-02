/**
 * Header.tsx weak sub slug'larini Migration 040 ile DB'ye eklenen yeni leaf
 * path'lerine baglar.
 *
 * Input: scripts/.weak-leaf-mapping.json (generate-weak-leaf-migration ciktisi)
 * Output: src/app/components/layout/Header.tsx (in-place edit)
 *
 * Strateji:
 *   - mapping.json icinde her entry: { catSlug, label, oldSlug, newSlug }
 *   - Header.tsx'te { label: "<label>", slug: "<oldSlug>" } pattern bul
 *   - "<oldSlug>" -> "<newSlug>" replace
 *
 * Cifte koruma: ayni label birden fazla yerde olabilir (orn. "Bilgisayar
 * Aksesuarlari" iki cat'de). Bu yuzden label + slug ikilisi ile match yapilir.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const mapping = JSON.parse(readFileSync('./scripts/.weak-leaf-mapping.json', 'utf8'));
const headerPath = './src/app/components/layout/Header.tsx';
let content = readFileSync(headerPath, 'utf8');

let totalReplacements = 0;
const log = [];

for (const m of mapping) {
  const labelEsc = m.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const oldSlugEsc = m.oldSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `(\\{\\s*label:\\s*"${labelEsc}",\\s*slug:\\s*)"${oldSlugEsc}"`,
    'g'
  );
  const before = content;
  content = content.replace(pattern, `$1"${m.newSlug}"`);
  const count = (before.match(pattern) || []).length;
  if (count > 0) {
    totalReplacements += count;
    log.push({ ...m, count });
  }
}

writeFileSync(headerPath, content);

console.log(`Toplam replacement: ${totalReplacements}`);
console.log(`Etkilenen mapping entry: ${log.length} / ${mapping.length}`);
console.log('\n=== ILK 15 REPLACEMENT ===');
log.slice(0, 15).forEach(r => {
  console.log(`  [${r.label.padEnd(30)}] ${r.oldSlug} -> ${r.newSlug} (${r.count}x)`);
});

const skipped = mapping.filter(m => !log.find(l => l.oldSlug === m.oldSlug && l.label === m.label));
if (skipped.length > 0) {
  console.log('\n=== ATLANDI (pattern yakalamadi) ===');
  skipped.slice(0, 20).forEach(s => console.log(`  ${s.label}: ${s.oldSlug} -> ${s.newSlug}`));
  if (skipped.length > 20) console.log(`  ... ${skipped.length - 20} daha`);
}
