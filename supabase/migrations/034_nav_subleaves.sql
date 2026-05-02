-- 034_nav_subleaves.sql
-- P6.3-B: NAV constant 53 dup audit'inde tespit edilen 3 grup için sub-leaf
-- ekleme. Önceki yapı: Bilgisayar Parçaları + Çevre Birimleri + Veri Depolama
-- üçü de tek bilesenler slug'ında topluyor (kullanıcı PC parçası tıklayınca
-- klavye + USB bellek de listeye karışıyor). Aynı pattern parfum (kadın/erkek/
-- unisex tek slug) ve oyun/konsol (konsol + aksesuar + PC + VR tek slug).
--
-- Bu migration 9 yeni sub-leaf ekler. Migration 032 trigger sayesinde
-- 3 parent (bilesenler, parfum, konsol) otomatik is_leaf=false olur.
--
-- Header.tsx 9 entry slug update ayrı commit'te (sadece slug değiştirir,
-- label/tags korunur).

BEGIN;

-- ---------------------------------------------------------------------------
-- Step 1: 9 yeni sub-leaf
-- ---------------------------------------------------------------------------

INSERT INTO categories (slug, name, parent_id, level, is_leaf, is_active, keywords)
VALUES
  -- Bilesenler grubu (parent: elektronik/bilgisayar-tablet/bilesenler)
  ('elektronik/bilgisayar-tablet/bilesenler/parca',
   'Bilgisayar Parçaları',
   (SELECT id FROM categories WHERE slug = 'elektronik/bilgisayar-tablet/bilesenler'),
   3, true, true,
   ARRAY['ram', 'ssd', 'işlemci', 'islemci', 'cpu', 'anakart', 'ekran kartı',
         'ekran karti', 'gpu', 'kasa', 'güç kaynağı', 'guc kaynagi', 'fan',
         'soğutucu', 'sogutucu', 'nvidia', 'amd', 'intel']),
  ('elektronik/bilgisayar-tablet/bilesenler/cevre-birim',
   'Çevre Birimleri',
   (SELECT id FROM categories WHERE slug = 'elektronik/bilgisayar-tablet/bilesenler'),
   3, true, true,
   ARRAY['klavye', 'mouse', 'webcam', 'yazıcı', 'yazici', 'tarayıcı',
         'tarayici', 'mikrofon', 'hub', 'docking station']),
  ('elektronik/bilgisayar-tablet/bilesenler/veri-depolama',
   'Veri Depolama',
   (SELECT id FROM categories WHERE slug = 'elektronik/bilgisayar-tablet/bilesenler'),
   3, true, true,
   ARRAY['usb bellek', 'hard disk', 'ssd', 'taşınabilir disk', 'tasinabilir disk',
         'hafıza kartı', 'hafiza karti', 'sd kart', 'micro sd', 'nas']),

  -- Parfum grubu (parent: kozmetik/parfum)
  ('kozmetik/parfum/kadin', 'Kadın Parfüm',
   (SELECT id FROM categories WHERE slug = 'kozmetik/parfum'),
   2, true, true,
   ARRAY['kadın parfüm', 'kadin parfum', 'edp', 'eau de parfum',
         'kadın koku', 'kadin koku', 'çiçeksi', 'cicegimsi', 'oryantal']),
  ('kozmetik/parfum/erkek', 'Erkek Parfüm',
   (SELECT id FROM categories WHERE slug = 'kozmetik/parfum'),
   2, true, true,
   ARRAY['erkek parfüm', 'erkek parfum', 'eau de toilette', 'edt',
         'odunsu', 'fougere', 'erkek koku']),
  ('kozmetik/parfum/unisex', 'Unisex Parfüm',
   (SELECT id FROM categories WHERE slug = 'kozmetik/parfum'),
   2, true, true,
   ARRAY['unisex parfüm', 'unisex parfum', 'niş parfüm', 'nis parfum',
         'lüks parfüm', 'luks parfum']),

  -- Oyun konsol grubu (parent: elektronik/oyun/konsol)
  ('elektronik/oyun/konsol/aksesuar', 'Oyun Aksesuarları',
   (SELECT id FROM categories WHERE slug = 'elektronik/oyun/konsol'),
   3, true, true,
   ARRAY['oyun kolu', 'controller', 'gamepad', 'oyuncu kulaklığı',
         'oyuncu kulakligi', 'gaming mouse', 'oyuncu klavyesi',
         'mekanik klavye', 'mousepad', 'şarj istasyonu', 'sarj istasyonu']),
  ('elektronik/oyun/konsol/vr-sim', 'VR & Simülasyon',
   (SELECT id FROM categories WHERE slug = 'elektronik/oyun/konsol'),
   3, true, true,
   ARRAY['vr', 'vr gözlük', 'vr gozluk', 'meta quest', 'oculus',
         'playstation vr', 'sim racing', 'joystick', 'hotas']),
  ('elektronik/oyun/konsol/pc-oyun', 'PC Oyun Ekipmanları',
   (SELECT id FROM categories WHERE slug = 'elektronik/oyun/konsol'),
   3, true, true,
   ARRAY['gaming pc', 'pc oyun', 'gaming laptop', 'oyuncu laptop',
         'oyuncu monitör', 'oyuncu monitor', 'gaming koltuk',
         'streaming kit'])
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Step 2: Self-verify
-- Migration 032 trigger yeni leaf'ler eklenince 3 parent (bilesenler, parfum,
-- konsol) is_leaf'ini otomatik false'a çeker.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  added_count INT;
  parent_isleaf_changed INT;
BEGIN
  SELECT COUNT(*) INTO added_count
  FROM categories
  WHERE slug IN (
    'elektronik/bilgisayar-tablet/bilesenler/parca',
    'elektronik/bilgisayar-tablet/bilesenler/cevre-birim',
    'elektronik/bilgisayar-tablet/bilesenler/veri-depolama',
    'kozmetik/parfum/kadin',
    'kozmetik/parfum/erkek',
    'kozmetik/parfum/unisex',
    'elektronik/oyun/konsol/aksesuar',
    'elektronik/oyun/konsol/vr-sim',
    'elektronik/oyun/konsol/pc-oyun'
  );

  SELECT COUNT(*) INTO parent_isleaf_changed
  FROM categories
  WHERE slug IN (
    'elektronik/bilgisayar-tablet/bilesenler',
    'kozmetik/parfum',
    'elektronik/oyun/konsol'
  )
  AND is_leaf = false;

  RAISE NOTICE 'Migration 034: % yeni sub-leaf eklendi', added_count;
  RAISE NOTICE 'Migration 034: % parent is_leaf=false oldu (Migration 032 trigger)', parent_isleaf_changed;

  IF added_count <> 9 THEN
    RAISE WARNING 'Migration 034: beklenen 9, gerçek %', added_count;
  END IF;

  IF parent_isleaf_changed <> 3 THEN
    RAISE WARNING 'Migration 034: parent is_leaf trigger beklenen 3, gerçek %', parent_isleaf_changed;
  END IF;
END $$;

COMMIT;
