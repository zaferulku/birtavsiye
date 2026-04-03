-- Konuları ürünlere bağlamak için
ALTER TABLE topics
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS product_slug TEXT,
  ADD COLUMN IF NOT EXISTS product_title TEXT,
  ADD COLUMN IF NOT EXISTS product_brand TEXT;

CREATE INDEX IF NOT EXISTS idx_topics_product_id ON topics(product_id);
