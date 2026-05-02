-- 031_akilli_ev_leaf.sql
-- elektronik/akilli-ev leaf ekleme (P6.13)
-- Phase 5D-3.3 NAV audit'inde "Akıllı Ev" sub'ı için DB karşılığı yoktu,
-- geçici parent fallback (elektronik/ag-guvenlik) kullanılıyordu (P6.2b).
-- Bu migration gerçek leaf'i ekler.
--
-- Audit sonucu (2026-05-02):
-- - elektronik parent: 31ed856a-f0bc-44e2-aa64-fcc2dde1d814
-- - akilli-ev leaf YOK (yeni)
-- - 16+ IoT ürün dağılmış:
--   * 7 modem (Google Nest router doğru, TP-Link priz yanlış)
--   * 2 akilli-telefon (XIAOMI Smart Plug yanlış)
--   * 2 kulaklik (Amazon Echo Buds — doğru kategoride)
--   * 2 kamp, 1 icecek, 1 robot-supurge — manuel review gerek
--
-- Bu migration SADECE leaf ekler. Ürün re-categorization P6.13b borç
-- (false positive riski yüksek — kulaklık/kamera doğru kategoride).

BEGIN;

INSERT INTO categories (slug, name, parent_id, level, is_leaf, is_active, keywords)
SELECT
  'elektronik/akilli-ev',
  'Akıllı Ev',
  id,
  1,  -- mid level (root altı, leaf=true çünkü altı yok)
  true,
  true,
  ARRAY[
    'akıllı ev', 'akilli ev', 'smart home', 'iot', 'akıllı cihaz', 'akilli cihaz',
    'akıllı priz', 'akilli priz', 'smart plug',
    'akıllı ampul', 'akilli ampul', 'smart bulb',
    'philips hue', 'google nest', 'amazon echo', 'alexa',
    'akıllı kilit', 'akilli kilit', 'smart lock',
    'akıllı sensör', 'akilli sensor',
    'akıllı şerit', 'akilli serit', 'led şerit', 'led serit',
    'tp-link tapo', 'xiaomi mi smart'
  ]::text[]
FROM categories
WHERE slug = 'elektronik'
ON CONFLICT (slug) DO NOTHING;

-- Self-verify
DO $$
DECLARE
  leaf_exists BOOLEAN;
  leaf_kw_count INT;
BEGIN
  SELECT EXISTS(SELECT 1 FROM categories WHERE slug = 'elektronik/akilli-ev')
    INTO leaf_exists;

  IF NOT leaf_exists THEN
    RAISE EXCEPTION 'Migration 031: elektronik/akilli-ev leaf olusmadi';
  END IF;

  SELECT cardinality(keywords) INTO leaf_kw_count
  FROM categories WHERE slug = 'elektronik/akilli-ev';

  RAISE NOTICE 'Migration 031: elektronik/akilli-ev leaf OK (% keyword)', leaf_kw_count;
END $$;

COMMIT;
