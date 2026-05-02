-- ============================================================================
-- Migration 043 - Self-named duplicate leaf cleanup
-- ============================================================================
-- KOK: Migration 040 (weak leaf) ve 041 (tag leaf) urettiklerde, cat label
-- slug'in son segmenti ile aynı oldugunda duplicate olusturdu:
--   - Cat slug: elektronik/telefon/akilli-telefon
--   - Cat label: 'Akilli Telefon' -> slugify('Akilli Telefon') = 'akilli-telefon'
--   - Yeni leaf slug: elektronik/telefon/akilli-telefon/akilli-telefon (DUPLICATE)
--
-- Kullanici raporu (breadcrumb): 'Anasayfa / Elektronik / Telefon /
-- Akilli Telefon / Akilli Telefon' (fazladan tekrar).
--
-- TESPIT: 8 self-named duplicate leaf var:
--   elektronik/bilgisayar-tablet/yazici/yazici
--   elektronik/bilgisayar-tablet/laptop/laptop
--   elektronik/telefon/akilli-telefon/akilli-telefon
--   elektronik/ag-guvenlik/modem/modem
--   elektronik/tv-ses-goruntu/soundbar/soundbar
--   spor-outdoor/bisiklet/bisiklet
--   pet-shop/akvaryum/akvaryum
--   saglik-vitamin/spor-besin/pre-workout/pre-workout
--
-- COZUM:
--   1. Bu duplicate'lara bagli products.category_id'yi parent'a tasi (FK güvenlik)
--   2. Duplicate kategorileri sil
--   3. Header.tsx ayrica guncellenir (slug parent'a geri).
--
-- IDempotent: WHERE slug IN (...) - tekrar calisirsa 0 row affected.
-- ============================================================================

BEGIN;

-- 1. Products'i parent kategorisine tasi (FK guvenlik)
UPDATE products
SET category_id = (
  SELECT parent_id FROM categories WHERE id = products.category_id
)
WHERE category_id IN (
  SELECT id FROM categories
  WHERE slug IN (
    'elektronik/bilgisayar-tablet/yazici/yazici',
    'elektronik/bilgisayar-tablet/laptop/laptop',
    'elektronik/telefon/akilli-telefon/akilli-telefon',
    'elektronik/ag-guvenlik/modem/modem',
    'elektronik/tv-ses-goruntu/soundbar/soundbar',
    'spor-outdoor/bisiklet/bisiklet',
    'pet-shop/akvaryum/akvaryum',
    'saglik-vitamin/spor-besin/pre-workout/pre-workout'
  )
);

-- 2. Self-named duplicate kategorileri sil
DELETE FROM categories
WHERE slug IN (
  'elektronik/bilgisayar-tablet/yazici/yazici',
  'elektronik/bilgisayar-tablet/laptop/laptop',
  'elektronik/telefon/akilli-telefon/akilli-telefon',
  'elektronik/ag-guvenlik/modem/modem',
  'elektronik/tv-ses-goruntu/soundbar/soundbar',
  'spor-outdoor/bisiklet/bisiklet',
  'pet-shop/akvaryum/akvaryum',
  'saglik-vitamin/spor-besin/pre-workout/pre-workout'
);

COMMIT;

-- ============================================================================
-- DOGRULAMA
-- ============================================================================
-- Beklenen: 1683 -> 1675 active categories (-8).
--
-- SELECT COUNT(*) FROM categories WHERE is_active = true;
--
-- Self-named pattern audit (0 sonuc beklenir):
-- SELECT slug FROM categories
-- WHERE slug ~ '/([^/]+)/\1$';
