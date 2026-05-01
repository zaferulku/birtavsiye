-- ============================================================================
-- Migration 028 — raw_offers staging tablosu
-- ============================================================================
-- KÖK: Scraper kalite katmanı yok. Mevcut scraper'lar (mediamarkt, pttavm, vs)
-- direkt listings tablosuna yazıyor — fuzzy matching, GTIN doğrulama, manual
-- review akışı yok.
--
-- ÇÖZÜM: raw_offers staging tablosu — scraper buraya yazar, GTIN/MPN/fuzzy
-- match algoritması canonical product ile eşler, sonuç matched/review/rejected
-- statüsünde categorize edilir; matched olanlar listings'e promote edilir.
--
-- Mevcut scraper'lara DOKUNULMAZ — bu tablo opsiyonel kullanılır. Boş kalır,
-- 025b sonrası yeni scraper davranışı bu yola döner.
--
-- IDEMPOTENT: ENUM try-catch, CREATE TABLE IF NOT EXISTS, INDEX IF NOT EXISTS,
-- DROP TRIGGER + CREATE.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Enum: matching_status
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE matching_status AS ENUM (
    'pending',     -- yeni scrape, henüz match denenmedi
    'matched',     -- canonical product'a yüksek güvenle eşlendi
    'unmatched',   -- match denendi, score düşük → otomatik aday yok
    'review',      -- score orta → insan kararı bekleniyor
    'rejected'     -- spam/dup/hata olarak işaretlendi (insan kararı)
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 2. raw_offers tablosu
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS raw_offers (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id           UUID REFERENCES stores(id) ON DELETE SET NULL,

  -- Raw scraped data
  raw_title          TEXT NOT NULL,
  raw_brand          TEXT,
  raw_gtin           TEXT,
  raw_mpn            TEXT,
  raw_price          DECIMAL(12,2),
  raw_currency       TEXT DEFAULT 'TRY',
  raw_url            TEXT NOT NULL,
  raw_image_url      TEXT,
  raw_payload        JSONB,                          -- tam scrape sonucu (debug + ileri matching)

  -- Matching
  status             matching_status NOT NULL DEFAULT 'pending',
  matched_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  match_confidence   DECIMAL(3,2),                   -- 0.00-1.00
  match_method       TEXT,                           -- 'gtin' | 'mpn+brand' | 'fuzzy_title' | 'manual'
  matched_at         TIMESTAMPTZ,

  -- Audit
  scraped_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. Indexler
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_raw_offers_status
  ON raw_offers(status);

CREATE INDEX IF NOT EXISTS idx_raw_offers_gtin
  ON raw_offers(raw_gtin) WHERE raw_gtin IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_raw_offers_store
  ON raw_offers(store_id);

CREATE INDEX IF NOT EXISTS idx_raw_offers_scraped_at
  ON raw_offers(scraped_at DESC);

-- ----------------------------------------------------------------------------
-- 4. updated_at trigger (Migration 025'teki update_updated_at function)
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_raw_offers_updated ON raw_offers;
CREATE TRIGGER trg_raw_offers_updated
  BEFORE UPDATE ON raw_offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ----------------------------------------------------------------------------
-- 5. Yetki kilitleme — sadece service_role yazar/okur
-- ----------------------------------------------------------------------------
-- Default GRANT ALL TO PUBLIC otomatik olur → REVOKE şart (Migration 016 dersi).
REVOKE ALL ON raw_offers FROM PUBLIC, anon, authenticated;
-- service_role default tüm yetkilere sahip (Supabase setup'ı), dokunulmaz.

COMMIT;

-- ============================================================================
-- VERIFY
-- ============================================================================

-- Tablo varlık + boş mu?
SELECT COUNT(*) AS row_count FROM raw_offers;
-- Beklenen: 0

-- Kolon sayısı + yapı
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'raw_offers'
ORDER BY ordinal_position;
-- Beklenen: 19 kolon

-- Index sayısı
SELECT indexname FROM pg_indexes WHERE tablename = 'raw_offers' ORDER BY indexname;
-- Beklenen: 5 (raw_offers_pkey + 4 idx_raw_offers_*)

-- Trigger
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_table = 'raw_offers';
-- Beklenen: 1 satır (trg_raw_offers_updated)

-- ENUM tipi
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'matching_status'::regtype
ORDER BY enumsortorder;
-- Beklenen: 5 satır (pending, matched, unmatched, review, rejected)
