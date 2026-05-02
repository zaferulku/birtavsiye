-- 033_iot_recategorize.sql
-- P6.13b: Migration 031 (elektronik/akilli-ev leaf) sonrası mevcut yanlış
-- kategorilerdeki IoT ürünlerini doğru leaf'e taşır.
--
-- Manuel review (kullanıcı onaylı, 2026-05-02):
-- - 24 ürün → elektronik/akilli-ev (akıllı ampul/priz/sensör/genel IoT)
-- - 6 ürün → elektronik/ag-guvenlik/guvenlik-kamera (TP-Link Tapo C-serisi)
--
-- False positive EXCLUDED:
-- - Echo Buds (kulaklık, doğru kategoride kalır)
-- - Google Nest Wifi Router (network ekipmanı, modem'de kalır)
-- - Robot süpürgeler (zaten temizlik/robot-supurge'da)
--
-- Idempotent: tekrar çalışırsa zaten doğru kategoride olanlar değişmez
-- (UPDATE no-op). Transactional, rollback-safe.

BEGIN;

-- ----------------------------------------------------------------------------
-- Step 1: 24 ürün → elektronik/akilli-ev
-- ----------------------------------------------------------------------------

UPDATE products
SET category_id = (SELECT id FROM categories WHERE slug = 'elektronik/akilli-ev')
WHERE id IN (
  -- TP-Link Tapo akıllı ampul/LED (7)
  'abbbbda3-13a2-44ca-a5cd-60d158610304',  -- Tapo L530E (4-Paket) Akıllı Ampul
  '8affaf28-7dcc-40b2-bdd8-db7cf1368242',  -- Tapo L520E Akıllı Led Ampul
  '87638d65-053a-4b45-aed1-9fdc4ce2bfe2',  -- Tapo L530E (2-Pack) Akıllı Ampül
  'f9690ef2-c4f0-4459-b13a-2f282fe9e35e',  -- Tapo L530E (Pack) Akıllı Ampül
  '6dcb12d6-eda1-4eec-be1a-e8c11cf5ac57',  -- Tapo L920-5 Wi-Fi LED Şerit
  'd6655070-9cbf-4851-bc32-4cdf1eb9bf9d',  -- Tapo L900-5 Renkli Led Şerit
  '93b7a705-e497-4931-b301-6cb686ed8bc6',  -- Tapo L920-5 Wi-Fi Renkli Led Şerit

  -- Philips Hue (1)
  '612f12ec-a009-45e9-802b-a6bb91fe0162',  -- Philips Hue Outdoor 40W

  -- Akıllı priz (8)
  '2145a716-f200-4065-b312-24062862593b',  -- Tapo P100 (4-pack) Mini Wi-Fi
  '03618f2b-dfef-496b-97f4-2671349c5d1a',  -- Tapo P115 (1-pack)
  '490e07ff-939e-4b05-98fe-baf710e01ac6',  -- Tapo P100 (1-pack)
  '8c8891e3-ef69-4acf-adef-d18da77ce650',  -- Tapo P110 Mini Wi-Fi 4'lü Akıllı Priz
  'c8c14cc9-7975-46b8-b120-8769b4f123c1',  -- Tapo P115 (1-pack)
  'a66bd50a-6e70-4104-a1c8-c0af51e7e3b2',  -- Xiaomi Telefon Kontrollü
  '64038fa4-9c95-4f23-9062-7e6742b2b53d',  -- Xiaomi Mi Smart Plug 2
  '8cb89ede-3b8d-42f0-8638-25fdb7dda6f1',  -- Tapo S220 Akıllı Işık Anahtarı

  -- Akıllı sensör (5)
  'f03c52b4-d691-4e43-9cfc-cb4374ce15a8',  -- Tapo T100 Hareket Sensörü
  'b4594c55-3327-4b02-83d4-ff2ad06fd8af',  -- Tapo T100 Smart Motion Sensor
  '1045e9bc-f6c5-458f-9233-d1a487e7f40e',  -- Tapo T110 Smart Door/Window
  '1f5925c4-c93a-4d6a-b702-cba1729a9de3',  -- Tapo T30 KIT Sensör Kiti
  'd43e5938-60b7-4b2d-99d5-394dacbc92fd',  -- Tapo T300 Su Sızıntı Sensörü

  -- Diğer akıllı ev (3)
  'cc3a0995-58e3-48fe-a675-3d275ac0aaa0',  -- Xiaomi Mi Smart Hava Nemlendirici
  '5d4ec64b-a385-45b3-ac4c-04db50a65ace',  -- XIAOMI Mi Smart Space Heater
  '3cccbee3-be17-4a1b-935f-22bee1ce3d5a'   -- Govee Outdoor Smart Porch Light
);

-- ----------------------------------------------------------------------------
-- Step 2: 6 ürün → elektronik/ag-guvenlik/guvenlik-kamera
-- ----------------------------------------------------------------------------

UPDATE products
SET category_id = (SELECT id FROM categories WHERE slug = 'elektronik/ag-guvenlik/guvenlik-kamera')
WHERE id IN (
  '7553ba43-8d39-418e-bfef-56582f6fb201',  -- Tapo C220 Wi-Fi Kamera
  '56b94bfe-4b5a-447d-8129-8b96fe3c7608',  -- Tapo C225 Wi-Fi Kamera
  '64ce7508-bea0-438a-8dca-f69eed886329',  -- Tapo C260 4K Güvenlik Kamera
  '8632867d-d704-4919-ac4c-b2b7c8791692',  -- Tapo C510W Wi-Fi Kamera
  'bcc693ec-ab3b-4d5d-a81e-f2a2e399c380',  -- Tapo C510W (kamera/fotograf'tan)
  'b3be5058-de16-4645-bca5-fe3809f54034'   -- Tapo C520WS (modem'den)
);

-- ----------------------------------------------------------------------------
-- Step 3: Self-verify
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  akilli_ev_count INT;
  guvenlik_kamera_count INT;
  expected_akilli_ev INT := 24;  -- önceki 0 + 24 yeni taşıma
BEGIN
  SELECT COUNT(*) INTO akilli_ev_count
  FROM products p
  JOIN categories c ON c.id = p.category_id
  WHERE c.slug = 'elektronik/akilli-ev'
    AND p.is_active;

  SELECT COUNT(*) INTO guvenlik_kamera_count
  FROM products p
  JOIN categories c ON c.id = p.category_id
  WHERE c.slug = 'elektronik/ag-guvenlik/guvenlik-kamera'
    AND p.is_active;

  RAISE NOTICE 'Migration 033: % ürün elektronik/akilli-ev kategorisinde', akilli_ev_count;
  RAISE NOTICE 'Migration 033: % ürün elektronik/ag-guvenlik/guvenlik-kamera kategorisinde', guvenlik_kamera_count;

  IF akilli_ev_count < expected_akilli_ev THEN
    RAISE WARNING 'Migration 033: akilli-ev count beklenenden az (% < %)', akilli_ev_count, expected_akilli_ev;
  END IF;
END $$;

COMMIT;
