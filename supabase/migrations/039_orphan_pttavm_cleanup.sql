-- ============================================================================
-- Migration 039 — PTT orphan products cleanup (DESTRUCTIVE)
-- ============================================================================
-- KOK: scripts/migrate-backup-to-products.mjs (Apr 27) PTT-image_url'lu 43k
-- urunu products tablosuna INSERT etti, listings tablosuna ASLA yazmadi.
-- ~36.259 satir bunlardan orphan kaldi:
--   - listing yok      -> fiyat yok
--   - kategori sayfasinda gozukmuyor (P6.21 listing-less filter)
--   - SKU/source_url DB'de saklanmadi -> recovery zor
--
-- KARAR (kullanici): "backup alma zaten kirli urunler daha kullanmayacagiz.
-- sadece bundan sonra urun cekerken bu sekilde kirli urun cekmeyecegiz."
-- Yeni scraper akisi (P6.22-A/B/C/D + E/F) artik dogru yazimi yapiyor;
-- tekrar scrape geldiginde temiz canonical olusur.
--
-- FK GUVENLIK AUDITI (sample 200 orphan ID):
--   - price_alerts:    0 ref (kullanici alarmi yok)
--   - favorites:       0 ref (kullanici favorisi yok)
--   - community_posts: 0 ref (forum post yok)
--   - topics:          0 ref (forum topic yok)
--   - price_history:   listings araciligi ile bagli (orphan'in listing'i
--                      olmadigi icin price_history kaydi yok)
--   - agent_decisions: related_entity_id polymorfic (FK YOK, log only)
--
-- BACKUP YAPILMAZ — kullanici karari.
-- ROLLBACK: yapilamaz (tek yon). Yeni scrape ile organik recovery.
--
-- IDempotent degildir (DELETE one-shot) — apply sonrasi tekrar calisirsa
-- 0 row affected dondurur (zaten silindi, NOT EXISTS kosulu hep dogru).
-- ============================================================================

BEGIN;

-- 1. Pre-count: kac satir silinecek
DO $$
DECLARE
  orphan_count INT;
  total_pttimg INT;
BEGIN
  SELECT COUNT(*) INTO total_pttimg
  FROM products
  WHERE image_url ILIKE '%pttavm%';

  SELECT COUNT(*) INTO orphan_count
  FROM products
  WHERE image_url ILIKE '%pttavm%'
    AND NOT EXISTS (
      SELECT 1 FROM listings WHERE listings.product_id = products.id
    );

  RAISE NOTICE 'Migration 039: PTT-image toplam = %', total_pttimg;
  RAISE NOTICE 'Migration 039: silinecek orphan = %', orphan_count;
  RAISE NOTICE 'Migration 039: kalacak (listing''li) = %', total_pttimg - orphan_count;
END $$;

-- 2. Destructive DELETE
DELETE FROM products
WHERE image_url ILIKE '%pttavm%'
  AND NOT EXISTS (
    SELECT 1 FROM listings WHERE listings.product_id = products.id
  );

-- 3. Post-count: kalan PTT-image (yani listing'i olan gercek aktifler)
DO $$
DECLARE
  remaining INT;
BEGIN
  SELECT COUNT(*) INTO remaining
  FROM products
  WHERE image_url ILIKE '%pttavm%';
  RAISE NOTICE 'Migration 039: silme sonrasi kalan PTT-image = %', remaining;
END $$;

COMMIT;

-- ============================================================================
-- DOGRULAMA (apply sonrasi)
-- ============================================================================
-- Beklenen: PTT-image products ~36.259 azaldi, kalan ~1.974 (listing'li).
--
-- SELECT
--   COUNT(*) FILTER (WHERE image_url ILIKE '%pttavm%') AS ptt_total,
--   COUNT(*) FILTER (
--     WHERE image_url ILIKE '%pttavm%'
--       AND EXISTS (SELECT 1 FROM listings WHERE product_id = products.id)
--   ) AS ptt_with_listing
-- FROM products;
--
-- Ortalama active urun sayisi:
-- SELECT COUNT(*) FROM products WHERE is_active = true;
-- (onceki: 45.480 -> beklenen: ~9.221)
