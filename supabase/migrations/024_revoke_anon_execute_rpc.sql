-- ============================================================================
-- Migration 024 — Yazıcı RPC fonksiyonlarından anon EXECUTE REVOKE
-- ============================================================================
-- KÖK: PostgreSQL'de fonksiyonlar default GRANT EXECUTE TO PUBLIC alır.
-- adjust_topic_answer_count SECURITY DEFINER + UPDATE topics yapan → anon
-- key bilen herkes counter'ı manipüle edebilirdi (p_delta=999999 ile sahte
-- popüler topic).
--
-- Çözüm: PUBLIC + anon + authenticated rollerinden EXECUTE yetkisini REVOKE.
-- KRİTİK: PUBLIC revoke edilmezse anon PUBLIC üyesi olarak yine EXECUTE alır.
-- Server-side supabaseAdmin (service_role) etkilenmez — etkin çağrı
-- (src/lib/forumCounters.ts:4) kırılmaz.
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.adjust_topic_answer_count(uuid, integer)
  FROM PUBLIC, anon, authenticated;

-- PostgREST schema cache refresh
NOTIFY pgrst, 'reload schema';

-- Verify
SELECT
  p.proname AS function_name,
  p.prosecdef AS security_definer,
  pg_catalog.array_to_string(p.proacl, E'\n') AS acl
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'adjust_topic_answer_count';
-- Beklenen: acl içinde 'anon=...' veya 'authenticated=...' YOK
