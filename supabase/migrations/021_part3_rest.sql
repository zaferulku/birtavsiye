-- Migration 021 PART 3 — Anne&Bebek + Spor + Sağlık + Otomotiv + Süpermarket + Yapı + Hobi + Pet Shop
-- Idempotent ON CONFLICT, kendi başına çalışır

BEGIN;

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

COMMIT;
