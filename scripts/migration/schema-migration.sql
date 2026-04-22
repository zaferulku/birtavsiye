-- =============================================================================
-- birtavsiye.net — Schema Migration v2.0 (Clean Slate)
-- =============================================================================
-- TARİH: 2026-04-22
-- YAKLAŞIM: Backup al → ürün katmanını sıfırla → yeni temiz yapıyı kur
--
-- KORUNACAK TABLOLAR (dokunulmayacak):
--   profiles, public_profiles, stores, agent_logs
--
-- YAPISI KORUNUR, VERİSİ TEMİZLENİR (TRUNCATE):
--   topics, topic_answers, topic_votes, topic_answer_votes, post_votes,
--   community_posts, favorites, price_alerts, affiliate_links,
--   review_queue, product_queue
--
-- SİLİNİP YENİDEN KURULACAK:
--   products, categories, prices (→ listings), price_history
--
-- YENİ EKLENECEK:
--   listings, category_aliases, agent_decisions, decision_feedback,
--   learned_patterns, categorization_cache, source_category_mappings
-- =============================================================================

-- -----------------------------------------------------------------------------
-- GÜVENLİK: pgvector var mı?
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    RAISE EXCEPTION 'pgvector extension yok! Supabase Dashboard -> Database -> Extensions''den aktive et.';
  END IF;
END $$;


-- =============================================================================
-- ADIM 1: BACKUP — Geri dönüş sigortası
-- =============================================================================

DROP TABLE IF EXISTS backup_20260422_products;
DROP TABLE IF EXISTS backup_20260422_categories;
DROP TABLE IF EXISTS backup_20260422_prices;
DROP TABLE IF EXISTS backup_20260422_price_history;

CREATE TABLE backup_20260422_products AS SELECT * FROM products;
CREATE TABLE backup_20260422_categories AS SELECT * FROM categories;
CREATE TABLE backup_20260422_prices AS SELECT * FROM prices;
CREATE TABLE backup_20260422_price_history AS SELECT * FROM price_history;

-- Backup doğrulama
SELECT 'backup_products' as tablo, COUNT(*) as satir FROM backup_20260422_products
UNION ALL SELECT 'backup_categories', COUNT(*) FROM backup_20260422_categories
UNION ALL SELECT 'backup_prices', COUNT(*) FROM backup_20260422_prices
UNION ALL SELECT 'backup_price_history', COUNT(*) FROM backup_20260422_price_history;


-- =============================================================================
-- ADIM 2: FOREIGN KEY'LERİ TEMİZLE + ÜRÜNE BAĞLI TABLOLARDAKİ TEST VERİSİNİ SİL
-- =============================================================================

-- Bu tablolarının YAPISI korunur, sadece İÇERİĞİ temizlenir
-- Böylece forum/kullanıcı yapısı dokunulmaz ama product_id'lerin patlaması önlenir
TRUNCATE TABLE price_alerts CASCADE;
TRUNCATE TABLE favorites CASCADE;
TRUNCATE TABLE affiliate_links CASCADE;
TRUNCATE TABLE product_queue CASCADE;
TRUNCATE TABLE review_queue CASCADE;
TRUNCATE TABLE topic_votes CASCADE;
TRUNCATE TABLE topic_answer_votes CASCADE;
TRUNCATE TABLE post_votes CASCADE;
TRUNCATE TABLE topic_answers CASCADE;
TRUNCATE TABLE topics CASCADE;
TRUNCATE TABLE community_posts CASCADE;


-- =============================================================================
-- ADIM 3: ESKİ ÜRÜN KATMANI TABLOLARI VE RPC'Yİ SİL
-- =============================================================================

DROP FUNCTION IF EXISTS match_products(vector, integer, double precision) CASCADE;

DROP TABLE IF EXISTS price_history CASCADE;
DROP TABLE IF EXISTS prices CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;


-- =============================================================================
-- ADIM 4: YENİ TEMİZ YAPI — CATEGORIES
-- =============================================================================

CREATE TABLE categories (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL,
  icon             TEXT,
  parent_id        UUID REFERENCES categories(id) ON DELETE RESTRICT,
  sort_order       INTEGER DEFAULT 0,

  -- Classifier alanları (YAML'dan senkronize edilir)
  keywords         TEXT[],
  title_patterns   TEXT[],
  exclude_keywords TEXT[],
  related_brands   TEXT[],
  migrate_from     TEXT[],

  is_active        BOOLEAN DEFAULT true,
  is_leaf          BOOLEAN DEFAULT false,

  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_active ON categories(is_active) WHERE is_active = true;


-- Eski slug'ları yeniye bağlayan tablo (URL redirect için)
CREATE TABLE category_aliases (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alias_slug       TEXT NOT NULL UNIQUE,
  canonical_id     UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  source           TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_category_aliases_slug ON category_aliases(alias_slug);


-- =============================================================================
-- ADIM 5: YENİ TEMİZ YAPI — PRODUCTS (canonical)
-- =============================================================================

CREATE TABLE products (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Kimlik
  title            TEXT NOT NULL,
  slug             TEXT UNIQUE,

  -- Hiyerarşi
  category_id      UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,

  -- Brand & Model (LLM ile normalize edilir)
  brand            TEXT NOT NULL,
  model_family     TEXT,
  model_code       TEXT,

  -- Varyantlar (dedup key'leri)
  variant_storage  TEXT,
  variant_color    TEXT,
  variant_size     TEXT,
  variant_other    JSONB DEFAULT '{}'::jsonb,

  -- İçerik
  description      TEXT,
  image_url        TEXT,
  images           TEXT[],
  specs            JSONB DEFAULT '{}'::jsonb,

  -- Arama (Gemini text-embedding-004 — 768 boyut)
  embedding        VECTOR(768),
  search_vector    TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('turkish',
      COALESCE(title, '') || ' ' ||
      COALESCE(brand, '') || ' ' ||
      COALESCE(model_family, '') || ' ' ||
      COALESCE(description, '')
    )
  ) STORED,

  -- Kalite
  is_active        BOOLEAN DEFAULT true,
  is_verified      BOOLEAN DEFAULT false,
  quality_score    NUMERIC(3,2) DEFAULT 0.5,

  -- Meta (Icecat, vs)
  icecat_id        TEXT,

  -- Audit
  classified_by    TEXT,
  classified_at    TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Dedup için unique constraint
CREATE UNIQUE INDEX uq_products_dedup ON products(
  brand,
  COALESCE(model_family, ''),
  COALESCE(variant_storage, ''),
  COALESCE(variant_color, '')
) WHERE is_active = true;

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_search ON products USING GIN(search_vector);
CREATE INDEX idx_products_embedding ON products USING hnsw (embedding vector_cosine_ops);


-- =============================================================================
-- ADIM 6: YENİ TEMİZ YAPI — LISTINGS (her satıcının fiyatı)
-- =============================================================================

CREATE TABLE listings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  store_id          UUID REFERENCES stores(id) ON DELETE SET NULL,

  -- Kaynak bilgisi
  source            TEXT NOT NULL,
  source_product_id TEXT,
  source_url        TEXT NOT NULL,
  source_category   TEXT,
  source_title      TEXT NOT NULL,

  -- Fiyat
  price             NUMERIC(12,2) NOT NULL,
  original_price    NUMERIC(12,2),
  currency          TEXT DEFAULT 'TRY',

  -- Stok
  in_stock          BOOLEAN DEFAULT true,
  stock_count       INTEGER,

  -- Affiliate
  affiliate_url     TEXT,

  -- Satıcı metadata
  seller_name       TEXT,
  seller_rating     NUMERIC(3,2),

  -- Kargo
  free_shipping     BOOLEAN DEFAULT false,
  shipping_price    NUMERIC(8,2),

  -- Zamanlama
  first_seen        TIMESTAMPTZ DEFAULT NOW(),
  last_seen         TIMESTAMPTZ DEFAULT NOW(),
  last_price_change TIMESTAMPTZ DEFAULT NOW(),

  is_active         BOOLEAN DEFAULT true,

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(source, source_product_id)
);

CREATE INDEX idx_listings_product ON listings(product_id);
CREATE INDEX idx_listings_store ON listings(store_id);
CREATE INDEX idx_listings_source ON listings(source);
CREATE INDEX idx_listings_active_price ON listings(product_id, price ASC) WHERE is_active = true AND in_stock = true;
CREATE INDEX idx_listings_last_seen ON listings(last_seen);


-- Fiyat geçmişi
CREATE TABLE price_history (
  id           BIGSERIAL PRIMARY KEY,
  listing_id   UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  price        NUMERIC(12,2) NOT NULL,
  recorded_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_price_history_listing ON price_history(listing_id, recorded_at DESC);


-- =============================================================================
-- ADIM 7: AGENT & LEARNING TABLOLARI (self-governance)
-- =============================================================================

-- Her agent kararı burada loglanır
CREATE TABLE agent_decisions (
  id                  BIGSERIAL PRIMARY KEY,
  timestamp           TIMESTAMPTZ DEFAULT NOW(),

  agent_name          TEXT NOT NULL,
  agent_version       TEXT,

  input_hash          TEXT NOT NULL,
  input_data          JSONB NOT NULL,

  output_data         JSONB NOT NULL,
  confidence          NUMERIC(3,2),
  method              TEXT NOT NULL,  -- 'cache' | 'rule' | 'llm' | 'manual' | 'fallback'

  latency_ms          INTEGER,
  tokens_used         INTEGER,

  related_entity_type TEXT,
  related_entity_id   UUID
);

CREATE INDEX idx_agent_decisions_agent ON agent_decisions(agent_name, timestamp DESC);
CREATE INDEX idx_agent_decisions_hash ON agent_decisions(input_hash);
CREATE INDEX idx_agent_decisions_method ON agent_decisions(agent_name, method);


-- Karar geri bildirimleri (yanlış/doğru işaretleme)
CREATE TABLE decision_feedback (
  id                BIGSERIAL PRIMARY KEY,
  decision_id       BIGINT NOT NULL REFERENCES agent_decisions(id) ON DELETE CASCADE,

  feedback_type     TEXT NOT NULL,  -- 'correct' | 'wrong' | 'user_clicked' | 'admin_override'
  feedback_value    JSONB,

  source            TEXT NOT NULL,  -- 'user' | 'admin' | 'downstream_agent'
  source_identifier TEXT,

  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feedback_decision ON decision_feedback(decision_id);


-- Öğrenilen pattern'ler
CREATE TABLE learned_patterns (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name          TEXT NOT NULL,

  pattern_type        TEXT NOT NULL,  -- 'title_keyword' | 'brand_category' | 'query_intent' | 'source_mapping'
  pattern_data        JSONB NOT NULL,

  evidence_count      INTEGER DEFAULT 1,
  contradiction_count INTEGER DEFAULT 0,
  confidence          NUMERIC(3,2) DEFAULT 0.5,

  status              TEXT DEFAULT 'pending',  -- 'pending' | 'active' | 'deprecated' | 'rejected'
  activated_at        TIMESTAMPTZ,
  deprecated_at       TIMESTAMPTZ,

  first_seen          TIMESTAMPTZ DEFAULT NOW(),
  last_seen           TIMESTAMPTZ DEFAULT NOW(),
  last_evidence_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_patterns_agent ON learned_patterns(agent_name, status);
CREATE INDEX idx_patterns_type ON learned_patterns(pattern_type, status);


-- Classification cache (hızlı lookup)
CREATE TABLE categorization_cache (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  title_hash       TEXT NOT NULL UNIQUE,
  normalized_title TEXT NOT NULL,

  brand            TEXT,
  category_slug    TEXT NOT NULL,
  model_family     TEXT,
  variant_storage  TEXT,
  variant_color    TEXT,

  confidence       NUMERIC(3,2) DEFAULT 0.9,
  method           TEXT NOT NULL,  -- 'gemini' | 'rule' | 'manual'

  hit_count        INTEGER DEFAULT 1,
  last_hit         TIMESTAMPTZ DEFAULT NOW(),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cat_cache_hash ON categorization_cache(title_hash);
CREATE INDEX idx_cat_cache_category ON categorization_cache(category_slug);


-- Kaynak kategori → canonical kategori mapping
CREATE TABLE source_category_mappings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source          TEXT NOT NULL,
  source_category TEXT NOT NULL,
  canonical_slug  TEXT NOT NULL,
  confidence      NUMERIC(3,2) DEFAULT 1.0,

  created_by      TEXT DEFAULT 'manual',
  evidence_count  INTEGER DEFAULT 1,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(source, source_category)
);

CREATE INDEX idx_source_cat_lookup ON source_category_mappings(source, source_category);


-- =============================================================================
-- ADIM 8: RPC — KATEGORİ-AWARE SEMANTİK ARAMA
-- =============================================================================

CREATE OR REPLACE FUNCTION match_products(
  query_embedding   VECTOR(768),
  category_slugs    TEXT[] DEFAULT NULL,
  brand_filter      TEXT DEFAULT NULL,
  price_min         NUMERIC DEFAULT NULL,
  price_max         NUMERIC DEFAULT NULL,
  min_similarity    NUMERIC DEFAULT 0.25,
  match_count       INTEGER DEFAULT 10
)
RETURNS TABLE (
  id               UUID,
  title            TEXT,
  slug             TEXT,
  brand            TEXT,
  model_family     TEXT,
  category_slug    TEXT,
  image_url        TEXT,
  min_price        NUMERIC,
  listing_count    INTEGER,
  similarity       NUMERIC
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    p.id,
    p.title,
    p.slug,
    p.brand,
    p.model_family,
    c.slug as category_slug,
    p.image_url,
    COALESCE(MIN(l.price) FILTER (WHERE l.is_active AND l.in_stock), 0) as min_price,
    COUNT(l.id) FILTER (WHERE l.is_active AND l.in_stock)::INTEGER as listing_count,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM products p
  JOIN categories c ON p.category_id = c.id
  LEFT JOIN listings l ON l.product_id = p.id
  WHERE
    p.is_active = true
    AND p.embedding IS NOT NULL
    AND 1 - (p.embedding <=> query_embedding) >= min_similarity
    AND (category_slugs IS NULL OR c.slug = ANY(category_slugs))
    AND (brand_filter IS NULL OR LOWER(p.brand) = LOWER(brand_filter))
  GROUP BY p.id, c.slug
  HAVING
    (price_min IS NULL OR MIN(l.price) >= price_min)
    AND (price_max IS NULL OR MIN(l.price) <= price_max)
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
$$;


-- =============================================================================
-- ADIM 9: UPDATED_AT TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER source_mappings_updated_at
  BEFORE UPDATE ON source_category_mappings
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- =============================================================================
-- ADIM 10: DOĞRULAMA
-- =============================================================================

SELECT 'Yeni tablolar:' as info;

SELECT
  table_name,
  (xpath('/row/c/text()',
    query_to_xml(format('select count(*) as c from %I', table_name), false, true, '')
  ))[1]::text::int as row_count
FROM (VALUES
  ('categories'),
  ('category_aliases'),
  ('products'),
  ('listings'),
  ('price_history'),
  ('agent_decisions'),
  ('decision_feedback'),
  ('learned_patterns'),
  ('categorization_cache'),
  ('source_category_mappings')
) t(table_name)
ORDER BY table_name;

SELECT 'Backup tabloları:' as info;

SELECT
  'backup_products' as tablo,
  COUNT(*) as satir
FROM backup_20260422_products
UNION ALL SELECT 'backup_categories', COUNT(*) FROM backup_20260422_categories
UNION ALL SELECT 'backup_prices', COUNT(*) FROM backup_20260422_prices;

SELECT 'Korunan tablolar (yapı aynı, veri temizlendi):' as info;

SELECT tablo, satir FROM (
  SELECT 'topics' as tablo, COUNT(*) as satir FROM topics
  UNION ALL SELECT 'topic_answers', COUNT(*) FROM topic_answers
  UNION ALL SELECT 'favorites', COUNT(*) FROM favorites
  UNION ALL SELECT 'price_alerts', COUNT(*) FROM price_alerts
  UNION ALL SELECT 'community_posts', COUNT(*) FROM community_posts
) t;

SELECT 'Migration tamamlandı. Sıradaki adım: seed kategorileri.' as info;
