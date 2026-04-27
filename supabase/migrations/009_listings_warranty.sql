-- 009_listings_warranty.sql
-- PttAVM ürün başlıklarında "İthalatçı Garantili" veya "Apple Türkiye Garantili"
-- gibi notlar fiyatı doğrudan etkiler (ithalatçı garantili genellikle daha ucuz).
-- Bu bilgiyi listing seviyesinde tutup UI'da badge olarak gösterelim.
--
-- Olası değerler:
--   'apple_tr'    → Apple Türkiye Garantili (resmî, yüksek fiyat)
--   'ithalatci'   → İthalatçı / İthal Garantili (paralel ithalat, düşük fiyat)
--   'distri'      → Distribütör Garantili
--   NULL          → Belirtilmemiş / parse edilemedi

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS warranty_type TEXT;

CREATE INDEX IF NOT EXISTS idx_listings_warranty
  ON listings (warranty_type)
  WHERE warranty_type IS NOT NULL;

COMMENT ON COLUMN listings.warranty_type IS
  'Garanti tipi: apple_tr | ithalatci | distri | NULL. PttAVM source_title parsing ile doldurulur.';

-- Backfill: mevcut listing'lerde başlıktan parse et.
-- Sadece source='pttavm' olanlar için (MM zaten resmî dağıtıcı).
UPDATE listings SET warranty_type = 'apple_tr'
  WHERE warranty_type IS NULL
    AND source = 'pttavm'
    AND (source_title ILIKE '%apple türkiye garantili%' OR source_title ILIKE '%apple turkiye garantili%');

UPDATE listings SET warranty_type = 'ithalatci'
  WHERE warranty_type IS NULL
    AND source = 'pttavm'
    AND (source_title ILIKE '%ithalatçı garantili%' OR source_title ILIKE '%ithalatci garantili%'
         OR source_title ILIKE '%ithal garantili%' OR source_title ILIKE '%paralel ithal%');

UPDATE listings SET warranty_type = 'distri'
  WHERE warranty_type IS NULL
    AND source = 'pttavm'
    AND source_title ILIKE '%distribütör garantili%';

-- Doğrulama:
--   SELECT warranty_type, COUNT(*) FROM listings WHERE source='pttavm' GROUP BY 1;
