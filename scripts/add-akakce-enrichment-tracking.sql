-- Akakçe enrichment tracking için products tablosuna kolon ekler.
-- Supabase SQL Editor'a yapıştır + Run.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS enrichment_source TEXT NULL,
  ADD COLUMN IF NOT EXISTS enrichment_status TEXT NULL;

COMMENT ON COLUMN public.products.enriched_at IS 'Son spec zenginleştirme zamanı (Akakçe/Icecat/v.b.)';
COMMENT ON COLUMN public.products.enrichment_source IS 'Son zenginleştirme kaynağı: akakce | icecat | manual';
COMMENT ON COLUMN public.products.enrichment_status IS 'Son sonuç: success | no_match | error';

-- "En eski zenginleştirilenden başla" sorgusunu hızlandırır.
-- NULLS FIRST → hiç zenginleştirilmemiş ürünler en başa gelir.
CREATE INDEX IF NOT EXISTS idx_products_enriched_at
  ON public.products (enriched_at ASC NULLS FIRST);
