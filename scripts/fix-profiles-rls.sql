-- Profiles tablosu için sıkı RLS — PII (phone, birth_date, full_name) anon'a sızıyordu
-- Context: profiles.phone + profiles.birth_date anon SELECT ile okunabiliyor
-- Supabase SQL Editor'da çalıştır.

-- RLS aktif et
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Eski permissive policy'leri temizle
DROP POLICY IF EXISTS profiles_select ON profiles;
DROP POLICY IF EXISTS profiles_select_public ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS profiles_self_read ON profiles;
DROP POLICY IF EXISTS profiles_self_update ON profiles;
DROP POLICY IF EXISTS profiles_self_insert ON profiles;
DROP POLICY IF EXISTS profiles_admin_read ON profiles;
DROP POLICY IF EXISTS profiles_admin_update ON profiles;

-- Auth user kendi profilini okuyabilir
CREATE POLICY profiles_self_read ON profiles FOR SELECT
  USING (id = auth.uid());

-- Auth user kendi profilini oluşturabilir (ilk signup)
CREATE POLICY profiles_self_insert ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Auth user kendi profilini güncelleyebilir
CREATE POLICY profiles_self_update ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admin herkesi okuyabilir
CREATE POLICY profiles_admin_read ON profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

-- Admin herkesi güncelleyebilir
CREATE POLICY profiles_admin_update ON profiles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

-- Public profil görünürlüğü için view (PII'siz)
-- Tavsiyelerde yazarın gender/username/avatar gösterilecekse bu view kullanılmalı
DROP VIEW IF EXISTS public_profiles;
CREATE VIEW public_profiles AS
  SELECT id, username, avatar_url, gender, created_at
  FROM profiles;

-- View'e anon ve auth erişim izni
GRANT SELECT ON public_profiles TO anon, authenticated;

-- PostgREST schema refresh
NOTIFY pgrst, 'reload schema';

-- Doğrulama sorgusu (manuel):
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'profiles';
-- SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'profiles';
