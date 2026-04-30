// Specs JSON whitelist — products.specs alanında saklanacak güvenilir key'ler.
// Scraper'lar 1686 farklı key üretiyor; çoğu kirli/internal. Bu whitelist
// search_vector + frontend filter + display için kullanılan key'leri tutar.
//
// STRATEJİ: Universal whitelist (kategori-bağımsız). Eğer ileride kategori
// bazlı whitelist gerekirse `byCategory` map eklenir.

// 1) UNIVERSAL — tüm kategorilerde anlamlı
export const UNIVERSAL_WHITELIST = new Set([
  "gtin13",                          // barcode (matching için kritik)
  "Renk", "Renk (Üreticiye Göre)",   // color
  "Ağırlık", "Ağırlık (Üreticiye Göre)",
  "Genişlik", "Yükseklik", "Derinlik",
  "Boyutlar (GxYxD) / Ağırlık", "Boyutlar (G/Y/D)",
  "Malzeme", "Kasa Malzemesi",
  "Üretim Yeri", "Menşei",
  "Üretici Garantisi",
  "Kapasite", "Hacimsel kapasite", "Hacim",
  "Kutu İçeriği",
]);

// 2) ELEKTRONİK — telefon, laptop, tablet, akıllı saat
export const ELECTRONICS_WHITELIST = new Set([
  "İşletim Sistemi", "İşletim sistemi sürümü",
  "İşlemci", "İşlemci Hızı", "İşlemci Çekirdek Sayısı",
  "RAM Bellek Boyutu", "RAM Tipi",
  "Bellek Kapasitesi", "Sabit disk tipi", "Sabit disk kapasitesi",
  "Ekran Boyutu", "Ekran Boyutu (inç)", "Ekran boyutu(cm)", "Ekran boyutu cm / inç",
  "Ekran", "Ekran Tipi", "Ekran Çözünürlüğü", "Ekran Yenileme Hızı",
  "Çözünürlük", "Çözünürlük (YxG)", "Çözünürlük yüksekliği", "Çözünürlük genişliği",
  "Piksel yoğunluğu",
  "Bluetooth", "Bluetooth Sürümü", "Bluetooth Versiyonu",
  "WİFİ", "GPS", "NFC (Yakın Alan) Desteği",
  "Bağlantılar",
  "Ön Kamera", "Ön Kamera Çözünürlüğü", "Ön Kamera Özellikleri",
  "Arka kamera", "Arka kamera çözünürlüğü", "Arka Kamera Özellikleri",
  "Optik Zoom", "Dijital Zoom",
  "Batarya Tipi", "Batarya kapasitesi", "Batarya Ömrü",
  "Değiştirilebilir batarya", "Şarj Süresi", "Hızlı yeniden şarj",
  "Kablosuz Şarj", "USB-C Bağlantı Noktası Üzerinden Şarjı Destekler",
  "USB-C Şarj Adaptörü Dahil",
  "SIM-kart boyutu", "Çift SİM",
  "Mobil Telefon Standardı", "EDGE", "Gsm",
  "Parmak İzi Sensörü", "Yüz Tanıma",
  "Su sıçramasına dayanıklı",
  "Dokunmatik ekran", "Curved ekran",
  "Grafik Kartı",
  "Ön panel kamerası",
]);

// 3) BEYAZ EŞYA — buzdolabı, çamaşır makinesi, kurutucu, fırın, klima
export const APPLIANCE_WHITELIST = new Set([
  "AB Enerji Verimliliği Ölçeği (EU 2017/1369)",
  "Enerji Verimliliği Sınıfı (EU 2017/1369)",
  "Enerji Sınıfı",
  "Yıkama Kapasitesi", "Kurutma Kapasitesi",
  "Devir Sayısı (rpm)", "Devir",
  "Ses Düzeyi (dB)",
  "Su Tüketimi", "Enerji Tüketimi",
  "Soğutma Kapasitesi", "Isıtma Kapasitesi",
  "BTU/h",
  "Net Hacim", "Brüt Hacim",
  "Dondurucu Hacmi",
]);

// 4) MUTFAK / KÜÇÜK EV ALETLERİ
export const KITCHEN_WHITELIST = new Set([
  "Güç (W)", "Güç seviyesi", "Maksimum güç",
  "Hız Ayarı", "Hız Sayısı",
  "Pulse Fonksiyonu",
  "Hazne Kapasitesi", "Sürahi Kapasitesi",
  "Kahve Hazırlama Kapasitesi", "Su Tankı Kapasitesi",
  "Bar Basıncı",
  "Pişirme Programı Sayısı",
]);

// 5) MEDYA / TV / AUDIO
export const MEDIA_WHITELIST = new Set([
  "Görüntü Oranı",
  "Smart TV", "İşletim Tipi", "İşletim tipi",
  "HDR",
  "Renkli Ekran",
  "Ses Çıkış Gücü",
  "Çevre Sesi", "Surround Sound",
  "Dahili Radyo",
  "HDMI", "USB",
  "Wi-Fi Direct",
  "Yapay Zeka", "Yapay Zeka İşlevleri",
]);

// Birleşik tüm-anlamlı set (lookup için)
export const ALL_ALLOWED_KEYS = new Set([
  ...UNIVERSAL_WHITELIST,
  ...ELECTRONICS_WHITELIST,
  ...APPLIANCE_WHITELIST,
  ...KITCHEN_WHITELIST,
  ...MEDIA_WHITELIST,
]);

// AÇIK BLACKLIST — explicit drop (whitelist'te olmasa bile özellikle vurgu için)
// Bu key'ler ASLA tutulmaz — internal ID veya scraper artifact.
export const EXPLICIT_BLACKLIST = new Set([
  "original_title",
  "_akakce", "_akakce_offers",
  "pttavm_category", "mediamarkt_category", "mediamarkt_path",
  "merchant", "sku", "mpn",
  "Manufacturer Part Number (MPN)",
  "Fiyat", // listings tablosuna ait
  "Popülerlik", "Ortalama Puan",
  "Ürün belgeleri",
  "Ürün Tipi", // çok generic, search'te yardım etmiyor
  "Özel Nitelikler", // yapısız
  "Acil durum çağrı fonksiyonu", // niche
  "Çıkış Yılı", "Seri",
  "Çevre Dostu", // çok subjective
]);

/**
 * Bir specs nesnesini whitelist'e göre filtrele.
 * Whitelist'te olmayan VEYA blacklist'te olan tüm key'ler atılır.
 * Underscore ile başlayan tüm key'ler atılır (internal flag konvansiyonu).
 */
export function filterSpecsWhitelist(specs) {
  if (!specs || typeof specs !== "object") return {};
  const filtered = {};
  for (const [key, value] of Object.entries(specs)) {
    if (key.startsWith("_")) continue;
    if (EXPLICIT_BLACKLIST.has(key)) continue;
    if (!ALL_ALLOWED_KEYS.has(key)) continue;
    if (value === null || value === undefined || value === "") continue;
    if (value === "null") continue;
    filtered[key] = value;
  }
  return filtered;
}
