-- ============================================================================
-- Migration 038 — listings.gtin per-source kolonu
-- ============================================================================
-- KOK: Her pazaryerinde ayni urunun GTIN'i farkli olabilir:
--   - parallel import (resmi distributor + ithalat ayri barkod)
--   - garanti varyantlari ("Apple Turkiye Garantili" vs "Ithalatci Garantili")
--   - scraper normalisazyon farki (kontrol kelimesi vs tirelendiklenmis)
--
-- Mevcut akis: scrape gelen gtin -> products.gtin (canonical) UNIQUE match.
-- Sorun: MM'den gelen GTIN ile PttAVM'den gelen GTIN ayni canonical row'a
-- bagliyken FALSE POSITIVE riski (brand verify P6.22-A'da eklendi ama kanonik
-- semantik yine de "global GTIN = global product" varsayar).
--
-- COZUM: GTIN'i listings tablosunda PER-SOURCE sakla.
--   - listings.gtin: bu satirin kendi platformundan gelen GTIN
--   - products.gtin: kanonik referans (ilk basarili scrape, brand-verified)
--
-- Match akisi (P6.22-D'de implement):
--   1. listings WHERE source=X AND gtin=Y match  -> in-source eslesme
--   2. resolveExistingProduct (brand-verified script) fallback
--   3. yeni canonical product olustur
--
-- IDEMPOTENT: ADD COLUMN IF NOT EXISTS, INDEX IF NOT EXISTS.
-- DESTRUCTIVE OLMAYAN: nullable kolon, default null, mevcut veriyi etkilemez.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. listings tablosuna gtin kolonu ekle
-- ----------------------------------------------------------------------------
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS gtin TEXT;

COMMENT ON COLUMN listings.gtin IS
  'Per-source GTIN/EAN. Bu satirin kendi platformundan scrape edilen barkod. Ayni canonical product''in farkli kaynaklarda farkli GTIN''i olabilir (parallel import, garanti farki). Match akisi: source+gtin in-source eslesmesi -> resolveExistingProduct (brand-verified script) fallback.';

-- ----------------------------------------------------------------------------
-- 2. Per-source GTIN lookup index (match akisinda en sik sorgu)
-- ----------------------------------------------------------------------------
-- Partial: gtin NULL satirlari index'lemiyoruz (yer tasarrufu).
CREATE INDEX IF NOT EXISTS idx_listings_source_gtin
  ON listings(source, gtin)
  WHERE gtin IS NOT NULL;

COMMIT;

-- ============================================================================
-- DOGRULAMA
-- ============================================================================
-- Apply sonrasi check:
--
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'listings' AND column_name = 'gtin';
-- (1 row beklenir: gtin | text | YES)
--
-- SELECT indexname FROM pg_indexes
-- WHERE tablename = 'listings' AND indexname = 'idx_listings_source_gtin';
-- (1 row beklenir)
--
-- Coverage check (P6.22-C scraper update sonrasi olcum):
--
-- SELECT source,
--        COUNT(*) AS total,
--        COUNT(gtin) AS with_gtin,
--        ROUND(COUNT(gtin)::numeric / NULLIF(COUNT(*),0) * 100, 1) AS pct
-- FROM listings
-- WHERE is_active = true
-- GROUP BY source
-- ORDER BY total DESC;
