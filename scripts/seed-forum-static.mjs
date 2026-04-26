/**
 * Forum seed - STATIK icerik (Gemini yok)
 *
 * 21 topic + 84 cevap = 105 kayit
 * Idempotent: ayni title varsa orphan repair
 *
 * Kullanim:
 *   npx tsx scripts/seed-forum-static.mjs
 *
 * Sifirlama:
 *   DELETE FROM topic_answers WHERE user_id IS NULL;
 *   DELETE FROM topics WHERE user_id IS NULL;
 */

import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// -----------------------------------------------------
// TOPIC + CEVAP DATASI
// -----------------------------------------------------

const SEED_DATA = [
  {
    category: 'akilli-telefon',
    topic: {
      author: 'ahmet_demir',
      title: '40 bin TL bütçeyle iPhone mu Samsung mu daha mantıklı?',
      body: 'Telefonum 4 yıl oldu, yenilemem gerek. iPhone 15 ile S24 arasında kararsızım. Hem fotoğraf çekiyorum hem oyun oynuyorum, hangisi uzun vadede daha iyi yatırım sizce?',
    },
    answers: [
      { author: 'hakan_demirci', body: 'S24 alırım yerinde olsam. AnTuTu skoru daha yüksek, oyun performansı belirgin önde. Ekran 120Hz LTPO, animasyonlar buz gibi akıyor. iPhone 15 hâlâ 60Hz, 2024\'te kabul edilemez.' },
      { author: 'mehmet_tekin', body: 'iPhone tarafına geçiyorum 2018\'den beri, hiç pişman olmadım. 5-6 yıl sorunsuz gidiyor, ikinci el değeri çok yüksek. S24 2 yılda yarı fiyatına düşer, iPhone değer kaybetmez.' },
      { author: 'merve_yilmaz', body: 'Fotoğraf öncelikli ise iPhone 15 Pro\'yu da düşün. Ana kamera ve portre modu Samsung\'tan daha doğal renkler veriyor. Ben sosyal medya için iPhone kullanıyorum, paylaşımlar daha temiz çıkıyor.' },
      { author: 'elif_sahin', body: 'Bu paraya Pixel 8 baksana, çok az Türkiye\'de bilinir ama kamera bu fiyat segmentinde efsane. Yurtdışından getirten arkadaşlar var, çok memnunlar.' },
    ],
  },
  {
    category: 'kulaklik',
    topic: {
      author: 'yasemin_oz',
      title: 'Spor yaparken kulaktan düşmeyen kablosuz kulaklık önerisi?',
      body: 'Koşu ve fitness yapıyorum, kulaklığım sürekli düşüyor. AirPods Pro denedim olmadı. Powerbeats Pro veya Jabra Elite 8 Active gibi spora özel modelleri olan var mı? 5000 TL bütçem var.',
    },
    answers: [
      { author: 'hakan_demirci', body: 'Powerbeats Pro 2. nesil dedirtir, kulağa kanca takılı, koşarken bile yerinde duruyor. Sadece bataryası 9 saat, antrenman için fazlasıyla yeter. Ses de Beats karakteri, basları seviyorsan ideal.' },
      { author: 'merve_yilmaz', body: 'Jabra Elite 8 Active aldım 6 ay önce, IP68 sertifikalı yani teri direkt yıkayabiliyorum. ANC de iyi, salonda müzik dinlerken dış sesi kapatıyor. Powerbeats\'ten daha şık dururumda.' },
      { author: 'elif_sahin', body: 'Soundpeats Air4 Pro 1500 TL\'ye geliyor, ben aldım gayet iyi. Düşmüyor da çok hızlı koşarken, normal koşuda sıfır sorun. Bu fiyata bence çok iyi alternatif.' },
      { author: 'oguz_bilgin', body: 'Antrenman için ayrı, normal kullanım için ayrı kulaklık almak daha mantıklı. Spor için ucuz dayanıklı bir model al, premium\'u günlük için sakla. Her ikisini de iyi yapan model çok az.' },
    ],
  },
  {
    category: 'akilli-saat',
    topic: {
      author: 'yasemin_oz',
      title: 'Apple Watch SE mi Galaxy Watch 6 mı? iPhone kullanıyorum',
      body: 'iPhone 13 kullanıcısıyım, akıllı saat almak istiyorum. Apple Watch SE ile Galaxy Watch 6 fiyatları yakın ama Watch 6 spec olarak daha üstün gibi. Apple ekosistemi avantajı bu farkı kapatır mı?',
    },
    answers: [
      { author: 'mehmet_tekin', body: 'iPhone\'la kullanacaksan Apple Watch tek seçenek. Galaxy Watch iOS\'la bağlanır ama özelliklerin yarısı çalışmaz. Mesaj cevaplama, Apple Pay, akış senkronizasyonu hep yarım kalır. SE yeterli, Series\'e gerek yok.' },
      { author: 'hakan_demirci', body: 'Galaxy Watch 6\'nın iPhone\'da çalışmaması bilinen bir gerçek. Sağlık özellikleri çoğu kapanır, Samsung Health iOS\'ta zayıf. Sırf saat olarak alacaksan tamam ama akıllı saat değil o zaman.' },
      { author: 'ahmet_demir', body: 'SE yerine ikinci el Series 7 baksana. 5500-6500 bandında temiz örnekler var, always-on display SE\'de yok ama Series\'te var. EKG de işine yarar.' },
      { author: 'elif_sahin', body: 'Bütçe sınırlıysa SE de fazlasıyla yeter, fitness, bildirim, Siri hepsi çalışıyor. Ben 2 yıldır SE 1. nesil kullanıyorum, hâlâ destek alıyor watchOS güncellemeleri ile.' },
    ],
  },
  {
    category: 'powerbank',
    topic: {
      author: 'oguz_bilgin',
      title: 'Uçak yolculuğunda yasaklanmayan powerbank kapasitesi nedir?',
      body: 'Yurt dışına gideceğim, ailecek 4 kişi telefonlarımız sürekli şarjda. Hangi kapasiteyi alırsam uçakta sorun çıkmaz? 20000 mAh okuduğum kadarıyla sınırda kalıyor. Anker ve Xiaomi karşılaştırması da merak ediyorum.',
    },
    answers: [
      { author: 'mehmet_tekin', body: 'Genel kural 100Wh altı serbest, yani 27000 mAh civarı. Çoğu havayolu 20000 mAh problemsiz alıyor el bagajına. Ama 30000 mAh üstüne dikkat, bazı şirketler reddedebilir. Ben her zaman 20000 mAh tercih ediyorum.' },
      { author: 'ahmet_demir', body: 'Anker 537 (PowerCore 26800) hem kapasite hem kalite açısından sektör lideri. 65W PD, MacBook bile şarj eder. Xiaomi\'nin 20000 mAh\'lik 50W modeli daha ucuz ama Anker\'in QC ve dayanıklılığı bambaşka.' },
      { author: 'oguz_bilgin', body: 'Aile için bence iki tane 10000 mAh almak daha pratik. Hem ayrı ayrı taşırsınız hem birinin ömrü biterse diğeri kullanılır. Anker Nano 10000 PD 30W yeterince hızlı.' },
      { author: 'elif_sahin', body: 'Xiaomi Mi Power Bank 3 Pro 20000 mAh aldım 1200 TL\'ye, bir yıldır kullanıyorum sıfır sorun. Anker fiyatının yarısı. Premium hissi yok ama işini görüyor, uçak yolculuklarında problem olmadı.' },
    ],
  },
  {
    category: 'laptop',
    topic: {
      author: 'ahmet_demir',
      title: '35 bin TL bütçeyle yazılım geliştirici için laptop önerisi',
      body: 'Backend developer olarak çalışacağım, Docker + IntelliJ + Chrome + birkaç Postman tab\'ı sürekli açık. RAM 16GB minimum, 32GB ideal. SSD 1TB. Hangi modeli alalım? MacBook Air mi yoksa Windows laptop mu?',
    },
    answers: [
      { author: 'hakan_demirci', body: 'MacBook Air M3 16GB/512GB tam bu fiyatta. Performans/batarya/sessizlik üçlüsü Windows tarafında yok. Docker ARM uyumluluğu artık çok iyi, Rosetta da arka planda hallediyor. Tek dezavantaj 16GB RAM, Air\'de upgrade edemiyorsun.' },
      { author: 'mehmet_tekin', body: 'Lenovo ThinkPad T14 Gen 4 al, 32GB RAM 1TB SSD bu fiyatlara denk geliyor. Klavye dünyanın en iyisi, yıllarca dayanır. Linux dual boot kuracaksan ThinkPad\'in driver desteği MacBook\'tan iyi.' },
      { author: 'oguz_bilgin', body: 'ASUS ZenBook 14 OLED da bakılır, AMD Ryzen 7 7840U 32GB RAM aynı fiyatta. OLED ekran kod yazarken göze çok iyi geliyor. Apple ekosistemine bağlı değilsen daha mantıklı bir tercih.' },
      { author: 'serkan_yildiz', body: 'Bence MacBook tarafına geç bir kere, geri dönmezsin. Ben 2017\'den beri Mac kullanıyorum, terminal experience, brew, üretkenlik bambaşka. Windows\'ta WSL ile aynı şeyi yapsan da yapay duruyor.' },
    ],
  },
  {
    category: 'tablet',
    topic: {
      author: 'merve_yilmaz',
      title: 'Üniversite dersleri için iPad mi Galaxy Tab mı?',
      body: 'Tıp fakültesi 2. sınıfım, slaytlar üzerine not almak için tablet alacağım. Apple Pencil deneyimi efsane diyorlar ama Galaxy Tab S9 FE çok daha uygun fiyatlı. Hangisi daha mantıklı?',
    },
    answers: [
      { author: 'hakan_demirci', body: 'iPad 10. nesil + Apple Pencil 1. nesil tam bu iş için. Notability veya GoodNotes ile not almak kağıt kalem hissini en iyi veriyor. Galaxy Tab S Pen dahil olsa da yazılım ekosistemi iPad\'in arkasında.' },
      { author: 'elif_sahin', body: 'Galaxy Tab S9 FE 5G\'yi kullanıyorum 1 yıldır. S Pen kutudan çıkıyor, ekstra para vermedim. Samsung Notes da fena değil. iPad\'in 1.5 katı para zaten, öğrenciye lüks olur.' },
      { author: 'merve_yilmaz', body: 'iPad Air baktın mı? 11 inç güzel boyut, M2 chip yıllarca güncel kalır. Pencil 2 cazip, manyetik şarj ve çift dokunma jest desteği var. Tıpta anatomik atlas uygulamaları daha iyi çalışıyor iPad\'de.' },
      { author: 'mehmet_tekin', body: 'iPad al gözün arkada kalmasın. 6-7 yıl sorunsuz kullanırsın, kız kardeşine devredebilirsin sonra. Samsung tablet 3 yıl sonra ağırlaşır, güncellemeler kesilir. Apple\'ın uzun vadeli desteği bu noktada çok önemli.' },
    ],
  },
  {
    category: 'mouse',
    topic: {
      author: 'hakan_demirci',
      title: 'FPS oyunları için kablosuz gaming mouse önerisi',
      body: 'Valorant ve CS2 ağırlıklı oynuyorum, mevcut mouse\'um kablolu çok rahatsız ediyor. Logitech G Pro X Superlight 2 ile Razer Viper V3 Pro arasındayım. Hangisi tercih edilir? 4-5 bin TL bütçe.',
    },
    answers: [
      { author: 'hakan_demirci', body: 'GPX Superlight 2\'yi 6 aydır kullanıyorum, profesyoneller arasında neden bu kadar popüler anladım. 60g ağırlık, HERO 2 sensörü, 8000Hz polling. Tek minus boş hissi, ergonomik tutuş istiyorsan Viper V3 Pro daha rahat.' },
      { author: 'ahmet_demir', body: 'Razer Viper V3 Pro 4000Hz wireless dongle ile geliyor, GPX 2 sadece 8000Hz dongle ayrı satılıyor (~150 dolar ek). Hesaplı bakınca Razer daha iyi paket. Sensör ikisinde de eşit kalitede.' },
      { author: 'oguz_bilgin', body: 'Bu paraya Pulsar X2V2 Mini de iyi alternatif, 50g civarı, sensörü de PAW3395. GPX/Viper\'ın yarı fiyatına benzer performans. Yarış amatör seviyede ise gerçekten fark hissedilmez.' },
      { author: 'elif_sahin', body: 'Logitech G304 al 800 TL\'ye, ben competitive Valo oynuyorum 100kg üzeri rank. Pahalı mouse fark hissi placebo, gerçek fark sensorde değil oyuncuda. Para boş gider boyle premium\'a.' },
    ],
  },
  {
    category: 'klavye',
    topic: {
      author: 'hakan_demirci',
      title: 'Mekanik klavye yeni başlayan için switch önerisi - red, brown, blue?',
      body: 'İlk mekanik klavyemi alıyorum, Keychron K8 Pro\'da kafam karıştı. Red linear, Brown tactile, Blue clicky açıklamalarını okudum ama hiç deneme şansım yok. Hem yazılım yazıyorum hem oyun oynuyorum, hangisi mantıklı?',
    },
    answers: [
      { author: 'hakan_demirci', body: 'Browns ideal hibrit, hem oyun hem yazı için. Red\'ler oyun odaklı, geri bildirim az, klavyede kaydığını hissedersin. Blue\'lar saat gibi ses çıkarıyor, ofiste kıyamet kopar. Browns\'a 2 yıldır kullanıyorum, asla geri dönmem.' },
      { author: 'ahmet_demir', body: 'Switch tercihi tamamen kişisel, mağazada deneme yapmadan al/değiştir riski büyük. Keychron\'un hot-swappable modelini al, 200 TL ekstra ödersin ama istediğin zaman switch değiştirebilirsin. Sonra Gateron Yellow, Akko V3 Pro denersin.' },
      { author: 'serkan_yildiz', body: 'Blue switch öneririm gerçekten. Eski IBM Model M klavyelerden geliyorum, klick sesi yazma motivasyonunu artırıyor. Evde yalnız çalışıyorsan en güzeli o. Yan komşu yoksa Cherry MX Blue\'dan vazgeçemezsin.' },
      { author: 'merve_yilmaz', body: 'Eğer apartmanda yaşıyorsan ve geç saatlere kadar yazıyorsan silent red switch düşün. Linear ama membran kadar sessiz. Ben Razer BlackWidow V4 silent kullanıyorum, eşim yan odada uyuyor zerre rahatsız olmuyor.' },
    ],
  },
  {
    category: 'televizyon',
    topic: {
      author: 'mehmet_tekin',
      title: 'Salon için 65 inç OLED mi QLED mi? PS5 ve Netflix ağırlıklı',
      body: 'Eski 50 inç LED\'imi yenilemek istiyorum, salon iyi karanlık olmuyor gündüz güneş alıyor. LG C3 ile Samsung QN90C arasında kararsızım. Burn-in OLED konusu hâlâ geçerli mi?',
    },
    answers: [
      { author: 'serkan_yildiz', body: 'Samsung QN90C tercih ederim güneş alan salonda. OLED siyahları efsane ama parlaklık QLED\'in arkasında, gündüz görüntü soluklaşır. QN90C 2000 nit civarı, OLED 800 nit. Ayrıca burn-in \'yok\' demiyorlar ama riskli.' },
      { author: 'hakan_demirci', body: 'PS5 sahibiysen mutlaka OLED git. C3 4 HDMI 2.1 portu ile geliyor, 120Hz/VRR/ALLM hepsi çalışıyor. Game mode latency 10ms civarı, QLED bu seviyede değil. Burn-in 2024 panelde 5-7 yılda problem olmaz, üretici zaten 5 yıl garanti veriyor.' },
      { author: 'ahmet_demir', body: 'TCL C805 baktın mı? Mini-LED teknolojisi, QN90C\'nin yarı fiyatına benzer parlaklık. Türkiye\'de yeni geldi, fiyat-performans canavarı. OLED\'e en yakın siyah tonlarını veren LCD bence.' },
      { author: 'oguz_bilgin', body: 'C3 al pişman olmazsın, ben C2 aldım 2 yıl önce hâlâ ilk gün gibi. Salon perde varsa burn-in hiç olmuyor. CNN+ haber kanalı sürekli açık değil ise sıfır risk. PS5 grafikleri OLED\'de bambaşka deneyim.' },
    ],
  },
  {
    category: 'hoparlor',
    topic: {
      author: 'oguz_bilgin',
      title: 'Salon için bluetooth hoparlör - JBL mi Bose mu Sonos mu?',
      body: 'Salon 30 m², parti yapmıyoruz ama film izlerken arka plan müzik veya hafta sonu kahvaltıda müzik açıyoruz. JBL Boombox 3 ile Bose SoundLink Max arasındayım, Sonos Move 2 de gözüm. Hangisi salon için ideal?',
    },
    answers: [
      { author: 'mehmet_tekin', body: 'Sonos Move 2 al, Wi-Fi\'a bağlanıyor multi-room sistem kuruyorsun gelecekte. Pil de var dışarıya alınır. JBL/Bose sadece bluetooth, salon kullanımı için Wi-Fi avantajı çok büyük. Ses kalitesi de Sonos en dengelisi.' },
      { author: 'merve_yilmaz', body: 'Bose SoundLink Max\'in ses kalitesi gerçekten farklı, vokal netliği üst seviye. Salonda akşam ışıkları kapatıp jazz dinlerken büyülü oluyor. JBL Boombox basları çok abartı, salon için aşırı.' },
      { author: 'hakan_demirci', body: 'JBL Boombox 3 pil 24 saat, dış mekana götürüyorsan kazandı. Ama salon sabit kullanım için Sonos Era 100 önerim, fiyat aynı bandda ama Wi-Fi + AirPlay 2 + Spotify Connect doğrudan çalışıyor. Telefondan bağımsız müzik akışı.' },
      { author: 'elif_sahin', body: 'Bu paraya Marshall Stanmore III bakar mıydın? Klasik tasarım, 80W çıkış, salonda çok şık duruyor. Bluetooth + RCA + 3.5mm jack hepsi var. Eski plak çalar bağlamak istersen bonus.' },
    ],
  },
  {
    category: 'oyun-konsol',
    topic: {
      author: 'hakan_demirci',
      title: 'PS5 Slim mi Pro mu? 4K TV\'m yok şu an',
      body: 'Konsola yeni geçeceğim PC\'den, 1080p 120Hz monitörüm var. Slim 28 bin Pro 50 bin civarında. Pro\'nun PSSR upscaling avantajı 1080p\'de hissedilir mi yoksa Slim mi yeter?',
    },
    answers: [
      { author: 'hakan_demirci', body: '1080p kullanıyorsan Slim al kesinlikle. Pro\'nun en büyük avantajı 4K performans modu, 1080p\'de fark yok denecek kadar az. 22 bin TL fark var, oyun + DualSense Edge alırsın bu parayla.' },
      { author: 'ahmet_demir', body: 'Pro\'nun SSD\'si Slim ile aynı 1TB ama yükleme süreleri biraz daha hızlı. CPU aynı sadece GPU güçlendirilmiş. 4K\'ya geçmeyecek isen kesinlikle paranın israf olur.' },
      { author: 'oguz_bilgin', body: 'Çocuklarım PS5 ile FIFA oynuyor, Slim 2 yıldır kusursuz. Pro çıktığından beri 60Hz oyunlarda fark olduğunu söyleyenler var ama gerçek fark 4K HDR TV\'de görünüyor. 1080p ekosistemde Slim yeter.' },
      { author: 'serkan_yildiz', body: 'Slim al, kazandığın parayla iyi bir oyun kütüphanesi yapılır. PS Plus Extra üyeliği 1 yıllık + 4-5 AAA oyun gelir o farka. Oyunu hayatına katacak yatırım, donanım değil.' },
    ],
  },
  {
    category: 'buzdolabi',
    topic: {
      author: 'zeynep_k',
      title: '4 kişilik aile için no-frost gardrop buzdolabı önerisi',
      body: 'Buzdolabımız 12 yaşında, sürekli problem çıkarıyor. 4 kişilik aileyiz, bir tane bebek var (bol süt + meyve püresi saklıyoruz). Bosch KGN56 ile Beko 670600 arasında kararsızım. Türkiye servisi kim daha iyi?',
    },
    answers: [
      { author: 'mehmet_tekin', body: 'Beko Türkiye\'de servis ağı tartışmasız en güçlüsü. Köyde bile teknisyen geliyor. Bosch kalite olarak öndedir ama yedek parça gelene kadar haftalar geçer. Ailecek günlük kullanım, Beko 670600 al pişman olmazsın.' },
      { author: 'oguz_bilgin', body: 'Bizim Bosch KGN56 6 yaşında, hiç servise çağırmadım. Sessiz çalışıyor, mutfakta gece bile rahatsız etmiyor. Beko\'nun motoru sesli, akşam misafirde fark ediliyor. Servis sıkıntısı zaten arızalanmıyor pek.' },
      { author: 'zeynep_k', body: 'Bebek varsa NoFrost şart, manuel def\'l\'eme bebek mama saklanan dolapta felaket. Ayrıca enerji A++ tercih et, faturada gerçek fark yapıyor. Bosch ve Beko\'nun A++ modelleri var ikisi de.' },
      { author: 'serkan_yildiz', body: 'Arçelik 270560 EI\'yı sevdik biz, 2 sene oldu. Ankastre değil ama görünümü öyle. NoFrost, A++, sessiz. Yerli üretim olduğu için yedek parça kolay. Türkiye dışı marka tercih etmeye gerek yok bence bu kategoride.' },
    ],
  },
  {
    category: 'camasir-makinesi',
    topic: {
      author: 'zeynep_k',
      title: 'Yünlü ve hassas kıyafetler için iyi yıkama yapan çamaşır makinesi',
      body: 'Bebeğin pamuklu giysileri, eşimin yün kazakları ve benim ipek bluzlarımı eskittik makinada. 8 kg, A enerji sınıfı, sessiz olmalı (apartman). Bosch WAU28PH9TR ve Samsung WW80T554DAW karşılaştırması yapan var mı?',
    },
    answers: [
      { author: 'merve_yilmaz', body: 'Bosch i-DOS sistemi var WAU serisinde, deterjanı otomatik dozajlıyor, hassas kıyafetlerde fazla deterjan kalıntısı sorununu çözüyor. Bu özellik gerçekten fark yaratıyor, ipek bluzlarım kararmıyor artık.' },
      { author: 'oguz_bilgin', body: 'Bizimki Samsung Bubble Wash, 5 yıldır kullanıyoruz hassas program çok iyi. Köpük çamaşıra emiliyor önce, sonra yıkıyor. Samsung\'un Türkiye yedek parça ağı geçmişe göre çok iyileşti.' },
      { author: 'zeynep_k', body: 'Bebek yıkaması için 60 derece anti-bakteriyel program şart. Bosch\'un bu programı standart, Samsung\'da bazı modellerde yok. Etiket kontrol et almadan, bebek varsa kritik bir özellik.' },
      { author: 'mehmet_tekin', body: 'Apartman için sessizlik kritik, Bosch SilentDrive motor 51 dB civarı sessizlik rekoru. Samsung 55-58 dB, akşam üst kat duyabilir. Garanti kapsamına dikkat et, motor 10 yıl garantili Bosch\'ta.' },
    ],
  },
  {
    category: 'bulasik-makinesi',
    topic: {
      author: 'oguz_bilgin',
      title: '6 kişilik aile için ankastre bulaşık makinesi önerisi',
      body: 'Yeni mutfak yenileyiştik, ankastre bulaşık makinesi alacağız. Bosch SMV4HBX01R ile Siemens SN65EX56CE arasındayım. Aralarında ne fark var? Ekran panelli üst seviye modeli almaya değer mi?',
    },
    answers: [
      { author: 'mehmet_tekin', body: 'Bosch ile Siemens aslında aynı şirket (BSH), motor ve mekanik aynı. Fark daha çok ön panel tasarımı ve birkaç özellik. Bosch SMV4 daha temel, Siemens SN65 daha donanımlı (Zeolith kurutma, ışıklı dip seviye gösterge).' },
      { author: 'zeynep_k', body: 'Bizde Bosch SMU24AS00T 4 yıldır, hiç problem çıkarmadı. 6 kişiyse 13-14 göz alın, 12 göz dar gelir. Üst sepet ayarlanabilir mi mutlaka kontrol et, derin tencereler için kritik.' },
      { author: 'serkan_yildiz', body: 'Profilo BMA 13520 X de baktın mı? Bosch ekipmanları kullanılıyor üretiminde, fiyatı yarısı. Görünüm sadelik için biraz fakir kalıyor ama performans aynı. Türkiye\'de yedek parçası da kolay.' },
      { author: 'oguz_bilgin', body: 'Ekran panelli üst modelleri pratikte fark hissetmedik biz, 3 program zaten yeterli (eko, hızlı, yoğun). Ekran 2 sene sonra yorulur, mekanik tuş daha dayanıklı. Üst modelle 5-6 bin TL fark, aile büyümediği sürece gereksiz.' },
    ],
  },
  {
    category: 'ankastre-firin',
    topic: {
      author: 'zeynep_k',
      title: 'Pastacılık için ideal ankastre fırın - Bosch HBA serisi mi yeterli?',
      body: 'Hobi olarak pastacılık yapıyorum, mevcut fırın alt-üst ısıtması dengesiz, kekler bir tarafı yanıyor. 7000 TL\'ye Bosch HBA5360S0T baktım, 12 program var. Bu seviye yeter mi yoksa ekstra ödeyip 3D Hotair olan modelleri mi tercih etmeliyim?',
    },
    answers: [
      { author: 'merve_yilmaz', body: '3D Hotair şart pastacılık için. 4 katmanı aynı anda eşit pişiriyor, normal turbo fanı yapamıyor. Bosch HBA serisi temel level, en azından HBA572 veya üzeri al, fan teknolojisi pasta için kritik.' },
      { author: 'zeynep_k', body: 'Siemens iQ500 baktın mı? activeClean kendi kendini temizliyor, pasta yapan biri için altın değerinde özellik. Bosch\'un yarısından pahalı ama 5 yıl içinde temizlik zamanlarına bakınca değer.' },
      { author: 'mehmet_tekin', body: 'Tek başına fan değil prob önemli. Etten merkeze ısı sensörü gönderen fırınlar pasta merkez sıcaklığını da ölçer. Bosch HBA serisinde prob yok, Siemens iQ700 var. Pastacı için fark ediyor.' },
      { author: 'serkan_yildiz', body: 'Eski usul gaz fırın bence bu iş için en iyisi. Elektrik fırın hava akımını çok kontrol ediyor, hamur işine fazla \'dengeli\' geliyor, klasik kıvam kaybı. Mutfakta gaz hattı varsa Beko ankastre gaz al.' },
    ],
  },
  {
    category: 'robot-supurge',
    topic: {
      author: 'zeynep_k',
      title: 'Tüy döken kedi/köpek için en iyi robot süpürge hangisi?',
      body: 'Golden retriever\'ım var, tüy felaket. Roomba i7+ topluluk\'ta öneriliyor ama 25 bin TL. Roborock S8 Pro Ultra (28 bin) ile Eufy X10 Pro Omni (18 bin) hangisi tüy konusunda daha iyi? Lazerli vs kameralı navigasyon farkı?',
    },
    answers: [
      { author: 'oguz_bilgin', body: 'Roborock S8 Pro Ultra al kesinlikle. Mop fonksiyonu da var, tüy ile beraber zemini de paspasla bitiriyor. Toz haznesi otomatik boşalıyor 60 günde bir, golden retriever tüyleri büyük problem değil. LiDAR navigasyon kameradan kat kat üstün, karanlıkta da çalışıyor.' },
      { author: 'zeynep_k', body: 'Bizde 2 kedi, Roomba i7+ aldım 1 yıl önce, fırça başında tüy düğümleniyor 2 haftada bir temizlemek gerek. Yeni nesilde bu sorun çözülmüş diyorlar (Combo j7+) ama denemedim. Roborock\'un fırça tasarımı tüy sarmıyor diyorlar, doğruysa Roborock öne geçer.' },
      { author: 'merve_yilmaz', body: 'Eufy X10 fiyat-performans olarak iyi ama tüy yoğun ev için zayıf kalır. 4000 Pa emiş Roborock\'un yarısı. Halı altı temizliği yetersiz tüylü hayvan evinde. 18 bine alıp 6 ay sonra Roborock\'a geçmek yerine bir kerede al.' },
      { author: 'ahmet_demir', body: 'Dreame L20 Ultra da bakılır, Roborock\'un %15 daha ucuzu, aynı LiDAR + mop + base station. Türkiye\'de yeni geldi, fiyat-performans olarak çok iyi konumlanmış. Yedek parça konusu test edilmedi henüz.' },
    ],
  },
  {
    category: 'kahve-makinesi',
    topic: {
      author: 'mehmet_tekin',
      title: 'Sabah espresso için tam otomatik mi yarı otomatik mi?',
      body: 'Günde 2-3 espresso içen biriyim. Delonghi Magnifica S Smart (10 bin) tam otomatik ile Gaggia Classic Pro + öğütücü kombosu (toplam 12 bin) arasında kararsızım. Sabah uzun ritüel istemiyorum ama lezzet de önemli.',
    },
    answers: [
      { author: 'mehmet_tekin', body: 'Magnifica S Smart al, ben 4 yıldır kullanıyorum. Tek butona bas, espresso geliyor 30 saniyede. Gaggia ile her sabah 3-4 dakika ritüel, çalışan biri için lüks. Lezzet farkı var ama %5-10, ritüel keyfi seven değilsen anlamsız.' },
      { author: 'serkan_yildiz', body: 'Gaggia Classic Pro + Eureka Mignon Specialita kombo gerçek espresso. Sabah 3 dakika, kahveniz markanız oluyor. Tam otomatik makinelerin öğütücü kalitesi düşük, fasülye taze değilse her şey boşa. Hobi seviyesinde kahve sevdalısı için tek seçenek.' },
      { author: 'ahmet_demir', body: 'De\'Longhi La Specialista Maestro var ortada bir model, yarı otomatik ama buharlı süt ve öğütücü entegre. Espresso eğitim videoları aşın isteyen için ideal başlangıç. 18 bin civarı ama hem hız hem kalite alıyorsun.' },
      { author: 'oguz_bilgin', body: 'Aile espresso içiyor mu? Tam otomatik aile için pratik (kullanıcı dostu). Yarı otomatik tek kişinin tutkusu, eşin kullanmak istemez. Magnifica S Smart\'ı tavsiye ederim aile dostuluk için.' },
    ],
  },
  {
    category: 'mikrodalga',
    topic: {
      author: 'elif_sahin',
      title: 'Öğrenci yurdu için kompakt mikrodalga - 700W yeter mi?',
      body: 'Yurt odasında yer kısıtlı, 20 litreye kadar olanlar uygun gibi. Sadece pizza ısıtma + spagetti pişirme + sıcak su yapma. 700W yetiyor mu yoksa 800W gerekli mi? Beko MGB 25333 X (3000 TL) ile Arçelik MD 870 (2500 TL) hangisi?',
    },
    answers: [
      { author: 'oguz_bilgin', body: '700W yeter söylediklerin için. 800W ile farkı 30 saniye-1 dakika kadar. Yurt için daha düşük güç tüketimi de avantaj, sigortayı patlatma riski az. Beko MGB 25333 X temel ihtiyacı tam karşılıyor.' },
      { author: 'elif_sahin', body: 'Bende 1 yıldır Vestel Quick Chef SD 7723 var, 600 TL\'ye almıştım indirimde. 700W, 17 litre, yurt odam için ideal. Markaya takılma bence yurtta dayanıklılık değil ucuzluk önemli, taşınma sırasında kayıp/kırılma riski var.' },
      { author: 'serkan_yildiz', body: 'İkinci el bakmak da seçenek, yurt için 1 yıllık çözüm. Sahibinden 800-1500 TL bandında temiz mikrodalgalar var. Yeni alıp mezun olunca satmak zor, ikinci el direkt 1.5 yılda amorti.' },
      { author: 'merve_yilmaz', body: 'Ankastre değil masaüstü olduğundan emin ol, yurttaki tezgah genelde dar. 30+ litre olanlar sığmaz. 17-20 litre tatlı nokta, ölçülerini şarjör yer kullanılabilir alana göre değerlendir.' },
    ],
  },
  {
    category: 'blender',
    topic: {
      author: 'yasemin_oz',
      title: 'Smoothie ve protein shake için güçlü blender - hangisi gerçek meyve eziyor?',
      body: 'Diyet yapıyorum, sabah smoothie + akşam protein shake hazırlıyorum. Donmuş meyve eziyor olmalı (muz, çilek). NutriBullet Pro 900 ile Tefal Perfect Mix arasında. Vitamix\'in 8 bin TL\'si var ama o ekstra mı?',
    },
    answers: [
      { author: 'yasemin_oz', body: 'NutriBullet Pro 900 1.5 yıldır kullanıyorum, donmuş muz/çilek 30 saniyede smoothie. Vitamix\'in 1/4\'üne aynı işi görüyor günlük tek kişilik kullanım için. Bardağı doğrudan blender\'a koyup içiyorsun, bulaşık yıkamıyorsun.' },
      { author: 'merve_yilmaz', body: 'Tefal Perfect Mix Türkiye\'de Vitamix\'e en yakın model, 1300W motor donmuş meyve hiç sorun çıkarmıyor. 5 yıl garanti, parçaları bulaşık makinasında yıkanabilir. NutriBullet kapasite olarak küçük, aile için yetmez.' },
      { author: 'oguz_bilgin', body: 'Vitamix\'i tavsiye etmem günlük smoothie için, 8 bin TL aşırı. Restoran/cafe işletiyorsan o ayrı, evdeki kullanımda 25 yıl garanti hiç kullanmazsın. NutriBullet 5 yılda eskise yenisini alırsın daha mantıklı hesap.' },
      { author: 'zeynep_k', body: 'Çocuk maması yaparken Tefal\'in cam haznesi avantaj. NutriBullet plastik, BPA-free olsa da çocuk için cam tercih ederim. Smoothie tek başına amaç değilse, çok fonksiyonlu Tefal seçmeyi düşün.' },
    ],
  },
  {
    category: 'klima',
    topic: {
      author: 'oguz_bilgin',
      title: 'Salon için 18000 BTU klima - inverter mi standart mı? Elektrik faturası kıyaslama',
      body: 'Salon 35 m², İstanbul yazları çekilmez. Mitsubishi MSZ-AP50VG inverter (32 bin) ile Daikin Sensira FTXC50C standart (22 bin) arasındayım. Inverter\'ın elektrik tasarrufu 10 bin TL farkı kapatır mı?',
    },
    answers: [
      { author: 'mehmet_tekin', body: 'Inverter kesinlikle gerekli. Standart klima sürekli açık-kapalı yapıyor, fatura uçuyor. Inverter ısı korurken düşük güçle çalışıyor. 5 yılda 10 bin TL\'yi rahat çıkarır, 10 yıl sonra çift kazanç. Mitsubishi MSZ-AP serisi sektörün referans modeli.' },
      { author: 'oguz_bilgin', body: 'İstanbul yazı için 18000 BTU az gelir 35 m²\'de, 24000 BTU bak. Klima boyutu büyük olunca düşük setpoint\'te çalışıyor, daha sessiz oluyor. Mitsubishi MSZ-LN50VG modelini önerim, 24000 BTU eşdeğeri performans veriyor.' },
      { author: 'serkan_yildiz', body: 'Daikin Sensira A++ enerji sınıfı, %30 daha düşük tüketim de iyi rakam. Inverter olmasa da yapay zeka termostat ayar yapıyor. Mitsubishi premium ama Daikin Türkiye servisi daha hızlı, montaj firmaları daha aşina.' },
      { author: 'zeynep_k', body: 'Sessizlik şart bebek varsa! Mitsubishi MSZ-AP 19 dB iç ünite, kütüphane sessizliği. Daikin Sensira 26 dB, gece açıkken bebek uyanıyor. Bizde bebek doğdu klimayı yeniledik bu yüzden, standardlardan inverter\'a geçtik fark dağ gibi.' },
    ],
  },
  {
    category: 'drone',
    topic: {
      author: 'ahmet_demir',
      title: 'DJI Mini 4 Pro mu yoksa Mini 3 mü almalıyım, hangisi daha mantıklı?',
      body: 'İlk drone alıyorum, hobi olarak doğa yürüyüşlerinde video çekeceğim. Mini 4 Pro 28 bin TL, Mini 3 (Pro değil) 18 bin TL. 10 bin TL fark obstacle avoidance ve OcuSync 4 için ödenir mi yoksa Mini 3 yeter mi?',
    },
    answers: [
      { author: 'hakan_demirci', body: 'Mini 4 Pro\'yu mutlaka tercih et. Obstacle avoidance ilk drone\'da hayat kurtarır, ağaca toslamaktan korur 28 bin TL\'lik cihazı. OcuSync 4 ile 20 km\'ye kadar bağlantı, Mini 3\'te 12 km. Doğa yürüyüşlerinde mesafe çok değerli.' },
      { author: 'ahmet_demir', body: 'Ben Mini 3\'le başladım 6 ay önce, hatasız uçuş için pratik gerekiyor. Tossladığım/kaybettiğim olmadı dikkatli olunca. 10 bin TL ile aksesuar (ND filtre, ekstra bataryalar, çanta) alırsın daha iyi yatırım. Obstacle avoidance lüks değil ama can simidi.' },
      { author: 'oguz_bilgin', body: 'Yasal kayıt ve 250g üstü drone DGM kayıt + sigorta gerektiriyor Türkiye\'de. Mini serisinin avantajı 250g altı, formaliteden muaf. Mini 4 Pro da Mini 3 de aynı 249g, bu önemli detay. Bavyera vs.\'ye götürmek istersen hem Mini\'ler büyük avantaj.' },
      { author: 'merve_yilmaz', body: 'Hobi için Mini 3 yeter, profesyonel şovreklam yapacaksan Mini 4 Pro. Vlog/Instagram için Mini 3\'ün 4K HDR videosu mükemmel, sonradan upgrade etmek istersen Mini 4 Pro\'ya geçersin. Başlangıç maliyeti düşük tutmak akıllı strateji.' },
    ],
  },
];

// -----------------------------------------------------
// MAIN
// -----------------------------------------------------

async function main() {
  console.log('Forum statik seed basliyor...');
  console.log(`Hedef: ${SEED_DATA.length} topic + ~${SEED_DATA.reduce((s, d) => s + d.answers.length, 0)} cevap\n`);

  let topicsCreated = 0;
  let topicsSkipped = 0;
  let answersCreated = 0;
  let answersSkipped = 0;
  let failures = 0;

  for (const item of SEED_DATA) {
    const { category, topic, answers } = item;
    console.log(`\n=== ${category} ===`);

    const { data: existing } = await sb
      .from('topics')
      .select('id, answer_count')
      .eq('title', topic.title)
      .maybeSingle();

    let topicId;

    if (existing) {
      topicId = existing.id;
      if ((existing.answer_count ?? 0) >= answers.length) {
        console.log(`  Skip (zaten ${existing.answer_count} cevap var)`);
        topicsSkipped++;
        continue;
      }
      console.log(`  Orphan/eksik topic, cevaplar tamamlanacak (mevcut: ${existing.answer_count ?? 0})`);
    } else {
      const topicVotes = randInt(8, 50);
      const { data: inserted, error } = await sb
        .from('topics')
        .insert({
          title: topic.title,
          body: topic.body,
          category,
          user_name: topic.author,
          user_id: null,
          votes: topicVotes,
          answer_count: 0,
          product_id: null,
          product_slug: null,
          product_title: null,
          product_brand: null,
          gender_filter: null,
        })
        .select('id')
        .single();

      if (error) {
        console.warn(`  Topic insert fail: ${error.message}`);
        failures++;
        continue;
      }

      topicId = inserted.id;
      topicsCreated++;
      console.log(`  Topic: ${topic.title.slice(0, 60)}... (${topicVotes} oy)`);
    }

    let topicNewAnswers = 0;

    for (const answer of answers) {
      const { data: existingAns } = await sb
        .from('topic_answers')
        .select('id')
        .eq('topic_id', topicId)
        .eq('body', answer.body)
        .maybeSingle();

      if (existingAns) {
        answersSkipped++;
        continue;
      }

      const ansVotes = randInt(2, 30);
      const { error } = await sb.from('topic_answers').insert({
        topic_id: topicId,
        body: answer.body,
        user_name: answer.author,
        user_id: null,
        votes: ansVotes,
        parent_id: null,
        gender: null,
      });

      if (error) {
        console.warn(`    Cevap fail: ${error.message}`);
        continue;
      }

      answersCreated++;
      topicNewAnswers++;
      console.log(`    + ${answer.author} (${ansVotes} oy)`);
    }

    if (topicNewAnswers > 0) {
      const finalCount = (existing?.answer_count ?? 0) + topicNewAnswers;
      await sb.from('topics').update({ answer_count: finalCount }).eq('id', topicId);
    }
  }

  console.log('\n=== SONUC ===');
  console.log(`Yeni topic: ${topicsCreated}`);
  console.log(`Skip topic (tamam): ${topicsSkipped}`);
  console.log(`Yeni cevap: ${answersCreated}`);
  console.log(`Skip cevap (mevcut): ${answersSkipped}`);
  console.log(`Toplam yeni mesaj: ${topicsCreated + answersCreated}`);
  console.log(`Basarisiz: ${failures}`);
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
