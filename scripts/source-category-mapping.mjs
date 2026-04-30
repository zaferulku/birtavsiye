// Mağaza source_category → bizim DB taxonomy slug
// KEY: source_category değeri (DB'den geldiği gibi, case-sensitive)
// VALUE: { ourSlug: bizim slug }

export const SOURCE_CATEGORY_MAP = {

  // ═══ MediaMarkt — Oyun ═══
  'Oyun Konsolları': { ourSlug: 'oyun-konsol' },

  // ═══ MediaMarkt — Laptop (markaya bakmaksızın hepsi laptop) ═══
  'Casper Laptop': { ourSlug: 'laptop' },
  'HP Laptop': { ourSlug: 'laptop' },
  'Asus Laptop': { ourSlug: 'laptop' },
  'Acer Laptop': { ourSlug: 'laptop' },
  'Huawei Laptop': { ourSlug: 'laptop' },
  'Lenovo Laptop': { ourSlug: 'laptop' },
  'Lenovo Laptop Modelleri': { ourSlug: 'laptop' },
  'Laptop': { ourSlug: 'laptop' },

  // ═══ MediaMarkt — Akıllı Saat ═══
  'Akıllı Saatler': { ourSlug: 'akilli-saat' },
  'Bilicra Akıllı Saat': { ourSlug: 'akilli-saat' },

  // ═══ MediaMarkt — Tablet ═══
  'Android Tabletler': { ourSlug: 'tablet' },
  'Tabletler': { ourSlug: 'tablet' },

  // ═══ MediaMarkt — Mutfak ═══
  'Blender': { ourSlug: 'blender' },
  'Kahve Makinesi': { ourSlug: 'kahve-makinesi' },
  'Espresso Kahve Makineleri': { ourSlug: 'kahve-makinesi' },
  'Filtre Kahve Makineleri': { ourSlug: 'kahve-makinesi' },
  'Robot Süpürge': { ourSlug: 'robot-supurge' },
  'Ankastre Fırın': { ourSlug: 'firin' },
  'Ankastre Bulaşık Makineleri': { ourSlug: 'bulasik-makinesi' },
  'Çamaşır Makineleri': { ourSlug: 'camasir-makinesi' },
  'Buzdolabi': { ourSlug: 'buzdolabi' },
  'Klimalar': { ourSlug: 'klima' },

  // ═══ MediaMarkt — Powerbank ═══
  'Taşınabilir Şarj Cihazları': { ourSlug: 'powerbank' },
  'MagSafe Powerbank': { ourSlug: 'powerbank' },
  'Ttec Powerbank': { ourSlug: 'powerbank' },
  'Ugreen Powerbank': { ourSlug: 'powerbank' },

  // ═══ MediaMarkt — Telefon ═══
  'Android Telefonlar': { ourSlug: 'akilli-telefon' },
  'iPhone 11': { ourSlug: 'akilli-telefon' },
  'iPhone 14 Pro Max': { ourSlug: 'akilli-telefon' },
  'iPhone 17 Pro Max': { ourSlug: 'akilli-telefon' },
  'Galaxy A': { ourSlug: 'akilli-telefon' },
  'Galaxy S': { ourSlug: 'akilli-telefon' },
  'Galaxy Z': { ourSlug: 'akilli-telefon' },
  'Samsung Telefon': { ourSlug: 'akilli-telefon' },
  'General Mobile Telefon': { ourSlug: 'akilli-telefon' },

  // ═══ MediaMarkt — Diğer ═══
  'Drone': { ourSlug: 'drone' },

  // ═══ PttAVM — zaten kebab-case ═══
  'akilli-telefon': { ourSlug: 'akilli-telefon' },
  'telefon-kilifi': { ourSlug: 'telefon-kilifi' },
  'telefon-yedek-parca': { ourSlug: 'telefon-yedek-parca' },
  'telefon-aksesuar': { ourSlug: 'telefon-aksesuar' },
  'ekran-koruyucu': { ourSlug: 'ekran-koruyucu' },
  'sarj-kablo': { ourSlug: 'sarj-kablo' },
  'akilli-saat': { ourSlug: 'akilli-saat' },
  'kahve-makinesi': { ourSlug: 'kahve-makinesi' },
  'buzdolabi': { ourSlug: 'buzdolabi' },
  'tost-makinesi': { ourSlug: 'tost-makinesi' },
  'televizyon': { ourSlug: 'tv' },
  'tv-aksesuar': { ourSlug: 'tv-aksesuar' },
  'fotograf-kamera': { ourSlug: 'fotograf-kamera' },
  'guvenlik-kamerasi': { ourSlug: 'guvenlik-kamerasi' },
  'bilgisayar-bilesenleri': { ourSlug: 'bilgisayar-bilesenleri' },
};

// Source mapping yoksa keyword pattern ile dene (title üzerinden)
// Sıra önemli: önce spesifik, sonra genel
export const KEYWORD_FALLBACK = [
  // Telefon aksesuar (önce spesifik)
  { pattern: /\b(kılıf)\b/i, slug: 'telefon-kilifi' },
  { pattern: /(ekran koruyucu|ekran filmi|temperli cam)/i, slug: 'ekran-koruyucu' },
  { pattern: /\b(batarya|pil)\b/i, slug: 'telefon-yedek-parca' },
  { pattern: /(şarj kablo|şarj kablosu|usb-c kablo|lightning kablo)/i, slug: 'sarj-kablo' },

  // Kahve
  { pattern: /\b(filtre kahve|nescaf|jacobs|kurukahveci|mehmet efendi|tchibo)\b/i, slug: 'kahve' },
  { pattern: /\b(kahve makin|espresso makin)\b/i, slug: 'kahve-makinesi' },

  // Mutfak
  { pattern: /\b(blender|mikser)\b/i, slug: 'blender' },
  { pattern: /(tost makin)/i, slug: 'tost-makinesi' },
  { pattern: /(robot süpürge)/i, slug: 'robot-supurge' },

  // Akıllı cihazlar (kordon, AMOLED ekran, Watch Ultra/serie tipik smartwatch terimleri)
  { pattern: /(akıllı saat|smartwatch|smart watch|apple watch|samsung watch|galaxy watch|watch ultra|kordon.*ips|amoled ekran.*kordon|kordon.*amoled|gs8 watch|winex watch|miui watch|kasa.*kordon|kordon.*kasa|kasa metal kordon)/i, slug: 'akilli-saat' },
  { pattern: /\b(tablet|ipad|tab pro|tab x)\b/i, slug: 'tablet' },
  { pattern: /\b(laptop|notebook|macbook|thinkpad|ideapad)\b/i, slug: 'laptop' },
  { pattern: /\b(powerbank|taşınabilir şarj)\b/i, slug: 'powerbank' },
  { pattern: /\b(drone|dji mini|dji air|mavic)\b/i, slug: 'drone' },

  // Beyaz eşya
  { pattern: /(klima|inverter|btu\/?h|salon tipi)/i, slug: 'klima' },
  { pattern: /(buzdolab)/i, slug: 'buzdolabi' },
  { pattern: /(çamaşır makin|enerji sınıfı.*kg.*rpm|kg.*rpm.*beyaz|çamaşır.*kg)/i, slug: 'camasir-makinesi' },
  { pattern: /(bulaşık makin|programlı.*di\b|programlı.*bm|programlı.*bcs)/i, slug: 'bulasik-makinesi' },
  { pattern: /(kurutma makin|kg kurutma|kurutmalı)/i, slug: 'kurutma-makinesi' },
  { pattern: /(ankastre fırın|fırın|ankastre)/i, slug: 'firin' },

  // Kozmetik
  { pattern: /\b(dudak (kalemi|kremi|nemlendirici)|lip pencil|lip stick|ruj)\b/i, slug: 'dudak-makyaji' },
  { pattern: /\b(göz kalemi|maskara|eyeliner|göz farı|eye shadow)\b/i, slug: 'goz-makyaji' },
  { pattern: /\b(fondöten|kapatıcı|allık|highlighter|pudra|bb krem|cc krem|bronzer)\b/i, slug: 'yuz-makyaji' },
  { pattern: /\b(makyaj fırça|makyaj süngeri|beauty blender)\b/i, slug: 'makyaj-aksesuar' },

  // Saç bakım / şekillendirme (önce şekillendirici, sonra bakım)
  // NOT: Türkçe suffix (saç serumu, saç kremi, şampuanı vb) için \b kaldırıldı,
  // kelime ortasında match olabilir.
  { pattern: /(saç kurutma|fön|saç düzleştirici|saç maşa|hair dryer|straightener)/i, slug: 'sac-kurutma-sekillendirici' },
  { pattern: /(saç boya|hair color|hair dye)/i, slug: 'sac-boyasi' },
  { pattern: /(saç serum|saç krem|şampuan|saç maske|saç sprey|saç tonik|saç losyon|hair (serum|cream|shampoo|mask))/i, slug: 'sac-bakim' },

  // Güneş kremi (önce — yüz kremi pattern'inden önce)
  { pattern: /(güneş kremi|sun cream|solaire|sunscreen|spf\s*\d+)/i, slug: 'kozmetik-bakim' },

  // Cilt / Yüz / Vücut bakım (genel)
  { pattern: /(göz kremi|yüz kremi|nemlendirici|tonik|peeling|maske|serum|jel|losyon|hydrabebe|toner)/i, slug: 'kozmetik-bakim' },
  { pattern: /(vücut kremi|el kremi|ayak kremi|body lotion|hand cream)/i, slug: 'vucut-bakim' },

  // Bebek / Anne
  { pattern: /(bebek krem|bebek mama|bebek şampuan|bebek losyon|bebek yağ|bebek pudra|hydrabebe|mustela|baby)/i, slug: 'bebek-bakim-urunleri' },

  // Ağız diş bakım
  { pattern: /(diş fırça|diş macun|gargara|toothbrush|toothpaste)/i, slug: 'agiz-dis-bakim' },

  // Erkek bakım
  { pattern: /(traş makin|tıraş makin|jilet|tıraş krem|aftershave|after shave)/i, slug: 'erkek-bakim' },

  // Kişisel bakım elektrikli (epilatör, vb)
  // NOT: Negatif İyon (büyük İ Türkçe) — case-insensitive
  { pattern: /(epilatör|epilator|negatif (iyon|i̇yon)|profesyonel saç|saç şekillendirici tarak)/i, slug: 'kisisel-bakim-elektrikli' },

  // Kulaklık — TWS, FreeBuds, Buds, Kulak İçi/Üstü dahil
  { pattern: /(kulaklık|kulak (içi|üstü)|a[iı]rpods|airbuds|freebuds|true buds|tws|earbuds|earphones|wireless headphones|sony wh|jbl|cloud (mini|stinger|mix)|gamebuds)/i, slug: 'ses-kulaklik' },

  // Bilgisayar adaptör (Asus/HP/Dell laptop adaptörü)
  { pattern: /(adaptör|adapter|şarj cihazı 19v|şarj cihazı 20v|laptop charger)/i, slug: 'bilgisayar-cevre' },

  // Fotoğraf / kamera (lens, kit, Instax, Vlog, gimbal, kamera pili)
  { pattern: /(n[iı]kkor|canon ef|sigma art|tamron|kamera objekt|fotoğraf lens|dslr|mirrorless|fotoğraf makin|instax|vlog fotoğraf|kit lens|18-(55|105|140)mm|gimbal|görüntü sabitleyici|kamera (pil|şarj|bataryası))/i, slug: 'fotograf-kamera' },

  // Otomotiv genel
  { pattern: /(oto bakım|oto yağ|motor yağ|antifriz|fren balata|silecek|oto boyası|akrilik sonkat)/i, slug: 'otomotiv' },

  // Bilgisayar parça
  { pattern: /\b(ram|sodimm|dimm|ddr3|ddr4|ddr5|bellek|ssd|nvme|hdd|harddisk|işlemci|ekran kartı|gpu|anakart|motherboard)\b/i, slug: 'bilgisayar-bilesenleri' },
  { pattern: /\b(klavye|mouse|fare|web kamerası|webcam|monitör)\b/i, slug: 'bilgisayar-cevre' },

  // Otomotiv (paspas, oto aksesuar, GPS card)
  { pattern: /(akü|battery charger)/i, slug: 'oto-aku' },
  { pattern: /(oto paspas|3d (havuzlu )?paspas|paspas (siyah|mavi)|gps desteği|gps card|garmin yankımap|garmin data card)/i, slug: 'otomotiv' },

  // Kamp / Outdoor
  { pattern: /\b(çadır|kamp|trekking|sleeping bag|uyku tulumu)\b/i, slug: 'outdoor-kamp' },

  // Ayakkabı (önce kadın spesifik)
  { pattern: /(kadın.*sneaker|bayan.*sneaker)/i, slug: 'kadin-ayakkabi-sneaker' },
  { pattern: /(kadın.*topuklu|stiletto)/i, slug: 'kadin-ayakkabi-topuklu' },
  { pattern: /(kadın.*sandalet|bayan.*sandalet)/i, slug: 'kadin-ayakkabi-sandalet' },
  { pattern: /(kadın.*bot|bayan.*bot)/i, slug: 'kadin-ayakkabi-bot' },
  { pattern: /(kadın.*(ayakkab|babet)|bayan.*ayakkab)/i, slug: 'kadin-ayakkabi-babet' },
  { pattern: /(erkek.*sneaker)/i, slug: 'erkek-ayakkabi-sneaker' },
  { pattern: /(erkek.*bot)/i, slug: 'erkek-ayakkabi-bot' },
  { pattern: /(erkek.*ayakkab.*klasik|oxford|loafer|mokasen)/i, slug: 'erkek-ayakkabi-klasik' },
  { pattern: /(çocuk.*ayakkab)/i, slug: 'cocuk-ayakkabi' },
  { pattern: /(erkek.*ayakkab)/i, slug: 'erkek-ayakkabi-sneaker' },
  { pattern: /\b(spor ayakkabı|sneaker)\b/i, slug: 'spor-ayakkabi' },

  // Kadın giyim
  { pattern: /\b(elbise|abiye)\b/i, slug: 'kadin-elbise' },
  { pattern: /\b(etek)\b/i, slug: 'kadin-etek' },
  { pattern: /(kadın.*(bluz|tişört|gömlek|t-shirt))/i, slug: 'kadin-giyim-ust' },
  { pattern: /(kadın.*(pantolon|jean|tayt))/i, slug: 'kadin-giyim-alt' },

  // TV
  { pattern: /\b(televizyon|smart tv|qled|oled)\b/i, slug: 'tv' },
  { pattern: /(tv (uyumlu|box|stick)|android tv box|mx box|chromecast|fire tv)/i, slug: 'tv-aksesuar' },

  // Networking
  { pattern: /(router|access point|wi-?fi 6|wi-?fi serisi|tp-link|d-link|mercusys|cudy|gigabit switch|easy smart switch|lte router|kablosuz router|wireless router|asus router)/i, slug: 'networking' },

  // Oyun konsol aksesuar (Apec elcik, ps5 controller, gaming kulaklık ayrı)
  { pattern: /(ps[345] (elcik|kontrol|controller|joystick|kol)|elcik (siyah|mavi|kırmızı|yeşil)|barracuda elcik|playstation \d oyun|xbox.*oyun|goat simulator|ps[345] oyun|dragonball xenoverse)/i, slug: 'oyun-konsol' },

  // Spor / Outdoor (yoga, fitness, bisiklet ayrı)
  { pattern: /(yoga (mat|minder)|pilates mat|fitness mat|spor mat|fitness eldiven|halter kelepçe|ağırlık kelepçe)/i, slug: 'spor-outdoor' },
  { pattern: /(bisiklet|jant.*vites|vites.*jant)/i, slug: 'bisiklet' },

  // Çanta cüzdan (yan çanta, body bag, evrak çantası, bel çantası, hiking bag)
  { pattern: /(yan çanta|body bag|bel çantası|evrak çantası|hiking.*body|fileli yan çanta|outdoor çanta)/i, slug: 'canta-cuzdan' },

  // Mutfak (termos, düdüklü tencere, kahve makinesi türleri)
  { pattern: /(termos|vakumlu paslanmaz|düdüklü tencere|pres cooker|elec pres cook)/i, slug: 'mutfak-aleti-diger' },
  { pattern: /(türk kahve makin|fincan kapasiteli)/i, slug: 'kahve-makinesi' },

  // Göz farı paleti / eyeshadow (ek pattern'ler)
  { pattern: /(göz farı|eyeshadow|eye shadow|göz farı paleti|nudes.*paleti|eyeliner)/i, slug: 'goz-makyaji' },

  // Erkek/Kadın giyim (mont, polar ceket, tişört, eşofman, gömlek)
  { pattern: /(softshell mont|softshell ceket|polar ceket|polar mont|kışlık mont)/i, slug: 'kadin-dis-giyim' },
  { pattern: /(eşofman|tracksuit|şofman üstü)/i, slug: 'esofman-spor-giyim' },
  { pattern: /(taktik gömlek|outdoor gömlek)/i, slug: 'erkek-giyim-ust' },
  { pattern: /(outdoor pantolon|kışlık pantolon|kargo pantolon|yarış pantolon)/i, slug: 'erkek-giyim-alt' },

  // Telefon (Huawei Mate, Galaxy, iPhone)
  { pattern: /(telefon|akıllı telefon|iphone|galaxy [asz]\d+|huawei mate|huawei pura|huawei nova|honor magic|redmi (note )?\d|xiaomi \d+ (ultra|pro|t)|oneplus \d+|oppo (find|reno))/i, slug: 'akilli-telefon' },

  // Telefon aksesuar (kaplama, Type-C dongle, soket)
  { pattern: /(arka kaplama|telefon kaplama|tip[- ]?c (dongle|soket|adaptör)|3,5\s?mm.*soket|kulaklık jak|kollar.*soketi|stero type-c)/i, slug: 'telefon-aksesuar' },

  // Smartwatch fallback (silikon kordon, kasa, çelik kordon, ips ekran)
  { pattern: /(silikon kordon|çelik kordon|metal kordon|titanyum.*kordon|amoled.*ekran|spor takipli|uyku takip|gps.*sim kart|takipli.*gps|spor ve sağlık takip|watch için)/i, slug: 'akilli-saat' },

  // Cilt / yüz bakım (retinol, anti-aging)
  { pattern: /(retinol|anti[- ]?aging|yaşlanma karşıtı|hyaluronic|niacinamide|setting spray|makyaj sabitleyici)/i, slug: 'kozmetik-bakim' },

  // Çamaşır makinesi (model-numara fallback)
  { pattern: /(vestfrost.*kg|cmm|wf\s?i|programlı (di|wmf|wmb)|ykmx|dmx)/i, slug: 'camasir-makinesi' },
  { pattern: /(arçelik (\d+|.*kg)|beko (bm|bcs|wmf)|vestfrost.*çamaşır)/i, slug: 'camasir-makinesi' },

  // Bulaşık makinesi (Arçelik DI programlı)
  { pattern: /(arçelik.*\d+ programlı|programlı bcs)/i, slug: 'bulasik-makinesi' },

  // Saç şekillendirici (kuaför motor, profesyonel başlık, kordonlu W)
  { pattern: /(profesyonel kuaför|kuaför.*motor|profesyonel.*\d{3,4}\s?w|powertec|fön.*başlık|kordonlu.*\d+\s?w)/i, slug: 'sac-kurutma-sekillendirici' },

  // Eyeliner (Türkçe ı)
  { pattern: /(eyel[iı]ner|cateye|kalıcı eyeliner)/i, slug: 'goz-makyaji' },

  // Mont/ceket geniş
  { pattern: /(softshell|polar(lı)?\s*(mont|ceket|kaban)|kadın\s*(mont|kaban)|kışlık\s*(mont|kaban))/i, slug: 'kadin-dis-giyim' },

  // Outdoor giyim erkek (en sonda)
  { pattern: /(outdoor (pantolon|gömlek|polar|ceket)|kışlık polarlı|tactical outdoor)/i, slug: 'erkek-giyim-alt' },

  // Laptop pil (Dell 42WHR, "Bataryası Pili" laptop bağlamında)
  { pattern: /(\d+whr.*pil|dell.*pil|laptop.*pil|laptop.*batary|batary.*1\d{3,4}h)/i, slug: 'bilgisayar-bilesenleri' },

  // Kamera aksesuar (gimbal değil, DJI Osmo/Insta360/GoPro vantuzlu)
  { pattern: /(smallrig|dji osmo|gopro|insta360|action cam|stabilizer|tripod)/i, slug: 'fotograf-kamera' },

  // Saç kurutma fön (W power, kademe, kordonlu)
  { pattern: /(\d{3,4}\s?w.*kademe|kademe.*\d{3,4}\s?w|braun.*\d{3,4}\s?w|kordonlu.*\d+\s?kademe|fön.*\d{3,4}\s?w)/i, slug: 'sac-kurutma-sekillendirici' },

  // Mont generic (mont kelimesi tek başına)
  { pattern: /(\bmont\b|mont kadın|kadın.*mont|silver falls|trekking mont)/i, slug: 'kadin-dis-giyim' },

  // Combat tactical / erkek gömlek
  { pattern: /(tactical|combat outdoor|swat|taktik koruma)/i, slug: 'erkek-giyim-ust' },

  // Argemon kışlık pantolon ve diğer pantolon türleri (genişletilmiş)
  { pattern: /(kışlık pantolon|outdoor pantolon|polarlı.*pantolon|softshell.*pantolon|argemon|crozwise)/i, slug: 'erkek-giyim-alt' },

  // Saç toniği (Türkçe ğ NFD sorununu kapsayan)
  { pattern: /(saç toniği|sac toni|hair tonic)/i, slug: 'sac-bakim' },

  // Mikser/Blender (Auto-Iq Shark Ninja için \b kaldırıldı)
  { pattern: /(mikser|blender|shark ninja|food processor)/i, slug: 'blender' },

  // Niş kalan kümeler
  { pattern: /(protein toz|whey protein|protein supplement|ek besin|takviye)/i, slug: 'kozmetik-bakim' },
  { pattern: /(testere|dal budama|chainsaw|yağ pompalı)/i, slug: 'otomotiv' },
  { pattern: /(sentetik fırça|kıl fırça|resim fırça)/i, slug: 'makyaj-aksesuar' },
  { pattern: /(metabo|şarj cihazı.*\d+\s?w)/i, slug: 'bilgisayar-cevre' },
  { pattern: /(ps[345].*ayna|ayna.*kırmızı|modifiye.*ayna)/i, slug: 'oyun-konsol' },
  { pattern: /(electrolux professional|tezgah.*evye|tezgahaltı tezgah)/i, slug: 'mutfak-aleti-diger' },
  { pattern: /(\d{6}.*pili|\d{6}.*bataryası)/i, slug: 'bilgisayar-bilesenleri' },

  // Bluetooth jenerik (en sonda — diğer hiçbiri match etmediyse, bluetooth = kulaklık varsayım)
  { pattern: /(bluetooth)/i, slug: 'ses-kulaklik' },
];
