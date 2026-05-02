-- 029_categories_keywords_backfill.sql
-- 216 kategori icin keywords backfill (Migration 021 NULL kalmisti)
-- + GIN index (array contains performans)
-- Idempotent: keywords NULL/empty olanlar UPDATE, dolu olanlar atla
--
-- KOD ETKISI: SIFIR. Sadece DB tarafinda degisiklik.
-- src/lib/chatbot/categoryKnowledge.ts ve queryParser.ts dokunulmadi.
-- Static map'ler korundu - DB keywords paralel kaynak olarak calisir.
--
-- KAYNAK:
-- - 25 entry: scripts/category-keywords-static-mapped.json
--   (queryParser STATIC_CATEGORY_KEYWORDS + CHATBOT_FALLBACK_CATEGORY_PHRASES)
-- - 191 entry: scripts/category-keywords-llm-v1.json
--   (Gemini 2.5-flash + Groq llama-3.3-70b + NVIDIA llama-3.3-70b-instruct)
-- - TOPLAM: 216 = DB'deki tum kategoriler
-- - Avg 7.5 keyword/slug

BEGIN;

-- Step 1: Backfill (idempotent, dolu olanlari atla)
WITH new_keywords (slug, kw) AS (
  VALUES
    ('anne-bebek', ARRAY['bebek bezi','bebek maması','bebek mamasi','bebek arabası','bebek arabasi','emzik','biberon','bebek giyim']::text[]),
    ('anne-bebek/bebek-bakim', ARRAY['bebek bezi','ıslak mendil','islak mendil','pişik kremi','pisik kremi','bebek şampuanı','bebek sampuani','bebek yağı','bebek yagi','emzik','biberon']::text[]),
    ('anne-bebek/bebek-bakim/bakim-urunleri', ARRAY['bebek bakım ürünleri','bebek bakim urunleri','bebek şampuanı','bebek sampuani','bebek losyonu','bebek losyoni','bebek kremi']::text[]),
    ('anne-bebek/bebek-bakim/bebek-bezi', ARRAY['bebek bezi','bebek bezleri','bebek pamuklu bezi','bebek pamuklu bezleri','bebek Islak mendil','bebek islak mendilleri']::text[]),
    ('anne-bebek/bebek-bakim/guvenlik', ARRAY['bebek güvenliği','bebek guvenligi','bebek emniyeti','bebek koruma','bebek koruma ürünleri','bebek güvenlik ürünleri']::text[]),
    ('anne-bebek/bebek-bakim/islak-mendil', ARRAY['islak mendil','islak mendiller','bebek islak mendili','bebek islak mendilleri','temizlik mendili','temizlik mendilleri']::text[]),
    ('anne-bebek/bebek-beslenme', ARRAY['biberon','emzik','mama sandalyesi','mama sandalyeleri','bebek maması','bebek mamasi','sterilizatör','sterilizator']::text[]),
    ('anne-bebek/bebek-beslenme/biberon-emzik', ARRAY['biberon','emzik','biberon emzik','bebek biberonu','emzik çeşidi','biberon seti','bebek emzirme']::text[]),
    ('anne-bebek/bebek-beslenme/mama', ARRAY['bebek maması','bebek sütü','anne sütü','bebek beslenmesi','mama çeşidi','bebek gıdası','anne bebek maması']::text[]),
    ('anne-bebek/bebek-tasima', ARRAY['bebek arabası','bebek arabasi','oto koltuğu','oto koltugu','ana kucağı','ana kucagi','kanguru','bebek taşıyıcı','bebek tasiyici']::text[]),
    ('anne-bebek/bebek-tasima/araba-puset', ARRAY['bebek arabası','puset','bebek taşıma','araba puset','bebek arabası çeşidi','puset çeşidi','bebek taşıma arabası']::text[]),
    ('anne-bebek/bebek-tasima/besik', ARRAY['beşik','bebek yatağı','beşik çeşidi','bebek yatağı çeşidi','bebek beşik','bebek yatağı seti']::text[]),
    ('anne-bebek/bebek-tasima/oto-koltugu', ARRAY['oto koltuğu','bebek oto koltuğu','oto koltuğu çeşidi','bebek güvenliği','oto koltuğu seti','bebek oto koltuğu çeşidi']::text[]),
    ('anne-bebek/cocuk-odasi', ARRAY['bebek yatağı','bebek yatagi','beşik','besik','çocuk dolabı','cocuk dolabi','emzirme koltuğu','emzirme koltugu','oyun halısı','oyun halisi']::text[]),
    ('anne-bebek/oyuncak', ARRAY['bebek oyuncağı','bebek oyuncagi','eğitici oyuncak','egitici oyuncak','ahşap oyuncak','ahsap oyuncak','peluş oyuncak','pelus oyuncak','aktivite masası','aktivite masasi']::text[]),
    ('anne-bebek/oyuncak/diger', ARRAY['diğer oyuncaklar','çocuk oyuncakları','bebek oyuncakları','oyuncak bebek','oyuncak hayvan','çocuk oyuncağı']::text[]),
    ('anne-bebek/oyuncak/egitici', ARRAY['eğitici oyuncak','oyuncak çeşidi','eğitici oyun','bebek eğitimi','eğitici oyuncak seti','oyuncak eğitimi']::text[]),
    ('anne-bebek/oyuncak/figur', ARRAY['figür','oyuncak bebek','figür çeşidi','oyuncak bebek çeşidi','oyuncak figür','bebek figürü']::text[]),
    ('anne-bebek/oyuncak/lego', ARRAY['lego','yapı blokları','lego çeşidi','yapı bloğu','lego seti','yapı blokları çeşidi']::text[]),
    ('anne-bebek/oyuncak/masa-oyunu', ARRAY['masa oyunu','çocuk masa oyunu','bulmaca','çocuk bulmaca','oyun seti','çocuk oyun seti']::text[]),
    ('anne-bebek/oyuncak/rc-robot', ARRAY['rc araba','rc robot','oyuncak robot','çocuk rc','çocuk robot','oyuncak araba','uzaktan kumanda araba']::text[]),
    ('beyaz-esya', ARRAY['beyaz eşya','ev aletleri','mutfak aletleri','çamaşır makinesi','bulaşık makinesi','buzdolabı','ev eşyası']::text[]),
    ('beyaz-esya/aspirator-davlumbaz', ARRAY['aspiratör','aspirator','davlumbaz','ankastre davlumbaz','ada tipi davlumbaz','mutfak havalandırma','mutfak havalandirma']::text[]),
    ('beyaz-esya/bulasik-makinesi', ARRAY['bulaşık makinesi','bulasik makinesi','ankastre bulaşık makinesi','ankastre bulasik makinesi','tezgah altı bulaşık makinesi','tezgah alti bulasik makinesi','yarı ankastre bulaşık makinesi','yari ankastre bulasik makinesi']::text[]),
    ('beyaz-esya/buzdolabi', ARRAY['buzdolabı','buzdolabi','no-frost buzdolabı','no-frost buzdolabi','derin dondurucu','çift kapılı buzdolabı','cift kapili buzdolabi','gardırop tipi buzdolabı','gardirop tipi buzdolabi']::text[]),
    ('beyaz-esya/camasir-makinesi', ARRAY['çamaşır makinesi','camasir makinesi','kurutmalı çamaşır makinesi','kurutmali camasir makinesi','otomatik çamaşır makinesi','otomatik camasir makinesi','yıkama makinesi','yikama makinesi']::text[]),
    ('beyaz-esya/firin-ocak', ARRAY['fırın','firin','ocak','ankastre fırın','ankastre firin','set üstü ocak','set ustu ocak','elektrikli ocak']::text[]),
    ('beyaz-esya/isitici-soba', ARRAY['ısıtıcı','isitici','soba','elektrikli ısıtıcı','elektrikli isitici','fanlı ısıtıcı','fanli isitici','radyatör']::text[]),
    ('beyaz-esya/klima', ARRAY['klima']::text[]),
    ('beyaz-esya/kurutma-makinesi', ARRAY['kurutma makinesi','çamaşır kurutma makinesi','camasir kurutma makinesi','ısı pompalı kurutma','isi pompali kurutma','yoğuşmalı kurutma makinesi','yogusmali kurutma makinesi','çamaşır kurutucu','camasir kurutucu']::text[]),
    ('beyaz-esya/mikrodalga', ARRAY['mikrodalga','mikrodalga fırın','mikrodalga firin','solo mikrodalga','ankastre mikrodalga','mikrodalga ısıtıcı','mikrodalga isitici']::text[]),
    ('elektronik', ARRAY['elektronik','teknoloji','gadget','cihaz','aksesuar','elektronik cihaz','teknolojik ürün']::text[]),
    ('elektronik/ag-guvenlik', ARRAY['modem','router','ağ cihazı','ag cihazi','güvenlik kamerası','guvenlik kamerasi','ip kamera','alarm sistemi']::text[]),
    ('elektronik/ag-guvenlik/guvenlik-kamera', ARRAY['güvenlik kamerası','guvenlik kamerasi','ip kamera','cctv kamera','kablosuz kamera','kablosuz guvenlik kamerası','kablosuz guvenlik kamerasi']::text[]),
    ('elektronik/ag-guvenlik/modem', ARRAY['modem','ağ cihazı','internet modem','kablosuz modem','adsl modem','vds modem','modem router','ağ güvenlik cihazı']::text[]),
    ('elektronik/bilgisayar-tablet', ARRAY['dizüstü bilgisayar','dizustu bilgisayar','masaüstü bilgisayar','masaustu bilgisayar','tablet','laptop','monitör','monitor']::text[]),
    ('elektronik/bilgisayar-tablet/bilesenler', ARRAY['bilgisayar bileşenleri','bilgisayar bilesenleri','işlemci','islemci','anakart','ekran kartı','ekran karti','ram','depolama','ssd','harddisk','güç kaynağı','guc kaynagi']::text[]),
    ('elektronik/bilgisayar-tablet/klavye-mouse', ARRAY['klavye','mouse','fare','webcam','web kamerası','web kamerasi','oyuncu klavyesi','oyuncu faresi','kablosuz klavye','kablosuz mouse']::text[]),
    ('elektronik/bilgisayar-tablet/laptop', ARRAY['dizustu bilgisayar','notebook','laptop','macbook']::text[]),
    ('elektronik/bilgisayar-tablet/masaustu', ARRAY['masaüstü bilgisayar','masaustu bilgisayar','masaüstü pc','masaustu pc','hazır sistem','oyun bilgisayarı','oyun bilgisayari','iş istasyonu','is istasyonu']::text[]),
    ('elektronik/bilgisayar-tablet/monitor', ARRAY['oyuncu monitoru','monitör','monitor']::text[]),
    ('elektronik/bilgisayar-tablet/tablet', ARRAY['ipad','tablet']::text[]),
    ('elektronik/bilgisayar-tablet/yazici', ARRAY['yazıcı','yazici','tarayıcı','tarayici','lazer yazıcı','lazer yazici','mürekkep püskürtmeli yazıcı','murekkep puskurtmeli yazici','çok fonksiyonlu yazıcı','cok fonksiyonlu yazici','yazıcı kartuşu','yazici kartusu','toner']::text[]),
    ('elektronik/giyilebilir', ARRAY['akıllı saat','akilli saat','akıllı bileklik','akilli bileklik','spor saati','aktivite takipçisi','aktivite takipcisi','giyilebilir cihaz']::text[]),
    ('elektronik/giyilebilir/akilli-saat', ARRAY['akilli saat','smartwatch','watch']::text[]),
    ('elektronik/kamera', ARRAY['fotoğraf makinesi','fotograf makinesi','kamera','dijital kamera','aynasız kamera','aynasiz kamera','lens','tripod']::text[]),
    ('elektronik/kamera/aksiyon-kamera', ARRAY['aksiyon kamera','action camera','spor kamera','su altı kamera','kayak kamera','kayak kamerası','spor kamerası']::text[]),
    ('elektronik/kamera/drone', ARRAY['drone','insansız uçak','kamera drone','hava aracı','uçuş cihazı','drone kamera','drone kamerası','insansız hava aracı']::text[]),
    ('elektronik/kamera/fotograf-makinesi', ARRAY['fotograf makinesi','fotoğraf makinesi','kamera','dijital kamera','fotograf cihazı','fotoğraf cihazı','dslr kamera','dslr camera']::text[]),
    ('elektronik/oyun', ARRAY['oyun konsolu','oyun','video oyunu','oyun kolu','oyun kumandası','oyun kumandasi','oyun aksesuarı','oyun aksesuari']::text[]),
    ('elektronik/oyun/konsol', ARRAY['oyun konsolu','oyun console','playstation','xbox','nintendo','oyun sistemi','konsol oyun','ev oyun sistemi']::text[]),
    ('elektronik/telefon', ARRAY['akilli telefon','cep telefonu','telefon','iphone','galaxy','redmi','xiaomi','vivo','oppo','honor','poco','realme']::text[]),
    ('elektronik/telefon/akilli-telefon', ARRAY['akıllı telefon','akilli telefon','cep telefonu','mobil telefon','yeni telefon','telefon modelleri']::text[]),
    ('elektronik/telefon/aksesuar', ARRAY['telefon aksesuarı','telefon aksesuari','telefon kılıfı','telefon kilifi','ekran koruyucu','şarj kablosu','sarj kablosu','kulaklık','kulaklik','selfie çubuğu','selfie cubugu']::text[]),
    ('elektronik/telefon/ekran-koruyucu', ARRAY['ekran koruyucu','telefon ekran koruyucu','kırılmaz cam','kirilmaz cam','temperli cam','jelatin','cam koruyucu']::text[]),
    ('elektronik/telefon/kilif', ARRAY['telefon kılıfı','telefon kilifi','cep telefonu kılıfı','cep telefonu kilifi','şeffaf kılıf','seffaf kilif','silikon kılıf','silikon kilif']::text[]),
    ('elektronik/telefon/powerbank', ARRAY['powerbank','taşınabilir şarj','tasinabilir sarj','mobil şarj','mobil sarj','harici batarya','telefon şarj cihazı','telefon sarj cihazi']::text[]),
    ('elektronik/telefon/sarj-kablo', ARRAY['şarj cihazı','sarj cihazi','şarj kablosu','sarj kablosu','hızlı şarj','hizli sarj','adaptör','adaptor','type-c kablo']::text[]),
    ('elektronik/telefon/yedek-parca', ARRAY['telefon yedek parça','telefon yedek parca','telefon ekranı','telefon ekrani','batarya','pil','şarj soketi','sarj soketi','kamera modülü','kamera modulu']::text[]),
    ('elektronik/tv-ses-goruntu', ARRAY['tv','ses sistemi','görüntü sistemi','home theater','tv aksesuarı','ses aksesuarı','görüntü aksesuarı','multimedya']::text[]),
    ('elektronik/tv-ses-goruntu/bluetooth-hoparlor', ARRAY['bluetooth hoparlor','bluetooth hoparlör','kablosuz hoparlor','kablosuz hoparlör','portatif hoparlor','portatif hoparlör','müzik hoparlor','müzik hoparlör']::text[]),
    ('elektronik/tv-ses-goruntu/kulaklik', ARRAY['airpods','kulak ici','kulak ustu','kulaklik']::text[]),
    ('elektronik/tv-ses-goruntu/projeksiyon', ARRAY['projeksiyon','projeksiyon cihazı','projeksiyon makinesi','görüntü projeksiyon','ses projeksiyon','projeksiyon ekranı','projeksiyon lambası']::text[]),
    ('elektronik/tv-ses-goruntu/soundbar', ARRAY['soundbar','ev sinema','ses sistemi','görüntü sistemi','home theater','sound bar','ses bar','ev sinema sistemi']::text[]),
    ('elektronik/tv-ses-goruntu/televizyon', ARRAY['smart tv','televizyon','tv']::text[]),
    ('elektronik/tv-ses-goruntu/tv-aksesuar', ARRAY['tv aksesuarı','tv aksesuari','tv askı aparatı','tv aski aparati','tv kumandası','tv kumandasi','akıllı kumanda','akilli kumanda','hdmi kablo','uydu alıcısı','uydu alicisi','tv sehpası','tv sehpasi']::text[]),
    ('ev-yasam', ARRAY['ev tekstili','ev dekorasyonu','mobilya','dekorasyon','ev aksesuarı','ev tekstil','ev dekor']::text[]),
    ('ev-yasam/aydinlatma', ARRAY['avize','lambader','abajur','masa lambası','masa lambasi','tavan lambası','tavan lambasi','ampul','spot ışık','spot isik']::text[]),
    ('ev-yasam/bahce-balkon', ARRAY['bahçe mobilyası','bahce mobilyasi','balkon seti','şemsiye','semsiye','mangal','barbekü','barbeku','saksı','saksi']::text[]),
    ('ev-yasam/banyo', ARRAY['banyo dolabı','banyo dolabi','duşakabin','dusakabin','klozet','lavabo','banyo paspası','banyo paspasi','sabunluk']::text[]),
    ('ev-yasam/ev-tekstili', ARRAY['nevresim takımı','nevresim takimi','çarşaf','carsaf','yorgan','battaniye','pike','havlu','perde']::text[]),
    ('ev-yasam/mobilya', ARRAY['koltuk','kanepe','masa','sandalye','yatak','dolap','gardırop','gardirop','kitaplık','kitaplik']::text[]),
    ('ev-yasam/mobilya/ofis', ARRAY['ofis mobilyası','ofis mobilyasi','masa','masalar','sandalye','sandalyeler','dosya dolabı','dosya dolabi','raflar']::text[]),
    ('ev-yasam/mobilya/oturma-odasi', ARRAY['oturma odası mobilyası','oturma odasi mobilyasi','koltuk takımı','koltuk takimi','sehpa','sehpa masası','sehpa masasi','tv ünitesi','tv unitesi']::text[]),
    ('ev-yasam/mobilya/yatak-odasi', ARRAY['yatak odası mobilyası','yatak odasi mobilyasi','yatak','yataklı koltuk','komodin','komodinler','gardırop','gardiroplar']::text[]),
    ('ev-yasam/mobilya/yemek-odasi', ARRAY['yemek odası mobilyası','yemek odasi mobilyasi','yemek masası','yemek masasi','sandalye','sandalyeler','vitrin','vitrinler']::text[]),
    ('ev-yasam/mutfak-sofra', ARRAY['yemek takımı','yemek takimi','çatal bıçak','catal bicak','tabak','bardak','tencere','tava','mutfak gereçleri','mutfak gerecleri']::text[]),
    ('ev-yasam/temizlik', ARRAY['deterjan','çamaşır suyu','camasir suyu','yüzey temizleyici','yuzey temizleyici','bulaşık deterjanı','bulasik deterjani','paspas','kova','temizlik bezi']::text[]),
    ('hobi-eglence', ARRAY['oyun','oyuncak','müzik aleti','sanat malzemesi','spor malzemesi','eğlence ürünleri','hobi malzemeleri']::text[]),
    ('hobi-eglence/kitap-kirtasiye', ARRAY['kitap','kırtasiye','kirtasiye','defter','kalem','boya','roman','hikaye']::text[]),
    ('hobi-eglence/kitap-kirtasiye/cocuk-kitap', ARRAY['çocuk kitabı','çocuk romanı','resimli kitap','çocuk hikayesi','çocuk masalı','çocuk kitap seti']::text[]),
    ('hobi-eglence/kitap-kirtasiye/film-dizi', ARRAY['film','dizi','blu-ray','dvd','film seti','dizi seti']::text[]),
    ('hobi-eglence/kitap-kirtasiye/kirtasiye', ARRAY['kirtasiye','okul malzemesi','defter','kalem','silgi','çanta']::text[]),
    ('hobi-eglence/kitap-kirtasiye/kitap', ARRAY['kitap','roman','şiir kitabı','çocuk kitabı','kadro kitabı','kitap seti']::text[]),
    ('hobi-eglence/koleksiyon', ARRAY['koleksiyon','pul','madeni para','eski para','antika','model araba','figür','figur']::text[]),
    ('hobi-eglence/parti', ARRAY['parti malzemeleri','doğum günü','dogum gunu','balon','konfeti','kostüm','kostum']::text[]),
    ('hobi-eglence/sanat-muzik', ARRAY['sanat malzemeleri','müzik aletleri','muzik aletleri','resim','tuval','gitar','piyano']::text[]),
    ('hobi-eglence/sanat-muzik/el-sanatlari', ARRAY['el sanatları','nakış','örgü','keçe','el işi','el sanatı','hobi malzemeleri','el sanatları malzemeleri']::text[]),
    ('hobi-eglence/sanat-muzik/muzik-aleti', ARRAY['müzik aleti','enstrüman','gitar','piyano','davul','müzik seti']::text[]),
    ('hobi-eglence/sanat-muzik/resim', ARRAY['resim','çizim','boyama','sanat malzemeleri','resim malzemeleri','çizim malzemeleri','sanat seti','resim seti']::text[]),
    ('kozmetik', ARRAY['makyaj','cilt bakımı','cilt bakimi','saç bakımı','sac bakimi','parfüm','parfum','deodorant','güzellik','guzellik']::text[]),
    ('kozmetik/cilt-bakim', ARRAY['cilt bakımı','cilt bakimi','yüz kremi','yuz kremi','nemlendirici','serum','maske','güneş kremi','gunes kremi']::text[]),
    ('kozmetik/cilt-bakim/gunes-koruyucu', ARRAY['güneş koruyucu','gunes koruyucu','yüz güneşlik','yuz guneslik','cilt güneşlik','cilt guneslik','sunscreen','güneş kremi']::text[]),
    ('kozmetik/cilt-bakim/maske', ARRAY['yüz maske','yuz maske','cilt maske','mask','maske','yüz bakim maske','yuz bakim maske']::text[]),
    ('kozmetik/cilt-bakim/nemlendirici', ARRAY['yüz nemlendirici','yuz nemlendirici','cilt nemlendirici','nemlendirici','nemlendirici krem','yüz kremi','yuz kremi']::text[]),
    ('kozmetik/cilt-bakim/serum', ARRAY['serum','ampul serum','cilt serumu']::text[]),
    ('kozmetik/cilt-bakim/temizleyici', ARRAY['yüz temizleyici','yuz temizleyici','cilt temizleyici','temizleyici','yüz temizleme','yuz temizleme','cilt temizleme']::text[]),
    ('kozmetik/kisisel-bakim', ARRAY['kişisel bakım','kisisel bakim','deodorant','parfüm','parfum','duş jeli','dus jeli','vücut losyonu','vucut losyonu','el kremi']::text[]),
    ('kozmetik/kisisel-bakim/agiz-dis', ARRAY['ağız bakımı','agiz bakimi','diş bakımı','dis bakimi','diş macunu','dis macunu','ağız duşu','agiz dusu']::text[]),
    ('kozmetik/kisisel-bakim/deodorant', ARRAY['deodorant']::text[]),
    ('kozmetik/kisisel-bakim/erkek', ARRAY['erkek bakımı','erkek bakimi','erkek cilt bakımı','erkek cilt bakimi','erkek saç bakımı','erkek sac bakimi','erkek vücut bakımı','erkek vucut bakimi']::text[]),
    ('kozmetik/kisisel-bakim/hijyen', ARRAY['kişisel hijyen','kisisel hijyen','vücut temizliği','vucut temizligi','el hijyeni','ağız hijyeni','agiz hijyeni']::text[]),
    ('kozmetik/kisisel-bakim/vucut', ARRAY['vücut bakımı','vucut bakimi','cilt bakımı','cilt bakimi','vücut losyonu','vucut losyonu','vücut yağları','vucut yagli']::text[]),
    ('kozmetik/makyaj', ARRAY['makyaj','fondöten','fondoten','ruj','maskara','göz kalemi','goz kalemi','far','allık','allik']::text[]),
    ('kozmetik/makyaj/dudak', ARRAY['dudak makyajı','dudak makyaaji','dudak boyası','dudak boyasi','lipstick','dudak kremi','dudak bakim']::text[]),
    ('kozmetik/makyaj/firca-aksesuar', ARRAY['makyaj fırça','makyaaj firca','makyaj aksesuar','makyaaj aksesuar','fırça seti','firca seti','makyaj çantası','makyaaj cantasi']::text[]),
    ('kozmetik/makyaj/goz', ARRAY['göz makyajı','goz makyaaji','göz farı','goz fari','göz kalemi','goz kalemi','eyeliner','göz shadow']::text[]),
    ('kozmetik/makyaj/yuz', ARRAY['yüz makyajı','yuz makyaaji','yüz fondöten','yuz fondoten','yüz pudrası','yuz pudrasi','yüz allık','yuz allik']::text[]),
    ('kozmetik/parfum', ARRAY['parfum','parfüm']::text[]),
    ('kozmetik/sac-bakim', ARRAY['saç bakımı','sac bakimi','şampuan','sampuan','saç kremi','sac kremi','saç maskesi','sac maskesi','saç yağı','sac yagi']::text[]),
    ('kozmetik/sac-bakim/boya', ARRAY['saç boyası','sac boyasi','saç renkleri','sac renkleri','saç dökmek','sac dokmek','kalıcı saç boyası','kalici sac boyasi']::text[]),
    ('kozmetik/sac-bakim/sampuan', ARRAY['şampuan','sampuan','saç kremi','sac krem','saç şampuanı','sac sampuani','duş şampuanı','dus sampuani']::text[]),
    ('kozmetik/sac-bakim/sekillendirici', ARRAY['saç şekillendirici','sac sekillendirici','saç jeli','sac jeli','saç spreyi','sac spreyi','saç köpüğü','sac kopugu']::text[]),
    ('kozmetik/sac-bakim/urunler', ARRAY['saç bakım','sac bakim','saç ürünleri','sac urunleri','saç maskesi','sac maske','saç kremi','sac krem']::text[]),
    ('kucuk-ev-aletleri', ARRAY['küçük ev aletleri','mutfak gereçleri','ev gereçleri','küçük ev eşyası','mutfak aletleri','ev aletleri','küçük cihazlar']::text[]),
    ('kucuk-ev-aletleri/ev-cihazlari', ARRAY['ev aletleri','küçük ev aletleri','kucuk ev aletleri','hava nemlendirici','hava temizleyici','vantilatör','dikiş makinesi','dikis makinesi']::text[]),
    ('kucuk-ev-aletleri/ev-cihazlari/hava-temizleyici', ARRAY['hava temizleyici','hava temizleyici cihazı','nemlendirici','nemlendirici cihazı','hava nemlendirici','hava nemlendirici cihazı','ev hava temizleyici','ev nemlendirici']::text[]),
    ('kucuk-ev-aletleri/ev-cihazlari/tarti', ARRAY['terazi','tartı','baskül','digital terazi','dijital tarti','mutfak terazi','mutfak tarti','kişisel tartı','kisisel tarti']::text[]),
    ('kucuk-ev-aletleri/ev-cihazlari/utu', ARRAY['ütü makinesi','utu makinesi','buharlı ütü','buharli utu','çelik ütü','celik utu','ütü tabla','utu tabla']::text[]),
    ('kucuk-ev-aletleri/kisisel-bakim', ARRAY['kişisel bakım','kisisel bakim','saç kurutma makinesi','sac kurutma makinesi','saç düzleştirici','sac duzlestirici','tıraş makinesi','tiras makinesi','epilatör']::text[]),
    ('kucuk-ev-aletleri/kisisel-bakim/diger', ARRAY['kişisel bakım cihazı','kisisel bakim cihazi','epilatör','epilator','cilt bakım cihazı','cilt bakim cihazi','saç bakım cihazı','sac bakim cihazi']::text[]),
    ('kucuk-ev-aletleri/kisisel-bakim/sac-kurutma', ARRAY['saç kurutma makinesi','sac kurutma makinesi','şekillendirici','saç şekillendirici','sac sekillendirici','saç kurutma','sac kurutma']::text[]),
    ('kucuk-ev-aletleri/mutfak', ARRAY['mutfak aletleri','blender','mikser','kahve makinesi','çay makinesi','cay makinesi','tost makinesi','fritöz','fritoz']::text[]),
    ('kucuk-ev-aletleri/mutfak/airfryer', ARRAY['airfryer','fritöz','hava fritözü','hava kızartma makinesi','airfryer makinesi','fritöz makinesi']::text[]),
    ('kucuk-ev-aletleri/mutfak/blender', ARRAY['blender','mutfak blender','meyve blender','sebze blender','blender seti','blender makinesi']::text[]),
    ('kucuk-ev-aletleri/mutfak/blender-mutfak-robotu', ARRAY['blender mutfak robotu','mutfak robotu','blender robot','mutfak blender robot','robot blender','mutfak yardımcısı']::text[]),
    ('kucuk-ev-aletleri/mutfak/diger', ARRAY['diğer mutfak aletleri','mutfak aletleri','mutfak gereçleri','mutfak eşyaları','mutfak malzemesi','mutfak araçları']::text[]),
    ('kucuk-ev-aletleri/mutfak/kahve-makinesi', ARRAY['kahve makinasi','kahve makinesi','espresso makinesi','filtre kahve makinesi','kapsullu kahve makinesi','kapsullu kahve makinasi']::text[]),
    ('kucuk-ev-aletleri/mutfak/mikser', ARRAY['mikser','mutfak mikser','çırpmalı mikser','mikser seti','mikser makinesi','çırpmalı mikser makinesi']::text[]),
    ('kucuk-ev-aletleri/mutfak/su-isiticisi', ARRAY['su ısıtıcısı','çay makinesi','su ısıtıcı','çay ısıtıcı','su ve çay ısıtıcısı','çay ve su ısıtıcısı']::text[]),
    ('kucuk-ev-aletleri/mutfak/tost-makinesi', ARRAY['tost makinesi','kızartma makinesi','tost ve kızartma makinesi','tost makinesi seti','kızartma makinesi seti','tost ve kızartma makinesi seti']::text[]),
    ('kucuk-ev-aletleri/temizlik', ARRAY['temizlik cihazları','temizlik cihazlari','elektrik süpürgesi','elektrik supurgesi','robot süpürge','robot supurge','ütü','utu','buharlı temizleyici','buharli temizleyici']::text[]),
    ('kucuk-ev-aletleri/temizlik/robot-supurge', ARRAY['robot supurge','robot süpürge']::text[]),
    ('kucuk-ev-aletleri/temizlik/supurge', ARRAY['dikey supurge','torbasiz supurge','supurge','süpürge']::text[]),
    ('moda', ARRAY['moda','giyim','kuşam','ayakkabı','çanta','aksesuar','giyim aksesuarı','moda ürünleri']::text[]),
    ('moda/aksesuar', ARRAY['moda aksesuar','şapka','sapka','atkı','atki','eldiven','kemer','çanta','canta','takı','taki']::text[]),
    ('moda/aksesuar/canta-cuzdan', ARRAY['canta','cuzdan','erkek canta','kadin canta','cuzdan modasi','canta modasi','aksesuar canta']::text[]),
    ('moda/aksesuar/gozluk', ARRAY['gozluk','gunes gozlugu','erkek gozluk','kadin gozluk','gozluk modasi','aksesuar gozluk','gunes gozlugu modasi']::text[]),
    ('moda/aksesuar/saat-taki', ARRAY['saat','taki','erkek saat','kadin saat','taki modasi','saat modasi','aksesuar saat']::text[]),
    ('moda/cocuk-moda', ARRAY['çocuk giyim','cocuk giyim','bebek giyim','çocuk ayakkabı','cocuk ayakkabi','çocuk elbise','cocuk elbise','çocuk pantolon','cocuk pantolon']::text[]),
    ('moda/cocuk-moda/ayakkabi', ARRAY['cocuk ayakkabi','cocuk spor ayakkabi','cocuk sneaker','erkek cocuk ayakkabi','kiz cocuk ayakkabi','cocuk ayakkabi modasi']::text[]),
    ('moda/cocuk-moda/giyim', ARRAY['cocuk giyim','cocuk modasi','erkek cocuk giyim','kiz cocuk giyim','cocuk kiyafeti','cocuk giyim modasi']::text[]),
    ('moda/erkek-ayakkabi', ARRAY['erkek ayakkabı','erkek ayakkabi','spor ayakkabı','spor ayakkabi','klasik ayakkabı','klasik ayakkabi','bot','loafer','sandalet','çizme','cizme']::text[]),
    ('moda/erkek-ayakkabi/bot', ARRAY['erkek bot','erkek cizme','bot ayakkabi','cizme ayakkabi','erkek kis ayakkabi','bot modasi','erkek ayakkabi cizme']::text[]),
    ('moda/erkek-ayakkabi/klasik', ARRAY['klasik erkek ayakkabi','erkek klasik ayakkabi','deri ayakkabi','erkek deri ayakkabi','klasik modasi','erkek ayakkabi klasik']::text[]),
    ('moda/erkek-ayakkabi/sneaker', ARRAY['erkek sneaker','erkek spor ayakkabi','sneaker ayakkabi','spor ayakkabi','erkek spor giyim','sneaker modasi','erkek ayakkabi modasi']::text[]),
    ('moda/erkek-giyim', ARRAY['erkek giyim','gömlek','gomlek','pantolon','tişört','tisort','erkek ceket','takım elbise','takim elbise','erkek kazak']::text[]),
    ('moda/erkek-giyim/alt', ARRAY['erkek pantolon','erkek jean','erkek esofman','erkek şort']::text[]),
    ('moda/erkek-giyim/dis-giyim', ARRAY['erkek dış giyim','erkek ceket','erkek palto','erkek mont','erkek kaban','erkek yelek','erkek hırka']::text[]),
    ('moda/erkek-giyim/esofman', ARRAY['erkek eşofman','erkek spor giyim','erkek jogging','erkek sweatshirt','erkek hoodie','erkek spor pantolon']::text[]),
    ('moda/erkek-giyim/takim-elbise', ARRAY['erkek takım elbise','smokin','frak','erkek resmi elbise','erkek düğün elbisesi','erkek iş elbisesi']::text[]),
    ('moda/erkek-giyim/ust', ARRAY['erkek tisort','erkek tişört','erkek gomlek','erkek gömlek','erkek kazak','erkek sweatshirt','erkek polo']::text[]),
    ('moda/kadin-ayakkabi', ARRAY['kadın ayakkabı','kadin ayakkabi','topuklu ayakkabı','topuklu ayakkabi','spor ayakkabı','spor ayakkabi','babet','sandalet','çizme','cizme']::text[]),
    ('moda/kadin-ayakkabi/babet', ARRAY['kadın babet','kadın topuklu babet','kadın düz babet','kadın yüksek babet','kadın alçak babet','kadın geniş babet']::text[]),
    ('moda/kadin-ayakkabi/bot', ARRAY['kadın bot','kadın çizme','kadın kış botu','kadın bahar botu','kadın yaz botu','kadın su botu']::text[]),
    ('moda/kadin-ayakkabi/sandalet', ARRAY['kadın sandalet','kadın terlik','kadın plaj ayakkabısı','kadın yaz ayakkabısı','kadın açık ayakkabı','kadınToe ring']::text[]),
    ('moda/kadin-ayakkabi/sneaker', ARRAY['kadın sneaker','kadın spor ayakkabı','kadın koşu ayakkabısı','kadın basketbol ayakkabısı','kadın futbol ayakkabısı','kadın tenis ayakkabısı']::text[]),
    ('moda/kadin-ayakkabi/topuklu', ARRAY['kadın topuklu ayakkabı','kadın yüksek topuklu','kadın alçak topuklu','kadın geniş topuklu','kadın dar topuklu','kadın topuklu sandalet']::text[]),
    ('moda/kadin-giyim', ARRAY['kadın giyim','kadin giyim','elbise','etek','pantolon','bluz','kadın ceket','kadin ceket','kadın kazak','kadin kazak']::text[]),
    ('moda/kadin-giyim/alt', ARRAY['kadin pantolon','kadın pantolon','kadin jean','kadin tayt']::text[]),
    ('moda/kadin-giyim/dis-giyim', ARRAY['kadın dış giyim','kadin dis giyim','mont','palto','kaban','kadın ceket','kadin ceket','kadın pantolon','kadin pantolon']::text[]),
    ('moda/kadin-giyim/elbise', ARRAY['kadin elbise','kadın elbise','abiye']::text[]),
    ('moda/kadin-giyim/etek', ARRAY['kadın etek','kadin etek','çiçek etek','cicek etek','kısa etek','kisa etek','uzun etek']::text[]),
    ('moda/kadin-giyim/ic-giyim', ARRAY['iç giyim','ic giyim','pijama','kadin pijama','kadın iç çamaşırı','kadin ic camasiri','kadın külot','kadin kulot','kadın sütyen','kadin sutyen']::text[]),
    ('moda/kadin-giyim/ust', ARRAY['kadin tisort','kadın tişört','kadin bluz','kadın bluz','kadin gomlek','bayan tisort','bayan bluz']::text[]),
    ('otomotiv', ARRAY['oto aksesuar','araç bakım','arac bakim','oto yedek parça','oto yedek parca','lastik','jant']::text[]),
    ('otomotiv/arac-aksesuar', ARRAY['arac kılıfı','arac kılıfi','direksiyon kılıfı','direksiyon kılıfi','arac çantası','arac cantasi','arac aksesuarı','arac aksesuari']::text[]),
    ('otomotiv/arac-elektronigi', ARRAY['arac navigasyon','arac navigasyonu','arac kamerası','arac kamerasi','arac radarı','arac radari','arac ses sistemi','arac ses sitemi']::text[]),
    ('otomotiv/lastik-jant', ARRAY['lastik','oto lastik','araba lastiği','araba lastigi','jant','çelik jant','celik jant','kış lastiği','kis lastigi']::text[]),
    ('otomotiv/motor-scooter', ARRAY['motor','scooter','motorsiklet','motor aksesuarı','scooter aksesuarı','motor bakımı','motorsiklet parçaları']::text[]),
    ('otomotiv/motor-yagi-bakim', ARRAY['motor yağı','motor bakımı','araba bakımı','oto bakım','motor yağları','araba yağları','oto bakım ürünleri']::text[]),
    ('otomotiv/navigasyon', ARRAY['gps','navigasyon','harita','rota bulma','gps cihazları','navigasyon sistemleri','harita yazılımı']::text[]),
    ('otomotiv/oto-aku', ARRAY['oto aku','oto akü','araba aku','araba akü','akü seti','akü şarj','oto aku şarj']::text[]),
    ('otomotiv/oto-yedek-parca', ARRAY['oto yedek parça','oto yedek parçaları','araba yedek parça','araba yedek parçaları','yedek parça seti','oto parça','oto parçaları']::text[]),
    ('otomotiv/teyp-multimedya', ARRAY['teyp','multimedya','oto teyp','oto multimedya','araba teyp','araba multimedya','oto ses sistemi','oto müzik sistemi']::text[]),
    ('pet-shop', ARRAY['pet maması','pet aksesuarı','kedi maması','köpek maması','pet ürünleri','hayvan bakımı','pet malzemesi']::text[]),
    ('pet-shop/aksesuar', ARRAY['pet aksesuarı','pet aksesuari','tasma','mama kabı','mama kabi','su kabı','su kabi','kedi tuvaleti']::text[]),
    ('pet-shop/akvaryum', ARRAY['akvaryum','balık yemi','balik yemi','akvaryum filtresi','akvaryum motoru','akvaryum ısıtıcısı','akvaryum isiticisi','akvaryum dekoru']::text[]),
    ('pet-shop/bakim-hijyen', ARRAY['pet bakımı','pet bakimi','kedi şampuanı','kedi sampuani','köpek şampuanı','kopek sampuani','tüy fırçası','tuy fircasi']::text[]),
    ('pet-shop/diger', ARRAY['kemirgen yemi','sürüngen yemi','surungen yemi','balık yemi','balik yemi','hamster kafesi','kaplumbağa yemi','kaplumbaga yemi']::text[]),
    ('pet-shop/kedi', ARRAY['kedi maması','kedi mamasi','kedi kumu','kedi yatağı','kedi yatagi','tırmalama tahtası','tirmalama tahtasi','kedi oyuncağı','kedi oyuncagi']::text[]),
    ('pet-shop/kedi/kum', ARRAY['kedi kumu']::text[]),
    ('pet-shop/kedi/mama', ARRAY['kedi mamasi','kedi maması']::text[]),
    ('pet-shop/kopek', ARRAY['köpek maması','kopek mamasi','köpek tasması','kopek tasmasi','köpek yatağı','kopek yatagi','köpek oyuncağı','kopek oyuncagi','köpek kulübesi','kopek kulubesi']::text[]),
    ('pet-shop/kopek/mama', ARRAY['kopek mamasi','köpek maması']::text[]),
    ('pet-shop/kus', ARRAY['kuş yemi','kus yemi','kuş kafesi','kus kafesi','kuş oyuncakları','kus oyuncaklari','kuş kumu','kus kumu']::text[]),
    ('saglik-vitamin', ARRAY['vitamin','takviye edici gıda','takviye edici gida','mineral','besin takviyesi','sağlık ürünleri','saglik urunleri','bitkisel takviye']::text[]),
    ('saglik-vitamin/bitkisel', ARRAY['bitkisel çay','bitkisel cay','ginseng','ginkgo biloba','ekinacea','ekinezya','zencefil','zencefil çayı']::text[]),
    ('saglik-vitamin/spor-besin', ARRAY['protein tozu','protein tozi','kreatin','kreatin tozu','kreatin tozi','bcaa','glutamin','glutamine']::text[]),
    ('saglik-vitamin/vitamin-mineral', ARRAY['c vitamini','c vitamin','d vitamini','d vitamin','kalsiyum','kalsiyum tozu','kalsiyum tozi','demir']::text[]),
    ('siniflandirilmamis', ARRAY['diğer','çeşitli','karışık','siniflandirilmamis','sınıflandırılmamış','genel','farklı']::text[]),
    ('spor-outdoor', ARRAY['spor malzemeleri','outdoor ekipmanları','outdoor ekipmanlari','kamp malzemeleri','fitness','koşu','kosu','bisiklet']::text[]),
    ('spor-outdoor/bisiklet', ARRAY['dağ bisikleti','dag bisikleti','şehir bisikleti','sehir bisikleti','çocuk bisikleti','cocuk bisikleti','yol bisikleti','bisiklet kaskı','bisiklet kaski','bisiklet aksesuarları','bisiklet aksesuarlari']::text[]),
    ('spor-outdoor/fitness', ARRAY['koşu bandı','kosu bandi','eliptik bisiklet','ağırlık seti','agirlik seti','dambıl','dambil','pilates topu','yoga matı','yoga mati']::text[]),
    ('spor-outdoor/kamp', ARRAY['kamp çadırı','kamp cadiri','uyku tulumu','kamp sandalyesi','kamp masası','kamp masasi','termos','fener','kamp ocağı','kamp ocagi']::text[]),
    ('spor-outdoor/scooter', ARRAY['elektrikli scooter','e-scooter','çocuk scooterı','cocuk scooteri','katlanabilir scooter','katlanabilir scooteri','scooter yedek parça','scooter yedek parca','scooter kaskı','scooter kaski']::text[]),
    ('spor-outdoor/spor-cantasi', ARRAY['spor cantasi','gym cantasi','fitness cantasi','antrenman cantasi']::text[]),
    ('spor-outdoor/su-sporlari', ARRAY['dalış maskesi','dalis maskesi','şnorkel','snorkel','yüzme gözlüğü','yuzme gozlugu','sünger','sunger']::text[]),
    ('spor-outdoor/takim-sporlari', ARRAY['futbol topu','basketbol topu','voleybol filesi','hentbol','hentbol topu','ragbi topu','ragbi']::text[]),
    ('spor-outdoor/yoga-pilates', ARRAY['yoga matı','yoga mati','pilates aleti','pilates aletleri','meditasyon minderi','yoga bloğu','yoga blok']::text[]),
    ('supermarket', ARRAY['gida','içecek','temizlik ürünleri','kişisel bakım','süt ürünleri','et ürünleri','meyve sebze']::text[]),
    ('supermarket/atistirmalik', ARRAY['atıştırmalık','çikolata','atistirmalik','cikolata','çikolatalı ürünler','atıştırmalık ürünler','çikolata çeşitleri','atistirmalik çeşitleri']::text[]),
    ('supermarket/bakliyat-makarna', ARRAY['bakliyat','makarna','bakliyat çeşitleri','makarna çeşitleri','pirinç','makarna seti','bakliyat seti','arpa']::text[]),
    ('supermarket/dondurma-tatli', ARRAY['dondurma','tatlı','dondurma çeşitleri','tatlı çeşitleri','şekerleme','dondurma seti','tatlı seti','pastane ürünleri']::text[]),
    ('supermarket/icecek', ARRAY['icecek','mesrubat','soda','gazoz','kola']::text[]),
    ('supermarket/kahvalti-kahve', ARRAY['kahvaltı','kahve','kahvaltı ürünleri','kahve çeşitleri','çay','kahvaltı seti','kahve seti','kahvaltı kahvesi']::text[]),
    ('supermarket/kahve', ARRAY['kahve','turk kahvesi','filtre kahve','espresso','cekirdek kahve','granul kahve']::text[]),
    ('supermarket/konserve-sos', ARRAY['konserve','salça','salca','ketçap','ketcap','mayonez','turşu','tursu','makarna sosu']::text[]),
    ('yapi-market', ARRAY['inşaat malzemesi','yapı malzemeleri','dekorasyon malzemesi','bahçe malzemesi','hırdavat','yapı malzemeler']::text[]),
    ('yapi-market/boya', ARRAY['boya','iç cephe boyası','ic cephe boyasi','dış cephe boyası','dis cephe boyasi','astar','fırça','firca','rulo','vernik']::text[]),
    ('yapi-market/el-aletleri', ARRAY['el aletleri','tornavida','pense','anahtar','çekiç','cekic','testere','maket bıçağı','maket bicagi']::text[]),
    ('yapi-market/elektrik', ARRAY['elektrik malzeme','kablo','priz','anahtar','sigorta','duy','ampul','led ampul','uzatma kablosu']::text[]),
    ('yapi-market/elektrikli-aletler', ARRAY['elektrikli aletler','matkap','dekupaj testere','taşlama','taslama','zımpara','zimpara','darbeli matkap']::text[]),
    ('yapi-market/hirdavat', ARRAY['hırdavat','hirdavat','vida','somun','pul','dübel','dubel','çivi','civi','menteşe','mentese']::text[]),
    ('yapi-market/olcum', ARRAY['ölçüm aletleri','olcum aletleri','metre','lazer metre','şerit metre','serit metre','su terazisi','kumpas']::text[]),
    ('yapi-market/su-tesisati', ARRAY['su tesisatı','su tesisati','musluk','batarya','boru','vana','sifon','fittings']::text[])
)
UPDATE categories AS c
SET keywords = nk.kw
FROM new_keywords nk
WHERE c.slug = nk.slug
  AND (c.keywords IS NULL OR cardinality(c.keywords) = 0);

-- Step 2: GIN index (array contains performans icin)
CREATE INDEX IF NOT EXISTS idx_categories_keywords_gin
ON categories USING GIN (keywords);

-- Step 3: Self-verify
DO $$
DECLARE
  total_count INT;
  null_count INT;
  filled_count INT;
BEGIN
  SELECT COUNT(*) INTO total_count FROM categories;
  SELECT COUNT(*) INTO null_count FROM categories
   WHERE keywords IS NULL OR cardinality(keywords) = 0;
  filled_count := total_count - null_count;

  RAISE NOTICE 'Migration 029: %/% kategori filled', filled_count, total_count;

  IF null_count > 0 THEN
    RAISE WARNING 'Migration 029: % kategori hala NULL/empty', null_count;
  ELSIF filled_count <> 216 THEN
    RAISE WARNING 'Migration 029: filled count beklenmedik: % (216 hedef)', filled_count;
  ELSE
    RAISE NOTICE 'Migration 029: OK 216/216';
  END IF;
END $$;

COMMIT;
