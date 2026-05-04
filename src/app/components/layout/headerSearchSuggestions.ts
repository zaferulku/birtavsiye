export type HeaderSearchSuggestion = {
  id: string;
  label: string;
  description: string;
};

const suggestionCatalog: HeaderSearchSuggestion[] = [
  { id: "iphone-15", label: "iPhone 15", description: "Telefon" },
  { id: "iphone-15-pro", label: "iPhone 15 Pro", description: "Telefon" },
  { id: "iphone-15-pro-max", label: "iPhone 15 Pro Max", description: "Telefon" },
  { id: "iphone-15-plus", label: "iPhone 15 Plus", description: "Telefon" },
  { id: "iphone-16", label: "iPhone 16", description: "Telefon" },
  { id: "iphone-16-plus", label: "iPhone 16 Plus", description: "Telefon" },
  { id: "iphone-16e", label: "iPhone 16e", description: "Telefon" },
  { id: "iphone-kilif", label: "iPhone kilif", description: "Telefon aksesuari" },
  { id: "samsung-galaxy", label: "Samsung Galaxy", description: "Telefon" },
  { id: "telefon", label: "Telefon", description: "Kategori" },
  { id: "tablet", label: "Tablet", description: "Kategori" },
  { id: "ipad", label: "iPad", description: "Tablet" },
  { id: "laptop", label: "Laptop", description: "Bilgisayar" },
  { id: "oyuncu-laptop", label: "Oyuncu laptopu", description: "Laptop" },
  { id: "macbook-air", label: "MacBook Air", description: "Laptop" },
  { id: "kulaklik", label: "Kulaklik", description: "Ses" },
  { id: "airpods-pro", label: "AirPods Pro", description: "Kulaklik" },
  { id: "televizyon", label: "Televizyon", description: "TV ve goruntu" },
  { id: "oled-tv", label: "OLED TV", description: "Televizyon" },
  { id: "monitor", label: "Monitör", description: "Ekran" },
  { id: "kahve", label: "Kahve", description: "Supermarket" },
  { id: "filtre-kahve", label: "Filtre kahve", description: "Kahve" },
  { id: "kahve-kapsulleri", label: "Kahve kapsulleri", description: "Kahve" },
  { id: "turk-kahvesi", label: "Turk kahvesi", description: "Kahve" },
  { id: "kahve-makinesi", label: "Kahve makinesi", description: "Kucuk ev aletleri" },
  { id: "espresso-makinesi", label: "Espresso makinesi", description: "Kahve" },
  { id: "robot-supurge", label: "Robot supurge", description: "Temizlik" },
  { id: "supurge", label: "Supurge", description: "Temizlik" },
  { id: "parfum", label: "Parfum", description: "Kozmetik" },
  { id: "deodorant", label: "Deodorant", description: "Kozmetik" },
  { id: "serum", label: "Serum", description: "Cilt bakimi" },
  { id: "elbise", label: "Elbise", description: "Moda" },
  { id: "kadin-sneaker", label: "Kadin sneaker", description: "Moda" },
  { id: "buzdolabi", label: "Buzdolabi", description: "Beyaz esya" },
  { id: "camasir-makinesi", label: "Camasir makinesi", description: "Beyaz esya" },
  { id: "klima", label: "Klima", description: "Beyaz esya" },
  { id: "kedi-mamasi", label: "Kedi mamasi", description: "Pet shop" },
  { id: "kopek-mamasi", label: "Kopek mamasi", description: "Pet shop" },
  { id: "kamp-cadiri", label: "Kamp cadiri", description: "Spor ve outdoor" },
];

function normalize(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .trim();
}

function splitTokens(value: string): string[] {
  return normalize(value).split(/\s+/).filter(Boolean);
}

function tokenMatches(candidateToken: string, queryToken: string): boolean {
  return candidateToken === queryToken || candidateToken.startsWith(queryToken);
}

function getStrictMatchScore(item: HeaderSearchSuggestion, normalizedQuery: string, queryTokens: string[]): number {
  const label = normalize(item.label);
  const description = normalize(item.description);
  const labelTokens = splitTokens(item.label);
  const searchableTokens = [...labelTokens, ...splitTokens(item.description)];

  const allTokensMatch = queryTokens.every((queryToken) =>
    searchableTokens.some((candidateToken) => tokenMatches(candidateToken, queryToken))
  );

  if (!allTokensMatch) return 0;

  let score = 1;
  if (label === normalizedQuery) score += 20;
  if (label.startsWith(normalizedQuery)) score += 14;
  if (label.includes(normalizedQuery)) score += 10;
  if (labelTokens.every((labelToken, index) => tokenMatches(labelToken, queryTokens[index] ?? ""))) score += 5;
  if (description.includes(normalizedQuery)) score += 2;
  score += Math.max(0, 6 - Math.abs(labelTokens.length - queryTokens.length));

  return score;
}

export function getHeaderSearchSuggestions(query: string): HeaderSearchSuggestion[] {
  const normalized = normalize(query);
  if (normalized.length < 2) return [];
  const queryTokens = splitTokens(query);

  const ranked = suggestionCatalog
    .map((item) => {
      return { item, score: getStrictMatchScore(item, normalized, queryTokens) };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.item.label.localeCompare(right.item.label, "tr"));

  return ranked.slice(0, 6).map((entry) => entry.item);
}
