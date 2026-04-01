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

  -- Elektronik
  (gen_random_uuid(), 'Akıllı Telefon',              'akilli-telefon',       '📱'),
  (gen_random_uuid(), 'Bilgisayar & Laptop',          'bilgisayar-laptop',    '💻'),
  (gen_random_uuid(), 'Tablet',                       'tablet',               '📟'),
  (gen_random_uuid(), 'TV & Projeksiyon',             'tv',                   '📺'),
  (gen_random_uuid(), 'Ses Sistemleri & Kulaklık',    'ses-kulaklik',         '🎧'),
  (gen_random_uuid(), 'Akıllı Saat & Bileklik',       'akilli-saat',          '⌚'),
  (gen_random_uuid(), 'Fotoğraf & Kamera',            'fotograf-kamera',      '📷'),
  (gen_random_uuid(), 'Oyun & Konsol',                'oyun-konsol',          '🎮'),
  (gen_random_uuid(), 'Yazıcı & Tarayıcı',            'yazici-tarayici',      '🖨️'),
  (gen_random_uuid(), 'Networking & Modem',            'networking',           '📡'),
  (gen_random_uuid(), 'Telefon Aksesuar',             'telefon-aksesuar',     '🔌'),
  (gen_random_uuid(), 'Bilgisayar Bileşenleri',       'bilgisayar-bilesenleri','🖥️'),

  -- Moda
  (gen_random_uuid(), 'Kadın Giyim',                  'kadin-giyim',          '👗'),
  (gen_random_uuid(), 'Erkek Giyim',                  'erkek-giyim',          '👔'),
  (gen_random_uuid(), 'Çocuk Giyim',                  'cocuk-giyim',          '🧒'),
  (gen_random_uuid(), 'Kadın Ayakkabı',               'kadin-ayakkabi',       '👠'),
  (gen_random_uuid(), 'Erkek Ayakkabı',               'erkek-ayakkabi',       '👞'),
  (gen_random_uuid(), 'Çanta & Cüzdan',               'canta-cuzdan',         '👜'),
  (gen_random_uuid(), 'Saat & Takı',                  'saat-taki',            '💍'),
  (gen_random_uuid(), 'İç Giyim & Pijama',            'ic-giyim',             '🩲'),
  (gen_random_uuid(), 'Gözlük & Güneş Gözlüğü',      'gozluk',               '🕶️'),

  -- Ev & Yaşam
  (gen_random_uuid(), 'Beyaz Eşya',                   'beyaz-esya',           '🫙'),
  (gen_random_uuid(), 'Küçük Ev Aletleri',            'kucuk-ev-aletleri',    '🔌'),
  (gen_random_uuid(), 'Mobilya & Dekorasyon',         'mobilya-dekorasyon',   '🛋️'),
  (gen_random_uuid(), 'Mutfak & Sofra',               'mutfak-sofra',         '🍽️'),
  (gen_random_uuid(), 'Ev Tekstili',                  'ev-tekstili',          '🛏️'),
  (gen_random_uuid(), 'Aydınlatma',                   'aydinlatma',           '💡'),
  (gen_random_uuid(), 'Bahçe & Balkon',               'bahce-balkon',         '🌿'),
  (gen_random_uuid(), 'Yapı Market & El Aletleri',    'yapi-market',          '🔧'),
  (gen_random_uuid(), 'Temizlik & Deterjan',          'temizlik',             '🧹'),
  (gen_random_uuid(), 'Banyo & Tuvalet',              'banyo',                '🚿'),

  -- Kozmetik & Kişisel Bakım
  (gen_random_uuid(), 'Cilt Bakımı',                  'cilt-bakimi',          '🧴'),
  (gen_random_uuid(), 'Makyaj',                       'makyaj',               '💋'),
  (gen_random_uuid(), 'Saç Bakımı',                   'sac-bakimi',           '💇'),
  (gen_random_uuid(), 'Parfüm & Deodorant',           'parfum',               '🌸'),
  (gen_random_uuid(), 'Erkek Bakımı',                 'erkek-bakimi',         '🪒'),
  (gen_random_uuid(), 'Kişisel Hijyen',               'kisisel-hijyen',       '🧼'),
  (gen_random_uuid(), 'Ağız & Diş Sağlığı',          'agiz-dis',             '🦷'),

  -- Spor & Outdoor
  (gen_random_uuid(), 'Spor Giyim & Ayakkabı',       'spor-giyim',           '👟'),
  (gen_random_uuid(), 'Fitness & Kondisyon',          'fitness',              '🏋️'),
  (gen_random_uuid(), 'Outdoor & Kamp',               'outdoor-kamp',         '🏕️'),
  (gen_random_uuid(), 'Bisiklet & Scooter',           'bisiklet',             '🚴'),
  (gen_random_uuid(), 'Su Sporları',                  'su-sporlari',          '🏊'),
  (gen_random_uuid(), 'Takım Sporları',               'takim-sporlari',       '⚽'),
  (gen_random_uuid(), 'Yoga & Pilates',               'yoga',                 '🧘'),
  (gen_random_uuid(), 'Outdoor Giyim',                'outdoor-giyim',        '🧥'),

  -- Bebek & Çocuk
  (gen_random_uuid(), 'Bebek Bakım',                  'bebek-bakim',          '🍼'),
  (gen_random_uuid(), 'Bebek Giyim',                  'bebek-giyim',          '🧸'),
  (gen_random_uuid(), 'Bebek Arabası & Güvenlik',     'bebek-arabasi',        '🛒'),
  (gen_random_uuid(), 'Oyuncak',                      'oyuncak',              '🎁'),
  (gen_random_uuid(), 'Çocuk Kitapları',              'cocuk-kitaplari',      '📚'),
  (gen_random_uuid(), 'Çocuk Odası',                  'cocuk-odasi',          '🎨'),

  -- Kitap, Müzik & Hobi
  (gen_random_uuid(), 'Kitap',                        'kitap',                '📖'),
  (gen_random_uuid(), 'Müzik Aleti',                  'muzik-aleti',          '🎸'),
  (gen_random_uuid(), 'Film & Dizi',                  'film-dizi',            '🎬'),
  (gen_random_uuid(), 'Hobi & Sanat',                 'hobi-sanat',           '🎨'),
  (gen_random_uuid(), 'Koleksiyon',                   'koleksiyon',           '🏆'),
  (gen_random_uuid(), 'Bulmaca & Masa Oyunu',         'masa-oyunu',           '♟️'),

  -- Ofis & Kırtasiye
  (gen_random_uuid(), 'Ofis Mobilyası',               'ofis-mobilyasi',       '🪑'),
  (gen_random_uuid(), 'Kırtasiye & Okul',             'kirtasiye',            '✏️'),
  (gen_random_uuid(), 'Ofis Elektroniği',             'ofis-elektronigi',     '📠'),

  -- Otomotiv
  (gen_random_uuid(), 'Araç Elektroniği',             'arac-elektronigi',     '📻'),
  (gen_random_uuid(), 'Lastik & Jant',                'lastik-jant',          '🛞'),
  (gen_random_uuid(), 'Araç Bakım & Aksesuar',        'arac-aksesuar',        '🔧'),
  (gen_random_uuid(), 'Motor & Scooter',              'motor-scooter',        '🏍️'),
  (gen_random_uuid(), 'Navigasyon & GPS',             'navigasyon',           '🗺️'),

  -- Evcil Hayvan
  (gen_random_uuid(), 'Köpek',                        'kopek',                '🐕'),
  (gen_random_uuid(), 'Kedi',                         'kedi',                 '🐈'),
  (gen_random_uuid(), 'Kuş',                          'kus',                  '🦜'),
  (gen_random_uuid(), 'Balık & Akvaryum',             'balik-akvaryum',       '🐠'),
  (gen_random_uuid(), 'Diğer Evcil Hayvan',           'diger-evcil-hayvan',   '🐾');
