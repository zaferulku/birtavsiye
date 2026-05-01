-- ============================================================================
-- Migration 027b — listings stock_sync trigger: INSERT desteği eklendi
-- ============================================================================
-- KÖK: Migration 027'nin trigger'ı sadece UPDATE OF in_stock'ta çalışıyor.
-- Yeni scrape edilen listings INSERT'inde in_stock=TRUE ama stock_status='unknown'
-- (DEFAULT) kalıyordu — frontend ranking bozulur, chatbot/arama yeni ürünleri
-- "stoksuz" gibi gösterir. BLOCKER.
--
-- ÇÖZÜM: Trigger'a INSERT eventi eklendi + function TG_OP='INSERT' kapsar.
--
-- IDEMPOTENT: CREATE OR REPLACE FUNCTION + DROP TRIGGER + CREATE TRIGGER.
-- ============================================================================

BEGIN;

-- Function update — TG_OP='INSERT' kapsamı
CREATE OR REPLACE FUNCTION sync_stock_status_from_boolean()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (NEW.in_stock IS DISTINCT FROM OLD.in_stock) THEN
    NEW.stock_status := CASE
      WHEN NEW.in_stock = TRUE  THEN 'in_stock'::stock_status
      WHEN NEW.in_stock = FALSE THEN 'out_of_stock'::stock_status
      ELSE 'unknown'::stock_status
    END;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger recreate: BEFORE INSERT OR UPDATE OF in_stock
DROP TRIGGER IF EXISTS trg_listings_stock_sync ON listings;
CREATE TRIGGER trg_listings_stock_sync
  BEFORE INSERT OR UPDATE OF in_stock ON listings
  FOR EACH ROW EXECUTE FUNCTION sync_stock_status_from_boolean();

COMMIT;

-- ============================================================================
-- VERIFY
-- ============================================================================

-- 1. Trigger event manipulation listede INSERT var mı?
SELECT trigger_name, event_object_table, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name = 'trg_listings_stock_sync'
ORDER BY event_manipulation;
-- Beklenen: 2 satır (INSERT + UPDATE)

-- 2. Function source'da TG_OP='INSERT' var mı?
SELECT pg_get_functiondef('sync_stock_status_from_boolean'::regproc);
-- Beklenen: TG_OP = 'INSERT' içersin

-- 3. Smoke test (manuel insert deneme — ROLLBACK ile data dokunmaz):
-- BEGIN;
-- INSERT INTO listings (product_id, store_id, price, in_stock, source_url, source)
--   VALUES ((SELECT id FROM products WHERE is_active = true LIMIT 1),
--           (SELECT id FROM stores LIMIT 1),
--           99.99, TRUE, 'http://test.url', 'manual')
--   RETURNING stock_status;
-- ROLLBACK;
-- Beklenen RETURNING: stock_status = 'in_stock' (TRUE → 'in_stock')
