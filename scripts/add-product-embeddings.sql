-- Product embeddings (RAG için) — nv-embedqa-e5-v5 1024-dim
-- Supabase SQL Editor'de çalıştır

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE products ADD COLUMN IF NOT EXISTS embedding vector(1024);

-- HNSW index for fast similarity search
CREATE INDEX IF NOT EXISTS idx_products_embedding
  ON products
  USING hnsw (embedding vector_cosine_ops);

-- RPC: top-K benzer ürünler
-- Kullanım: SELECT * FROM match_products('[0.1, ...]'::vector, 10, 0.3);
CREATE OR REPLACE FUNCTION match_products(
  query_embedding vector(1024),
  match_count int DEFAULT 10,
  min_similarity float DEFAULT 0.3
)
RETURNS TABLE (
  id uuid,
  title text,
  slug text,
  brand text,
  model_family text,
  image_url text,
  category_id uuid,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    p.id,
    p.title,
    p.slug,
    p.brand,
    p.model_family,
    p.image_url,
    p.category_id,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM products p
  WHERE p.embedding IS NOT NULL
    AND 1 - (p.embedding <=> query_embedding) >= min_similarity
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION match_products TO anon, authenticated;
