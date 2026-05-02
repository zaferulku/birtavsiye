-- 037_backup_drop.sql
-- P6.16: 5 backup tablosunu DROP (~70 MB disk recovery).
--
-- Cron baseline 24h audit'inde tespit edilen disk space borcu.
--
-- Audit sonucu (2 May 2026 gece geç):
-- - 6 backup tablosu var, hepsi BOŞ DEĞİL (pg_stat anomalisi: n_live_tup
--   yanlış 0 raporluyor, gerçek COUNT(*) doluyu gösteriyor — P6.14/15/17
--   pattern aynı)
-- - backup_20260422_* serisi: Migration 022 öncesi snapshot (Phase 1+2 sonu,
--   kategori refactor v2 öncesi). Production'da Phase 5 + Migrations 023-034
--   uygulandı; restore senaryosu kabul edilemez (2542 yeni ürün + 37 yeni
--   kategori + 9 sub-leaf + IoT re-cat hepsi geri alınır).
-- - backup_20260430_products_categories: Migration 023 sırası junction snapshot
--   (44,173 row, 8.7 MB). Migration 023 ile flat→hierarchik geçiş tamamlandı,
--   junction artık ölü.
-- - backup_20260430_categories KORUNDU: Phase 5 son safety net (189 row, 72 kB
--   minimal). Phase 6 stable olunca ileride P6.16-v2 ile DROP edilir (~6 ay).
--
-- Studio apply: 2026-05-02 gece geç ('Success. No rows returned').

BEGIN;

DROP TABLE IF EXISTS public.backup_20260422_products;            -- 43176 row, 47 MB
DROP TABLE IF EXISTS public.backup_20260422_prices;              -- 43279 row, 9 MB
DROP TABLE IF EXISTS public.backup_20260422_price_history;       -- 54107 row, 5 MB
DROP TABLE IF EXISTS public.backup_20260422_categories;          -- 195 row, 40 kB
DROP TABLE IF EXISTS public.backup_20260430_products_categories; -- 44173 row, 8.7 MB
-- backup_20260430_categories KORUNDU (Phase 5 safety net)

-- Self-verify
DO $$
DECLARE
  remaining INT;
BEGIN
  SELECT COUNT(*) INTO remaining
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name LIKE 'backup_%';

  RAISE NOTICE 'Migration 037: Kalan backup tablo sayısı: %', remaining;

  IF remaining <> 1 THEN
    RAISE WARNING 'Beklenen 1 backup (backup_20260430_categories), gerçek: %', remaining;
  END IF;
END $$;

COMMIT;

-- ROLLBACK PROCEDURE (gerekirse):
-- Supabase günlük otomatik snapshot'tan restore (24h pencere içinde).
-- Production data backup tablolarda DEĞİL (real products/prices/price_history
-- ayrı tablolarda canlı), backup tabloları sadece eski snapshot'lardı.
