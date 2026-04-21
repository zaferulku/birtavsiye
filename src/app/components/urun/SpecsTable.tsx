const HIDDEN_KEYS = new Set([
  "pttavm_category", "pttavm_path",
  "mediamarkt_category", "mediamarkt_path",
  "merchant", "mpn", "sku",
  "original_title",
  "_akakce", "_akakce_offers", "_offers",
]);

const HIDDEN_KEY_PATTERNS = /fiyat|satıcı|satici|price|seller|url|mağaza|magaza|store|kargo|stock|stok|indirim|kampanya/i;

const PRIORITY_KEYS = [
  "Seri",
  "Dahili Hafıza",
  "RAM Kapasitesi",
  "Batarya Kapasitesi",
  "Çıkış Yılı",
  "Mobil Erişim Teknolojisi",
  "Ekran Boyutu",
  "Ekran Boyutu (inç)",
  "Ekran Çözünürlüğü",
  "Ekran Yenileme Hızı",
  "Ekran Teknolojisi",
  "Ekran Parlaklık Değeri",
  "Ekran Gövde Oranı",
  "Ekran Dayanıklılığı",
  "Dokunmatik",
  "HDR",
  "Always on Display",
  "Çerçevesiz",
  "Arka Kamera Sayısı",
  "Arka Kamera",
  "İkinci Arka Kamera",
  "Üçüncü Arka Kamera",
  "Video Kayıt Çözünürlüğü",
  "Video FPS Değeri",
  "Piksel Yoğunluğu",
  "Ön Kamera",
  "Ön Kamera Video Çözünürlüğü",
  "Ön Kamera Video FPS Değeri",
  "Ekran İçinde Ön Kamera",
  "Optik Görüntü Sabitleme",
  "İşletim Sistemi",
  "İşlemci",
  "İşlemci Hızı",
  "Çekirdek Sayısı",
  "Grafik İşlemcisi (GPU)",
  "Chipset",
  "Oyun",
  "Hızlı Şarj",
  "Kablosuz Şarj",
  "Kablosuz Şarj Gücü",
  "Pil Türü",
  "USB Türü",
  "SIM Türü",
  "eSIM",
  "Çift Hatlı",
  "Kulaklık Bağlantısı",
  "Hoparlör",
  "Bluetooth",
  "Bluetooth Versiyonu",
  "Wi-Fi",
  "WİFİ",
  "NFC",
  "GPS",
  "Ekran Yansıtma",
  "Gövde Malzemesi",
  "Çerçeve Malzemesi",
  "Suya Dayanıklı",
  "Suya Dayanıklılık Seviyesi",
  "Ağırlık",
  "Barometre",
  "İvmeölçer",
  "Jiroskop",
  "Yüz Tanıma",
  "Dolby Vision",
  "Yapay Zeka Destekli",
  "Boyut",
  "Akıllı",
  "Antutu",
  "Şarj Döngü Sayısı",
  "Onarılabilirlik Sınıfı",
  "Düşme Direnci Sınıfı",
  "Geekbench (Multi-Core)",
  "Renk",
  "Renk (Üreticiye Göre)",
];

function isBooleanYes(v: string): boolean {
  const s = v.trim().toLowerCase();
  return s === "var" || s === "yes" || s === "true" || s === "evet" || s === "✓" || s === "destekler" || s === "mevcut";
}
function isBooleanNo(v: string): boolean {
  const s = v.trim().toLowerCase();
  return s === "yok" || s === "no" || s === "false" || s === "hayır" || s === "desteklemez";
}

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
    <div className="bg-white rounded-xl p-3 md:p-4 shadow-sm mb-3 md:mb-4">
      <h2 className="font-bold text-sm md:text-base text-gray-900 mb-2.5">Teknik Özellikler</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-0 text-[11px] md:text-[12px]">
        {filtered.map(([key, value]) => {
          const yes = isBooleanYes(value);
          const no = isBooleanNo(value);
          return (
            <div key={key} className="flex items-baseline gap-1 py-0.5">
              <div className="text-gray-600 leading-tight whitespace-nowrap">{key}</div>
              <div className="text-gray-400">:</div>
              <div className="text-gray-900 font-medium leading-tight break-words">
                {yes ? (
                  <svg className="w-3.5 h-3.5 text-emerald-600 inline" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : no ? (
                  <svg className="w-3.5 h-3.5 text-gray-400 inline" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                ) : (
                  value
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
