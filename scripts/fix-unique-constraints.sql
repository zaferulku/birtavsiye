-- products tablosuna slug UNIQUE constraint ekle
-- prices tablosuna (product_id, store_id) UNIQUE constraint ekle
-- Supabase Dashboard > SQL Editor'de çalıştır

-- 1. products.slug için UNIQUE constraint (onConflict: "slug" çalışması için gerekli)
ALTER TABLE products
  ADD CONSTRAINT products_slug_key UNIQUE (slug);

-- 2. prices.(product_id, store_id) için UNIQUE constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'prices_product_id_store_id_key'
  ) THEN
    ALTER TABLE prices
      ADD CONSTRAINT prices_product_id_store_id_key UNIQUE (product_id, store_id);
  END IF;
END$$;
