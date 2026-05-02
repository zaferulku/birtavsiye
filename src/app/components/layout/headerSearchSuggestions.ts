export type HeaderSearchSuggestion = {
  id: string;
  label: string;
  description: string;
};

const suggestionCatalog: HeaderSearchSuggestion[] = [
  { id: "iphone-15-pro", label: "iPhone 15 Pro", description: "Telefon" },
  { id: "iphone-16", label: "iPhone 16", description: "Telefon" },
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

export function getHeaderSearchSuggestions(query: string): HeaderSearchSuggestion[] {
  const normalized = normalize(query);
  if (normalized.length < 2) return [];

  const ranked = suggestionCatalog
    .map((item) => {
      const label = normalize(item.label);
      const description = normalize(item.description);
      let score = 0;

      if (label.startsWith(normalized)) score += 6;
      if (label.includes(normalized)) score += 4;
      if (description.includes(normalized)) score += 2;
      if (label.split(" ").some((token) => token.startsWith(normalized))) score += 2;

      return { item, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.item.label.localeCompare(right.item.label, "tr"));

  return ranked.slice(0, 6).map((entry) => entry.item);
}
