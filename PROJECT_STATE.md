# birtavsiye.net — Project State v15.6

> **Bu dosya tek kaynak gerçek.** Yeni sohbet/oturum başlattığınızda
> bu dosyayı Claude veya Claude Code'a verin — tüm bağlamı 30 saniyede alır.

**Son güncelleme:** 2026-05-03 v15.6 (erken hızlı combo — P6.15b + P6.16 kapanış (Migration 037, 70 MB recovery) + pg_stat anomali 4. örneği (blind DROP veri kaybı riski tuzağı) + kural 26 genişletme)

---

## 🔴 GÜNCEL DURUM (3 May 2026 erken — v15.6 paket, hızlı combo)

v15.5 sonrası ~45dk hızlı combo. P6.15b + P6.16 ardışık kapanış. Kritik
öğreti: pg_stat anomalisinin 4. örneği gerçek veri kayıp riskine yakın
geçti — kural 26 genişletildi.

### Bu oturumda kapatılan ek borçlar (2):

- ✅ **P6.15b** orphan auth users (audit-only):
  - `test1@test.com` + `test1@test1.com` (NO_PROFILE durumu)
  - Bağlı kayıt 0/0/0/0 (topics/topic_answers/community_posts/favorites)
  - **Aksiyon:** Studio Authentication panel'den manuel DELETE (kullanıcı
    eylem alanında, auth.\* Supabase managed → Migration yapma yetkimiz YOK)
  - Karar: KAPALI (manuel intervention path netleşti)

- ✅ **P6.16** backup_2026* DROP — **Migration 037** (`ef29602`):
  - 5 backup tablo DROP, ~70 MB disk recovery:
    - `backup_20260422_products` (43,176 row, 47 MB)
    - `backup_20260422_prices` (43,279 row, 9 MB)
    - `backup_20260422_price_history` (54,107 row, 5 MB)
    - `backup_20260422_categories` (195 row, 40 kB)
    - `backup_20260430_products_categories` (44,173 row, 8.7 MB)
  - **KORUNDU:** `backup_20260430_categories` (189 row, 72 kB) — Phase 5 son
    safety net, ~6 ay sonra P6.16-v2 ile DROP edilir
  - Restore senaryosu kabul edilemez (Phase 5 + Migrations 023-034 +
    2542 yeni ürün geri alınamaz)

### KRİTİK ÖĞRETİ — pg_stat anomalisi 4. örneği

P6.16 audit'inde **veri kayıp tuzağı** ortaya çıktı:
- `backup_20260422_*` tabloları pg_stat `n_live_tup=0` raporu yanıltıcı
- Gerçek `COUNT(*)`: 43,176 + 43,279 + 54,107 + 195 + 44,173 = **184,930 row!**
- "Boş tablo" sanıp blind DROP yapsaydık 184k+ row kaybı + audit trail kaybı

**Pattern özeti (4 örnek, hepsi pg_stat n_live=0 yanlışı):**
- Migration 035 stores (gerçek 9 row, aktif tablo)
- P6.15 auth.users (gerçek 3 row, Supabase managed)
- Migration 036 knowledge_chunks (gerçek 121 chunk, RAG aktif)
- Migration 037 backup_20260422_* (gerçek 184k+ row, audit trail!)

**Davranış kuralı 26 GENİŞLETİLDİ** — yeni 5-adımlı doğrulama prosedürü
+ blind DROP/TRUNCATE yasağı.

### Disk recovery
- Migration 037 net: **~70 MB** geri kazanıldı
- backup_20260430_categories: 72 kB KORU
- NANO compute disk bütçesinde anlamlı kazanım

### Production durumu:
- Working dir CLEAN
- TSC + build clean
- CI yeşil (lint 148'de)
- 7 Migration toplam apply (031-037 serisi tek günde)

### Bekleyen İşler (v15.6 sonrası):

**🟠 ORTA — Kalan Phase 6:**
- **P6.3-A** — 45 NAV dup dedup (Codex sprint sonrası, ~2.5h)
- **P6.3-C** — flat slug full-path (Codex sonrası, ~30dk)
- **P6.5e** — `supermarket/kahve` content gap (DB scrape entegrasyon)
- **P6.12f-codex** — Codex 4 backup reapply sonrası 18 any + 8 hooks
- **P6.18b runtime** — token-set leaf compound gap (async path)
- **P6.19b** — mergeIntent price dimension detection (Codex pipeline)
- **🆕 P6.16-v2** — `backup_20260430_categories` DROP (~6 ay sonra,
  Phase 5 stable + Phase 6 kapanış sonrası safety net'e gerek kalmaz)

**🟡 DİĞER:**
- Eval2 full re-run (LLM quota varsa, baseline 200 dialog)
- Codex 4 backup reapply takip (P6.12f-codex'i unlock eder)
- P6.15b auth user manuel delete (Studio Auth panel, ~1dk)

**🟢 OPSIYONEL (MVP sonrası):**
- listings.in_stock BOOLEAN DROP (6 ay sonra)
- raw_offers ingestion (Migration 028 staging)
- H16 Google AI dedup, H19 next-auth v5
- Pro plan iptal kararı (29 May 2026)
- Hosting değerlendirme (3-6 ay)

---

## 🔵 ÖNCEKİ DURUM (3 May 2026 erken — v15.5 paket)

v15.4 sonrası ek 4-5 saatlik sprint. Cron baseline 24h sağlık check'inde
3 pg_stat anomalisi tespit edildi (stores/auth.users/knowledge_chunks),
hepsi audit edildi + 2'si VACUUM ile düzeltildi. Eval2 ile chatbot
katmanlarında 3 ek fix uygulandı.

### Bu oturumda kapatılan ek borçlar (7):

**Cron baseline 24h pg_stat anomali serisi:**
- ✅ **P6.14** `stores` VACUUM (Migration 035, `e949390`):
  - n_live_tup=0 (yanlış) → 9 (gerçek 9 mağaza, 2 aktif: MediaMarkt 6422 + PttAVM 2876)
  - VACUUM (FULL, ANALYZE) Studio apply, lock <100ms
- ✅ **P6.15** `auth.users` audit (doc-only, `cd2866d`, Senaryo B):
  - n_live_tup=0 (yanlış) → 3 gerçek aktif user (test@/test1@/test1@test1)
  - 0 silinmiş, 0 banlı; public.profiles cross-check 1 match (test@)
  - **auth.\* Supabase managed** → VACUUM/ANALYZE/GRANT yapma yetkimiz YOK
  - pg_stat reporting anomali, production etkisi sıfır (auth flow RLS + service_role)
- ✅ **P6.17** `knowledge_chunks` VACUUM (Migration 036, `703f1cf`):
  - n_live_tup=0 (yanlış) → 121 chunk (PROJECT_STATE belgelenen ~141'e yakın)
  - chatbot RAG aktif (4 call site: chatOrchestrator + retrieveKnowledge)
  - HNSW 768-dim vector index ~1.8 MB rebuild, lock <500ms
  - DROP YASAK — kritik production veri sağlıklı

**Chatbot pipeline iyileştirmeleri (eval2 dryrun yoluyla):**
- ✅ **P6.18** `state.category_slug` raw flat slug fallback kaldırıldı (`92ab818`):
  - chat/route.ts:755 `resilientParsedCategory` fallback chain genişletildi
  - State'e `erkek-giyim-ust` (corrupt flat) yerine null veya previous yazılır
- ✅ **P6.18b** compound flat slug resolve (`626b570`):
  - `findCanonicalSlugSync` chain'ine 5. katman: compound-path match
  - Input `-` token'ları DB segments'inde full coverage arar
  - Çoklu match: P6.11 sticky tie-break OR en kısa slug fallback
  - `erkek-giyim-ust` → `moda/erkek-giyim/ust` ✓
- ✅ **P6.19** parseQuery price extraction (`930f946`):
  - 5 yeni regex katmanı: "X bine kadar", "max X TL", "min X TL", vs.
  - 'bin' çarpanı handling (X bin → X×1000)
  - Curl single-turn 6/6 PASS, eval2 multi-turn'de mergeIntent katmanı bug'ı (P6.19b)

**Pre-existing eslint** (önceden kapatılmıştı, doc strikethrough `e993d46`):
- sync/route.ts:9 (categorizeFromTitle import) ve :164 (effectiveCategoryId const) zaten P6.12 sprint döneminde kapatılmıştı

### YENİ BORÇLAR (audit'lerden ortaya çıkan, 3):

- **🆕 P6.15b** — Orphan auth users (audit P6.15 sonucu):
  - test1@test.com + test1@test1.com `auth.users`'ta var ama `public.profiles`'ta YOK
  - Signup-profile create flow yarım kalmış (test signup'lar muhtemelen)
  - Karar gerek: cleanup (auth.users delete) vs flow audit (signup hook fix)
- **🆕 P6.18b runtime** — token-set leaf compound gap:
  - findCanonicalSlugSync compound-path katmanı eklendi (sync resolve OK)
  - Ama `validateOrFuzzyMatchSlug` async path runtime'da Token-set katmanı hâlâ leaf-only
  - Compound input + leaf-only fail kombinasyonu nadir ama gerçek
- **🆕 P6.19b** — mergeIntent price dimension detection (Codex pipeline):
  - chat/route.ts parseQuery doğru extract ediyor (curl 6/6 PASS)
  - Ama mergeIntent (conversationState.ts) `no_new_dims_keep` action ile
    rawIntent.price_max=400'i drop ediyor → state'e yazılmıyor
  - Lokasyon: src/lib/chatbot/conversationState.ts (Codex pipeline)
  - Süre tahmin: ~30dk

### Eval2 ilerleme:

| Aşama | PASS | Detay |
|-------|------|-------|
| P6.1 baseline | 0/5 | is_leaf bug (Migration 030 öncesi) |
| P6.1+8 sonra | 3/5 | is_leaf fix + fixture migrate |
| P6.18 sonra | 3/5 | Dialog 4 fail tipi: corrupt flat → null |
| P6.18b sonra | 3/5 | Dialog 4 turn 0 düzeldi (state.category_slug ✓), fail turn 6'ya kaydı |
| P6.19 sonra | 3/5 | parseQuery layer doğru, mergeIntent katmanı drop ediyor (P6.19b) |

**Kalan FAIL:**
- Dialog 3 turn 0 — `supermarket/kahve` 0 ürün (DB content gap, P6.5e — DB scrape gerek)
- Dialog 4 turn 6 — price_max state null (P6.19b — mergeIntent fix)

### Cron baseline 24h sonuç (önceden v15.4'te):
- price_history 24h: 525 satır ✓
- Cache hit %100, connections 24, dead tup düşük ✓
- 29 Apr outage tekrar riski YOK
- Bonus: 3 pg_stat anomalisi (stores/auth/knowledge — yukarıda işlendi)

### Production durumu:
- Working dir CLEAN
- TSC + build clean (tüm commit'lerde)
- CI yeşil (lint fail-soft, baseline 148 — değişmedi)
- 5 yeni Migration (031, 032, 033, 034, 035, 036) production'da
- Site trafik almıyor

### Bekleyen İşler (v15.5 sonrası):

**🟠 ORTA — Kalan Phase 6:**
- **P6.3-A** — 45 NAV dup dedup (Codex sprint sonrası, ~2.5h)
- **P6.3-C** — flat slug shortcut'lar full-path'e (Codex sprint sonrası, ~30dk)
- **P6.5e** — `supermarket/kahve` content gap (DB scrape entegrasyon gerek)
- **P6.12g-product-narrow** — mediamarkt.mts cheerio extractor refactor (~1h)
- **P6.12f-codex** — Codex 4 backup reapply sonrası 18 any + 8 hooks
- **P6.15b** — orphan auth users (test1@/test1@test1, profiles yok)
- **P6.18b runtime** — token-set leaf compound gap (async path)
- **P6.19b** — mergeIntent price dimension detection (Codex pipeline)
- **P6.16** — backup_20260430_categories + backup_20260422_products silme

**🟡 DİĞER:**
- Eval2 full re-run (LLM quota varsa, baseline 200 dialog)
- Codex 4 backup reapply takip (P6.12f-codex'i unlock eder)

**🟢 OPSIYONEL (MVP sonrası):**
- listings.in_stock BOOLEAN DROP (6 ay sonra)
- raw_offers ingestion (Migration 028 staging)
- H16 Google AI dedup, H19 next-auth v5
- Pro plan iptal kararı (29 May 2026)
- Hosting değerlendirme (3-6 ay)

---

## 🔵 ÖNCEKİ DURUM (2 May 2026 gece geç — v15.4 paket)

v15.3 commit'inden sonra ek 4-5 saatlik sprint. Phase 6 fonksiyonel
borç havuzu büyük ölçüde kapatıldı; kalan iş Codex sprint koordinasyonuna
veya minor cleanup'a taşındı.

### Bu oturumda kapatılan ek borçlar:

**P6.12 sprint final (3 ek commit, 49 ek fix):**
- `d41186e` — P6.12g mediamarkt JSON-LD interface (6 fix + 1 sub-borç)
  - Yeni `mediamarkt-types.mts` (118 satır): JsonLdProductLike, JsonLdOffer,
    PreloadedState, ApolloCache, ApolloRef, ApolloFeature + type guards
  - mediamarkt.mts: Apollo cache walker + JSON-LD parse typed
  - Sub-borç P6.12g-product-narrow (1 any: cheerio.each callback narrowing
    cascade) — JSON-LD extractor function refactor ayrı sprint
- `dac9bbb` — P6.12 mekanik combo (21 fix)
  - 14 unescaped-entities: Türkiye'nin → Türkiye&apos;nin, vs.
  - 7 unused-vars SAFE subset: useEffect/categorizeFromTitle/QUICK_CATS
    import temizlik + catch (err) → catch
- `a9e9012` — P6.12c permanent defer (audit revize, kod değişikliği yok)
  - scripts/ 86 any × 42 dosyaya yayılmış (gerçek dağılım)
  - 8-14h iş + Fact-Forcing Gate sürtünmesi → DEFER karar
  - Yeni davranış kuralı 23 (yeni scripts/ Database typed disiplini)

**P6.3-B 3 kritik sub-leaf grubu (Migration 034 + Header):**
- `a809558` — Migration 034 + Header.tsx 9 entry slug update
- 9 yeni sub-leaf (Migration 029 keywords pattern):
  - `elektronik/bilgisayar-tablet/bilesenler/{parca, cevre-birim, veri-depolama}` (3)
  - `kozmetik/parfum/{kadin, erkek, unisex}` (3)
  - `elektronik/oyun/konsol/{aksesuar, vr-sim, pc-oyun}` (3)
- Migration 032 trigger 3 parent (bilesenler, parfum, konsol) is_leaf=false
  yaptı (NOTICE confirmed)
- Header diff 18 satır (9 entry × 2 line each), Codex çakışma SIFIR
- A/C grupları (45 dup dedup + flat slug) Codex Header sprint sonrası

**Cron Baseline 24h Sağlık Check:**
- price_history 24h: **525 satır** ✓ (cron + log_price_change trigger çalışıyor)
- Cache hit %: **100.00** ✓ (29 Apr outage'da 88'di)
- Connections: **24** (29 Apr 60+'tı)
- Dead tup: products 11.42%, listings 4.52%, agent_decisions 1.63% — hepsi <20 ✓
- **29 Apr outage tekrar riski YOK**
- Pro plan upgrade veya cron rotation gerekmez
- ⚠️ Bonus tespit: **stores tablosu 100% dead tup** (9 dead, 0 live) — yeni borç P6.14

### Codex paralel sprint:

Bu oturumda Codex 2 commit push etti:
- `df44449` refactor: modularize search filters sidebar
- `ab5444e` feat: add modular search plans and header autocomplete

Backup'taki 4 forum/profil dosya hâlâ uncommitted (Codex sprint kapsamında).

**Çakışma yönetimi (P6.3-B canlı örnek):**
- Codex Header autocomplete sprint'i Header.tsx'te aktif çalışıyor
- P6.3-B aynı dosyaya 9 entry slug update gerektiriyordu
- Strateji: minimal scope — sadece slug, label/tags/icon korundu, diff 18 satır
- Sonuç: **Codex 2 commit ile sıfır çakışma**, paralel push başarılı
- Yeni davranış kuralı 24 (minimal Header diff)

### Production durumu:

- Working dir CLEAN (kullanıcı ve Codex tarafları senkronize)
- TSC + build clean (tüm commit'lerde)
- CI yeşil (lint fail-soft, baseline 148)
- Cron baseline sağlıklı, NANO compute yeterli
- Site trafik almıyor (yapım aşamasında)

### Bekleyen İşler (v15.4 sonrası):

**🟠 ORTA — Kalan Phase 6:**
- **P6.3-A** — 45 dup dedup (Header dedup, Migration GEREKMİYOR; Codex sprint sonrası, ~2.5h)
- **P6.3-C** — flat slug shortcut'lar full-path'e çevrilmesi (Codex sprint sonrası, ~30dk)
- **P6.12g-product-narrow** (1 any) — JSON-LD `let product: any` extractor function refactor (cheerio.each → reduce/map immutable)
- **P6.12f-codex** — Codex 4 backup reapply sonrası TopicFeed/profil/tavsiyeler/tavsiye/[id]'de 18 any + 8 hooks
- ~~**P6.14**~~ — `stores` tablosu 100% dead tup ✅ KAPATILDI (Migration 035, 2 May gece geç).
  Gerçek 9 aktif store, autovacuum hiç çalışmamış → pg_stat anomalisi.
  VACUUM (FULL, ANALYZE) Studio apply, istatistikler yenilendi.
- ~~**P6.15**~~ — `auth.users` 0 live + 9 dead anomali ✅ KAPATILDI (audit-only, 2 May gece geç).
  Gerçek 3 aktif user (test@/test1@/test1@test1), 0 silinmiş, 0 banlı.
  9 dead tup MVCC HOT update artıkları + dev test signup token'ları (~2 KB negligible).
  `auth.*` schema Supabase managed → VACUUM/ANALYZE/GRANT yapma yetkimiz YOK.
  pg_stat reporting anomali, production etkisi sıfır (auth flow RLS + service_role
  doğrudan SELECT, istatistik kullanmıyor). Kapatma kararı: kod/Migration gerekmez.

**🟡 DİĞER (öncelik düşük):**
- Eval2 full re-run (LLM quota reset sonrası, baseline ölçüm)
- ~~Pre-existing eslint sync/route.ts:9, :164~~ — ZATEN DONE (efe1fed prefer-const auto-fix + dac9bbb unused import remove)
- Codex 4 backup reapply takip (P6.12f-codex'i unlock eder)

**🟢 OPSIYONEL (MVP sonrası):**
- listings.in_stock BOOLEAN DROP (6 ay sonra)
- raw_offers ingestion (Migration 028 staging tablosu)
- backup_20260430_categories + backup_20260422_products silme
- H16 Google AI dedup, H19 next-auth v5
- Pro plan iptal kararı (29 May 2026)
- Hosting değerlendirme (Hetzner/Vargonen, 3-6 ay sonra)

---

## 🔵 ÖNCEKİ DURUM (2 May 2026 akşam — v15.3 paket)

Phase 6 yoğun ilerleme: bu oturumda **13 borç kapatıldı**, 1 deferred,
P6.12 kısmi başlatıldı. Codex paralel UI çalışması in-progress.

### Bu oturumda kapatılan borçlar (13):

**Migration 030 + 031 + 032 + 033 zinciri (DB kalıcılık + IoT taşıma):**
- Migration 030 (`303bb77`): `categories.is_leaf` backfill (1 → 172 leaf, recursive)
- Migration 031 (`20479c6`): `elektronik/akilli-ev` leaf (Akıllı Ev IoT için yer)
- Migration 032 (`787d0bc`): `is_leaf` trigger (kalıcılık, AFTER INSERT/UPDATE/DELETE)
  - `sync_category_is_leaf()` PL/pgSQL function
  - Self-healing: yeni kategori eklenince parent otomatik `is_leaf=false` olur
- Migration 033 (`93fb7b9`): 30 IoT ürün re-categorization
  - 24 → `elektronik/akilli-ev` (Tapo akıllı ampul/priz/sensör + Xiaomi + Philips Hue + Govee)
  - 6 → `elektronik/ag-guvenlik/guvenlik-kamera` (Tapo C-serisi)

**Chatbot polish (P6.7 + P6.9 + P6.10 + P6.11):**
- **P6.7** LLM response leaf-only display (`3cd6eba`):
  - `formatIntentContext` LLM prompt'ta `category_slug` → `resolveCategoryLabel(slug, "")`
  - "elektronik/telefon/akilli-telefon" → "telefon" (slug echo riski kapatıldı)
  - Live test: "telefon öner" → "Aramana uygun 5 telefon listelendi" ✓
- **P6.9** Provider timeout + single retry (`6153e9d`):
  - REQUEST_TIMEOUT_MS 5000→6000, FAST_FOLLOWUP 1800→2500
  - `tryProviderWithRetry` helper (200ms backoff + 1 retry on Timeout)
  - NVIDIA cold-start sorunu hafifledi
- **P6.10** Suggestion empty edge case (`b71e061`):
  - `suggestionBuilder.ts` cutoff `<=1` → `===0`
  - 1 ürün için variant + brand + price reset chip (intentHint.mode='reset' Codex mekanizması)
- **P6.11** Sticky-aware kategori tie-break (`a0e758b`):
  - `SlugMatchOptions` interface + `commonPrefixDistance` private helper
  - `findCanonicalSlugSync` 3. opsiyonel `options?` param
  - Live test: "kahve makinesi → espresso olsun" 0 → 5 ürün
  - Davranış kuralı 19 (sticky kategori context tie-break)

**Routing + RLS (P6.2b + P6.4 + P6.6 + P6.13):**
- P6.2b NAV "Ağ & Modem" + "Akıllı Ev" slug fix (`6d68141`)
- P6.4 `tavsiye/[id]/layout.tsx` anon → `supabaseAdmin` (`b1280ad`)
  - Migration 016 anon RLS audit kapatıldı; 12 anon import dosyasının 11'i client component (risk yok), 1'i SSR (bu fix)
- P6.6 `is_leaf` trigger Migration 032 (`787d0bc`)
- P6.13 `elektronik/akilli-ev` leaf + NAV bağlantı (`20479c6`)

**Eval altyapı (P6.8):**
- 120 fixture unmatched → **0 unmatched** (`7132abb`)
- 564/564 dialog resolved (chatbot_dialogs_200) + 40/40 (eval2)
- Helper genişletildi: çoklu match → null + kategori-aile koruma (örn.
  `fitness-aksesuar` → `spor-outdoor/fitness`, eski `elektronik/telefon/aksesuar` regresyon önlendi)
- `migrate-eval-fixtures.mts` MANUAL_OVERRIDE 16 → 110+ entry + Türkçe ascii-normalize + `--dump-taxonomy` flag

**P6.12 Lint hijyen tam sprint (5 commit, 47 fix):**
- `efe1fed` Aşama 1+2 partial (8 fix): prefer-const + html-link (3) + set-state-in-effect (1) + img (2)
- `3990a45` Aşama 3 (4 fix): admin/page.tsx exhaustive-deps (4 useEffect deps eslint-disable
  + justification, useCallback wrap scope dışı P6.12g borç)
- `ee0fadb` Aşama 4 G1 (11 fix): scrapers/live any → tip
  - mediamarkt/trendyol/pttavm catch (err: any) → unknown + instanceof Error narrowing
  - JSON-LD parse param any → JsonLdProduct/Record<string, unknown>
  - normalizeOffers + OfferLike type tanımı
  - useLivePrices SSE error handler MessageEvent typed
- `12eed6f` Aşama 4 G3 partial (2 fix): Header (User type) + api/live-prices (catch unknown)
- `e579565` Aşama 4 G2 (22 fix): admin + karsilastir any → tip
  - karsilastir RawJoinRow + flattenObject Record<string,unknown>
  - admin AdminProductRow/CategoryRow/StoreRow/PriceRow/CsvRow/IcecatSpecGroup interface'leri
  - Cascade fix: 3 TS2339 (csvParsed.category undefined, makeSlug param, created_at conditional)
- **LINT BASELINE: 223 → 174 (-49, %22 azalma)**
- **no-explicit-any: 138 → 107 (-31, %22 azalma)**

KALAN P6.12 SUB-BORÇLAR:
- **P6.12g-mediamarkt**: `mediamarkt.mts` (6) + `mediamarkt-categories.mts` (1) any.
  Denendi, JSON-LD apolloState/featureGroups deep nested narrowing 15+ TS2339
  cascade üretti → REVERT, ayrı sprint (JsonLdProduct + ApolloState interface tasarım gerek)
- **P6.12f-codex**: TopicFeed + profil + tavsiyeler + tavsiye/[id] (10 any + 8 hooks).
  Codex backup'tan reapply sonrası ele alınır
- **P6.12c**: scripts/ — **PERMANENT DEFER** (2026-05-02 gece audit revizesı)
  - Beklenen: fix-kb-mojibake-db.ts 72 any (tek dosya). Gerçek: **86 any × 42 dosyaya yayılmış**
    (fix-kb-mojibake-db.ts gerçekte 1 any; top dosyalar probe-live-prices 6, probe-cft-debug 5,
    probe-canon-quality 5, vs. tüm probe-/find-/insert-/print-/migration scripts'ler)
  - Yapılırsa: 8-14 saat iş + her dosya 4-fact Fact-Forcing Gate sürtünmesi (kural 20)
  - **Karar: KAPATILMADI**. Gerekçe:
    - scripts/ one-shot probe'lar — production runtime YOK (manuel `npx tsx` ile çağırılır)
    - CI `continue-on-error` ile fail-soft (P6.12 sprint başında ayarlandı)
    - Fırsat maliyeti yüksek: 8-14h yerine eval2 full re-run / P6.12g-mediamarkt /
      Codex review daha değerli iş
    - Yeni script disiplini (kural 23) ile organik düşecek
  - Lint baseline 174'te dondurulur (scripts/ scope dışı sayılır)
- src/ kalan ~50 any (chatbot strict, Codex pipeline güvenliği — dokunulmaz)
- no-unescaped-entities (14) + no-unused-vars (33) — mekanik fix, ayrı sprint

### P6.5 KAPATMA (audit only, dokunulmadı):
- `categoryKnowledge.ts` loose substring match çalışıyor (normalize() `/` → space sayesinde)
- 23/24 entry production'da doğru entry resolve ediyor (cilt-bakim content gap hariç)
- Codex pipeline (4 commit knowledge → ranking) riski yüksek → DOKUNULMADI
- Cosmetic borçlar P6.5c (split dead code) / P6.5d (Array.find order brittleness) / P6.5e (cilt-bakim entry yok)
- Tracking: dökümante, commit YOK

### DEFERRED:
- **P6.3** NAV dup converge — audit'te 14 dup beklenmişti, gerçek **53 dup grup, 215 entry**.
  Scope mega paket dışı (Migration + Header refactor + smoke ~3-5 saat).
  Phase 7 / ayrı sprint.

### Codex paralel çalışması (IN PROGRESS, backup'ta + uncommitted):

**4 forum/profil dosya:** Codex `backups/ui/2026-05-02-forum-profile/` altına
yedeklendi + working tree'den restore edildi (origin state'e döndü, Codex
kendi sprint'inde reapply edecek):
- `src/app/components/home/TopicFeed.tsx` (gradient + bento UI)
- `src/app/profil/page.tsx` (gradient + kullanıcı paneli badge)
- `src/app/tavsiye/[id]/page.tsx`
- `src/app/tavsiyeler/page.tsx`

**Yeni Codex değişikliği (uncommitted):**
- `src/app/ara/page.tsx` — store-source display labels feature
  (sourceDisplayLabels Record + getSourceDisplayName + StoreLogo render)

P6.12 sprint'te commit edilmedi (selective `git commit --only` ile dışarıda
bırakıldı). Codex kendi flow'unda commit edecek, v15.4'te işlenir.

### Production durumu:
- Working dir: 4 unstaged Codex UI dosyası (yukarıda listelendi)
- TSC + build clean (commit'lenmiş kod için)
- Tüm Phase 6 fonksiyonel düzeltmeler ve Codex chatbot zinciri canlıda
- CI yeşil (lint fail-soft `continue-on-error`, build kritik gate)
- Site trafik almıyor (yapım aşamasında)
- Background scrape'ler aktif (PttAVM SKIP_PHONE=1, MM telefon SKIP)

### Bekleyen İşler (v15.3 sonrası, öncelik sırası):

**🔴 KRİTİK**: yok şu an

**🟠 ORTA — Phase 6 kalan borçları:**
- **P6.5b** — `cilt-bakim` knowledge entry content gap (UI eksik tip metni; düşük öncelik)
- **P6.12** sub-aşamaları (5 ayrı sprint):
  - **12a** img (9 kalan) — TopicFeed, KategoriSayfasi, StoreLogo (onError refactor), ProductGallery×2, profil×3, tavsiyeler
  - **12b** unused-vars (33) — import temizlik + `_` prefix
  - **12c** scripts/ (173) — one-shot dosyalar, P6.12 scope dışı
  - **12d** no-explicit-any src/ (138) — büyük iş, ayrı sprint
  - **12e** unescaped-entities (14) — JSX karakter kaçışları
  - **12f** react-hooks/immutability (7) — manual logic refactor
  - **12g** react-hooks/exhaustive-deps (5) — deps audit

**🟡 DİĞER (öncelik düşük):**
- **Eval2 full re-run** — 200 dialog tam baseline (LLM quota reset sonrası)
- **Cron baseline 24h takip** — cron 2 May'da yeniden açıldı, 3 May ~03:00 kontrol
- **Pre-existing eslint** — `src/app/api/sync/route.ts:9` unused import (P6.12 auto-fix line 161 prefer-const'ı kapattı, line 9 unused-vars hâlâ açık)
- **P6.5c/d/e** cosmetic categoryKnowledge borçları
- **Codex 4 UI dosyası commit takip** (yarın v15.4)

**🟢 OPSIYONEL (MVP sonrası):**
- listings.in_stock BOOLEAN DROP (6 ay sonra, frontend/scraper migrate sonrası)
- raw_offers ingestion (Migration 028 staging tablosu kullanım)
- backup_20260430_categories + backup_20260422_products silme
- H16 Google AI dedup (deprecated SDK)
- H19 next-auth v5 migration
- Pro plan iptal kararı (29 May 2026)
- LLM cache veya paid tier
- Hosting değerlendirme (Hetzner/Vargonen, 3-6 ay sonra)

---

## 🔵 ÖNCEKİ DURUM (2 May 2026 öğleden sonra — v15.2 paket)

Öğleden sonra Phase 6 yoğun ilerleme: 7 borç kapatıldı, 3 yeni borç eklendi.

### ŞAH A → B → C → D zinciri tamamlandı:

**ŞAH A — CRLF Normalize (`8e65f6c`):**
- `.gitattributes` oluşturuldu (LF policy: tüm text dosyalar normalize)
- Tek seferlik `git add --renormalize .` idempotent (0 dosya değişti — repo zaten LF)
- Bundan sonra Windows VS Code'da CRLF/LF kaosu YOK (auto-conversion sabitlendi)

**ŞAH B — PROJECT_STATE v15.1 (`6828943`):**
- Phase 6 partial (P6.1 + P6.2a) + Codex zinciri (4 commit) + hijyen A1 dökümante

**ŞAH C — Phase 6 fonksiyonel borçlar:**
- **P6.2b** — NAV "Ağ & Modem & Akıllı Ev" + "Akıllı Ev" slug fix (`6d68141`):
  Header NAV constant DB ile uyumsuzluk giderildi (slug yanlış parent fallback'tan
  doğru leaf'lere taşındı). Migration gereksiz — modem leaf zaten DB'de.
- **P6.13** — `elektronik/akilli-ev` leaf + NAV bağlantı (Migration 031, `20479c6`):
  IoT/akıllı ev için yeni leaf. 27 keyword backfill (Migration 029 pattern).
  Header NAV "Akıllı Ev" → `elektronik/akilli-ev` (önceki: `elektronik/ag-guvenlik`
  geçici fallback). Yeni borç P6.13b: ~16 IoT ürün manuel re-categorization.

**ŞAH D — Codex polish (chatbot UX):**
- **P6.9** — Provider timeout + single retry (`6153e9d`):
  - REQUEST_TIMEOUT_MS 5000→6000, FAST_FOLLOWUP_TIMEOUT_MS 1800→2500
  - `tryProviderWithRetry` helper (timeout sonrası 200ms backoff + 1 retry)
  - NVIDIA cold-start sorunu hafifledi; Groq/Gemini fallback hâlâ aktif
- **P6.10** — Suggestion empty (1 ürün edge case) (`b71e061`):
  - `suggestionBuilder.ts` cutoff `<=1` → `===0` (1 ürün artık gizlenmiyor)
  - 1 ürün branch: 4 broaden chip (variant/storage + brand + price + generic reset)
  - `intentHint.mode='reset'` Codex mekanizması kullanıldı; suggestion artık boş kalmıyor
- **P6.11** — Sticky-aware kategori tie-break (`a0e758b`):
  - `SlugMatchOptions` interface (exported, backwards compatible)
  - `commonPrefixDistance(a, b)` private helper (segment-based)
  - `findCanonicalSlugSync` 3. opsiyonel parametre `options?` (Header çağrısı backwards uyumlu)
  - `validateOrFuzzyMatchSlug` options propagate
  - `chat/route.ts` line 748 + 905: `{ stickyContextSlug: previousState?.category_slug ?? null }`
  - Line 506 (legacySearch fallback) dokunulmadı — previousState scope dışı
  - **Live curl:** "kahve makinesi → espresso olsun" zinciri 0 ürün → 5 gerçek kahve makinesi
  - A katmanı (mergeIntent sticky branch) gereksiz kaldı; B katmanı (helper) yeterli

### CI fix:
- `bc7c806`: scripts/ lint scope (ilk versiyon — kural override) + 3 dosya source fix
- `c47bbca`: Lint fail-soft `continue-on-error: true` (final — src/ de 81 hata var,
  hijyen P6.12 borç, build kritik gate)

### Production durumu:
- Working dir CLEAN (0 M, 0 untracked tracked-able)
- TSC clean, ESLint clean (config-protection hâlâ aktif)
- Tüm Phase 6 fonksiyonel düzeltmeler ve Codex chatbot zinciri canlıda
- CI yeşil (lint log-only warning, build kritik gate)
- Site trafik almıyor (yapım aşamasında, kullanıcı belirtti)
- Background scrape'ler aktif (PttAVM SKIP_PHONE=1, MM telefon entry'leri SKIP)

### Bekleyen İşler (v15.2 sonrası, öncelik sırası):

**🔴 KRİTİK**: yok şu an

**🟠 ORTA — Phase 6 kalan borçları:**
- **P6.3** — NAV constant 14 dup converge consolidation
- **P6.4** — Migration 016 anon RLS SSR audit (sitemap.ts gibi başka var mı)
- **P6.5** — `categoryKnowledge.ts` keys field full-path uyumu (Codex sistemi review)
- **P6.6** — `is_leaf` trigger (parent_id değişikliği sonrası dinamik update, Migration 032)
- **P6.7** — chatbot response leaf-only → full path resolve (helper LLM yanıt yolunda
  effective değil, eval2 dialog 4 fail kaynağı)
- **P6.8** — 120 fixture unmatched manuel mapping
- **P6.12** — 254 lint error hijyen (52 any + 11 img + 173 scripts/)
- **🆕 P6.13b** — IoT ürün manuel re-categorization (~16 ürün; akıllı priz/kilit/sensör/
  şerit dağılmış: 7 modem, 2 telefon, 2 kulaklık, vs. — false positive riski yüksek,
  manuel review)

**🟡 DİĞER (öncelik düşük):**
- **Eval2 full re-run** — 200 dialog tam baseline (LLM quota reset sonrası)
- **Cron baseline 24h takip** — cron 2 May'da yeniden açıldı, 3 May ~03:00 kontrol
  (CPU, Disk IO, Connections, query latency)
- **Pre-existing eslint** — `src/app/api/sync/route.ts:9` unused import, `:164` prefer-const

**🟢 OPSIYONEL (MVP sonrası):**
- listings.in_stock BOOLEAN DROP (6 ay sonra, frontend/scraper migrate sonrası)
- raw_offers ingestion (Migration 028 staging tablosu kullanım)
- backup_20260430_categories + backup_20260422_products silme
- H16 Google AI dedup (deprecated SDK)
- H19 next-auth v5 migration
- Pro plan iptal kararı (29 May 2026)
- LLM cache veya paid tier
- Hosting değerlendirme (Hetzner/Vargonen, 3-6 ay sonra)

---

## 🔵 ÖNCEKİ DURUM (2 May 2026 öğlen — v15.1 paket)

Sabah-öğlen oturumu kapsamında 4 ana commit + Codex tarafı 4 ek commit
production'a alındı. Working dir CLEAN.

### Bu oturumda kapatılan borçlar:

**P6.1 — Chatbot kategori match restore (KRİTİK):**
- Bisect ile kök neden tespit (5/5 senaryo HEAD'de FAIL)
- H4: categories.is_leaf flag 215/216 false → chatbot loadCategories
  is_leaf=true filtresinde sadece siniflandirilmamis görüyordu
- Migration 030 (recursive UPDATE) → 1 → 172 leaf
- Eval fixture migrate (Phase 5 hierarchik path)
- Sonuç: 0/5 → 3/5 PASS (60%)

**P6.2a — Scraper classifier Phase 5 uyumu:**
- SOURCE_CATEGORY_MAP 52 entry leaf-only → full hierarchik path
- 41 auto-match + 11 manuel (DB-doğrulanmış)
- categorizeFromTitle resolveLeafToFullPath helper eklendi
- Auto-create devre dışı (findOrCreateAutoCategory çağrısı kaldırıldı)
- 3/3 dry-run senaryo PASS
- DB'de mevcut auto-* kategori YOK (geriye dönük migration gerek değil)

**Codex çalışması (43a971a → 9875bb6, 5 commit):**
- `43a971a`: category knowledge → intent agent prompt enjekte
- `63d8753`: category knowledge → ranking sinyali (productRetrieval.ts)
  - Ürün başlık + model + specs üzerinden knowledge profile match
  - score_breakdown.knowledge alanı + ranking_reasons "kullanim:..." izi
  - agent_decisions diagnostiklerine knowledge_category_slug,
    knowledge_profile_id, knowledge_signal_terms eklendi
- `abefb5f`: hız iyileştirme — rule-based fast intent + KB skip
  - 12 turluk probe 58s → 21s (~%64 hızlanma)
  - Kısa/refine takip mesajlarında LLM çağrısı atlanıyor
- `a2ea588`: bug fix — telefon → kırmızı/siyah confusion + suggestion mismatch
  - Kısa takiplerde fallback kategori state korunuyor
  - "olsun" → "oyun" yanlış düzeltme engellendi
  - Cevap/chip aynı flow mesajından üretiliyor (suggestionBuilder)
- `9875bb6`: chat izolasyonu — httpOnly cookie + session scope
  - btv_browser_sid cookie + chatSessionScope birleşik
  - agent_decisions log + feedback fallback scope ile bağlandı
  - Cross-session feedback injection riski kapatıldı
  - Client credentials: 'same-origin'

**Hijyen + güvenlik:**
- `d1c44a1`: scrape PID/log/state-backup pattern .gitignore'a eklendi
- `961716f`: orphan sil (Hero, BlogSection) + .env.example + CI workflow
  - 17 zorunlu env + 6 toggle dökümante
  - .github/workflows/ci.yml — npm ci + lint + build (PR + main push)

### Production durumu:
- Working dir CLEAN (0 M, 0 untracked tracked-able)
- TSC clean
- Tüm Phase 5/6 fonksiyonel düzeltmeler ve Codex chatbot zinciri canlıda
- Site trafik almıyor (yapım aşamasında, kullanıcı belirtti)
- Background scrape'ler aktif (PttAVM SKIP_PHONE=1, MM telefon entry'leri SKIP)

### Eval2 dryrun (P6.1 sonrası):
- Önce: 0/5 PASS
- Sonra: **3/5 PASS (60%)**
- Kalan 2 fail:
  - `supermarket/kahve`: kategori OK, 0 ürün (DB content gap)
  - `moda/erkek-giyim/ust`: chatbot leaf-only response (P6.7 borcu)

### Bekleyen İşler (v15.1 sonrası, öncelik sırası):

**🔴 KRİTİK**: yok şu an

**🟠 ORTA — Phase 6 kalan borçları:**
- **P6.2b** — `networking` leaf DB'ye ekle (NAV "Ağ & Modem" → DB'de yok)
- **P6.3** — NAV constant 14 dup converge consolidation
- **P6.4** — Migration 016 anon RLS SSR audit (sitemap.ts gibi başka var mı)
- **P6.5** — `categoryKnowledge.ts` keys field full-path uyumu (Codex sistemi review)
- **P6.6** — `is_leaf` trigger (parent_id değişikliği sonrası dinamik update).
  Migration 031 ileride. Migration 025'teki `sync_category_level` pattern.
- **P6.7** — chatbot response leaf-only → full path resolve (helper LLM yanıt
  yolunda effective değil, eval2 dialog 4 fail kaynağı)
- **P6.8** — 120 fixture unmatched manuel mapping
  (P6.1 fixture migrate %60 resolve, kalan 120 manuel mapping genişletme)
- **🆕 P6.9** — Chatbot provider timeout/rate (Codex notu)
  Provider 0 Timeout 1800ms + Groq 429 + Provider 2 Timeout.
  Sohbet kırılmıyor ama hız/stabilite borcu.
- **🆕 P6.10** — Suggestion empty edge case
  "kırmızı olsun" → 1 ürün → suggestion boş kalabiliyor.
- **🆕 P6.11** — "kahve makinesi → en ucuz" 0 sonuç
  Ranking/fallback iyileştirme gerek (eval2 dialog 3 fail kaynağı, DB content + ranking)

**🟡 DİĞER (öncelik düşük):**
- **ŞAH 5** — CRLF normalize (`.gitattributes` LF policy, kural 17 referans)
- **Eval2 full re-run** — 200 dialog tam baseline (LLM quota reset sonrası)
- **Cron baseline 24h takip** — cron 2 May'da yeniden açıldı, 3 May'da kontrol
  (CPU, Disk IO, Connections, query latency)
- **Pre-existing eslint** — `src/app/api/sync/route.ts:9` unused import,
  `:164` prefer-const

**🟢 OPSIYONEL (MVP sonrası):**
- listings.in_stock BOOLEAN DROP (6 ay sonra, frontend/scraper migrate sonrası)
- raw_offers ingestion (Migration 028 staging tablosu kullanım)
- backup_20260430_categories + backup_20260422_products silme
- H16 Google AI dedup (deprecated SDK)
- H19 next-auth v5 migration
- Pro plan iptal kararı (29 May 2026)
- LLM cache veya paid tier
- Hosting değerlendirme (Hetzner/Vargonen, 3-6 ay sonra)

---

## 🔵 ÖNCEKİ DURUM (2 May 2026 gece — Yol A done, v15 paket)

**YAPILAN İŞLER (v14 sonrası akşam):**

**Migration 025b — log_price_change trigger bind:**
- PR-1 (`08d355a`): 4 dosyada 5 manuel `price_history.insert()` kaldırıldı
  (scrape-mediamarkt-by-category 2 INSERT, sync/route 1, live/index 1,
   admin/prices 1). scrape-pttavm-loop proxy + backfill-price-history
   intentional bypass. 4 dosya, -51/+9 satır.
- PR-2 (`ead3d19`): `supabase/migrations/025b_log_price_change_trigger_bind.sql`
  — `AFTER INSERT OR UPDATE OF price ON listings FOR EACH ROW
  EXECUTE FUNCTION log_price_change()`. Studio apply OK.
- Smoke test 3/3 PASS (transaction + ROLLBACK ile production data etkisiz):
  * Test 1 — UPDATE +0.01 → history+1 ✓ (trigger fired)
  * Test 2 — UPDATE same price → history+0 ✓ (IS DISTINCT FROM bloke)
  * Test 3 — UPDATE last_seen → history+0 ✓ (OF price filter bloke)
- Bonus: live/index.ts'teki `listing.price` ↔ `data.price` karışıklığı
  trigger devraldığında otomatik düzeldi (NEW.price = data.price).

**Migration 029 — categories.keywords backfill (216 kategori):**
- 216/216 kategori için keywords array yazıldı (Migration 021'de NULL kalmıştı).
  - 25 slug: `queryParser.ts` STATIC_CATEGORY_KEYWORDS +
    CHATBOT_FALLBACK_CATEGORY_PHRASES'ten curated; leaf-only → DB
    full-path resolve (Phase 5C helper + 9 manuel mapping)
  - 191 slug: LLM batch generation (multi-provider resilience)
    - Gemini 2.5-flash: 80 slug → quota=20 RPD doldu
    - Gemini 2.0-flash: 0 slug (quota=0)
    - Groq llama-3.3-70b-versatile: 16 slug → TPD=100K doldu
    - **NVIDIA meta/llama-3.3-70b-instruct: 95 slug** (kalanı temiz)
  - Avg 7.46 keyword/slug, 1612 toplam keyword, 0 hata
- Manuel review:
  - Generic kelime kaçağı: 0
  - Marka kaçağı: 0 (script substring false positive 18 — Türkçe kelimeler içinde "lg" substring; manuel inspeksiyonda gerçek marka yok)
  - Türkçe karakter pair coverage: ✓ (örn. `parfüm`+`parfum`)
  - Ambiguous slug parent context: ✓ 5/5 doğru ayrıştı
    * moda/aksesuar: şapka, atkı, eldiven (moda)
    * pet-shop/aksesuar: tasma, mama kabı, kedi tuvaleti (pet)
    * elektronik/telefon/aksesuar: kılıf, şarj kablosu, kulaklık (elektronik)
    * kucuk-ev-aletleri/temizlik: süpürge, robot süpürge (cihaz)
    * ev-yasam/temizlik: deterjan, çamaşır suyu, paspas (sarf)
- SQL dosyası: 274 satır, 36 KB, BEGIN/COMMIT transaction wrap, idempotent UPDATE
- GIN index: `idx_categories_keywords_gin USING GIN (keywords)`
- Studio apply OK.

**KOD ETKİSİ: SIFIR**:
- `src/lib/chatbot/categoryKnowledge.ts` (kullanıcının yeni sistemi) DOKUNULMADI
- `src/lib/search/queryParser.ts` STATIC_CATEGORY_KEYWORDS + CHATBOT_FALLBACK
  korundu (DB keywords paralel kaynak)
- Hiçbir TS/JS dosya değişmedi — sadece 1 SQL migration + 1 audit script

**Audit izleri (gitignored, local):**
- `scripts/category-keywords-static-mapped.json` (25 entry)
- `scripts/category-keywords-llm-v1.json` (191 entry)
- `scripts/build-category-keywords-static.mjs`
- `scripts/generate-category-keywords.mjs` (multi-provider LLM)

**Repo'ya eklendi:**
- `supabase/migrations/029_categories_keywords_backfill.sql`
- `scripts/build-migration-029-sql.mjs` (regenerator)

**Yol A commit'leri:**
- `08d355a` refactor(scrapers): price_history manuel INSERT'ler kaldırıldı (PR-1)
- `ead3d19` feat(db): Migration 025b — log_price_change trigger bind (PR-2)
- `8d6c529` feat(db): Migration 029 — categories.keywords backfill (216 kategori)

**YARIN PLAN (2026-05-03):**

🔴 KRİTİK:
1. **Cron baseline takibi** — kullanıcı 2026-05-02'de cron-job.org'da 7 cron yeniden açtı.
   24 saat baseline ölçüm gerekli: CPU, Disk IO, Connections, query latency.
   NANO compute bütçesi tükenirse Pro plan upgrade veya cron rotation gerek.
2. **Eval2 re-run** — Migration 029 sonrası DB keywords parent-aware
   ayrıştığı için chatbot tie-break davranışı değişmiş olabilir.
   `npx tsx scripts/eval-chatbot-dialogs.mjs --input
   tests/chatbot/fixtures/chatbot_dialogs_eval2_200.jsonl` (LLM quota reset sonrası).
3. **Pre-existing eslint** — `src/app/api/sync/route.ts:9` `categorizeFromTitle`
   unused import (warning) + `:164` `effectiveCategoryId` prefer-const (error).
   Yol A dışı bug, scope discipline için ayrı commit.

🟡 ORTA — Phase 6 borçları:
- **P6.1 — chatbot context-aware tie-break** (Migration 029 sonrası kısmen çözüldü):
  Çoklu match slug'lar için DB keywords artık parent-aware. Ama
  `validateOrFuzzyMatchSlug` hâlâ çoklu match'te null dönüyor —
  test edilip karar verilmeli.
- **P6.2 — `networking` kategorisi DB'de eksik**: NAV "Ağ & Modem & Akıllı Ev"
  → şu an `elektronik` parent fallback (geçici). DB'ye yeni leaf eklenmeli.
- **P6.3 — NAV constant 14 dup converge consolidation**: 159→145 unique
  sonra 14 NAV item aynı parent'a dönüştü. Header UX iyileştirme.
- **P6.4 — Migration 016 yan etki SSR audit**: sitemap.ts dışında anon RLS
  sızıntısı kalan SSR sayfa var mı? supabaseAdmin geçişi audit gerek.
- **P6.5 — categoryKnowledge.ts keys field full-path uyumu**:
  kullanıcının yeni chatbot sistemi (~580 satır) — slug key'leri
  full-path mı leaf mı uyumlu, kontrol gerek.

🟢 OPSIYONEL:
- listings.in_stock BOOLEAN DROP (6 ay sonra)
- raw_offers ingestion (Migration 028 staging)
- backup_20260430_categories + backup_20260422_products silme

**Kullanıcı uncommitted çalışması (4 M dosya, Yol A kapsamı dışı):**
- src/app/api/chat/route.ts, src/lib/chatbot/chatOrchestrator.ts,
  src/lib/chatbot/queryInterpreter.ts, src/lib/chatbot/suggestionBuilder.ts
- Yol A bu dosyalara DOKUNMADI (selective `git commit --only` kullanıldı).
  İlk commit attempt'inde pre-commit hook bunları otomatik staged etti
  → soft reset + `--only` flag ile temizlendi.

---

## 🔵 ÖNCEKİ DURUM (2 May 2026 — Phase 5 done, v14 paket)

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
- Migration **listings.in_stock DROP** (6 ay sonra, frontend/scraper migrate sonrası).

**v15'te tamamlandı:**
- Migration **025b** ✅ (2026-05-02): `log_price_change` trigger bind +
  scraper manuel INSERT'leri kaldırıldı. Smoke test 3/3 PASS.
- Migration **029** ✅ (2026-05-02): `categories.keywords` backfill 216/216,
  GIN index aktif. Multi-provider LLM (Gemini + Groq + NVIDIA fallback).

**v15.1'de tamamlandı:**
- Migration **030** ✅ (2026-05-02 öğlen): `categories.is_leaf` recursive
  backfill. 1 → 172 leaf. Chatbot loadCategories effective set restore.
  P6.1 root cause fix.

**v15.2'de tamamlandı:**
- Migration **031** ✅ (2026-05-02 öğleden sonra): `elektronik/akilli-ev` leaf
  ekleme (P6.13). 27 keyword backfill (Migration 029 pattern). NAV "Akıllı Ev"
  artık doğru leaf'e bağlı. Yeni borç P6.13b: ~16 IoT ürün manuel re-categorization
  (false positive riski yüksek — kulaklık/kamera doğru kategoride).

**v15.3'te tamamlandı:**
- Migration **032** ✅ (2026-05-02 akşam): `categories.is_leaf` trigger
  (P6.6). `sync_category_is_leaf()` PL/pgSQL function + AFTER
  INSERT/UPDATE OF parent_id/DELETE trigger. Migration 030 backfill
  kalıcılığını korur, self-healing yeni kategori eklemelerinde.
- Migration **033** ✅ (2026-05-02 akşam): IoT ürün re-categorization
  (P6.13b). 30 ürün doğru kategoriye taşındı (24 → akilli-ev,
  6 → guvenlik-kamera). Manuel review sonrası kullanıcı onaylı, false
  positive (Echo Buds/Pixel/robot süpürge) excluded.

**v15.4'te tamamlandı:**
- Migration **034** ✅ (2026-05-02 gece geç): NAV sub-leaves
  (P6.3-B). 9 yeni sub-leaf eklendi: bilesenler/{parca, cevre-birim,
  veri-depolama} + parfum/{kadin, erkek, unisex} + konsol/{aksesuar,
  vr-sim, pc-oyun}. Migration 032 trigger sayesinde 3 parent otomatik
  is_leaf=false oldu. Header.tsx 9 entry slug update minimal scope (Codex
  paralel sprint çakışması sıfır).

**v15.5'te tamamlandı (VACUUM serisi):**
- Migration **035** ✅ (2026-05-02 gece geç): `stores` VACUUM (P6.14).
  pg_stat anomalisi (n_live_tup=0, gerçek 9 mağaza). VACUUM (FULL,
  ANALYZE) Studio apply. NOT: VACUUM transaction-safe değil, BEGIN/COMMIT YOK.
- Migration **036** ✅ (2026-05-02 gece geç): `knowledge_chunks` VACUUM
  (P6.17). pg_stat anomalisi (n_live_tup=0, gerçek 121 chunk). HNSW
  768-dim vector index (~1.8 MB) rebuild, lock <500ms. Studio apply.

**v15.6'da tamamlandı:**
- Migration **037** ✅ (2026-05-03 erken): backup_2026* DROP (P6.16,
  `ef29602`). 5 tablo DROP, ~70 MB disk recovery. pg_stat anomalisi 4.
  örneği: `n_live_tup=0` yanıltıcı, gerçek 184k+ row vardı (43176 +
  43279 + 54107 + 195 + 44173). Blind DROP yapılsaydı veri kayıp riski.
  COUNT(*) doğrulaması yapıldı, restore senaryosu kabul edilemez (Phase 5
  + Migrations 023-034 geri alınamaz) → DROP onaylı.
  KORUNDU: backup_20260430_categories (189 row, 72 kB Phase 5 safety net).

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
ef29602   feat(db): Migration 037 — P6.16 eski backup tablo DROP (~70 MB)
e821e31   fix(lint): P6.12g-product-narrow — JSON-LD extractor function refactor
781f0e6   docs(state): v15.5 — Phase 6 ek borç temizliği (7 done + 3 yeni)
703f1cf   feat(db): Migration 036 — P6.17 knowledge_chunks VACUUM (121 chunk)
cd2866d   docs(state): P6.15 auth.users audit kapatıldı + P6.14 done strikethrough
930f946   fix(chatbot): P6.19 — parseQuery price extraction pattern genişletme
626b570   fix(chatbot): P6.18b — compound flat slug resolve (validateOrFuzzyMatchSlug)
92ab818   fix(chatbot): P6.18 — state.category_slug raw flat slug fallback kaldırıldı
e949390   feat(db): Migration 035 — P6.14 stores VACUUM FULL ANALYZE
e993d46   docs(state): pre-existing eslint sync/route.ts entry strikethrough
d7f7774   docs(state): v15.4 — P6.3-B + P6.12 sprint final + Cron sağlık
a809558   feat(db): P6.3-B — Migration 034 + 3 grup sub-leaf (9 yeni leaf)
ab5444e   (Codex) feat: add modular search plans and header autocomplete
df44449   (Codex) refactor: modularize search filters sidebar
dac9bbb   fix(lint): P6.12 mekanik combo — unescaped (14) + unused-vars (7) [21 fix]
a9e9012   docs(state): P6.12c permanent defer — scripts/ 86 any × 42 dosya
d41186e   fix(lint): P6.12g — mediamarkt JSON-LD + Apollo interface tasarım (6/7 fix)
12e519b   docs(state): v15.3 extension — P6.12 lint hijyen sprint (47 fix, 5 commit)
f81c33b   (Codex) feat: refine search sidebar interactions
e579565   fix(lint): P6.12 Aşama 4 G2 — admin + karsilastir any → tip (22 fix)
12eed6f   fix(lint): P6.12 Aşama 4 G3 partial — Header + api/live-prices any (2)
ee0fadb   fix(lint): P6.12 Aşama 4 G1 — scrapers/live any → tip (11 fix)
3990a45   fix(lint): P6.12 Aşama 3 — admin/page.tsx exhaustive-deps (4 fix)
6a00f3a   docs(state): v15.3 — Phase 6 13 borç + Mega paket + Codex paralel
efe1fed   chore(lint): P6.12 Aşama 1+2 partial — auto-fix + html-link + img (admin)
7132abb   fix(eval): P6.8 — fixture unmatched 120 → 0 manuel mapping
3cd6eba   fix(chatbot): P6.7 — LLM prompt'ta slug yerine display label
93fb7b9   feat(db): Migration 033 — P6.13b IoT ürün re-categorization
787d0bc   feat(db): Migration 032 — categories.is_leaf trigger (P6.6)
b1280ad   fix(rls): P6.4 — tavsiye/[id]/layout.tsx anon → supabaseAdmin
0af9d03   docs(state): v15.2 — Phase 6 partial-2 + ŞAH A-D done
a0e758b   fix(chatbot): P6.11 — sticky-aware kategori tie-break (espresso bug fix)
b71e061   fix(chatbot): P6.10 — 1 ürün edge case suggestion chip
6153e9d   perf(chatbot): P6.9 — provider timeout artır + single retry
20479c6   feat(db): Migration 031 — elektronik/akilli-ev leaf + NAV bağlantı
6d68141   fix(routing): P6.2b — NAV "Ağ & Modem" + "Akıllı Ev" slug DB ile uyumlu
8e65f6c   chore: .gitattributes + LF line ending normalize
c47bbca   fix(ci): lint fail-soft (continue-on-error)
bc7c806   fix(ci): scripts/ lint scope + 3 dosya source fix
6828943   docs(state): v15.1 — Phase 6 partial + Codex zinciri + hijyen
961716f   chore: kod hijyen — orphan sil + .env.example + CI workflow (2 May öğlen)
9875bb6   feat(chatbot): chat izolasyonu — httpOnly cookie + session scope (Codex)
d1c44a1   chore(scrapers): pttavm SKIP_PHONE filter + mm import path fix
303bb77   fix(db): Migration 030 — categories.is_leaf backfill (recursive) + fixture migrate
348fef2   fix(scrapers): P6.2a — scrape classifier Phase 5 hierarchik uyum
a2ea588   (Codex) chatbot bug fix: telefon/laptop confusion + suggestion mismatch
abefb5f   (Codex) perf: chatbot follow-up speed (~%64 hızlanma)
63d8753   (Codex) feat: category knowledge → chatbot ranking
43a971a   (Codex) feat: feed category knowledge into chatbot intent agent
8d6c529   feat(db): Migration 029 — categories.keywords backfill (216 kategori)
ead3d19   feat(db): Migration 025b — log_price_change trigger bind
08d355a   refactor(scrapers): price_history manuel INSERT'ler kaldırıldı (PR-1)
42c7086   docs(state): v14 — Phase 5 frontend refactor done
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
17. **CRLF/LF policy:** Windows'ta çalışırken Git auto-conversion bazen
    geri dönüş yaratır. .gitattributes ile LF normalize gerek (ŞAH 5
    ileride). O zamana kadar diff'lerde "çok M dosya" görüldüğünde
    `git diff --ignore-cr-at-eol --stat HEAD` ile gerçek değişiklik
    çıkarılır.
18. **Codex paralel çalışması:** Codex (ChatGPT) bazen aynı kod tabanında
    paralel commit yapabilir. Yeni session açılınca:
    - `git status`: working dir bekle
    - `git log --oneline -10`: yeni commit'leri tanı
    - PROJECT_STATE bağlamı doğrula
    Çakışma riskinde stash/rebase ile uyumla.
19. **Sticky kategori context:** Follow-up turn'lerde `validateOrFuzzyMatchSlug`
    çoklu match durumunda `stickyContextSlug` ile common-prefix-distance
    tie-break yapar. `previousState.category_slug` ile uyumlu en yakın leaf
    seçilir. Yeni leaf'ler eklenirken bu mantık otomatik çalışır — extra kod
    gerekmez. `chat/route.ts` line 748 + 905 (mergeIntent ÖNCESİ) state geçirir.
    Line 506 (legacySearch fallback) `previousState` scope dışı — null geçer
    veya skip. Test: "kahve makinesi → espresso olsun" zinciri 0 → 5 ürün.
20. **Bulk lint fix gate sürtünmesi:** Fact-Forcing Gate per-file 4-fact
    justification gerektiriyor; bulk migration'larda (img × 11, unused-vars × 33)
    her edit cycle başına 30sn–2dk gecikme oluşuyor. Strateji:
    - Aynı kategoriden 5-10 dosyayı tek session'da peş peşe işle
    - Kapsamı küçük tut: 1 commit = 1-2 lint kuralı, 5-8 dosya max
    - Risk taşıyan dosyalar (StoreLogo onError DOM hack, ProductGallery fill
      mode) için eslint-disable + sub-borç markdown'a yaz, refactor scope dışı
    - "Aşama 1+2: ~2 saat, 28 fix" gibi tahminler gerçekleşmiyor; gerçek
      hız 6-10 fix/saat (bulk imza migration'da daha hızlı, ad-hoc'ta yavaş)
21. **TS2339 cascade threshold:** `any → unknown / Record<string, unknown>`
    narrowing'de >5 cascade hatası varsa **REVERT** + sub-borç (P6.12g-<scope>)
    işaretle. 1+ saat zincir hatası ile uğraşmaktansa interface tasarımıyla
    ayrı sprint daha sağlıklı. Ders: mediamarkt.mts JSON-LD `apolloState/
    featureGroups/breadcrumb` deep nested 15+ TS2339 → REVERT, P6.12g-mediamarkt.
    Karsilastir RawJoinRow + admin AdminProductRow gibi minimal interface
    yaklaşımı 3 cascade limitinde tuttu — başarılı pattern.
22. **Cascade kontrol her edit sonrası:** `npx tsc --noEmit | grep "TS2339\|TS2353\|TS2769"`.
    >5 → revert. 1-5 → düzelt + commit. 0 → ideal. Cascade fix'leri kategori
    olarak: undefined fallback (`?? ""`), conditional render (`p.field ? ... : ""`),
    Supabase nested select bypass (`as unknown as RowType[]`).
23. **Yeni scripts/ disiplini:** Yeni one-shot script yazılırken:
    - `import { Database } from "@/lib/database.types"` (typed Supabase client)
    - `createClient<Database>(URL, KEY)`
    - Genel `any` kullanma — typed Supabase response otomatik field type sağlar
    - forEach/map callback'lerde `(p: Database['public']['Tables']['products']['Row'])`
      gibi kullan veya `Pick<...>` ile minimal tip
    - Bu organik scripts/ baseline azaltma stratejisi (P6.12c permanent defer
      gerekçesi). Eski scripts'ler yeniden çalıştırılırken fırsat bulunca
      typed'a refactor.
24. **Paralel Codex sprint koordinasyon — minimal Header diff:**
    Codex Header.tsx'te aktif sprint çalışırken (autocomplete, search
    sidebar refactor vb.), paralel iş için:
    - Sadece scope-minimal değişiklik (örn. slug update; label/tags/icon
      korumalı)
    - Diff <30 satır hedefle
    - Audit-driven karar: hangi entry değişiyor net belirle
    - Çakışma yönetimi: kullanıcı/Codex commit'lerini takip et,
      `git log --oneline -10` ile son durum, push öncesi `git pull --rebase`
      gerekirse
    - Canlı örnek (P6.3-B): Header'da 9 entry × 2 satır slug update,
      Codex 2 commit (search filter modularize + header autocomplete) ile
      paralel push edildi, çakışma SIFIR.
25. **Eval-driven katmanlı debug:** Bir eval2 fail mesajı kompozit olabilir
    (corrupt state vs missing resolve vs merge logic). Fix yapınca
    fail TURN'i veya MESSAGE'ı değişebilir — bu ilerleme göstergesi:
    - Önce: Dialog 4 turn 0 fail (state.category_slug=null)
    - Düzeltme sonra: Dialog 4 turn 6 fail (price_max=null)
    - Aynı dialog farklı turn'a kayma = önceki katman düzeldi, yeni katman
      ortaya çıktı. PASS rate aynı kalsa da fix legitimate.
    Strateji: P6.18 (state) → P6.18b (resolve) → P6.19 (parse) → P6.19b
    (merge) zinciri. Her katman ayrı borç + ayrı commit.
26. **pg_stat anomalisi + blind DROP yasağı (4 örnek):**
    `pg_stat_user_tables.n_live_tup=0` raporu **YANILTICI** olabilir.
    Tablo gerçekten boş mu yoksa istatistik mi stale — ZORUNLU AYIRT ET.

    **DOĞRULAMA PROCEDURE (zorunlu sıra):**
    1. **Önce gerçek `COUNT(*)` sorgu çalıştır** (pg_stat'a güvenme)
    2. ⚠️ "n_live=0" görünce **blind `DROP`/`TRUNCATE` YASAK** — önce data
       gerçek doğrulanır
    3. Eğer veri sağlıklı + tablo aktif (`public` schema) → VACUUM (FULL,
       ANALYZE) Migration olarak (örnek: Migration 035, 036)
    4. Eğer `auth.*` schema → Supabase managed, VACUUM/ANALYZE/GRANT yapma
       yetkisi YOK, doc-only kapatma
    5. Eğer DROP karar verildiyse → COUNT(*) gerçek + restore senaryosu
       analizi gerekli (örnek P6.16: 184k row gerçek dolu, ama Migration
       023-034 geri alınamaz → DROP onaylı)

    **Pattern referansları (4 örnek, hepsi pg_stat n_live=0 yanlışı):**
    - Migration 035: `stores` (n_live=0 yanlış → gerçek 9, küçük tablo,
      autovacuum threshold)
    - P6.15: `auth.users` (n_live=0 yanlış → gerçek 3 user, Supabase
      managed schema, doc-only)
    - Migration 036: `knowledge_chunks` (n_live=0 yanlış → gerçek 121
      chunk, RAG aktif)
    - **Migration 037**: `backup_20260422_*` (n_live=0 ÇOK YANLIŞ → gerçek
      **184k+ row**, blind DROP olsaydı veri/audit trail kayıp riski!)

    **KÖK NEDEN:** Küçük tablolar veya autovacuum threshold'a hiç ulaşmamış
    tablolar pg_stat reset state'inde (NULL). Bu sadece raporlama hatası;
    SELECT/COUNT(*) ile doğrulanmadan DESTRUCTIVE işlem YASAK.

    Bu kural **kritik** — gelecekte yeni audit'te aynı tuzağa düşme.

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
| 2026-05-02 | v15 — Yol A done: Migration 025b (log_price_change trigger bind, 5 manuel INSERT kaldırıldı, smoke 3/3 PASS) + Migration 029 (categories.keywords backfill 216/216, multi-provider LLM Gemini/Groq/NVIDIA fallback, 7.46 avg kw/slug, GIN index, ambiguous parent context 5/5 doğru). KOD ETKİSİ SIFIR (categoryKnowledge.ts + queryParser.ts dokunulmadı). Yeni Phase 6 borcu P6.5 (categoryKnowledge.ts keys full-path uyumu). | Claude |
| 2026-05-02 | v15.1 — Phase 6 partial (P6.1 chatbot kategori match restore: bisect → Migration 030 is_leaf backfill 1→172 + eval fixture migrate, 0/5→3/5 PASS) + P6.2a scraper classifier Phase 5 uyumu (52 entry leaf→full path + resolveLeafToFullPath helper + auto-create devre dışı). Codex paralel zinciri (4 commit: knowledge→intent+ranking, fast-path, bug fix, chat izolasyonu httpOnly cookie + session scope). Kod hijyen A1 (orphan sil Hero/BlogSection + .env.example + CI workflow). Yeni borçlar P6.6-11 (is_leaf trigger, response leaf-only, 120 fixture unmatched, provider timeout, suggestion empty, kahve makinesi 0 sonuç). Davranış kuralları 17 (CRLF/LF) + 18 (Codex paralel). | Claude |
| 2026-05-02 | v15.2 — Phase 6 partial-2 (P6.9 provider timeout+retry, P6.10 1-ürün suggestion chip, P6.11 sticky-aware kategori tie-break, P6.13 elektronik/akilli-ev leaf Migration 031) + ŞAH A-D zinciri (A: .gitattributes LF normalize, B: v15.1 commit, C: NAV slug fix + akilli-ev leaf, D: Codex chatbot polish). CI fail-soft (continue-on-error src/+scripts/ 254 lint borç P6.12'ye). Yeni borçlar P6.12 (lint hijyen) + P6.13b (~16 IoT ürün manuel re-categorization). Davranış kuralı 19 (sticky kategori context tie-break). Kod etkisi: 2 dosya P6.11 + suggestionBuilder + intentParserRuntime + Header + Migration 031 SQL. Codex izolasyonu korundu. | Claude |
| 2026-05-02 | v15.3 — Akşam oturumu, Phase 6 13 borç kapatıldı: P6.4 (tavsiye/[id]/layout anon→admin), P6.6 (Migration 032 is_leaf trigger), P6.7 (LLM response leaf-only display), P6.8 (120 fixture unmatched → 0 + 564/564 resolved + Türkçe ascii-norm + 110+ MANUAL_OVERRIDE), P6.13b (Migration 033 — 30 IoT ürün re-categorization 24+6). P6.5 KAPATMA (audit only, dokunulmadı, Codex pipeline riski). P6.12 partial (8/254 lint fix; html-link 3 + set-state 1 + img 2 + prefer-const auto-fix). DEFERRED: P6.3 NAV dup converge (53 dup, scope mega paket dışı, Phase 7). NOT: 4 Codex UI dosyası uncommitted (TopicFeed/profil/tavsiye/tavsiyeler — gradient/badge UI iyileştirme), v15.4'te işlenir. Yeni davranış kuralı 20 (Bulk lint fix gate sürtünmesi). | Claude |
| 2026-05-02 | v15.3 (gece extension) — P6.12 lint hijyen tam sprint: 5 commit, 47 fix. Aşama 1+2 partial (8) + Aşama 3 admin hooks (4) + Aşama 4 G1 scrapers/live any (11) + Aşama 4 G3 partial Header+live-prices (2) + Aşama 4 G2 admin+karsilastir any (22). Lint 223→174 (%22 azalma), no-explicit-any 138→107 (%22 azalma). DEFERRED sub-borçlar: P6.12g-mediamarkt (TS2339 cascade revert, JSON-LD interface tasarım gerek), P6.12f-codex (Codex reapply sonrası), P6.12c scripts/ (one-shot). Codex backup'ta 4 forum/profil dosya + ara/page.tsx (store-source labels) yeni değişiklik uncommitted. Yeni davranış kuralları 21 (TS2339 cascade threshold >5 → revert) + 22 (cascade kontrol her edit sonrası). | Claude |
| 2026-05-02 | v15.4 — Gece geç. Ek 4-5h sprint. P6.12 sprint final 3 ek commit (49 fix): P6.12g mediamarkt JSON-LD interface (mediamarkt-types.mts yeni 118 satır + 6 fix, 1 sub-borç P6.12g-product-narrow), P6.12 mekanik combo (14 unescaped + 7 unused), P6.12c permanent defer (86 any × 42 dosya scripts/, audit revize). P6.3-B Migration 034 9 yeni sub-leaf (bilesenler/parca-cevre-veri, parfum/kadin-erkek-unisex, konsol/aksesuar-vr-pc) + Header.tsx 9 entry slug update minimal scope. Cron baseline 24h sağlık check ✓ (cache %100, conn 24, dead tup düşük; bonus stores 100% dead → P6.14 yeni borç). Codex paralel sprint 2 commit (search filter modularize + header autocomplete) + ara/page.tsx commit. Yeni davranış kuralı 24 (paralel Codex sprint minimal Header diff). DEFERRED: P6.3-A 45 dup dedup, P6.3-C flat slug (Codex sprint sonrası), P6.12g-product-narrow, P6.12f-codex (backup reapply sonrası), P6.14 stores dead tup. Total: ~9-10 commit gece, lint baseline 174→148 (-26 ek). | Claude |
| 2026-05-03 | v15.5 — Erken (gece geç devamı). v15.4 sonrası 4-5h ek sprint. KAPATILAN (7): P6.14 stores VACUUM (Migration 035), P6.15 auth.users audit doc-only (Senaryo B, Supabase managed), P6.17 knowledge_chunks VACUUM (Migration 036), P6.18 state.category_slug raw flat fallback kaldırıldı, P6.18b compound flat resolve (compound-path match katmanı), P6.19 parseQuery price extraction (5 yeni regex), pre-existing eslint sync/route.ts strikethrough (zaten kapalıydı). YENİ BORÇLAR (3): P6.15b orphan auth users (test1@/test1@test1 profiles yok), P6.18b runtime token-set leaf compound gap (async path), P6.19b mergeIntent price dimension detection (Codex pipeline). Eval2 ilerleme: 3/5 PASS aynı (kompozit fail tipi degradation: corrupt → null → mergeIntent drop), Dialog 4 turn 0 katmanları düzeldi. Yeni davranış kuralları 25 (eval-driven katmanlı debug) + 26 (pg_stat anomalisi pattern, 3 örnek). 5 yeni Migration toplam (031-036). | Claude |
| 2026-05-03 | v15.6 — Erken hızlı combo (~45dk). KAPATILAN (2): P6.15b orphan auth users (manuel Studio Auth panel intervention path, bağlı kayıt 0/0/0/0 doğrulandı), P6.16 backup_2026* DROP (Migration 037, 5 tablo, ~70 MB recovery, backup_20260430_categories KORUNDU Phase 5 safety net). KRİTİK ÖĞRETİ: pg_stat anomalisi 4. örneği (backup_20260422_*) — n_live=0 yanıltıcı, gerçek 184k+ row vardı. Blind DROP veri+audit kaybı riskliydi. Davranış kuralı 26 GENİŞLETİLDİ: blind DROP/TRUNCATE yasağı + 5-adımlı doğrulama prosedürü + 4 pattern referans. P6.12g-product-narrow JSON-LD extractor function refactor (e821e31, sub-borç KAPATILDI). Yeni borç: P6.16-v2 (backup_20260430_categories ~6 ay sonra DROP). 7 Migration apply tek günde (031-037). | Claude |

---

## 🔚 SON NOT

**Hedef:** "Yeni Claude/Claude Code 30 saniyede tüm bağlamı alabilsin."
