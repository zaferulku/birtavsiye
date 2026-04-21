// Sistem içi metadata anahtarları — kullanıcıya gösterilmez
const HIDDEN_KEYS = new Set([
  "pttavm_category", "pttavm_path",
  "mediamarkt_category", "mediamarkt_path",
  "merchant", "mpn", "sku",
  "original_title",
  "_akakce", "_akakce_offers", "_offers",
]);

// Key adında geçerse kullanıcıya gösterilmez (fiyat, satıcı, URL, stok bilgileri Teknik Özellikler'de gereksiz)
const HIDDEN_KEY_PATTERNS = /fiyat|satıcı|satici|price|seller|url|mağaza|magaza|store|kargo|stock|stok|indirim|kampanya/i;

const PRIORITY_KEYS = [
  "Ürün Tipi",
  "Çıkış Tarihi",
  "Çıkış Yılı",
  "Seri",
  "Ekran Boyutu",
  "Ekran Boyutu (inç)",
  "Ekran boyutu cm / inç",
  "Ekran Çözünürlüğü",
  "İşlemci",
  "RAM",
  "RAM Kapasitesi",
  "Bellek Kapasitesi",
  "Dahili Hafıza",
  "Depolama",
  "Arka Kamera",
  "Ön Kamera",
  "Pil Kapasitesi",
  "Batarya Kapasitesi",
  "İşletim Sistemi",
  "Mobil Erişim Teknolojisi",
  "Mobil Telefon Standardı",
  "Çift SİM",
  "SIM-kart boyutu",
  "WİFİ",
  "Bluetooth",
  "Ağırlık",
  "Renk",
  "Renk (Üreticiye Göre)",
];

export default function SpecsTable({ specs }: { specs: Record<string, unknown> | null }) {
  if (!specs) return null;

  const toStr = (v: unknown): string => {
    if (v == null) return "";
    if (typeof v === "string") return v;
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    return "";
  };

  const filtered = Object.entries(specs)
    .filter(([k, v]) => !HIDDEN_KEYS.has(k) && !HIDDEN_KEY_PATTERNS.test(k) && toStr(v).length > 0)
    .map(([k, v]) => [k, toStr(v)] as [string, string]);

  if (filtered.length === 0) return null;

  const priorityIndex = new Map(PRIORITY_KEYS.map((k, i) => [k, i]));
  filtered.sort((a, b) => {
    const ai = priorityIndex.has(a[0]) ? priorityIndex.get(a[0])! : 999;
    const bi = priorityIndex.has(b[0]) ? priorityIndex.get(b[0])! : 999;
    if (ai !== bi) return ai - bi;
    return a[0].localeCompare(b[0], "tr");
  });

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h2 className="font-bold text-lg text-gray-900 mb-4">Teknik Özellikler</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <tbody>
            {filtered.map(([key, value], i) => (
              <tr key={key} className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                <th scope="row" className="text-left font-semibold text-gray-600 px-4 py-2.5 w-1/3 align-top">
                  {key}
                </th>
                <td className="text-gray-900 px-4 py-2.5 align-top">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
