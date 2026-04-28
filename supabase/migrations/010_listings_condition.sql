-- 010_listings_condition.sql
-- Mağaza listing'lerinde ürünün durumunu (yeni/aksesuarsız/yenilenmiş/2.el/outlet)
-- ayrı bir alanda tutalım. Title'da "NON ACC", "yenilenmiş", "outlet" gibi
-- ifadeler fiyatı ve müşteri kararını doğrudan etkiler.
--
-- Olası değerler:
--   'new'             → Sıfır, kutusunda, tam aksesuarlı (default kabul edilir)
--   'no_accessories'  → Aksesuarsız stok (MediaMarkt "NON ACC" — kutudan kulaklık/şarj eksik)
--   'refurbished'     → Yenilenmiş / renewed
--   'second_hand'     → İkinci el / kullanılmış
--   'outlet'          → Outlet (kutu hasarlı, ürün sıfır olabilir)
--   NULL              → Belirtilmemiş / parse edilemedi → UI'da "yeni" varsayılır

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS condition TEXT;

CREATE INDEX IF NOT EXISTS idx_listings_condition
  ON listings (condition)
  WHERE condition IS NOT NULL;

COMMENT ON COLUMN listings.condition IS
  'Ürün durumu: new | no_accessories | refurbished | second_hand | outlet | NULL. source_title parsing ile doldurulur.';

-- Backfill: mevcut listing'lerde başlıktan parse et.
-- Sıralama önemli: en spesifik pattern önce.

UPDATE listings SET condition = 'refurbished'
  WHERE condition IS NULL
    AND (source_title ILIKE '%yenilenmiş%' OR source_title ILIKE '%yenilenmis%'
         OR source_title ILIKE '%refurbished%' OR source_title ILIKE '%renewed%');

UPDATE listings SET condition = 'second_hand'
  WHERE condition IS NULL
    AND (source_title ILIKE '%ikinci el%' OR source_title ILIKE '%2.el%'
         OR source_title ILIKE '%2. el%' OR source_title ILIKE '%kullanılmış%'
         OR source_title ILIKE '%kullanilmis%' OR source_title ILIKE '%second hand%');

UPDATE listings SET condition = 'outlet'
  WHERE condition IS NULL
    AND source_title ILIKE '%outlet%';

-- MediaMarkt "NON ACC" / "non-acc" / "aksesuarsız" → kutuda aksesuar eksik
UPDATE listings SET condition = 'no_accessories'
  WHERE condition IS NULL
    AND (source_title ILIKE '%non acc%' OR source_title ILIKE '%non-acc%'
         OR source_title ILIKE '%nonacc%' OR source_title ILIKE '%aksesuarsız%'
         OR source_title ILIKE '%aksesuarsiz%');

-- Doğrulama:
--   SELECT condition, COUNT(*) FROM listings GROUP BY 1 ORDER BY 2 DESC;
