ALTER TABLE products ADD COLUMN IF NOT EXISTS model_code text;

CREATE INDEX IF NOT EXISTS products_brand_model_code
  ON products(lower(brand), lower(model_code))
  WHERE model_code IS NOT NULL;
