-- 008_performance_indexes.sql
-- Statement timeout krizinin nedeni: kategori sayfası ve scrape sorguları
-- index olmadan tüm tabloyu tarıyor.
--
-- Bu migration 4 kritik index ekler:
--   1. products(category_id) — kategori sayfası ürün listeleme
--   2. listings(product_id) — ürün detay sayfasında listing JOIN
--   3. listings(source, source_url) — scrape dedup check
--   4. listings(is_active, in_stock) — aktif fiyat filtresi
--
-- CONCURRENTLY kaldırıldı — Supabase SQL Editor sorguları implicit transaction'a
-- sarar, CONCURRENTLY içinde çalışamaz (error 25001). Tablolar küçük olduğu için
-- normal CREATE INDEX 5-10sn sürer, kısa kilitleme hissedilmez.
-- Production'da çok büyük tabloda Supabase Studio yerine direct psql ile
-- CONCURRENTLY kullan.

CREATE INDEX IF NOT EXISTS idx_products_category_active
  ON products (category_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_listings_product_id
  ON listings (product_id);

CREATE INDEX IF NOT EXISTS idx_listings_source_url
  ON listings (source, source_url);

CREATE INDEX IF NOT EXISTS idx_listings_active_stock
  ON listings (is_active, in_stock)
  WHERE is_active = true;

-- Beklenen etki:
--   Kategori sayfası query'si: ~120s (timeout) -> <500ms
--   Scrape dedup check (listings.source_url): ~120s -> <50ms
--   products JOIN listings: ~10s -> <100ms
--
-- Doğrulama:
--   EXPLAIN ANALYZE
--   SELECT p.id, p.image_url, p.category_id
--   FROM products p
--   WHERE p.category_id = 'xxx'::uuid AND p.is_active = true
--   LIMIT 50;
--   -- "Index Scan using idx_products_category_active" görmeli, "Seq Scan" değil.
