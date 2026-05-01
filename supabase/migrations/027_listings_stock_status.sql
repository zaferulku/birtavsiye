-- ============================================================================
-- Migration 027 — listings.stock_status enum (in_stock boolean ile coexist)
-- ============================================================================
-- KÖK: listings.in_stock sadece BOOLEAN. "limited" (az sayıda kaldı) ve
-- "unknown" (scraper veriyi alamadı) durumları ayırt edilemiyor. Multi-merchant
-- comparison için stock kalite sinyali eksik.
--
-- ÇÖZÜM: stock_status enum (in_stock | out_of_stock | limited | unknown).
-- in_stock BOOLEAN şu an kod 14+ yerde okunduğu için coexist tutulur.
-- BEFORE UPDATE trigger'ı in_stock değişince stock_status'u sync'ler.
-- 6 ay sonra ayrı migration ile in_stock DROP edilebilir (frontend/scraper
-- migrate olduktan sonra).
--
-- IDEMPOTENT: ENUM try-catch, ADD COLUMN IF NOT EXISTS, DROP TRIGGER + CREATE.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Enum: stock_status
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE stock_status AS ENUM ('in_stock', 'out_of_stock', 'limited', 'unknown');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Kolon
-- ----------------------------------------------------------------------------
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS stock_status stock_status DEFAULT 'unknown';

-- ----------------------------------------------------------------------------
-- 3. Backfill — in_stock BOOLEAN'dan stock_status'a aktar
-- ----------------------------------------------------------------------------
-- Sadece henüz default 'unknown' olanlar (idempotent re-run safe).
UPDATE listings SET stock_status =
  CASE
    WHEN in_stock = TRUE  THEN 'in_stock'::stock_status
    WHEN in_stock = FALSE THEN 'out_of_stock'::stock_status
    ELSE 'unknown'::stock_status
  END
WHERE stock_status = 'unknown';

-- ----------------------------------------------------------------------------
-- 4. Sync trigger: in_stock değişince stock_status güncellenir
-- ----------------------------------------------------------------------------
-- Mevcut scraper'lar in_stock yazıyor; trigger stock_status'u eşler.
-- 'limited' / 'unknown' değerleri sadece doğrudan stock_status yazılırsa elde
-- edilir (yeni scraper davranışı 025b sonrası).
CREATE OR REPLACE FUNCTION sync_stock_status_from_boolean()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.in_stock IS DISTINCT FROM OLD.in_stock THEN
    NEW.stock_status := CASE
      WHEN NEW.in_stock = TRUE  THEN 'in_stock'::stock_status
      WHEN NEW.in_stock = FALSE THEN 'out_of_stock'::stock_status
      ELSE 'unknown'::stock_status
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_listings_stock_sync ON listings;
CREATE TRIGGER trg_listings_stock_sync
  BEFORE UPDATE OF in_stock ON listings
  FOR EACH ROW EXECUTE FUNCTION sync_stock_status_from_boolean();

-- ----------------------------------------------------------------------------
-- 5. Index
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_listings_stock_status
  ON listings(stock_status);

COMMIT;

-- ============================================================================
-- VERIFY
-- ============================================================================

-- Stock status dağılımı
SELECT stock_status, COUNT(*) FROM listings GROUP BY stock_status ORDER BY 2 DESC;
-- Beklenen: in_stock + out_of_stock toplamı ≈ 8,830 (mevcut listing count)

-- Mismatch check: in_stock vs stock_status uyumsuz var mı?
SELECT COUNT(*) FROM listings
WHERE (in_stock = TRUE  AND stock_status != 'in_stock')
   OR (in_stock = FALSE AND stock_status != 'out_of_stock');
-- Beklenen: 0

-- Trigger varlık
SELECT trigger_name, event_object_table, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public' AND trigger_name = 'trg_listings_stock_sync';
-- Beklenen: 1 satır (BEFORE UPDATE)
