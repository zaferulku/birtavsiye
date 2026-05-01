-- ============================================================================
-- Migration 019 — Eski backup_20260422_* tablolarını sil
-- ============================================================================
-- 22 Apr 2026 alınan tek seferlik snapshot tabloları artık gereksiz.
-- 018'de anon SELECT REVOKE edildi ama silmek temiz çözüm:
--   - Sızdırma yüzeyi tamamen kalkar
--   - Storage tüketimi azalır
--   - Future maintenance yükü kalkar
--
-- ⚠️ KALICI VE GERİ ALINAMAZ. Snapshot'a hâlâ ihtiyaç varsa önce export et:
--   - Supabase Studio → Database → Tables → Export CSV
--   - veya pg_dump -t public.backup_20260422_*
--
-- Bağımlı script'ler (artık çalıştırılamaz, görevini tamamlamış):
--   - scripts/migrate-backup-to-products.mjs
--   - scripts/classify-backup-to-canonical.mjs
--   - scripts/migration/classify-products.mjs
--   - scripts/migration/schema-migration.sql
-- Bunlar repo'dan da silinebilir (ayrı temizlik PR'ı).
-- ============================================================================

DROP TABLE IF EXISTS public.backup_20260422_products CASCADE;
DROP TABLE IF EXISTS public.backup_20260422_categories CASCADE;
DROP TABLE IF EXISTS public.backup_20260422_prices CASCADE;
DROP TABLE IF EXISTS public.backup_20260422_price_history CASCADE;

-- Verify
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'backup_20260422_%';
-- Beklenen: 0 satır
