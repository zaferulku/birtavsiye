const cftMod = await import("../src/lib/categorizeFromTitle.ts");
const cft = (cftMod as any).categorizeFromTitle;
const tests = [
  "Rosense Yüz Kremi 50 ml - Normal karma Cilt İçin",
  "The Organic Pharmacy Retinol Night Serum %2,5 30 ml",
  "Sheıda Terekota Allık No:21",
  "Diorshow 24H Stylo Waterproof Eyeliner",
  "Contigo Westloop Autoseal Termos Bardak 470ML",
  "NATUREHİKE U350 -13 DERECE KAPÜŞONLU UYKU TULUMU",
  "Kingston /8 8 GB 3200 MHz Ram",
  "TP-Link 8 Port 10/100/1000 Mbps Desktop Switch",
  "Nivea Derma Skin Clear Salisilik Asit Tonik 200 ml",
  "Big Joy Big Whey Go Protein Tozu 2268 Gr",
  "Pastel Profashion Eyeliner Siyah",
  "Maybelline Maskara Sky High Black",
];
for (const t of tests) {
  const r = cft(t);
  console.log(`  ${(r.slug ?? "—").padEnd(28)} [${r.confidence}] ${r.matchedKeyword?.padEnd(25) ?? "—".padEnd(25)} :: ${t.slice(0, 70)}`);
}
