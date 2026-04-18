-- v3: profiles üzerindeki TÜM policy'leri sil, sıfırdan kur
-- Context: v1 + v2 çalıştı ama anon hala phone/full_name/birth_date okuyor
-- Sebep: Eski permissive policy (USING true) adıyla bilinmediği için DROP IF EXISTS atladı.
-- Çözüm: pg_policies'ten dinamik olarak hepsini sil, sonra sadece gerekenleri yarat.
-- Supabase SQL Editor'da çalıştır.

-- 0. Önce mevcut policy'leri gör (diagnostic):
SELECT policyname, cmd, permissive FROM pg_policies
WHERE tablename = 'profiles' ORDER BY cmd, policyname;

-- 1. TÜM profiles policy'lerini dinamik olarak sil
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
  END LOOP;
END $$;

-- 2. RLS aktif (idempotent) + zorla
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;

-- 3. Sadece gereken policy'leri ekle
-- Self: kendi profilini gör/güncelle
CREATE POLICY profiles_self_read ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY profiles_self_insert ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_self_update ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admin: herkesi oku/güncelle (is_admin_user fonksiyonu v2'de oluşturuldu)
CREATE POLICY profiles_admin_read ON profiles FOR SELECT
  USING (is_admin_user(auth.uid()));

CREATE POLICY profiles_admin_update ON profiles FOR UPDATE
  USING (is_admin_user(auth.uid()));

-- PostgREST cache refresh
NOTIFY pgrst, 'reload schema';

-- 4. Doğrulama — bu listede sadece yukarıdaki 5 policy görünmeli
SELECT policyname, cmd, permissive FROM pg_policies
WHERE tablename = 'profiles' ORDER BY cmd, policyname;
