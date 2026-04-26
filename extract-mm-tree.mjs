import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const dir = './mm-cat-html';
const files = readdirSync(dir).filter(f => f.endsWith('.html'));

const tree = [];
let parseFails = 0;

for (const file of files) {
  const html = readFileSync(`${dir}/${file}`, 'utf-8');
  const matches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

  let breadcrumb = null;
  for (const m of matches) {
    try {
      const data = JSON.parse(m[1].trim());
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item['@type'] === 'BreadcrumbList' && Array.isArray(item.itemListElement)) {
          breadcrumb = item.itemListElement.map(el => ({
            position: el.position,
            name: el.name || (el.item && el.item.name),
            url: typeof el.item === 'string' ? el.item : el.item?.['@id'] ?? el.item?.url,
          }));
          break;
        }
      }
      if (breadcrumb) break;
    } catch { parseFails++; }
  }

  if (breadcrumb) {
    tree.push({
      slug: file.replace('.html', ''),
      breadcrumb,
      depth: breadcrumb.length,
    });
  }
}

tree.sort((a, b) => a.depth - b.depth || a.slug.localeCompare(b.slug));

console.log(`Toplam HTML dosya: ${files.length}`);
console.log(`Breadcrumb parse OK: ${tree.length}`);
console.log(`Parse fail (bozuk JSON): ${parseFails}`);

const maxDepth = tree.length ? Math.max(...tree.map(t => t.depth)) : 0;
console.log(`En derin: ${maxDepth}`);

const depthCount = {};
for (const t of tree) depthCount[t.depth] = (depthCount[t.depth] || 0) + 1;
console.log('Depth dagilimi:', JSON.stringify(depthCount));

const roots = new Map();
for (const t of tree) {
  if (t.breadcrumb && t.breadcrumb.length >= 2) {
    const root = t.breadcrumb[1].name;
    roots.set(root, (roots.get(root) || 0) + 1);
  }
}
console.log('\n=== ROOT KATEGORILER ===');
[...roots.entries()].sort((a,b) => b[1]-a[1]).forEach(([name, count]) => {
  console.log(`  ${String(count).padStart(4)} | ${name}`);
});

const leafs = tree.filter(t => t.depth >= 3);
console.log(`\nLeaf (depth >= 3): ${leafs.length}`);
console.log('\n=== ILK 50 LEAF ===');
for (const t of leafs.slice(0, 50)) {
  const path = t.breadcrumb.map(b => b.name).join(' > ');
  console.log('  ' + t.slug.padEnd(50) + ' | ' + path);
}

writeFileSync('mm-category-tree.json', JSON.stringify(tree, null, 2));
console.log('\nTam agac yazildi: mm-category-tree.json (boyut: ' + JSON.stringify(tree).length + ' chars)');
