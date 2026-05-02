/**
 * Weak link sub'lari icin DB leaf kategori migration + Header.tsx mapping
 * uretir.
 *
 * Input: scripts/.nav-audit.json (probe-nav-db-compare ciktisi)
 * Output:
 *   - supabase/migrations/040_weak_leaf_categories.sql
 *   - scripts/.weak-leaf-mapping.json (Header.tsx patch icin)
 *
 * Mantik:
 *   1. weakLinks + partialWeak'taki tum sub'lari topla
 *   2. Her sub icin: parent = cat.slug, leafSlug = slugify(label),
 *      newFullSlug = parent + '/' + leafSlug
 *   3. DB'de bu slug yoksa migration'a INSERT ekle
 *   4. Header.tsx replacement map: { oldSlug, newSlug, label }
 *
 * IDempotent: ON CONFLICT DO NOTHING.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'node:fs';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const audit = JSON.parse(readFileSync('./scripts/.nav-audit.json', 'utf8'));

// Turkish-aware slugify
function slugify(text) {
  return text
    .toLocaleLowerCase('tr')
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
    .replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// DB'den mevcut sluglari + parent_id map'i fetch
let allCats = []; let p = 0;
while (true) {
  const { data } = await sb.from('categories').select('id, slug, parent_id').eq('is_active', true).range(p * 1000, p * 1000 + 999);
  if (!data || !data.length) break;
  allCats = allCats.concat(data);
  if (data.length < 1000) break;
  p++;
}
const slugToId = new Map(allCats.map(c => [c.slug, c.id]));
const slugSet = new Set(allCats.map(c => c.slug));

// Weak sub'lari topla
const weakSubs = [];
for (const cat of audit.weakLinks ?? []) {
  for (const sub of cat.subs) {
    weakSubs.push({ catSlug: cat.slug, subLabel: sub.label, oldSlug: sub.slug });
  }
}
for (const cat of audit.partialWeak ?? []) {
  for (const sub of cat.weakSubs) {
    weakSubs.push({ catSlug: cat.slug, subLabel: sub.label, oldSlug: sub.slug });
  }
}

console.log(`Weak sub toplam: ${weakSubs.length}`);

const proposed = [];
const skipped = [];
const dupes = new Set();

for (const ws of weakSubs) {
  const parentId = slugToId.get(ws.catSlug);
  if (!parentId) {
    skipped.push({ ...ws, reason: 'parent_not_in_db' });
    continue;
  }
  const leafPart = slugify(ws.subLabel);
  if (!leafPart) {
    skipped.push({ ...ws, reason: 'empty_slugify' });
    continue;
  }
  const newSlug = `${ws.catSlug}/${leafPart}`;

  if (slugSet.has(newSlug)) {
    skipped.push({ ...ws, newSlug, reason: 'already_exists' });
    continue;
  }
  if (dupes.has(newSlug)) {
    skipped.push({ ...ws, newSlug, reason: 'duplicate_in_proposal' });
    continue;
  }
  dupes.add(newSlug);

  proposed.push({
    catSlug: ws.catSlug,
    parentId,
    label: ws.subLabel,
    leafSlug: leafPart,
    newSlug,
    oldSlug: ws.oldSlug,
  });
}

console.log(`Proposed yeni leaf: ${proposed.length}`);
console.log(`Skipped: ${skipped.length}`);

const skipReasons = {};
for (const s of skipped) skipReasons[s.reason] = (skipReasons[s.reason] || 0) + 1;
console.log('Skip nedenleri:', skipReasons);

const sqlLines = [
  '-- ============================================================================',
  '-- Migration 040 — Weak link sub kategorileri icin DB leaf olustur',
  '-- ============================================================================',
  '-- KOK: NAV mega-dropdown sub linkleri parent slug ile ayni (cat.slug == sub.slug)',
  '-- pattern. Kullanici "Erkek Spor Giyim" tikladiginda "Spor & Outdoor" parent',
  '-- sayfasi aciliyor (UX bug). DB\'de daha derin leaf hic olusturulmamis.',
  '--',
  '-- COZUM: Her weak sub icin DB\'ye yeni leaf kategori INSERT.',
  '-- Header.tsx ayrica guncellenir (eski parent slug -> yeni leaf slug).',
  '--',
  '-- IDempotent: ON CONFLICT DO NOTHING.',
  '-- ============================================================================',
  '',
  'BEGIN;',
  '',
];

for (const p of proposed) {
  const nameEscaped = p.label.replace(/'/g, "''");
  const slugEscaped = p.newSlug.replace(/'/g, "''");
  sqlLines.push(
    `INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('${slugEscaped}', '${nameEscaped}', '${p.parentId}', true, true) ON CONFLICT (slug) DO NOTHING;`
  );
}

sqlLines.push('');
sqlLines.push('COMMIT;');
sqlLines.push('');

writeFileSync('./supabase/migrations/040_weak_leaf_categories.sql', sqlLines.join('\n'));

const mapping = proposed.map(p => ({
  catSlug: p.catSlug,
  label: p.label,
  oldSlug: p.oldSlug,
  newSlug: p.newSlug,
}));
writeFileSync('./scripts/.weak-leaf-mapping.json', JSON.stringify(mapping, null, 2));

console.log('\n=== UPLOAD HEDEFLERI ===');
console.log('Migration: supabase/migrations/040_weak_leaf_categories.sql');
console.log('Mapping:   scripts/.weak-leaf-mapping.json');

console.log('\n=== ÖRNEK İLK 10 ÖNERİ ===');
proposed.slice(0, 10).forEach(p => {
  console.log(`  [${p.label.padEnd(30)}] -> ${p.newSlug}`);
});
