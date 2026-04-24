# Birtavsiye.net — Proje Durumu

> **Bu dosya tek kaynak gerçek.** Yeni sohbet/oturum başlattığınızda 
> bu dosyayı Claude veya Claude Code'a verin — tüm bağlamı 30 saniyede alır.
>
> **Güncelleme kuralı:** Yeni karar/durum oluştuğunda buraya 1-2 satır ekleyin.
> Disiplinli tutulursa bağlam kaybolmaz.
>
> **Son güncelleme:** 2026-04-24 v3 (current state alignment)

---

## 📌 BU DOSYA NEDEN VAR

Proje uzun süredir geliştirme altında. Onlarca karar verildi, dosyalar 
değişti, mimari evrim geçirdi. Yeni Claude/Claude Code oturumlarında 
**bağlam kaybı** ciddi bir sorun. Tek dosya, sürekli güncel — bağlam 
tek seferde gelir.

---

## 🎯 PROJE TANIMI

**Birtavsiye.net** — Türkçe fiyat karşılaştırma + AI tavsiye sitesi.

### Konumlandırma
- **Doğrudan rakipler:** Akakçe, Cimri, Akçeli, Pricet
- **Farklılaşma noktası:** Klasik fiyat karşılaştırma siteleri kelime 
  eşleşmesi yapar. Birtavsiye **anlam katmanında** çalışır — 
  "lavanta kokulu deodorant" → çiçeksi koku ailesi → öneri.
- **Hedef kitle:** Türkçe konuşan tüketici, alışveriş kararı vermeden 
  önce bilgi/tavsiye arayan kullanıcı

### Teknoloji yığını
- **Framework:** Next.js 16 (App Router)
- **DB:** Supabase (PostgreSQL + pgvector)
- **Hosting:** Vercel
- **AI sağlayıcılar:**
  - **NVIDIA NIM** — Llama 3.3 70B (chatbot intent + response)
  - **Groq** — Llama 70B (fallback)
  - **Gemini** — embedding (768-dim) + classify (Flash Lite, Flash, Gemma)
- **State management:** Zustand (chatbot UI için, persist middleware)
- **Styling:** Tailwind CSS

### Ekip
- **Sahibi:** Non-technical, Claude Code'u implementer olarak kullanıyor
- **Mimar/Reviewer:** Claude (sohbet) — strateji + kod incelemesi
- **İletişim dili:** Türkçe, direkt, gereksiz preamble yok

---

## 🔥 ŞU AN AKTIF (Bu hafta)

### 1. Chatbot UI yeniden yazımı (Dalga 8)

**Görsel tasarım:** Sayfa altında pill-shape sabit ChatBar, sağdan 
slide-in 320px ChatPanel.

**7 parça plan:**
- ✅ **Parça 1:** `useChatStore.ts` — Zustand global state (v3: persist + sessionId)
- ✅ **Parça 2:** `ChatBar.tsx` — Sayfa altı pill-shape
- ✅ **Parça 3:** `ChatPanel.tsx` — Sağdan slide-in (v2: 320px + içine input bar + yeni sohbet butonu)
- ⏳ **Parça 4:** Eski ChatWidget.tsx temizliği (orphan dosyalar)
- ✅ **Parça 5:** `/sonuclar/page.tsx` — Önerilen ürünler grid sayfası
- ⏳ **Parça 6:** + butonu image upload (B önce: DB resim eşleştirme, A sonra: LLM ile tarif)
- ⏳ **Parça 7:** Mikrofon Web Speech API (Türkçe ses → metin)

### 2. ChatPanel açılmıyor (DEBUG AKTİF)

**Belirti:** ChatBar mesaj gönderiyor, `/sonuclar`'a yönlendiriyor, 
fakat sağdaki ChatPanel görünmüyor.

**Hipotez:** `router.push("/sonuclar")` sırasında Zustand store state'i 
kayboluyor (Next.js hidrasyon nüansı).

**Aktif fix:** useChatStore v3 (`persist` middleware + sessionStorage). 
Yerleştirilirse bu sorunu çözmesi muhtemel. **Henüz Claude Code 
yerleştirmedi**, bekleniyor.

**Olası alternatif fix'ler (eğer persist çözmezse):**
- Layout.tsx'te ChatPanel mount sırası değişikliği
- `router.push` yerine `<Link>` (client-side nav farkı)

### 3. Faz 1 Classifier — durum BELİRSİZ ⚠

Bu konuda kafa karışıklığı var:

- `backup_20260422_products` tablosunda 43,176 satır
- Şema canonical-ish (id, title, slug, brand, model_family, embedding)
- Mevcut `classify-products-smart.mjs` rule-based regex (kategori 
  re-assignment) — **Faz 1 değil**
- LLM-based pipeline yok
- Kullanıcı kararı: "başlasın, daha önce başlatmıştık zaten" — 
  ancak script eksikliği nedeniyle **askıda**

**Sonraki adım:** Backup şema incelemesi → script ihtiyacı netleştir → 
gerekirse LLM-based classifier yaz.

---

## 📋 YAKIN ÖNCELİK (Bu hafta–Önümüzdeki hafta)

### Mağaza entegrasyonları
**Şu an canlı sadece PttAVM.**

- **MediaMarkt** — URL pattern alignment
- **Trendyol** — URL pattern + anti-bot scrape header
- **Hepsiburada** — Hiç entegre değil
- **N11, Vatan, Teknosa, Migros** — Aday liste

**Neden kritik:** "Fiyat karşılaştırma" için minimum 3-4 mağaza canlı 
olmalı. Tek mağaza varsa "PttAVM aynası" olur, "karşılaştırma" değil.

### Header 68 kırık slug fix
**Üretimde aktif UX bug.** Header.tsx'te 159 slug var, 68'i (%43) DB'de 
yok. Kullanıcı tıklayınca "Kategori bulunamadı" alıyor.

**Etkilenen kategoriler:** Moda Kadın, Moda Erkek, Anne-bebek, Oyuncak, 
Kozmetik, Spor, Ev & mutfak, Oto, Pet, Bilgisayar.

**Çözüm planı:** Header.tsx'te slug'ları DB ile uyumla.

### Embedding cron
Faz 1 başlatılırsa her gün ~1500 yeni canonical product. 
Embedding'leri NULL kalır, vector search bulamaz.

**Çözüm:** `scripts/backfill-embeddings.mjs` günlük cron olarak çalışsın 
(idempotent, NULL filter zaten var). **Şimdi gerek değil** — Faz 1 
başlamadığı sürece manuel yeterli.

### chat_session_id (race condition fix)
`recordFeedback` global son `chatbot-search` kararını alıyor. İki 
kullanıcı aynı anda konuşursa karışır. Çözüm useChatStore v3'te 
hazır (chatSessionId üretiliyor), backend tarafına yedirilecek.

### AbortController (token tasarrufu)
Provider çağrıları timeout'lu ama route abort olunca dış LLM çağrısı 
boşa akmaya devam ediyor. AbortController ile request iptal kademesi 
eklenmeli (intentParserRuntime + provider chain).

---

## 🌟 UZAK ÖNCELİK (Bu ay değil)

### Ürün eşleştirme engine (matching)
5 katmanlı ensemble: GTIN/MPN → rule → semantic → manuel kuyruk → 
kullanıcı feedback. ~5 günlük iş. Mağaza entegrasyonları çoğalınca.

### Wave 3 KB dokümanları
Mevcut: 12 doküman / 141 chunk. Hedefler: küçük ev aletleri, spor, 
otomotiv, ev tekstili, yapı market, kitap & hobi.

### Forum MVP polish
En iyi cevap, faydalı bul, raporlama, spam filter, kullanıcı profili.

### Fiyat motoru güçlendirme
- "Hangi mağaza ne zaman güncellendi" admin ekranı (kısmen var)
- Bozuk/ölü listing temizleme (priceHealth aksiyona dönüşmeye başladı)
- Fiyat geçmişi grafiği
- Fiyat alarmı bildirimi (e-posta + push)

---

## ⚖️ KRİTİK KARARLAR (GERİ ALINMAYACAK)

> Bunları sorgulama. Bilinçli kararlar.

| Karar | Tarih | Sebep |
|---|---|---|
| **middleware → proxy.ts** | 2026-04-24 | Next 16 deprecation, kasıtlı upgrade |
| **prices → listings + price_history** | 2026-04-24 | Eski şema fiyat geçmişi/stok takibi yapmıyordu |
| **Alarm condition fix** | 2026-04-24 | Önceki: target ≤ current (TERS), yeni: current ≤ target |
| **/api/refresh-prices auth zorunlu** | 2026-04-24 | Anonim açıktı, scrape suistimali riski |
| **Public forum endpoint whitelist** | 2026-04-24 | user_id PII sızıyordu |
| **answer_count atomik SQL** | 2026-04-24 | Read-modify-write race condition |
| **Google Fonts kaldırıldı** | 2026-04-24 | KVKK + CSP daraltma + performans |
| **/api/me/topic-answers ownership endpoint** | 2026-04-24 | Forum güvenliği — düzenle/sil için ayrı kanal |
| **priceHealth + cron + admin uyarıları** | 2026-04-24 | Stale listing, missing source_url, anomali tespiti |
| **Chatbot intent parser: NVIDIA Llama 3.3 70B** | 2026-04-24 | Gemini kotasını koru |
| **Chatbot fallback chain: NVIDIA → Groq → Gemini Flash** | 2026-04-24 | Dirençlilik |
| **Chatbot voice: Web Speech API** | 2026-04-24 | Whisper sonra geçilebilir |
| **Chatbot fast/slow path ayrımı** | 2026-04-24 | Spesifik vs niyet sorgusu |
| **Klasik header arama + chatbot paralel** | 2026-04-24 | İkisi farklı amaca hizmet eder |
| **/sonuclar yönlendirme stratejisi** | 2026-04-24 | URL paylaşılabilir, geri buton |
| **Chatbot UI = Zustand state** | 2026-04-24 | useState yetersiz |
| **Eski ChatWidget.tsx silinecek** | 2026-04-24 | Yeni ChatBar+ChatPanel onun yerine |
| **Image search: B önce, A sonra** | 2026-04-24 | DB'de varsa direkt göster, yoksa LLM tarif |
| **Sesli komut: bas-konuş, döngü yok** | 2026-04-24 | Basit interaction |
| **Ürünler chat içinde DEĞİL** | 2026-04-24 | Chat = konuşma, /sonuclar = ürünler |
| **Chatbot proaktif sohbet** | 2026-04-24 | Tek kelimeyi vague sayma, history hatırla, alternatif öner |
| **Konuşma yaşam döngüsü: küçült=koru, kapat=sil, 15dk timeout** | 2026-04-24 | Kullanıcı kapatmadıysa hatırlasın, hareketsizlikte sonlansın |
| **Chatbot UI v2: 320px panel + içine input bar + yeni sohbet butonu** | 2026-04-24 | Daha kompakt, panel içinden de yazılabilsin |
| **Zustand persist (sessionStorage)** | 2026-04-24 | router.push state kırılması engellensin (ChatPanel açılmama fix'i) |
| **chat_session_id (feedback race fix)** | 2026-04-24 | Global son karar yerine session-scoped feedback |

---

## 📦 BİLİNEN DURUM (Sayılar ve referanslar)

### Veritabanı tabloları

**Aktif:**
- `products` — 339 canonical ürün, %100 embedding (Gemini 768-dim)
- `categories` — 13 root + 161 leaf (174 toplam)
- `listings` — Yeni şema, ürün-mağaza-fiyat-stok kombinasyonları
- `price_history` — listing_id'ye bağlı zaman serisi
- `agent_decisions` — Tüm agent kararları (440+ category-classifier)
- `decision_feedback` — Kullanıcı feedback (chatbot "yanlış"/"başka")
- `topics`, `topic_answers`, `community_posts` — Forum
- `knowledge_base` — KB chunks (141 satır, 12 doküman)
- `users`, `auth.users` — Supabase auth

**Backup (canlı değil):**
- `backup_20260422_products` — 43,176 satır (Faz 1 kaynağı/sonucu, belirsiz)
- `backup_20260422_prices` — 43,279 satır

**Eski şemadan kalanlar:**
- `prices` — Hâlâ var ama sadece eski kayıtlar; aktif yazma listings'e

**Yok olan tablolar:**
- `source_products`, `staging_products`, `raw_products`

### Migrations (Supabase)

| Migration | Durum | İçerik |
|---|---|---|
| 001_knowledge_base.sql | ✅ Yüklendi | KB tablo + retrieve_knowledge RPC + ivfflat |
| 002_smart_search.sql | ✅ Yüklendi | smart_search RPC (hybrid) + 6 index + pg_trgm |
| 003_topic_answer_count_rpc.sql | ✅ Yüklendi | Atomik increment/decrement RPC'leri (forum aktif kullanıyor) |

### Knowledge Base dokümanları

12 Türkçe doküman, 141 chunk (`docs/knowledge/`):

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

### Chatbot mimarisi

```
Kullanıcı mesajı
  ↓
ChatBar / ChatPanel input → useChatStore.addUserMessage() + history
  ↓
router.push("/sonuclar?q=...")
  ↓
fetch("/api/chat", { message, history, chatSessionId })
  ↓
[server] route.ts → orchestrateChat
  ↓
fastPathDetector.detectPath()
  ├── FAST (spesifik): match_products RPC (vector)
  └── SLOW (betimleyici):
        ├── retrieveKnowledge (KB) — 5dk LRU
        ├── parseIntent (Llama 70B + history) — 5dk LRU
        ├── smart_search RPC (hybrid)
        └── generateResponse (Llama 70B + KB + intent + history)
  ↓
agent_decisions log (path, intent, kb_chunks, session_id)
  ↓
Response: { reply, products, meta, _debug }
  ↓
[client] addAssistantMessage + setRecommendations
  ↓
ChatPanel: yanıt akar
/sonuclar sayfası: ürünler grid olarak gösterilir
```

**Cache:** retrieveKnowledge (5dk LRU 500), parseIntent (5dk LRU), 
loadCategories (5dk in-memory).

**Provider chain (intent):** NVIDIA → Groq → Gemini Flash.

**E2E test sonuçları (2026-04-24, commit `888ea69`):** 4/4 senaryo geçti
- Fast (iPhone 15 Pro Max): 4.4s, 6 iPhone (sim 0.62-0.67)
- Slow + KB (lavanta deodorant): 16s, KB 5 chunk, intent doğru, fallback
- Slow + cilt KB: 9.9s, niasinamid/salisilik asit/hyaluronik asit
- Off-topic: 3.6s, kibarca yönlendirdi

**Latency hedef vs gerçek:**
- Fast: 2s hedef → 4.4s gerçek
- Slow: 5s hedef → 9.9-16s gerçek (paralel optimizasyon henüz yok)

### API endpoints

**Aktif:**
- `/api/chat` — Chatbot orchestrator (history + chatSessionId destekli)
- `/api/sync` — Mağaza sync (listings + price_history)
- `/api/refresh-prices` — Tek ürün refresh (auth gerekli)
- `/api/admin/prices/health` — priceHealth dashboard endpoint
- `/api/cron/prices` — Periyodik fiyat sağlık kontrolü + cron log
- `/api/public/products` — Public ürün listesi (listings şeması)
- `/api/public/topics` — Forum public (whitelist)
- `/api/public/topic-answers` — Forum public (whitelist)
- `/api/public/community-posts` — Forum public (whitelist)
- `/api/me/topic-answers` — Kullanıcı kendi forum cevapları (auth)

**Live price (SSE):**
- `/api/live-prices` — Canlı fiyat akışı (path: `src/app/api/live-prices/route.ts`)

### Mağaza scraper'ları

| Mağaza | Durum | Notlar |
|---|---|---|
| **PttAVM** | ✅ Canlı | Real fetcher, 4275.01 TRY doğrulandı |
| **MediaMarkt** | 🟡 Interface var | URL pattern placeholder |
| **Trendyol** | 🟡 Interface var | URL pattern placeholder + anti-bot |
| **Hepsiburada** | ❌ Yok | Aday |
| **N11, Vatan, Teknosa, Migros** | ❌ Yok | Aday |

### Gemini API durumu

- **Free tier:** ~1500 RPD
- **Bugün (2026-04-24):** KB ingest + backfill ~460 → ~1040 kalır
- **Kota test:** gemini-flash-lite-latest 636ms 200 OK
- **Faz 1 başlatılırsa kotayı çekecek**

### Çalışan ana servisler

- **Live price:** `/api/live-prices` SSE infra (`705de96`), real PttAVM fetcher (`7eaaae0`)
- **Sync:** listings + price_history yazıyor
- **Header arama:** Klasik `/ara?q=...` (kelime eşleşmesi)
- **Chatbot RAG:** `/api/chat` orchestrator (`888ea69`)
- **Forum:** Whitelist endpoint'ler + 003 atomik counter
- **priceHealth:** Cron + admin uyarıları aktif
- **Build:** Yeşil (proxy.ts geçişi + font cleanup tamam)

### Bilinen teknik borçlar

| Borç | Etki | Plan |
|---|---|---|
| Header.tsx 68 kırık slug | Üretimde UX hatası | Sırada (kategori fix turu) |
| Orphan ChatWidget.tsx (2 adet) | Disk israfı | Parça 4 cleanup |
| `products.specs` çok kirli | Search/filter zayıflığı | Specs whitelist (kısmen yapıldı) |
| `brand: "null"` string bug | Bazı ürünlerde marka yanlış | Classifier prompt fix |
| Latency yüksek (slow path 16s) | UX kötü | Paralel KB+search, Groq primary |
| Faz 1 belirsiz | Ürün havuzu sınırlı (339) | Backup şema incelemesi |
| chat_session_id eksik (backend) | Feedback global son karar (race) | Backend patch hazır, deploy bekliyor |
| AbortController eksik | Route abort'ta dış LLM devam, token israfı | intentParserRuntime + provider chain |
| ChatPanel açılmıyor | Chatbot UI yarım çalışıyor | persist v3 yerleştirilecek |

---

## 📊 ÖNCEKİ İŞ DALGAlARI (Geçmiş bağlam)

### Dalga 1: Agent consolidation (`1ca8a89`)
22 agent → 23 agent yeniden organize.

### Dalga 2: Live price infrastructure (`705de96`, `7eaaae0`)
SSE-based canlı fiyat. PttAVM real fetcher. 4275.01 TRY doğrulandı.

### Dalga 3: Karşılaştırma + ChatWidget v1 (`d1f00d6`)
`/karsilastir` sayfası + ilk ChatWidget popup.

### Dalga 4: KB foundation (`cac1013`, `10c208c`)
Migration 001 + Wave 1 KB ingestion (3 doküman).

### Dalga 5: KB Wave 2 (`9782cd5`)
9 yeni doküman (beyaz_esya, gida, pet_shop, anne_bebek vb.). 141 chunk total.

### Dalga 6: Schema migration + güvenlik
Tek oturumda büyük refactor:
- prices → listings + price_history (sync, refresh-prices, kategori, admin, ara, public/products)
- Alarm condition reverse fix
- /api/refresh-prices auth gerekliliği
- Forum public endpoint whitelist + ownership
- answer_count atomik SQL (003)
- middleware → proxy.ts
- Google Fonts kaldırma + CSP daraltma
- priceHealth + cron + admin uyarıları

### Dalga 7: Chatbot RAG integration (`ae8e705`, `888ea69`)
- smart_search RPC (hybrid)
- Intent parser (Llama 70B + 3-tier fallback)
- Fast/slow path detector
- Knowledge retrieval (5dk LRU)
- Response generator (KB + intent context)
- Chat orchestrator
- 339/339 product embedding backfill
- 4/4 E2E test geçti

### Dalga 8: Chatbot UI yeniden yazımı (ŞU AN)
- Zustand store v3 (persist + sessionId)
- ChatBar (sayfa altı pill-shape)
- ChatPanel v2 (sağdan slide-in 320px + içine input bar + yeni sohbet)
- Eski ChatWidget temizlik (Parça 4)
- /sonuclar sayfası (Parça 5)
- + butonu image upload (Parça 6)
- Mikrofon Web Speech API (Parça 7)
- Backend: history + session_id + proaktif prompt + vague mantık fix

---

## ✅ COMMIT GEÇMİŞİ (Son 3 hafta)

```
[pending] feat: chatbot UI v2 + persist + session_id + proactive
25f41b6  docs: PROJECT_STATE.md v2 — single source of truth
f263958  fix: public/products listings schema migration
888ea69  feat: chatbot RAG integration              ← Chatbot canlı, 4/4 E2E
ae8e705  feat: chatbot intent parser + smart_search ← Llama + hybrid RPC
9782cd5  feat: KB Wave 2 — appliances/food/pet/baby ← 141 chunks total
baba177  fix: /marka/ route'larını kaldır
8fafa73  fix: keyword fallback real min_price
10c208c  feat: 3 KB docs + ivfflat lists=3 fix
cac1013  feat: KB foundation (migration 001)
7eaaae0  feat: real PttAVM live price fetcher
6c9b4ec  baseline: taxonomy + classifier + chat v2
1ca8a89  refactor: 22→23 agents consolidate
705de96  feat: live price SSE infrastructure
d1f00d6  feat: /karsilastir + ChatWidget v1
27c4cf5  feat: Header/Footer chrome fix
```

---

## 🤖 DAVRANIŞ KURALLARI

### Claude (sohbet) için

1. **Bu dosyayı önce oku** — Bağlamı buradan al, kullanıcıya tekrar 
   sorma.
2. **Kritik Kararları sorgulama** — Tablodaki kararlar bilinçli, 
   "geri al" deme.
3. **Yeni karar verirken** Kritik Kararlar tablosuna 1 satır ekle.
4. **Yeni iş başlattığında** Şu An Aktif listesini güncelle.
5. **Tahminle hareket etme** — Bilmediğin tablo/dosya/davranış varsa 
   ÖNCE Bilinen Durum'a bak.
6. **Önceki sohbetlerin özeti güvenilmez olabilir** — Bu dosya tek 
   kaynak gerçek. Çelişki varsa bu dosya kazanır.

### Claude Code (implementer) için

1. **Her oturum başında bu dosyayı OKU.** `cat PROJECT_STATE.md`
2. **Mevcut kod değişikliklerini "regression" olarak FLAG ETME** — 
   kasıtlı olabilir, önce Kritik Kararlar tablosuna bak.
3. **Untracked dosyalar** — Bu dosyada bahsediliyorsa muhtemelen 
   bilinçli, silmeden önce kullanıcıya sor.
4. **Migration'lar** — Bilinen Durum > Migrations bölümüne bak.
5. **Davranış değişikliği yapma** — Claude (sohbet) yönlendirmeden 
   büyük refactor yapma.
6. **Yanlış alarm verme** — "katastrofik", "security regression" gibi 
   güçlü ifadeler kullanmadan önce bu dosyayı kontrol et.
7. **Bilmediğin tablo/agent görürsen** Bilinen Durum'a bak.

### Kullanıcı için

1. **Yeni karar verdikçe** Kritik Kararlar tablosuna 1 satır ekle.
2. **Bitmiş iş** Commit Geçmişi'ne ekle (commit hash + kısa açıklama).
3. **Yeni sohbet açtığında** bu dosyayı paste et.
4. **Eğer dosya yüzeysel/eksik gelirse** Claude'a "şunu da ekle" de.
5. **Disiplini bozma** — Bu dosya güncel kalmazsa, sıfırdan açıklama 
   yapma yüküne döneriz.

---

## 📞 BAĞLAM SORULARI (FAQ)

**S: Faz 1 nedir?**  
C: Belirsiz — backup_20260422_products (43K) ile yapılması planlanan 
ürün classify pipeline. Mevcut classify-products-smart.mjs rule-based 
(Faz 1 değil). Kullanıcı kararı: başlat. Bekleme: backup şema incelemesi 
+ LLM-based script.

**S: prices vs listings farkı?**  
C: prices eski şema, listings yeni (ürün-mağaza-stok-aktiflik). 
price_history listing_id'ye bağlı zaman serisi. Tüm aktif yazma 
listings'e yapılıyor.

**S: Chatbot fast/slow path nedir?**  
C: Fast = "iPhone 15 Pro Max" gibi spesifik (direct vector). 
Slow = "lavanta kokulu deodorant" gibi betimleyici (KB + intent + hybrid).

**S: Hangi mağazalar canlı?**  
C: Sadece PttAVM. MediaMarkt + Trendyol interface var, URL pattern 
placeholder. Diğerleri henüz entegre değil.

**S: Embedding ne durumda?**  
C: 339/339 canonical product %100 embed (Gemini 768-dim). Yeni eklenen 
için manuel `backfill-embeddings.mjs`.

**S: Klasik arama vs Chatbot farkı?**  
C: Header'daki klasik arama → `/ara` (kelime eşleşmesi). 
ChatBar → `/sonuclar` (AI niyet anlama, RAG).

**S: middleware silinmiş mi?**  
C: HAYIR. Next 16 convention ile `src/proxy.ts`'e taşındı. Çalışıyor.

**S: 003 migration uygulandı mı?**  
C: EVET. Yüklendi, forum routes aktif kullanıyor.

**S: Header'daki kategori linkleri çalışıyor mu?**  
C: %57'si çalışıyor (91/159). 68'i (%43) "Kategori bulunamadı" 
(taksonomi değişti, header güncellenmedi).

**S: Faz 1 için classifier script hangi?**  
C: `classify-products-smart.mjs` rule-based (kategori re-assignment). 
LLM-based Faz 1 classifier yok, gerekirse yazılacak.

**S: Latency neden yüksek?**  
C: Slow path'te 3 LLM çağrısı seri. Plan: KB+search paralel, Groq primary.

**S: ChatPanel açılmıyor sorunu çözüldü mü?**  
C: HAYIR. useChatStore v3 (persist) yerleştirilmedi henüz. Beklemede.

---

## 📌 GÜNCELLEME LOG'U

| Tarih | Ne değişti | Kim |
|---|---|---|
| 2026-04-24 | İlk versiyon (yüzeysel) | Claude (sohbet) |
| 2026-04-24 | v2 — detaylı yeniden yazım, geçmiş dalgalar, FAQ | Claude (sohbet) |
| 2026-04-24 | v3 — current state alignment: 003 yüklendi, ara+public taşındı, priceHealth aksiyonlu, persist/sessionId kararları, live-prices path düzeltildi, KB 121→141 | Claude (sohbet) |

---

## 🔚 SON NOT

Bu dosya **canlı bir belge.** Her hafta güncel tutulmalı. Eğer:

- Bir kararın **sebebi belirsizleşirse** → buraya yaz
- Yeni bir teknik borç oluşursa → Bilinen Teknik Borçlar tablosuna ekle
- Bir mimari değişiklik olursa → Kritik Kararlar tablosuna ekle
- Yeni bir iş dalgası başlarsa → Önceki İş Dalgaları'na ekle

**Hedefin:** "Yeni Claude/Claude Code 30 saniyede tüm bağlamı alabilsin."
