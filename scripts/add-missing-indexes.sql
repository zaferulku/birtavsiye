-- Eksik index'ler — benchmark sonuçlarına göre
-- 46k products, 58k price_history üzerinde yavaş sorgular var:
--   products by category_id + order created_at → 1.4s (SLOW)
--   products by slug (detail)                  → 626ms (SLOW — unique olmalı)
--   products by brand + model_code (dedup)     → 346ms
-- Supabase SQL Editor'da çalıştır. CREATE INDEX IF NOT EXISTS — güvenli.

-- ============================================================
-- products
-- ============================================================

-- Kategori sayfası: category_id + order created_at DESC
CREATE INDEX IF NOT EXISTS idx_products_category_created
  ON products (category_id, created_at DESC);

-- Kategori + marka filtresi (kategori sayfasında marka sidebar'ı)
CREATE INDEX IF NOT EXISTS idx_products_category_brand
  ON products (category_id, brand);

-- Slug unique (detail page lookup)
-- Not: slug zaten unique constraint'e sahip olabilir; IF NOT EXISTS bu durumda atlar
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug_unique
  ON products (slug);

-- Brand + model_code (dedup sync sırasında)
CREATE INDEX IF NOT EXISTS idx_products_brand_model_code
  ON products (brand, model_code)
  WHERE model_code IS NOT NULL;

-- ============================================================
-- price_history
-- ============================================================

-- Ürün detay fiyat grafiği: product_id + order recorded_at
CREATE INDEX IF NOT EXISTS idx_price_history_product_recorded
  ON price_history (product_id, recorded_at DESC);

-- Cron'un "son 35 dakika" sorgusu
CREATE INDEX IF NOT EXISTS idx_price_history_recorded
  ON price_history (recorded_at DESC);

-- ============================================================
-- prices
-- ============================================================

-- Ürün sayfası fiyat listesi (en düşükten yükseğe)
CREATE INDEX IF NOT EXISTS idx_prices_product_price
  ON prices (product_id, price ASC);

-- ============================================================
-- Analiz — çalıştırdıktan sonra
-- ============================================================
-- EXPLAIN ANALYZE SELECT id, title FROM products
-- WHERE category_id = '9f8b9ba9-ec64-4254-9e2c-b7d795d31ab7'
-- ORDER BY created_at DESC LIMIT 96;
-- → Index Scan görmelisin, Seq Scan DEĞİL.
