const HIDDEN_KEYS = new Set([
  "pttavm_category", "pttavm_path",
  "mediamarkt_category", "mediamarkt_path",
  "merchant", "mpn", "sku",
  "original_title",
  "_akakce", "_akakce_offers", "_offers",
  // Spam/metadata — teknik özellik değil
  "Popülerlik", "Ortalama Puan", "Kullanıcı Puanı", "İnceleme Sayısı",
]);

const HIDDEN_KEY_PATTERNS = /fiyat|satıcı|satici|price|seller|url|mağaza|magaza|store|kargo|stock|stok|indirim|kampanya|popülerlik|ortalama\s*puan/i;

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
  // Kulaklık/ses alanları
  "Aktif Gürültü Önleme",
  "TWS",
  "Mikrofonlu",
  "Müzik Dinleyebilme",
  "Müzik Dinleme Süresi",
  "Şarj Kutulu",
  "Şarj Göstergesi",
  "Kablosuz",
  // Powerbank/şarj aletleri
  "Type-C Çıkış Sayısı",
  "USB Çıkış Sayısı",
  "Şarj Giriş Tipi",
  "Şarj Çıkışı",
  // Monitor/ek spec
  "Çözünürlük",
  "Çözünürlük Formatı",
  "Yenileme Hızı",
  "Ekran Kartı",
  "Yonga Seti",
  "İşlemci Çekirdek Sayısı",
  "Dahili Depolama",
  // Genel boyut
  "Batarya",
  "Genişlik",
  "Yükseklik",
  "Derinlik",
  "Türü",
  "Tipi",
  "Özellik",
  "Uyumlu Marka",
  // Dayanıklılık
  "Toza Dayanıklılık Seviyesi",
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

  // Placeholder-boş değerleri tanı (-, —, N/A, ?, boş, sadece whitespace)
  const isPlaceholderEmpty = (v: string): boolean => {
    const s = v.trim();
    if (s.length === 0) return true;
    if (/^(-+|—+|n\/?a|\?+|boş|yok bilgi|bilinmiyor)$/i.test(s)) return true;
    return false;
  };

  const filtered = Object.entries(specs)
    .filter(([k]) => !HIDDEN_KEYS.has(k) && !HIDDEN_KEY_PATTERNS.test(k))
    .map(([k, v]) => [k, toStr(v)] as [string, string])
    .filter(([, v]) => !isPlaceholderEmpty(v))
    // "Yok / Hayır / No / Desteklemez" olan satırları gizle — sadece pozitif sinyaller gösterilir
    .filter(([, v]) => !isBooleanNo(v));

  if (filtered.length === 0) return null;

  const priorityIndex = new Map(PRIORITY_KEYS.map((k, i) => [k, i]));
  filtered.sort((a, b) => {
    const ai = priorityIndex.has(a[0]) ? priorityIndex.get(a[0])! : 999;
    const bi = priorityIndex.has(b[0]) ? priorityIndex.get(b[0])! : 999;
    if (ai !== bi) return ai - bi;
    return a[0].localeCompare(b[0], "tr");
  });

  // 3 kolona eşit paylaştır
  const numCols = 3;
  const rowsPerCol = Math.ceil(filtered.length / numCols);
  const columns: [string, string][][] = [];
  for (let i = 0; i < numCols; i++) {
    columns.push(filtered.slice(i * rowsPerCol, (i + 1) * rowsPerCol));
  }

  return (
    <div className="bg-white rounded-xl p-3 md:p-4 shadow-sm mb-3 md:mb-4">
      <h2 className="font-bold text-sm md:text-base text-gray-900 mb-2.5">Teknik Özellikler</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 text-[11px] md:text-[12px]">
        {columns.map((col, colIdx) => (
          <div key={colIdx} className="grid grid-cols-[max-content_auto_1fr] gap-x-1.5 gap-y-0 items-baseline h-fit">
            {col.map(([key, value]) => {
              const yes = isBooleanYes(value);
              const no = isBooleanNo(value);
              return (
                <div key={key} className="contents">
                  <div className="text-gray-600 leading-tight py-1 pr-2">{key}</div>
                  <div className="text-gray-400 py-1">:</div>
                  <div className="text-gray-900 font-medium leading-tight py-1 break-words">
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
        ))}
      </div>
    </div>
  );
}
