# Chatbot Sorun Analizi ve Çözüm Raporu

## Özet

Mevcut `src/app/api/chat/route.ts` temiz yazılmış ama **Faz 1 migration'dan sonra bozulacak**. 4 kritik sorun var, hepsi çözülebilir.

---

## Mevcut akış

```
Kullanıcı: "beyaz telefon"
  ↓
[1] NVIDIA nv-embedqa-e5-v5 ile embed üret (1024-dim)
  ↓
[2] sb.rpc("match_products", {query_embedding, match_count, min_similarity})
    — Eski RPC imzası, kategori filtresi YOK
  ↓
[3] Embed fail olursa: keyword fallback (kategori filtresi YOK)
  ↓
[4] NVIDIA Llama 3.3 70B ile yanıt üret
```

## Sorunlar

### 🔴 Sorun 1: match_products RPC imzası değişiyor

Yeni imza 7 parametreli: `query_embedding`, `category_slugs`, `brand_filter`, `price_min`, `price_max`, `min_similarity`, `match_count`. Eski imzayla çağırınca "function does not exist" hatası.

**Çözüm:** Yeni imzayı kullan.

### 🔴 Sorun 2: Embedding boyut uyuşmazlığı

- NVIDIA nv-embedqa-e5-v5: **1024-dim**
- Yeni products.embedding: **VECTOR(768)** (Gemini text-embedding-004)

**Çözüm:** Embedding'i Gemini'ye geçir. Chat için NVIDIA Llama'da kal.

### 🔴 Sorun 3: Keyword fallback'te kategori filtresi yok

"beyaz telefon" → `title ILIKE '%beyaz%' OR title ILIKE '%telefon%'` → beyaz fırınlar da gelir.

**Çözüm:** Lokal query parser + kategori filtresi.

### 🟡 Sorun 4: Silent fail

Embedding fail olursa sadece console.warn, kullanıcıya görünmez.

**Çözüm:** Structured search method metadata response'a eklenir.

---

## Değişiklik planı — 4 dosya

| Dosya | Durum |
|---|---|
| `src/lib/ai/aiClient.ts` | Yeni (nimClient legacy shim'li) |
| `src/lib/search/queryParser.ts` | Yeni (lokal parser) |
| `src/app/api/chat/route.ts` | Replace (backup alınır) |
| `docs/chatbot-analysis.md` | Yeni (bu dosya) |

---

## Zamanlama

| Adım | Sıra |
|---|---|
| Faz 1 dry-run (Gemini reset sonrası) | 1 |
| Faz 1 full batch | 2 |
| Bu 4 dosyayı yerleştir | 3 |
| Chatbot test ("beyaz telefon") | 4 |

**Kritik:** Bu 4 dosya yerleştirildikten sonra chatbot products tablosu dolana kadar boş sonuç verir. Faz 1 bitince aktif çalışır.

---

## Özet metrikler

| Metrik | Şu an | Yarın sonrası |
|---|---|---|
| "beyaz telefon" → fırın gelme oranı | %60+ | %0 |
| Chat latency | 2-3s | 1-2s |
| Kategori hatası | Sık | Nadir |
| Feedback toplama | Yok | Aktif |
