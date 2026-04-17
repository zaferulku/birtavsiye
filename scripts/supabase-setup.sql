-- =============================================
-- birtavsiye.net — Supabase Tablo Kurulumu
-- Supabase Dashboard > SQL Editor'de çalıştır
-- =============================================

-- Mağazalar tablosu (prices tablosunun bağımlısı)
CREATE TABLE IF NOT EXISTS stores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  url text,
  logo_url text,
  created_at timestamptz DEFAULT now()
);

-- Fiyatlar tablosu
CREATE TABLE IF NOT EXISTS prices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  price numeric NOT NULL,
  affiliate_url text,         -- Affiliate linki (Trendyol/Amazon affiliate URL)
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, store_id) -- Aynı ürün+mağaza kombinasyonu tekil
);

-- prices.updated_at otomatik güncellensin
CREATE OR REPLACE FUNCTION update_prices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prices_updated_at ON prices;
CREATE TRIGGER prices_updated_at
  BEFORE UPDATE ON prices
  FOR EACH ROW EXECUTE FUNCTION update_prices_updated_at();

-- RLS (Row Level Security) — herkes okuyabilir, sadece admin yazabilir
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;

-- Herkes okuyabilir
CREATE POLICY "stores_select" ON stores FOR SELECT USING (true);
CREATE POLICY "prices_select" ON prices FOR SELECT USING (true);

-- Sadece admin ekleyip silebilir
CREATE POLICY "stores_admin_insert" ON stores FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "stores_admin_update" ON stores FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "stores_admin_delete" ON stores FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "prices_admin_insert" ON prices FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "prices_admin_update" ON prices FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "prices_admin_delete" ON prices FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- UNIQUE constraint eksikse ekle
ALTER TABLE stores DROP CONSTRAINT IF EXISTS stores_name_key;
ALTER TABLE stores ADD CONSTRAINT stores_name_key UNIQUE (name);

-- Örnek mağaza verileri
INSERT INTO stores (name, url) VALUES
  ('Trendyol', 'https://www.trendyol.com'),
  ('Hepsiburada', 'https://www.hepsiburada.com'),
  ('Amazon TR', 'https://www.amazon.com.tr'),
  ('MediaMarkt', 'https://www.mediamarkt.com.tr'),
  ('Vatan Bilgisayar', 'https://www.vatanbilgisayar.com'),
  ('n11', 'https://www.n11.com'),
  ('GittiGidiyor', 'https://www.gittigidiyor.com'),
  ('Teknosa', 'https://www.teknosa.com')
ON CONFLICT (name) DO NOTHING;
