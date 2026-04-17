-- Kapsamlı kategori düzeltme scripti
-- Ürün başlığına göre doğru kategoriye atar
-- Kategori yoksa önce oluşturur
-- Supabase SQL Editor'da çalıştır

-- ============================================================
-- ADIM 1: Eksik kategorileri oluştur (slug üzerinden çakışma kontrolü)
-- ============================================================
INSERT INTO categories (name, slug, icon) VALUES
  ('Akıllı Telefon',          'akilli-telefon',         '📱'),
  ('Bilgisayar & Laptop',     'bilgisayar-laptop',      '💻'),
  ('Tablet',                  'tablet',                 '📟'),
  ('TV & Projeksiyon',        'tv',                     '📺'),
  ('Ses Sistemleri & Kulaklık','ses-kulaklik',          '🎧'),
  ('Akıllı Saat & Bileklik',  'akilli-saat',            '⌚'),
  ('Oyun & Konsol',           'oyun-konsol',            '🎮'),
  ('Fotoğraf & Kamera',       'fotograf-kamera',        '📷'),
  ('Beyaz Eşya',              'beyaz-esya',             '🫙'),
  ('Küçük Ev Aletleri',       'kucuk-ev-aletleri',     '🔌'),
  ('Bilgisayar Bileşenleri',  'bilgisayar-bilesenleri', '🖥️'),
  ('Networking & Modem',      'networking',             '📡'),
  ('Telefon Aksesuar',        'telefon-aksesuar',       '🔋'),
  ('Makyaj',                  'makyaj',                 '💋'),
  ('Cilt Bakımı',             'cilt-bakimi',            '🧴'),
  ('Saç Bakımı',              'sac-bakimi',             '💇'),
  ('Fitness & Kondisyon',     'fitness',                '🏋️'),
  ('Outdoor & Kamp',          'outdoor-kamp',           '🏕️'),
  ('Erkek Giyim',             'erkek-giyim',            '👔'),
  ('Kadın Giyim',             'kadin-giyim',            '👗')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- ADIM 2: Ürünleri başlıklarına göre kategorilere ata
-- Önce spesifik eşleşmeler, sonra genel — sıra önemli
-- ============================================================

-- TELEFON AKSESUAR (önce çıkar, diğer kategorilere karışmasın)
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'telefon-aksesuar' LIMIT 1)
WHERE (
  title ILIKE '%kılıf%'
  OR title ILIKE '%powerbank%'
  OR title ILIKE '%ekran koruyucu%'
  OR title ILIKE '%temperli cam%'
  OR title ILIKE '%şarj kablo%'
  OR title ILIKE '%type-c kablo%'
  OR title ILIKE '%lightning kablo%'
  OR title ILIKE '%usb kablo%'
  OR title ILIKE '%kablosuz şarj%'
  OR title ILIKE '%wireless şarj%'
  OR title ILIKE '%şarj adaptör%'
  OR title ILIKE '%şarj cihazı%'
  OR title ILIKE '%magsafe%'
  OR title ILIKE '%telefon tutucu%'
  OR title ILIKE '%araç tutucu%'
  OR title ILIKE '%selfie çubuğu%'
  OR title ILIKE '%telefon standı%'
  OR title ILIKE '%ekran camı%'
);

-- AKILLI SAAT
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'akilli-saat' LIMIT 1)
WHERE (
  title ILIKE '%apple watch%'
  OR title ILIKE '%galaxy watch%'
  OR title ILIKE '%mi band%'
  OR title ILIKE '%xiaomi band%'
  OR title ILIKE '%huawei watch%'
  OR title ILIKE '%honor watch%'
  OR title ILIKE '%garmin%'
  OR title ILIKE '%smartwatch%'
  OR title ILIKE '%akıllı saat%'
  OR title ILIKE '%fitness band%'
  OR title ILIKE '%activity tracker%'
);

-- SES SİSTEMLERİ & KULAKLIK
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'ses-kulaklik' LIMIT 1)
WHERE (
  title ILIKE '%kulaklık%'
  OR title ILIKE '%airpods%'
  OR title ILIKE '%galaxy buds%'
  OR title ILIKE '%tws%'
  OR title ILIKE '%earbuds%'
  OR title ILIKE '%headphone%'
  OR title ILIKE '%headset%'
  OR title ILIKE '%soundbar%'
  OR title ILIKE '%bluetooth hoparlör%'
  OR title ILIKE '%taşınabilir hoparlör%'
  OR title ILIKE '%jbl%'
);

-- OYUN & KONSOL
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'oyun-konsol' LIMIT 1)
WHERE (
  title ILIKE '%playstation%'
  OR title ILIKE '%ps5%'
  OR title ILIKE '%ps4%'
  OR title ILIKE '%xbox series%'
  OR title ILIKE '%nintendo switch%'
  OR title ILIKE '%steam deck%'
  OR title ILIKE '%oyun konsol%'
);

-- FOTOĞRAF & KAMERA
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'fotograf-kamera' LIMIT 1)
WHERE (
  title ILIKE '%fotoğraf makinesi%'
  OR title ILIKE '%mirrorless%'
  OR title ILIKE '%dslr%'
  OR title ILIKE '%gopro%'
  OR title ILIKE '%canon eos%'
  OR title ILIKE '%sony alpha%'
  OR title ILIKE '%nikon%'
  OR title ILIKE '%action cam%'
);

-- NETWORKING & MODEM
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'networking' LIMIT 1)
WHERE (
  title ILIKE '%wifi router%'
  OR title ILIKE '%modem router%'
  OR title ILIKE '%access point%'
  OR title ILIKE '%mesh wifi%'
  OR title ILIKE '%tp-link%'
  OR title ILIKE '%asus router%'
  OR title ILIKE '%network switch%'
);

-- BİLGİSAYAR BİLEŞENLERİ
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'bilgisayar-bilesenleri' LIMIT 1)
WHERE (
  title ILIKE '%ekran kartı%'
  OR title ILIKE '%ram bellek%'
  OR title ILIKE '% ssd%'
  OR title ILIKE '%nvme%'
  OR title ILIKE '%anakart%'
  OR title ILIKE '%işlemci%'
  OR title ILIKE '%rtx 40%'
  OR title ILIKE '%rtx 30%'
  OR title ILIKE '%rx 7%'
  OR title ILIKE '%ddr5%'
  OR title ILIKE '%ddr4%'
  OR title ILIKE '%pcie%'
  OR title ILIKE '%m.2%'
);

-- TABLET
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'tablet' LIMIT 1)
WHERE (
  title ILIKE '%ipad%'
  OR title ILIKE '%galaxy tab%'
  OR title ILIKE '%lenovo tab%'
  OR title ILIKE '%xiaomi pad%'
  OR title ILIKE '%huawei matepad%'
  OR title ILIKE '%redmi pad%'
  OR title ILIKE '%honor pad%'
);

-- AKILLI TELEFON (kılıf/aksesuar çıktıktan sonra)
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'akilli-telefon' LIMIT 1)
WHERE (
  title ILIKE '%iphone%'
  OR title ILIKE '%samsung galaxy s%'
  OR title ILIKE '%samsung galaxy a%'
  OR title ILIKE '%samsung galaxy m%'
  OR title ILIKE '%redmi note%'
  OR title ILIKE '%redmi %'
  OR title ILIKE '%poco x%'
  OR title ILIKE '%poco m%'
  OR title ILIKE '%poco f%'
  OR title ILIKE '%realme%'
  OR title ILIKE '%oppo reno%'
  OR title ILIKE '%oneplus%'
  OR title ILIKE '%motorola moto%'
  OR title ILIKE '%google pixel%'
  OR title ILIKE '%nokia g%'
  OR title ILIKE '%honor x%'
  OR title ILIKE '%huawei p%'
  OR title ILIKE '%huawei nova%'
  OR title ILIKE '%akıllı telefon%'
)
-- Aksesuar/kılıf başlıkları kesinlikle dışla
AND title NOT ILIKE '%kılıf%'
AND title NOT ILIKE '%ekran koruyucu%'
AND title NOT ILIKE '%koruyucu nano%'
AND title NOT ILIKE '%temperli cam%'
AND title NOT ILIKE '%kamera lens koruyucu%'
AND title NOT ILIKE '%darbe korumalı%'
AND title NOT ILIKE '%şeffaf%'
AND title NOT ILIKE '%silikon%'
AND title NOT ILIKE '%cüzdan%'
AND title NOT ILIKE '%powerbank%'
AND title NOT ILIKE '%şarj%'
AND title NOT ILIKE '%kablo%';

-- BİLGİSAYAR & LAPTOP
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'bilgisayar-laptop' LIMIT 1)
WHERE (
  title ILIKE '%macbook%'
  OR title ILIKE '%asus vivobook%'
  OR title ILIKE '%asus zenbook%'
  OR title ILIKE '%asus rog%'
  OR title ILIKE '%lenovo ideapad%'
  OR title ILIKE '%lenovo thinkpad%'
  OR title ILIKE '%lenovo legion%'
  OR title ILIKE '%hp pavilion%'
  OR title ILIKE '%hp envy%'
  OR title ILIKE '%hp omen%'
  OR title ILIKE '%dell xps%'
  OR title ILIKE '%dell inspiron%'
  OR title ILIKE '%msi gaming%'
  OR title ILIKE '%monster abra%'
  OR title ILIKE '%casper nirvana%'
  OR title ILIKE '%gaming laptop%'
  OR title ILIKE '%dizüstü bilgisayar%'
);

-- TV & PROJEKSİYON
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'tv' LIMIT 1)
WHERE (
  title ILIKE '%oled tv%'
  OR title ILIKE '%qled tv%'
  OR title ILIKE '%smart tv%'
  OR title ILIKE '%4k tv%'
  OR title ILIKE '%8k tv%'
  OR title ILIKE '%televizyon%'
  OR title ILIKE '%neo qled%'
  OR title ILIKE '% tv %'
  OR title ILIKE '% tv'
)
AND NOT (title ILIKE '%kulaklık%' OR title ILIKE '%kılıf%');

-- BEYAZ EŞYA
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'beyaz-esya' LIMIT 1)
WHERE (
  title ILIKE '%buzdolabı%'
  OR title ILIKE '%çamaşır makinesi%'
  OR title ILIKE '%bulaşık makinesi%'
  OR title ILIKE '%no frost%'
  OR title ILIKE '%donduruculu%'
  OR title ILIKE '%ankastre fırın%'
  OR title ILIKE '%klima %'
  OR title ILIKE '%inverter klima%'
  OR title ILIKE '%split klima%'
);

-- KÜÇÜK EV ALETLERİ
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'kucuk-ev-aletleri' LIMIT 1)
WHERE (
  title ILIKE '%robot süpürge%'
  OR title ILIKE '%elektrikli süpürge%'
  OR title ILIKE '%kahve makinesi%'
  OR title ILIKE '%espresso makinesi%'
  OR title ILIKE '%nespresso%'
  OR title ILIKE '%air fryer%'
  OR title ILIKE '%airfryer%'
  OR title ILIKE '%fritöz%'
  OR title ILIKE '%tost makinesi%'
  OR title ILIKE '%blender%'
  OR title ILIKE '%mutfak robotu%'
  OR title ILIKE '%ekmek makinesi%'
);

-- MAKYAJ
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'makyaj' LIMIT 1)
WHERE (
  title ILIKE '%ruj%'
  OR title ILIKE '%maskara%'
  OR title ILIKE '%fondöten%'
  OR title ILIKE '%göz farı%'
  OR title ILIKE '%allık%'
  OR title ILIKE '%eyeliner%'
  OR title ILIKE '%dudak kalemi%'
  OR title ILIKE '%bronzer%'
  OR title ILIKE '%highlighter%'
  OR title ILIKE '%setting spray%'
  OR title ILIKE '%makyaj%'
);

-- CİLT BAKIMI
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'cilt-bakimi' LIMIT 1)
WHERE (
  title ILIKE '%yüz kremi%'
  OR title ILIKE '%nemlendirici krem%'
  OR title ILIKE '%güneş kremi%'
  OR title ILIKE '%spf %'
  OR title ILIKE '%serum%'
  OR title ILIKE '%retinol%'
  OR title ILIKE '%vitamin c serum%'
  OR title ILIKE '%göz kremi%'
  OR title ILIKE '%cilt bakım%'
  OR title ILIKE '%yüz maskesi%'
  OR title ILIKE '%tonik%'
)
AND NOT (title ILIKE '%saç%' OR title ILIKE '%vücut%');

-- SAÇ BAKIMI
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'sac-bakimi' LIMIT 1)
WHERE (
  title ILIKE '%saç kurutma%'
  OR title ILIKE '%saç düzleştirici%'
  OR title ILIKE '%saç maşası%'
  OR title ILIKE '%dyson airwrap%'
  OR title ILIKE '%saç bakım%'
  OR title ILIKE '%şampuan%'
  OR title ILIKE '%saç maskesi%'
  OR title ILIKE '%saç serumu%'
  OR title ILIKE '%saç boyası%'
);

-- FITNESS
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'fitness' LIMIT 1)
WHERE (
  title ILIKE '%dambıl%'
  OR title ILIKE '%halter%'
  OR title ILIKE '%kettlebell%'
  OR title ILIKE '%koşu bandı%'
  OR title ILIKE '%kürek makinesi%'
  OR title ILIKE '%plates reformer%'
  OR title ILIKE '%yoga matı%'
  OR title ILIKE '%protein tozu%'
  OR title ILIKE '%whey protein%'
  OR title ILIKE '%fitness eldiven%'
);

-- OUTDOOR & KAMP
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'outdoor-kamp' LIMIT 1)
WHERE (
  title ILIKE '%kamp çadırı%'
  OR title ILIKE '%uyku tulumu%'
  OR title ILIKE '%kamp ocağı%'
  OR title ILIKE '%trekking%'
  OR title ILIKE '%hiking%'
  OR title ILIKE '%kamp lambası%'
  OR title ILIKE '%kamp malzeme%'
  OR title ILIKE '%termos%'
);

-- ERKEK GİYİM
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'erkek-giyim' LIMIT 1)
WHERE (
  title ILIKE '%erkek mont%'
  OR title ILIKE '%erkek ayakkabı%'
  OR title ILIKE '%erkek tişört%'
  OR title ILIKE '%erkek pantolon%'
  OR title ILIKE '%erkek gömlek%'
  OR title ILIKE '%erkek ceket%'
  OR title ILIKE '%erkek sweatshirt%'
  OR title ILIKE '%erkek bot%'
  OR title ILIKE '%erkek spor ayakkabı%'
  OR title ILIKE '%erkek eşofman%'
);

-- KADIN GİYİM
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'kadin-giyim' LIMIT 1)
WHERE (
  title ILIKE '%kadın mont%'
  OR title ILIKE '%kadın elbise%'
  OR title ILIKE '%kadın ayakkabı%'
  OR title ILIKE '%kadın çanta%'
  OR title ILIKE '%kadın bluz%'
  OR title ILIKE '%kadın pantolon%'
  OR title ILIKE '%kadın ceket%'
  OR title ILIKE '%kadın bot%'
  OR title ILIKE '%kadın etek%'
  OR title ILIKE '%kadın spor ayakkabı%'
);

-- ============================================================
-- SONUÇ: Kategori bazlı ürün sayısı
-- ============================================================
SELECT c.name, COUNT(p.id) AS urun_sayisi
FROM categories c
LEFT JOIN products p ON p.category_id = c.id
GROUP BY c.name
ORDER BY urun_sayisi DESC;
