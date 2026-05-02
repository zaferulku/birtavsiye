-- ============================================================================
-- Migration 040 — Weak link sub kategorileri icin DB leaf olustur
-- ============================================================================
-- KOK: NAV mega-dropdown sub linkleri parent slug ile ayni (cat.slug == sub.slug)
-- pattern. Kullanici "Erkek Spor Giyim" tikladiginda "Spor & Outdoor" parent
-- sayfasi aciliyor (UX bug). DB'de daha derin leaf hic olusturulmamis.
--
-- COZUM: Her weak sub icin DB'ye yeni leaf kategori INSERT.
-- Header.tsx ayrica guncellenir (eski parent slug -> yeni leaf slug).
--
-- IDempotent: ON CONFLICT DO NOTHING.
-- ============================================================================

BEGIN;

INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('elektronik/bilgisayar-tablet/yazici/yazici', 'Yazıcı', 'a25a3f7d-ea7e-45b0-b2ea-85441e3eec25', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('elektronik/bilgisayar-tablet/yazici/cok-fonksiyonlu-yazici', 'Çok Fonksiyonlu Yazıcı', 'a25a3f7d-ea7e-45b0-b2ea-85441e3eec25', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('elektronik/bilgisayar-tablet/yazici/murekkep-toner', 'Mürekkep & Toner', 'a25a3f7d-ea7e-45b0-b2ea-85441e3eec25', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('moda/aksesuar/canta-cuzdan/kadin-canta', 'Kadın Çanta', 'bbdb6066-ae5a-4a30-bd3e-2a5303732a50', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('moda/aksesuar/canta-cuzdan/erkek-canta', 'Erkek Çanta', 'bbdb6066-ae5a-4a30-bd3e-2a5303732a50', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('moda/aksesuar/canta-cuzdan/valiz-bavul', 'Valiz & Bavul', 'bbdb6066-ae5a-4a30-bd3e-2a5303732a50', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('moda/aksesuar/canta-cuzdan/cuzdan-kartlik', 'Cüzdan & Kartlık', 'bbdb6066-ae5a-4a30-bd3e-2a5303732a50', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('ev-yasam/mutfak-sofra/pisirme-grubu', 'Pişirme Grubu', 'cfb9f26a-c1db-42eb-800f-3a2b9193ba72', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('ev-yasam/mutfak-sofra/yemek-kahvalti-takimi', 'Yemek & Kahvaltı Takımı', 'cfb9f26a-c1db-42eb-800f-3a2b9193ba72', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('ev-yasam/mutfak-sofra/saklama-depolama', 'Saklama & Depolama', 'cfb9f26a-c1db-42eb-800f-3a2b9193ba72', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('ev-yasam/mutfak-sofra/temizlik-aksesuar', 'Temizlik & Aksesuar', 'cfb9f26a-c1db-42eb-800f-3a2b9193ba72', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('ev-yasam/ev-tekstili/nevresim-yatak', 'Nevresim & Yatak', '1fcafddf-b831-4460-a370-4aa275555b14', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('ev-yasam/ev-tekstili/havlu-bornoz', 'Havlu & Bornoz', '1fcafddf-b831-4460-a370-4aa275555b14', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('ev-yasam/ev-tekstili/hali-perde', 'Halı & Perde', '1fcafddf-b831-4460-a370-4aa275555b14', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('ev-yasam/ev-tekstili/koltuk-ortusu-kirlent', 'Koltuk Örtüsü & Kırlent', '1fcafddf-b831-4460-a370-4aa275555b14', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('otomotiv/lastik-jant/yaz-lastigi', 'Yaz Lastiği', 'e71fea81-9562-4c1d-b8f0-358fa39804c4', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('otomotiv/lastik-jant/kis-4-mevsim-lastigi', 'Kış & 4 Mevsim Lastiği', 'e71fea81-9562-4c1d-b8f0-358fa39804c4', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('otomotiv/lastik-jant/jant', 'Jant', 'e71fea81-9562-4c1d-b8f0-358fa39804c4', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('otomotiv/lastik-jant/lastik-aksesuar', 'Lastik Aksesuar', 'e71fea81-9562-4c1d-b8f0-358fa39804c4', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('otomotiv/arac-aksesuar/dis-aksesuar', 'Dış Aksesuar', 'b87a2089-4b65-4908-8f4c-f220528a9a3c', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('otomotiv/arac-aksesuar/ic-aksesuar', 'İç Aksesuar', 'b87a2089-4b65-4908-8f4c-f220528a9a3c', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('otomotiv/arac-aksesuar/bakim-temizlik', 'Bakım & Temizlik', 'b87a2089-4b65-4908-8f4c-f220528a9a3c', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('otomotiv/arac-aksesuar/aku-elektrik', 'Akü & Elektrik', 'b87a2089-4b65-4908-8f4c-f220528a9a3c', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('spor-outdoor/kamp/kamp-ekipmanlari', 'Kamp Ekipmanları', 'f019bd57-ca2c-4582-8266-d47ac20e3866', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('spor-outdoor/kamp/tirmanma-dagcilik', 'Tırmanma & Dağcılık', 'f019bd57-ca2c-4582-8266-d47ac20e3866', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('spor-outdoor/kamp/av-balikcilik', 'Av & Balıkçılık', 'f019bd57-ca2c-4582-8266-d47ac20e3866', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('spor-outdoor/kamp/bas-lambasi-pusula', 'Baş Lambası & Pusula', 'f019bd57-ca2c-4582-8266-d47ac20e3866', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('spor-outdoor/bisiklet/bisiklet', 'Bisiklet', '915da5e1-2065-422b-9b4b-206d1b9714cf', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('spor-outdoor/bisiklet/elektrikli-scooter', 'Elektrikli Scooter', '915da5e1-2065-422b-9b4b-206d1b9714cf', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('spor-outdoor/bisiklet/bisiklet-aksesuar', 'Bisiklet Aksesuar', '915da5e1-2065-422b-9b4b-206d1b9714cf', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('spor-outdoor/bisiklet/paten-kaykay', 'Paten & Kaykay', '915da5e1-2065-422b-9b4b-206d1b9714cf', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('kozmetik/kisisel-bakim/agiz-dis/dis-fircasi', 'Diş Fırçası', 'e6b382f6-47e9-41d2-b066-04c65bdbd800', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('kozmetik/kisisel-bakim/agiz-dis/dis-macunu-gargara', 'Diş Macunu & Gargara', 'e6b382f6-47e9-41d2-b066-04c65bdbd800', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('kozmetik/kisisel-bakim/agiz-dis/agiz-dusu-dis-ipi', 'Ağız Duşu & Diş İpi', 'e6b382f6-47e9-41d2-b066-04c65bdbd800', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('kozmetik/kisisel-bakim/erkek/tiras-makinesi', 'Tıraş Makinesi', '220f38b1-ab73-4b5e-8d26-c91b088bfcd5', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('kozmetik/kisisel-bakim/erkek/tiras-urunleri', 'Tıraş Ürünleri', '220f38b1-ab73-4b5e-8d26-c91b088bfcd5', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('kozmetik/kisisel-bakim/erkek/sac-sakal-makinesi', 'Saç & Sakal Makinesi', '220f38b1-ab73-4b5e-8d26-c91b088bfcd5', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('kozmetik/kisisel-bakim/erkek/erkek-cilt-bakimi', 'Erkek Cilt Bakımı', '220f38b1-ab73-4b5e-8d26-c91b088bfcd5', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('ev-yasam/temizlik/camasir', 'Çamaşır', '56c6c228-0754-4665-a4d5-5ec25cb169a4', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('ev-yasam/temizlik/bulasik', 'Bulaşık', '56c6c228-0754-4665-a4d5-5ec25cb169a4', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('ev-yasam/temizlik/yuzey-temizleyici', 'Yüzey Temizleyici', '56c6c228-0754-4665-a4d5-5ec25cb169a4', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('ev-yasam/temizlik/kagit-urunleri', 'Kağıt Ürünleri', '56c6c228-0754-4665-a4d5-5ec25cb169a4', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('ev-yasam/temizlik/cop-torbasi-temizlik-araclari', 'Çöp Torbası & Temizlik Araçları', '56c6c228-0754-4665-a4d5-5ec25cb169a4', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('hobi-eglence/sanat-muzik/muzik-aleti/gitar', 'Gitar', '437acf5d-2588-429c-bbfc-b0147da1786c', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('hobi-eglence/sanat-muzik/muzik-aleti/klavye-piyano', 'Klavye & Piyano', '437acf5d-2588-429c-bbfc-b0147da1786c', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('hobi-eglence/sanat-muzik/muzik-aleti/davul-perkusyon', 'Davul & Perküsyon', '437acf5d-2588-429c-bbfc-b0147da1786c', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('hobi-eglence/sanat-muzik/muzik-aleti/studyo-kayit', 'Stüdyo & Kayıt', '437acf5d-2588-429c-bbfc-b0147da1786c', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('hobi-eglence/sanat-muzik/muzik-aleti/nefesli-yayli', 'Nefesli & Yaylı', '437acf5d-2588-429c-bbfc-b0147da1786c', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('hobi-eglence/kitap-kirtasiye/film-dizi/blu-ray-dvd', 'Blu-ray & DVD', '5b2abb0a-4306-44dc-993d-17a767872844', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('hobi-eglence/kitap-kirtasiye/film-dizi/dijital-film-dizi', 'Dijital Film & Dizi', '5b2abb0a-4306-44dc-993d-17a767872844', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('saglik-vitamin/vitamin-mineral/multivitamin', 'Multivitamin', '95c6846d-bb1e-45ca-91fa-e90ac7c74dae', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('saglik-vitamin/vitamin-mineral/c-vitamini', 'C Vitamini', '95c6846d-bb1e-45ca-91fa-e90ac7c74dae', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('saglik-vitamin/vitamin-mineral/d-vitamini', 'D Vitamini', '95c6846d-bb1e-45ca-91fa-e90ac7c74dae', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('saglik-vitamin/vitamin-mineral/b-vitamini', 'B Vitamini', '95c6846d-bb1e-45ca-91fa-e90ac7c74dae', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('saglik-vitamin/vitamin-mineral/magnezyum-cinko', 'Magnezyum & Çinko', '95c6846d-bb1e-45ca-91fa-e90ac7c74dae', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('saglik-vitamin/vitamin-mineral/omega-3-balik-yagi', 'Omega 3 & Balık Yağı', '95c6846d-bb1e-45ca-91fa-e90ac7c74dae', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('saglik-vitamin/bitkisel/bitkisel-cay', 'Bitkisel Çay', 'a8ccf54a-773e-419f-976d-04cbd081b890', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('saglik-vitamin/bitkisel/bitkisel-takviye', 'Bitkisel Takviye', 'a8ccf54a-773e-419f-976d-04cbd081b890', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('saglik-vitamin/bitkisel/sut-kardeleni-karaciger', 'Süt Kardeleni & Karaciğer', 'a8ccf54a-773e-419f-976d-04cbd081b890', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('saglik-vitamin/bitkisel/bagisiklik-destek', 'Bağışıklık Destek', 'a8ccf54a-773e-419f-976d-04cbd081b890', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('saglik-vitamin/spor-besin/protein-tozu', 'Protein Tozu', 'c7ed1868-af5f-48a8-b4a3-e1f4aea7d9d4', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('saglik-vitamin/spor-besin/kreatin', 'Kreatin', 'c7ed1868-af5f-48a8-b4a3-e1f4aea7d9d4', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('saglik-vitamin/spor-besin/bcaa-aminoasit', 'BCAA & Aminoasit', 'c7ed1868-af5f-48a8-b4a3-e1f4aea7d9d4', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('saglik-vitamin/spor-besin/pre-workout', 'Pre-Workout', 'c7ed1868-af5f-48a8-b4a3-e1f4aea7d9d4', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('saglik-vitamin/spor-besin/mass-gainer', 'Mass Gainer', 'c7ed1868-af5f-48a8-b4a3-e1f4aea7d9d4', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('saglik-vitamin/spor-besin/yag-yakici', 'Yağ Yakıcı', 'c7ed1868-af5f-48a8-b4a3-e1f4aea7d9d4', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('elektronik/bilgisayar-tablet/laptop/laptop', 'Laptop', '3162d850-378d-46a9-a41f-9f6f381300df', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('elektronik/telefon/akilli-telefon/akilli-telefon', 'Akıllı Telefon', '70e4b949-d097-4799-a051-795cc6578a69', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('elektronik/kamera/kamera-aksesuar', 'Kamera Aksesuar', '22c9da91-7cc7-47d3-a18e-4134cb70c0d2', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('elektronik/oyun/konsol/oyun-konsolu', 'Oyun Konsolu', '4550841b-5573-4a7e-8393-e6b4e4f73dd0', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('moda/kadin-giyim/tisort-bluz', 'Tişört & Bluz', '1bf86301-5171-4317-a69a-d4bd69c49b63', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('moda/kadin-giyim/pantolon-jean', 'Pantolon & Jean', '1bf86301-5171-4317-a69a-d4bd69c49b63', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('moda/kadin-giyim/ceket-mont', 'Ceket & Mont', '1bf86301-5171-4317-a69a-d4bd69c49b63', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('moda/kadin-giyim/kazak-hirka', 'Kazak & Hırka', '1bf86301-5171-4317-a69a-d4bd69c49b63', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('moda/kadin-giyim/buyuk-beden', 'Büyük Beden', '1bf86301-5171-4317-a69a-d4bd69c49b63', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('moda/kadin-giyim/tesettur', 'Tesettür', '1bf86301-5171-4317-a69a-d4bd69c49b63', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('moda/erkek-giyim/tisort', 'Tişört', '0915a941-e1b4-4111-a472-6373356498dc', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('moda/erkek-giyim/gomlek', 'Gömlek', '0915a941-e1b4-4111-a472-6373356498dc', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('moda/erkek-giyim/pantolon-jean', 'Pantolon & Jean', '0915a941-e1b4-4111-a472-6373356498dc', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('moda/erkek-giyim/ceket-mont', 'Ceket & Mont', '0915a941-e1b4-4111-a472-6373356498dc', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('moda/erkek-ayakkabi/spor-kosu', 'Spor & Koşu', 'c7893187-7a7a-47db-9078-49c0864ffa67', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('moda/erkek-ayakkabi/sandalet-terlik', 'Sandalet & Terlik', 'c7893187-7a7a-47db-9078-49c0864ffa67', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('moda/aksesuar/saat-taki/kadin-saati', 'Kadın Saati', 'f3739f5c-cf6f-4913-90ba-66d01844cc2e', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('moda/aksesuar/saat-taki/erkek-saati', 'Erkek Saati', 'f3739f5c-cf6f-4913-90ba-66d01844cc2e', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('moda/aksesuar/saat-taki/taki', 'Takı', 'f3739f5c-cf6f-4913-90ba-66d01844cc2e', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('moda/aksesuar/saat-taki/kemer-aksesuar', 'Kemer & Aksesuar', 'f3739f5c-cf6f-4913-90ba-66d01844cc2e', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('moda/cocuk-moda/giyim/kiz-cocuk', 'Kız Çocuk', 'e64a6df9-2aa3-4cae-a751-61cff0f74051', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('moda/cocuk-moda/giyim/erkek-cocuk', 'Erkek Çocuk', 'e64a6df9-2aa3-4cae-a751-61cff0f74051', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('moda/cocuk-moda/giyim/bebek-giyim', 'Bebek Giyim', 'e64a6df9-2aa3-4cae-a751-61cff0f74051', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('kucuk-ev-aletleri/kisisel-bakim-aleti', 'Kişisel Bakım Aleti', '1c263e3c-527b-49ad-aafc-0b1b5f0d5211', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('ev-yasam/mobilya/yemek-calisma', 'Yemek & Çalışma', '5735d84c-d46b-4c16-ac0b-bee82b5df5b4', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('ev-yasam/mobilya/dekorasyon', 'Dekorasyon', '5735d84c-d46b-4c16-ac0b-bee82b5df5b4', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('yapi-market/elektrikli-el-aletleri', 'Elektrikli El Aletleri', 'f2cc9d5d-1a04-4f42-acf5-db1235a6c178', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('yapi-market/boya-yapistirici', 'Boya & Yapıştırıcı', 'f2cc9d5d-1a04-4f42-acf5-db1235a6c178', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('hobi-eglence/kitap-kirtasiye/kirtasiye/okul-malzemeleri', 'Okul Malzemeleri', 'a8273819-03d1-4078-a436-dae55517fd41', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('hobi-eglence/kitap-kirtasiye/kirtasiye/ofis-malzemeleri', 'Ofis Malzemeleri', 'a8273819-03d1-4078-a436-dae55517fd41', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('otomotiv/arac-elektronigi/dashcam-geri-gorus', 'Dashcam & Geri Görüş', 'ef2ee6b0-18ee-4a66-b440-7c163680c4cf', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('otomotiv/arac-elektronigi/arac-ses-sistemi', 'Araç Ses Sistemi', 'ef2ee6b0-18ee-4a66-b440-7c163680c4cf', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('otomotiv/arac-elektronigi/arac-guvenligi', 'Araç Güvenliği', 'ef2ee6b0-18ee-4a66-b440-7c163680c4cf', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('otomotiv/motor-scooter/motosiklet-ekipmani', 'Motosiklet Ekipmanı', '2c4f57fe-8d32-453d-8d16-3f73715c5ec8', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('otomotiv/motor-scooter/motosiklet-aksesuar', 'Motosiklet Aksesuar', '2c4f57fe-8d32-453d-8d16-3f73715c5ec8', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('ev-yasam/bahce-balkon/bahce-aletleri', 'Bahçe Aletleri', '6b948917-acfa-4a5b-a6b8-8a8b5398950f', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('ev-yasam/bahce-balkon/sulama-sistemi', 'Sulama Sistemi', '6b948917-acfa-4a5b-a6b8-8a8b5398950f', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('ev-yasam/bahce-balkon/bitki-saksi', 'Bitki & Saksı', '6b948917-acfa-4a5b-a6b8-8a8b5398950f', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('otomotiv/oto-yedek-parca/fren-suspansiyon', 'Fren & Süspansiyon', '42f2cc6a-9421-4ad7-9fb4-eee61ee1e24c', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('otomotiv/oto-yedek-parca/silecek-ampul', 'Silecek & Ampul', '42f2cc6a-9421-4ad7-9fb4-eee61ee1e24c', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('anne-bebek/bebek-bakim/bebek-kozmetik', 'Bebek Kozmetik', 'efb4503c-238d-49fa-b413-904795ecdc71', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('anne-bebek/bebek-bakim/bebek-sagligi', 'Bebek Sağlığı', 'efb4503c-238d-49fa-b413-904795ecdc71', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('anne-bebek/bebek-tasima/yurutec-salincak', 'Yürüteç & Salıncak', '10afcbd8-c590-4ab1-b9d8-8e877b658c89', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('anne-bebek/cocuk-odasi/oyun-mati-parki', 'Oyun Matı & Parkı', '7101450b-9332-41c9-bb30-22fec0cce536', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('anne-bebek/oyuncak/acik-hava-spor', 'Açık Hava & Spor', '31346a63-eef6-4718-9d1e-1c361a1b2220', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('spor-outdoor/kadin-spor-giyim', 'Kadın Spor Giyim', '76500641-97c6-4200-be1d-6735612cdd81', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('spor-outdoor/erkek-spor-giyim', 'Erkek Spor Giyim', '76500641-97c6-4200-be1d-6735612cdd81', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('spor-outdoor/kosu-ayakkabisi', 'Koşu Ayakkabısı', '76500641-97c6-4200-be1d-6735612cdd81', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('spor-outdoor/fitness/kondisyon-aleti', 'Kondisyon Aleti', '5c91a700-a6ff-4100-a55c-bc54f3713c56', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('spor-outdoor/fitness/agirlik-guc', 'Ağırlık & Güç', '5c91a700-a6ff-4100-a55c-bc54f3713c56', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('spor-outdoor/fitness/fonksiyonel-ekipman', 'Fonksiyonel Ekipman', '5c91a700-a6ff-4100-a55c-bc54f3713c56', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('spor-outdoor/fitness/sporcu-beslenmesi', 'Sporcu Beslenmesi', '5c91a700-a6ff-4100-a55c-bc54f3713c56', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('spor-outdoor/takim-sporlari/futbol', 'Futbol', '86a5fa09-57dd-41b1-a1db-bdb27b680c8d', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('spor-outdoor/takim-sporlari/basketbol-voleybol', 'Basketbol & Voleybol', '86a5fa09-57dd-41b1-a1db-bdb27b680c8d', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('spor-outdoor/takim-sporlari/tenis-badminton', 'Tenis & Badminton', '86a5fa09-57dd-41b1-a1db-bdb27b680c8d', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('spor-outdoor/takim-sporlari/boks-dovus', 'Boks & Dövüş', '86a5fa09-57dd-41b1-a1db-bdb27b680c8d', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('kozmetik/cilt-bakim/yuz-temizleme', 'Yüz Temizleme', '3fdb0aaf-2590-45da-91e8-ff696ce3213a', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('kozmetik/cilt-bakim/vucut-bakimi', 'Vücut Bakımı', '3fdb0aaf-2590-45da-91e8-ff696ce3213a', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('kozmetik/makyaj/makyaj-aksesuari', 'Makyaj Aksesuarı', 'a8d42d6b-3497-4d9a-a4f9-39410a35c234', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('kozmetik/makyaj/tirnak', 'Tırnak', 'a8d42d6b-3497-4d9a-a4f9-39410a35c234', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('kozmetik/sac-bakim/sac-maskesi-serum', 'Saç Maskesi & Serum', 'd69192d4-e24a-4d9d-9b05-8753e4eced9a', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('kozmetik/sac-bakim/sac-sekillendirici', 'Saç Şekillendirici', 'd69192d4-e24a-4d9d-9b05-8753e4eced9a', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('kozmetik/parfum/deodorant', 'Deodorant', 'd522e24c-f17d-45d5-aaf2-98480976a0f9', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('kozmetik/parfum/kolonya', 'Kolonya', 'd522e24c-f17d-45d5-aaf2-98480976a0f9', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('kozmetik/kisisel-bakim/hijyen/dus-banyo', 'Duş & Banyo', '8eb14734-4bf1-478e-bcda-0520c8fc6402', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('kozmetik/kisisel-bakim/hijyen/kadin-hijyen', 'Kadın Hijyen', '8eb14734-4bf1-478e-bcda-0520c8fc6402', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('kozmetik/kisisel-bakim/hijyen/kil-giderme-epilasyon', 'Kıl Giderme & Epilasyon', '8eb14734-4bf1-478e-bcda-0520c8fc6402', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('hobi-eglence/kitap-kirtasiye/kitap/roman-edebiyat', 'Roman & Edebiyat', '30029dfd-7276-457b-93ae-89d6c20d00ba', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('hobi-eglence/kitap-kirtasiye/kitap/kisisel-gelisim', 'Kişisel Gelişim', '30029dfd-7276-457b-93ae-89d6c20d00ba', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('hobi-eglence/kitap-kirtasiye/kitap/sinav-hazirlik', 'Sınav Hazırlık', '30029dfd-7276-457b-93ae-89d6c20d00ba', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('hobi-eglence/kitap-kirtasiye/kitap/bilim-akademik', 'Bilim & Akademik', '30029dfd-7276-457b-93ae-89d6c20d00ba', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('hobi-eglence/parti-malzemeleri', 'Parti Malzemeleri', '1aea7ac1-71d0-4b0b-ada7-03197a12519f', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('hobi-eglence/kitap-kirtasiye/kirtasiye/kalem-yazi-gerecleri', 'Kalem & Yazı Gereçleri', 'a8273819-03d1-4078-a436-dae55517fd41', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('hobi-eglence/kitap-kirtasiye/kirtasiye/defter-ajanda', 'Defter & Ajanda', 'a8273819-03d1-4078-a436-dae55517fd41', true, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug, name, parent_id, is_active, is_leaf) VALUES ('hobi-eglence/kitap-kirtasiye/kirtasiye/okul-cantasi', 'Okul Çantası', 'a8273819-03d1-4078-a436-dae55517fd41', true, true) ON CONFLICT (slug) DO NOTHING;

COMMIT;
