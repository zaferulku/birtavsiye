-- ============================================================================
-- Migration 016 — TÜM public tablolarından anon/authenticated tehlikeli yetkiler
-- ============================================================================
-- KÖK: Supabase tablolar oluşurken default GRANT ALL TO PUBLIC verilmiş.
-- 30 tabloda anon'a INSERT/UPDATE/DELETE/TRUNCATE yetkisi vardı.
--
-- 29 Apr 2026 — bu açıklığı kapatma.
-- ============================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format(
      'REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.%I FROM anon, authenticated',
      r.tablename
    );
  END LOOP;
END $$;

-- Verify
SELECT
  table_name,
  string_agg(privilege_type, ', ' ORDER BY privilege_type) AS anon_privs
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee = 'anon'
  AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
GROUP BY table_name;
-- Beklenen: 0 satır

-- ============================================================================
-- NOT: SELECT yetkisi anon/authenticated'da bırakıldı — RLS policy ile kontrol.
-- Yeni tablo eklerken default REVOKE eklemek için trigger düşünülebilir
-- (MVP sonrası polish).
-- ============================================================================
