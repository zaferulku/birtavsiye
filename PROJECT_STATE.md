# Birtavsiye.net — Proje Durumu

> **Bu dosya tek kaynak gerçek.** Yeni sohbet/oturum başlattığınızda 
> bu dosyayı Claude veya Claude Code'a verin — tüm bağlamı 30 saniyede alır.
>
> **Güncelleme kuralı:** Yeni karar/durum oluştuğunda buraya 1-2 satır ekleyin.
>
> **Son güncelleme:** 2026-04-26 v4 (chatbot UX tamam, Header tamam, kategori sayfaları çalışıyor)

---

## 🎯 PROJE TANIMI

**Birtavsiye.net** — Türkçe fiyat karşılaştırma + AI tavsiye sitesi.

### Konumlandırma
- **Doğrudan rakipler:** Akakçe, Cimri, Akçeli, Pricet
- **Farklılaşma noktası:** Anlam katmanında çalışır + **proaktif chatbot ile rehberlik**.
- **Hedef kitle:** Türkçe konuşan, alışveriş kararı vermeden önce bilgi/tavsiye arayan kullanıcı

### Teknoloji yığını
- **Framework:** Next.js 16 (App Router)
- **DB:** Supabase (PostgreSQL + pgvector)
- **Hosting:** Vercel
- **AI sağlayıcılar:**
  - **NVIDIA NIM** — Llama 3.3 70B (chatbot intent + response)
  - **Groq** — Llama 70B (fallback)
  - **Gemini** — embedding (768-dim) + classify (Flash Lite, Flash)
- **State management:** Zustand (chatbot UI, persist middleware)
- **Styling:** Tailwind CSS

### Ekip
- **Sahibi:** Non-technical, Claude Code'u implementer olarak kullanıyor
- **Mimar/Reviewer:** Claude (sohbet) — strateji + kod incelemesi
- **İletişim dili:** Türkçe, direkt, gereksiz preamble yok

---

## 🔥 ŞU AN AKTIF (Bu hafta)

### 1. Faz 1 — Backup'tan canonical'a LLM classify

**Durum:** 1000 ürün test arka planda devam (bm2rckq2a). Sonra full başlatma.

**Akış:**
- 43,176 backup ürün → Gemini ile classify → products tablosuna ekle
- Brand temizleme (Galaxy → Samsung, Orjinal → Lenovo)
- Kategori atama, model_family çıkarma
- Quality_score, classified_at, classified_by audit alanları
- Multi-model fallback (gemini-flash-lite → 2.0-flash; gemma-3 kaldırıldı)
- Resume + idempotent
- Embedding NULL — sonra backfill (kotayı koru)

**Sonuçlar:**
- 50 dry-run: %96 başarı
- 100 gerçek test: 76 ürün eklendi
- 1000 test devam: bm2rckq2a

**Full başlatma sonrası:** ~29 gün arka plan, free tier 1500 RPD

**Embedding stratejisi (henüz karar yok):**
- Strateji 1: Bekle, sonra topluca (~58 gün)
- Strateji 2: Gündüz classify, gece embed (~29 gün)
- Strateji 3: Multi-key veya paid (birkaç gün)

### 2. 83 Keşfedilmemiş DB Sub-Kategorisi

Header 68 kırık fix tamamlandı ama DB'de var olan 83 kategori 
(`kahve-makinesi`, `mikrodalga`, `blender-robot`, `fritoz-airfryer`, 
`hava-temizleyici`, `powerbank` vb.) Header'da link yok.

Plan: Sonraki Header refactor turunda. Şimdilik teknik borç.

---

## 📋 YAKIN ÖNCELİK

### Mağaza entegrasyonları
**Şu an canlı sadece PttAVM.**
- MediaMarkt — URL pattern alignment
- Trendyol — URL pattern + anti-bot
- Hepsiburada — Hiç entegre değil
- N11, Vatan, Teknosa, Migros — Aday

### chat_session_id (race condition fix — backend)
useChatStore v3'te chatSessionId üretiliyor. Backend recordFeedback'te 
session-scoped'a geçirilmeli.

### AbortController
Provider çağrıları timeout'lu ama route abort'ta dış LLM devam ediyor.
intentParserRuntime + provider chain'lere AbortController.

### Embedding cron
Faz 1 başladıktan sonra `scripts/backfill-embeddings.mjs` günlük cron.

---

## 🌟 UZAK ÖNCELİK

### Ürün eşleştirme engine
5 katmanlı: GTIN → rule → semantic → manuel → feedback. ~5 gün.

### Wave 3 KB dokümanları
Mevcut: 12 doküman / 141 chunk. Hedef: küçük ev aletleri, spor, otomotiv.

### Forum MVP polish
En iyi cevap, faydalı bul, raporlama, spam filter, profil.

### Header tam yeniden yapı
Mevcut: MEGA_MENU constant + categorySlugMap.ts.
İdeal: DB'den dinamik fetch. Tahmini: 2-3 saat.

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
| **Server components'ta supabaseAdmin** | 2026-04-26 | **Anon RLS sıkı, boş veri sorunu** |
| Faz 1 strategy A (direkt write) + AGRESİF brand | 2026-04-25 | Gemini her ürün doğrular |
| Faz 1 audit alanları | 2026-04-26 | Sonradan ekleme zor |
| Brand NOT NULL kaldırıldı | 2026-04-26 | "Generic" uydurma yerine NULL |
| gemma-3 kaldırıldı (Faz 1) | 2026-04-26 | 400 errors, fallback yavaşlatıyordu |

---

## 📦 BİLİNEN DURUM

### Veritabanı

**Aktif:**
- `products` — 415+ canonical (339 başlangıç + Faz 1 büyüyor), embedding %100 (Faz 1 NULL)
- `categories` — 177 aktif (Migration 005 sonrası)
- `listings` — Yeni şema, ürün-mağaza-fiyat-stok
- `price_history` — listing_id'ye bağlı zaman serisi
- `agent_decisions` — Tüm kararlar (faz1-classifier dahil)
- `decision_feedback` — Kullanıcı feedback
- `topics`, `topic_answers`, `community_posts` — Forum
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

### Knowledge Base
12 doküman / 141 chunk (`docs/knowledge/`):
parfum_notalari (10), cilt_bakimi (11), makyaj (12), moda_ust_giyim (13), 
moda_alt_giyim (14), moda_ayakkabi (11), elektronik_telefon (9), 
elektronik_laptop (11), beyaz_esya (20), gida (8), pet_shop (11), 
anne_bebek (11) = **141**

### Chatbot mimarisi

```
ChatBar/ChatPanel input
  ↓
useChatStore.addUserMessage() + history
  ↓
router.push("/sonuclar?q=...")
  ↓
fetch("/api/chat", { message, history, chatSessionId })
  ↓
[server] orchestrateChat
  ├── fastPath: match_products RPC (vector)
  └── slowPath:
        - retrieveKnowledge (5dk LRU)
        - parseIntent (Llama + history)
        - extractVariantPatterns (renk/storage)
        - smart_search RPC (hybrid + variant filter)
        - generateResponse (Llama + KB + intent + history)
        - buildSuggestions (chip butonları)
  ↓
agent_decisions log
  ↓
Response: { reply, products, suggestions, meta }
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
- `category`: Telefon, Laptop (gerçek vague)
- `freetext`: "Ekonomik detay", "Denge detay"

**Provider chain:** NVIDIA → Groq → Gemini Flash

### API endpoints

**Aktif:**
- `/api/chat` — Chatbot (history + chatSessionId + suggestions)
- `/api/sync` — Mağaza sync
- `/api/refresh-prices` — Tek ürün (auth)
- `/api/admin/prices/health` — priceHealth dashboard
- `/api/cron/prices` — Periyodik
- `/api/public/products` — Ürün listesi
- `/api/public/products/similar` — Benzer
- `/api/public/topics` / `/api/public/topic-answers` / `/api/public/community-posts` — Forum
- `/api/me/topic-answers` — Kullanıcı (auth)
- `/api/live-prices` — SSE

### Frontend route'ları

| Route | Dosya |
|---|---|
| `/` | src/app/page.tsx |
| `/kategori/[slug]` | src/app/kategori/[slug]/page.tsx |
| `/anasayfa/[...segments]` | src/app/[...segments]/page.tsx (hiyerarşik) |
| `/urun/[slug]` | src/app/urun/[slug]/page.tsx |
| `/sonuclar` | src/app/sonuclar/page.tsx |

### Mağaza scraper'ları

| Mağaza | Durum |
|---|---|
| PttAVM | ✅ Canlı |
| MediaMarkt | 🟡 Interface, URL placeholder |
| Trendyol | 🟡 Interface, URL placeholder + anti-bot |
| Hepsiburada, N11, Vatan, Teknosa, Migros | ❌ Yok |

### Bilinen teknik borçlar

| Borç | Etki | Plan |
|---|---|---|
| 83 keşfedilmemiş DB sub-kategorisi | Erişilemiyor | Sonraki Header turu |
| `products.specs` kirli | Search zayıf | Specs whitelist |
| `brand: "null"` string | Eski kayıtlarda yanlış | Migration veya re-classify |
| Latency yüksek (slow 16s) | UX | Paralel KB+search |
| Faz 1 embedding NULL | Vector search'te yok | Backfill cron veya 29-gün sonu |
| chat_session_id eksik (backend) | Feedback race | Patch hazır, deploy bekliyor |
| AbortController eksik | Token israfı | intentParserRuntime + provider chain |
| Header tam yeniden yapı | DB'den dinamik değil | Uzak öncelik |

---

## 📊 ÖNCEKİ İŞ DALGAlARI

**1:** Agent consolidation (`1ca8a89`)
**2:** Live price (`705de96`, `7eaaae0`) — PttAVM real
**3:** Karşılaştırma + ChatWidget v1 (`d1f00d6`)
**4:** KB foundation (`cac1013`, `10c208c`) — Migration 001 + Wave 1
**5:** KB Wave 2 (`9782cd5`) — 9 doküman, 141 chunk
**6:** Schema migration + güvenlik — prices→listings, alarm, auth, forum, atomik counter, proxy.ts, fonts, priceHealth
**7:** Chatbot RAG (`ae8e705`, `888ea69`) — smart_search, intent, fast/slow, KB, response, orchestrator
**8:** Chatbot UI (04-24 → 04-26) — Zustand v3, ChatBar v3, ChatPanel v3, suggestion chips, mic+image, /sonuclar, history+chatSessionId+variant filter, supabaseAdmin
**9:** Header + Kategori (04-26) — 68 kırık fix (categorySlugMap), Migration 005, URL hierarchy, server components supabaseAdmin
**10:** Faz 1 (04-25 → ongoing) — LLM classifier, multi-model fallback, resume, dry-run %96, 100 gerçek %76, 1000 test devam

---

## ✅ COMMIT GEÇMİŞİ

```
[pending] Faz 1 1000 test (bm2rckq2a, arka plan)
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
adab89b   feat: Parça 4 cleanup
0a9e137   feat: chatbot v3 + persist
f263958   fix: public/products listings schema
888ea69   feat: chatbot RAG integration
ae8e705   feat: intent parser + smart_search
9782cd5   feat: KB Wave 2
```

---

## 🤖 DAVRANIŞ KURALLARI

### Claude (sohbet) için

1. **Bu dosyayı önce oku** — bağlamı buradan al
2. **Kritik Kararları sorgulama** — bilinçli kararlar
3. **Yeni karar verirken** Kritik Kararlar tablosuna ekle
4. **Yeni iş başlattığında** Şu An Aktif listesini güncelle
5. **Tahminle hareket etme** — Bilinen Durum'a bak
6. **Önceki sohbet özetleri güvenilmez** — bu dosya kazanır
7. **UI dosyası overwrite etmeden önce mevcut özellikleri doğrula** — regresyon önle (Parça 6/7 olayı tekrar olmasın)

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
   `src/lib/categoryTree.ts`. Commit `bf38b3d`/`56cabf2`/`4511297` bu sebeple yapıldı.

### Kullanıcı için

1. **Yeni karar verdikçe** Kritik Kararlar tablosuna ekle
2. **Bitmiş iş** Commit Geçmişi'ne ekle
3. **Yeni sohbet açtığında** bu dosyayı paste et
4. **Eksik gelirse** Claude'a "şunu da ekle" de
5. **Disiplini bozma** — güncel kalmazsa açıklama yüküne döneriz

---

## 📞 BAĞLAM SORULARI (FAQ)

**S: Faz 1 nedir?**  
C: 43K backup ürünü Gemini ile classify edip products tablosuna ekleyen pipeline. Brand temizleme + kategori atama + model_family. ~29 gün arka plan (free tier 1500 RPD). Şu an 1000 ürün test devam (bm2rckq2a).

**S: prices vs listings farkı?**  
C: prices eski şema. listings yeni (ürün-mağaza-stok). Aktif yazma listings'e.

**S: Chatbot fast/slow path nedir?**  
C: Fast = "iPhone 15 Pro Max" (vector). Slow = "lavanta deodorant" (KB + intent + hybrid).

**S: Hangi mağazalar canlı?**  
C: Sadece PttAVM. MediaMarkt + Trendyol interface var, URL placeholder.

**S: Embedding ne durumda?**  
C: 339 başlangıç ürünü %100. Faz 1'le gelenler NULL — sonra backfill.

**S: Klasik arama vs Chatbot?**  
C: Header'daki klasik → `/ara` (kelime). ChatBar → `/sonuclar` (RAG, chip).

**S: middleware silinmiş mi?**  
C: HAYIR. Next 16 ile `src/proxy.ts`'e taşındı.

**S: Migration'lar nasıl?**  
C: 001-005 hepsi yüklü. Yeni migration manuel uygulanmalı.

**S: ChatPanel açılma sorunu?**  
C: ÇÖZÜLDÜ. Zustand persist (sessionStorage).

**S: Renk filtresi?**  
C: ÇÖZÜLDÜ. 5/5 senaryo. variant_color/storage smart_search params + extractVariantPatterns.

**S: Header kırık slug?**  
C: ÇÖZÜLDÜ. categorySlugMap.ts + Migration 005. 159/159 link uyumlu.

**S: Ana sayfa/kategori/ürün sayfaları boştu?**  
C: ÇÖZÜLDÜ. Server components supabaseAdmin'e geçirildi (RLS bypass).

**S: Bot chip neden bazen kategori soruyor?**  
C: 4 senaryo: "siyah telefon" → marka, "merhaba" → kategori, marka belli + 6+ ürün → bütçe, spesifik → chip yok.

**S: Faz 1 yeni ürünler embedding'siz mi?**  
C: EVET, kasıtlı. Backfill sonra. Strateji henüz belirlenmedi.

---

## 📌 GÜNCELLEME LOG'U

| Tarih | Ne değişti | Kim |
|---|---|---|
| 2026-04-24 | İlk versiyon | Claude |
| 2026-04-24 | v2 — detaylı yeniden yazım | Claude |
| 2026-04-24 | v3 — current state alignment | Claude |
| 2026-04-26 | v4 — chatbot UX tamam, Header tamam, supabaseAdmin kuralı, Faz 1 ongoing | Claude |

---

## 🔚 SON NOT

**Hedef:** "Yeni Claude/Claude Code 30 saniyede tüm bağlamı alabilsin."
