-- ============================================================================
-- Migration 026 — stores tablosu: type / slug / base_url / trust_score /
-- affiliate_tag / is_active
-- ============================================================================
-- KÖK: stores tablosunda merchant metadata eksik. (id, name, url, logo,
-- created_at, updated_at sadece). Multi-merchant fiyat karşılaştırma için
-- per-store routing/scoring/affiliate yönetimi gerekli.
--
-- ÇÖZÜM: Yeni kolonlar ekle (rename YOK — kod 14+ dosyada `stores` referansı
-- içeriyor, uyumluluk korunur). 9 mevcut store için isim-eşleşmeli backfill.
--
-- IDEMPOTENT: ADD COLUMN IF NOT EXISTS, CREATE TYPE try-catch.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Enum: merchant_type
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE merchant_type AS ENUM ('marketplace', 'brand_store', 'retailer');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Yeni kolonlar
-- ----------------------------------------------------------------------------
ALTER TABLE stores ADD COLUMN IF NOT EXISTS slug          TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS base_url      TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS type          merchant_type;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS affiliate_tag TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS trust_score   DECIMAL(3,2) DEFAULT 1.00;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS is_active     BOOLEAN DEFAULT TRUE;

-- ----------------------------------------------------------------------------
-- 3. Backfill — 9 mevcut store
-- ----------------------------------------------------------------------------
-- Marketplaces: 3rd party seller'lar (Trendyol, Hepsiburada, Amazon TR, n11,
-- GittiGidiyor, PttAVM)
-- Retailers: kendi stoklarını satanlar (MediaMarkt, Vatan, Teknosa)

UPDATE stores SET
  slug      = 'trendyol',
  base_url  = 'https://www.trendyol.com',
  type      = 'marketplace',
  is_active = TRUE
WHERE LOWER(name) = 'trendyol';

UPDATE stores SET
  slug      = 'hepsiburada',
  base_url  = 'https://www.hepsiburada.com',
  type      = 'marketplace',
  is_active = TRUE
WHERE LOWER(name) = 'hepsiburada';

UPDATE stores SET
  slug      = 'amazon-tr',
  base_url  = 'https://www.amazon.com.tr',
  type      = 'marketplace',
  is_active = TRUE
WHERE LOWER(name) IN ('amazon', 'amazon tr', 'amazon.com.tr');

UPDATE stores SET
  slug      = 'mediamarkt',
  base_url  = 'https://www.mediamarkt.com.tr',
  type      = 'retailer',
  is_active = TRUE
WHERE LOWER(name) = 'mediamarkt';

UPDATE stores SET
  slug      = 'vatan',
  base_url  = 'https://www.vatanbilgisayar.com',
  type      = 'retailer',
  is_active = TRUE
WHERE LOWER(name) IN ('vatan', 'vatan bilgisayar');

UPDATE stores SET
  slug      = 'pttavm',
  base_url  = 'https://www.pttavm.com',
  type      = 'marketplace',
  is_active = TRUE
WHERE LOWER(name) = 'pttavm';

UPDATE stores SET
  slug      = 'gittigidiyor',
  base_url  = 'https://www.gittigidiyor.com',
  type      = 'marketplace',
  is_active = TRUE
WHERE LOWER(name) = 'gittigidiyor';

UPDATE stores SET
  slug      = 'n11',
  base_url  = 'https://www.n11.com',
  type      = 'marketplace',
  is_active = TRUE
WHERE LOWER(name) = 'n11';

UPDATE stores SET
  slug      = 'teknosa',
  base_url  = 'https://www.teknosa.com',
  type      = 'retailer',
  is_active = TRUE
WHERE LOWER(name) = 'teknosa';

-- ----------------------------------------------------------------------------
-- 4. UNIQUE + filter indexleri
-- ----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_stores_slug
  ON stores(slug) WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stores_type_active
  ON stores(type, is_active) WHERE is_active = TRUE;

COMMIT;

-- ============================================================================
-- VERIFY
-- ============================================================================

-- Tüm 9 store backfilled?
SELECT name, slug, base_url, type, trust_score, is_active
FROM stores
ORDER BY name;
-- Beklenen: 9 satır, slug+base_url+type DOLU, trust_score=1.00, is_active=TRUE

-- Slug NULL kalan var mı?
SELECT name FROM stores WHERE slug IS NULL;
-- Beklenen: 0 satır

-- Type dağılımı
SELECT type, COUNT(*) FROM stores GROUP BY type ORDER BY type;
-- Beklenen: marketplace=6 (Trendyol, Hepsiburada, Amazon TR, n11, GittiGidiyor, PttAVM)
--           retailer=3    (MediaMarkt, Vatan, Teknosa)
