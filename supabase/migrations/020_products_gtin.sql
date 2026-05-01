-- ============================================================================
-- Migration 020 — products.gtin kolonu + UNIQUE partial index
-- ============================================================================
-- GTIN (Global Trade Item Number) = EAN-8/12/13/14 barkod. Akakçe-style canonical
-- product matching için en güçlü sinyal (model_code'tan da güçlü).
--
-- MediaMarkt scraper zaten gtin13 alanını çekiyor (mediamarkt.mts:29) ama
-- products tablosuna yazmıyordu. Bu kolon eklendikten sonra:
--   - inferProductIdentity gtin döndürür
--   - resolveExistingProduct GTIN match'i öncelikli kullanır
--   - Backfill ile mevcut 44K ürünün title/spec/desc'inden GTIN çıkarılır
-- ============================================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS gtin TEXT NULL;

-- Partial unique index: NULL'lar tekrarlanabilir, GTIN dolu olanlar tekil
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_gtin
  ON products(gtin)
  WHERE gtin IS NOT NULL;

COMMENT ON COLUMN products.gtin IS 'GTIN (EAN-8/12/13/14 barkod). Canonical product matching anchor.';
