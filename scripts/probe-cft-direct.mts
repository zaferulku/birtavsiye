const m = await import("../src/lib/categorizeFromTitle.ts");
const cft = (m as { categorizeFromTitle: (t: string) => { slug: string|null; confidence: string; matchedKeyword?: string } }).categorizeFromTitle;
console.log("cft type:", typeof cft);
const tests = [
  "Sheida 4k Mega Liquid Fondöten - 20",
  "Pastel Show Your Happıness Blush Allık 203",
  "Avon Anew Yüz Kremi 50 ml",
  "Diorshow 24H Stylo Waterproof Eyeliner",
];
tests.forEach(t => {
  const r = cft(t);
  console.log(`  [${r.slug ?? '—'}] kw=${r.matchedKeyword ?? '—'} :: ${t}`);
});
