# Birtavsiye.net — Proje Durumu

> Bu dosya **tek kaynak gerçek**. Yeni sohbet/oturum başlattığınızda bu dosyayı
> Claude veya Claude Code'a verin — tüm bağlamı 30 saniyede alır.
>
> **Güncelleme kuralı:** Yeni karar/durum oluştuğunda buraya 1-2 satır ekleyin.
> Disiplinli tutulursa bağlam kaybolmaz.
>
> Son güncelleme: 2026-04-24

---

## 🎯 PROJE TANIMI

**Birtavsiye.net** — Türkçe fiyat karşılaştırma + AI tavsiye sitesi.
Akakçe/Cimri benzeri ama **AI chatbot ile farklılaşan** model.

**Yapısı:**
- **Sahibi:** Non-technical, Claude Code'u implementer olarak kullanıyor
- **Dil:** Türkçe (tüm UI, içerik, chatbot)
- **Stack:** Next.js 16, Supabase (Postgres + pgvector), Vercel
- **AI Sağlayıcılar:** NVIDIA NIM (Llama 3.3 70B), Groq (fallback), Gemini (embedding + classify)

**Farklılaşma noktası:** Chatbot **anlam katmanında** çalışır
("lavanta kokulu deodorant" → çiçeksi koku ailesi → öneri).
Akakçe/Cimri sadece kelime eşleşmesi yapar.

---

## 🔥 ŞU AN AKTIF (Bu hafta)

### 1. Chatbot UI yeniden yazımı (7 parça plan)
**Konum:** Parça 3 tamamlandı, Parça 4-7 sırada

**Tamamlanan:**
- ✅ Parça 1: `useChatStore.ts` — Zustand global state
- ✅ Parça 2: `ChatBar.tsx` — Sayfa altı sabit, pill-shape arama çubuğu
- ✅ Parça 3: `ChatPanel.tsx` — Sağdan slide-in chat penceresi
  (⚠ açılmıyor sorunu var, debug aktif)

**Sıradaki:**
- ⏳ Parça 4: Eski `ChatWidget.tsx` dosyalarını sil (orphan'lar)
- ⏳ Parça 5: `/sonuclar/page.tsx` — Önerilen ürünleri gösteren grid sayfası
- ⏳ Parça 6: + butonu image upload (B önce: DB'de ara, A sonra: LLM ile tarif)
- ⏳ Parça 7: Mikrofon Web Speech API (Türkçe ses → metin)

### 2. Faz 1 Classifier (RESTART edilecek)
**Durum:** Daha önce başlatılmıştı (task `b3abj4byv`), 427/10,564 ürün işlemiş
sonra kota tükenince durmuştu. Şimdi tekrar başlatılacak.

**Ne yapar:** `backup_20260422_products` (43,176 satır) → Gemini ile classify →
canonical products tablosuna ekler. Şu an 339 canonical var, hedef binler.

**Neden gerekli:** Mağaza partnerlik teklifleri için "10K+ ürünüm var" demek
gerekiyor + chatbot vector search havuzu büyür.

### 3. ChatPanel açılmıyor sorunu (ACİL)
ChatBar mesaj gönderiyor, `/sonuclar`'a yönlendiriyor ama sağdaki ChatPanel
açılmıyor. Tahmini sebep: Next.js App Router navigate sırasında Zustand store
hidrasyon kaybı. Debug log eklendi, tarayıcı testi bekleniyor.

---

## 📋 YAKIN ÖNCELİK (Bu hafta-Önümüzdeki hafta)

- **Mağaza entegrasyonları:** MediaMarkt + Trendyol URL pattern alignment
  (PttAVM canlı çalışıyor: `7eaaae0`)
- **Eski prices → listings refactor:** Yarısı yapıldı, kalan dosyalar:
  - `src/app/ara/page.tsx`
  - `src/app/api/public/products/*`
- **003 migration uygulama:** `forum counters atomic SQL` Supabase'e yüklenmeli
- **Header 68 kırık slug fix:** Kategori navigasyon UX bug'ı (üretimde)
- **Embedding cron:** Faz 1 her gün ~1500 yeni ürün eklerse, embedding'leri
  otomatik backfill edilmeli (manuel çalıştırma şimdilik yeterli)

---

## 🌟 UZAK ÖNCELİK (Bu ay değil)

- **Ürün eşleştirme engine** (5 katmanlı ensemble: GTIN/MPN → rule → semantic →
  manuel kuyruk → kullanıcı feedback). 5 günlük iş.
- **Wave 3 KB dokümanları:** küçük ev aletleri, spor, otomotiv, ev tekstili,
  yapı market, kitap/hobi (12 docs/121 chunks halen var)
- **Yeni özellikler:** Fiyat alarmı bildirimi, cron refresh, fiyat geçmişi grafiği
- **Forum MVP polish:** En iyi cevap, faydalı bul, raporlama, spam filter

---

## ⚖️ KRİTİK KARARLAR (GERİ ALINMAYACAK)

> Bunları sorgulama. Bilinçli kararlar.

| Karar | Tarih | Sebep |
|---|---|---|
| **middleware → proxy.ts** | 2026-04-24 | Next 16 deprecation, kasıtlı upgrade |
| **prices → listings + price_history** | 2026-04-24 | Eski şema fiyat geçmişi tutmuyordu, stok takibi yoktu |
| **Alarm condition fix** | 2026-04-24 | Önceki: target ≤ current (TERS), yeni: current ≤ target |
| **/api/refresh-prices auth zorunlu** | 2026-04-24 | Anonim açıktı, scrape suistimali riski |
| **Public forum endpoint whitelist** | 2026-04-24 | user_id gibi PII sızıyordu |
| **answer_count atomik SQL** | 2026-04-24 | Read-modify-write race condition |
| **Google Fonts kaldırıldı** | 2026-04-24 | KVKK + CSP + performans |
| **Chatbot intent parser: NVIDIA Llama 3.3 70B** | 2026-04-24 | Gemini kotasını koru (embed+classify için) |
| **Chatbot voice: Web Speech API (free)** | 2026-04-24 | Whisper sonra geçilebilir |
| **Chatbot fast/slow path ayrımı** | 2026-04-24 | Spesifik sorgu vs niyet sorgusu, latency optimizasyonu |
| **Klasik header arama + chatbot paralel** | 2026-04-24 | İkisi farklı amaca hizmet eder |
| **/sonuclar yönlendirme stratejisi** | 2026-04-24 | Her sorguda yeni route, URL paylaşılabilir |
| **Faz 1 başlatma onayı** | 2026-04-24 | Mağaza partnerlik için ürün havuzu kritik |

---

## 📦 BİLİNEN DURUM (Sayılar ve referanslar)

### Veritabanı
- **Aktif ürünler (canonical):** 339, hepsinin embedding'i hesaplandı (768-dim Gemini, %100)
- **Knowledge base chunks:** 121 (10 Türkçe doküman, 9 root kategori kapsamında)
- **Backup tabloları:**
  - `backup_20260422_products` (43,176 satır — Faz 1 kaynağı)
  - `backup_20260422_prices` (43,279 satır)
- **Kategori taksonomisi:** 13 root + 161 leaf kategori
- **Listings + price_history:** Yeni şema, sync route bunlara yazıyor

### Migrations (Supabase)
- ✅ `001_knowledge_base.sql` — KB tablo + retrieve_knowledge RPC
- ✅ `002_smart_search.sql` — Hybrid search RPC + indexler
- ⏳ `003_topic_answer_count_rpc.sql` — Forum atomik counter (yüklenmedi!)

### Knowledge Base dokümanları (`docs/knowledge/`)
1. parfum_notalari.md (10 chunk)
2. cilt_bakimi.md (11)
3. makyaj.md (12)
4. moda_ust_giyim.md (13)
5. moda_alt_giyim.md (14)
6. moda_ayakkabi.md (11)
7. elektronik_telefon.md
8. elektronik_laptop.md
9. beyaz_esya.md (20)
10. gida.md (8)
11. pet_shop.md (11)
12. anne_bebek.md (11)

### Chatbot mimarisi
- **Path detection:** Kısa+spesifik → fast (direct vector search), uzun+betimleyici → slow (RAG)
- **Slow path akışı:** KB retrieve → intent parse (Llama) → smart_search → response gen
- **Fallback chain (intent parser):** NVIDIA Llama 70B → Groq Llama 70B → Gemini Flash
- **Cache:** Intent 5dk LRU, KB 5dk LRU
- **Test sonuçları (2026-04-24, commit `888ea69`):** 4/4 senaryo geçti
  - Fast (iPhone): 4.4s, vector search OK
  - Slow + KB (lavanta deodorant): 16s, KB chunks 5, intent doğru, smart_search 0 ürün → fallback
  - Slow + cilt KB: 9.9s, niasinamid/salisilik asit/hyaluronik asit önerdi
  - Off-topic: 3.6s, kibarca yönlendirdi

### Latency hedefleri vs gerçek
- Fast path: 2s hedef, 4.4s gerçek (LLM gen payı)
- Slow path: 5s hedef, 9.9-16s gerçek (paralel optimizasyon yapılmadı henüz)

### Gemini kota
- Free tier: ~1500 RPD
- Bugünlük tüketim: KB ingest 121 + backfill 339 = 460 → ~1040 kalır
- Faz 1 başlatılırsa hızla yiyor

### Çalışan ana servisler
- **Live price (PttAVM):** SSE infra deployed (`705de96`), real PttAVM fetcher (`7eaaae0`)
- **MediaMarkt + Trendyol:** Interface uyumlu ama URL pattern placeholder (alignment bekliyor)
- **Sync route:** listings + price_history şemasına yazıyor
- **Header arama:** `/ara` sayfasına yönlendiriyor (klasik, AI değil)
- **Chatbot RAG:** `/api/chat` orchestrator ile çalışıyor (`888ea69`)

### Bilinen teknik borçlar
- Header.tsx'te 68 kırık slug (DB'de yok) — kategori navigasyon broken
- `src/app/ara/page.tsx` hâlâ eski `prices` şemasını okuyor
- `src/app/api/public/products/*` hâlâ eski `prices` şemasını okuyor
- `src/components/ChatWidget.tsx` ve `src/app/components/chat/ChatWidget.tsx` orphan
- Products specs çok kirli (Amazon parsing artifact: "37.5":"37.5" gibi keyler)
- brand: "null" string bug (classifier prompt artifact)

---

## ✅ YAKIN GEÇMİŞ COMMITS

```
888ea69  feat: chatbot RAG integration              ← Chatbot canlı
ae8e705  feat: chatbot intent parser + smart_search ← Llama + hybrid RPC
9782cd5  feat: KB Wave 2 (appliances/food/pet/baby) ← 121 chunks total
baba177  fix: /marka/ route'larını kaldır
8fafa73  fix: keyword fallback real min_price        ← Listings JOIN
10c208c  feat: 3 KB docs + ivfflat lists=3 fix      ← Wave 1 KB
cac1013  feat: KB foundation (migration 001)
7eaaae0  feat: real PttAVM live price fetcher       ← Vector OK
6c9b4ec  baseline: taxonomy + classifier + chat v2
1ca8a89  refactor: 22→23 agents consolidate
```

---

## 🤖 DAVRANIŞ KURALLARI

### Claude (sohbet) için
1. **Bu dosyayı önce oku** — bağlamı buradan al
2. **Bilinmeyen bir karar/değişiklik görürsen sorgulama** — buradaki kararlar
   bilinçli
3. **Yeni karar verirken** "Kritik Kararlar" tablosuna ekle
4. **Yeni iş başlattığında** "Şu An Aktif" listesini güncelle
5. **Tahminle hareket etme** — bilmediğin şeyi sor

### Claude Code (implementer) için
1. **Her oturum başında bu dosyayı oku**
2. **Mevcut kod değişikliklerini "regression" olarak flag etme** — kasıtlı
   olabilir, önce buradan kontrol et
3. **Untracked dosyalar** — bu dosyada bahsediliyorsa muhtemelen bilinçli
4. **Migration'lar** — yüklü mü değil mi listeye bak
5. **Davranış değişikliği yapma** — Claude (sohbet) yönlendirmeden büyük
   refactor yapma

### Kullanıcı için
1. **Yeni karar verdikçe** "Kritik Kararlar" tablosuna 1 satır ekle
2. **Yeni iş başlattıkça** "Şu An Aktif" listesini güncelle
3. **Bitmiş iş** "Yakın Geçmiş Commits" listesinden takip
4. **Yeni sohbet açtığında** bu dosyayı paste et — Claude tüm bağlamı alır

---

## 📞 BAĞLAM SORULARI (kısa cevaplar)

**S: Faz 1 nedir?**
C: 43K backup ürünü → Gemini ile classify → canonical products oluşturma.
Mağaza partnerlik için ürün havuzu kritik.

**S: prices vs listings farkı?**
C: prices eski şema, listings yeni. listings = aktif ürün-mağaza kombinasyonları,
price_history = listing_id'ye bağlı zaman serisi.

**S: Chatbot fast/slow path nedir?**
C: Fast = "iPhone 15 Pro Max" gibi spesifik (direct vector). Slow = "lavanta
kokulu deodorant" gibi betimleyici (KB + intent parser + hybrid search).

**S: Hangi mağazalar canlı?**
C: Sadece PttAVM. MediaMarkt + Trendyol interface hazır ama URL pattern
placeholder.

**S: Embedding ne durumda?**
C: 339/339 canonical product %100 (Gemini 768-dim). Faz 1 yeni ürün eklerse
manuel backfill gerekir.

**S: Klasik arama vs Chatbot farkı?**
C: Header'daki klasik arama → /ara sayfası (kelime eşleşmesi).
ChatBar → /sonuclar (AI niyet anlama).

**S: middleware silinmiş mi?**
C: HAYIR. Next 16 convention ile src/proxy.ts'e taşındı. Çalışıyor.

---

## 📌 GÜNCELLEME LOG'U

| Tarih | Ne değişti | Kim |
|---|---|---|
| 2026-04-24 | İlk versiyon oluşturuldu | Claude (sohbet) |
