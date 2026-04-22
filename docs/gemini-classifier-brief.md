# Gemini Classifier Brief — Gün 2

## Amaç

Backup'taki 43.176 ürünü Gemini 2.0 Flash ile yeniden sınıflandırıp, temiz canonical yapıya taşımak.

## Dosyalar

3 yeni dosya:
1. `src/lib/ai/geminiClient.ts` — Gemini SDK wrapper
2. `src/lib/classifier/pipeline.ts` — 3 aşamalı classifier
3. `scripts/migration/classify-products.mjs` — Batch processor (asıl çalıştırılacak)

## Ön koşullar

✓ Schema migration tamamlandı
✓ 174 kategori seed edildi
✓ Backup tabloları mevcut (43.176 ürün)
✓ GEMINI_API_KEY .env.local'de

## Kurulum

### Adım 1: Paket yükle

```bash
npm install @google/generative-ai
```

### Adım 2: Dosyaları yerleştir

- `geminiClient.ts` → `src/lib/ai/geminiClient.ts`
- `classifierPipeline.ts` → `src/lib/classifier/pipeline.ts`
- `classify-products.mjs` → `scripts/migration/classify-products.mjs`

### Adım 3: Dry-run (50 ürün)

```bash
node --env-file=.env.local scripts/migration/classify-products.mjs --dry-run --limit=50
```

Bu komut:
- 50 ürün backup'tan okunacak
- Her biri Gemini'ye gönderilecek
- Sonuçlar loglanacak AMA **DB'ye yazılmayacak**
- Rapor: kaç ürün nereye gitti, token kullanımı, tahmini maliyet

**Kullanıcıya raporu göster. Onay bekle.**

### Adım 4: Faz 1 — ELEKTRONİK + BEYAZ EŞYA + KÜÇÜK EV ALETLERİ

Kullanıcı dry-run sonuçlarını onayladıktan sonra:

```bash
node --env-file=.env.local scripts/migration/classify-products.mjs --faz=1
```

**Tahmini:** Süre 3-5 saat, maliyet $2-4, hedef ~15.000-20.000 ürün.

### Adım 5: Faz 2 — DİĞER KATEGORİLER

```bash
node --env-file=.env.local scripts/migration/classify-products.mjs --all
```

Faz 1'de zaten işlenenler cache'te olduğu için atlar.

## Kritik kurallar

1. Her adımdan ÖNCE kullanıcıyı bilgilendir, onay bekle.
2. Dry-run olmadan `--faz=1` çalıştırma.
3. Hata olursa DURDUR.
4. Progress raporunu düzenli aktar.
5. Site tasarımı, forum yapısı, auth vb. hiçbir şeyi DEĞİŞTİRME. Bu script sadece `products`, `listings`, `categorization_cache`, `agent_decisions`, `learned_patterns` tablolarına yazar.

## Hata senaryoları

- **"Cannot find package '@google/generative-ai'"** → `npm install @google/generative-ai`
- **"GEMINI_API_KEY is not set"** → `.env.local` kontrol et
- **"RESOURCE_EXHAUSTED"** → Rate limit. Script otomatik retry yapar. Sürekli hata alıyorsa billing kurulu mu kontrol et.
- **Çok fazla "uncategorized"** → Prompt'taki kategoriler örtüşmüyor. Kullanıcıyla konuş, prompt iyileştir.

## Sonraki adımlar

1. Embedding üret (ayrı script, her canonical product için 768-dim vector)
2. Chatbot'u yeni `match_products` RPC'ye bağla
3. Test: "beyaz telefon" artık fırın getirmemeli
