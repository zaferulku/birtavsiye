-- RLS patch: anon'a açık kalan 8 tablo için policies
-- Context: test sonucu bu tabloların anon'a açık olduğunu gösterdi
--   → price_alerts user e-mail'leri sızdırıyor (PII)
--   → agent_logs sistem payload'larını açığa çıkarıyor
--   → affiliate_links komisyon oranlarını gösteriyor
-- Supabase SQL Editor'da çalıştır.

-- ============================================================
-- KATALOG — public read OK (fiyat karşılaştırma için şart)
-- ============================================================

-- prices
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS prices_select ON prices;
CREATE POLICY prices_select ON prices FOR SELECT USING (true);
-- INSERT/UPDATE/DELETE yalnızca service_role (RLS bypass) → policy yok

-- stores
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS stores_select ON stores;
CREATE POLICY stores_select ON stores FOR SELECT USING (true);

-- price_history
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS price_history_select ON price_history;
CREATE POLICY price_history_select ON price_history FOR SELECT USING (true);

-- ============================================================
-- SİSTEM / ADMIN TABLOLARI — anon'a KAPALI
-- (service_role her zaman bypass eder; policy = anon kontrolü)
-- ============================================================

-- agent_logs: anon SELECT bloke, admin okuyabilir
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS agent_logs_admin_read ON agent_logs;
CREATE POLICY agent_logs_admin_read ON agent_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- product_queue: admin only
ALTER TABLE product_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_queue_admin_read ON product_queue;
CREATE POLICY product_queue_admin_read ON product_queue FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- review_queue: admin only
ALTER TABLE review_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS review_queue_admin_read ON review_queue;
CREATE POLICY review_queue_admin_read ON review_queue FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- affiliate_links: admin read, yazma service_role
ALTER TABLE affiliate_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS affiliate_links_admin_read ON affiliate_links;
CREATE POLICY affiliate_links_admin_read ON affiliate_links FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- ============================================================
-- KULLANICI TABLOLARI — PII / email içerir
-- ============================================================

-- price_alerts: anon email ile alarm kurabilir (INSERT OK),
-- ama listeyi okuyamaz (SELECT yalnızca kendi email ile auth'luy ken ya da admin)
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS price_alerts_anon_insert ON price_alerts;
CREATE POLICY price_alerts_anon_insert ON price_alerts FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS price_alerts_self_read ON price_alerts;
CREATE POLICY price_alerts_self_read ON price_alerts FOR SELECT
  USING (
    email = (auth.jwt() ->> 'email')
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- PostgREST schema cache refresh
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- Doğrulama (manuel çalıştır)
-- ============================================================
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename IN ('prices','stores','price_history','agent_logs','product_queue','review_queue','affiliate_links','price_alerts')
-- ORDER BY tablename;
