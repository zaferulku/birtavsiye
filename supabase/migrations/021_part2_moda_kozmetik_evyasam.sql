-- Migration 021 PART 2 — Moda + Kozmetik + Ev & Yaşam
-- Idempotent ON CONFLICT, kendi başına çalışır

BEGIN;

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

COMMIT;
