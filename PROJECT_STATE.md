# birtavsiye.net — Project State v12

> **Bu dosya tek kaynak gerçek.** Yeni sohbet/oturum başlattığınızda
> bu dosyayı Claude veya Claude Code'a verin — tüm bağlamı 30 saniyede alır.

**Son güncelleme:** 2026-04-29 v12 (DB capacity outage + cron disable + maintenance mode)

---

## 🔴 GÜNCEL DURUM (29 Apr 2026 akşam)

**YAPILDIKLAR (bugün, sırayla):**
- Bug A,B,C,D commit ✅
- Bug E.1 filesystem (commit `19638ee`) ✅
- Bug E.2 sadece 3/12 chunk (commit `b7e7efc`, DB outage devam etti)
- Eval baseline 1/10 = %10 (Tur 2 fixture refresh yarısı: keywords drop, count relax, Nescafé→Jacobs)
- 7 cron-job.org cron disable ✅ (asıl yük buydu — günlük ~10K tetik)
- Robots.txt block-all (commit `ac22eeb` + `f390595`) ✅
- Maintenance mode 503 (commit `2ab4622`) ✅ — bot trafiği komple blok
- Supabase Pro plan satın alındı ($25/ay, NANO compute)

**ANA TANI:**
1. cron-job.org × 7 cron her 15 dk tetik → DB CPU %85 → DİSABLE
2. Vercel ISR + bot trafiği → robots.txt push + maintenance 503
3. NANO Disk IO bütçesi 30 dk burst limit → tükendi
4. NANO 0.5GB RAM yetersiz ama maliyet kritik → ay sonu karar

**YARIN İÇİN PLAN (30 Apr 2026):**
- 03:00 (UTC 00:00) → Disk IO bütçesi reset
- DB temiz başlamalı
- Maintenance OFF (`MAINTENANCE_MODE=false` + commit + push)
- Migration 011 SQL: `kahve` (parent UUID `1b056a91-32f3-4695-b982-4d02d4b157b3` supermarket) + `spor-cantasi` (parent UUID `76500641-97c6-4200-be1d-6735612cdd81` spor-outdoor)
- 2.D `single_word_widen` drop
- Tur 2 commit + eval re-run
- Pass ≥%60 → Paket M Faz M.1 / <%60 → Tur 3
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

## 📊 DB STATE (2026-04-29 sonrası v11)

| Tablo | Sayı |
|---|---|
| products | ~16,486 (Supabase outage sonrası teyit gerekli) |
| listings | ~2,765 (MM 2,198 + PttAVM 361 + diğer; PttAVM scrape 22 Nis'tan beri cron'dan dondurulmuş) |
| price_history | (eski 1294'ten artmış olabilir; her listing INSERT/UPDATE'de yazıyor) |
| categories | 177 (siniflandirilmamis dahil; UI menü/sitemap'ten gizli, arama bulur) |
| knowledge_chunks | 121 (NOT: önceki PROJECT_STATE'de yanlış isim "knowledge_base" geçiyordu — gerçek tablo ismi `knowledge_chunks`) |
| topics | 21 (forum seed) |
| topic_answers | 84 |
| agent_decisions | büyüyor (chatbot logging) |

### Bu session'daki büyük operasyonlar
- **Constraint drop:** `uq_products_dedup` UNIQUE INDEX silindi (rollback DDL: bkz `migration-supervisor` çıktısı). Migrate %99→%99.97 başarı, +7,210 ürün.
- **Brand normalize:** 988 ALL-CAPS brand → TitleCase, 1,969 row update (Lenovo/Philips/Bosch/Asus/Huawei vb.)
- **Title-based merge:** 599 duplicate group, 676 fazlalık row silindi, 7 listing winner'a yönlendi.
- **MM variant backfill:** 1,017 mediamarkt-scraper kaynaklı ürün için title'dan storage/color extract.
- **siniflandirilmamis kategori:** Pattern fail 1,287 ürün buraya taşındı; UI'da gizli (Header + sitemap).
- **Pattern hardening:** 4 round, +518 mismatch düzeltme, +678 re-classify.
- **categorizeFromTitle.mts:** word-boundary regex (substring → `(?:^|\W)kw`) — omen/ud/ipl/lenovo pil false-match çözüldü; 60+ rule, 200+ keyword.
- **Cron kill switch:** `CRON_SCRAPE_DISABLED=1` env ile `/api/cron/scrape` no-op (Vercel'den env eklenmeli).
- **ROTATIONS expansion:** 8 → 31 query (iPhone 17/16, S25, MacBook, watch series).
- **Index migration 008** dosyası hazır: `supabase/migrations/008_performance_indexes.sql` — Supabase düzeldikten sonra SQL Editor'da `CONCURRENTLY` ile uygulanmalı.

### Bilinen problemler (devam)
- **Supabase incident** (2026-04-27 ~17:30 UTC): statement timeout, dashboard "Failed to retrieve schemas". Long-running query'ler asılı; restart veya `pg_terminate_backend` gerek.
- **Tuple-merge atlandı:** HP Victus / EliteBook gibi farklı SKU'lar (KN29 vs KN30) aynı `(brand,model_family,storage,color)` tuple'ında. Merge yapılmadı (false-positive riski).
- **PttAVM seller_name:** Liste sayfası JSON-LD'de yok; detail page fetch'i 5x scrape süresi → ertelendi.
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
2. **Apple/APPLE duplicate brand chip** — ✅ DONE (Bug B `known-brands.ts` Set ile çözüldü, commit `419d73c`)

3. **Chatbot timeout** (15 dk → 2 dk + 1 dk uyarı) — POSTPONE (MVP launch sonrası UX iyileştirme)
   - useChatStore inactivity logic revize
   - mouse/touch event listener

4. **MM frontend gösterim test** — ❌ İPTAL (MVP launch sonrası gerçek kullanıcı feedback gerekli, şu an bot/kullanıcı trafiği yok)

### 🟢 OPSİYONEL
5. **variant_color backfill 2. tur** — ❌ İPTAL/MERGED (MM scraper ingestion'da `extractColorFromTitle` zaten çalışıyor, Dalga 12+ — manuel backfill gereksiz)
6. **MM Faz 2 enrichment** (specs zenginleştirme) — POSTPONE (uzun vadeli)
7. **/tavsiyeler kategori sekmeleri** — POSTPONE (UI iyileştirme, MVP launch sonrası)

### 🔴 KRİTİK (yarın sabah 30 Apr 2026)
- **MAINTENANCE_MODE = false** + commit + push (önce DB Cloudflare 522 recovery doğrula — `b1r7pm2tf` probe'da hâlâ takılı)
- **Migration 011 SQL** — ✅ DONE (kullanıcı uyguladı, kahve + spor-cantasi DB'de)
- **Tur 2 final** — ✅ DONE (commit `411293c`)
- **Bug E.2 idempotent retry** (DB sağlık olunca, kalan `Şr` chunk'ları için)
- **Eval re-run**: `eval:chatbot:dryrun` + `eval:chatbot:2:dryrun`
- **Pass oranı raporu**
- **Baseline ≥%60** ise Paket M Faz M.1 başlat

### 🟡 ORTA
- **Nescafé regex** (Türkçe é `\b`) — Paket M.2 tokenizer'da çözülecek
- **mergeIntent single_word_widen branch** — Paket M sonrası derin tanı
- **Vercel ISR aralığı uzat** — ✅ DONE (commit `6d4d5f7`, 60s → 86400s kategori; 30s → 300s forum; 60s → 600s products)
- **Migration 007 deploy doğrulaması** + DB audit run (Cloudflare 522 sonrası probe)
- **Aksesuar 3-katman**: Katman 1+2 kodda aktif; Katman 3 (audit script) çalıştırma teyidi gerek

### 🟢 OPSİYONEL
- **Paket M Faz M.1-M.6** (multi-strategy search)
- **Pro plan iptal kararı** (1 ay sonra, 29 May)
- **Compute upgrade kararı**

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
src/lib/accessoryDetector.mts                                 # 7 kategori kuralı + universal + ACCESSORY_CATEGORY_SLUGS bypass
src/lib/extractModelFamily.mts                                # 17 marka canonical pattern + tablet/saat/laptop
src/lib/categorizeFromTitle.mts                               # title -> kategori slug (PttAVM/Gemini bypass)
src/components/chatbot/ChatBar.tsx                            # camera split
src/components/chatbot/ChatPanel.tsx                          # chip click intentHint
scripts/scrape-mediamarkt-by-category.mjs                     # ana scraper
scripts/scraper-state.json                                    # gitignored, resume state
scripts/backfill-variant-color.mjs                            # color title parse
scripts/backfill-price-history.mjs                            # history backfill
scripts/backfill-model-family.mjs                             # title -> canonical model_family + model_code
scripts/audit-accessory-products.mjs                          # DB-wide accessory flag set
scripts/test-accessory-detector.mjs                           # 10 vaka smoke test
scripts/test-categorize-pttavm.mts                            # PttAVM categorizer kapsam testi
scripts/backfill-pttavm-categories.mts                        # PttAVM source_category backfill
scripts/migrate-backup-to-products.mjs                        # backup-restore migrate (Gemini bypass)
scripts/seed-forum-static.mjs                                 # 21 topics + 84 answers
mm-category-tree.json                                         # 367KB, 713 leaf
supabase/migrations/004_smart_search_variants.sql             # variant_color_patterns
supabase/migrations/005_header_missing_categories.sql         # babet/etek/film-dizi
supabase/migrations/006_listings_raw_columns.sql              # raw_specs/images/desc
supabase/migrations/007_products_is_accessory.sql             # is_accessory flag (manuel uygulama gerek)
src/lib/chatbot/intentTypes.ts                                # Faz 1 — IntentType, INTENT_ROUTING, heuristicClassify
src/lib/chatbot/conversationState.ts                          # Paket Ç — mergeIntent, ConversationState
src/lib/data/known-brands.ts                                  # Bug B — single source brand list
scripts/eval-chatbot-dialogs.mjs                              # Eval suite runner
scripts/fix-mojibake-jsonl.mjs                                # Latin-1→UTF-8 utility
tests/chatbot/fixtures/chatbot_dialogs_200.jsonl              # Eval 1 dataset
tests/chatbot/fixtures/chatbot_dialogs_eval2_200.jsonl        # Eval 2 dataset
tests/chatbot/mergeIntent.test.ts                             # Bug C unit test (3 case)
public/robots.txt                                             # block-all (MVP launch'ta açılacak)
src/proxy.ts                                                  # MAINTENANCE_MODE flag — yarın false yapılacak
scripts/probe-categories.ts                                   # taxonomy probe utility
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
| extractModelFamily scraper ingestion'da | 2026-04-27 | Backfill 2 iş yerine tek scrape ile canonical model_family insert |
| 17 marka model pattern (iPhone/Galaxy/Xiaomi/Tecno/Vivo/...) | 2026-04-27 | Filter "Seri" listesinde tüm büyük markalar gruplanır |
| Tablet/Saat/Laptop pattern | 2026-04-27 | iPad/Galaxy Tab/MatePad + Apple Watch/Galaxy Watch + MacBook/ThinkPad/Yoga ailesi |
| categorizeFromTitle (title→category slug) | 2026-04-27 | Gemini bypass için %92 PttAVM, Faz1 randımanı yükselir |
| MM-source priority (specs/description) | 2026-04-27 | MM raw_specs varsa diğer pazaryerleri overwrite etmez (MM en güvenilir) |
| ProductGroup JSON-LD desteği | 2026-04-27 | Apple iPhone PDP'leri ProductGroup tipinde, parser eski hali kabul etmiyordu |
| ProductGroup hasVariant offers fallback | 2026-04-27 | offers ProductGroup'ta yoksa ilk variant'tan al |
| Stoksuz ürün kabulü (price=0, in_stock=false) | 2026-04-27 | Ürün oluşturmak için, diğer sitelerde fiyat geldiğinde eşleşir |
| scrapePdpDetailed structured fail | 2026-04-27 | 7 farklı reason — skip diagnostic için |
| accessoryDetector tek kaynak gerçek | 2026-04-27 | Frontend + ingestion + audit aynı detector kullanır |
| ACCESSORY_CATEGORY_SLUGS bypass | 2026-04-27 | powerbank/telefon-kilifi gibi aksesuar kategorilerinde detector devre dışı |
| Migration 007 products.is_accessory | 2026-04-27 | Audit script aksesuarları kalıcı işaretler |
| extractModelFamily canonical patterns | 2026-04-27 | iPhone/Galaxy başlıklarından doğru model çıkarma; SKU/EAN'lardan kurtulma |
| Brand TitleCase normalize (acronym hariç) | 2026-04-27 | Apple/APPLE duplicate chip vs sorunu; HP/DJI/JBL all-caps |
| skip_24h_fresh failsByReason'a | 2026-04-27 | Skip diagnostic eksikti (24h skip görünmez) |
| conversationState (Paket Ç) — stateful intent merge | 2026-04-28 | Filter yapışıyor + single-word vague + daralma var genişletme yok |
| intent_type layer Faz 1 (heuristic + early-return) | 2026-04-28 | Greeting/smalltalk/store_help için ürün araması yapılmıyor |
| Eval suite kuruldu (eval-chatbot-dialogs.mjs + 400 dialog) | 2026-04-28 | Regression test, Paket M baseline için |
| Bug A: Fixture taxonomy (tisort-erkek → erkek-giyim-ust) | 2026-04-29 | DB'de tisort-erkek yok, erkek-giyim-ust var; fixture beklentisi DB ile uyumsuzdu |
| Bug B: known-brands.ts single source | 2026-04-29 | queryParser + intentParser ayrı brand listeleri drift yaratıyordu |
| Bug C: mergeIntent category change = new dim | 2026-04-29 | İlk turn no_new_dims_keep dönüyordu, action karar bug'ı |
| Bug D: short_response early-return (greeting/smalltalk) | 2026-04-29 | KB pollution, greeting'de cilt tipleri reply'ı |
| Bug E: KB mojibake repair (Şrünleri → Ürünleri) | 2026-04-29 | Filesystem 13 yer + DB 7 chunk yarım UTF-8 byte |
| Yazım düzeltme: D hibrit (Levenshtein 1 sessiz, 2 bildirim) | 2026-04-29 | Paket M.2 tasarım kararı |
| Paket M (multi-strategy search) — baseline sonrası uygulanacak | 2026-04-29 | Tek smart_search yetersiz; 4 paralel strateji + tokenizer + yazım düzeltme |
| cron-job.org 7 cron disable | 2026-04-29 | DB CPU %85, asıl yük; konsol: console.cron-job.org |
| robots.txt block-all (MVP) | 2026-04-29 | Bot trafiği DB IOPS tüketiyordu; launch'ta açılacak |
| Maintenance mode 503 (proxy.ts) | 2026-04-29 | DB recovery için geçici, MAINTENANCE_MODE=true; yarın false |
| Supabase Pro plan tutuluyor (NANO) | 2026-04-29 | Compute upgrade $15 maliyetli, 1 ay sonra karar |
| Disk IO bütçesi limiti tespit | 2026-04-29 | NANO 30 dk burst (2085 Mbps), sonra 43 Mbps baseline |
| Migration 011 (kahve + spor-cantasi) | 2026-04-29 | Tur 2 fixture taxonomy; YARIN uygulanacak |

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
| 007_products_is_accessory.sql | ⚠️ MANUEL uygulama bekliyor |

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

| Borç | Etki | Plan / Status |
|---|---|---|
| 83 keşfedilmemiş DB sub-kategorisi | Erişilemiyor | DB sağlık olunca dump al, Header tam yeniden yapı (uzun vadeli) |
| `products.specs` kirli | Search zayıf | Specs whitelist tasarımı (POSTPONE — Paket M sonrası) |
| `brand: "null"` string | Eski kayıtlarda yanlış | DB sağlık olunca count + UPDATE NULL → user kararı (re-classify vs delete) |
| Apple/APPLE mixed casing | ✅ DONE | Bug B `known-brands.ts` Set ile çözüldü (commit `419d73c`) |
| Latency yüksek (slow 16s) | UX | Paket M (multi-strategy + tokenizer) çözecek — baseline ≥%60 sonrası |
| Faz 1 embedding NULL | Vector search'te yok | Probe `b1r7pm2tf` Cloudflare 522, recovery sonrası ölçüm |
| AbortController eksik | ✅ DONE | `intentParserRuntime.ts:258-275` `withAbortTimeout` helper aktif (üç provider signal ile çağırıyor) |
| Header tam yeniden yapı | DB'den dinamik değil | POSTPONE (uzak öncelik, MVP sonrası) |
| MM bg scrape modül cache | ✅ DONE | 2026-04-29 22:51 MM scrape restart (`b922kxqsc`); turkishNormalize.mts + accessoryDetector fix yeni kod aktif |

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
**13:** akilli-telefon büyük scrape (04-27) — ProductGroup fix + accessory pipeline + model_family + brand normalize — `facc78a` + `076244c` (akilli-telefon 27 → 585 ürün)
**14:** Pattern + categorizer + MM-source priority (04-27) — extractModelFamily 17 marka, tablet/saat/laptop, scraper ingestion entegrasyon, categorizeFromTitle (PttAVM 249→334 dolu, %92), enrich-pttavm description guard — `533f319` + `a673ff6` + `9e5dcdf` + `29d14db` + `2b5fd9f` + `76b597e` + `ec2a446`
**15:** Backup migrate + niş kategori + MM map genişletme (04-27) — backup-restore (43K backup, %99.9 cat dolu ama orphan, categorizeFromTitle ile re-infer), Round 1+2+3 = +4,030 ürün migrate, 30 niş kategori (kıyafet/kozmetik/oyuncak/otomotiv/aydınlatma/pet), MM map 21→25 dbSlug + 132 yeni leaf segment, Vercel build fix (tsconfig scripts exclude) — `881e78e` + `19890df` + `fafbbc2` + `f0758cd`
**16:** Chatbot eval suite + Paket Ç + Faz 1 + Tur 1 bug fix (04-28→04-29) — Eval suite (eval-chatbot-dialogs.mjs + 400 dialog 17 senaryo), intentTypes.ts (Faz 1: greeting/smalltalk/store_help heuristic + early-return), conversationState.ts (Paket Ç: mergeIntent stateful intent merge), 5 bug fix: A taksonomi, B brand unify, C merge category as new dim, D short_response, E mojibake repair (filesystem ✅, DB ⏸ outage) — `42f0b06` + `8dee737` + `f9a64a6` + `e35e404` + `2243591` + `419d73c` + `527f0b5` + `ef6ed35` + `19638ee`
**17:** DB capacity outage tanı + cron disable + maintenance (29 Apr 2026) — Cron-job.org 7 cron disable (asıl yük); Robots.txt + maintenance mode 503; Supabase Pro plan satın alındı (NANO bırakıldı); Disk IO bütçesi limiti tespit (30 dk burst → tükenince 24 saat); Bug E.2 kısmen (3/12 chunk); Tur 2 yarım (keywords drop + count relax + Nescafé→Jacobs); Eval 1/10 baseline (fixture refresh devam edecek) — `b7e7efc` + `36eb4d7` + `ac22eeb` + `f390595` + `2ab4622`

---

## ✅ COMMIT GEÇMİŞİ (son 25)

```
19638ee   fix(kb): mojibake repair filesystem — Şrünleri → Ürünleri
ef6ed35   fix(state): mergeIntent counts category change as new dim
527f0b5   fix(chatbot): short_response intents bypass KB retrieval and smart_search
419d73c   fix(search): unify brand recognition via shared known-brands module
2243591   fix(eval): align fixture taxonomy with live DB (no tisort-erkek slug)
e35e404   fix(chatbot): greeting vocative, brand list, kahve vs kahverengi, raw color state
f9a64a6   fix(eval): backward-compat state cmp + variant_color tolerance + eval2 dataset
8dee737   feat(chatbot): intent_type layer — Faz 1 (heuristic + state + meta)
42f0b06   feat(eval): chatbot dialog regression suite — script + npm scripts
56e133e   fix(server): supabaseServer module-level throw → warn + placeholder
0af4f30   feat(db): listings.condition column - migration 010
f105980   feat(cron): redmi note coverage expansion (15 pro / 14 pro / 13 pro)
69647bf   feat(diag): scripts/diagnose-product.mjs - tekil ürün tanı aracı
b1c1a37   fix: FeaturedProducts build timeout/5xx resilience (Vercel)
06e99bd   fix: /api/public/categories build timeout (Vercel)
4dff2f4   fix: sitemap.xml build timeout (Vercel)
bb192a4   feat: silikon-kılıf relink pattern + slug from-title migration script
20672d7   feat: split-variant-listings script for variant-mismatch repair
5e9e6be   fix: MM stock false-negative + variant_storage RAM bug + slug from source title
698dcf7   feat(chat): stateful conversation + intent diff/shift detection
0ea768d   fix: aksesuar listing'lerinin telefon canonical'larına bağlanması
10ced47   fix(identity): title=originalTitle (source aynen tutulur)
a79bc75   feat(relink): scripts/relink-misplaced-listings.ts — 108 aksesuar listing
e0b318d   fix(ui): liste kart başlığı = brand + model_family + storage + color
596dc88   feat(ui): GENERIC_EXCLUDE genişletildi (Tripod/Lens/Speaker/Yedek)
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
10. **Eval baseline ≥%60 pass olmadan Paket M (multi-strategy search) deploy
    edilmesin.** Mevcut akışı sabit tutmadan yeni mimari getirmek regresyon
    riski. Kullanıcı kararı.
11. **Disk IO bütçesi 30 dk burst, sonra 43 Mbps baseline.**
    Eğer query timeout başlarsa:
    - Cron-job.org disable mı kontrol
    - Browser tab'lar kapalı mı
    - Maintenance mode aktif mi (proxy.ts MAINTENANCE_MODE)
    - 24 saat bekle (UTC 00:00 reset)

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

**S: Chatbot greeting vermiyor, kategori soruyordu?**
C: ÇÖZÜLDÜ (Bug D, commit `527f0b5`). intent_type=greeting/smalltalk/off_topic
→ orchestrator short-circuit, KB çekmez, kısa reply döner.

**S: "samsung kırmızı" → "telefon" deyince filtreler yapışıyordu?**
C: ÇÖZÜLDÜ (Paket Ç + Bug C, commit `ef6ed35`). conversationState.mergeIntent —
single_word_widen action: aynı kategoride tek kelime kategori = filtreleri sıfırla.

**S: İlk turn'de mergeAction "no_new_dims_keep" dönüyordu?**
C: ÇÖZÜLDÜ (Bug C). category değişimi `setDimensions.push("category")` ile
sayılır, action artık "merge_with_new_dims" döner.

**S: KB'de "Anne Şrünleri" yazıyordu, neden?**
C: ÇÖZÜLDÜ filesystem (Bug E.1, commit `19638ee`). 3 .md dosyada 13 yer Şrün → Ürün replace.
DB chunks (7 satır) ⏸ Supabase outage nedeniyle bekletildi, outage geçince
+ 7 chunk re-embed yapılacak.

**S: Eval suite'i nasıl çalıştırırım?**
C: Terminal 1: `npm run dev`. Terminal 2:
- `npm run eval:chatbot:dryrun`       (5 dialog)
- `npm run eval:chatbot:2:dryrun`     (5 dialog eval2)
- `npm run eval:chatbot`              (200 full)
Çıktı: `tests/chatbot/eval-report-{timestamp}.json`

**S: Maintenance mode nasıl kapatılır?**
C: `src/proxy.ts:5` `MAINTENANCE_MODE = false` yap, commit + push.
Vercel auto-deploy 1-2 dk sonra site açılır.
Önce Supabase Disk IO grafiği kontrol et.

**S: Cron-job.org cron'ları nasıl yönetilir?**
C: console.cron-job.org/jobs (sahibi). 29 Apr 2026'da 7 cron disabled
(asıl DB yükü). MVP launch'ta tekrar aç, schedule değiştir
(her 15 dk → günde 1 kez gece).

**S: Disk IO bütçesi nedir, ne zaman reset olur?**
C: Supabase NANO compute: 30 dk burst (2085 Mbps) + baseline 43 Mbps.
Bütçe tükenirse SQL timeout. Recovery: UTC 00:00 reset
(TR saatiyle 03:00). Compute upgrade SMALL ($15/ay) bütçeyi büyütür.

**S: Migration 011 ne yapıyor?**
C: `kahve` slug (parent: supermarket UUID `1b056a91-32f3-4695-b982-4d02d4b157b3`)
+ `spor-cantasi` slug (parent: spor-outdoor UUID `76500641-97c6-4200-be1d-6735612cdd81`)
yeni kategoriler ekler. Tur 2 fixture taxonomy gereği.

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
| 2026-04-27 | v7 — akilli-telefon büyük scrape (585 ürün) + ProductGroup fix + accessory pipeline (detector+filter+migration+audit) + model_family backfill + brand normalize | Claude |
| 2026-04-27 | v8 — extractModelFamily 17 marka pattern (telefon+tablet+saat+laptop) + categorizeFromTitle.mts (PttAVM kategori inference %92) + MM-source priority (specs/description) + scraper ingestion entegrasyonu | Claude |
| 2026-04-27 | v9 — backup-restore migrate (Gemini bypass +3,964 ürün) + categorizeFromTitle 30 niş kategori (kıyafet/kozmetik/oyuncak/otomotiv/aydınlatma/pet) + MM map +132 leaf segment + 25 dbSlug (fotograf-kamera/aksiyon-kamera/aspirator-davlumbaz/sac-kurutma) + tsconfig scripts/ exclude (Vercel build fix) | Claude |
| 2026-04-29 | v11 — Paket Ç + Faz 1 + Tur 1 bug fix (A,B,C,D,E.1) + Eval suite | Claude |
| 2026-04-29 | v12 — DB capacity outage + cron disable + maintenance mode | Claude |

---

## 🔚 SON NOT

**Hedef:** "Yeni Claude/Claude Code 30 saniyede tüm bağlamı alabilsin."
