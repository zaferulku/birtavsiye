-- ============================================================================
-- Migration 018 — RLS sertleştirme + internal tablo anon SELECT revoke
-- ============================================================================
-- Tarama bulgusu: 14 public tabloda RLS KAPALI. SELECT yetkisi anon'da
-- olduğundan (016 SELECT'i bilerek bıraktı) bu tablolar dışarıdan
-- enumerate edilebilir. agent_decisions, decision_feedback gibi internal
-- log'lar dahil.
--
-- Çözüm:
--   1. Tüm public tablolarda RLS aç (default-deny)
--   2. Internal/sensitive tablolardan anon SELECT'i toptan REVOKE
--   3. Backup tablolarından anon SELECT REVOKE (silme 019'da)
--
-- Frontend etkisi: yok — kod taramasında browser-side `supabase.from(...)`
-- çağrısı bulunamadı; tüm okumalar /api/... server route'larından
-- supabaseAdmin (service_role) ile yapılıyor.
-- ============================================================================

-- 1) Tüm public tablolarda RLS aç (idempotent)
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = false
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.relname);
  END LOOP;
END $$;

-- 2) Internal tablolar — anon SELECT REVOKE (defense-in-depth, RLS yetmezse de korur)
REVOKE SELECT ON
  public.agent_decisions,
  public.decision_feedback,
  public.learned_patterns,
  public.categorization_cache,
  public.source_category_mappings
FROM anon, authenticated;

-- 3) Backup tablolar — anon SELECT REVOKE (silme 019'da, ama önce kapatalım)
REVOKE SELECT ON
  public.backup_20260422_products,
  public.backup_20260422_categories,
  public.backup_20260422_prices,
  public.backup_20260422_price_history
FROM anon, authenticated;

-- ============================================================================
-- Verify
-- ============================================================================
-- 1) RLS açık olmayan public tablo kalmadı mı?
SELECT c.relname AS rls_kapali_kalmis_tablo
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = false;
-- Beklenen: 0 satır

-- 2) Internal/backup tablolarda anon SELECT kalmış mı?
SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated')
  AND privilege_type = 'SELECT'
  AND table_name IN (
    'agent_decisions', 'decision_feedback', 'learned_patterns',
    'categorization_cache', 'source_category_mappings',
    'backup_20260422_products', 'backup_20260422_categories',
    'backup_20260422_prices', 'backup_20260422_price_history'
  );
-- Beklenen: 0 satır

-- ============================================================================
-- NOT: Public-okunabilir tablolar (products, listings, categories, vs) için
-- anon SELECT açık bırakıldı + RLS şimdi aktif. Bu tablolar default-deny
-- altında kaldı; ileride browser-side direkt okuma gerekirse açık SELECT
-- policy eklenmeli (USING (true) veya is_active=true gibi).
-- ============================================================================
