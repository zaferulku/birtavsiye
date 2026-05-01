-- ============================================================================
-- Migration 023 — Eski (flat) kategorileri DROP
-- ============================================================================
-- ÖN KOŞUL: Migration 022 başarılı, eski kategorilerde aktif ürün 0
-- (siniflandirilmamis + 14 yeni root korunur).
--
-- BACKUP: backup_20260430_categories tablosu yedek (gerekirse restore).
-- ROLLBACK: INSERT INTO categories SELECT * FROM backup_20260430_categories
--           WHERE slug NOT IN (SELECT slug FROM categories);
--
-- ⚠️ GERİ DÖNÜŞSÜZ. DO block içinde safety check var — eski kategoride
-- aktif ürün kalırsa EXCEPTION fırlatır, DELETE iptal olur.
-- ============================================================================

BEGIN;

-- 1. Safety check: eski flat kategoride aktif ürün var mı?
DO $$
DECLARE
  orphan_count INT;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM products p
  JOIN categories c ON c.id = p.category_id
  WHERE c.slug NOT LIKE '%/%'
    AND c.slug NOT IN (
      'elektronik','beyaz-esya','kucuk-ev-aletleri','moda','kozmetik',
      'ev-yasam','anne-bebek','spor-outdoor','saglik-vitamin','otomotiv',
      'supermarket','yapi-market','hobi-eglence','pet-shop',
      'siniflandirilmamis'
    )
    AND p.is_active = true;

  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'DROP iptal: % aktif ürün eski flat kategoride!', orphan_count;
  END IF;
END $$;

-- 2. Eski flat kategorileri DELETE
DELETE FROM categories
WHERE slug NOT LIKE '%/%'
  AND slug NOT IN (
    'elektronik','beyaz-esya','kucuk-ev-aletleri','moda','kozmetik',
    'ev-yasam','anne-bebek','spor-outdoor','saglik-vitamin','otomotiv',
    'supermarket','yapi-market','hobi-eglence','pet-shop',
    'siniflandirilmamis'
  );

COMMIT;

-- ============================================================================
-- VERIFY
-- ============================================================================

-- Toplam kategori
SELECT COUNT(*) AS toplam_kategori FROM categories;

-- Root kategoriler (15 = 14 yeni + siniflandirilmamis)
SELECT slug FROM categories WHERE parent_id IS NULL ORDER BY slug;

-- Hiyerarşi level dağılımı
WITH RECURSIVE tree AS (
  SELECT id, slug, name, parent_id, 0 AS level
  FROM categories WHERE parent_id IS NULL
  UNION ALL
  SELECT c.id, c.slug, c.name, c.parent_id, t.level + 1
  FROM categories c
  JOIN tree t ON c.parent_id = t.id
)
SELECT level, COUNT(*) AS count_at_level
FROM tree
GROUP BY level
ORDER BY level;

-- Top 30 kategori (ürün sayısı)
SELECT c.slug, COUNT(p.id) AS urun_sayisi
FROM categories c
LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true
GROUP BY c.slug
HAVING COUNT(p.id) > 0
ORDER BY urun_sayisi DESC
LIMIT 30;
