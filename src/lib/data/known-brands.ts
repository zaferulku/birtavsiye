/**
 * Single source of truth for Turkish e-commerce brand recognition.
 *
 * Two consumers:
 *  - intentParser.ts (LLM-side enrichment after structured intent extraction)
 *  - queryParser.ts (string-side regex match, unioned with DB-driven
 *    categories.related_brands so DB additions still take precedence)
 *
 * Add a brand by editing this file; both consumers pick it up.
 * Dedup is case-insensitive on import.
 */
const SEED: readonly string[] = [
  // Mobile / electronics
  "Apple", "Samsung", "Xiaomi", "Huawei", "Oppo", "Realme",
  "Tecno", "Vivo", "Casper", "TCL", "Omix", "General Mobile",
  "Honor", "POCO", "Reeder", "Nubia", "Nokia",
  "Lenovo", "HP", "Dell", "Asus", "Acer", "MSI",
  "Sony", "LG", "Philips", "Vestel", "Arcelik", "Arçelik", "Beko", "Bosch", "Siemens",
  "Dyson", "Karcher", "Tefal", "Fakir",
  "JBL", "Bose", "Sennheiser", "Audio-Technica", "Marshall", "Anker",
  "Nintendo", "Microsoft", "PlayStation",
  // Bebek
  "Prima", "Joonies", "Sleepy", "Huggies", "Aptamil", "Hipp", "Bebelac", "Milupa",
  "Avent", "NUK", "Tommee Tippee", "Mam", "Cybex", "Maxi-Cosi", "Chicco", "Britax",
  // Pet
  "Royal Canin", "Pro Plan", "Hills", "Whiskas", "Friskies", "Pedigree",
  // Kahve & mutfak
  "Nespresso", "Krups", "Sage", "DeLonghi", "Korkmaz", "Schafer",
  // Gıda
  "Nescafé",
  // Süpürge
  "Dreame", "iRobot", "Roborock",
  // Ev tekstil & mobilya
  "Karaca", "English Home", "Madame Coco", "Yataş", "İstikbal", "Bellona",
  // Kozmetik
  "Pastel", "Flormar", "Golden Rose", "Vichy", "Bioderma", "La Roche-Posay",
  // Moda / giyim
  "LCW", "LC Waikiki", "Mavi", "Koton", "Defacto", "DeFacto", "U.S. Polo Assn",
  "Polo", "Lacoste", "Nike", "Adidas", "Puma", "Reebok", "New Balance", "Skechers",
  "Pull&Bear", "Bershka", "Zara", "Mango", "H&M", "Stradivarius",
  "Columbia", "The North Face", "Salomon", "Timberland", "Decathlon", "Quechua",
];

export const KNOWN_BRANDS_TR: string[] = (() => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const b of SEED) {
    const key = b.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(b);
  }
  return out;
})();
