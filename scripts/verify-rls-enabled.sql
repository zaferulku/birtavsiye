-- RLS aktif mi? Policy var ama RLS kapalıysa policy çalışmaz.
-- Supabase Dashboard → SQL Editor → çalıştır

-- pg_tables'ta forcerowsecurity yok; pg_class kullan
SELECT
  c.relname AS tablename,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS force_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN ('products','prices','categories','stores','profiles','topics','topic_votes','topic_answers','price_alerts')
ORDER BY c.relname;

-- Beklenen: rls_enabled=true her satırda.
-- Eğer false görürsen aşağıdaki ENABLE + FORCE komutlarını çalıştır:

-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE prices ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
--
-- FORCE RLS: table owner (genelde postgres/service_role) bile
-- RLS'e tabi olsun — anon write test scriptimde hala yazabildiği için
-- FORCE gerekiyor olabilir:
-- ALTER TABLE products FORCE ROW LEVEL SECURITY;
-- ALTER TABLE prices FORCE ROW LEVEL SECURITY;
-- ALTER TABLE categories FORCE ROW LEVEL SECURITY;
-- ALTER TABLE stores FORCE ROW LEVEL SECURITY;
 