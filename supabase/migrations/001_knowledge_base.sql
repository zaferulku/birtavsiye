-- ============================================================================
-- Knowledge Base Schema
-- ============================================================================
--
-- Chatbot RAG (Retrieval-Augmented Generation) için bilgi bankası.
--
-- Amaç: Kullanıcı niyetini anlamak için Türkçe ürün dünyası bilgisi.
-- Örnek: "lavanta kokulu deodorant" → lavanta çiçeksi koku ailesi → arama
--
-- DB ürünlerinden bağımsız: mevcut 333 ürün veya gelecek 10K ürünün
-- specs'inden bağımsız çalışır. Dokümanlar bir kere yüklenir, her sorguda
-- semantic retrieval ile kullanılır.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- knowledge_chunks tablosu
-- ============================================================================

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  source       TEXT NOT NULL,
  source_hash  TEXT NOT NULL,
  chunk_index  INTEGER NOT NULL,

  category_slug    TEXT,
  topic            TEXT,
  language         TEXT NOT NULL DEFAULT 'tr',

  title            TEXT,
  content          TEXT NOT NULL,
  keywords         TEXT[],

  embedding        VECTOR(768),

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(source, chunk_index)
);

-- ============================================================================
-- Indexler
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_knowledge_embedding
  ON knowledge_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

CREATE INDEX IF NOT EXISTS idx_knowledge_category
  ON knowledge_chunks (category_slug)
  WHERE category_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_knowledge_topic
  ON knowledge_chunks (topic)
  WHERE topic IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_knowledge_keywords
  ON knowledge_chunks
  USING gin (keywords);

CREATE INDEX IF NOT EXISTS idx_knowledge_source_hash
  ON knowledge_chunks (source, source_hash);

-- ============================================================================
-- RPC: Semantic retrieval
-- ============================================================================

CREATE OR REPLACE FUNCTION retrieve_knowledge(
  query_embedding    VECTOR(768),
  match_threshold    FLOAT DEFAULT 0.65,
  match_count        INT DEFAULT 5,
  filter_category    TEXT DEFAULT NULL,
  filter_topic       TEXT DEFAULT NULL
)
RETURNS TABLE (
  id               UUID,
  source           TEXT,
  category_slug    TEXT,
  topic            TEXT,
  title            TEXT,
  content          TEXT,
  keywords         TEXT[],
  similarity       FLOAT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    k.id,
    k.source,
    k.category_slug,
    k.topic,
    k.title,
    k.content,
    k.keywords,
    (1 - (k.embedding <=> query_embedding)) AS similarity
  FROM knowledge_chunks k
  WHERE
    k.embedding IS NOT NULL
    AND (filter_category IS NULL OR k.category_slug = filter_category OR k.category_slug IS NULL)
    AND (filter_topic IS NULL OR k.topic = filter_topic)
    AND (1 - (k.embedding <=> query_embedding)) > match_threshold
  ORDER BY k.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ============================================================================
-- RPC: Keyword-based retrieval (fallback)
-- ============================================================================

CREATE OR REPLACE FUNCTION retrieve_knowledge_by_keywords(
  query_keywords   TEXT[],
  filter_category  TEXT DEFAULT NULL,
  match_count      INT DEFAULT 5
)
RETURNS TABLE (
  id            UUID,
  source        TEXT,
  category_slug TEXT,
  topic         TEXT,
  title         TEXT,
  content       TEXT,
  match_count_out INT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    k.id,
    k.source,
    k.category_slug,
    k.topic,
    k.title,
    k.content,
    cardinality(ARRAY(SELECT unnest(k.keywords) INTERSECT SELECT unnest(query_keywords)))::INT AS match_count_out
  FROM knowledge_chunks k
  WHERE
    k.keywords && query_keywords
    AND (filter_category IS NULL OR k.category_slug = filter_category OR k.category_slug IS NULL)
  ORDER BY match_count_out DESC
  LIMIT match_count;
$$;

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "knowledge_chunks_read_all"
  ON knowledge_chunks
  FOR SELECT
  USING (true);

CREATE POLICY "knowledge_chunks_write_service"
  ON knowledge_chunks
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
