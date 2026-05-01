-- Migration 021 PART 1 — Elektronik + Beyaz Eşya + Küçük Ev Aletleri
-- Idempotent ON CONFLICT, kendi başına çalışır

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

COMMIT;
