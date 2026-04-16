-- products tablosuna marketplace kaynak bilgisi ekle
-- Supabase Dashboard > SQL Editor'de çalıştır

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS source     text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_url text;

CREATE INDEX IF NOT EXISTS products_source_idx ON products(source);
