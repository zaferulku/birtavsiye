-- Migration 006: listings tablosuna raw_* kolonlar
--
-- Amac: Scraperlarin ham veriyi (specs, images, description) listing-spesifik
--   olarak saklayabilmesi. Store'lar arasi farkliliklari korur.
--   products tablosundaki canonical specs/images/description ile cakismaz.
--
-- Idempotent: IF NOT EXISTS ile tekrar calistirilabilir.

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS raw_specs JSONB,
  ADD COLUMN IF NOT EXISTS raw_images TEXT[],
  ADD COLUMN IF NOT EXISTS raw_description TEXT;

COMMENT ON COLUMN listings.raw_specs IS 'Store-spesifik ham specs (key-value flat). Ornek: {"Filtre Tipi": "HEPA"}';
COMMENT ON COLUMN listings.raw_images IS 'Store-spesifik ham gorsel URL listesi';
COMMENT ON COLUMN listings.raw_description IS 'Store-spesifik ham urun aciklamasi';
