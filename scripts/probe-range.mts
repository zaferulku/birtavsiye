const mod = await import('../src/lib/search/queryParser');
const parseQuery = mod.parseQuery;
const tests = [
  "1-3 bin TL aralığında olsun",
  "1000-3000 TL",
  "1.000 TL - 3.000 TL arası",
  "1000 ile 3000 arası",
  "max 3000 lira",
  "3000 TL altı",
  "1000 lira üstü",
];
for (const t of tests) {
  const r = parseQuery(t, []);
  console.log(`"${t}" → min=${r.price_min} max=${r.price_max}`);
}
