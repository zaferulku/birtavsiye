// PttAVM/MediaMarkt/internal metadata — kullanıcıya gösterilmez
const HIDDEN_KEYS = new Set([
  "pttavm_category", "pttavm_path",
  "mediamarkt_category", "mediamarkt_path",
  "merchant", "mpn", "sku",
]);

// Manufacturer-level keys, öncelik sırasıyla (üstte gösterilir)
const PRIORITY_KEYS = [
  "Ürün Tipi",
  "Çıkış Tarihi",
  "Ekran Boyutu (inç)",
  "Ekran boyutu cm / inç",
  "İşlemci",
  "RAM Kapasitesi",
  "Bellek Kapasitesi",
  "Depolama",
  "Arka Kamera",
  "Ön Kamera",
  "Pil Kapasitesi",
  "İşletim Sistemi",
  "Mobil Telefon Standardı",
  "Çift SİM",
  "SIM-kart boyutu",
  "WİFİ",
  "Ağırlık",
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
    .filter(([k, v]) => !HIDDEN_KEYS.has(k) && toStr(v).length > 0)
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
      <div className="divide-y divide-gray-50">
        {filtered.map(([key, value]) => (
          <div key={key} className="flex items-center py-3 gap-4">
            <div className="w-40 flex-shrink-0 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {key}
            </div>
            <div className="text-sm text-gray-800 font-medium">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
