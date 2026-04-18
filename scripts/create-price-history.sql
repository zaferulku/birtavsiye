-- Fiyat geçmişi tablosu
CREATE TABLE IF NOT EXISTS price_history (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  store_id    uuid NOT NULL REFERENCES stores(id)   ON DELETE CASCADE,
  price       numeric(12,2) NOT NULL,
  recorded_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS price_history_product_store ON price_history(product_id, store_id);
CREATE INDEX IF NOT EXISTS price_history_recorded_at   ON price_history(recorded_at);

ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "price_history_select" ON price_history FOR SELECT USING (true);
CREATE POLICY "price_history_insert" ON price_history FOR INSERT WITH CHECK (true);
