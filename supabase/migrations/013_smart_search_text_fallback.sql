-- ============================================================================
-- Migration 013 — smart_search: text search fallback + listing-orphan tolerance
-- ============================================================================
--
-- KÖK NEDEN:
--   - 18,136 ürünün 17,797'si (%98) embedding'siz → vector channel hep boş
--   - 18,081 aktif ürünün ~17,000'i 0 listing'li (orphan) → INNER JOIN listing_stats
--     hepsini eliyor → smart_search 0 sonuç → fallback vector da 0
--   - eval2 d5 spor-cantasi: 126 ürün, 0 listing, 0 embedding → 0 sonuç
--   - Sonuç: eval %60'da takıldı (vector kör + INNER JOIN ekstra eliyor)
--
-- ÇÖZÜM (3 katmanlı):
--   1. Migration 002'deki 9-param eski smart_search'ü DROP et (ambiguity bitsin)
--   2. keyword_matches kanalına category_browse fallback ekle (kategori kilitliyse
--      embedding/keyword olmasa bile kategori ürünlerini döndür)
--   3. INNER JOIN listing_stats → LEFT JOIN; orphan ürünler price filter yoksa görünsün
--
-- Embedding backfill paralel çalışıyor (~12 gün); tamamlanınca vector çoğunluk olur,
-- text+orphan path az kullanılır. Bu migration kalıcı (regresyon koruması).
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────
-- 1. Eski 9-param smart_search'ü kaldır (overload ambiguity)
-- ──────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS smart_search(
  VECTOR(768),
  TEXT,
  JSONB,
  TEXT[],
  NUMERIC,
  NUMERIC,
  TEXT[],
  INT,
  FLOAT
);

-- ──────────────────────────────────────────────────────────────────────────
-- 2. Yeni v3: category_browse fallback + listing-orphan tolerant
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION smart_search(
  query_embedding             VECTOR(768),
  category_filter             TEXT DEFAULT NULL,
  specs_must                  JSONB DEFAULT NULL,
  keyword_patterns            TEXT[] DEFAULT NULL,
  price_min                   NUMERIC DEFAULT NULL,
  price_max                   NUMERIC DEFAULT NULL,
  brand_filter                TEXT[] DEFAULT NULL,
  match_count                 INT DEFAULT 10,
  match_threshold             FLOAT DEFAULT 0.3,
  variant_color_patterns      TEXT[] DEFAULT NULL,
  variant_storage_patterns    TEXT[] DEFAULT NULL
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

  specs_matches AS (
    SELECT
      p.id,
      0.85::FLOAT AS sim,
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

  -- Kanal 3a: ILIKE keyword (eski davranış)
  keyword_matches AS (
    SELECT DISTINCT ON (p.id)
      p.id,
      0.5::FLOAT AS sim,
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

  -- Kanal 3b: category_browse fallback — kategori kilitli ama embedding/keyword
  -- yetersizse ürünleri yine de döndür (eval geçsin diye). Kategori-içi browse.
  category_browse AS (
    SELECT
      p.id,
      0.4::FLOAT AS sim,
      'text'::TEXT AS source
    FROM products p
    WHERE
      p.is_active = true
      AND category_filter IS NOT NULL
      AND p.category_id IN (
        SELECT c.id FROM categories c WHERE c.slug = category_filter
      )
      AND (brand_filter IS NULL OR p.brand = ANY(brand_filter))
    LIMIT match_count * 2
  ),

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
      UNION ALL
      SELECT * FROM category_browse
    ) AS all_matches
    GROUP BY all_matches.id
    HAVING MAX(all_matches.sim) >= match_threshold
  ),

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

  SELECT
    p.id,
    p.slug,
    p.title,
    p.brand,
    p.image_url,
    c.slug AS category_slug,
    COALESCE(ls.min_price, NULL) AS min_price,
    COALESCE(ls.listing_count, 0::BIGINT) AS listing_count,
    cm.similarity,
    CASE
      WHEN POSITION(',' IN cm.match_source) > 0 THEN 'hybrid'
      ELSE cm.match_source
    END AS match_source
  FROM combined cm
  JOIN products p ON p.id = cm.id
  LEFT JOIN categories c ON c.id = p.category_id
  -- LEFT JOIN: orphan ürünleri (listingsiz) tut. Migration 013 değişiklik.
  LEFT JOIN listing_stats ls ON ls.product_id = p.id
  WHERE
    -- Price filter: kullanıcı price_min/max set ettiyse listing zorunlu.
    -- Set etmediyse orphan ürünler de geçsin.
    CASE
      WHEN price_min IS NULL AND price_max IS NULL THEN TRUE
      WHEN ls.product_id IS NULL THEN FALSE
      ELSE COALESCE(ls.matches_price_range, FALSE)
    END
    -- Variant color filter
    AND (
      variant_color_patterns IS NULL
      OR cardinality(variant_color_patterns) = 0
      OR p.variant_color ILIKE ANY(variant_color_patterns)
      OR p.title ILIKE ANY(variant_color_patterns)
    )
    -- Variant storage filter
    AND (
      variant_storage_patterns IS NULL
      OR cardinality(variant_storage_patterns) = 0
      OR p.variant_storage ILIKE ANY(variant_storage_patterns)
      OR p.title ILIKE ANY(variant_storage_patterns)
    )
  ORDER BY cm.similarity DESC, p.id
  LIMIT match_count;

END;
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- 3. Bonus: tsvector GIN index (gelecek tsvector geçişi için hazır)
-- ──────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_title_tsv
  ON products
  USING gin (to_tsvector('simple', COALESCE(title, '') || ' ' || COALESCE(brand, '')))
  WHERE is_active = true;

-- ============================================================================
-- Test
-- ============================================================================
--
-- spor-cantasi (0 emb, 0 listing) → category_browse path artık sonuç döndürmeli
--   SELECT id, title, listing_count, match_source FROM smart_search(
--     query_embedding := array_fill(0::float, ARRAY[768])::vector(768),
--     category_filter := 'spor-cantasi',
--     keyword_patterns := ARRAY['çanta'],
--     match_threshold := 0.3,
--     match_count := 10
--   );
--
-- telefon-kilifi (52 emb, çok listing) → vector path çalışmaya devam etmeli
--   SELECT id, title, listing_count, match_source FROM smart_search(
--     query_embedding := array_fill(0::float, ARRAY[768])::vector(768),
--     category_filter := 'telefon-kilifi',
--     keyword_patterns := ARRAY['kılıf'],
--     match_threshold := 0.0,
--     match_count := 5
--   );
-- ============================================================================
