import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://ugnxddvbrvjyzbqxmbdr.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnbnhkZHZicnZqeXpicXhtYmRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwOTQ2OTYsImV4cCI6MjA4OTY3MDY5Nn0.ZSyfd-uONUgZ9GEfPLtPDplkeQdVLZlLiMk4Y0Nd4j0"
);

const DUMMY_USER_ID = "00000000-0000-0000-0000-000000000000";

const topics = [
  {
    user_name: "zeynep_k", category: "Elektronik", votes: 12, answer_count: 0,
    title: "5000₺ bütçeyle en iyi kablosuz kulaklık hangisi?",
    body: "Sony, Bose veya JBL arasında kaldım. Ağırlıklı müzik dinlemek ve video konferans için kullanacağım.",
  },
  {
    user_name: "ahmet_demir", category: "Spor", votes: 8, answer_count: 0,
    title: "Evde kullanım için hangi koşu bandını önerirsiniz?",
    body: "Günde 30-45 dakika kullanacağım, 10.000₺ bütçem var. Sessiz çalışması önemli.",
  },
  {
    user_name: "merve_yilmaz", category: "Kozmetik", votes: 21, answer_count: 0,
    title: "Kuru cilt için en iyi nemlendirici krem? (50₺ altı)",
    body: "Kışın çok kuruyorum özellikle yanaklar. Yağlı hissettirmeyen bir şey arıyorum.",
  },
  {
    user_name: "burak_c", category: "Elektronik", votes: 15, answer_count: 0,
    title: "MacBook Air M3 mü yoksa Dell XPS 13 mü?",
    body: "Yazılım geliştirme için laptop arıyorum. İkisi arasında gerçekten kararsız kaldım.",
  },
  {
    user_name: "selin_ay", category: "Ev & Yaşam", votes: 7, answer_count: 0,
    title: "Teflon veya paslanmaz çelik tava hangisi daha iyi?",
    body: "3 parçalı set alacağım. Her gün kullanım için hangisi daha uzun ömürlü ve sağlıklı?",
  },
  {
    user_name: "emre_toprak", category: "Elektronik", votes: 18, answer_count: 0,
    title: "PS5 mi yoksa Xbox Series X mi almalıyım?",
    body: "Her ikisini de hiç deneyimlemedim. Arkadaşlarım PS5te, ama Xbox Game Pass cazip geliyor.",
  },
  {
    user_name: "dilan_ozkan", category: "Hediye", votes: 9, answer_count: 0,
    title: "Erkek arkadaşa 1000₺ bütçeyle teknoloji hediyesi?",
    body: "Oyun oynamayı seviyor ama konsolunda her şeyi var. Kulaklık, klavye ya da başka bir şey olabilir.",
  },
  {
    user_name: "can_arslan", category: "Spor", votes: 5, answer_count: 0,
    title: "Yüzme başlangıcında hangi gözlük markası önerilir?",
    body: "Haftada 3 gün yüzmeye başlayacağım. Bütçem 200-400₺ arası.",
  },
  {
    user_name: "irem_kara", category: "Kozmetik", votes: 14, answer_count: 0,
    title: "SPF 50 güneş kremi önerisi — yağlı cilt için",
    body: "Yazın her gün kullanacağım, makyajın altında da rahat duran bir ürün arıyorum. Beyaz iz bırakmasın.",
  },
  {
    user_name: "tarik_sahin", category: "Elektronik", votes: 11, answer_count: 0,
    title: "4K monitör için Asus mu LG mi Samsung mi?",
    body: "Grafik tasarım ve biraz oyun için 27 inç 4K monitör bakıyorum. Renk doğruluğu en önemli kriter.",
  },
];

const answers = [
  // 0: kulaklık
  [
    { user_name: "ali_yuz", gender: "erkek", body: "Sony WH-1000XM5 kesinlikle harika. Ses kalitesi ve gürültü engelleme açısından bu fiyat aralığında rakibi yok.", votes: 5 },
    { user_name: "ayse_t", gender: "kadin", body: "Ben Bose QC45 kullanıyorum, video konferans için mükemmel. Mikrofon kalitesi Sony'den daha iyi.", votes: 3 },
    { user_name: "murat_b", gender: "erkek", body: "JBL 720BT daha uygun fiyatlı ama ses kalitesi biraz düşük. Bütçen 5000 ise XM5'e git.", votes: 2 },
    { user_name: "ceyda_f", gender: "kadin", body: "Her ikisini de denedim. Uzun süreli kullanımda Bose daha rahat, Sony daha bas ağırlıklı.", votes: 4 },
    { user_name: "kemal_d", gender: "erkek", body: "ANC öncelikse Sony XM5. Sesli görüşmeyse Bose QC45.", votes: 6 },
  ],
  // 1: koşu bandı
  [
    { user_name: "fitlife_23", gender: "erkek", body: "Weyole veya BH Fitness markalarına bakın. Türkiye'de servisi var ve 10K bütçeye güzel seçenekler var.", votes: 4 },
    { user_name: "spor_anne", gender: "kadin", body: "Biz Sole F63 kullanıyoruz, çok sessiz ve dayanıklı.", votes: 3 },
    { user_name: "ibrahim_k", gender: "erkek", body: "NordicTrack T6.5S bakın, otomatik eğim özelliği var ve bu fiyata çok iyi motor gücü sunuyor.", votes: 5 },
    { user_name: "esra_m", gender: "kadin", body: "Teknosa ve MediaMarkt'ta deneme fırsatı var, mutlaka deneyin. Kuşak kalınlığı önemli.", votes: 2 },
    { user_name: "hasan_r", gender: "erkek", body: "Ev tipi için max hız 16 km/h yeterli. Daha fazlasına para vermeyin.", votes: 1 },
    { user_name: "gamze_y", gender: "kadin", body: "Bakım maliyetine de dikkat edin, bazı markalar pahalı yedek parça istiyor.", votes: 3 },
  ],
  // 2: nemlendirici
  [
    { user_name: "dermatoloji_fan", gender: "kadin", body: "Neutrogena Hydro Boost tam bütçenize uygun ve kuru cilt için gerçekten işe yarıyor.", votes: 8 },
    { user_name: "cilt_bakimi", gender: "kadin", body: "CeraVe Moisturising Cream. Ceramideler cilt bariyerini onarıyor, yağlı hissettirmiyor.", votes: 11 },
    { user_name: "serkan_c", gender: "erkek", body: "Kız kardeşim Eucerin Urea 5% kullanıyor ve çok memnun. Hepsiburada'da 45 TL civarı.", votes: 2 },
    { user_name: "make_up_101", gender: "kadin", body: "Avene Cicalfate+ denemeden karar verme. Kuru ve hassas ciltler için mucize gibi.", votes: 5 },
    { user_name: "burcu_ak", gender: "kadin", body: "La Roche-Posay Toleriane Double Repair biraz bütçenin üstünde ama promosyonda tutabilirsiniz.", votes: 4 },
    { user_name: "eczaci_yardim", gender: "kadin", body: "Hyaluronik asit içeren bir ürün seçin. Urea da kuru cilt için çok faydalı bir içerik.", votes: 9 },
    { user_name: "naturel_sevig", gender: "kadin", body: "Arko Nem Yoğun Nemlendirici de gayet iyi, çok uygun fiyatlı.", votes: 3 },
  ],
  // 3: MacBook vs Dell
  [
    { user_name: "mac_dev", gender: "erkek", body: "M3 Air ile geçtim, pişman değilim. Batarya ömrü inanılmaz, terminal deneyimi çok daha iyi.", votes: 7 },
    { user_name: "windows_fan", gender: "erkek", body: "Dell XPS kalite inşaatı tartışılmaz ama Türkiye'de servisi berbat. MacBook'ta servis daha kolay.", votes: 3 },
    { user_name: "yazilimci_k", gender: "kadin", body: "Docker ve VM çalıştırıyorsan M3'ün ARM mimarisinde bazen uyumsuzluk çıkıyor, dikkat.", votes: 5 },
    { user_name: "ozlem_yazilim", gender: "kadin", body: "Yazılım geliştirme için Mac ekosistemi çok daha smooth. iOS geliştirme de yapacaksan Mac şart.", votes: 6 },
    { user_name: "tech_review_tr", gender: "erkek", body: "M3 Air fanless yani sürekli yoğun derlemelerde throttle yapıyor. Dikkat.", votes: 4 },
  ],
  // 4: tava
  [
    { user_name: "asci_eda", gender: "kadin", body: "Günlük kullanım için paslanmaz çelik daha uzun ömürlü ama ısınması daha uzun sürer. Teflon pratik ama 2-3 yılda bir değişmeli.", votes: 5 },
    { user_name: "mutfak_pro", gender: "erkek", body: "Karbon çelik en iyi orta yol. Teflon'un kaplama kaygısı yok, paslanmazdan daha çabuk ısınıyor.", votes: 4 },
    { user_name: "ev_hanimi", gender: "kadin", body: "Ben Teflon'dan geçtim, artık döküm demir kullanıyorum. Bazen ağır oluyor ama ömür boyu sürer.", votes: 3 },
    { user_name: "chef_ali", gender: "erkek", body: "Restoran şefleri neredeyse hiç teflon kullanmaz. Profesyonel mutfakta paslanmaz veya demir tercih edilir.", votes: 6 },
    { user_name: "saglik_bilinci", gender: "kadin", body: "PTFE kaplama çizilince sağlık riski var. Fissler veya WMF'nin kaliteli setlerine bakın.", votes: 2 },
  ],
  // 5: PS5 vs Xbox
  [
    { user_name: "oyuncu_nuri", gender: "erkek", body: "Arkadaşların PS5'teyse PS5 al. Online oyunların zevki arkadaşlarla çok daha fazla.", votes: 9 },
    { user_name: "xbox_master", gender: "erkek", body: "Game Pass değeri tartışılmaz. 600 TL'ye ayda yüzlerce oyun oynayabiliyorsun, PS5'te her oyun 1500 TL+.", votes: 7 },
    { user_name: "konsol_bilen", gender: "erkek", body: "PS5'in exclusive'leri (God of War, Spider-Man) gerçekten çok iyi. Xbox exclusiveleri daha zayıf.", votes: 5 },
    { user_name: "gamer_girl", gender: "kadin", body: "Ben PS5 aldım, arayüz çok daha güzel ve DualSense kontrolcü deneyimi harika.", votes: 4 },
    { user_name: "butce_oyuncu", gender: "erkek", body: "Türkiye'de PS5 oyun fiyatları çok yüksek. Xbox Game Pass bu konuda çok avantajlı.", votes: 2 },
    { user_name: "pc_den_gelen", gender: "erkek", body: "Game Pass varsa PC'de de oynayabilirsin, konsol almana gerek yok zaten.", votes: 3 },
  ],
  // 6: erkek hediye
  [
    { user_name: "hediye_uzman", gender: "kadin", body: "HyperX Cloud III kulaklık tam 1000 TL bandında ve oyuncu için süper bir hediye.", votes: 5 },
    { user_name: "tech_gift", gender: "erkek", body: "Mekanik klavye çok iyi hediye olur. Keychron K2 veya K6 bu bütçeye uygun ve kaliteli.", votes: 6 },
    { user_name: "gizli_alis", gender: "kadin", body: "Oyun mouse'u düşündün mü? Logitech G502 X veya Razer DeathAdder V3 1000 TL civarı.", votes: 4 },
    { user_name: "bilgili_abi", gender: "erkek", body: "Kulaklığı yoksa HyperX Cloud Stinger 2 Core 800 TL civarı, performansı fiyatının çok üstünde.", votes: 3 },
    { user_name: "pratik_hediye", gender: "kadin", body: "Oyun koltuğu için aksesuar? Mousepad XL veya RGB şerit olabilir.", votes: 2 },
  ],
  // 7: yüzme gözlüğü
  [
    { user_name: "yuzmeci_pro", gender: "erkek", body: "Arena Cobra Ultra Swipe veya Speedo Fastskin tam bu bütçeye uygun ve havuz için ideal.", votes: 3 },
    { user_name: "sporcu_nese", gender: "kadin", body: "Ben TYR öneriyorum, özellikle Socket Rocket 2.0. Silikon conta uzun süre sızdırmaz kalıyor.", votes: 4 },
    { user_name: "havuz_hoca", gender: "erkek", body: "Anti-fog kaplama özelliği olan modeli seçin. Buğulanmayan gözlük konsantrasyonu çok artırıyor.", votes: 5 },
    { user_name: "deneyimli_yuzu", gender: "erkek", body: "Başlangıç için Speedo yeterli. Önce tekniğinizi geliştirin, sonra premium modele geçersiniz.", votes: 2 },
    { user_name: "swim_mom", gender: "kadin", body: "Decathlon'da deneyerek bakın, fit olmayan gözlük her şeyden önemli.", votes: 3 },
  ],
  // 8: güneş kremi
  [
    { user_name: "uv_uzman", gender: "kadin", body: "La Roche-Posay Anthelios Ultra Light Fluid. Yağlı ciltler için formüle edilmiş, beyaz iz yok.", votes: 10 },
    { user_name: "kore_beauty", gender: "kadin", body: "Skin1004 Madagascar Centella muhteşem doku, beyaz iz yok. Kore güneş kremleri gerçekten farklı.", votes: 8 },
    { user_name: "cilt_biliyor", gender: "kadin", body: "Yağlı cilt için mineral filtreli değil, kimyasal filtreli SPF seçin. Daha hafif hissettiriyor.", votes: 4 },
    { user_name: "gunes_krem_101", gender: "kadin", body: "ISDIN Fusion Water Color 50+ hafif ve makyaj altında mükemmel.", votes: 5 },
    { user_name: "pratik_tavsiye", gender: "erkek", body: "Her gün kullanacaksan Eucerin Sun Gel-Cream 50+ hem etkili hem makul fiyatlı.", votes: 3 },
    { user_name: "altruist_fan", gender: "kadin", body: "Altruist SPF50 çok uygun fiyatlı ve harika. Makyaj altında da rahat duruyor.", votes: 6 },
  ],
  // 9: 4K monitör
  [
    { user_name: "grafik_tasarim", gender: "erkek", body: "LG 27UL850 renk doğruluğu açısından çok iyi. sRGB %99+ kapsama alanı var.", votes: 7 },
    { user_name: "asus_fan", gender: "erkek", body: "Asus ProArt PA279CRV, Delta E < 2 fabrika kalibrasyonu var. Profesyonel tasarım için ideal.", votes: 6 },
    { user_name: "renk_hassas", gender: "kadin", body: "Grafik tasarımda renk kalibrasyonu çok önemli. IPS panel seçin, VA ve TN daha zayıf.", votes: 5 },
    { user_name: "samsung_fan", gender: "erkek", body: "Samsung Odyssey Neo G7 4K hem oyun hem tasarım için harika ama biraz daha pahalı.", votes: 4 },
    { user_name: "pc_setup", gender: "erkek", body: "USB-C veya Thunderbolt bağlantısı olan modeli tercih edin, laptop ile tek kablo yeterli.", votes: 4 },
    { user_name: "butce_tavsiye", gender: "erkek", body: "LG 27UL500 daha uygun fiyatlı ve temel 4K ihtiyaçlarını karşılıyor.", votes: 3 },
  ],
];

async function seed() {
  const { data: inserted, error } = await sb.from("topics").insert(topics).select();
  if (error) { console.error("topics error:", error.message); return; }
  console.log("Inserted topics:", inserted.length);

  for (let i = 0; i < inserted.length; i++) {
    const topicId = inserted[i].id;
    const topicAnswers = answers[i].map((a) => ({
      topic_id: topicId,
      user_id: DUMMY_USER_ID,
      user_name: a.user_name,
      gender: a.gender,
      body: a.body,
      votes: a.votes,
    }));
    const { error: ae } = await sb.from("topic_answers").insert(topicAnswers);
    if (ae) console.error(`answers error topic ${i}:`, ae.message);
    await sb.from("topics").update({ answer_count: answers[i].length }).eq("id", topicId);
    console.log(`Topic ${i} done (${answers[i].length} answers):`, inserted[i].title.slice(0, 40));
  }
  console.log("Seed complete!");
}

seed().catch(console.error);
