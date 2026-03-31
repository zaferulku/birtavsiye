-- =============================================
-- birtavsiye.net — Kategori Sıfırlama
-- Trendyol + Hepsiburada + Amazon TR baz alındı
-- Supabase SQL Editor'de çalıştır
-- =============================================

-- Önce ürünlerin category_id'sini NULL yap (foreign key hatası olmasın)
UPDATE products SET category_id = NULL;

-- Eski kategorileri sil
DELETE FROM categories;

-- Yeni kategorileri ekle
INSERT INTO categories (id, name, slug, icon) VALUES
  (gen_random_uuid(), 'Telefon & Aksesuar',       'telefon-aksesuar',    '📱'),
  (gen_random_uuid(), 'Bilgisayar & Tablet',       'bilgisayar-tablet',   '💻'),
  (gen_random_uuid(), 'TV & Ses Sistemleri',       'tv-ses',              '📺'),
  (gen_random_uuid(), 'Giyilebilir Teknoloji',     'giyilebilir',         '⌚'),
  (gen_random_uuid(), 'Fotoğraf & Kamera',         'fotograf-kamera',     '📷'),
  (gen_random_uuid(), 'Oyun & Konsol',             'oyun-konsol',         '🎮'),
  (gen_random_uuid(), 'Beyaz Eşya',                'beyaz-esya',          '🫙'),
  (gen_random_uuid(), 'Küçük Ev Aletleri',         'kucuk-ev-aletleri',   '🔌'),
  (gen_random_uuid(), 'Kozmetik & Kişisel Bakım',  'kozmetik-bakim',      '💄'),
  (gen_random_uuid(), 'Spor & Outdoor',            'spor-outdoor',        '🏃'),
  (gen_random_uuid(), 'Kitap & Hobi',              'kitap-hobi',          '📚'),
  (gen_random_uuid(), 'Bebek & Çocuk',             'bebek-cocuk',         '🧸'),
  (gen_random_uuid(), 'Ev & Yaşam',               'ev-yasam',            '🏠'),
  (gen_random_uuid(), 'Otomotiv',                  'otomotiv',            '🚗'),
  (gen_random_uuid(), 'Evcil Hayvan',              'evcil-hayvan',        '🐾');

-- Yeni ID'leri ürünlere eşle (eski slug → yeni slug)
-- Eski: ses, tv, laptop, telefon, fotograf, oyun, spor
-- Bu adım import scripti yeniden çalıştırıldığında otomatik yapılacak
-- Manuel eşleme için aşağıdaki bloğu kendi isteğine göre düzenle:

-- SELECT id, slug FROM categories; -- çalıştırıp ID'leri gör
