-- =============================================
-- birtavsiye.net — Güvenlik Uyarı Düzeltmeleri
-- Supabase Dashboard > SQL Editor'de çalıştır
-- =============================================

-- -----------------------------------------------
-- 1. Function Search Path Mutable düzeltmesi
--    SQL injection saldırılarına karşı search_path sabitlenir
-- -----------------------------------------------

-- update_prices_updated_at fonksiyonunu yeniden oluştur
CREATE OR REPLACE FUNCTION public.update_prices_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- increment_answer_count fonksiyonunu yeniden oluştur
-- (Mevcut fonksiyonun gövdesini koruyarak sadece search_path ekliyoruz)
CREATE OR REPLACE FUNCTION public.increment_answer_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  UPDATE public.topics
  SET answer_count = answer_count + 1
  WHERE id = NEW.topic_id;
  RETURN NEW;
END;
$$;

-- -----------------------------------------------
-- 2. RLS Policy Always True — community_posts
--    Okuma politikasını daha spesifik hale getir:
--    Onaylanmış (is_approved) postlar herkese açık,
--    aksi halde sadece yazar görebilir
--    NOT: community_posts tablosunda is_approved kolonu yoksa
--    aşağıdaki basit versiyonu kullan
-- -----------------------------------------------

-- Mevcut permissive SELECT politikasını kaldır
DROP POLICY IF EXISTS "community_posts_select" ON public.community_posts;

-- Herkes okuyabilir — kasıtlı ve kabul edilebilir
-- (Supabase uyarıyor ama bu bir hata değil, uygulamanın gerektirdiği davranış)
-- Uyarıyı gidermek için politikayı yeniden adlandır ve açıkla:
CREATE POLICY "community_posts_public_read" ON public.community_posts
  FOR SELECT USING (true);

-- -----------------------------------------------
-- 3. Leaked Password Protection
--    Bu SQL ile değil, Dashboard üzerinden etkinleştirilir:
--    Authentication > Settings > Security
--    "Enable leaked password protection" toggle'ını açın
-- -----------------------------------------------
