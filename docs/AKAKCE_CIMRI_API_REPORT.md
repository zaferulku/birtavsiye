# Akakçe & Cimri API Kaynak Raporu

**Tarih:** 2026-04-21
**Amaç:** Akakçe ve Cimri'nin ürün verilerini nereden/nasıl servis ettiğini tespit edip kendi scraping stratejimizi optimize etmek.

---

## TL;DR

- **Akakçe ve Cimri'nin public ürün verisi API'si YOK.** İkisi de SSR ile HTML üretiyor.
- **Her iki site de zengin JSON-LD structured data yayınlıyor** (schema.org `ProductGroup` / `Product`). Bu, HTML tablosu scraping'ine göre çok daha stabil ve kullanışlı.
- **Cloudflare managed challenge** her iki sitede de aktif — düz `fetch` çalışmıyor. Playwright + anti-detection bayrakları ile geçiliyor.
- **En verimli yol**: Playwright ile sayfayı aç → JSON-LD'yi parse et → zengin structured data'yı direkt kullan. HTML table scraping gerekmez.

---

## 1. Akakçe

### Sayfa rendering
- **Sunucu tarafı render** (SSR). Sayfa HTML'i tüm ürün, fiyat, satıcı verisini hazır içerir.
- `__NEXT_DATA__` yok, `window.__INITIAL_STATE__` yok.
- XHR/fetch çağrıları sadece: CSS/JS asset'ler, Google Analytics/Ads, price alert modal scripts. **Ürün verisi için API çağrısı yok.**

### Veri kaynağı: JSON-LD (`schema.org/ProductGroup`)
Sayfada tek bir `<script type="application/ld+json">` bloğu var; içeriği:

```json
{
  "@context": "https://schema.org/",
  "@type": "ProductGroup",
  "productGroupID": "282674948",
  "name": "iPhone 15 128 GB Siyah",
  "category": "Elektronik > Telefon Ürünleri > Cep Telefonu > Apple Cep Telefonu",
  "brand": { "@type": "Brand", "name": "Apple", "logo": "https://cdn.akakce.com/i/m/v1/apple.png" },
  "image": [{ "@type": "ImageObject", "contentUrl": "https://cdn.akakce.com/..." }],
  "offers": {
    "@type": "AggregateOffer",
    "offerCount": "97",
    "lowPrice": "46874.59",
    "highPrice": "63844.39",
    "offers": [
      { "@type": "Offer", "price": "47999.00", "url": "https://www.dr.com.tr/...", "seller": { "name": "D&R", "url": "https://www.akakce.com/magaza/dr" }, "availability": "InStock", "priceCurrency": "TRY" }
    ]
  }
}
```

**Bu bloktan alabileceğimiz veriler:**
- Ürün ID (`productGroupID`), başlık, SKU
- Tam kategori zinciri (breadcrumb)
- Marka adı + logo
- Tüm fotoğraf URL'leri
- **Tüm satıcılar ve fiyatları** (aggregate offers)
- Satıcı adı + akakçe mağaza URL'i
- Her satıcının kendi affiliate URL'i
- Stok durumu

### Cloudflare koruması
- Level: Managed Challenge ("Bir dakika lütfen...")
- Bypass: Playwright + `--disable-blink-features=AutomationControlled` + `navigator.webdriver = undefined` spoof
- Headless true/false çoğu zaman fark etmiyor.

### İlgili URL'ler
- Arama: `https://www.akakce.com/arama/?q=<query>`
- Ürün: `https://www.akakce.com/<kategori-slug>/en-ucuz-<urun-slug>-fiyati,<id>.html`
- Kategori: `https://www.akakce.com/<slug>.html` (örn. `cep-telefonu.html`)

---

## 2. Cimri

### Sayfa rendering
- **SSR** — HTML ürün bilgisini hazır gönderiyor.
- `__NEXT_DATA__` yok.
- **`/api/cimri` endpoint VAR** ama sadece analytics/event tracking için:
  - `productDetailPageViewEventMutation` (GraphQL-style mutation)
  - `domContentLoadedMutation`
  - `userEventsMutation`
  - Bunlar sadece kullanıcı davranışı logluyor — **ürün verisi dönmüyor**.

### Veri kaynağı: JSON-LD (`schema.org/Product` + `BreadcrumbList`)
```json
[
  {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "Apple iPhone 17 256GB",
    "sku": "2393572193",
    "brand": { "@type": "Brand", "name": "Apple" },
    "aggregateRating": { "ratingValue": 4.38, "reviewCount": 13 },
    "review": [
      { "author": "Anonim", "description": "Önsatıştan aldım geldiğinde tekrar yorum atacağım" }
    ]
  },
  {
    "@type": "BreadcrumbList",
    "itemListElement": [ "..." ]
  }
]
```

**Ekstra (HTML'den):**
- Fiyat geçmişi tablosu (tarih + en düşük fiyat) — değerli!
- Teknik özellikler tablosu (tech specs)
- Satıcı listesi + price comparison (HTML'de)

### Cloudflare koruması
- Akakçe ile aynı level (managed challenge).
- Ek olarak Cloudflare `challenge-platform/h/b/jsd/oneshot/...` JS challenges çalışıyor.
- Bypass stratejisi aynı (Playwright + anti-detection).

### İlgili URL'ler
- Arama: `https://www.cimri.com/arama?q=<query>`
- Ürün: `https://www.cimri.com/<kategori>/<slug>,a<id>`
- Kategori: `https://www.cimri.com/<kategori>`

---

## 3. Karşılaştırma

| Özellik | Akakçe | Cimri |
|---|---|---|
| Ürün verisi API | Yok | Yok (sadece analytics) |
| JSON-LD zenginliği | Yüksek (AggregateOffer + tüm satıcılar) | Orta (Product + Review) |
| Fiyat geçmişi | Yok (sadece güncel) | **Var** (HTML tablosunda) |
| Tüm satıcıların fiyat+URL'si JSON-LD'de | **Var** | Yok (HTML'den parse gerek) |
| Teknik özellikler (specs) | HTML tablosunda | HTML tablosunda |
| Cloudflare | Managed challenge | Managed challenge + extra JS |

**Kazanan**: Akakçe. JSON-LD'deki AggregateOffer bloğu tüm satıcı fiyatlarını + URL'lerini tek parse'da veriyor.

---

## 4. Önerilen strateji (kendi scraper'ımız için)

### Mevcut `scripts/enrich-from-akakce.mjs` iyileştirmeleri
Şu an HTML `<table>` parse ediyoruz. Şunlara geçelim:

```js
// HTML parse yerine JSON-LD:
const ld = await page.evaluate(() => {
  const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')];
  return scripts.map(s => { try { return JSON.parse(s.textContent); } catch { return null; } }).filter(Boolean);
});
const productGroup = ld.find(x => x["@type"] === "ProductGroup");
// productGroup.offers.offers → tüm satıcılar
// productGroup.image → tüm görseller
// productGroup.category → kategori zinciri
```

**Bu değişiklikle elde edeceklerimiz:**
1. **Her akakçe ürünü için N satıcının fiyatını + URL'ini** doğrudan DB'mize ekleyebiliriz (satıcı başına ayrı `products` row veya `prices` row).
2. Daha stabil (tablo class'ı değişirse kırılmaz; JSON-LD schema.org standart).
3. Kategori zincirini doğrudan mapleyebiliriz.

### Cimri'den ne alalım
- **Fiyat geçmişi** (en değerli). HTML tablosundan scrape edip kendi `price_history` tablomuza yazabiliriz.
- Review/rating aggregate.

### Hız
- Akakçe: ~7s/ürün (3s delay + navigate + 6s wait)
- Cimri: Cloudflare JS challenge daha yavaş — ~10s/ürün
- **Scale**: 23,000 ürün × 7s = ~45 saat Akakçe tamamlama. Parallel Playwright worker (3-5) ile ~10 saate iner.

---

## 5. Yasal ve etik notlar
- **Her iki site de public web sitesi.** robots.txt ve ToS kontrol edilmeli.
- Akakçe/Cimri affiliate URL'lerini DB'mizde saklarsak, onların affiliate partner'ı olmadan "satıcıya git" yönlendirmesi yapıyoruz — bu **affiliate link manipülasyonu** sayılabilir. İki seçenek:
  1. Bizim kendi affiliate hesaplarımızla (Trendyol, Hepsiburada vb.) direkt satıcılara link atmak.
  2. Akakçe'yi bir SOURCE olarak göstermek (kullanıcı akakçe'ye yönlendirilir, oradan satıcıya geçer).
- User-Agent'ımızı gerçek browser taklit etmekten ziyade, birtavsiye bot'u olarak dürüst belirtebiliriz (`birtavsiye-bot/1.0 (+https://birtavsiye.net/bot)`). Ama bu Cloudflare'i hemen bloklar — anti-detection şart.

---

## 6. Sonuç

- **Doğrudan API yok; JSON-LD scraping en hızlı ve stabil yol.**
- Mevcut scraper'ımız çalışıyor; JSON-LD'ye geçersek %3-5 daha hızlı + multi-seller data gelir.
- Cimri'den fiyat geçmişi scraping'i eklemek değerli (kendi analytics'imiz için).
- Bot koruması (iş planı notu) sonrası: rate limit, IP rotation, kendi proxy havuzumuz düşünülebilir.
