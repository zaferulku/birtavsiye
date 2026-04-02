-- Supabase Dashboard > SQL Editor'da çalıştır

DO $$
DECLARE
  t0 uuid; t1 uuid; t2 uuid; t3 uuid; t4 uuid;
  t5 uuid; t6 uuid; t7 uuid; t8 uuid; t9 uuid;
BEGIN

-- 10 topic (user_id NULL — seed data)
INSERT INTO topics (user_name, category, votes, answer_count, title, body) VALUES
  ('zeynep_k', 'Elektronik', 12, 5, '5000₺ bütçeyle en iyi kablosuz kulaklık hangisi?', 'Sony, Bose veya JBL arasında kaldım. Müzik dinlemek ve video konferans için kullanacağım.')
RETURNING id INTO t0;

INSERT INTO topics (user_name, category, votes, answer_count, title, body) VALUES
  ('ahmet_demir', 'Spor', 8, 6, 'Evde kullanım için hangi koşu bandını önerirsiniz?', 'Günde 30-45 dakika kullanacağım, 10.000₺ bütçem var. Sessiz çalışması önemli.')
RETURNING id INTO t1;

INSERT INTO topics (user_name, category, votes, answer_count, title, body) VALUES
  ('merve_yilmaz', 'Kozmetik', 21, 7, 'Kuru cilt için en iyi nemlendirici krem? (50₺ altı)', 'Kışın çok kuruyorum özellikle yanaklar. Yağlı hissettirmeyen bir şey arıyorum.')
RETURNING id INTO t2;

INSERT INTO topics (user_name, category, votes, answer_count, title, body) VALUES
  ('burak_c', 'Elektronik', 15, 5, 'MacBook Air M3 mü yoksa Dell XPS 13 mü?', 'Yazılım geliştirme için laptop arıyorum. İkisi arasında gerçekten kararsız kaldım.')
RETURNING id INTO t3;

INSERT INTO topics (user_name, category, votes, answer_count, title, body) VALUES
  ('selin_ay', 'Ev & Yaşam', 7, 5, 'Teflon veya paslanmaz çelik tava hangisi daha iyi?', '3 parçalı set alacağım. Her gün kullanım için hangisi daha uzun ömürlü ve sağlıklı?')
RETURNING id INTO t4;

INSERT INTO topics (user_name, category, votes, answer_count, title, body) VALUES
  ('emre_toprak', 'Elektronik', 18, 6, 'PS5 mi yoksa Xbox Series X mi almalıyım?', 'Her ikisini de hiç deneyimlemedim. Arkadaşlarım PS5te, ama Xbox Game Pass cazip geliyor.')
RETURNING id INTO t5;

INSERT INTO topics (user_name, category, votes, answer_count, title, body) VALUES
  ('dilan_ozkan', 'Hediye', 9, 5, 'Erkek arkadaşa 1000₺ bütçeyle teknoloji hediyesi?', 'Oyun oynamayı seviyor ama konsolunda her şeyi var. Kulaklık, klavye ya da başka bir şey olabilir.')
RETURNING id INTO t6;

INSERT INTO topics (user_name, category, votes, answer_count, title, body) VALUES
  ('can_arslan', 'Spor', 5, 5, 'Yüzme başlangıcında hangi gözlük markası önerilir?', 'Haftada 3 gün yüzmeye başlayacağım. Bütçem 200-400₺ arası.')
RETURNING id INTO t7;

INSERT INTO topics (user_name, category, votes, answer_count, title, body) VALUES
  ('irem_kara', 'Kozmetik', 14, 6, 'SPF 50 güneş kremi önerisi — yağlı cilt için', 'Yazın her gün kullanacağım, makyajın altında da rahat duran bir ürün arıyorum. Beyaz iz bırakmasın.')
RETURNING id INTO t8;

INSERT INTO topics (user_name, category, votes, answer_count, title, body) VALUES
  ('tarik_sahin', 'Elektronik', 11, 6, '4K monitör için Asus mu LG mi Samsung mi?', 'Grafik tasarım ve biraz oyun için 27 inç 4K monitör bakıyorum. Renk doğruluğu en önemli kriter.')
RETURNING id INTO t9;

-- Cevaplar — t0: kulaklık
INSERT INTO topic_answers (topic_id, user_name, gender, body, votes) VALUES
  (t0, 'ali_yuz', 'erkek', 'Sony WH-1000XM5 kesinlikle harika. Ses kalitesi ve gürültü engelleme açısından bu fiyat aralığında rakibi yok.', 5),
  (t0, 'ayse_t', 'kadin', 'Ben Bose QC45 kullanıyorum, video konferans için mükemmel. Mikrofon kalitesi Sony''den daha iyi.', 3),
  (t0, 'murat_b', 'erkek', 'JBL 720BT daha uygun fiyatlı ama ses kalitesi biraz düşük. Bütçen 5000 ise XM5''e git.', 2),
  (t0, 'ceyda_f', 'kadin', 'Her ikisini de denedim. Uzun süreli kullanımda Bose daha rahat, Sony daha bas ağırlıklı.', 4),
  (t0, 'kemal_d', 'erkek', 'ANC öncelikse Sony XM5. Sesli görüşmeyse Bose QC45.', 6);

-- t1: koşu bandı
INSERT INTO topic_answers (topic_id, user_name, gender, body, votes) VALUES
  (t1, 'fitlife_23', 'erkek', 'Weyole veya BH Fitness markalarına bakın. Türkiye''de servisi var ve 10K bütçeye güzel seçenekler var.', 4),
  (t1, 'spor_anne', 'kadin', 'Biz Sole F63 kullanıyoruz, çok sessiz ve dayanıklı.', 3),
  (t1, 'ibrahim_k', 'erkek', 'NordicTrack T6.5S bakın, otomatik eğim özelliği var.', 5),
  (t1, 'esra_m', 'kadin', 'Teknosa ve MediaMarkt''ta deneme fırsatı var, mutlaka deneyin. Kuşak kalınlığı önemli.', 2),
  (t1, 'hasan_r', 'erkek', 'Ev tipi için max hız 16 km/h yeterli. Daha fazlasına para vermeyin.', 1),
  (t1, 'gamze_y', 'kadin', 'Bakım maliyetine de dikkat edin, bazı markalar pahalı yedek parça istiyor.', 3);

-- t2: nemlendirici
INSERT INTO topic_answers (topic_id, user_name, gender, body, votes) VALUES
  (t2, 'dermatoloji_fan', 'kadin', 'Neutrogena Hydro Boost tam bütçenize uygun ve kuru cilt için gerçekten işe yarıyor.', 8),
  (t2, 'cilt_bakimi', 'kadin', 'CeraVe Moisturising Cream. Ceramideler cilt bariyerini onarıyor, yağlı hissettirmiyor.', 11),
  (t2, 'serkan_c', 'erkek', 'Kız kardeşim Eucerin Urea 5% kullanıyor ve çok memnun.', 2),
  (t2, 'make_up_101', 'kadin', 'Avene Cicalfate+ denemeden karar verme. Kuru ve hassas ciltler için mucize gibi.', 5),
  (t2, 'burcu_ak', 'kadin', 'La Roche-Posay Toleriane Double Repair biraz bütçenin üstünde ama promosyonda tutabilirsiniz.', 4),
  (t2, 'eczaci_yardim', 'kadin', 'Hyaluronik asit içeren bir ürün seçin. Urea da kuru cilt için çok faydalı.', 9),
  (t2, 'naturel_sevig', 'kadin', 'Arko Nem Yoğun Nemlendirici de gayet iyi, çok uygun fiyatlı.', 3);

-- t3: MacBook vs Dell
INSERT INTO topic_answers (topic_id, user_name, gender, body, votes) VALUES
  (t3, 'mac_dev', 'erkek', 'M3 Air ile geçtim, pişman değilim. Batarya ömrü inanılmaz, terminal deneyimi çok daha iyi.', 7),
  (t3, 'windows_fan', 'erkek', 'Dell XPS kalite inşaatı tartışılmaz ama Türkiye''de servisi berbat. MacBook''ta servis daha kolay.', 3),
  (t3, 'yazilimci_k', 'kadin', 'Docker ve VM çalıştırıyorsan M3''ün ARM mimarisinde bazen uyumsuzluk çıkıyor, dikkat.', 5),
  (t3, 'ozlem_yazilim', 'kadin', 'Yazılım geliştirme için Mac ekosistemi çok daha smooth. iOS geliştirme yapacaksan Mac şart.', 6),
  (t3, 'tech_review_tr', 'erkek', 'M3 Air fanless yani sürekli yoğun derlemelerde throttle yapıyor. Dikkat.', 4);

-- t4: tava
INSERT INTO topic_answers (topic_id, user_name, gender, body, votes) VALUES
  (t4, 'asci_eda', 'kadin', 'Paslanmaz çelik daha uzun ömürlü ama ısınması daha uzun sürer. Teflon pratik ama 2-3 yılda bir değişmeli.', 5),
  (t4, 'mutfak_pro', 'erkek', 'Karbon çelik en iyi orta yol. Teflon kaplama kaygısı yok, paslanmazdan daha çabuk ısınıyor.', 4),
  (t4, 'ev_hanimi', 'kadin', 'Ben Teflon''dan geçtim, artık döküm demir kullanıyorum. Ağır oluyor ama ömür boyu sürer.', 3),
  (t4, 'chef_ali', 'erkek', 'Restoran şefleri neredeyse hiç teflon kullanmaz. Profesyonel mutfakta paslanmaz tercih edilir.', 6),
  (t4, 'saglik_bilinci', 'kadin', 'PTFE kaplama çizilince sağlık riski var. Fissler veya WMF''nin kaliteli setlerine bakın.', 2);

-- t5: PS5 vs Xbox
INSERT INTO topic_answers (topic_id, user_name, gender, body, votes) VALUES
  (t5, 'oyuncu_nuri', 'erkek', 'Arkadaşların PS5''teyse PS5 al. Online oyunların zevki arkadaşlarla çok daha fazla.', 9),
  (t5, 'xbox_master', 'erkek', 'Game Pass değeri tartışılmaz. 600 TL''ye ayda yüzlerce oyun oynayabiliyorsun.', 7),
  (t5, 'konsol_bilen', 'erkek', 'PS5''in exclusive''leri (God of War, Spider-Man) gerçekten çok iyi.', 5),
  (t5, 'gamer_girl', 'kadin', 'Ben PS5 aldım, arayüz çok daha güzel ve DualSense kontrolcü deneyimi harika.', 4),
  (t5, 'butce_oyuncu', 'erkek', 'Türkiye''de PS5 oyun fiyatları çok yüksek. Xbox Game Pass bu konuda çok avantajlı.', 2),
  (t5, 'pc_den_gelen', 'erkek', 'Game Pass varsa PC''de de oynayabilirsin, konsol almana gerek yok zaten.', 3);

-- t6: erkek hediye
INSERT INTO topic_answers (topic_id, user_name, gender, body, votes) VALUES
  (t6, 'hediye_uzman', 'kadin', 'HyperX Cloud III kulaklık tam 1000 TL bandında ve oyuncu için süper bir hediye.', 5),
  (t6, 'tech_gift', 'erkek', 'Mekanik klavye çok iyi hediye olur. Keychron K2 veya K6 bu bütçeye uygun ve kaliteli.', 6),
  (t6, 'gizli_alis', 'kadin', 'Oyun mouse''u düşündün mü? Logitech G502 X veya Razer DeathAdder V3 1000 TL civarı.', 4),
  (t6, 'bilgili_abi', 'erkek', 'HyperX Cloud Stinger 2 Core 800 TL civarı, performansı fiyatının çok üstünde.', 3),
  (t6, 'pratik_hediye', 'kadin', 'Mousepad XL veya RGB şerit de güzel hediye olabilir.', 2);

-- t7: yüzme gözlüğü
INSERT INTO topic_answers (topic_id, user_name, gender, body, votes) VALUES
  (t7, 'yuzmeci_pro', 'erkek', 'Arena Cobra Ultra Swipe veya Speedo Fastskin bu bütçeye uygun ve havuz için ideal.', 3),
  (t7, 'sporcu_nese', 'kadin', 'Ben TYR öneriyorum, özellikle Socket Rocket 2.0. Silikon conta uzun süre sızdırmaz kalıyor.', 4),
  (t7, 'havuz_hoca', 'erkek', 'Anti-fog kaplama özelliği olan modeli seçin. Buğulanmayan gözlük konsantrasyonu çok artırıyor.', 5),
  (t7, 'deneyimli_yuzu', 'erkek', 'Başlangıç için Speedo yeterli. Önce tekniğinizi geliştirin, sonra premium modele geçersiniz.', 2),
  (t7, 'swim_mom', 'kadin', 'Decathlon''da deneyerek bakın, fit olmayan gözlük her şeyden önemli.', 3);

-- t8: güneş kremi
INSERT INTO topic_answers (topic_id, user_name, gender, body, votes) VALUES
  (t8, 'uv_uzman', 'kadin', 'La Roche-Posay Anthelios Ultra Light Fluid. Yağlı ciltler için formüle edilmiş, beyaz iz yok.', 10),
  (t8, 'kore_beauty', 'kadin', 'Skin1004 Madagascar Centella muhteşem doku, beyaz iz yok. Kore güneş kremleri gerçekten farklı.', 8),
  (t8, 'cilt_biliyor', 'kadin', 'Yağlı cilt için mineral filtreli değil, kimyasal filtreli SPF seçin. Daha hafif hissettiriyor.', 4),
  (t8, 'gunes_krem_101', 'kadin', 'ISDIN Fusion Water Color 50+ hafif ve makyaj altında mükemmel.', 5),
  (t8, 'pratik_tavsiye', 'erkek', 'Her gün kullanacaksan Eucerin Sun Gel-Cream 50+ hem etkili hem makul fiyatlı.', 3),
  (t8, 'altruist_fan', 'kadin', 'Altruist SPF50 çok uygun fiyatlı ve harika. Makyaj altında da rahat duruyor.', 6);

-- t9: 4K monitör
INSERT INTO topic_answers (topic_id, user_name, gender, body, votes) VALUES
  (t9, 'grafik_tasarim', 'erkek', 'LG 27UL850 renk doğruluğu açısından çok iyi. sRGB %99+ kapsama alanı var.', 7),
  (t9, 'asus_fan', 'erkek', 'Asus ProArt PA279CRV, Delta E < 2 fabrika kalibrasyonu var. Profesyonel tasarım için ideal.', 6),
  (t9, 'renk_hassas', 'kadin', 'Grafik tasarımda renk kalibrasyonu çok önemli. IPS panel seçin, VA ve TN daha zayıf.', 5),
  (t9, 'samsung_fan', 'erkek', 'Samsung Odyssey Neo G7 4K hem oyun hem tasarım için harika ama biraz daha pahalı.', 4),
  (t9, 'pc_setup', 'erkek', 'USB-C veya Thunderbolt bağlantısı olan modeli tercih edin, laptop ile tek kablo yeterli.', 4),
  (t9, 'butce_tavsiye', 'erkek', 'LG 27UL500 daha uygun fiyatlı ve temel 4K ihtiyaçlarını karşılıyor.', 3);

END $$;
