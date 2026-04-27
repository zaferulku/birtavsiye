-- Migration 007: products.is_accessory flag
-- Aksesuar/yedek parça/sarf malzeme tespit edilmiş ürünleri işaretle.
-- Detector: src/lib/accessoryDetector.mts

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_accessory boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accessory_reason text,
  ADD COLUMN IF NOT EXISTS accessory_detected_at timestamptz;

-- Aksesuar olmayanların hızlı sorgulanması için partial index
CREATE INDEX IF NOT EXISTS idx_products_main_only
  ON products (category_id)
  WHERE is_accessory = false;

COMMENT ON COLUMN products.is_accessory IS
  'Ürün ana ürün değil; aksesuar/yedek parça/sarf malzeme. Detector: src/lib/accessoryDetector.mts';
COMMENT ON COLUMN products.accessory_reason IS
  'title_keyword | title_main_product_missing | price_too_low | category_context_mismatch';
COMMENT ON COLUMN products.accessory_detected_at IS
  'Aksesuar tespit zamanı (audit veya scrape ingestion).';
