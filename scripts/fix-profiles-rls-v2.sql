-- v2: profiles RLS'de sonsuz döngü fix
-- Context: fix-profiles-rls.sql çalıştırıldı ama admin policy'si profiles'ı
-- tekrar okuduğu için "infinite recursion detected" hatası veriyor.
-- Çözüm: SECURITY DEFINER fonksiyon → RLS bypass ile is_admin kontrolü.
-- Supabase SQL Editor'da çalıştır.

-- 1. Admin kontrolü için SECURITY DEFINER fonksiyon (RLS'i atlar)
CREATE OR REPLACE FUNCTION is_admin_user(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_admin FROM profiles WHERE id = uid), false);
$$;

REVOKE ALL ON FUNCTION is_admin_user(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION is_admin_user(uuid) TO anon, authenticated;

-- 2. Eski admin policy'lerini sil (recursion yapan)
DROP POLICY IF EXISTS profiles_admin_read ON profiles;
DROP POLICY IF EXISTS profiles_admin_update ON profiles;

-- 3. Fonksiyonla yeniden yaz (recursion yok)
CREATE POLICY profiles_admin_read ON profiles FOR SELECT
  USING (is_admin_user(auth.uid()));

CREATE POLICY profiles_admin_update ON profiles FOR UPDATE
  USING (is_admin_user(auth.uid()));

-- 4. Aynı pattern'i diğer admin tablolarda da uygula (agent_logs, product_queue, review_queue, affiliate_links, price_alerts)
DROP POLICY IF EXISTS agent_logs_admin_read ON agent_logs;
CREATE POLICY agent_logs_admin_read ON agent_logs FOR SELECT
  USING (is_admin_user(auth.uid()));

DROP POLICY IF EXISTS product_queue_admin_read ON product_queue;
CREATE POLICY product_queue_admin_read ON product_queue FOR SELECT
  USING (is_admin_user(auth.uid()));

DROP POLICY IF EXISTS review_queue_admin_read ON review_queue;
CREATE POLICY review_queue_admin_read ON review_queue FOR SELECT
  USING (is_admin_user(auth.uid()));

DROP POLICY IF EXISTS affiliate_links_admin_read ON affiliate_links;
CREATE POLICY affiliate_links_admin_read ON affiliate_links FOR SELECT
  USING (is_admin_user(auth.uid()));

DROP POLICY IF EXISTS price_alerts_self_read ON price_alerts;
CREATE POLICY price_alerts_self_read ON price_alerts FOR SELECT
  USING (
    email = (auth.jwt() ->> 'email')
    OR is_admin_user(auth.uid())
  );

-- PostgREST cache refresh
NOTIFY pgrst, 'reload schema';

-- Doğrulama (manuel):
-- SELECT id FROM profiles LIMIT 1;   -- anon: 0 satir, auth user: kendi, admin: tumu
