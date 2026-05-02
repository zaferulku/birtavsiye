/**
 * Header.tsx tag'lerinden urun-tipi olanlari DB leaf kategorisine donusturur.
 *
 * Tag'ler iki kategoride:
 *   1. MARKA (Apple, Samsung, Nivea, Dove, Bosch...) -> tag olarak kalir
 *   2. URUN TIPI (Vucut Losyonu, Camasir Makinesi, Sneaker...) -> DB leaf yapilir
 *
 * Output:
 *   - supabase/migrations/041_tag_leaf_categories.sql
 *   - scripts/.tag-leaf-mapping.json (Header patch icin)
 *
 * Mantik: BRAND_BLACKLIST'e dahil olmayan + slug-friendly tag'ler leaf yapilir.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'node:fs';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// === BRAND BLACKLIST (skip edilecekler) ===
const BRAND_BLACKLIST = new Set([
  // Tech
  'Apple', 'Samsung', 'Xiaomi', 'Huawei', 'OnePlus', 'Realme', 'Oppo', 'Honor', 'Reeder',
  'Google Pixel', 'Vivo', 'Motorola', 'Nokia', 'TCL', 'Casper', 'General Mobile', 'POCO',
  'Samsung Galaxy', 'iPhone', 'Galaxy S25', 'Galaxy S24', 'Galaxy A',
  'iPad', 'iPhone Kılıfı', 'Samsung Kılıfı', 'AirPods', 'Samsung Buds', 'Apple Watch',
  'Samsung Galaxy Watch', 'Xiaomi Band', 'Garmin', 'Huawei Watch', 'Fitbit',
  'Lenovo', 'Asus', 'MSI', 'MacBook', 'HP', 'Acer', 'Monster', 'Dell',
  'Asus ROG', 'MSI Gaming', 'Logitech', 'Razer', 'Microsoft', 'HyperX', 'SteelSeries',
  'Anker', 'Baseus', 'Aukey', 'Sony', 'JBL', 'Bose', 'Marshall', 'Harman Kardon', 'Jabra',
  'Canon', 'Nikon', 'Fujifilm', 'Olympus', 'GoPro', 'DJI', 'DJI Mini', 'DJI Air', 'DJI Mavic',
  'DJI Osmo Action', 'Insta360', 'Panasonic',
  'Bosch', 'Arçelik', 'LG', 'Vestel', 'Beko', 'Siemens', 'Grundig', 'Franke', 'Daikin', 'Mitsubishi',
  'Tefal', 'Philips', 'Braun', 'Rowenta', 'Russell Hobbs', 'KitchenAid', 'Arzum', 'Sinbo',
  'Goldmaster', 'Korkmaz', 'Karaca', 'Delonghi', 'Bialetti', 'Nespresso',
  'Dyson', 'Roomba', 'Eufy', 'Dreame', 'Roborock', 'Miele',
  'Babyliss', 'Remington', 'Dyson Supersonic', 'Dyson Airwrap',
  'Nike', 'Adidas', 'Puma', 'Converse', 'Vans', 'New Balance', 'Reebok', 'Asics', 'Skechers',
  'Nike Air Force', 'Adidas Stan Smith', 'Nike Kids', 'Adidas Kids',
  'Levi', "Levi's", 'Diesel', 'Tommy Hilfiger', 'Lacoste',
  'Nivea', 'Dove', 'Garnier', 'La Roche-Posay', 'Avene', 'Eucerin', 'Cetaphil', 'Olay',
  'Neutrogena', 'Origins', 'Freeman', 'The Ordinary', 'MAC', 'NYX', 'Maybelline', "L'Oreal",
  "L'Oréal", 'Sephora', 'Schwarzkopf', 'Pantene', 'Wella', 'Bvlgari', 'Chanel', 'Dior',
  'Estée Lauder', 'Clinique', 'Bioderma', 'Vichy', 'Isola', 'Altruist', 'Sebamed', 'Loreal',
  'Royal Canin', 'Pedigree', 'Pro Plan', 'Whiskas', 'Felix', "Hill's Science", "Hill's", 'Purina',
  'Vitakraft', 'Versele-Laga', 'Trill', 'Tetra', 'Aquael',
  'Pampers', 'Huggies', 'Sleepy', 'Molfix', 'Prima', 'Johnson', "Johnson's", 'Fisher-Price',
  'Vtech', 'Playmobil', 'LEGO', 'Barbie', 'Hot Wheels', 'Funko Pop', 'Marvel Figür', 'DC Figür',
  'LC Waikiki', 'Zara Kids',
  'Casio', 'Fossil', 'Michael Kors', 'Guess', 'Emporio Armani', 'Kate Spade',
  'Casio G-Shock', 'Seiko', 'Tissot', 'Hugo Boss', 'Citizen',
  'Ray-Ban', 'Oakley', 'Carrera',
  'Samsonite', 'American Tourister',
  'WMF', 'Le Creuset', 'Fender', 'Gibson', 'Yamaha', 'Cort', 'Roland', 'Yamaha PSR', 'Korg',
  'Pearl', 'Tama', 'Yamaha Davul', 'Shure', 'Audio-Technica', 'Focusrite',
  'Lavazza', 'Illy', 'Starbucks', 'Jacobs', 'Nescafe',
  'Milka', 'Ülker', 'M&M', 'Magnum', 'Algida', 'Panda',
  'Solgar', 'GNC', 'Now Foods', 'Solaray', "Nature's Way", 'Centrum', 'Supradyn',
  'Optimum Nutrition', 'ON Gold', 'Nutricost', 'MyProtein', 'Cellucor', 'Cellucor C4',
  'Gat Nitraflex', 'Scivation Xtend', 'Dymatize', 'Manduka', 'Gaiam',
  'Castrol', 'Mobil', 'Shell', 'Shell Helix', 'Brother',
  'NordicTrack', 'Technogym',
  'Bullet Journal', 'Moleskine', 'Leuchtturm',
  'Faber-Castell', 'Staedtler', 'Artline', 'Pilot FriXion', 'Arteza', 'Herlitz', 'Step by Step',
  // Resolution / spec tag'leri
  '4K', '8K', 'OLED', 'QLED', 'HDR', 'Full HD', 'HD', '720p', '1080p',
  'A+++', 'A++', 'A+', 'No-Frost',
  // Unisex/cinsiyet tag'leri (NAV'da zaten gosteriliyor ayri)
]);

// Pattern-based brand/dimension detection
function isBrandOrDimension(tag) {
  if (BRAND_BLACKLIST.has(tag)) return true;
  // Numerik pattern
  if (/^\d+\s*(inç|inch|kg|g|ml|L|GB|TB|mAh|W|V|cm|mm|mhz|ghz|fps)\b/i.test(tag)) return true;
  if (/^\d+W\d+$/.test(tag)) return true;
  if (/^[A-Z]{2,5}$/.test(tag)) return true;
  if (/^[A-Z]\d/.test(tag)) return true;
  return false;
}

const header = readFileSync('./src/app/components/layout/Header.tsx', 'utf8');

const subRe = /\{\s*label:\s*"([^"]+)",\s*slug:\s*"([^"]+)",\s*tags:\s*\[([^\]]+)\]/g;
const subTagPairs = [];
let m;
while ((m = subRe.exec(header)) !== null) {
  const [, subLabel, subSlug, tagsRaw] = m;
  const tags = [...tagsRaw.matchAll(/"([^"]+)"/g)].map(t => t[1]);
  subTagPairs.push({ subLabel, subSlug, tags });
}
console.log(`Sub-tag çiftleri: ${subTagPairs.length}`);

function slugify(text) {
  return text
    .toLocaleLowerCase('tr')
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
    .replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
    .replace(/&/g, ' ')
    .replace(/'/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

let allCats = []; let p = 0;
while (true) {
  const { data } = await sb.from('categories').select('id, slug').eq('is_active', true).range(p * 1000, p * 1000 + 999);
  if (!data || !data.length) break;
  allCats = allCats.concat(data);
  if (data.length < 1000) break;
  p++;
}
const slugToId = new Map(allCats.map(c => [c.slug, c.id]));
const slugSet = new Set(allCats.map(c => c.slug));

const proposed = [];
const skippedBrand = new Set();
const skippedExists = [];
const dupes = new Set();

for (const stp of subTagPairs) {
  const parentId = slugToId.get(stp.subSlug);
  if (!parentId) continue;

  for (const tag of stp.tags) {
    if (isBrandOrDimension(tag)) {
      skippedBrand.add(tag);
      continue;
    }
    const leafPart = slugify(tag);
    if (!leafPart) continue;
    const newSlug = `${stp.subSlug}/${leafPart}`;
    if (slugSet.has(newSlug)) {
      skippedExists.push({ tag, newSlug });
      continue;
    }
    if (dupes.has(newSlug)) continue;
    dupes.add(newSlug);

    proposed.push({
      subSlug: stp.subSlug,
      parentId,
      tag,
      leafPart,
      newSlug,
    });
  }
}

console.log(`Proposed yeni leaf: ${proposed.length}`);
console.log(`Marka olarak atlandı (unique): ${skippedBrand.size}`);
console.log(`DB'de zaten var: ${skippedExists.length}`);

const sqlLines = [
  '-- ============================================================================',
  '-- Migration 041 - Header tag urun-tipi -> DB leaf kategorisi',
  '-- ============================================================================',
  '-- Marka tag\'leri (Apple, Nivea, Bosch...) tag olarak kalir; urun-tipi tag\'ler',
  '-- (Vucut Losyonu, Sneaker...) DB leaf olarak eklenir.',
  '-- IDempotent: ON CONFLICT DO NOTHING.',
  '-- ============================================================================',
  '',
  'BEGIN;',
  '',
];

for (const p of proposed) {
  const nameEsc = p.tag.replace(/'/g, "''");
  const slugEsc = p.newSlug.replace(/'/g, "''");
  sqlLines.push(
    `INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('${slugEsc}', '${nameEsc}', '${p.parentId}', true, true) ON CONFLICT (slug) DO NOTHING;`
  );
}
sqlLines.push('');
sqlLines.push('COMMIT;');
sqlLines.push('');

writeFileSync('./supabase/migrations/041_tag_leaf_categories.sql', sqlLines.join('\n'));

const mapping = proposed.map(p => ({
  subSlug: p.subSlug,
  tag: p.tag,
  newSlug: p.newSlug,
}));
writeFileSync('./scripts/.tag-leaf-mapping.json', JSON.stringify(mapping, null, 2));

console.log('\n=== ÇIKTILAR ===');
console.log('  Migration: supabase/migrations/041_tag_leaf_categories.sql');
console.log('  Mapping:   scripts/.tag-leaf-mapping.json');

console.log('\n=== ÖRNEK YENİ LEAF (ilk 15) ===');
proposed.slice(0, 15).forEach(p => console.log(`  [${p.tag.padEnd(28)}] -> ${p.newSlug}`));

console.log(`\n=== ATLANDI: marka tag (top 20 unique) ===`);
[...skippedBrand].slice(0, 20).forEach(b => console.log(`  ${b}`));
