-- ============================================================================
-- Migration 004 — smart_search RPC: variant_color + variant_storage filters
-- ============================================================================
--
-- Amaç:
--   Chatbot "siyah iphone", "256GB iphone", "siyah iphone 256GB" gibi
--   varyant filtreli sorguları doğru filtrelesin.
--
-- Sorun:
--   v1 smart_search renk/storage filtrelemesi yapmıyordu. Intent parser
--   must_have_specs.renk çıkarsa bile JSONB containment products.specs.Renk
--   üzerinde aranıyordu — ama specs'te renk alanı yok (variant_color kolonu
--   ayrı). Sonuç: filter no-match → keyword fallback → yanlış renkler.
--
-- Çözüm:
--   v2 smart_search'e variant_color_patterns + variant_storage_patterns
--   text[] parametreleri eklendi. Hibrit filter (variant_color sadece %34.5
--   dolu olduğu için title fallback şart):
--     (p.variant_color ILIKE ANY(...) OR p.title ILIKE ANY(...))
--
-- Filter final WHERE'de uygulanır (her kanal için ayrı değil) — daha temiz.
-- ============================================================================

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
    ls.min_price,
    ls.listing_count,
    cm.similarity,
    CASE
      WHEN POSITION(',' IN cm.match_source) > 0 THEN 'hybrid'
      ELSE cm.match_source
    END AS match_source
  FROM combined cm
  JOIN products p ON p.id = cm.id
  LEFT JOIN categories c ON c.id = p.category_id
  INNER JOIN listing_stats ls ON ls.product_id = p.id
  WHERE
    ls.matches_price_range = true
    AND ls.listing_count > 0
    -- VARIANT COLOR FILTER (yeni v2):
    AND (
      variant_color_patterns IS NULL
      OR cardinality(variant_color_patterns) = 0
      OR p.variant_color ILIKE ANY(variant_color_patterns)
      OR p.title ILIKE ANY(variant_color_patterns)
    )
    -- VARIANT STORAGE FILTER (yeni v2):
    AND (
      variant_storage_patterns IS NULL
      OR cardinality(variant_storage_patterns) = 0
      OR p.variant_storage ILIKE ANY(variant_storage_patterns)
      OR p.title ILIKE ANY(variant_storage_patterns)
    )
  ORDER BY cm.similarity DESC
  LIMIT match_count;

END;
$$;
