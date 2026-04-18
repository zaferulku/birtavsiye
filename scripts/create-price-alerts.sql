CREATE TABLE IF NOT EXISTS price_alerts (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id   uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  email        text NOT NULL,
  target_price numeric(12,2) NOT NULL,
  is_triggered boolean DEFAULT false,
  created_at   timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS price_alerts_product ON price_alerts(product_id);
CREATE INDEX IF NOT EXISTS price_alerts_triggered ON price_alerts(is_triggered) WHERE is_triggered = false;

ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "price_alerts_insert" ON price_alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "price_alerts_select" ON price_alerts FOR SELECT USING (true);
CREATE POLICY "price_alerts_update" ON price_alerts FOR UPDATE USING (true);
