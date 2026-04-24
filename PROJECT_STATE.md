# Birtavsiye.net — Proje Durumu (Detaylı)

> **Bu dosya tek kaynak gerçek.** Yeni sohbet/oturum başlattığınızda
> bu dosyayı Claude veya Claude Code'a verin — tüm bağlamı 30 saniyede alır.
>
> **Güncelleme kuralı:** Yeni karar/durum oluştuğunda buraya 1-2 satır ekleyin.
> Disiplinli tutulursa bağlam kaybolmaz.
>
> **Son güncelleme:** 2026-04-24 v2 (detaylı yeniden yazım)

---

## 📌 BU DOSYA NEDEN VAR

Bu proje uzun süredir geliştirme altında. Onlarca karar verildi, dosyalar
değişti, mimari evrim geçirdi. Yeni Claude/Claude Code oturumlarında
**bağlam kaybı** ciddi bir sorun:

- Kullanıcı her sohbet başında "biz şunu yapmıştık, hatırla" diye **tekrar
  açıklamak zorunda kalıyor**
- Claude Code mevcut değişiklikleri "regression" sanıp **yanlış kararlar
  veriyor**
- "middleware silinmiş" / "kategori 404 katastrofik" gibi **yanlış alarmlar**
  zaman kaybettiriyor
- Önceki Faz 1 task'ı, KB ingestion, ürün backfill gibi konularda **kim ne
  yaptı belli değil**

Çözüm: **Tek dosya, sürekli güncel.** Yeni oturumda paste et, bağlam tamamen
gelsin.

---

## 🎯 PROJE TANIMI

**Birtavsiye.net** — Türkçe fiyat karşılaştırma + AI tavsiye sitesi.
Akakçe/Cimri benzeri ama **AI chatbot ile farklılaşan** model.

### Konumlandırma
- **Doğrudan rakipler:** Akakçe, Cimri, Akçeli, Pricet
- **Farklılaşma noktası:** Klasik fiyat karşılaştırma siteleri kelime
  eşleşmesi yapar. Birtavsiye **anlam katmanında** çalışacak — "lavanta
  kokulu deodorant" sorgusu çiçeksi koku ailesini tanıyıp, lavanta notası
  içeren parfümleri/deodorantları önerir.
- **Hedef kitle:** Türkçe konuşan tüketici, alışveriş kararı vermeden önce
  bilgi/tavsiye arayan kullanıcı

### Teknoloji yığını
- **Framework:** Next.js 16 (App Router)
- **DB:** Supabase (PostgreSQL + pgvector)
- **Hosting:** Vercel
- **AI sağlayıcılar:**
  - **NVIDIA NIM** — Llama 3.3 70B (chatbot intent parser + response)
  - **Groq** — Llama 70B (fallback)
  - **Gemini** — embedding (768-dim) + classify (Flash Lite, Flash, Gemma)
- **State management:** Zustand (yeni eklendi, chatbot UI için)
- **Styling:** Tailwind CSS

### Ekip
- **Sahibi:** Non-technical, Claude Code'u implementer olarak kullanıyor
- **Mimar/Reviewer:** Claude (sohbet) — strateji + kod incelemesi + planlama
- **İletişim dili:** Türkçe, direkt, gereksiz preamble yok

---

## 🔥 ŞU AN AKTIF (Bu hafta)

### 1. Chatbot UI yeniden yazımı

Eski `ChatWidget.tsx` (basit popup) yerine **görsel referansa uygun** yeni mimari.

**Görsel tasarım (kullanıcı verdi):**
- Sayfanın altında sabit pill-shape bar
- Sol: + butonu (image upload menü)
- Orta: "Herhangi bir şey sor" placeholder
- Sağ: mikrofon + siyah daire içinde ses dalga ikonu (gönder)

**Davranış:**
- Kullanıcı yazıp gönderir → ChatPanel sağdan slide-in
- Sayfa `/sonuclar?q=...`'a yönlenir, ürünler **ana sayfada** grid olarak gösterilir
- Chat penceresi **sağda akmaya devam eder** (konuşma)
- Ürünler **chat içinde değil**, ana içerik alanında
- Panel küçültülebilir/kapatılabilir, ESC ile küçülür

**7 parça plan:**
- ✅ **Parça 1:** `useChatStore.ts` — Zustand global state (commit: pending)
- ✅ **Parça 2:** `ChatBar.tsx` — Sayfa altı pill-shape (commit: pending)
- ✅ **Parça 3:** `ChatPanel.tsx` — Sağdan slide-in (commit: pending, **AÇILMIYOR sorunu**)
- ⏳ **Parça 4:** Eski ChatWidget.tsx temizliği
- ⏳ **Parça 5:** `/sonuclar/page.tsx` — Önerilen ürünler grid sayfası
- ⏳ **Parça 6:** + butonu image upload (B önce: DB resim eşleştirme, A sonra: LLM ile tarif)
- ⏳ **Parça 7:** Mikrofon Web Speech API (Türkçe ses → metin, ücretsiz)

**Tahmini kalan iş:** 8-12 saat (Claude Code yerleştirme + test dahil)

### 2. ChatPanel açılmıyor (ACİL BUG)

**Belirti:** ChatBar mesaj gönderiyor, `/sonuclar`'a yönlendiriyor, fakat
sağdaki ChatPanel görünmüyor.

**Hipotez:** Next.js App Router'ın `router.push` sırasında, Zustand store
state'i navigate yüzünden kayboluyor olabilir (hidrasyon nüansı).

**Debug stratejisi:** ChatBar + ChatPanel + useChatStore'a `console.log`
eklendi (Claude Code yaptı). Tarayıcıda kullanıcı test edip console output'unu
paste edecek.

**Olası fix yolları:**
- Zustand `persist` middleware (sessionStorage ile state korunsun)
- Layout.tsx'te ChatPanel'in mount sırası değişikliği
- `router.push` yerine `<Link>` (client-side navigation hız fark ediyor)

### 3. Faz 1 Classifier — durum BELİRSİZ ⚠

**Önemli not:** Bu konuda kafa karışıklığı var. Aşağıda iki ihtimal:

**İhtimal A: Faz 1 zaten bitti (geçmişte yapıldı)**
- `backup_20260422_products` tablosunda 43,176 satır
- Şema canonical-ish: id, title, slug, brand, model_family, variant_storage, embedding
- Yani **classify edilmiş ürünler**
- Bu durumda Faz 1 başka bir ortamda (staging/local) yapıldı, sonuçlar bu DB'ye yazıldı
- Sonra `source_products` temizlendi, `backup_20260422_products` kaldı
- **Şu an aktif `products` tablosu sadece 339 ürün** — backup'tan SADECE BİR ALT KÜME geçirildi

**İhtimal B: Faz 1 hâlâ yarım**
- 43K backup ürün **ham veri** (kalite belirsiz)
- LLM ile bunları **gerçek canonical**'a indirgemek gerek (~10K hedef)
- Mevcut `classify-products-smart.mjs` **Faz 1 değil** (kategori re-assignment, rule-based)
- Yeni bir LLM-based classifier script lazım

**Hangisi doğru kullanıcıya sorulacak:**
- Backup tablosundaki örnek satırlar temiz mi yoksa kirli mi?
- 43K → 339 nasıl indi (manuel mi, otomatik mi, ne zaman)?
- "10,564 ürün, 427 işlenmiş" hatırası **hangi ortamda** oldu?

**KARAR ASKIDA.** Backup şemasını incelemeden başlatma yok.

---

## 📋 YAKIN ÖNCELİK (Bu hafta–Önümüzdeki hafta)

### Mağaza entegrasyonları
**Şu an canlı sadece PttAVM.** Diğerleri interface uyumlu ama URL pattern
placeholder.

- **MediaMarkt** — URL pattern alignment (search URL formatı)
- **Trendyol** — URL pattern alignment + scrape header (anti-bot var)
- **Hepsiburada** — Hiç entegre değil, sıradaki
- **N11, Vatan, Teknosa, Migros** — Aday liste

**Neden kritik:** "Fiyat karşılaştırma" sitesi olabilmek için minimum 3-4 mağaza
canlı olmalı. Tek mağaza varsa "karşılaştırma" değil "PttAVM aynası" olur.

### Şema migration tamamlama (prices → listings)
Yarısı yapıldı (sync, refresh-prices, kategori, admin). **Kalan dosyalar:**
- `src/app/ara/page.tsx` — klasik arama sayfası
- `src/app/api/public/products/*` — public API endpoint'leri

Bu dosyalar **hâlâ eski `prices` şemasını okuyor**. Schema bütünlüğü için
`listings + price_history(listing_id)` yapısına taşınmalı.

### Migration 003 uygulama
`supabase/migrations/003_topic_answer_count_rpc.sql` **henüz Supabase'e
yüklenmedi**. forumCounters.ts bu RPC'leri çağırıyor — yüklenmezse forum
counter atomik artırma çalışmaz.

**Aksiyon:** Kullanıcı Supabase Dashboard SQL Editor'a bu dosyayı çalıştırmalı.

### Header 68 kırık slug fix
**Üretimde aktif UX bug.** Header.tsx'te 159 slug var, **68'i (%43) DB'de yok**.
Kullanıcı tıklayınca "Kategori bulunamadı" alıyor.

**Sebep:** Kategori taksonomisi geçmişte değişti, Header güncellenmedi.
Senin refactor'ünle alakasız (ayrı teknik borç).

**Etkilenen kategoriler:**
- Moda — Kadın (kadin-giyim, elbise, kadin-pantolon vs.)
- Moda — Erkek (erkek-giyim, erkek-tisort, takim-elbise vs.)
- Anne-bebek (bebek-giyim, biberon, bebek-arabasi vs.)
- Oyuncak (oyuncak, lego, masa-oyunu vs.)
- Kozmetik (makyaj, cilt-bakimi, sac-bakimi vs.)
- + diğer 8 grup

**Çözüm planı:** Header.tsx'te slug'ları DB ile uyumla — ya yanlış slug'ları
düzelt, ya kategorileri DB'ye ekle, ya grup başlığı yap (alt menü açan).

### Embedding cron
Faz 1 başlatılırsa her gün ~1500 yeni canonical product ekleyecek.
Embedding'leri NULL kalır, vector search bulamaz.

**Çözüm:** `scripts/backfill-embeddings.mjs` günlük cron olarak çalışmalı
(idempotent, NULL filter zaten var).

**Şimdi gerek değil** — Faz 1 başlamadığı sürece manuel yeterli.

---

## 🌟 UZAK ÖNCELİK (Bu ay değil)

### Ürün eşleştirme engine (matching)
**Sorun:** "Aynı ürün farklı mağazalarda" — örn. PttAVM'de "Apple iPhone 15
Pro Max" ile MediaMarkt'ta "iPhone 15 Pro Max 256GB" aynı ürün ama farklı
title.

**Çözüm:** 5 katmanlı ensemble:
1. GTIN/MPN exact match (en güvenilir)
2. Rule-based (brand + model_family + variant)
3. Semantic match (embedding cosine similarity)
4. Manuel kuyruk (admin onaylar)
5. Kullanıcı feedback (yanlış eşleşmeyi flag'ler)

**Tahmini iş:** 5 gün. Mağaza entegrasyonları biraz çoğalınca konuşulacak.

### Wave 3 KB dokümanları
Şu an 12 doküman/121 chunk var (Wave 1 + Wave 2). **Wave 3 hedefleri:**
- Küçük ev aletleri (kahve makinesi, blender, mikser, vs.)
- Spor (fitness ekipmanı, outdoor, su sporları)
- Otomotiv (lastik, oto aksesuar, oto bakım)
- Ev tekstili (yatak, havlu, perde)
- Yapı market (boya, hırdavat, elektrik)
- Kitap & hobi

Her biri ~10-15 chunk → ~80 yeni chunk = toplam ~200.

### Forum MVP polish
- En iyi cevap işaretleme
- Faydalı bul (upvote)
- Raporlama / moderasyon
- Spam filter + rate limit
- Kullanıcı profili + "kendi içeriklerim"

### Fiyat motoru güçlendirme
- "Hangi mağaza ne zaman güncellendi" admin ekranı
- Bozuk/ölü listing temizleme (priceHealth aksiyona çevir)
- Fiyat geçmişi grafiği (price_history zaten zaman serisi)
- Fiyat alarmı bildirimi (e-posta + push)
- Cron/scheduled refresh sistemi (saatlik/günlük)

---

## ⚖️ KRİTİK KARARLAR (GERİ ALINMAYACAK)

> Bunları Claude veya Claude Code sorgulamasın. Bilinçli kararlar.

| Karar | Tarih | Sebep |
|---|---|---|
| **middleware → proxy.ts geçişi** | 2026-04-24 | Next 16 deprecation, kasıtlı upgrade |
| **prices → listings + price_history şeması** | 2026-04-24 | Eski şema fiyat geçmişi/stok takibi yapmıyordu |
| **Alarm condition fix** | 2026-04-24 | Önceki: `target ≤ current` (TERS), yeni: `current ≤ target` |
| **/api/refresh-prices auth zorunlu** | 2026-04-24 | Anonim açıktı, scrape suistimali riski |
| **Public forum endpoint whitelist** | 2026-04-24 | user_id gibi PII sızıyordu |
| **answer_count atomik SQL helper** | 2026-04-24 | Read-modify-write race condition |
| **Google Fonts kaldırıldı** | 2026-04-24 | KVKK + CSP daraltma + performans |
| **/api/me/topic-answers ownership endpoint** | 2026-04-24 | Forum güvenliği — düzenle/sil için ayrı kanal |
| **priceHealth monitoring** | 2026-04-24 | Stale listing, missing source_url, anomali tespiti |
| **Chatbot intent parser: NVIDIA Llama 3.3 70B** | 2026-04-24 | Gemini kotasını koru (embed+classify için) |
| **Chatbot fallback chain: NVIDIA → Groq → Gemini Flash** | 2026-04-24 | Birden fazla provider, dirençlilik |
| **Chatbot voice: Web Speech API (free)** | 2026-04-24 | Whisper ücretli, sonra geçilebilir |
| **Chatbot fast/slow path ayrımı** | 2026-04-24 | Spesifik vs niyet sorgusu, latency optimizasyonu |
| **Klasik header arama + chatbot paralel kalsın** | 2026-04-24 | İkisi farklı amaca hizmet eder, hibridleştirilmeyecek |
| **/sonuclar yönlendirme stratejisi** | 2026-04-24 | Her sorguda yeni route, URL paylaşılabilir, geri buton çalışır |
| **Chatbot UI = Zustand state** | 2026-04-24 | useState yetersiz, ChatBar+ChatPanel+sayfa aynı state'i okumalı |
| **Eski ChatWidget.tsx silinecek** | 2026-04-24 | Yeni ChatBar+ChatPanel onun yerine geçer |
| **Image search: B önce, A sonra** | 2026-04-24 | DB'de varsa direkt göster, yoksa LLM ile tarif çıkar |
| **Sesli komut: bas-konuş, döngü yok** | 2026-04-24 | Sürekli dinleme istemiyoruz, basit interaction |
| **Ürünler chat içinde DEĞİL** | 2026-04-24 | Chat = konuşma, /sonuclar = ürün sayfası |

---

## 📦 BİLİNEN DURUM (Sayılar ve referanslar)

### Veritabanı tabloları

**Aktif tablolar:**
- `products` — 339 canonical ürün, hepsinin embedding'i hesaplandı (Gemini 768-dim)
- `categories` — 13 root + 161 leaf kategori (174 toplam, is_active=true)
- `listings` — Yeni şema, ürün-mağaza-fiyat-stok kombinasyonları
- `price_history` — listing_id'ye bağlı zaman serisi
- `agent_decisions` — Tüm agent kararları logu (440 category-classifier, 0 product-classifier)
- `decision_feedback` — Kullanıcı feedback (chatbot "yanlış"/"başka" detection)
- `topics`, `topic_answers`, `community_posts` — Forum
- `knowledge_base` — KB chunks (121 satır, 10 doküman)
- `users`, `auth.users` — Supabase auth

**Backup tabloları (canlı değil):**
- `backup_20260422_products` — 43,176 satır (Faz 1 kaynağı veya sonucu, **belirsiz**)
- `backup_20260422_prices` — 43,279 satır

**Eski şemadan kalanlar:**
- `prices` — Eski tablo, hâlâ bazı endpoint'ler okuyor

**Yok olan tablolar (silindi):**
- `source_products`
- `staging_products`
- `raw_products`

### Migrations (Supabase)

| Migration | Durum | İçerik |
|---|---|---|
| 001_knowledge_base.sql | ✅ Yüklendi | KB tablo + retrieve_knowledge RPC + ivfflat index |
| 002_smart_search.sql | ✅ Yüklendi | smart_search RPC (hybrid vector+JSONB+keyword) + 6 index + pg_trgm |
| 003_topic_answer_count_rpc.sql | ⏳ BEKLİYOR | increment/decrement RPC'leri (atomik counter) |

### Knowledge Base dokümanları

`docs/knowledge/` altında 12 Türkçe doküman:

| Doküman | Chunk | Kategori |
|---|---|---|
| parfum_notalari.md | 10 | Kozmetik (parfüm) |
| cilt_bakimi.md | 11 | Kozmetik (cilt) |
| makyaj.md | 12 | Kozmetik (makyaj) |
| moda_ust_giyim.md | 13 | Moda (üst giyim) |
| moda_alt_giyim.md | 14 | Moda (alt giyim) |
| moda_ayakkabi.md | 11 | Moda (ayakkabı) |
| elektronik_telefon.md | 9 | Elektronik (telefon) |
| elektronik_laptop.md | 11 | Elektronik (laptop) |
| beyaz_esya.md | 20 | Beyaz eşya |
| gida.md | 8 | Gıda |
| pet_shop.md | 11 | Pet shop |
| anne_bebek.md | 11 | Anne-bebek |
| **TOPLAM** | **141** | 9 root kategori |

(Not: Önceki rapor "121" diyordu, bu listeyle 141 — son doğrulama yapılacak.)

### Chatbot mimarisi

**Flow:**
```
Kullanıcı mesajı
  ↓
ChatBar.handleSend()
  ↓
useChatStore.addUserMessage() + openPanel()
  ↓
router.push("/sonuclar?q=...")
  ↓
fetch("/api/chat", {message})
  ↓
[server] route.ts → orchestrateChat
  ↓
fastPathDetector.detectPath()
  ├── FAST path (spesifik): match_products RPC (vector)
  └── SLOW path (betimleyici):
        ├── retrieveKnowledge (KB) — 5dk LRU cache
        ├── parseIntent (Llama 70B) — 5dk LRU cache
        ├── smart_search RPC (hybrid)
        └── generateResponse (Llama 70B + KB context + intent)
  ↓
agent_decisions log (path, intent, kb_chunks)
  ↓
Response: { reply, products, meta, _debug }
  ↓
[client] addAssistantMessage + setRecommendations
  ↓
ChatPanel: yanıtı gösterir
/sonuclar sayfası: ürünleri grid olarak gösterir
```

**Cache stratejisi:**
- `retrieveKnowledge`: 5dk LRU, max 500 entry
- `parseIntent`: 5dk LRU
- `loadCategories`: 5dk in-memory cache
- `match_products` RPC: DB tarafında (sorgu cache yok, embedding sıfırdan hesap)

**Provider chain (intent parser):**
1. NVIDIA NIM Llama 3.3 70B (primary)
2. Groq Llama 70B (fallback)
3. Gemini Flash (last resort)

**E2E test sonuçları (2026-04-24, commit `888ea69`):** 4/4 senaryo geçti
- Fast (iPhone 15 Pro Max): 4.4s, 6 iPhone (similarity 0.62-0.67)
- Slow + KB (lavanta deodorant): 16s, KB chunks 5, intent doğru, smart_search 0 → fallback
- Slow + cilt KB: 9.9s, niasinamid/salisilik asit/hyaluronik asit önerdi
- Off-topic: 3.6s, kibarca yönlendirdi

**Latency hedefleri vs gerçek:**
- Fast: 2s hedef → 4.4s gerçek (LLM gen payı büyük)
- Slow: 5s hedef → 9.9-16s gerçek (paralel optimizasyon yapılmadı)

### API endpoints

**Aktif:**
- `/api/chat` — Chatbot orchestrator (v3, commit `888ea69`)
- `/api/sync` — Mağaza sync (listings + price_history yazıyor)
- `/api/refresh-prices` — Tek ürün refresh (auth gerekli)
- `/api/admin/prices/health` — priceHealth dashboard endpoint
- `/api/public/topics` — Forum public (whitelist)
- `/api/public/topic-answers` — Forum public (whitelist)
- `/api/public/community-posts` — Forum public (whitelist)
- `/api/me/topic-answers` — Kullanıcı kendi forum cevapları (auth)

**Live price (SSE):**
- `/api/products/[slug]/live-prices` — Server-Sent Events ile canlı fiyat akışı

### Mağaza scraper'ları

| Mağaza | Durum | Notlar |
|---|---|---|
| **PttAVM** | ✅ Canlı | Real fetcher, doğrulandı (4275.01 TRY) |
| **MediaMarkt** | 🟡 Interface var | URL pattern placeholder |
| **Trendyol** | 🟡 Interface var | URL pattern placeholder |
| **Hepsiburada** | ❌ Yok | Aday |
| **N11, Vatan, Teknosa, Migros** | ❌ Yok | Aday |

### Gemini API durumu

- **Free tier:** ~1500 RPD (request per day)
- **Bugünkü tüketim (2026-04-24):** KB ingest + backfill = ~460 → ~1040 kalır
- **Test:** 2026-04-24 13:xx civarı, gemini-flash-lite-latest 636ms 200 OK
- **Faz 1 başlatılırsa** kotayı çekecek, chatbot embed'leri yavaşlayabilir

### Çalışan ana servisler

- **Live price (PttAVM):** SSE infra deployed (`705de96`), real fetcher (`7eaaae0`)
- **Sync route:** listings + price_history şemasına yazıyor (post-refactor)
- **Header arama:** Klasik, `/ara?q=...` sayfasına yönlendiriyor (kelime eşleşmesi)
- **Chatbot RAG:** `/api/chat` orchestrator + RAG (`888ea69`)
- **Forum:** Whitelist endpoint'lerle güvenli (atomik counter migration bekliyor)

### Bilinen teknik borçlar

| Borç | Etki | Plan |
|---|---|---|
| Header.tsx 68 kırık slug | Üretimde UX hatası | Sırada (kategori fix turu) |
| `src/app/ara/page.tsx` eski şema | Klasik arama bozuk olabilir | Schema migration tamamlama |
| `src/app/api/public/products/*` eski şema | Public ürün API'si tutarsız | Schema migration tamamlama |
| Orphan ChatWidget.tsx (2 adet) | Disk israfı | Parça 4 cleanup |
| `products.specs` çok kirli | Search/filter zayıflığı | Specs whitelist hardening (kısmen yapıldı: backfill --strict) |
| `brand: "null"` string bug | Bazı ürünlerde marka yanlış görünüyor | Classifier prompt fix |
| Latency yüksek (slow path 16s) | UX kötü | Paralel KB+search, Groq primary |
| 003 migration uygulanmadı | Forum atomik counter çalışmaz | Kullanıcı Supabase SQL Editor'da yükleyecek |
| Faz 1 belirsiz | Ürün havuzu sınırlı (339) | Backup şema incelemesi sonrası karar |

---

## 📊 ÖNCEKİ İŞ DALGAlARI (Geçmiş bağlam)

### Dalga 1: Agent consolidation (commit `1ca8a89`)
22 agent → 23 agent yeniden organize edildi. Code search, classification,
chat, scraper agent'lar ayrıldı.

### Dalga 2: Live price infrastructure (`705de96`, `7eaaae0`)
SSE-based canlı fiyat akışı. PttAVM real fetcher entegre edildi.
Doğrulama: 4275.01 TRY çekildi.

### Dalga 3: Karşılaştırma + ChatWidget v1 (`d1f00d6`)
`/karsilastir` sayfası + ilk ChatWidget popup eklendi.

### Dalga 4: KB foundation (commit `cac1013`, `10c208c`)
Migration 001 (knowledge_base table + retrieve_knowledge RPC + ivfflat index
lists=3 fix), Wave 1 KB ingestion (3 doküman: parfum_notalari, cilt_bakimi, makyaj).

### Dalga 5: KB Wave 2 (commit `9782cd5`)
9 yeni doküman daha (beyaz_esya, gida, pet_shop, anne_bebek, vs.).
Toplam 121 chunk.

### Dalga 6: Schema migration başlangıcı + güvenlik
Kullanıcı tek oturumda büyük refactor yaptı:
- `prices` → `listings + price_history` (sync, refresh-prices, kategori, admin)
- Alarm condition reverse fix
- /api/refresh-prices auth gerekliliği
- Forum public endpoint whitelist + ownership endpoint
- answer_count atomik SQL (migration 003)
- middleware → proxy.ts (Next 16)
- Google Fonts kaldırma + CSP daraltma
- priceHealth monitoring

### Dalga 7: Chatbot RAG integration (`ae8e705`, `888ea69`)
- Smart_search RPC (hybrid vector + JSONB specs + keyword)
- Intent parser (Llama 70B + 3-tier fallback)
- Fast/slow path detector
- Knowledge retrieval wrapper (5dk LRU cache)
- Response generator (KB + intent context)
- Chat orchestrator
- 339/339 product embedding backfill (Gemini 768-dim, idempotent)
- 4/4 E2E test geçti (mojibake-safe Türkçe stringler manuel rewrite ile)

### Dalga 8: Chatbot UI yeniden yazımı (ŞU AN)
- Zustand store
- Yeni ChatBar (sayfa altı sabit pill-shape)
- Yeni ChatPanel (sağdan slide-in, küçültülebilir)
- Eski ChatWidget kaldırılacak
- /sonuclar sayfası yazılacak
- + butonu image upload, mikrofon Web Speech API

---

## ✅ COMMIT GEÇMİŞİ (Son 3 hafta)

```
[pending] feat: chatbot UI rewrite parça 1+2+3 (ChatBar, ChatPanel, store)
[pending] docs: PROJECT_STATE.md (bu dosya)
888ea69  feat: chatbot RAG integration              ← Chatbot canlı, 4/4 E2E
ae8e705  feat: chatbot intent parser + smart_search ← Llama + hybrid RPC
9782cd5  feat: KB Wave 2 — appliances/food/pet/baby ← 121 chunks total
baba177  fix: /marka/ route'larını kaldır            ← Eski URL pattern temizliği
8fafa73  fix: keyword fallback real min_price        ← Listings JOIN
10c208c  feat: 3 KB docs + ivfflat lists=3 fix      ← Wave 1 KB
cac1013  feat: KB foundation (migration 001)
7eaaae0  feat: real PttAVM live price fetcher       ← Vector search OK
6c9b4ec  baseline: taxonomy + classifier + chat v2
1ca8a89  refactor: 22→23 agents consolidate
705de96  feat: live price SSE infrastructure
d1f00d6  feat: /karsilastir + ChatWidget v1
27c4cf5  feat: Header/Footer chrome fix
```

**Henüz commit edilmemiş çalışmalar (working dir):**
- 26 dosya (kullanıcının dalga 6 refactor'ü) — 4 mantıklı commit grubuna
  ayrılması bekleniyor
- 5 chatbot UI dosyası (Parça 1+2+3)
- PROJECT_STATE.md (bu dosya)

---

## 🤖 DAVRANIŞ KURALLARI

### Claude (sohbet) için

1. **Bu dosyayı önce oku** — Bağlamı buradan al, kullanıcıya tekrar sorma.
2. **Kritik Kararları sorgulama** — Tablodaki kararlar bilinçli, "geri al" deme.
3. **Yeni karar verirken** Kritik Kararlar tablosuna 1 satır ekle, kullanıcıya bildir.
4. **Yeni iş başlattığında** Şu An Aktif listesini güncelle.
5. **Tahminle hareket etme** — Bilmediğin tablo/dosya/davranış varsa ÖNCE Bilinen Durum'a bak, yoksa kullanıcıya sor.
6. **Önceki sohbetlerin özeti güvenilmez olabilir** — Bu dosya tek kaynak gerçek. Çelişki varsa bu dosya kazanır.

### Claude Code (implementer) için

1. **Her oturum başında bu dosyayı OKU.** Komut: `cat PROJECT_STATE.md`
2. **Mevcut kod değişikliklerini "regression" olarak FLAG ETME** — kasıtlı olabilir, önce Kritik Kararlar tablosuna bak.
3. **Untracked dosyalar** — Bu dosyada bahsediliyorsa muhtemelen bilinçli, silmeden önce kullanıcıya sor.
4. **Migration'lar** — Bilinen Durum > Migrations bölümüne bak, hangisi yüklü hangisi değil.
5. **Davranış değişikliği yapma** — Claude (sohbet) yönlendirmeden büyük refactor yapma.
6. **Yanlış alarm verme** — "katastrofik", "security regression" gibi güçlü ifadeler kullanmadan önce bu dosyayı kontrol et. Çoğu zaman açıklaması var.
7. **Bilmediğin tablo/agent görürsen** Bilinen Durum > Veritabanı tabloları bölümüne bak.

### Kullanıcı için

1. **Yeni karar verdikçe** Kritik Kararlar tablosuna 1 satır ekle (30 sn).
2. **Yeni iş başlattıkça** Şu An Aktif listesini güncelle.
3. **Bitmiş iş** Commit Geçmişi listesine ekle (commit hash + kısa açıklama).
4. **Yeni sohbet açtığında** bu dosyayı paste et — Claude tüm bağlamı alır.
5. **Eğer dosya yüzeysel/eksik gelirse** Claude'a "şunu da ekle" de — düzenle.
6. **Disiplini bozma** — Bu dosya güncel kalmazsa, sıfırdan açıklama yapma yüküne döneriz.

---

## 📞 BAĞLAM SORULARI (FAQ)

**S: Faz 1 nedir?**
C: Belirsiz — iki ihtimal: (A) Geçmişte yapılmış, backup_20260422_products sonucu, (B) Hâlâ yarım, 43K backup'tan canonical'a indirgeme yapılacak. Backup şema incelemesi sonrası netleşecek.

**S: prices vs listings farkı?**
C: prices eski şema (basit fiyat), listings yeni şema (ürün-mağaza-stok-aktiflik). price_history listing_id'ye bağlı zaman serisi.

**S: Chatbot fast/slow path nedir?**
C: Fast = "iPhone 15 Pro Max" gibi spesifik (direct vector match). Slow = "lavanta kokulu deodorant" gibi betimleyici (KB + intent parser + hybrid).

**S: Hangi mağazalar canlı?**
C: Sadece PttAVM (real fetcher). MediaMarkt + Trendyol interface var, URL pattern placeholder.

**S: Embedding ne durumda?**
C: 339/339 canonical product %100 embed (Gemini 768-dim). Yeni eklenen ürün için manuel `backfill-embeddings.mjs` çalıştırılmalı.

**S: Klasik arama vs Chatbot farkı?**
C: Header'daki klasik arama → `/ara` (kelime eşleşmesi). ChatBar → `/sonuclar` (AI niyet anlama, RAG).

**S: middleware silinmiş mi?**
C: HAYIR. Next 16 convention ile `src/proxy.ts`'e taşındı. Çalışıyor, deprecation uyarısı kalktı.

**S: Eski ChatWidget hâlâ var mı?**
C: Mount edilmiyor (layout.tsx'ten kaldırıldı), ama dosyalar diskte. Parça 4'te toplu temizlik.

**S: 003 migration uygulandı mı?**
C: HAYIR. Kullanıcı Supabase Dashboard SQL Editor'a yükleyecek.

**S: Header'daki kategori linkleri çalışıyor mu?**
C: Yarısı çalışıyor (91/159), %43'ü (68 link) "Kategori bulunamadı" veriyor — kategori taksonomisi değişti, Header güncellenmedi.

**S: Faz 1 için classifier script hangi?**
C: Şu an mevcut `classify-products-smart.mjs` rule-based regex (kategori re-assignment). LLM-based Faz 1 classifier yok, gerekirse yazılacak.

**S: Latency neden yüksek?**
C: Slow path'te 3 LLM çağrısı seri (intent + smart_search + response gen). Paralel optimizasyon henüz yapılmadı. Plan: KB+search paralel, Groq primary.

---

## 📌 GÜNCELLEME LOG'U

| Tarih | Ne değişti | Kim |
|---|---|---|
| 2026-04-24 | İlk versiyon (yüzeysel) | Claude (sohbet) |
| 2026-04-24 | v2 — detaylı yeniden yazım, geçmiş dalgalar, FAQ, mimari diyagramları eklendi | Claude (sohbet) |

---

## 🔚 SON NOT

Bu dosya **canlı bir belge.** Her hafta güncel tutulmalı. Eğer:

- Bir kararın **sebebi belirsizleşirse** → buraya yaz
- Yeni bir teknik borç oluşursa → Bilinen Teknik Borçlar tablosuna ekle
- Bir mimari değişiklik olursa → Kritik Kararlar tablosuna ekle
- Yeni bir iş dalgası başlarsa → Önceki İş Dalgaları'na ekle (sonradan)

**Hedefin:** "Yeni Claude/Claude Code 30 saniyede tüm bağlamı alabilsin."
Eğer biri "şunu hatırlat" diye soruyorsa, o bilgi bu dosyada eksik demektir.
