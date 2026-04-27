# birtavsiye.net — Project State v6

> **Bu dosya tek kaynak gerçek.** Yeni sohbet/oturum başlattığınızda
> bu dosyayı Claude veya Claude Code'a verin — tüm bağlamı 30 saniyede alır.

**Son güncelleme:** 2026-04-27 v6 (search regression + price_history + 3-bug session)
**Production:** https://birtavsiye.net (www.birtavsiye.net canonical)
**Stack:** Next.js 16, Supabase + pgvector, Zustand, NVIDIA Llama 3.3 70B / Groq / Gemini fallback

---

## 🎯 PROJE ÖZETİ

birtavsiye.net Türkiye merkezli bir ürün karşılaştırma + tavsiye platformu.
PttAVM + MediaMarkt scrape ile çoklu mağaza fiyatları, AI chatbot ile
kişiselleştirilmiş tavsiye, kategori bazlı search, forum tartışmaları.

### Konumlandırma
- **Doğrudan rakipler:** Akakçe, Cimri, Akçeli, Pricet
- **Farklılaşma noktası:** Anlam katmanında çalışır + **proaktif chatbot ile rehberlik**
- **Hedef kitle:** Türkçe konuşan, alışveriş kararı vermeden önce bilgi/tavsiye arayan kullanıcı

### Ekip
- **Sahibi:** Non-technical, Claude Code'u implementer olarak kullanıyor
- **Mimar/Reviewer:** Claude (sohbet) — strateji + kod incelemesi
- **İletişim dili:** Türkçe, direkt, gereksiz preamble yok

---

## 📊 DB STATE (2026-04-27)

| Tablo | Sayı |
|---|---|
| products | 815+ canonical |
| listings (MM çoğu) | ~1294 (devam) |
| price_history | 1294 (coverage %100) |
| categories | 177 (Migration 005 sonrası) |
| topics | 21 (forum seed, statik) |
| topic_answers | 84 |
| akilli-telefon | 27 ürün (Samsung 6, Apple 10, OPPO 3, NUBIA 3, TECNO 3) |
| KB | 141 chunk, 12 doküman |
| agent_decisions | büyüyor (chatbot logging) |
| backup_20260422_products | 43,176 (Faz 1 kaynak) |

---

## 🟢 BACKGROUND PROCESSES

**MM Scrape (PID 466141)** — Çalışıyor (akilli-telefon ONLY + SKIP_24H=0)
- Resume sonrası: 33/50+ kategori arası
- Aktif: kahve makinesi / blender civarı (28 Nisan civarı bitiş tahmini)
- Module cache: 8913a79 / da7f09b sonrası price_history insert + brand fix
  bu süreçte AKTİF DEĞİL (resume sonrası geçerli olur)

---

## 🔑 KRİTİK MİMARİ

### Search Pipeline
```
User mesaj → intentParser (NVIDIA/Groq fallback)
  → enrichBrandFilterFromKeywords (Samsung/Apple → brand_filter)  ← v6 yeni
  → chatOrchestrator → smart_search RPC
  → productRetrieval (ranking + ACCESSORY_HARD_FILTER)            ← v6 sıkı
  → suggestionBuilder (chip üretim, 9 katman)
  → generateResponse (LLM)
```

### Smart Search RPC (Migration 004)
- `query_embedding` (768-dim Gemini)
- `category_filter`, `brand_filter`, `price_min/max`
- `variant_color_patterns`, `variant_storage_patterns`
- `match_count`, `match_threshold`

### MediaMarkt Scrape Mimarisi
- Category-driven (mediamarkt-category-map.mts ↔ MM kategori tree)
- 24h fresh skip (SKIP_24H=0 ile bypass)
- JSON-LD + Apollo cache walker (raw_specs)
- failsByReason diagnostic
- 503 cookie reset + retry
- price_history insert: INSERT + UPDATE her iki path (v6)

### Chatbot Akışı
```
ChatBar/ChatPanel input
  ↓
useChatStore.addUserMessage() + history
  ↓
router.push("/sonuclar?q=...")
  ↓
fetch("/api/chat", { message, history, chatSessionId, decisionId, intentHint? })
  ↓
[server] orchestrateChat
  ├── fastPath: match_products RPC (vector)
  └── slowPath:
        - retrieveKnowledge (5dk LRU)
        - parseIntent (Llama + history) → enrichBrandFilterFromKeywords
        - extractVariantPatterns (renk/storage)
        - smart_search RPC (hybrid + variant filter)
        - generateResponse (Llama + KB + intent + history)
        - buildSuggestions (chip butonları + categorySlug)
  ↓
agent_decisions log (output_data: suggestions + reply + brand_filter dahil)
  ↓
Response: { reply, products, suggestions, meta:{ decisionId } }
  ↓
[client] addAssistantMessage(content, suggestions)
  ↓
ChatPanel: yanıt + chip (son mesaj)
/sonuclar: ürün grid
```

**Chip türleri:**
- `shortcut`: 🔥 En popüler, ✨ Tavsiye ver, Hepsini göster, Yeni arama
- `brand`: Apple, Samsung vb.
- `price`: 10-30K, 30-60K
- `category`: Telefon → categorySlug:akilli-telefon (v6 hint)
- `freetext`: "Ekonomik detay", "Denge detay"

**Provider chain:** NVIDIA → Groq → Gemini Flash

---

## ✅ SON SESSION'DA YAPILANLAR (27 Nisan 2026)

### 1. Camera + Gallery split (c7b2b13)
ChatBar PlusMenu: 📷 Fotoğraf çek + 🖼️ Galeriden seç
Mobile capture='environment' arka kamera direkt

### 2. MM Scrape Plan A+ (4 fix + restart)
Process clean kill sonrası:
- failsByReason counter
- kulaklik category_not_found debug
- uncaughtException + SIGTERM/SIGINT handlers
- 503 cookie reset + 5sn + 1 retry

### 3. Search Regression Fix (bcebf6b)
**Bug:** "kırmızı telefon Samsung" → kılıflar
**Fix paketi (5 dosya):**
- productRetrieval.ts: ACCESSORY_HARD_FILTER (-18 → return null/-100)
- mediamarkt-category-map.mts: akilli-telefon ~50 leaf segment
  (Samsung Telefon, Galaxy A/S/Z, iPhone 11-17 model leaf)
- productTitle.ts: extractColorFromTitle helper (TR+EN)
- scrape-mediamarkt: variant_color title parse
- backfill-variant-color.mjs script (310 ürün)
- chatOrchestrator.ts: suggestions empty trace

### 4. 3-Bug Fix (da7f09b)
- **Bug 1:** agent_decisions output_data'da suggestions + reply yoktu
  → route.ts:440-462 fix
- **Bug 2:** brand_filter parser, keywords'teki Samsung/Apple/Xiaomi
  → intentParser.ts:228-262 enrichBrandFilterFromKeywords + KNOWN_BRANDS_TR
- **Bug 3:** "Telefon" chip too_vague düşüyor
  → Suggestion.categorySlug field, ChatPanel intentHint, route.ts effectiveCategory

### 5. price_history Fix (8913a79)
- upsertListing INSERT/UPDATE path'lerinde price_history insert
- backfill-price-history.mjs: 1283 satır insert
- Coverage: 7 → 1294 (%100)

---

## 🚦 BEKLEYEN İŞLER (öncelik sırası)

### 🔥 KRİTİK
1. **MM scrape sonuç kontrol** (sabah)
   - failsByReason raporu
   - 50/50 kategori bitti mi
   - akilli-telefon kategorisinde yeni telefon sayısı
   - Eğer az kaldıysa: state.json'dan akilli-telefon:: sil, mapping
     yeni leaf'lerle resume

### 🟡 ORTA
2. **Apple/APPLE duplicate brand chip**
   - DB'de mixed casing
   - suggestionBuilder buildBrandSuggestions normalize
   - Veya scrape ingestion'da brand TitleCase normalize

3. **Chatbot timeout** (15 dk → 2 dk + 1 dk uyarı)
   - useChatStore inactivity logic revize
   - mouse/touch event listener

4. **MM frontend gösterim test**
   - "MM fiyatı yok" şikayeti araştırma
   - LivePriceComparison.tsx + useLivePrices.ts

### 🟢 OPSİYONEL
5. variant_color backfill 2. tur (yeni 500 telefon için)
6. MM Faz 2 enrichment (specs zenginleştirme)
7. /tavsiyeler kategori sekmeleri parent vs child slug fix

---

## 📁 ANA DOSYALAR

```
PROJECT_STATE.md                                              # bu dosya (v6)
src/app/api/chat/route.ts                                     # 3-bug fix
src/lib/chatbot/intentParser.ts                               # KNOWN_BRANDS_TR
src/lib/chatbot/intentParserRuntime.ts                        # cache executor
src/lib/chatbot/chatOrchestrator.ts                           # smart_search çağrısı
src/lib/chatbot/suggestionBuilder.ts                          # 9-katman + categorySlug
src/lib/chatbot/generateResponse.ts                           # LLM yanıt
src/lib/chatbot/useChatStore.ts                               # state + inactivity
src/lib/search/productRetrieval.ts                            # HARD FILTER + ranking
src/lib/scrapers/mediamarkt.mts                               # JSON-LD + Apollo
src/lib/scrapers/mediamarkt-categories.mts                    # category reader
src/lib/scrapers/mediamarkt-category-map.mts                  # 21 DB → ~70 MM
src/lib/productTitle.ts                                       # extractColorFromTitle
src/components/chatbot/ChatBar.tsx                            # camera split
src/components/chatbot/ChatPanel.tsx                          # chip click intentHint
scripts/scrape-mediamarkt-by-category.mjs                     # ana scraper
scripts/scraper-state.json                                    # gitignored, resume state
scripts/backfill-variant-color.mjs                            # color title parse
scripts/backfill-price-history.mjs                            # history backfill
scripts/seed-forum-static.mjs                                 # 21 topics + 84 answers
mm-category-tree.json                                         # 367KB, 713 leaf
supabase/migrations/004_smart_search_variants.sql             # variant_color_patterns
supabase/migrations/005_header_missing_categories.sql         # babet/etek/film-dizi
supabase/migrations/006_listings_raw_columns.sql              # raw_specs/images/desc
/tmp/mm-full-resume.log                                       # resume log
```

---

## 🤝 PARALEL EDİTÖR

Başka agent/IDE'nin yaptığı işler (çakışmasız, farklı domain):
- src/lib/categoryFilterSpecs.ts (Akakçe-tarzı kategori filtre)
- src/lib/productVariantFamily.ts (variant family canonical)
- src/app/components/kategori/CategoryFiltersSidebar.tsx
- kategori/[slug]/page.tsx (multi-select 7 spec filter)
- urun/[slug]/page.tsx (variant family fallback)
- ProductBestOfferCard + LivePriceComparison + offerUtils (favicon fallback)
- ProductVariantOptions.tsx redesign (chip butonlar)

ProductDetailShell.tsx ortak nokta — uyumlu.

---

## 🎯 ÇALIŞMA ŞEKLİ

**User**: Non-technical, Turkish, direct, no preamble
**Claude (this)**: Architect/reviewer, gives paste-ready packages
**Claude Code**: Implementer (file edits, bash commands)

**Paket pattern**:
1. Diagnostic keşif → rapor → tanı
2. Fix paketi → paste → test → commit → push
3. Production verify → next item

---

## ⚖️ KRİTİK KARARLAR (GERİ ALINMAYACAK)

| Karar | Tarih | Sebep |
|---|---|---|
| middleware → proxy.ts | 2026-04-24 | Next 16 deprecation |
| prices → listings + price_history | 2026-04-24 | Eski şema fiyat geçmişi yapmıyordu |
| Alarm condition fix | 2026-04-24 | TERS kondisyon |
| /api/refresh-prices auth | 2026-04-24 | Anonim açıktı |
| Forum endpoint whitelist | 2026-04-24 | PII sızıyordu |
| answer_count atomik SQL | 2026-04-24 | Race condition |
| Google Fonts kaldırıldı | 2026-04-24 | KVKK + CSP |
| /api/me/topic-answers | 2026-04-24 | Forum güvenliği |
| priceHealth + cron + admin | 2026-04-24 | Stale tespit |
| Chatbot intent: NVIDIA Llama 3.3 70B | 2026-04-24 | Gemini koru |
| Fallback: NVIDIA → Groq → Gemini Flash | 2026-04-24 | Dirençlilik |
| Voice: Web Speech API | 2026-04-24 | Whisper sonra |
| Fast/slow path ayrımı | 2026-04-24 | Spesifik vs niyet |
| Header arama + chatbot paralel | 2026-04-24 | Farklı amaçlar |
| /sonuclar yönlendirme | 2026-04-24 | URL paylaşılabilir |
| Chatbot UI = Zustand | 2026-04-24 | Çoklu component |
| ChatWidget silinecek | 2026-04-24 | Yeni UI |
| Image search: B önce A sonra | 2026-04-24 | DB'de varsa direkt |
| Sesli komut: bas-konuş | 2026-04-24 | Basit interaction |
| Ürünler chat içinde DEĞİL | 2026-04-24 | Chat=konuşma, /sonuclar=ürünler |
| Chatbot proaktif sohbet | 2026-04-24 | Tek kelimeyi vague sayma, history |
| Lifecycle: küçült=koru, kapat=sil, 15dk timeout | 2026-04-24 | Kullanıcı kararı |
| Chatbot UI v3: 320×600 köşe pencere | 2026-04-24 | Tam yükseklik büyüktü |
| Zustand persist (sessionStorage) | 2026-04-24 | router.push state korunsun |
| chat_session_id (feedback race) | 2026-04-24 | Session-scoped |
| ChatBar düzen: [🎤] [input] [+] [▶] | 2026-04-26 | Mic sola, + sağa |
| + menü: sadece Fotoğraf yükle | 2026-04-26 | "Ara" eklenmedi |
| Chip türleri: shortcut/brand/price/category/freetext | 2026-04-26 | Daraltıcı sohbet |
| "Tavsiye ver": 3 segment (ekonomik/denge/premium) | 2026-04-26 | Bot interaktif |
| "En popüler": ürünler + daraltıcı chip | 2026-04-26 | Hızlı çözüm |
| Header 68 kırık → categorySlugMap | 2026-04-26 | 1-to-1 + 1-to-many |
| Migration 005 (3 yeni kategori) | 2026-04-26 | babet/etek/film-dizi |
| Server components'ta supabaseAdmin | 2026-04-26 | Anon RLS sıkı, boş veri |
| Faz 1 strategy A (direkt write) + AGRESİF brand | 2026-04-25 | Gemini her ürün doğrular |
| Faz 1 audit alanları | 2026-04-26 | Sonradan ekleme zor |
| Brand NOT NULL kaldırıldı | 2026-04-26 | "Generic" uydurma yerine NULL |
| gemma-3 kaldırıldı (Faz 1) | 2026-04-26 | 400 errors, fallback yavaşlatıyordu |
| ChatBar camera+gallery split | 2026-04-27 | Mobile arka kamera direkt |
| MM category-driven scrape | 2026-04-27 | URL pattern kararsız, kategori daha sağlam |
| Migration 006 listings.raw_* | 2026-04-27 | Specs/images/desc geç enrichment için |
| ACCESSORY_HARD_FILTER | 2026-04-27 | Aksesuar telefon sorgusunda dönüyordu |
| MM map ~50 telefon leaf | 2026-04-27 | iPhone kategorisinde aksesuar karışıyordu |
| variant_color title parse | 2026-04-27 | Renk filtresi %30 → %100 |
| Forum seed STATİK (Gemini değil) | 2026-04-27 | Gemini 429 quota — 105 satır 0 fail |
| price_history scraper insert (INSERT+UPDATE) | 2026-04-27 | Sadece 7 satır vardı, %0.5 → %100 |
| KNOWN_BRANDS_TR enrichment | 2026-04-27 | LLM brand_filter boş bırakıyordu |
| Suggestion.categorySlug + intentHint | 2026-04-27 | "Telefon" chip too_vague düşüyordu |
| agent_decisions output_data: suggestions + reply | 2026-04-27 | DB log eksikti, teşhis yapılamıyordu |

---

## 📦 BİLİNEN DURUM

### Veritabanı

**Aktif:**
- `products` — 815+ canonical (Faz 1 büyüyor), embedding %100 (Faz 1 NULL)
- `categories` — 177 aktif (Migration 005 sonrası)
- `listings` — Yeni şema, ürün-mağaza-fiyat-stok (~1294 satır)
- `price_history` — listing_id'ye bağlı zaman serisi (1294 satır, %100 coverage)
- `agent_decisions` — Tüm kararlar (chatbot-search + faz1-classifier)
- `decision_feedback` — Kullanıcı feedback
- `topics`, `topic_answers`, `community_posts` — Forum (21 + 84 statik seed)
- `knowledge_base` — 141 chunk, 12 doküman
- `users`, `auth.users` — Supabase auth

**Backup:**
- `backup_20260422_products` — 43,176 satır (Faz 1 kaynak)
- `backup_20260422_prices` — 43,279 satır

### Migrations

| Migration | Durum |
|---|---|
| 001_knowledge_base.sql | ✅ |
| 002_smart_search.sql | ✅ |
| 003_topic_answer_count_rpc.sql | ✅ |
| 004_smart_search_variants.sql | ✅ |
| 005_header_missing_categories.sql | ✅ |
| 006_listings_raw_columns.sql | ✅ |

### Knowledge Base
12 doküman / 141 chunk (`docs/knowledge/`):
parfum_notalari (10), cilt_bakimi (11), makyaj (12), moda_ust_giyim (13),
moda_alt_giyim (14), moda_ayakkabi (11), elektronik_telefon (9),
elektronik_laptop (11), beyaz_esya (20), gida (8), pet_shop (11),
anne_bebek (11) = **141**

### API endpoints

**Aktif:**
- `/api/chat` — Chatbot (history + chatSessionId + suggestions + intentHint)
- `/api/sync` — Mağaza sync
- `/api/refresh-prices` — Tek ürün (auth)
- `/api/admin/prices/health` — priceHealth dashboard
- `/api/admin/chat/decisions` — Decision log viewer
- `/api/cron/prices` — Periyodik
- `/api/public/products` — Ürün listesi
- `/api/public/products/similar` — Benzer
- `/api/public/topics` / `/api/public/topic-answers` / `/api/public/community-posts`
- `/api/me/topic-answers` — Kullanıcı (auth)
- `/api/live-prices` — SSE

### Frontend route'ları

| Route | Dosya |
|---|---|
| `/` | src/app/page.tsx |
| `/kategori/[slug]` | src/app/kategori/[slug]/page.tsx |
| `/anasayfa/[...segments]` | src/app/[...segments]/page.tsx |
| `/urun/[slug]` | src/app/urun/[slug]/page.tsx |
| `/sonuclar` | src/app/sonuclar/page.tsx |

### Mağaza scraper'ları

| Mağaza | Durum |
|---|---|
| PttAVM | ✅ Canlı |
| MediaMarkt | ✅ Canlı (category-driven, 1294 listing) |
| Trendyol | 🟡 Interface, URL placeholder + anti-bot |
| Hepsiburada, N11, Vatan, Teknosa, Migros | ❌ Yok |

### Bilinen teknik borçlar

| Borç | Etki | Plan |
|---|---|---|
| 83 keşfedilmemiş DB sub-kategorisi | Erişilemiyor | Sonraki Header turu |
| `products.specs` kirli | Search zayıf | Specs whitelist |
| `brand: "null"` string | Eski kayıtlarda yanlış | Migration veya re-classify |
| Apple/APPLE mixed casing | Duplicate brand chip | suggestionBuilder normalize |
| Latency yüksek (slow 16s) | UX | Paralel KB+search |
| Faz 1 embedding NULL | Vector search'te yok | Backfill cron veya 29-gün sonu |
| AbortController eksik | Token israfı | intentParserRuntime + provider chain |
| Header tam yeniden yapı | DB'den dinamik değil | Uzak öncelik |
| MM bg scrape modül cache | yeni fix'ler resume sonrası geçer | Restart sonra geçerli |

---

## 📊 ÖNCEKİ İŞ DALGALARI

**1:** Agent consolidation (`1ca8a89`)
**2:** Live price (`705de96`, `7eaaae0`) — PttAVM real
**3:** Karşılaştırma + ChatWidget v1 (`d1f00d6`)
**4:** KB foundation (`cac1013`, `10c208c`) — Migration 001 + Wave 1
**5:** KB Wave 2 (`9782cd5`) — 9 doküman, 141 chunk
**6:** Schema migration + güvenlik — prices→listings, alarm, auth, forum, atomik counter, proxy.ts, fonts, priceHealth
**7:** Chatbot RAG (`ae8e705`, `888ea69`) — smart_search, intent, fast/slow, KB, response, orchestrator
**8:** Chatbot UI (04-24 → 04-26) — Zustand v3, ChatBar v3, ChatPanel v3, suggestion chips, mic+image, /sonuclar, history+chatSessionId+variant filter, supabaseAdmin
**9:** Header + Kategori (04-26) — 68 kırık fix (categorySlugMap), Migration 005, URL hierarchy, server components supabaseAdmin
**10:** Faz 1 (04-25 → ongoing) — LLM classifier, multi-model fallback, resume, dry-run %96, 100 gerçek %76
**11:** MM scrape category-driven (04-27) — 49/49 kategori, 7.6h, 726 insert + 63 update + 5975 skipped + 1061 fails
**12:** Search regression + 3-bug + price_history (04-27) — `bcebf6b` + `da7f09b` + `8913a79`

---

## ✅ COMMIT GEÇMİŞİ (son 25)

```
da7f09b   fix(chat): suggestion log + brand parser + chip kategori hint
afbd879   feat: add category filters and hide refurbished products
8913a79   fix(scraper): price_history insert in upsertListing + backfill
bcebf6b   fix(scraper): DB slug uyumsuzlugu + SKIP_24H bypass flag
141f6f8   feat(search): aksesuar hard filter + variant color extraction + MM map genisletme
10c208c   feat: knowledge base docs for cosmetics and fashion
cac1013   feat: knowledge base foundation for chatbot RAG
7eaaae0   feat: real PttAVM fetcher implementation + FetchContext
6c9b4ec   feat: day 1-2 migration baseline
27c4cf5   fix: add Header/Footer chrome to product + comparison pages
bf38b3d   fix: homepage products + non-priced product pages
56cabf2   fix: category routes server data access
4511297   feat: similar product cards freshness
ca90fbb   perf(faz1): gemma-3 kaldırıldı
00f62d9   fix: chip butonları — siyah telefon → marka chip
c05c7bf   feat: Header 68 kırık slug fix (categorySlugMap)
85681a6   feat: Migration 005 — babet/etek/film-dizi
e40dd65   feat: suggestionBuilder + chip render
7a6e357   feat: v3 + Parça 6/7 yeniden bağla
9be4f7f   feat: ChatPanel v3 320×600 + ChatBar v3
87c376d   fix: variant filter renk sözlüğü
8877d61   feat: variant filter + Faz 1 classifier
2977207   docs: PROJECT_STATE.md v3
25b5223   feat: Parça 7 mikrofon
a56dcd9   feat: Parça 6 görsel yükleme
```

---

## 🤖 DAVRANIŞ KURALLARI

### Claude (sohbet) için

1. **Bu dosyayı önce oku** — bağlamı buradan al
2. **Kritik Kararları sorgulama** — bilinçli kararlar
3. **Yeni karar verirken** Kritik Kararlar tablosuna ekle
4. **Yeni iş başlattığında** Bekleyen İşler listesini güncelle
5. **Tahminle hareket etme** — Bilinen Durum'a bak
6. **Önceki sohbet özetleri güvenilmez** — bu dosya kazanır
7. **UI dosyası overwrite etmeden önce mevcut özellikleri doğrula** — regresyon önle

### Claude Code (implementer) için

1. **Her oturum başında bu dosyayı OKU.** `cat PROJECT_STATE.md`
2. **Mevcut kod değişikliklerini "regression" FLAG ETME** — kasıtlı olabilir
3. **Untracked dosyalar** — bu dosyada bahsediliyorsa silme
4. **Migration'lar** — Bilinen Durum > Migrations'a bak
5. **Davranış değişikliği yapma** — Claude (sohbet) onayı gerek
6. **Yanlış alarm verme** — "katastrofik" demeden önce dosyayı kontrol
7. **Bilmediğin tablo/agent görürsen** Bilinen Durum'a bak
8. **Server components'ta `supabaseAdmin` kullan** (`supabase` anon DEĞİL).
   Anon RLS sıkı — server-side render boş veri döner.
   Etkilenen dosyalar: `src/app/[...segments]/page.tsx`,
   `src/app/kategori/[slug]/page.tsx`, `src/app/urun/[slug]/page.tsx`,
   `src/app/components/home/Categories.tsx`,
   `src/app/components/home/FeaturedProducts.tsx`,
   `src/app/components/marka/ModelPageView.tsx`,
   `src/lib/categoryTree.ts`. Commit `bf38b3d`/`56cabf2`/`4511297` bu sebeple.
9. **MM scraper kodu değişince** background scrape modül cache'inden dolayı
   eski koda devam eder — restart sonrası geçerli olur.

### Kullanıcı için

1. **Yeni karar verdikçe** Kritik Kararlar tablosuna ekle
2. **Bitmiş iş** Commit Geçmişi'ne ekle
3. **Yeni sohbet açtığında** bu dosyayı paste et
4. **Eksik gelirse** Claude'a "şunu da ekle" de
5. **Disiplini bozma** — güncel kalmazsa açıklama yüküne döneriz

---

## 📞 BAĞLAM SORULARI (FAQ)

**S: Faz 1 nedir?**
C: 43K backup ürünü Gemini ile classify edip products tablosuna ekleyen pipeline. Brand temizleme + kategori atama + model_family. ~29 gün arka plan (free tier 1500 RPD).

**S: prices vs listings farkı?**
C: prices eski şema. listings yeni (ürün-mağaza-stok). Aktif yazma listings'e. price_history listing_id'ye bağlı.

**S: Chatbot fast/slow path nedir?**
C: Fast = "iPhone 15 Pro Max" (vector). Slow = "lavanta deodorant" (KB + intent + hybrid).

**S: Hangi mağazalar canlı?**
C: PttAVM + MediaMarkt (1294 listing). Trendyol interface var, URL placeholder.

**S: Embedding ne durumda?**
C: 339 başlangıç ürünü %100. Faz 1'le gelenler NULL — sonra backfill.

**S: Klasik arama vs Chatbot?**
C: Header'daki klasik → `/ara` (kelime). ChatBar → `/sonuclar` (RAG, chip).

**S: middleware silinmiş mi?**
C: HAYIR. Next 16 ile `src/proxy.ts`'e taşındı.

**S: Migration'lar nasıl?**
C: 001-006 hepsi yüklü. Yeni migration manuel uygulanmalı.

**S: ChatPanel açılma sorunu?**
C: ÇÖZÜLDÜ. Zustand persist (sessionStorage).

**S: Renk filtresi?**
C: ÇÖZÜLDÜ. variant_color/storage smart_search params + extractVariantPatterns + title parse + 310 backfill.

**S: Header kırık slug?**
C: ÇÖZÜLDÜ. categorySlugMap.ts + Migration 005. 159/159 link uyumlu.

**S: Ana sayfa/kategori/ürün sayfaları boştu?**
C: ÇÖZÜLDÜ. Server components supabaseAdmin'e geçirildi (RLS bypass).

**S: Bot chip neden bazen kategori soruyor?**
C: 4 senaryo: "siyah telefon" → marka, "merhaba" → kategori, marka belli + 6+ ürün → bütçe, spesifik → chip yok.

**S: Faz 1 yeni ürünler embedding'siz mi?**
C: EVET, kasıtlı. Backfill sonra.

**S: "kırmızı telefon Samsung" → kılıflar dönüyordu?**
C: ÇÖZÜLDÜ (`bcebf6b`). ACCESSORY_HARD_FILTER + MM map ~50 telefon leaf + variant_color title parse + 310 backfill.

**S: "Telefon" chip too_vague düşüyordu?**
C: ÇÖZÜLDÜ (`da7f09b`). Suggestion.categorySlug + ChatPanel intentHint + route.ts effectiveCategory override.

**S: brand_filter LLM'den hep [] geliyordu?**
C: ÇÖZÜLDÜ (`da7f09b`). enrichBrandFilterFromKeywords + KNOWN_BRANDS_TR (40+ marka).

**S: agent_decisions DB log'unda suggestions hep 0 görünüyordu?**
C: ÇÖZÜLDÜ (`da7f09b`). output_data'ya suggestions + reply + brand_filter eklendi.

**S: price_history sadece 7 satırdı?**
C: ÇÖZÜLDÜ (`8913a79`). Scraper INSERT/UPDATE her iki path'de price_history insert + backfill 1283 satır = %100 coverage.

---

## 📌 GÜNCELLEME LOG'U

| Tarih | Ne değişti | Kim |
|---|---|---|
| 2026-04-24 | İlk versiyon | Claude |
| 2026-04-24 | v2 — detaylı yeniden yazım | Claude |
| 2026-04-24 | v3 — current state alignment | Claude |
| 2026-04-26 | v4 — chatbot UX tamam, Header tamam, supabaseAdmin kuralı, Faz 1 ongoing | Claude |
| 2026-04-26 | v5 — varyant filtre + Header slug map + Migration 005 | Claude |
| 2026-04-27 | v6 — search regression + 3-bug + price_history + MM scrape category-driven | Claude |

---

## 🔚 SON NOT

**Hedef:** "Yeni Claude/Claude Code 30 saniyede tüm bağlamı alabilsin."
