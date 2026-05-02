# birtavsiye.net — Project State v14

> **Bu dosya tek kaynak gerçek.** Yeni sohbet/oturum başlattığınızda
> bu dosyayı Claude veya Claude Code'a verin — tüm bağlamı 30 saniyede alır.

**Son güncelleme:** 2026-05-02 v14 (Phase 5 frontend refactor done: 5A→5F hierarchik slug full-path routing + sitemap RLS fix + turkishNormalize chatbot entegrasyon + Header NAV 73→0 broken)

---

## 🟢 GÜNCEL DURUM (2 May 2026 — Phase 5 done, v14 paket)

**YAPILAN İŞLER:**

**Phase 5 — Kategori URL routing refactor (5A → 5F, 8 commit):**
- **5A** — `[...segments]/page.tsx` hierarchik full-path lookup (categories.slug = `<root>/<sub>/<leaf>`).
  `/kategori/[slug]/` klasörü tamamen silindi (eski URL'ler 404, redirect yok).
  `categorySlugMap.ts` ("68 kırık fix") silindi — leaf-suffix match runtime helper'a devredildi.
- **5B** — URL üretimi 9 dosyada `/kategori/` → `/anasayfa/`
  (Header NAV, Categories chip, HomeBanner, QuickLinks, ModelPageView,
   ProductDetailShell, urun/[slug]/page.tsx, karsilastir, not-found, sitemap).
- **5C** — chatbot `validateOrFuzzyMatchSlug` leaf-suffix match (full path resolver).
  LLM/queryParser leaf-only döndüğünde (`akilli-telefon`) DB hierarchik path'e
  (`elektronik/telefon/akilli-telefon`) çevirir. Tek match → kullan; çoklu → fuzzy'ye bırak.
- **5D** — `sitemap.ts` anon client → supabaseAdmin (Migration 016 yan etkisi:
  anon REVOKE sonrası SSR sitemap 0 row dönüyordu → 1225 URL geri geldi).
- **5D-3.1** — `turkishNormalize` categoryValidation helper'a entegre.
  Cache'e `normalizedIndex Map<normalized, original>` eklendi; 4 match
  katmanı (exact, leaf-suffix, token-set, fuzzy) normalize üzerinden.
  Sonuç: "kılıf"→`elektronik/telefon/kilif`, "şarj-kablo"→`elektronik/telefon/sarj-kablo`,
  "buzdolabı"→`beyaz-esya/buzdolabi`, "küçük-ev-aletleri"→`kucuk-ev-aletleri`.
- **5D-3.2** — Header `hierUrl` 5C helper entegrasyonu.
  `findCanonicalSlugSync` (exact + leaf-suffix + token-set, fuzzy YOK)
  sync helper export. Header `catMap.get` miss → helper fallback →
  hâlâ yoksa per-session `console.warn`. cats map zaten state'te
  olduğu için sync (DB hit yok, race condition yok).
- **5D-3.3** — NAV constant DB sync (74 slug, 131 replacement).
  73 broken → **0 broken** (159 unique → 145, 14 dup converge).
  Mapping kategorileri:
  * A) Direct rename (50): `cilt-bakimi`→`kozmetik/cilt-bakim`, `oyun-konsol`→`elektronik/oyun/konsol`
  * B) Parent fallback (21): `erkek-pantolon`→`moda/erkek-giyim`, `bebek-kozmetik`→`anne-bebek/bebek-bakim`
  * C) Helper rescued (1): `puset-araba`→`anne-bebek/bebek-tasima/araba-puset`
  * D) Geçici parent borç (1, P6.2): `networking`→`elektronik`
  * E) Ambiguous resolved (1): `temizlik`→`ev-yasam/temizlik`
- **5E** — production smoke test 7/7 PASS (Test 6 mantıksal garantili).

**Production verification (7-test paketi):**
| # | URL | Sonuç |
|---|---|---|
| 1 | `/anasayfa/elektronik/telefon/akilli-telefon` | 200 + 208 ürün ref ✓ |
| 2 | `/anasayfa` | 307 → / ✓ |
| 3 | `/kategori/akilli-telefon` (eski) | 404 ✓ |
| 4 | `/sitemap.xml` | 1225 URL, 200 hierarchik kategori path ✓ |
| 5 | 5 random NAV kategori | 5/5 = 200 (TTFB 0.8-1.5s) ✓ |
| 6 | Console NAV warning | 0 (mantıksal: 145/145 exact match) |
| 7 | Ürün detay breadcrumb | `/anasayfa/kozmetik/makyaj` 200 ✓ |

**Bonus — Sitemap RLS fix (kritik bug):**
- Migration 016 anon REVOKE 30 tabloda yapıldıktan sonra `sitemap.ts`
  hâlâ anon Supabase client kullanıyordu → SSR'da 0 satır → boş sitemap
- supabaseAdmin'e geçirildi (`fde6afc`) → 1225 URL geri geldi
- Aynı pattern P6.4 audit'te diğer SSR sayfalarda kontrol edilecek

**Yeni Routing Standartı (v14 itibariyle):**
- Canonical URL: `/anasayfa/<root>/<sub>/<leaf>` (örn. `/anasayfa/elektronik/telefon/akilli-telefon`)
- `categories.slug` DB'de full hierarchik path (`elektronik/telefon/akilli-telefon`)
- Eski flat `/kategori/<slug>` URL'ler **404** (redirect yok, kasıtlı karar)
- `/anasayfa` tek başına → **307 → /** redirect
- Header NAV constant 145/145 DB ile **exact match sync**
- `categorySlugMap.ts` ("68 kırık fix") **SİLİNDİ** — leaf-suffix runtime helper'la çözülüyor
- Chatbot/queryParser leaf-only slug çıktıları otomatik full path'e dönüşür

**Phase 5 commit'leri:**
- `92f4852` redesign(routing): Phase 5A — hierarchik slug full-path route
- `ea24e67` redesign(routing): Phase 5B — URL üretimi 9 dosyada
- `21c4efb` feat(chatbot): Phase 5C — category_slug leaf-suffix match
- `fde6afc` fix(sitemap): Phase 5D — anon client → supabaseAdmin
- `939001e` fix(chatbot): 5D-3.1 — turkishNormalize entegre
- `ff52e53` fix(routing): 5D-3.2 — Header linkFor 5C helper
- `4282c55` redesign(routing): 5D-3.3 — NAV constant DB sync (73 → 0 broken)
- `1edbec9` docs(probe): 5D-3 Test 3 — broken slug öneri tablosu generator

**YARIN PLAN (2026-05-03):**

🔴 KRİTİK:
1. **Migration 029 — categories.keywords backfill** (yeni borç).
   Hierarchik keyword index — kategori arama kalitesi için.
2. **Migration 025b** — scraper price_history manuel INSERT'leri kaldır
   + `log_price_change` trigger bağla (5 yer: scrape-mediamarkt,
   scrape-pttavm, src/app/api/sync, +2). Çift kayıt önleme.
3. **Eval2 re-run** — `npx tsx scripts/eval-chatbot-dialogs.mjs --input
   tests/chatbot/fixtures/chatbot_dialogs_eval2_200.jsonl` (LLM quota
   reset sonra, d4/id7/id10 PASS hedefi).

🟡 ORTA — Phase 6 borçları:
- **P6.1 — chatbot context-aware tie-break**: `aksesuar` gibi çoklu match
  (3 path: `elektronik/telefon/aksesuar`, `moda/aksesuar`, `pet-shop/aksesuar`)
  için önceki turn category bağlamından tie-break (parent_id mesafesi).
  Şu an `validateOrFuzzyMatchSlug` çoklu match'te null dönüyor.
- **P6.2 — `networking` kategorisi DB'de eksik**: NAV "Ağ & Modem & Akıllı Ev"
  → şu an `elektronik` parent fallback (geçici). DB'ye yeni leaf eklenmeli
  (`elektronik/networking` veya `elektronik/ag-akilli-ev`) veya NAV'dan kaldırılmalı.
- **P6.3 — NAV constant 14 duplicate converge**: 159→145 unique sonra
  14 NAV item aynı parent'a dönüştü (örn. 4 farklı `erkek-*` → `moda/erkek-giyim`).
  Header UX iyileştirme: ya parent altında gerçek leaf yarat ya NAV item'ları konsolide et.
- **P6.4 — Migration 016 yan etki tarama**: sitemap.ts dışında anon RLS
  sızıntısı kalan SSR sayfa var mı? `[...segments]`, `urun/[slug]`,
  `tavsiyeler`, `urunler` vs. supabaseAdmin geçişi audit gerek.

🟢 OPSIYONEL:
- listings.in_stock BOOLEAN DROP (6 ay sonra, frontend/scraper migrate sonrası)
- raw_offers ingestion (yeni scraper davranışı, Migration 028 staging tablosu kullanım)
- backup_20260430_categories + backup_20260422_products silme kararı

---

## 🔵 ÖNCEKİ DURUM (1 May 2026 gece — Tonight, v13 paket)

**YAPILAN İŞLER (tonight oturumu):**

**Schema enhancement v1 (Migrations 024-028 + 027b):**
- Migration 024 — `adjust_topic_answer_count` RPC `EXECUTE` revoke
  (PUBLIC + anon + authenticated → KAPALI, 42501 permission denied verify)
- Migration 025 — Schema foundation:
  * `pg_trgm` extension
  * `normalize_gtin(text)` IMMUTABLE function (8/12/13/14 → 14 hane GS1 padding)
  * `update_updated_at()` trigger (4 tablo bağlandı: products/categories/listings/stores)
  * `log_price_change()` function — TRIGGER **BAĞLANMADI** (5 scraper manuel
    INSERT; 025b'de bağlanacak — çift kayıt önleme)
  * `categories.level INT` denormalize + recursive backfill + `sync_category_level` trigger
  * `products.category_slug TEXT` denormalize + 2 trigger (sync + cascade)
  * `idx_products_title_trgm` GIN
  * `product_summary` materialized view + 3 index + ilk REFRESH
  * Verify: top 10 kategori dağılımı sağlıklı, mat view ~44K satır
- Migration 026 — stores enhancement:
  * `merchant_type` enum (marketplace | brand_store | retailer)
  * 6 yeni kolon (slug/base_url/type/affiliate_tag/trust_score/is_active)
  * 9 mevcut store backfill: Trendyol/Hepsiburada/Amazon TR/n11/GittiGidiyor/
    PttAVM = marketplace, MediaMarkt/Vatan/Teknosa = retailer
  * Verify: 9/9 doluluk, 0 NULL slug, type 6/3
- Migration 027 — listings stock_status enum:
  * 'in_stock' | 'out_of_stock' | 'limited' | 'unknown'
  * `in_stock` BOOLEAN coexist (kod 14+ yerde okuyor; 6 ay sonra DROP)
  * `sync_stock_status_from_boolean` trigger (in_stock → stock_status sync)
  * Verify: 8830 listing, 8662 in + 168 out, 0 mismatch
- **Migration 027b — BLOCKER fix** (INSERT trigger desteği):
  * 027 trigger sadece `BEFORE UPDATE OF in_stock` idi → INSERT'te
    stock_status='unknown' kalıyordu, frontend ranking bozuluyordu
  * Function `TG_OP='INSERT'` kapsamı + trigger `BEFORE INSERT OR UPDATE OF in_stock`
  * Smoke test: TRUE→'in_stock', FALSE→'out_of_stock' OK
- Migration 028 — raw_offers staging table:
  * `matching_status` enum (pending/matched/unmatched/review/rejected)
  * 19 kolon (raw scraped + matching audit + temporal)
  * 4 index, updated_at trigger, REVOKE ALL PUBLIC/anon/authenticated
  * Boş tablo — mevcut scraper'a dokunmaz, 025b sonrası opsiyonel kullanım

**Turn-type detection + eval2 specialized actions:**
- `MergeAction` type union (15 literal — 6 intent_type + 5 transition + 4 filter)
- `ConversationState` +2 field: `min_avg_rating`, `sort_by`
- `RawIntent` +2 opsiyonel field
- `mergeIntent` specialized labels (setDimensions.length===1):
  * `installment_filter_added` (eval2 d4 turn 8 fix)
  * `rating_filter_added` (id=7 fix)
  * `best_value_sort_applied` (id=10 fix)
- `route.ts` 2 yeni regex extractor (rating + sort)
- **`turnClassifier.ts` (yeni 72 satır)** — 7 TurnType: open/refine/broaden/
  switch_category/sort_only/clarify/ack. Pure function, LLM yok.
- agent_decisions log'a `turn_type` + `merge_action` eklendi

**Phase 5 frontend smoke test (TANI — refactor henüz yapılmadı):**
- TEST 1 `/kategori/elektronik/telefon/akilli-telefon` → 🔴 KIRIK
  ("Model bulunamadı" — `[...segments]` route slash'lı slug çözemiyor;
   "kategori" segment brandSlug yorumlanıyor)
- TEST 2 `/kategori/akilli-telefon` (eski flat) → 🟢 Temiz "Kategori bulunamadı"
- TEST 3 Header arama → 🟢 OK
- TEST 4 Chatbot "iphone 15 pro max" → 🟢 İYİ (3 doğru + 1 aksesuar minor)
- TEST 5 Brand chip / "samsung göster" → 🟢 OK

**KRİTİK BULGU:** `categories.slug` artık full hierarchik path
(`elektronik/telefon/akilli-telefon`). Mevcut frontend route'ları
(`[slug]` single-segment + `[...segments]` segment-by-segment lookup) bu
formatı çözemiyor. Phase 5 frontend refactor ZORUNLU.

**Davranış kuralları:**
- Madde 16 (NAMING): yeni kod/dosya/commit message/comment'lerde "akakce" /
  "cimri" YASAK. Generic terim kullan ("spec scraper", "external spec
  source", "Turkish price aggregator", "rakip analizi"). Yeni
  enrichment_source: "external_spec_source". Eski legacy referanslara
  DOKUNULMAZ. Sadece yeni commit'ler için kural.

**Commit'ler (tonight 4 push):**
- `2ecb45b` fix(security): Migration 024 RPC EXECUTE revoke
- `19fb979` feat(schema): Migrations 025-028 schema foundation
- `896ef96` fix(schema): Migration 027b BLOCKER (INSERT trigger)
- `6b2dd05` docs(state): kural 16
- `075a62d` feat(chatbot): turn-type detection + eval2 specialized actions

**YARIN PLAN (2026-05-02):**

🔴 KRİTİK (sabah ilk):
1. **Phase 5 frontend refactor (3h)** — kategori v2 hierarchik slug → route uyumu:
   * `src/app/kategori/[slug]/page.tsx` → `[...slug]/page.tsx` (multi-segment)
   * `src/app/[...segments]/page.tsx` `resolveSegments()` — full-path lookup
   * `src/lib/categoryAliases.ts` — eski flat slug → yeni hierarchik 301 redirect
   * `<Link href="/kategori/...">` URL builder helper
   * 5 smoke test re-run (Test 1 PASS olmalı)
2. **Eval2 re-run** — `npx tsx scripts/eval-chatbot-dialogs.mjs --input
   tests/chatbot/fixtures/chatbot_dialogs_eval2_200.jsonl` (LLM quota +
   dev server hazır olunca). Hedef: d4/id7/id10 PASS.

🟡 ORTA:
- Migration 025b (scraper price_history manuel INSERT'leri kaldır + log_price_change
  trigger bağla — 5 yer: scrape-mediamarkt, scrape-pttavm, src/app/api/sync, 2 ek)
- Aksesuar sızıntı fix (TEST 4 minor — chatbot kalite)

🟢 OPSIYONEL:
- listings.in_stock BOOLEAN DROP (6 ay sonra, frontend/scraper migrate sonrası)
- raw_offers ingestion (yeni scraper davranışı)
- eski migration 015/019 backup tablo silme kararı

---

## 🔵 ÖNCEKİ DURUM (29 Apr 2026 gece, ~02:00)

**YAPILAN MEGA İŞLER (16+ saat oturum):**

**Sabah/Öğlen — DB Capacity:**
- 7 cron-job.org cron disable (DB CPU %85)
- Robots.txt block-all
- MAINTENANCE_MODE = true
- Supabase Pro plan ($25/ay, NANO compute)
- DB optimize: 3 partial index + ANALYZE + slug text_pattern_ops (50x query hız)
- ISR revalidate 60s → 86400s

**Öğleden sonra — Eval %80:**
- Migration 011 (kahve + spor-cantasi)
- Migration 012 (blender + firin + robot-supurge)
- mergeIntent state extraction fix
- 906 sınıflandırılmamış re-classify (mapping-based)
- 16 multi-category investigation
- 3 TANI: M1 NO-APPLY, H16 deprecated, H19 next-auth v5
- Migration 013 smart_search 4-kanal hybrid
- Migration 014 brand LOWER caseless
- Orchestrator zero-vector fallback
- LLM intent enrich price hallüsünasyon reddi
- parseQuery range pattern

**Akşam — KRİTİK GÜVENLİK KRİZİ:**
- public_profiles SECURITY DEFINER tespit
- 30 public tabloda anon'a INSERT/UPDATE/DELETE/TRUNCATE açık
- profiles tablo REVOKE (acil)
- Migration 016: pg_tables üzerinden toplu REVOKE
- public_profiles view ayrıca REVOKE (view'lar pg_tables'da değil)
- Migration 015: public_profiles SECURITY INVOKER recreate (apply OK)
- Tüm tablolar artık anon SELECT only

**Gece — GTIN + KATEGORİ REFACTOR v2:**
- Migration 020: products.gtin kolonu (arka planda commit'li, GTIN feature)
- Migration 021: 14 root + 113 leaf + 88 mid-level (hierarchik slug)
- Migration 022: ~44K ürün eski → yeni kategoriye taşındı (mapping-based, aktif+pasif)
- Migration 023: Eski 177 flat kategori DROP (FK temiz)
- Backup: backup_20260430_categories + backup_20260430_products_categories
- GTIN feature etkilenmedi

**EVAL DURUMU:**
- Önce: 1/10 (~%10)
- Sonra: Eval1 4/5 (%80) ✓ deterministik
        Eval2 2-3/5 dalgalı (LLM quota tükenmesi)
- Toplam: 6/10 deterministic + eval2 yarın quota reset sonra doğrulanacak

**GÜVENLİK STATUSü:**
- ✅ 30 public tablo: anon SELECT only (RLS ile kontrol)
- ✅ public_profiles view: SECURITY INVOKER + sadece SELECT
- ✅ profiles tablo: anon yetkisi sıfır
- ✅ supabaseAdmin (service_role): tüm yetki ✓

**KATEGORİ AĞACI (yeni hierarchik):**
- 14 root: elektronik, beyaz-esya, kucuk-ev-aletleri, moda, kozmetik, ev-yasam, anne-bebek, spor-outdoor, saglik-vitamin, otomotiv, supermarket, yapi-market, hobi-eglence, pet-shop
- + siniflandirilmamis (15. root, 2 ürün hala içinde)
- 113 leaf kategori
- 88 mid-level (sub-grup, alt-grup chain)
- Hierarchik slug: `<root>/<sub>/<leaf>`
- Kararlar:
  * Spor Ayakkabı: SADECE Moda altı (Spor & Outdoor altında YOK)
  * Fırın & Ocak: TEK (Fırın+Ocak ayrı kaldırıldı)
  * Sağlık & Vitamin: YENİ root (Spor Besin Takviyesi taşındı)
  * Pet Shop: ROOT kalır (gelecek için)
  * Kozmetik: TEK root (Cilt+Makyaj+Saç+Kişisel+Parfüm sub)

**DB DURUMU:**
- 216 kategori (15 root + 113 leaf + 88 mid)
- 44,519 ürün (44,452 yeni hierarchik kategoride + 67 sınıflandırılmamış)
- GTIN: 0 ürün (henüz backfill yok)
- Embedding: 277/1000 dolmuş (Gemini quota tükendi)

**BACKUP TABLOLARI:**
- backup_20260422_* (Faz 1 backup, 43K)
- backup_20260430_categories (eski 189 kategori, gerekirse restore)
- backup_20260430_products_categories (eski category_id snapshot)

**YARIN PLAN (30 Apr 2026):**

🔴 KRİTİK (sabah ilk iş):
1. Disk IO recovery doğrula (TR 03:00 sonra)
2. Eval re-run (LLM quota reset sonra) — eval2 deterministic ölçüm
3. **FRONTEND REFACTOR (Phase 5):**
   - `src/lib/categorizeFromTitle.ts` (200+ keyword → yeni hierarchik slug)
   - `src/lib/scrapers/scrapeClassifier.ts` (SOURCE_CATEGORY_MAP yeni slug)
   - `src/app/kategori/[slug]/page.tsx` → `[...segments]/page.tsx` (route refactor)
   - `Header.tsx` kategori menüsü (hardcoded link'ler)
   - Chatbot intent parser (categorySlug yeni slug)
   - Sitemap regen
4. Frontend deploy + smoke test
5. MAINTENANCE_MODE = false (frontend güncel slug'larla deploy edilince)

🟡 ORTA:
- Migration 019 backup silme KARAR (Faz 1 hala kaynak veri kullanıyor mu?)
- Search bug (iphone 15 plus → kılıf) — yeni hierarchik slug ile re-test
- Mobile UX 375px test
- Embedding backfill manuel günlük 1500 (~12 gün)
- Kahve catalog seed (scrape rotation)

🟢 OPSIYONEL (MVP sonrası):
- H16 Google AI dedup (deprecated, 3-4 saat)
- H19 next-auth v5 migration (3 saat)
- M1 specs whitelist: APPLY ASLA (karar)
- Pro plan iptal (29 May)
- LLM cache veya paid tier
- Sunucu/hosting değerlendirme (3-6 ay sonra trafik ile)

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
src/lib/chatbot/categoryValidation.ts                         # kategori slug validation
src/lib/chatbot/source-category-mapping.mjs                   # source mapping (chatbot)
scripts/reclassify-unclassified.mjs                           # mapping-based re-classify (LLM yok)
scripts/fix-profiles-rls.sql                                  # ⚠️ DEPRECATED (Migration 015/016 kullan)
scripts/category-migration-mapping.mjs                        # Eski → yeni hierarchik slug
scripts/migrate-products-to-new-categories.mjs                # 44K ürün UPDATE (aktif+pasif)
supabase/migrations/013_smart_search_text_fallback.sql        # 4-kanal hybrid (embedding NULL workaround)
supabase/migrations/014_smart_search_brand_caseless.sql       # brand LOWER caseless
supabase/migrations/015_public_profiles_security_invoker.sql  # SECURITY DEFINER → INVOKER
supabase/migrations/016_revoke_anon_dangerous_privileges.sql  # 30 tablo toplu REVOKE
supabase/migrations/020_products_gtin.sql                     # GTIN feature kolon + UNIQUE index
supabase/migrations/021_category_hierarchy_v2.sql             # 14 root + 113 leaf + 88 mid
supabase/migrations/023_drop_old_flat_categories.sql          # 177 eski flat DROP
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
| M1 specs whitelist APPLY ASLA | 2026-04-29 | Cosmetic, geri dönüşsüz, MVP launch sonrası bile yapılmayacak |
| Maintenance mode 503 + robots.txt block-all | 2026-04-29 | DB capacity outage |
| Supabase Pro plan ($25/ay, NANO compute) | 2026-04-29 | 1 ay tutulacak, 29 May iptal kararı |
| DB optimize 3 partial index + ANALYZE | 2026-04-29 | products query 65ms → 1-3ms (50x hız) |
| ISR revalidate 60s → 86400s | 2026-04-29 | Bot crawl 1400x azaltma |
| Migration 011 + 012 (5 yeni kategori) | 2026-04-29 | kahve, spor-cantasi, blender, firin, robot-supurge |
| 906 re-classify mapping-based (LLM yok) | 2026-04-29 | source_category mevcut, Gemini gereksiz |
| Migration 013 smart_search 4-kanal hybrid | 2026-04-29 | %98 embedding NULL workaround |
| Migration 014 brand LOWER caseless | 2026-04-29 | 'LCW' vs 'Lcw' bug |
| Orchestrator zero-vector fallback | 2026-04-29 | Gemini embed quota tükenmesi |
| Migration 015 public_profiles SECURITY INVOKER | 2026-04-29 | SECURITY DEFINER + RLS bypass riski |
| Migration 016 anon REVOKE 30 tablo | 2026-04-29 | KRİTİK güvenlik fix (anon yetki açığı) |
| Migration 020 GTIN kolonu | 2026-04-29 | Ürün GTIN identifier feature (arka planda) |
| Migration 021/022/023 KATEGORİ REFACTOR v2 | 2026-04-29 | 21 root → 14 hierarchik, 44K ürün taşındı |
| Hierarchik slug: <root>/<sub>/<leaf> | 2026-04-29 | Eski flat slug yerine, mimari temel atma |
| Spor Ayakkabı sadece Moda altı (tek yer) | 2026-04-29 | Duplicate kategori önleme |
| Sağlık & Vitamin yeni root | 2026-04-29 | Spor Besin (root) → buraya taşındı, gelecek için |

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
| 008_performance_indexes.sql | ✅ |
| 009_listings_warranty.sql | ✅ |
| 010_listings_condition.sql | ✅ |
| 013_smart_search_text_fallback.sql | ✅ |
| 014_smart_search_brand_caseless.sql | ✅ |
| 016_revoke_anon_dangerous_privileges.sql | ✅ (anon REVOKE 30 tablo) |
| 017_revoke_anon_from_public_profiles_view.sql | ✅ |
| 018_rls_hardening_and_internal_select_revoke.sql | ✅ |
| 020_products_gtin.sql | ✅ (GTIN kolon + UNIQUE partial) |
| 021_category_hierarchy_v2.sql + part1/2/3 | ✅ (14 root + 113 leaf + 88 mid) |
| 023_drop_old_flat_categories.sql | ✅ (177 eski flat DROP) |
| 024_revoke_anon_execute_rpc.sql | ✅ (RPC EXECUTE PUBLIC+anon revoke) |
| **025_schema_foundation.sql** | ✅ (pg_trgm + normalize_gtin + triggers + mat view) |
| **026_stores_enhancement.sql** | ✅ (slug/base_url/type + 9 store backfill) |
| **027_listings_stock_status.sql** | ✅ (stock_status enum) |
| **027b_listings_stock_sync_insert_fix.sql** | ✅ (BLOCKER: INSERT trigger) |
| **028_raw_offers_staging.sql** | ✅ (staging tablosu, boş) |

**Bekleyen (ÖNEMLI):**
- Migration **025b** (KRİTİK, 2026-05-03): scraper'lardaki manuel `price_history INSERT`'leri
  kaldır + `log_price_change` trigger bağla (5 yer). Çift kayıt önleme.
- Migration **029** (yeni borç, 2026-05-03): `categories.keywords` backfill —
  hierarchik keyword index, kategori arama kalitesi için.
- Migration **listings.in_stock DROP** (6 ay sonra, frontend/scraper migrate sonrası).

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

| Route | Dosya | Not |
|---|---|---|
| `/` | src/app/page.tsx | |
| `/anasayfa/<root>/<sub>/<leaf>` | src/app/[...segments]/page.tsx | Phase 5A: hierarchik full-path lookup, canonical |
| `/anasayfa` (tek) | (redirect) | 307 → / |
| `/kategori/<slug>` (eski flat) | (silindi) | Phase 5A: 404, redirect yok |
| `/urun/[slug]` | src/app/urun/[slug]/page.tsx | |
| `/sonuclar` | src/app/sonuclar/page.tsx | |

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
| `products.specs` kirli | Cosmetic | ❌ ASLA APPLY (29 Apr karar; dry-run script ref `9fe120c`) |
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
**17:** Mega gün — DB outage + eval %80 + güvenlik krizi + kategori refactor v2 (29 Apr 2026, 16+ saat)
- Sabah: DB capacity outage, 7 cron disable, maintenance mode, Pro plan, DB optimize 50x
- Öğlen: Migration 011/012 (5 kategori), 906 re-classify mapping-based, 3 TANI raporu
- Akşam: Migration 013 smart_search 4-kanal hybrid, Migration 014 brand LOWER, orchestrator zero-vector
- Akşam: KRİTİK güvenlik krizi (30 tablo anon yetki açığı), Migration 015/016 fix
- Gece: Migration 021/022/023 KATEGORİ REFACTOR v2 (44K ürün hierarchik yapıya taşındı)
- Eval: 1/10 → 6/10 + eval1 deterministic %80
- Embedding backfill 277/1000 (quota tükendi)
- Commit'ler: c79aa5e, e2d020f, bcf2126, 15f99c6, 253c368, 779468a + 25+ diğer

---

## ✅ COMMIT GEÇMİŞİ (son 30)

```
1edbec9   docs(probe): 5D-3 Test 3 — broken slug öneri tablosu generator (2 May)
4282c55   redesign(routing): 5D-3.3 — NAV constant DB sync (73 → 0 broken)
ff52e53   fix(routing): 5D-3.2 — Header linkFor 5C helper entegrasyonu
939001e   fix(chatbot): 5D-3.1 — turkishNormalize categoryValidation helper'a entegre
fde6afc   fix(sitemap): Phase 5D — anon client → supabaseAdmin (RLS bypass)
21c4efb   feat(chatbot): Phase 5C — category_slug leaf-suffix match (full path resolver)
ea24e67   redesign(routing): Phase 5B — URL üretimi 9 dosyada /kategori/ → /anasayfa/
92f4852   redesign(routing): Phase 5A — hierarchik slug full-path route
61f23b4   docs(state): v13 — schema enhancement v1 + turn-type detection + Phase 5 tanı
075a62d   feat(chatbot): turn-type detection + eval2 specialized actions (1 May tonight)
6b2dd05   docs(state): kural 16 — yeni kodda akakce/cimri ismi yasağı
896ef96   fix(schema): listings stock_sync trigger INSERT desteği (Migration 027b — BLOCKER)
19fb979   feat(schema): multi-merchant price comparison foundation (025-028)
2ecb45b   fix(security): revoke EXECUTE adjust_topic_answer_count from PUBLIC+anon+authenticated (Migration 024)
4eebf68   docs(state): v12 — mega gün özeti (16+ saat) — 29 Apr
779468a   feat(category): refactor v2 — 14 root hierarchik yapı + 44K ürün taşıma
9ca17e8   feat(canonical): products.gtin kolonu + GTIN-based canonical anchor
9d5b886   feat(classify): inhouse Faz 1 + 8 tur kategori genişleme + brand-based fallback
466a74e   fix(security): RLS hardening + backup tablo silme (Migrations 018+019)
e22f22b   fix(security): anon REVOKE public_profiles view (Migration 017)
253c368   fix(security): anon REVOKE 30 public tabloda (Migration 016)
2733cf5   feat(live-prices): tüm detail page'lerde discover flow aktif
283e76b   fix(live-prices): trendyol + n11 mobile-only UA (Cloudflare 403 fix)
35affeb   feat(live-prices): N11 fetcher + Trendyol searchByTitle (discover flow)
ba707c6   fix(search): drop accessory category products entirely on non-accessory queries
3fed9d8   feat(live-prices): Hepsiburada + Amazon TR fetcher + search-augmentation discover flow
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
11. **Disk IO bütçesi**: NANO 30 dk burst + 24h reset (UTC 00:00).
    Timeout başlarsa: cron disable, maintenance mode, 24h bekle.
12. **products tablosunda 'name' YOK, 'title' var.** Soft-delete `deleted_at`
    değil, `is_active` boolean.
13. **LLM API quota'ları** (Gemini 1500 RPD, NVIDIA daily) eval'i etkileyebilir.
    Eval2 dalgalı sonuç → quota tükenmiş olabilir.
    Backfill quota'yı tüketir → user query embed fail.
14. **GÜVENLİK**: Tüm public tablolarda anon yetkileri SADECE SELECT olmalı.
    INSERT/UPDATE/DELETE/TRUNCATE asla anon'a verilmez.
    Yeni tablo eklerken default GRANT ALL TO PUBLIC otomatik olur — REVOKE şart.
    View'lar `pg_tables`'da değil (`pg_views`), ayrı REVOKE gerek.
15. **KATEGORİ AĞACI hierarchik slug yapı**: `<root>/<sub>/<leaf>`
    Örn: `'elektronik/telefon/akilli-telefon'`, `'moda/erkek-ayakkabi/sneaker'`
    14 root + 113 leaf + 88 mid-level (toplam 216 + siniflandirilmamis).
    Eski flat slug'lar (`akilli-telefon`, `telefon-kilifi` vs) MEVCUT DEĞİL.
    Frontend `categorizeFromTitle.ts` ve `scrapeClassifier.ts` yeni slug kullanır.
    Yeni kategori eklerken: `parent_id` chain ZORUNLU + hierarchik slug ZORUNLU.
    Eski kategoriler `backup_20260430_categories`'te (gerekirse restore).
16. **NAMING**: Yeni kod, dosya, commit message, comment'lerde "akakce" veya
    "cimri" isimleri KULLANMA. Generic terim kullan:
    - "spec scraper", "external spec source"
    - "Turkish price aggregator", "rakip analizi"
    - Yeni `enrichment_source` değeri: `external_spec_source`
    Eski kod/commit/DB değerlerinde kalanlara DOKUNMA (legacy, OK).
    Sadece YENİ commit'ler için kural geçerli.

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
| 2026-04-29 | v12 — Mega gün (16+ saat): Migration 013-023, eval %80, güvenlik krizi, kategori refactor v2 | Claude |
| 2026-05-01 | v13 — Tonight paketi: Migrations 024-028 + 027b BLOCKER, turn-type detection (MergeAction + 7 TurnType + classifyTurn pure func), eval2 specialized actions (installment_filter_added/rating_filter_added/best_value_sort_applied), Phase 5 frontend smoke test (TEST 1 KIRIK — yarın refactor), naming kuralı 16 | Claude |
| 2026-05-02 | v14 — Phase 5 frontend refactor done (5A→5F, 8 commit): hierarchik slug full-path routing + sitemap RLS fix (Migration 016 yan etkisi) + turkishNormalize chatbot entegrasyon + Header NAV 73→0 broken (74 slug DB sync, 159→145 unique) + production smoke test 7/7 PASS. Phase 6 borçları: P6.1 chatbot tie-break, P6.2 networking DB eksik, P6.3 NAV dup converge, P6.4 anon RLS audit | Claude |

---

## 🔚 SON NOT

**Hedef:** "Yeni Claude/Claude Code 30 saniyede tüm bağlamı alabilsin."
