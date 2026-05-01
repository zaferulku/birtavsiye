-- ============================================================================
-- Migration 021 — Hierarchik kategori yapısı v2 (14 root + ~120 sub)
-- ============================================================================
-- KÖK SORUN: Mevcut 189 kategori, 21 root (Cilt+Makyaj+Kozmetik 3 ayrı root,
--            Spor Ayakkabı duplicate, Pet Shop boş, Televizyon root, vs.)
-- ÇÖZÜM: 14 root + ~120 sub, parent_id chain ile hierarchik
-- Slug pattern: <root>/<sub-grup>/<leaf>
-- Örnek: 'moda/erkek-ayakkabi/sneaker'
--
-- IDEMPOTENT: ON CONFLICT (slug) DO UPDATE — re-run safe
-- GTIN feature (Migration 020) etkilenmez — sadece categories tablosu refactor
-- ============================================================================

BEGIN;

-- ════════════════════════════════════════════════
-- 1. ELEKTRONİK
-- ════════════════════════════════════════════════
INSERT INTO categories (slug, name, parent_id, is_active)
VALUES ('elektronik', 'Elektronik', NULL, true)
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = NULL, name = EXCLUDED.name;

-- 1.1 Telefon
INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'elektronik/telefon', 'Telefon', id, true FROM categories WHERE slug = 'elektronik'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'elektronik'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'elektronik/telefon/akilli-telefon', 'Akıllı Telefon', id, true FROM categories WHERE slug = 'elektronik/telefon'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'elektronik/telefon'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'elektronik/telefon/kilif', 'Telefon Kılıfı', id, true FROM categories WHERE slug = 'elektronik/telefon'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'elektronik/telefon'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'elektronik/telefon/ekran-koruyucu', 'Ekran Koruyucu', id, true FROM categories WHERE slug = 'elektronik/telefon'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'elektronik/telefon'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'elektronik/telefon/sarj-kablo', 'Şarj Cihazı & Kablo', id, true FROM categories WHERE slug = 'elektronik/telefon'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'elektronik/telefon'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'elektronik/telefon/powerbank', 'Powerbank & Taşınabilir Şarj', id, true FROM categories WHERE slug = 'elektronik/telefon'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'elektronik/telefon'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'elektronik/telefon/aksesuar', 'Telefon Aksesuarı', id, true FROM categories WHERE slug = 'elektronik/telefon'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'elektronik/telefon'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'elektronik/telefon/yedek-parca', 'Telefon Yedek Parça', id, true FROM categories WHERE slug = 'elektronik/telefon'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'elektronik/telefon'), name = EXCLUDED.name;

-- 1.2 Bilgisayar & Tablet
INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'elektronik/bilgisayar-tablet', 'Bilgisayar & Tablet', id, true FROM categories WHERE slug = 'elektronik'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'elektronik'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'elektronik/bilgisayar-tablet/laptop', 'Laptop & Notebook', id, true FROM categories WHERE slug = 'elektronik/bilgisayar-tablet'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'elektronik/bilgisayar-tablet'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'elektronik/bilgisayar-tablet/masaustu', 'Masaüstü Bilgisayar', id, true FROM categories WHERE slug = 'elektronik/bilgisayar-tablet'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'elektronik/bilgisayar-tablet'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'elektronik/bilgisayar-tablet/tablet', 'Tablet', id, true FROM categories WHERE slug = 'elektronik/bilgisayar-tablet'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'elektronik/bilgisayar-tablet'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'elektronik/bilgisayar-tablet/bilesenler', 'Bilgisayar Bileşenleri', id, true FROM categories WHERE slug = 'elektronik/bilgisayar-tablet'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'elektronik/bilgisayar-tablet'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'elektronik/bilgisayar-tablet/monitor', 'Monitör', id, true FROM categories WHERE slug = 'elektronik/bilgisayar-tablet'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'elektronik/bilgisayar-tablet'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'elektronik/bilgisayar-tablet/klavye-mouse', 'Klavye, Mouse, Webcam', id, true FROM categories WHERE slug = 'elektronik/bilgisayar-tablet'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'elektronik/bilgisayar-tablet'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'elektronik/bilgisayar-tablet/yazici', 'Yazıcı & Tarayıcı', id, true FROM categories WHERE slug = 'elektronik/bilgisayar-tablet'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'elektronik/bilgisayar-tablet'), name = EXCLUDED.name;

-- 1.3 TV, Ses & Görüntü
INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'elektronik/tv-ses-goruntu', 'TV, Ses & Görüntü', id, true FROM categories WHERE slug = 'elektronik'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'elektronik'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'elektronik/tv-ses-goruntu/televizyon', 'Televizyon', id, true FROM categories WHERE slug = 'elektronik/tv-ses-goruntu'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'elektronik/tv-ses-goruntu'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'elektronik/tv-ses-goruntu/tv-aksesuar', 'TV Aksesuar', id, true FROM categories WHERE slug = 'elektronik/tv-ses-goruntu'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'elektronik/tv-ses-goruntu'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'elektronik/tv-ses-goruntu/projeksiyon', 'Projeksiyon', id, true FROM categories WHERE slug = 'elektronik/tv-ses-goruntu'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'elektronik/tv-ses-goruntu'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'elektronik/tv-ses-goruntu/kulaklik', 'Kulaklık', id, true FROM categories WHERE slug = 'elektronik/tv-ses-goruntu'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'elektronik/tv-ses-goruntu'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'elektronik/tv-ses-goruntu/bluetooth-hoparlor', 'Bluetooth Hoparlör', id, true FROM categories WHERE slug = 'elektronik/tv-ses-goruntu'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'elektronik/tv-ses-goruntu'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'elektronik/tv-ses-goruntu/soundbar', 'Soundbar & Ev Sinema', id, true FROM categories WHERE slug = 'elektronik/tv-ses-goruntu'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'elektronik/tv-ses-goruntu'), name = EXCLUDED.name;

-- 1.4 Kamera & Fotoğraf
INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'elektronik/kamera', 'Kamera & Fotoğraf', id, true FROM categories WHERE slug = 'elektronik'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'elektronik'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'elektronik/kamera/fotograf-makinesi', 'Fotoğraf Makinesi', id, true FROM categories WHERE slug = 'elektronik/kamera'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'elektronik/kamera'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'elektronik/kamera/aksiyon-kamera', 'Aksiyon Kamera', id, true FROM categories WHERE slug = 'elektronik/kamera'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'elektronik/kamera'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'elektronik/kamera/drone', 'Drone', id, true FROM categories WHERE slug = 'elektronik/kamera'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'elektronik/kamera'), name = EXCLUDED.name;

-- 1.5 Oyun & Konsol
INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'elektronik/oyun', 'Oyun & Konsol', id, true FROM categories WHERE slug = 'elektronik'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'elektronik'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'elektronik/oyun/konsol', 'Oyun Konsolu', id, true FROM categories WHERE slug = 'elektronik/oyun'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'elektronik/oyun'), name = EXCLUDED.name;

-- 1.6 Giyilebilir Teknoloji
INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'elektronik/giyilebilir', 'Giyilebilir Teknoloji', id, true FROM categories WHERE slug = 'elektronik'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'elektronik'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'elektronik/giyilebilir/akilli-saat', 'Akıllı Saat & Bileklik', id, true FROM categories WHERE slug = 'elektronik/giyilebilir'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'elektronik/giyilebilir'), name = EXCLUDED.name;

-- 1.7 Ağ & Güvenlik
INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'elektronik/ag-guvenlik', 'Ağ & Güvenlik', id, true FROM categories WHERE slug = 'elektronik'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'elektronik'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'elektronik/ag-guvenlik/modem', 'Modem & Ağ Cihazları', id, true FROM categories WHERE slug = 'elektronik/ag-guvenlik'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'elektronik/ag-guvenlik'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'elektronik/ag-guvenlik/guvenlik-kamera', 'Güvenlik Kamerası', id, true FROM categories WHERE slug = 'elektronik/ag-guvenlik'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'elektronik/ag-guvenlik'), name = EXCLUDED.name;

-- ════════════════════════════════════════════════
-- 2. BEYAZ EŞYA
-- ════════════════════════════════════════════════
INSERT INTO categories (slug, name, parent_id, is_active)
VALUES ('beyaz-esya', 'Beyaz Eşya', NULL, true)
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = NULL, name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'beyaz-esya/buzdolabi', 'Buzdolabı', id, true FROM categories WHERE slug = 'beyaz-esya'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'beyaz-esya'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'beyaz-esya/camasir-makinesi', 'Çamaşır Makinesi', id, true FROM categories WHERE slug = 'beyaz-esya'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'beyaz-esya'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'beyaz-esya/bulasik-makinesi', 'Bulaşık Makinesi', id, true FROM categories WHERE slug = 'beyaz-esya'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'beyaz-esya'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'beyaz-esya/kurutma-makinesi', 'Kurutma Makinesi', id, true FROM categories WHERE slug = 'beyaz-esya'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'beyaz-esya'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'beyaz-esya/klima', 'Klima', id, true FROM categories WHERE slug = 'beyaz-esya'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'beyaz-esya'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'beyaz-esya/firin-ocak', 'Fırın & Ocak', id, true FROM categories WHERE slug = 'beyaz-esya'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'beyaz-esya'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'beyaz-esya/mikrodalga', 'Mikrodalga', id, true FROM categories WHERE slug = 'beyaz-esya'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'beyaz-esya'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'beyaz-esya/aspirator-davlumbaz', 'Aspiratör & Davlumbaz', id, true FROM categories WHERE slug = 'beyaz-esya'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'beyaz-esya'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'beyaz-esya/isitici-soba', 'Isıtıcı & Soba', id, true FROM categories WHERE slug = 'beyaz-esya'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'beyaz-esya'), name = EXCLUDED.name;

-- ════════════════════════════════════════════════
-- 3. KÜÇÜK EV ALETLERİ
-- ════════════════════════════════════════════════
INSERT INTO categories (slug, name, parent_id, is_active)
VALUES ('kucuk-ev-aletleri', 'Küçük Ev Aletleri', NULL, true)
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = NULL, name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'kucuk-ev-aletleri/mutfak', 'Mutfak Aletleri', id, true FROM categories WHERE slug = 'kucuk-ev-aletleri'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'kucuk-ev-aletleri'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'kucuk-ev-aletleri/mutfak/blender', 'Blender', id, true FROM categories WHERE slug = 'kucuk-ev-aletleri/mutfak'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'kucuk-ev-aletleri/mutfak'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'kucuk-ev-aletleri/mutfak/blender-mutfak-robotu', 'Blender & Mutfak Robotu', id, true FROM categories WHERE slug = 'kucuk-ev-aletleri/mutfak'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'kucuk-ev-aletleri/mutfak'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'kucuk-ev-aletleri/mutfak/mikser', 'Mikser & Çırpıcı', id, true FROM categories WHERE slug = 'kucuk-ev-aletleri/mutfak'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'kucuk-ev-aletleri/mutfak'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'kucuk-ev-aletleri/mutfak/tost-makinesi', 'Tost & Kızartma Makinesi', id, true FROM categories WHERE slug = 'kucuk-ev-aletleri/mutfak'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'kucuk-ev-aletleri/mutfak'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'kucuk-ev-aletleri/mutfak/airfryer', 'Fritöz & Airfryer', id, true FROM categories WHERE slug = 'kucuk-ev-aletleri/mutfak'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'kucuk-ev-aletleri/mutfak'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'kucuk-ev-aletleri/mutfak/kahve-makinesi', 'Kahve Makinesi', id, true FROM categories WHERE slug = 'kucuk-ev-aletleri/mutfak'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'kucuk-ev-aletleri/mutfak'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'kucuk-ev-aletleri/mutfak/su-isiticisi', 'Su Isıtıcısı & Çay Makinesi', id, true FROM categories WHERE slug = 'kucuk-ev-aletleri/mutfak'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'kucuk-ev-aletleri/mutfak'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'kucuk-ev-aletleri/mutfak/diger', 'Diğer Mutfak Aletleri', id, true FROM categories WHERE slug = 'kucuk-ev-aletleri/mutfak'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'kucuk-ev-aletleri/mutfak'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'kucuk-ev-aletleri/temizlik', 'Temizlik Cihazları', id, true FROM categories WHERE slug = 'kucuk-ev-aletleri'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'kucuk-ev-aletleri'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'kucuk-ev-aletleri/temizlik/supurge', 'Süpürge', id, true FROM categories WHERE slug = 'kucuk-ev-aletleri/temizlik'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'kucuk-ev-aletleri/temizlik'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'kucuk-ev-aletleri/temizlik/robot-supurge', 'Robot Süpürge', id, true FROM categories WHERE slug = 'kucuk-ev-aletleri/temizlik'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'kucuk-ev-aletleri/temizlik'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'kucuk-ev-aletleri/kisisel-bakim', 'Kişisel Bakım Cihazları', id, true FROM categories WHERE slug = 'kucuk-ev-aletleri'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'kucuk-ev-aletleri'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'kucuk-ev-aletleri/kisisel-bakim/sac-kurutma', 'Saç Kurutma & Şekillendirici', id, true FROM categories WHERE slug = 'kucuk-ev-aletleri/kisisel-bakim'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'kucuk-ev-aletleri/kisisel-bakim'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'kucuk-ev-aletleri/kisisel-bakim/diger', 'Diğer Kişisel Bakım Cihazları', id, true FROM categories WHERE slug = 'kucuk-ev-aletleri/kisisel-bakim'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'kucuk-ev-aletleri/kisisel-bakim'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'kucuk-ev-aletleri/ev-cihazlari', 'Ev Cihazları', id, true FROM categories WHERE slug = 'kucuk-ev-aletleri'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'kucuk-ev-aletleri'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'kucuk-ev-aletleri/ev-cihazlari/utu', 'Ütü', id, true FROM categories WHERE slug = 'kucuk-ev-aletleri/ev-cihazlari'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'kucuk-ev-aletleri/ev-cihazlari'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'kucuk-ev-aletleri/ev-cihazlari/tarti', 'Tartı & Terazi', id, true FROM categories WHERE slug = 'kucuk-ev-aletleri/ev-cihazlari'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'kucuk-ev-aletleri/ev-cihazlari'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'kucuk-ev-aletleri/ev-cihazlari/hava-temizleyici', 'Hava Temizleyici & Nemlendirici', id, true FROM categories WHERE slug = 'kucuk-ev-aletleri/ev-cihazlari'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'kucuk-ev-aletleri/ev-cihazlari'), name = EXCLUDED.name;

-- ════════════════════════════════════════════════
-- 4. MODA
-- ════════════════════════════════════════════════
INSERT INTO categories (slug, name, parent_id, is_active)
VALUES ('moda', 'Moda', NULL, true)
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = NULL, name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'moda/kadin-giyim', 'Kadın Giyim', id, true FROM categories WHERE slug = 'moda'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'moda'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'moda/kadin-giyim/ust', 'Kadın Üst Giyim', id, true FROM categories WHERE slug = 'moda/kadin-giyim'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'moda/kadin-giyim'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'moda/kadin-giyim/alt', 'Kadın Alt Giyim', id, true FROM categories WHERE slug = 'moda/kadin-giyim'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'moda/kadin-giyim'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'moda/kadin-giyim/etek', 'Kadın Etek', id, true FROM categories WHERE slug = 'moda/kadin-giyim'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'moda/kadin-giyim'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'moda/kadin-giyim/elbise', 'Elbise', id, true FROM categories WHERE slug = 'moda/kadin-giyim'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'moda/kadin-giyim'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'moda/kadin-giyim/dis-giyim', 'Kadın Dış Giyim', id, true FROM categories WHERE slug = 'moda/kadin-giyim'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'moda/kadin-giyim'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'moda/kadin-giyim/ic-giyim', 'İç Giyim & Pijama', id, true FROM categories WHERE slug = 'moda/kadin-giyim'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'moda/kadin-giyim'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'moda/erkek-giyim', 'Erkek Giyim', id, true FROM categories WHERE slug = 'moda'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'moda'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'moda/erkek-giyim/ust', 'Erkek Üst Giyim', id, true FROM categories WHERE slug = 'moda/erkek-giyim'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'moda/erkek-giyim'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'moda/erkek-giyim/alt', 'Erkek Alt Giyim', id, true FROM categories WHERE slug = 'moda/erkek-giyim'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'moda/erkek-giyim'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'moda/erkek-giyim/dis-giyim', 'Erkek Dış Giyim', id, true FROM categories WHERE slug = 'moda/erkek-giyim'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'moda/erkek-giyim'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'moda/erkek-giyim/takim-elbise', 'Takım Elbise & Smokin', id, true FROM categories WHERE slug = 'moda/erkek-giyim'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'moda/erkek-giyim'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'moda/erkek-giyim/esofman', 'Eşofman & Spor Giyim', id, true FROM categories WHERE slug = 'moda/erkek-giyim'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'moda/erkek-giyim'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'moda/kadin-ayakkabi', 'Kadın Ayakkabı', id, true FROM categories WHERE slug = 'moda'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'moda'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'moda/kadin-ayakkabi/sneaker', 'Kadın Sneaker & Spor Ayakkabı', id, true FROM categories WHERE slug = 'moda/kadin-ayakkabi'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'moda/kadin-ayakkabi'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'moda/kadin-ayakkabi/bot', 'Kadın Bot & Çizme', id, true FROM categories WHERE slug = 'moda/kadin-ayakkabi'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'moda/kadin-ayakkabi'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'moda/kadin-ayakkabi/babet', 'Kadın Babet', id, true FROM categories WHERE slug = 'moda/kadin-ayakkabi'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'moda/kadin-ayakkabi'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'moda/kadin-ayakkabi/sandalet', 'Sandalet, Babet, Terlik', id, true FROM categories WHERE slug = 'moda/kadin-ayakkabi'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'moda/kadin-ayakkabi'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'moda/kadin-ayakkabi/topuklu', 'Topuklu Ayakkabı', id, true FROM categories WHERE slug = 'moda/kadin-ayakkabi'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'moda/kadin-ayakkabi'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'moda/erkek-ayakkabi', 'Erkek Ayakkabı', id, true FROM categories WHERE slug = 'moda'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'moda'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'moda/erkek-ayakkabi/sneaker', 'Erkek Sneaker & Spor Ayakkabı', id, true FROM categories WHERE slug = 'moda/erkek-ayakkabi'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'moda/erkek-ayakkabi'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'moda/erkek-ayakkabi/bot', 'Erkek Bot & Çizme', id, true FROM categories WHERE slug = 'moda/erkek-ayakkabi'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'moda/erkek-ayakkabi'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'moda/erkek-ayakkabi/klasik', 'Klasik Erkek Ayakkabı', id, true FROM categories WHERE slug = 'moda/erkek-ayakkabi'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'moda/erkek-ayakkabi'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'moda/cocuk-moda', 'Çocuk Moda', id, true FROM categories WHERE slug = 'moda'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'moda'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'moda/cocuk-moda/giyim', 'Çocuk Giyim', id, true FROM categories WHERE slug = 'moda/cocuk-moda'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'moda/cocuk-moda'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'moda/cocuk-moda/ayakkabi', 'Çocuk Ayakkabı', id, true FROM categories WHERE slug = 'moda/cocuk-moda'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'moda/cocuk-moda'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'moda/aksesuar', 'Aksesuar', id, true FROM categories WHERE slug = 'moda'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'moda'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'moda/aksesuar/canta-cuzdan', 'Çanta & Cüzdan', id, true FROM categories WHERE slug = 'moda/aksesuar'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'moda/aksesuar'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'moda/aksesuar/saat-taki', 'Saat & Takı', id, true FROM categories WHERE slug = 'moda/aksesuar'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'moda/aksesuar'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'moda/aksesuar/gozluk', 'Gözlük', id, true FROM categories WHERE slug = 'moda/aksesuar'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'moda/aksesuar'), name = EXCLUDED.name;

-- ════════════════════════════════════════════════
-- 5. KOZMETİK & KİŞİSEL BAKIM
-- ════════════════════════════════════════════════
INSERT INTO categories (slug, name, parent_id, is_active)
VALUES ('kozmetik', 'Kozmetik & Kişisel Bakım', NULL, true)
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = NULL, name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'kozmetik/cilt-bakim', 'Cilt Bakım', id, true FROM categories WHERE slug = 'kozmetik'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'kozmetik'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'kozmetik/cilt-bakim/serum', 'Serum & Ampul', id, true FROM categories WHERE slug = 'kozmetik/cilt-bakim'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'kozmetik/cilt-bakim'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'kozmetik/cilt-bakim/maske', 'Yüz Maskesi', id, true FROM categories WHERE slug = 'kozmetik/cilt-bakim'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'kozmetik/cilt-bakim'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'kozmetik/cilt-bakim/nemlendirici', 'Yüz Nemlendirici', id, true FROM categories WHERE slug = 'kozmetik/cilt-bakim'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'kozmetik/cilt-bakim'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'kozmetik/cilt-bakim/temizleyici', 'Yüz Temizleyici', id, true FROM categories WHERE slug = 'kozmetik/cilt-bakim'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'kozmetik/cilt-bakim'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'kozmetik/cilt-bakim/gunes-koruyucu', 'Güneş Koruyucu', id, true FROM categories WHERE slug = 'kozmetik/cilt-bakim'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'kozmetik/cilt-bakim'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'kozmetik/makyaj', 'Makyaj', id, true FROM categories WHERE slug = 'kozmetik'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'kozmetik'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'kozmetik/makyaj/dudak', 'Dudak Makyajı', id, true FROM categories WHERE slug = 'kozmetik/makyaj'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'kozmetik/makyaj'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'kozmetik/makyaj/goz', 'Göz Makyajı', id, true FROM categories WHERE slug = 'kozmetik/makyaj'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'kozmetik/makyaj'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'kozmetik/makyaj/yuz', 'Yüz Makyajı', id, true FROM categories WHERE slug = 'kozmetik/makyaj'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'kozmetik/makyaj'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'kozmetik/makyaj/firca-aksesuar', 'Makyaj Fırça & Aksesuar', id, true FROM categories WHERE slug = 'kozmetik/makyaj'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'kozmetik/makyaj'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'kozmetik/sac-bakim', 'Saç Bakımı', id, true FROM categories WHERE slug = 'kozmetik'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'kozmetik'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'kozmetik/sac-bakim/urunler', 'Saç Bakım Ürünleri', id, true FROM categories WHERE slug = 'kozmetik/sac-bakim'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'kozmetik/sac-bakim'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'kozmetik/sac-bakim/sampuan', 'Şampuan & Saç Kremi', id, true FROM categories WHERE slug = 'kozmetik/sac-bakim'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'kozmetik/sac-bakim'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'kozmetik/sac-bakim/boya', 'Saç Boyası', id, true FROM categories WHERE slug = 'kozmetik/sac-bakim'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'kozmetik/sac-bakim'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'kozmetik/sac-bakim/sekillendirici', 'Saç Şekillendirici Ürün', id, true FROM categories WHERE slug = 'kozmetik/sac-bakim'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'kozmetik/sac-bakim'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'kozmetik/kisisel-bakim', 'Kişisel Bakım', id, true FROM categories WHERE slug = 'kozmetik'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'kozmetik'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'kozmetik/kisisel-bakim/agiz-dis', 'Ağız & Diş Bakımı', id, true FROM categories WHERE slug = 'kozmetik/kisisel-bakim'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'kozmetik/kisisel-bakim'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'kozmetik/kisisel-bakim/hijyen', 'Kişisel Hijyen', id, true FROM categories WHERE slug = 'kozmetik/kisisel-bakim'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'kozmetik/kisisel-bakim'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'kozmetik/kisisel-bakim/deodorant', 'Deodorant', id, true FROM categories WHERE slug = 'kozmetik/kisisel-bakim'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'kozmetik/kisisel-bakim'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'kozmetik/kisisel-bakim/vucut', 'Vücut Bakımı', id, true FROM categories WHERE slug = 'kozmetik/kisisel-bakim'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'kozmetik/kisisel-bakim'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'kozmetik/kisisel-bakim/erkek', 'Erkek Bakımı', id, true FROM categories WHERE slug = 'kozmetik/kisisel-bakim'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'kozmetik/kisisel-bakim'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'kozmetik/parfum', 'Parfüm', id, true FROM categories WHERE slug = 'kozmetik'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'kozmetik'), name = EXCLUDED.name;

-- ════════════════════════════════════════════════
-- 6. EV & YAŞAM
-- ════════════════════════════════════════════════
INSERT INTO categories (slug, name, parent_id, is_active)
VALUES ('ev-yasam', 'Ev & Yaşam', NULL, true)
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = NULL, name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'ev-yasam/mobilya', 'Mobilya', id, true FROM categories WHERE slug = 'ev-yasam'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'ev-yasam'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'ev-yasam/mobilya/oturma-odasi', 'Oturma Odası Mobilya', id, true FROM categories WHERE slug = 'ev-yasam/mobilya'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'ev-yasam/mobilya'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'ev-yasam/mobilya/yatak-odasi', 'Yatak Odası Mobilya', id, true FROM categories WHERE slug = 'ev-yasam/mobilya'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'ev-yasam/mobilya'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'ev-yasam/mobilya/yemek-odasi', 'Yemek Odası Mobilya', id, true FROM categories WHERE slug = 'ev-yasam/mobilya'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'ev-yasam/mobilya'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'ev-yasam/mobilya/ofis', 'Ofis Mobilyası', id, true FROM categories WHERE slug = 'ev-yasam/mobilya'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'ev-yasam/mobilya'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'ev-yasam/ev-tekstili', 'Ev Tekstili', id, true FROM categories WHERE slug = 'ev-yasam'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'ev-yasam'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'ev-yasam/aydinlatma', 'Aydınlatma', id, true FROM categories WHERE slug = 'ev-yasam'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'ev-yasam'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'ev-yasam/mutfak-sofra', 'Mutfak & Sofra', id, true FROM categories WHERE slug = 'ev-yasam'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'ev-yasam'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'ev-yasam/banyo', 'Banyo & Tuvalet', id, true FROM categories WHERE slug = 'ev-yasam'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'ev-yasam'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'ev-yasam/bahce-balkon', 'Bahçe & Balkon', id, true FROM categories WHERE slug = 'ev-yasam'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'ev-yasam'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'ev-yasam/temizlik', 'Temizlik & Deterjan', id, true FROM categories WHERE slug = 'ev-yasam'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'ev-yasam'), name = EXCLUDED.name;

-- ════════════════════════════════════════════════
-- 7. ANNE & BEBEK
-- ════════════════════════════════════════════════
INSERT INTO categories (slug, name, parent_id, is_active)
VALUES ('anne-bebek', 'Anne & Bebek', NULL, true)
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = NULL, name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'anne-bebek/bebek-bakim', 'Bebek Bakım', id, true FROM categories WHERE slug = 'anne-bebek'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'anne-bebek'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'anne-bebek/bebek-bakim/bebek-bezi', 'Bebek Bezi', id, true FROM categories WHERE slug = 'anne-bebek/bebek-bakim'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'anne-bebek/bebek-bakim'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'anne-bebek/bebek-bakim/islak-mendil', 'Islak Mendil', id, true FROM categories WHERE slug = 'anne-bebek/bebek-bakim'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'anne-bebek/bebek-bakim'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'anne-bebek/bebek-bakim/bakim-urunleri', 'Bebek Bakım Ürünleri', id, true FROM categories WHERE slug = 'anne-bebek/bebek-bakim'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'anne-bebek/bebek-bakim'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'anne-bebek/bebek-bakim/guvenlik', 'Bebek Güvenliği', id, true FROM categories WHERE slug = 'anne-bebek/bebek-bakim'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'anne-bebek/bebek-bakim'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'anne-bebek/bebek-beslenme', 'Bebek Beslenme', id, true FROM categories WHERE slug = 'anne-bebek'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'anne-bebek'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'anne-bebek/bebek-beslenme/mama', 'Bebek Maması', id, true FROM categories WHERE slug = 'anne-bebek/bebek-beslenme'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'anne-bebek/bebek-beslenme'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'anne-bebek/bebek-beslenme/biberon-emzik', 'Biberon & Emzik', id, true FROM categories WHERE slug = 'anne-bebek/bebek-beslenme'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'anne-bebek/bebek-beslenme'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'anne-bebek/bebek-tasima', 'Bebek Taşıma & Güvenlik', id, true FROM categories WHERE slug = 'anne-bebek'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'anne-bebek'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'anne-bebek/bebek-tasima/araba-puset', 'Bebek Arabası & Puset', id, true FROM categories WHERE slug = 'anne-bebek/bebek-tasima'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'anne-bebek/bebek-tasima'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'anne-bebek/bebek-tasima/oto-koltugu', 'Oto Koltuğu', id, true FROM categories WHERE slug = 'anne-bebek/bebek-tasima'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'anne-bebek/bebek-tasima'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'anne-bebek/bebek-tasima/besik', 'Beşik & Bebek Yatağı', id, true FROM categories WHERE slug = 'anne-bebek/bebek-tasima'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'anne-bebek/bebek-tasima'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'anne-bebek/cocuk-odasi', 'Çocuk Odası', id, true FROM categories WHERE slug = 'anne-bebek'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'anne-bebek'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'anne-bebek/oyuncak', 'Oyuncak', id, true FROM categories WHERE slug = 'anne-bebek'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'anne-bebek'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'anne-bebek/oyuncak/egitici', 'Eğitici Oyuncak', id, true FROM categories WHERE slug = 'anne-bebek/oyuncak'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'anne-bebek/oyuncak'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'anne-bebek/oyuncak/lego', 'LEGO & Yapı Blokları', id, true FROM categories WHERE slug = 'anne-bebek/oyuncak'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'anne-bebek/oyuncak'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'anne-bebek/oyuncak/figur', 'Figür & Oyuncak Bebek', id, true FROM categories WHERE slug = 'anne-bebek/oyuncak'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'anne-bebek/oyuncak'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'anne-bebek/oyuncak/rc-robot', 'RC & Robot Oyuncak', id, true FROM categories WHERE slug = 'anne-bebek/oyuncak'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'anne-bebek/oyuncak'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'anne-bebek/oyuncak/masa-oyunu', 'Masa Oyunu & Bulmaca', id, true FROM categories WHERE slug = 'anne-bebek/oyuncak'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'anne-bebek/oyuncak'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'anne-bebek/oyuncak/diger', 'Diğer Oyuncaklar', id, true FROM categories WHERE slug = 'anne-bebek/oyuncak'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'anne-bebek/oyuncak'), name = EXCLUDED.name;

-- ════════════════════════════════════════════════
-- 8. SPOR & OUTDOOR
-- ════════════════════════════════════════════════
INSERT INTO categories (slug, name, parent_id, is_active)
VALUES ('spor-outdoor', 'Spor & Outdoor', NULL, true)
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = NULL, name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'spor-outdoor/fitness', 'Fitness & Kondisyon', id, true FROM categories WHERE slug = 'spor-outdoor'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'spor-outdoor'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'spor-outdoor/kamp', 'Kamp & Outdoor', id, true FROM categories WHERE slug = 'spor-outdoor'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'spor-outdoor'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'spor-outdoor/bisiklet', 'Bisiklet', id, true FROM categories WHERE slug = 'spor-outdoor'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'spor-outdoor'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'spor-outdoor/scooter', 'Scooter & Elektrikli Scooter', id, true FROM categories WHERE slug = 'spor-outdoor'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'spor-outdoor'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'spor-outdoor/spor-cantasi', 'Spor Çantası', id, true FROM categories WHERE slug = 'spor-outdoor'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'spor-outdoor'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'spor-outdoor/yoga-pilates', 'Yoga & Pilates', id, true FROM categories WHERE slug = 'spor-outdoor'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'spor-outdoor'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'spor-outdoor/su-sporlari', 'Su Sporları', id, true FROM categories WHERE slug = 'spor-outdoor'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'spor-outdoor'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'spor-outdoor/takim-sporlari', 'Takım Sporları', id, true FROM categories WHERE slug = 'spor-outdoor'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'spor-outdoor'), name = EXCLUDED.name;

-- ════════════════════════════════════════════════
-- 9. SAĞLIK & VİTAMİN (yeni root)
-- ════════════════════════════════════════════════
INSERT INTO categories (slug, name, parent_id, is_active)
VALUES ('saglik-vitamin', 'Sağlık & Vitamin', NULL, true)
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = NULL, name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'saglik-vitamin/spor-besin', 'Spor Besin Takviyesi', id, true FROM categories WHERE slug = 'saglik-vitamin'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'saglik-vitamin'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'saglik-vitamin/vitamin-mineral', 'Vitamin & Mineral', id, true FROM categories WHERE slug = 'saglik-vitamin'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'saglik-vitamin'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'saglik-vitamin/bitkisel', 'Bitkisel Sağlık', id, true FROM categories WHERE slug = 'saglik-vitamin'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'saglik-vitamin'), name = EXCLUDED.name;

-- ════════════════════════════════════════════════
-- 10. OTOMOTİV
-- ════════════════════════════════════════════════
INSERT INTO categories (slug, name, parent_id, is_active)
VALUES ('otomotiv', 'Otomotiv', NULL, true)
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = NULL, name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'otomotiv/arac-aksesuar', 'Araç Aksesuar', id, true FROM categories WHERE slug = 'otomotiv'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'otomotiv'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'otomotiv/arac-elektronigi', 'Araç Elektroniği', id, true FROM categories WHERE slug = 'otomotiv'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'otomotiv'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'otomotiv/lastik-jant', 'Lastik & Jant', id, true FROM categories WHERE slug = 'otomotiv'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'otomotiv'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'otomotiv/motor-scooter', 'Motor & Scooter', id, true FROM categories WHERE slug = 'otomotiv'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'otomotiv'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'otomotiv/motor-yagi-bakim', 'Motor Yağı & Bakım', id, true FROM categories WHERE slug = 'otomotiv'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'otomotiv'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'otomotiv/navigasyon', 'Navigasyon & GPS', id, true FROM categories WHERE slug = 'otomotiv'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'otomotiv'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'otomotiv/oto-aku', 'Oto Akü', id, true FROM categories WHERE slug = 'otomotiv'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'otomotiv'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'otomotiv/oto-yedek-parca', 'Oto Yedek Parça', id, true FROM categories WHERE slug = 'otomotiv'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'otomotiv'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'otomotiv/teyp-multimedya', 'Teyp & Multimedya', id, true FROM categories WHERE slug = 'otomotiv'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'otomotiv'), name = EXCLUDED.name;

-- ════════════════════════════════════════════════
-- 11. SÜPERMARKET
-- ════════════════════════════════════════════════
INSERT INTO categories (slug, name, parent_id, is_active)
VALUES ('supermarket', 'Süpermarket', NULL, true)
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = NULL, name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'supermarket/atistirmalik', 'Atıştırmalık & Çikolata', id, true FROM categories WHERE slug = 'supermarket'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'supermarket'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'supermarket/bakliyat-makarna', 'Bakliyat & Makarna', id, true FROM categories WHERE slug = 'supermarket'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'supermarket'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'supermarket/dondurma-tatli', 'Dondurma & Tatlı', id, true FROM categories WHERE slug = 'supermarket'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'supermarket'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'supermarket/icecek', 'İçecek', id, true FROM categories WHERE slug = 'supermarket'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'supermarket'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'supermarket/kahvalti-kahve', 'Kahvaltı & Kahve', id, true FROM categories WHERE slug = 'supermarket'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'supermarket'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'supermarket/kahve', 'Kahve', id, true FROM categories WHERE slug = 'supermarket'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'supermarket'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'supermarket/konserve-sos', 'Konserve & Sos', id, true FROM categories WHERE slug = 'supermarket'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'supermarket'), name = EXCLUDED.name;

-- ════════════════════════════════════════════════
-- 12. YAPI MARKET
-- ════════════════════════════════════════════════
INSERT INTO categories (slug, name, parent_id, is_active)
VALUES ('yapi-market', 'Yapı Market', NULL, true)
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = NULL, name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'yapi-market/el-aletleri', 'El Aletleri', id, true FROM categories WHERE slug = 'yapi-market'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'yapi-market'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'yapi-market/elektrikli-aletler', 'Elektrikli Aletler', id, true FROM categories WHERE slug = 'yapi-market'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'yapi-market'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'yapi-market/hirdavat', 'Hırdavat & Vida', id, true FROM categories WHERE slug = 'yapi-market'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'yapi-market'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'yapi-market/olcum', 'Ölçüm Aletleri', id, true FROM categories WHERE slug = 'yapi-market'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'yapi-market'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'yapi-market/boya', 'Boya & Malzeme', id, true FROM categories WHERE slug = 'yapi-market'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'yapi-market'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'yapi-market/elektrik', 'Elektrik Malzeme', id, true FROM categories WHERE slug = 'yapi-market'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'yapi-market'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'yapi-market/su-tesisati', 'Su Tesisatı', id, true FROM categories WHERE slug = 'yapi-market'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'yapi-market'), name = EXCLUDED.name;

-- ════════════════════════════════════════════════
-- 13. HOBİ & EĞLENCE
-- ════════════════════════════════════════════════
INSERT INTO categories (slug, name, parent_id, is_active)
VALUES ('hobi-eglence', 'Hobi & Eğlence', NULL, true)
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = NULL, name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'hobi-eglence/kitap-kirtasiye', 'Kitap & Kırtasiye', id, true FROM categories WHERE slug = 'hobi-eglence'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'hobi-eglence'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'hobi-eglence/kitap-kirtasiye/kitap', 'Kitap', id, true FROM categories WHERE slug = 'hobi-eglence/kitap-kirtasiye'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'hobi-eglence/kitap-kirtasiye'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'hobi-eglence/kitap-kirtasiye/cocuk-kitap', 'Çocuk Kitapları', id, true FROM categories WHERE slug = 'hobi-eglence/kitap-kirtasiye'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'hobi-eglence/kitap-kirtasiye'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'hobi-eglence/kitap-kirtasiye/kirtasiye', 'Kırtasiye & Okul', id, true FROM categories WHERE slug = 'hobi-eglence/kitap-kirtasiye'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'hobi-eglence/kitap-kirtasiye'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'hobi-eglence/kitap-kirtasiye/film-dizi', 'Film & Dizi', id, true FROM categories WHERE slug = 'hobi-eglence/kitap-kirtasiye'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'hobi-eglence/kitap-kirtasiye'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'hobi-eglence/sanat-muzik', 'Sanat & Müzik', id, true FROM categories WHERE slug = 'hobi-eglence'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'hobi-eglence'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'hobi-eglence/sanat-muzik/muzik-aleti', 'Müzik Aleti', id, true FROM categories WHERE slug = 'hobi-eglence/sanat-muzik'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'hobi-eglence/sanat-muzik'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'hobi-eglence/sanat-muzik/resim', 'Resim & Çizim', id, true FROM categories WHERE slug = 'hobi-eglence/sanat-muzik'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'hobi-eglence/sanat-muzik'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'hobi-eglence/sanat-muzik/el-sanatlari', 'El Sanatları', id, true FROM categories WHERE slug = 'hobi-eglence/sanat-muzik'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'hobi-eglence/sanat-muzik'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'hobi-eglence/koleksiyon', 'Koleksiyon', id, true FROM categories WHERE slug = 'hobi-eglence'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'hobi-eglence'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'hobi-eglence/parti', 'Parti & Eğlence', id, true FROM categories WHERE slug = 'hobi-eglence'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'hobi-eglence'), name = EXCLUDED.name;

-- ════════════════════════════════════════════════
-- 14. PET SHOP
-- ════════════════════════════════════════════════
INSERT INTO categories (slug, name, parent_id, is_active)
VALUES ('pet-shop', 'Pet Shop', NULL, true)
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = NULL, name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'pet-shop/kedi', 'Kedi Ürünleri', id, true FROM categories WHERE slug = 'pet-shop'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'pet-shop'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'pet-shop/kedi/mama', 'Kedi Maması', id, true FROM categories WHERE slug = 'pet-shop/kedi'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'pet-shop/kedi'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'pet-shop/kedi/kum', 'Kedi Kumu', id, true FROM categories WHERE slug = 'pet-shop/kedi'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'pet-shop/kedi'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'pet-shop/kopek', 'Köpek Ürünleri', id, true FROM categories WHERE slug = 'pet-shop'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'pet-shop'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'pet-shop/kopek/mama', 'Köpek Maması', id, true FROM categories WHERE slug = 'pet-shop/kopek'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'pet-shop/kopek'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'pet-shop/akvaryum', 'Akvaryum & Balık', id, true FROM categories WHERE slug = 'pet-shop'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'pet-shop'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'pet-shop/kus', 'Kuş Ürünleri', id, true FROM categories WHERE slug = 'pet-shop'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'pet-shop'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'pet-shop/aksesuar', 'Pet Aksesuar', id, true FROM categories WHERE slug = 'pet-shop'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'pet-shop'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'pet-shop/bakim-hijyen', 'Pet Bakım & Hijyen', id, true FROM categories WHERE slug = 'pet-shop'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'pet-shop'), name = EXCLUDED.name;

INSERT INTO categories (slug, name, parent_id, is_active)
SELECT 'pet-shop/diger', 'Diğer Evcil Hayvan', id, true FROM categories WHERE slug = 'pet-shop'
ON CONFLICT (slug) DO UPDATE SET is_active = true, parent_id = (SELECT id FROM categories WHERE slug = 'pet-shop'), name = EXCLUDED.name;

COMMIT;

-- ============================================================================
-- VERIFY (apply sonrası çalıştır)
-- ============================================================================

-- 14 root verify
SELECT slug, name FROM categories
WHERE parent_id IS NULL AND slug IN (
  'elektronik','beyaz-esya','kucuk-ev-aletleri','moda','kozmetik',
  'ev-yasam','anne-bebek','spor-outdoor','saglik-vitamin','otomotiv',
  'supermarket','yapi-market','hobi-eglence','pet-shop'
)
ORDER BY slug;

-- Hiyerarşi level dağılımı
WITH RECURSIVE tree AS (
  SELECT id, slug, name, parent_id, 0 AS level
  FROM categories WHERE parent_id IS NULL AND slug IN (
    'elektronik','beyaz-esya','kucuk-ev-aletleri','moda','kozmetik',
    'ev-yasam','anne-bebek','spor-outdoor','saglik-vitamin','otomotiv',
    'supermarket','yapi-market','hobi-eglence','pet-shop'
  )
  UNION ALL
  SELECT c.id, c.slug, c.name, c.parent_id, t.level + 1
  FROM categories c
  JOIN tree t ON c.parent_id = t.id
)
SELECT level, COUNT(*) AS count_at_level
FROM tree
GROUP BY level
ORDER BY level;
