# Ürün Teknik Özellikler Tablosu — Şablon

**Referans component:** [src/app/components/urun/SpecsTable.tsx](../src/app/components/urun/SpecsTable.tsx)

Bu tablo akakçe formatında, 3 kolonlu hizalı kompakt bir grid'dir. Yeni sayfalarda veya bileşenlerde aynı görünümü tekrar kullanmak için bu belgeyi baz al.

---

## 1. Görsel özet

- **Layout**: 1 kolon mobil → 2 kolon md → 3 kolon lg
- **Her satır**: `[label] : [value]` üçlüsü, sub-grid ile aynı kolondaki tüm label'ler dikey hizalı
- **Boolean değerler**: yeşil ✓ (var/evet/destekler) veya gri ✕ (yok/hayır)
- **Boş alanlar** hiç render edilmez
- **Sistem/servis anahtarları** (`_akakce`, `pttavm_category` vs.) gizlenir
- **Fiyat/satıcı/URL/stok** alanları regex ile gizlenir — teknik özelliklere ait değil

---

## 2. Şablon kod parçası

```tsx
const numCols = 3;
const rowsPerCol = Math.ceil(filtered.length / numCols);
const columns = [];
for (let i = 0; i < numCols; i++) {
  columns.push(filtered.slice(i * rowsPerCol, (i + 1) * rowsPerCol));
}

return (
  <div className="bg-white rounded-xl p-3 md:p-4 shadow-sm mb-3 md:mb-4">
    <h2 className="font-bold text-sm md:text-base text-gray-900 mb-2.5">Teknik Özellikler</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 text-[11px] md:text-[12px]">
      {columns.map((col, colIdx) => (
        <div key={colIdx} className="grid grid-cols-[max-content_auto_1fr] gap-x-1.5 items-baseline h-fit">
          {col.map(([key, value]) => (
            <div key={key} className="contents">
              <div className="text-gray-600 leading-tight py-1 pr-2">{key}</div>
              <div className="text-gray-400 py-1">:</div>
              <div className="text-gray-900 font-medium leading-tight py-1 break-words">
                {renderValue(value)}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);
```

**Kritik class'lar:**
- Outer grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8`
- Column sub-grid: `grid grid-cols-[max-content_auto_1fr] gap-x-1.5 items-baseline`
- Row wrapper: `className="contents"` (sub-grid satırı flat yerleştirmek için)
- Font: `text-[11px] md:text-[12px]`
- Padding: `p-3 md:p-4`

---

## 3. Filtreleme kuralları

### Gizlenen anahtarlar (tam eşleşme)
```js
const HIDDEN_KEYS = new Set([
  "pttavm_category", "pttavm_path",
  "mediamarkt_category", "mediamarkt_path",
  "merchant", "mpn", "sku",
  "original_title",
  "_akakce", "_akakce_offers", "_offers",
]);
```

### Gizlenen regex pattern'i
```js
const HIDDEN_KEY_PATTERNS = /fiyat|satıcı|satici|price|seller|url|mağaza|magaza|store|kargo|stock|stok|indirim|kampanya/i;
```

### Boş değer filtresi
```js
const filtered = Object.entries(specs).filter(
  ([k, v]) => !HIDDEN_KEYS.has(k) &&
              !HIDDEN_KEY_PATTERNS.test(k) &&
              toStr(v).length > 0
);
```

---

## 4. Priority sıralama

`PRIORITY_KEYS` listesi üstte gösterilecek alanların sırasını belirler. Akakçe'nin iPhone spec listesine göre optimize edildi.

```js
const PRIORITY_KEYS = [
  "Seri", "Dahili Hafıza", "RAM Kapasitesi", "Batarya Kapasitesi",
  "Çıkış Yılı", "Mobil Erişim Teknolojisi",
  "Ekran Boyutu", "Ekran Çözünürlüğü", "Ekran Yenileme Hızı", "Ekran Teknolojisi",
  "Arka Kamera Sayısı", "Arka Kamera", "Ön Kamera",
  "İşletim Sistemi", "İşlemci", "İşlemci Hızı", "Çekirdek Sayısı",
  "Chipset", "Hızlı Şarj", "Kablosuz Şarj", "Pil Türü",
  "USB Türü", "SIM Türü", "eSIM", "Bluetooth", "Wi-Fi",
  // ... (SpecsTable.tsx içinde tam liste)
];
```

Listede olmayan anahtarlar alfabetik (tr) sıralanır.

---

## 5. Boolean normalizasyon

```js
function isBooleanYes(v) {
  const s = v.trim().toLowerCase();
  return ["var", "yes", "true", "evet", "✓", "destekler", "mevcut"].includes(s);
}

function isBooleanNo(v) {
  const s = v.trim().toLowerCase();
  return ["yok", "no", "false", "hayır", "desteklemez"].includes(s);
}
```

---

## 6. Kullanım notları

- Yeni bileşende kullanırken filtreleme kurallarını SpecsTable'dan kopyala
- Mobil: `grid-cols-1` tek kolon dikey sıra
- Desktop: `lg:grid-cols-3` 3 kolon, her kolon `max-content` ile otomatik label genişliği
- Ekleme/çıkarma: `PRIORITY_KEYS`'e yeni anahtar eklemek yeterli — otomatik üstte çıkar
- Fiyat geçmişi veya satıcı listesi BURAYA KOYMA — ayrı component'ler var
