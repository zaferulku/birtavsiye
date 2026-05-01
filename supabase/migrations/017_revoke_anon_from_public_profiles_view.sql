-- ============================================================================
-- Migration 017 — public_profiles view'ından tehlikeli yetkiler kaldır
-- ============================================================================
-- Migration 016 pg_tables iterasyonu ile sadece TABLOLARI kapsamıştı.
-- public_profiles bir VIEW olduğu için 016 onu atlamıştı.
-- 017 view için aynı tehlikeli yetkileri REVOKE eder (defense-in-depth).
-- ============================================================================

-- Acil: View'dan tehlikeli yetkiler kaldır
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
ON public.public_profiles
FROM anon, authenticated;

-- Verify
SELECT
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'public_profiles'
ORDER BY grantee, privilege_type;
