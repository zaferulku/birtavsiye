/**
 * Header.tsx'teki 80 leaf-suffix flat slug'i DB full path ile degistir.
 *
 * Input: scripts/.nav-audit.json (probe-nav-db-compare ciktisi)
 * Output: src/app/components/layout/Header.tsx (in-place edit)
 *
 * Kural: sadece QUOTED ("...") string olarak gecen flat slug'lar replace
 * edilir; tags/label icindeki text dokunulmaz.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const audit = JSON.parse(readFileSync('./scripts/.nav-audit.json', 'utf8'));
const headerPath = './src/app/components/layout/Header.tsx';
let content = readFileSync(headerPath, 'utf8');

let totalReplacements = 0;
const replacementLog = [];

for (const { flat, full } of audit.leafMatch) {
  // slug: "flat" -> slug: "full"
  // Sadece slug: prefix ile gelen quoted'lari replace et (tags/labels'i etkileme)
  const escaped = flat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(slug:\\s*)"${escaped}"`, 'g');
  const before = content;
  content = content.replace(pattern, `$1"${full}"`);
  const count = (before.match(pattern) || []).length;
  if (count > 0) {
    totalReplacements += count;
    replacementLog.push({ flat, full, count });
  }
}

writeFileSync(headerPath, content);

console.log(`Toplam replacement: ${totalReplacements}`);
console.log(`Etkilenen slug: ${replacementLog.length} / ${audit.leafMatch.length}`);
console.log('\n=== REPLACEMENT LOG (ilk 20) ===');
for (const r of replacementLog.slice(0, 20)) {
  console.log(`  ${r.flat.padEnd(28)} -> ${r.full.padEnd(50)} (${r.count}x)`);
}
if (replacementLog.length > 20) console.log(`  ... ${replacementLog.length - 20} daha`);

const skipped = audit.leafMatch.filter(({ flat }) => !replacementLog.find(r => r.flat === flat));
if (skipped.length > 0) {
  console.log('\n=== ATLANDI (slug: pattern yakalamadi) ===');
  skipped.forEach(s => console.log(`  ${s.flat} -> ${s.full}`));
}
