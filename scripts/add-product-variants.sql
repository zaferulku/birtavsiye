-- Ürün variant gruplama için kolonlar
-- Supabase SQL Editor'da çalıştır.
--
-- Amaç:
--   Ürün detay sayfasında aynı modelin farklı renk/hafıza kombinasyonları
--   tek sayfada toplansın. Kullanıcı storage + color seçsin, fiyatlar
--   seçilen variant için farklı satıcılardan sıralansın.
--
-- Schema:
--   products.model_family text     — örnek: "iPhone 16 Pro Max"
--   products.variant_storage text  — örnek: "256GB"
--   products.variant_color text    — örnek: "Beyaz Titanyum"
--
-- Backfill ayrı bir Node script ile yapılır (normalize-variants.mjs).

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS model_family text,
  ADD COLUMN IF NOT EXISTS variant_storage text,
  ADD COLUMN IF NOT EXISTS variant_color text;

-- Varyant gruplama için index
CREATE INDEX IF NOT EXISTS idx_products_family
  ON products (brand, model_family)
  WHERE model_family IS NOT NULL;

NOTIFY pgrst, 'reload schema';
