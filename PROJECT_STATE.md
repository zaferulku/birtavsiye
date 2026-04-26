# Birtavsiye.net — Proje Durumu

> **Bu dosya tek kaynak gerçek.** Yeni sohbet/oturum başlattığınızda
> bu dosyayı Claude veya Claude Code'a verin — tüm bağlamı 30 saniyede alır.
>
> **Güncelleme kuralı:** Yeni karar/durum oluştuğunda buraya 1-2 satır ekleyin.
> Disiplinli tutulursa bağlam kaybolmaz.
>
> **Son güncelleme:** 2026-04-26 v4 (current state alignment)

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
- **Framework:** Next.js 16 (App Router, Turbopack)
- **DB:** Supabase (PostgreSQL + pgvector)
- **Hosting:** Vercel
- **AI sağlayıcılar:**
  - **NVIDIA NIM** — Llama 3.3 70B (chatbot intent + response, primary)
  - **Groq** — Llama 70B (fallback)
  - **Gemini** — embedding (768-dim) + classify (Flash Lite, 2.0 Flash)
- **State management:** Zustand (chatbot UI, persist middleware)
- **Styling:** Tailwind CSS

### Ekip
- **Sahibi:** Non-technical, Claude Code'u implementer olarak kullanıyor
- **Mimar/Reviewer:** Claude (sohbet) — strateji + kod incelemesi
- **İletişim dili:** Türkçe, direkt, gereksiz preamble yok

---

## 🔥 ŞU AN AKTIF (Bu hafta)

### 1. Faz 1 Classifier — 1000-batch arkaplanda
- backup_20260422_products (43,176 satır) → canonical products eklemek
- Multi-model fallback: gemini-flash-lite-latest → gemini-2.0-flash
- gemma-3-27b-it kaldırıldı (JSON mode desteklemiyordu, %76 fail vardı)
- Quality dağılımı: %92.5 ≥0.9 (mükemmel)
- Toplam Faz1 ile eklenen: 227 ürün, aktif products 339→566
- Background task: `bm2rckq2a` (yeni 1000-test, 0 fail)

### 2. Header + Kategori sayfası tamamen düzeltildi (Wave 9)
- 68 kırık slug → 0 (`categorySlugMap.ts` resolveSlug)
- Migration 005 yüklendi (3 yeni kategori: babet, etek, film-dizi)
- Server component'larda `supabase` → `supabaseAdmin` (RLS bypass)
- Ana sayfa + kategori + ürün detay artık render ediliyor

### 3. Chatbot UI v3 + chip butonları (Wave 11)
- ChatPanel: 320×600 sağ alt köşe pop-up (mobil tam ekran)
- ChatBar: [🎤][input][+][▶] düzeni, + popover menü
- Suggestion chips: 5 tip (shortcut/brand/price/category/freetext)
- "siyah telefon" → marka chip (Apple/Samsung) ✓
- "merhaba" → kategori chip ✓
- "telefon tavsiye ver" → 3 segment (ekonomik/denge/premium) ✓

### 4. Duplicate ürün audit + merge (paralel Claude Code, devam ediyor)
- Mevcut katalogda aynı ürüne ait dağılmış kayıtları tespit
- Güvenli olanlarda listing'leri tek canonical'a taşı
- Yan tablolar (alert/favori/queue) da canonical'a migrate
- Audit/merge admin endpoint olarak kurulacak
- Değişen dosyalar: `src/lib/productIdentity.ts`, `src/app/api/sync/route.ts`

---

## 📋 YAKIN ÖNCELİK (Bu hafta–Önümüzdeki hafta)

### Mağaza entegrasyonları
**Şu an canlı sadece PttAVM.**

- **MediaMarkt** — URL pattern alignment
- **Trendyol** — URL pattern + anti-bot scrape header
- **Hepsiburada** — Hiç entegre değil
- **N11, Vatan, Teknosa, Migros** — Aday liste

### 83 keşfedilmemiş DB sub-kategorisi → Header'a ekleme
Şu an Header 159 slug, 68'i map ile yönlendirildi. DB'de 177 kategori var,
83'ü Header'da hiç yok (örn `kahve-makinesi`, `mikrodalga`,
`kisisel-bakim-elektrikli`, `aspirator-davlumbaz`, `powerbank`, `laptop`).

### Faz 1 günlük cron
Her gün ~150-200 ürün eklenebilir (free tier). 25-30 günde 43K bitirilir.

### Boş kategoriler (102→93)
Faz1 işlerken boş leaf'ler dolmaya başladı (89→80). Tam dolması için
Faz1 tamamlanması veya manuel scrape pipeline.

### AbortController (token tasarrufu)
Provider çağrıları timeout'lu ama route abort olunca dış LLM çağrısı
boşa akmaya devam ediyor. AbortController ile request iptal kademesi.

---

## 🌟 UZAK ÖNCELİK (Bu ay değil)

### Ürün eşleştirme engine (matching)
5 katmanlı ensemble: GTIN/MPN → rule → semantic → manuel kuyruk →
kullanıcı feedback. Mağaza entegrasyonları çoğalınca.

### Wave 3 KB dokümanları
Mevcut: 12 doküman / 141 chunk. Hedefler: küçük ev aletleri, spor,
otomotiv, ev tekstili, yapı market, kitap & hobi.

### Forum MVP polish
En iyi cevap, faydalı bul, raporlama, spam filter, kullanıcı profili.

### Vision modeli (chatbot image upload)
Şu an `/api/chat` body.image kabul ediyor (data:image/* base64) ama
LLM görseli görmüyor — text hint olarak iletiliyor. Gemini Vision
veya Llama 3.2 Vision entegrasyonu sonraki tur.

---

## ⚖️ KRİTİK KARARLAR (GERİ ALINMAYACAK)

> Bunları sorgulama. Bilinçli kararlar.

| Karar | Tarih | Sebep |
|---|---|---|
| **middleware → proxy.ts** | 2026-04-24 | Next 16 deprecation |
| **prices → listings + price_history** | 2026-04-24 | Eski şema fiyat geçmişi/stok yapmıyordu |
| **Alarm condition fix** | 2026-04-24 | target ≤ current → current ≤ target |
| **/api/refresh-prices auth zorunlu** | 2026-04-24 | Scrape suistimali |
| **Public forum endpoint whitelist** | 2026-04-24 | user_id PII sızıyordu |
| **answer_count atomik SQL** | 2026-04-24 | Race condition |
| **Google Fonts kaldırıldı** | 2026-04-24 | KVKK + CSP + perf |
| **/api/me/topic-answers ownership** | 2026-04-24 | Forum güvenliği |
| **priceHealth + cron + admin uyarıları** | 2026-04-24 | Stale listing, anomali |
| **Chatbot intent: NVIDIA Llama 3.3 70B** | 2026-04-24 | Gemini kotasını koru |
| **Chatbot fallback: NVIDIA → Groq → Gemini Flash** | 2026-04-24 | Dirençlilik |
| **Chatbot voice: Web Speech API** | 2026-04-24 | Whisper sonra geçilebilir |
| **Chatbot fast/slow path ayrımı** | 2026-04-24 | Spesifik vs niyet sorgusu |
| **Klasik header arama + chatbot paralel** | 2026-04-24 | Farklı amaçlar |
| **/sonuclar yönlendirme stratejisi** | 2026-04-24 | URL paylaşılabilir |
| **Chatbot UI = Zustand state** | 2026-04-24 | useState yetersiz |
| **Eski ChatWidget.tsx silinecek** | 2026-04-24 | Yeni ChatBar+ChatPanel |
| **Image search: B önce, A sonra** | 2026-04-24 | DB varsa direkt göster |
| **Sesli komut: bas-konuş, döngü yok** | 2026-04-24 | Basit interaction |
| **Ürünler chat içinde DEĞİL** | 2026-04-24 | Chat=konuşma, /sonuclar=ürünler |
| **Chatbot proaktif sohbet** | 2026-04-24 | Tek kelimeyi vague sayma |
| **Lifecycle: küçült=koru, kapat=sil, 15dk timeout** | 2026-04-24 | Hareketsizlikte sonlansın |
| **Chatbot UI v2: 320px panel + içine input bar** | 2026-04-24 | Daha kompakt |
| **Zustand persist (sessionStorage)** | 2026-04-24 | router.push state kırılması |
| **chat_session_id (feedback race fix)** | 2026-04-24 | Session-scoped feedback |
| **smart_search v2: variant_color + storage filter** | 2026-04-25 | "siyah iphone" hibrit filter (migration 004) |
| **fastPathDetector: variant keyword → slow** | 2026-04-25 | Renk/storage varsa intent + smart_search v2 |
| **Çözüm C hibrit: 68 kırık slug → categorySlugMap.ts** | 2026-04-26 | 35 1-to-1 + 30 1-to-many + 3 yeni (migration 005) |
| **Server component'ta supabaseAdmin zorunlu** | 2026-04-26 | RLS sıkı, anon read boş dönüyor |
| **ChatPanel v3: 320×600 köşe pop-up** | 2026-04-26 | Tam yükseklik kart pencere |
| **ChatBar v3: [🎤][input][+][▶]** | 2026-04-26 | Mikrofon sola, + sağa popover |
| **Suggestion chips: 5 tip** | 2026-04-26 | shortcut/brand/price/category/freetext |
| **Chip displayLabel: UI label, content backend value** | 2026-04-26 | "En popüler" UI'da, "siyah telefon en popüler" history |
| **gemma-3-27b-it kaldırıldı** | 2026-04-26 | JSON mode desteksiz, %76 fail |

---

## 📦 BİLİNEN DURUM (Sayılar ve referanslar)

### Veritabanı tabloları

**Aktif:**
- `products` — **566** canonical ürün (önce 339, Faz1 ile +227); embedding ilk 339 için %100, yeni 227 NULL (backfill bekliyor)
- `categories` — 13 root + 164 leaf (**177** toplam, migration 005 sonrası)
- `listings` — Yeni şema, ürün-mağaza-fiyat-stok
- `price_history` — listing_id'ye bağlı zaman serisi
- `agent_decisions` — Tüm agent kararları (faz1-classifier eklendi)
- `decision_feedback` — Kullanıcı feedback
- `topics`, `topic_answers`, `community_posts` — Forum
- `knowledge_base` — KB chunks (141 satır, 12 doküman)
- `users`, `auth.users` — Supabase auth

**Backup (canlı değil):**
- `backup_20260422_products` — 43,176 satır (Faz1 source); aktif ile **0 ID overlap**
- `backup_20260422_prices` — 43,279 satır

**Eski şemadan:**
- `prices` — Sadece eski kayıtlar; aktif yazma listings'e

### Migrations (Supabase)

| Migration | Durum | İçerik |
|---|---|---|
| 001_knowledge_base.sql | ✅ Yüklü | KB tablo + retrieve_knowledge RPC + ivfflat |
| 002_smart_search.sql | ✅ Yüklü | smart_search v1 (hybrid) + 6 index + pg_trgm |
| 003_topic_answer_count_rpc.sql | ✅ Yüklü | Atomik increment/decrement (forum) |
| 004_smart_search_variants.sql | ✅ Yüklü | smart_search v2: variant_color + variant_storage |
| 005_header_missing_categories.sql | ✅ Yüklü | 3 yeni: kadin-ayakkabi-babet, kadin-etek, film-dizi |

### Knowledge Base (141 chunk, 12 doküman)
parfum_notalari, cilt_bakimi, makyaj, moda_ust_giyim, moda_alt_giyim,
moda_ayakkabi, elektronik_telefon, elektronik_laptop, beyaz_esya,
gida, pet_shop, anne_bebek.

### Chatbot mimarisi

```
Kullanıcı mesajı (text/chip/voice/image)
  ↓
ChatBar/ChatPanel → useChatStore.addUserMessage(content, type, preview, displayLabel)
  ↓
router.push("/sonuclar?q=...")
  ↓
fetch("/api/chat", { message, history, chatSessionId, image? })
  ↓
[server] route.ts → orchestrateChat
  ↓
fastPathDetector.detectPath()
  ├── Sinyal 1: brand+model → fast
  ├── Sinyal 2: brand+variant → SLOW (variant filter v2'de)
  ├── Sinyal 2b: hasVariantKeyword → SLOW
  ├── Sinyal 3: model number → fast
  └── Sinyal slow: descriptive/conversational/long
  ↓
FAST: searchProducts() (legacy vector + keyword)
SLOW:
  ├── retrieveKnowledge (KB, 5dk LRU)
  ├── parseIntent (Llama 70B + history, 5dk LRU)
  ├── smart_search v2 RPC (vector + specs + keyword + variant_color/storage)
  └── generateResponse (Llama 70B + KB + intent + history)
  ↓
buildSuggestions(ctx) → 5 tip chip
  ↓
Response: { reply, products, suggestions, meta, _debug }
  ↓
[client] addAssistantMessage(reply, suggestions) + setRecommendations
ChatPanel: yanıt + son assistant mesajda ChipRow
/sonuclar sayfası: ürünler grid
```

**Provider chain (intent):** NVIDIA → Groq → Gemini Flash.

### API endpoints

**Aktif:**
- `/api/chat` — Chatbot orchestrator (history + chatSessionId + image, suggestions return)
- `/api/sync` — Mağaza sync (listings + price_history)
- `/api/refresh-prices` — Tek ürün refresh (auth)
- `/api/admin/prices/health` — priceHealth dashboard
- `/api/cron/prices` — Periyodik fiyat sağlık
- `/api/public/products` — Public ürün listesi (listings şeması)
- `/api/public/products/similar` — Benzer ürünler (freshness sinyalleri)
- `/api/public/topics`, `/topic-answers`, `/community-posts` — Forum public (whitelist)
- `/api/me/topic-answers` — Kullanıcı kendi cevapları (auth)

**Live price (SSE):**
- `/api/live-prices` — Canlı fiyat akışı

### Frontend route haritası

| Route | Dosya | Notlar |
|---|---|---|
| `/` | `src/app/page.tsx` | Ana sayfa (Header + ToggleBar + Featured + TopicFeed) |
| `/kategori/[slug]` | `src/app/kategori/[slug]/page.tsx` | Flat, recursive descendant |
| `/anasayfa/[...segments]` | `src/app/[...segments]/page.tsx` | Hiyerarşik |
| `/urun/[slug]` | `src/app/urun/[slug]/page.tsx` | 4 sekme (Yorumlar/Özellikler/Benzer/Tavsiyeler) |
| `/sonuclar` | `src/app/sonuclar/page.tsx` | Chatbot sonuç grid |
| `/ara` | `src/app/ara/page.tsx` | Klasik kelime araması |
| `/karsilastir` | `src/app/karsilastir/page.tsx` | Karşılaştırma |
| `/tavsiyeler`, `/tavsiye/[id]` | Forum |
| `/profil`, `/giris`, `/admin` | Auth + admin |

**Header link:** `linkFor(slug, q)` → `hierUrl(resolveSlug(slug), ...)` → `/anasayfa/{chain}` veya fallback `/kategori/{slug}`.

### Mağaza scraper'ları

| Mağaza | Durum |
|---|---|
| **PttAVM** | ✅ Canlı |
| **MediaMarkt, Trendyol** | 🟡 Interface var, URL pattern placeholder |
| Diğerleri | ❌ Yok |

### Gemini API durumu

- Free tier ~1500 RPD; Faz1 1000-test gemma-3 kaldırıldıktan sonra %0 fail
- Hız ~0.2/sn (rate limit 10 RPM)

### Bilinen teknik borçlar

| Borç | Etki | Plan |
|---|---|---|
| 83 keşfedilmemiş DB kategorisi | Header'da yok | Sonraki Header tur |
| `products.specs` kirli | Search/filter zayıf | Whitelist (kısmen yapıldı) |
| `brand: "null"` string bug | Bazı ürünlerde marka yanlış | Faz1 sonrası audit |
| Latency yüksek (slow 16s) | UX kötü | Paralel KB+search |
| AbortController eksik | Token israfı | intentParserRuntime + provider chain |
| Faz1 ürün havuzu darlığı | 93/177 kategori boş | Faz1 günlük cron |
| Faz1 227 embedding NULL | Vector search bulamaz | backfill-embeddings.mjs |
| Vision modeli yok | LLM görseli görmüyor | Gemini Vision sonraki tur |
| Duplicate ürün kayıtları | Listing'ler dağılmış | Audit + merge (devam ediyor) |

---

## 📊 ÖNCEKİ İŞ DALGAlARI

### Dalga 1: Agent consolidation (`1ca8a89`)
22 → 23 agent yeniden organize.

### Dalga 2: Live price (`705de96`, `7eaaae0`)
SSE infra. PttAVM real fetcher. 4275 TRY doğrulandı.

### Dalga 3: Karşılaştırma + ChatWidget v1 (`d1f00d6`)

### Dalga 4: KB foundation (`cac1013`, `10c208c`)
Migration 001 + Wave 1 KB (3 doküman).

### Dalga 5: KB Wave 2 (`9782cd5`)
9 yeni doküman, 141 chunk.

### Dalga 6: Schema migration + güvenlik
prices→listings, alarm fix, auth, public whitelist, 003 atomik SQL,
middleware→proxy, Google Fonts kaldırma, priceHealth cron.

### Dalga 7: Chatbot RAG (`ae8e705`, `888ea69`)
smart_search, intent parser, fast/slow detector, KB retrieval,
response generator, orchestrator, embedding backfill, 4/4 E2E.

### Dalga 8: Chatbot UI (Parça 1-7)
Zustand v3 (persist+sessionId), ChatBar v2, ChatPanel v2, /sonuclar,
image upload (Parça 6), Web Speech (Parça 7), ChatWidget cleanup.

### Dalga 9: Header + Kategori fix (2026-04-26)
- 68 kırık slug → categorySlugMap.ts
- Migration 005: babet/etek/film-dizi
- Server'da supabase → supabaseAdmin (RLS bypass)
- `[...segments]` breadcrumb expansion

### Dalga 10: Faz 1 Classifier (devam)
- backup_20260422_products → products pipeline
- Multi-model fallback, gemma-3 kaldırıldı
- Audit alanları (classified_at/by, quality_score)
- Brand NULL kabul
- 227 ürün eklendi (339→566)

### Dalga 11: Variant filter + chip butonları (2026-04-25/26)
- Migration 004: smart_search v2 (variant_color/storage patterns)
- fastPathDetector: variant keyword → slow
- chatOrchestrator: extractVariantPatterns + semantic_keywords fallback
- suggestionBuilder.ts: 5 tip chip
- ChatPanel v3 + ChatBar v3 layout
- displayLabel (UI label / backend value)

### Dalga 12: Duplicate audit + merge (paralel, devam)
- productIdentity.ts + sync/route.ts değişiklikleri
- Audit endpoint kurulumu
- Listing/alert/favori/queue migration

---

## ✅ COMMIT GEÇMİŞİ (Son 2 hafta)

```
[devam] Duplicate audit + merge (paralel Claude Code)
[devam] Faz 1 1000-test bm2rckq2a (gemma-3 kaldırıldıktan sonra %0 fail)
ca90fbb  perf(faz1): gemma-3-27b-it model chain'den kaldırıldı
00f62d9  fix: chip butonları — siyah telefon → marka chip
bf38b3d  fix: restore homepage products and non-priced product pages
56cabf2  fix: restore category routes with server data access
4511297  feat: add freshness to similar product cards
c05c7bf  feat: Header 68 kırık slug fix (Çözüm C hibrit) — categorySlugMap.ts
85681a6  feat: 3 missing categories — babet/etek/film-dizi (migration 005)
7a6e357  feat: v3 üzerine Parça 6 + Parça 7 yeniden bağla
9be4f7f  feat: ChatPanel v3 + ChatBar v3 UI değişiklikleri
e40dd65  feat: chatbot proaktif daraltıcı sohbet + chip butonları
87c376d  fix: variant filter — genişletilmiş renk + Türkçe karakter
6831d25  fix: variant filter slow path routing + sourceTrustScore re-export
b5a2925  fix: variant filter LLM tutarsızlık fallback + STORAGE_KEYS
8877d61  feat: renk/storage variant filter + Faz 1 classifier script
0e729aa  test: chatbot e2e suite (5 senaryo) — 5/5 pass
adab89b  chore: orphan ChatWidget + chatpanel v3 e2e
2977207  docs: PROJECT_STATE.md v3
25b5223  feat: chatbot Parça 7 — mikrofon Web Speech API
a56dcd9  feat: chatbot Parça 6 — + butonu görsel yükleme MVP
0a9e137  feat: ürün detay sayfası 4 sekmeli tasarım
5ea1f5c  feat: chatbot v3 — Zustand persist + chat_session_id
a5d84ee  feat: chatbot UI v2 + proaktif + /sonuclar sayfası
888ea69  feat: chatbot RAG integration              ← chatbot canlı, 4/4 E2E
```

---

## 🤖 DAVRANIŞ KURALLARI

### Claude (sohbet) için

1. **Bu dosyayı önce oku** — Bağlamı buradan al, sorma.
2. **Kritik Kararları sorgulama.**
3. **Yeni karar verirken** Kritik Kararlar tablosuna ekle.
4. **Yeni iş başlattığında** Şu An Aktif listesini güncelle.
5. **Tahminle hareket etme** — ÖNCE Bilinen Durum'a bak.
6. **Önceki sohbetlerin özeti güvenilmez olabilir** — Bu dosya kazanır.

### Claude Code (implementer) için

1. **Her oturum başında bu dosyayı OKU.** `cat PROJECT_STATE.md`
2. **Mevcut kod değişikliklerini "regression" olarak FLAG ETME** —
   kasıtlı olabilir, önce Kritik Kararlar tablosuna bak.
3. **Untracked dosyalar** — Bu dosyada bahsediliyorsa muhtemelen
   bilinçli, silmeden önce kullanıcıya sor.
4. **Migration'lar** — Bilinen Durum > Migrations bölümüne bak.
5. **Server component'ta `supabaseAdmin`, client'ta `supabase`.**
   Server'da anon → RLS yüzünden boş sonuç.
6. **Davranış değişikliği yapma** — Claude (sohbet) yönlendirmeden
   büyük refactor yapma.
7. **Yanlış alarm verme** — "katastrofik" gibi güçlü ifadeler önce
   bu dosyayı kontrol et.

### Kullanıcı için

1. **Yeni karar verdikçe** Kritik Kararlar tablosuna ekle.
2. **Bitmiş iş** Commit Geçmişi'ne ekle.
3. **Yeni sohbet açtığında** bu dosyayı paste et.
4. **Disiplini bozma.**

---

## 📞 BAĞLAM SORULARI (FAQ)

**S: Faz 1 nedir?**
C: backup_20260422_products (43K) → products LLM-classify pipeline.
Şu an 227 eklendi (566/43K). Multi-model, audit, brand NULL kabul.
Background `bm2rckq2a` çalışıyor.

**S: prices vs listings farkı?**
C: prices eski şema, listings yeni (ürün-mağaza-stok). price_history
listing_id'ye zaman serisi. Tüm yazma listings'e.

**S: Chatbot fast/slow path?**
C: Fast = "iPhone 15 Pro Max" spesifik (vector). Slow = "lavanta
deodorant" / "siyah telefon" betimleyici/varyant (KB+intent+hybrid+variant).

**S: Hangi mağazalar canlı?**
C: Sadece PttAVM. MediaMarkt+Trendyol interface var, URL placeholder.

**S: Embedding durumu?**
C: 339 canonical %100 embed. Faz1 +227 NULL (backfill bekliyor).

**S: Klasik arama vs Chatbot farkı?**
C: Header `/ara` (kelime). ChatBar `/sonuclar` (AI niyet, RAG, chip).

**S: middleware silinmiş mi?**
C: HAYIR. Next 16 → `src/proxy.ts`.

**S: 003/004/005 migration uygulandı mı?**
C: HEPSİ EVET.

**S: Header'daki kategori linkleri?**
C: HEPSİ EVET. categorySlugMap.ts ile 68 kırık → 0.

**S: Server'da neden supabaseAdmin?**
C: Anon RLS sıkı, server anon read boş döner. supabaseAdmin RLS bypass.

**S: ChatPanel açılmıyor sorunu?**
C: ÇÖZÜLDÜ. Zustand persist (sessionStorage). E2E PASS.

**S: Suggestion chip ne işe yarar?**
C: Bot daraltıcı sohbet. "siyah telefon" → marka chip, "merhaba" →
kategori, "tavsiye ver" → 3 segment. 5 tip.

**S: gemma-3 neden kaldırıldı?**
C: JSON mode desteksiz, 400 errors, %76 fail. Yeni chain:
flash-lite → 2.0-flash, %0 fail.

**S: 83 keşfedilmemiş DB kategorisi?**
C: Header'da olmayan 83 aktif kategori (kahve-makinesi, mikrodalga,
powerbank vb.). Sonraki Header tur.

**S: Duplicate audit/merge nedir?**
C: Mevcut katalogda aynı ürüne ait dağılmış kayıtları tespit + tek
canonical'a taşı. Yan tablolar (alert/favori/queue) da migrate.
Paralel Claude Code agent'ı çalışıyor.

---

## 📌 GÜNCELLEME LOG'U

| Tarih | Ne değişti | Kim |
|---|---|---|
| 2026-04-24 | İlk versiyon | Claude (sohbet) |
| 2026-04-24 | v2 — detaylı yeniden yazım | Claude (sohbet) |
| 2026-04-24 | v3 — current state alignment | Claude (sohbet) |
| 2026-04-26 | v4 — Faz1, Header 68 fix, ChatPanel v3, suggestion chips, supabaseAdmin, migration 004+005, duplicate audit (Wave 9-12) | Claude Code |

---

## 🔚 SON NOT

Bu dosya **canlı bir belge.** Her hafta güncel tutulmalı:
- Bir kararın **sebebi belirsizleşirse** → buraya yaz
- Yeni teknik borç → Bilinen Teknik Borçlar
- Mimari değişiklik → Kritik Kararlar
- Yeni iş dalgası → Önceki İş Dalgaları

**Hedefin:** "Yeni Claude/Claude Code 30 saniyede tüm bağlamı alabilsin."
