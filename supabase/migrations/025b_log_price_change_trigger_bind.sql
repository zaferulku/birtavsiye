-- Migration 025b: log_price_change trigger bind
--
-- Migration 025'te tanımlanan log_price_change() fonksiyonunu listings
-- tablosuna bağlar. Manuel scraper INSERT'leri PR-1'de kaldırıldı (08d355a),
-- artık price_history kayıtları otomatik trigger ile yazılır.
--
-- Trigger event: AFTER INSERT OR UPDATE OF price ON listings
-- - INSERT: yeni listing, ilk fiyat kaydı (function içinde TG_OP='INSERT' yakalar)
-- - UPDATE OF price: sadece price kolonu değiştiğinde tetiklenir (last_seen,
--   in_stock vs. UPDATE'leri history yaratmaz — performans optimizasyonu)
-- - Function içinde IS DISTINCT FROM filtresi var (aynı price gelirse atlar)
--
-- Idempotent: DROP IF EXISTS + CREATE.

DROP TRIGGER IF EXISTS trg_log_price_change ON listings;

CREATE TRIGGER trg_log_price_change
AFTER INSERT OR UPDATE OF price ON listings
FOR EACH ROW
EXECUTE FUNCTION log_price_change();

-- Verify
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_log_price_change'
      AND tgrelid = 'listings'::regclass
  ) THEN
    RAISE EXCEPTION 'Trigger trg_log_price_change bind FAILED';
  END IF;
  RAISE NOTICE 'Trigger trg_log_price_change bind OK';
END $$;
