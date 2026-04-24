-- ============================================================================
-- Smart Search RPC ş Hybrid Search (Vector + Specs + Keyword)
-- ============================================================================
--
-- Chatbot'un niyet tabanlı aramalar için hybrid search:
--   1. Vector similarity (embedding-based semantic match)
--   2. JSONB specs match (must-have özellikler için kesin filtreleme)
--   3. Keyword match (title ilike fallback)
--
-- şç kanal paralel çalışır, sonuçlar birleşir, deduplicate edilir,
-- en yüksek skor kazanır.
--
-- Price filtering listing seviyesinde: ürünün en az bir listing'i belirtilen
-- fiyat aralığında olmalı. Yoksa ürün elenir.
--
-- Kullanım (TypeScript):
--   const { data } = await supabase.rpc('smart_search', {
--     query_embedding: embeddingVector,        // 768-dim
--     category_filter: 'kozmetik.deodorant',
--     specs_must: { ana_notalar: ['lavanta'] },
--     keyword_patterns: ['lavanta', 'vanilya'],
--     price_min: null,
--     price_max: 500,
--     brand_filter: null,
--     match_count: 10
--   });
--
-- Dönen her satırda:
--   - id, slug, title, brand, image_url, category_slug
--   - min_price, listing_count
--   - similarity (0-1)
--   - match_source ('vector', 'specs', 'keyword', 'hybrid')
--
-- Performance notu:
--   - Vector search için idx_products_embedding ivfflat index varsayılır
--   - Specs search için idx_products_specs GIN index varsayılır
--   - Title search için idx_products_title (trigram) varsayılır
-- ============================================================================

CREATE OR REPLACE FUNCTION smart_search(
  query_embedding    VECTOR(768),
  category_filter    TEXT DEFAULT NULL,
  specs_must         JSONB DEFAULT NULL,
  keyword_patterns   TEXT[] DEFAULT NULL,
  price_min          NUMERIC DEFAULT NULL,
  price_max          NUMERIC DEFAULT NULL,
  brand_filter       TEXT[] DEFAULT NULL,
  match_count        INT DEFAULT 10,
  match_threshold    FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  id              UUID,
  slug            TEXT,
  title           TEXT,
  brand           TEXT,
  image_url       TEXT,
  category_slug   TEXT,
  min_price       NUMERIC,
  listing_count   BIGINT,
  similarity      FLOAT,
  match_source    TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH
  -- ====================================================================
  -- Kanal 1: Vector similarity search
  -- ====================================================================
  vector_matches AS (
    SELECT
      p.id,
      (1 - (p.embedding <=> query_embedding))::FLOAT AS sim,
      'vector'::TEXT AS source
    FROM products p
    WHERE
      p.is_active = true
      AND p.embedding IS NOT NULL
      AND (category_filter IS NULL OR p.category_id IN (
        SELECT c.id FROM categories c WHERE c.slug = category_filter
      ))
      AND (brand_filter IS NULL OR p.brand = ANY(brand_filter))
    ORDER BY p.embedding <=> query_embedding
    LIMIT GREATEST(match_count * 3, 30)
  ),

  -- ====================================================================
  -- Kanal 2: Specs JSONB match (must-have özellikler)
  -- ====================================================================
  specs_matches AS (
    SELECT
      p.id,
      0.85::FLOAT AS sim,  -- Specs match: yüksek sabit skor (kesin eşleşme)
      'specs'::TEXT AS source
    FROM products p
    WHERE
      p.is_active = true
      AND specs_must IS NOT NULL
      AND specs_must != '{}'::jsonb
      AND p.specs IS NOT NULL
      AND p.specs @> specs_must
      AND (category_filter IS NULL OR p.category_id IN (
        SELECT c.id FROM categories c WHERE c.slug = category_filter
      ))
      AND (brand_filter IS NULL OR p.brand = ANY(brand_filter))
    LIMIT match_count
  ),

  -- ====================================================================
  -- Kanal 3: Keyword match (title ilike)
  -- ====================================================================
  keyword_matches AS (
    SELECT DISTINCT ON (p.id)
      p.id,
      0.5::FLOAT AS sim,  -- Keyword match: düşük sabit skor (fuzzy)
      'keyword'::TEXT AS source
    FROM products p,
         LATERAL unnest(COALESCE(keyword_patterns, ARRAY[]::TEXT[])) AS kw
    WHERE
      p.is_active = true
      AND keyword_patterns IS NOT NULL
      AND cardinality(keyword_patterns) > 0
      AND (p.title ILIKE '%' || kw || '%' OR p.brand ILIKE '%' || kw || '%')
      AND (category_filter IS NULL OR p.category_id IN (
        SELECT c.id FROM categories c WHERE c.slug = category_filter
      ))
      AND (brand_filter IS NULL OR p.brand = ANY(brand_filter))
    LIMIT match_count
  ),

  -- ====================================================================
  -- Birlşir ve deduplicate (en yüksek skor kazanır)
  -- ====================================================================
  combined AS (
    SELECT
      all_matches.id,
      MAX(all_matches.sim) AS similarity,
      STRING_AGG(DISTINCT all_matches.source, ',' ORDER BY all_matches.source) AS match_source
    FROM (
      SELECT * FROM vector_matches
      UNION ALL
      SELECT * FROM specs_matches
      UNION ALL
      SELECT * FROM keyword_matches
    ) AS all_matches
    GROUP BY all_matches.id
    HAVING MAX(all_matches.sim) >= match_threshold
  ),

  -- ====================================================================
  -- Listing aggregasyonu (min_price, count, price filter)
  -- ====================================================================
  listing_stats AS (
    SELECT
      l.product_id,
      MIN(l.price) AS min_price,
      COUNT(*) AS listing_count,
      BOOL_OR(
        (price_min IS NULL OR l.price >= price_min)
        AND (price_max IS NULL OR l.price <= price_max)
      ) AS matches_price_range
    FROM listings l
    WHERE l.is_active = true
    GROUP BY l.product_id
  )

  -- ====================================================================
  -- Final select
  -- ====================================================================
  SELECT
    p.id,
    p.slug,
    p.title,
    p.brand,
    p.image_url,
    c.slug AS category_slug,
    ls.min_price,
    ls.listing_count,
    cm.similarity,
    -- "hybrid" label if multiple channels matched
    CASE
      WHEN POSITION(',' IN cm.match_source) > 0 THEN 'hybrid'
      ELSE cm.match_source
    END AS match_source
  FROM combined cm
  JOIN products p ON p.id = cm.id
  LEFT JOIN categories c ON c.id = p.category_id
  INNER JOIN listing_stats ls ON ls.product_id = p.id
  WHERE
    ls.matches_price_range = true  -- ürünün en az bir listing'i price range'de
    AND ls.listing_count > 0        -- zombi ürünler elensin
  ORDER BY cm.similarity DESC
  LIMIT match_count;

END;
$$;

-- ============================================================================
-- Gerekli index'ler (idempotent ş zaten varsa yaratılmaz)
-- ============================================================================

-- Vector search için ivfflat (products.embedding)
CREATE INDEX IF NOT EXISTS idx_products_embedding
  ON products
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);  -- 339+ satır için uygun; 1000+ oldşnda rebuild: lists=50+

-- Specs JSONB için GIN
CREATE INDEX IF NOT EXISTS idx_products_specs
  ON products
  USING gin (specs)
  WHERE specs IS NOT NULL;

-- Title search için trigram (pg_trgm extension gerekli)
-- Eşer extension yoksa comment'e al:
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_products_title_trgm
  ON products
  USING gin (title gin_trgm_ops)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_products_brand_trgm
  ON products
  USING gin (brand gin_trgm_ops)
  WHERE brand IS NOT NULL;

-- Listing lookups için
CREATE INDEX IF NOT EXISTS idx_listings_product_active_price
  ON listings (product_id, is_active, price)
  WHERE is_active = true;

-- Category lookup
CREATE INDEX IF NOT EXISTS idx_categories_slug
  ON categories (slug)
  WHERE is_active = true;

-- ============================================================================
-- Test sorgusu
-- ============================================================================
--
-- SELECT * FROM smart_search(
--   query_embedding := '[0, 0, ..., 0]'::vector(768),   -- dummy vector
--   category_filter := NULL,
--   specs_must := NULL,
--   keyword_patterns := ARRAY['deodorant'],
--   price_min := NULL,
--   price_max := NULL,
--   brand_filter := NULL,
--   match_count := 5,
--   match_threshold := 0.1
-- );
--
-- ============================================================================
