-- ============================================================================
-- Migration 025 — Multi-Merchant Price Comparison Schema Foundation
-- ============================================================================
-- KÖK: Multi-merchant fiyat karşılaştırma platformu için temel altyapı.
-- - pg_trgm extension (fuzzy title search)
-- - normalize_gtin helper (8/12/13/14 → 14 hane standart)
-- - updated_at otomatik trigger (4 tablo)
-- - log_price_change function YARATILIR ama TRIGGER BAĞLANMAZ
--   (5 scraper manuel INSERT yapıyor; refactor 025b'de yapılacak — çift kayıt
--   önleme)
-- - categories.level + products.category_slug denormalize alanları (auto-sync)
-- - product_summary materialized view (homepage + listing pages için)
-- - idx_products_title_trgm GIN (fuzzy search hızı)
--
-- IDEMPOTENT: Tüm DDL `IF NOT EXISTS` / `CREATE OR REPLACE` /
-- `DROP IF EXISTS` pattern'ini kullanır. Mevcut category_slug değerleri
-- korunur (UPDATE WHERE IS DISTINCT FROM ile sadece eksik/yanlış satırlar
-- yenilenir).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Extension: pg_trgm (trigram similarity, fuzzy text matching)
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ----------------------------------------------------------------------------
-- 2. normalize_gtin: 8/12/13/14 hane GTIN/EAN/UPC → 14 hane standart
-- ----------------------------------------------------------------------------
-- GS1 standardı: GTIN-14 (left-pad with 0). EAN-8/UPC-12/EAN-13 → 14 hane.
-- Non-numeric / yanlış uzunluk → NULL.
CREATE OR REPLACE FUNCTION normalize_gtin(input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cleaned TEXT;
BEGIN
  IF input IS NULL OR length(trim(input)) = 0 THEN
    RETURN NULL;
  END IF;
  cleaned := regexp_replace(trim(input), '\D', '', 'g');
  IF length(cleaned) NOT IN (8, 12, 13, 14) THEN
    RETURN NULL;
  END IF;
  RETURN lpad(cleaned, 14, '0');
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. updated_at otomatik trigger function + 4 tabloya bağlama
-- ----------------------------------------------------------------------------
-- price_history append-only olduğu için updated_at almaz.
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_updated ON products;
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_categories_updated ON categories;
CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_listings_updated ON listings;
CREATE TRIGGER trg_listings_updated BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_stores_updated ON stores;
CREATE TRIGGER trg_stores_updated BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ----------------------------------------------------------------------------
-- 4. log_price_change function (BAĞLI DEĞİL — Migration 025b'ye kadar bekler)
-- ----------------------------------------------------------------------------
-- Scraper'lar (scrape-mediamarkt-by-category.mjs, scrape-pttavm-loop.mjs,
-- src/app/api/sync/route.ts) listings.price güncellerken price_history'e
-- manuel INSERT atıyor. Şimdi trigger bağlarsak çift kayıt olur.
-- 025b'de scraper'lar refactor edilip manuel INSERT'ler kaldırılınca trigger
-- bağlanacak.
CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (NEW.price IS DISTINCT FROM OLD.price) THEN
    INSERT INTO price_history (listing_id, price, recorded_at)
    VALUES (NEW.id, NEW.price, NOW());
  END IF;
  RETURN NEW;
END;
$$;

-- !!! TRIGGER BAĞLAMA YOK — Migration 025b'de yapılacak !!!

-- ----------------------------------------------------------------------------
-- 5. categories.level denormalize + auto-sync trigger
-- ----------------------------------------------------------------------------
ALTER TABLE categories ADD COLUMN IF NOT EXISTS level INT;

-- Backfill (recursive CTE) — sadece eksik/yanlış olanlar
WITH RECURSIVE tree AS (
  SELECT id, parent_id, 0 AS lvl FROM categories WHERE parent_id IS NULL
  UNION ALL
  SELECT c.id, c.parent_id, t.lvl + 1
  FROM categories c
  JOIN tree t ON c.parent_id = t.id
)
UPDATE categories c
SET level = t.lvl
FROM tree t
WHERE c.id = t.id
  AND (c.level IS DISTINCT FROM t.lvl);

CREATE OR REPLACE FUNCTION sync_category_level()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  parent_level INT;
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.level := 0;
  ELSE
    SELECT level INTO parent_level FROM categories WHERE id = NEW.parent_id;
    NEW.level := COALESCE(parent_level, 0) + 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_categories_level_sync ON categories;
CREATE TRIGGER trg_categories_level_sync
  BEFORE INSERT OR UPDATE OF parent_id ON categories
  FOR EACH ROW EXECUTE FUNCTION sync_category_level();

-- ----------------------------------------------------------------------------
-- 6. products.category_slug denormalize + auto-sync (2 trigger)
-- ----------------------------------------------------------------------------
-- products.category_id → categories.slug (hierarchik full path) cache.
-- Listing query'leri JOIN'siz okuyabilsin diye.
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_slug TEXT;

UPDATE products p
SET category_slug = c.slug
FROM categories c
WHERE p.category_id = c.id
  AND (p.category_slug IS DISTINCT FROM c.slug);

-- Trigger A: products.category_id değişince category_slug güncellenir
CREATE OR REPLACE FUNCTION sync_product_category_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  cat_slug TEXT;
BEGIN
  SELECT slug INTO cat_slug FROM categories WHERE id = NEW.category_id;
  NEW.category_slug := cat_slug;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_cat_slug_sync ON products;
CREATE TRIGGER trg_products_cat_slug_sync
  BEFORE INSERT OR UPDATE OF category_id ON products
  FOR EACH ROW EXECUTE FUNCTION sync_product_category_slug();

-- Trigger B: categories.slug değişince ilgili products.category_slug cascade
CREATE OR REPLACE FUNCTION cascade_category_slug_to_products()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.slug IS DISTINCT FROM OLD.slug THEN
    UPDATE products
      SET category_slug = NEW.slug
    WHERE category_id = NEW.id
      AND (category_slug IS DISTINCT FROM NEW.slug);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_categories_slug_cascade ON categories;
CREATE TRIGGER trg_categories_slug_cascade
  AFTER UPDATE OF slug ON categories
  FOR EACH ROW EXECUTE FUNCTION cascade_category_slug_to_products();

-- ----------------------------------------------------------------------------
-- 7. products.title GIN trigram index (fuzzy search)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_title_trgm
  ON products USING GIN (title gin_trgm_ops);

-- ----------------------------------------------------------------------------
-- 8. product_summary materialized view
-- ----------------------------------------------------------------------------
-- Homepage / category listing / fiyat karşılaştırma kart query'leri için
-- single-table read. listings.in_stock=true filtreli min/max/avg.
DROP MATERIALIZED VIEW IF EXISTS product_summary;
CREATE MATERIALIZED VIEW product_summary AS
SELECT
  p.id,
  p.title,
  p.slug,
  p.brand,
  p.model_family,
  p.category_id,
  p.category_slug,
  p.image_url,
  p.gtin,
  COUNT(DISTINCT l.id)                                           AS listing_count,
  COUNT(DISTINCT l.store_id)                                     AS store_count,
  MIN(l.price) FILTER (WHERE l.in_stock = true)                  AS min_price,
  MAX(l.price) FILTER (WHERE l.in_stock = true)                  AS max_price,
  AVG(l.price) FILTER (WHERE l.in_stock = true)                  AS avg_price,
  MAX(l.updated_at)                                              AS last_listing_update,
  p.created_at,
  p.updated_at
FROM products p
LEFT JOIN listings l ON l.product_id = p.id
WHERE p.is_active = true
GROUP BY p.id;

CREATE UNIQUE INDEX idx_product_summary_id ON product_summary(id);
CREATE INDEX idx_product_summary_category_slug ON product_summary(category_slug);
CREATE INDEX idx_product_summary_brand ON product_summary(brand);

REFRESH MATERIALIZED VIEW product_summary;

COMMIT;

-- ============================================================================
-- VERIFY (Studio'da ayrıca çalıştır)
-- ============================================================================

-- 1. Extension
SELECT extname FROM pg_extension WHERE extname = 'pg_trgm';
-- Beklenen: 1 satır (pg_trgm)

-- 2. categories.level dağılımı
SELECT level, COUNT(*) FROM categories GROUP BY level ORDER BY level;
-- Beklenen: 0=15, 1=~30, 2=~80, 3=??

-- 3. products.category_slug doluluk
SELECT
  COUNT(*) AS toplam,
  COUNT(category_slug) AS slug_dolu,
  COUNT(*) - COUNT(category_slug) AS slug_bos
FROM products WHERE is_active = true;
-- Beklenen: ~44,452 toplam ≈ ~44,452 slug_dolu, 0 slug_bos

-- 4. Trigger listesi
SELECT trigger_name, event_object_table, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public' AND trigger_name LIKE 'trg_%'
ORDER BY event_object_table, trigger_name;
-- Beklenen: 7 satır
--   trg_categories_level_sync (BEFORE INSERT OR UPDATE OF parent_id)
--   trg_categories_slug_cascade (AFTER UPDATE OF slug)
--   trg_categories_updated (BEFORE UPDATE)
--   trg_listings_updated (BEFORE UPDATE)
--   trg_products_cat_slug_sync (BEFORE INSERT OR UPDATE OF category_id)
--   trg_products_updated (BEFORE UPDATE)
--   trg_stores_updated (BEFORE UPDATE)

-- 5. Mat view
SELECT COUNT(*) FROM product_summary;
SELECT category_slug, COUNT(*) FROM product_summary
  GROUP BY category_slug ORDER BY 2 DESC LIMIT 10;
-- Beklenen: ~44,452 satır + top 10 kategori
