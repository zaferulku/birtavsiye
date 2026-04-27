/**
 * categorizeFromTitle — Ürün başlığından kategori slug'ı çıkarır.
 *
 * Kullanım:
 *  - PttAVM (ve diğer scraper) live data → canonical product oluştururken
 *  - Faz1 classifier bypass (Gemini kotası tasarrufu)
 *  - Match yoksa null döner — fallback Gemini classifier
 *
 * Sıra önemli: aksesuar/yedek parça önce match etsin (telefon kılıfı önce, telefon sonra).
 */

export interface CategoryMatchResult {
  slug: string | null;
  confidence: "high" | "medium" | "low";
  matchedKeyword?: string;
}

interface CategoryRule {
  slug: string;
  keywords: string[];
  excludeIfPresent?: string[];
  confidence?: "high" | "medium";
}

const RULES: CategoryRule[] = [
  // --- Aksesuarlar ---
  {
    slug: "telefon-kilifi",
    keywords: ["telefon kılıfı", "silikon kılıf", "kılıf siyah", "kılıf gold", "kılıf şeffaf",
               "uyumlu kılıf", "uyumlu silikon", "silikon kapak", "arka kapak", "cüzdanlı kılıf",
               "kılıf negro", "kılıf first", "kılıf silikon", "kılıf airbagli", "kılıf mat",
               "kılıf kamera korumalı", "kılıf biye", "kılıf bright simli", "kılıf kelvin",
               "kılıf renkli", "kılıf resimli", "kılıf yumuşak", "kılıf darbeye",
               "kılıf magnum", "kılıf kapaklı", "kılıf aras deri", "kılıf ananas"],
    excludeIfPresent: ["watch", "ipad", "tablet", "tv "],
    confidence: "high",
  },
  {
    slug: "ekran-koruyucu",
    keywords: ["ekran koruyucu", "cam koruyucu", "mat seramik", "9d temperli",
               "tempered glass", "screen protector"],
    confidence: "high",
  },
  {
    slug: "sarj-kablo",
    keywords: ["şarj kablosu", "usb-c kablo", "lightning kablo", "type-c kablo",
               "data kablosu", "fast charge kablo",
               "şarj aleti", "şarj adaptörü", "güç adaptörü", "süper hızlı şarj",
               "type-c süper hızlı", "laptop şarj aleti", "adaptör plastik kasa",
               "type-c / usb kablo"],
    confidence: "high",
  },
  {
    slug: "telefon-aksesuar",
    keywords: ["telefon tutucu", "araç tutucu", "selfie çubuğu", "selfie stick",
               "popsocket", "yüzük tutucu", "telefon askısı", "boyun askısı",
               "watch kordon", "saat kordon", "kordon naylon", "kamera lens koruyucu",
               "magsafe", "stylus kalem", "dokunmatik kalem",
               "kordon", "kayış silikon", "süet kordon", "metal tokalı",
               "kamera lens", "raze metal kamera", "watch kasa", "watch kılıf",
               "watch gard", "watch ekran koruma", "kasa koruyucu watch", "watch ppma"],
    excludeIfPresent: ["tv askı", "akıllı saat ", "smart watch ", "akıllı telefon"],
    confidence: "high",
  },
  {
    slug: "tv-aksesuar",
    keywords: ["tv duvar askı", "tv standı", "tv sehpası", "tv kumandası", "uzaktan kumanda",
               "smart tv kumanda", "hdmi kablosu", "uydu alıcı",
               "tv askı aparatı", "askı aparatı", "tavan askı", "askı aparat",
               "lcd led tv", "tv mönitör", "tv lcd led", "tv duvar",
               "smart tv akıllı kumanda", "tv kumanda", "tv evolution kit",
               "tüplü televizyon kumandası", "ses komutlu kumanda", "android tv kumanda",
               "android tv box", "tv yedek kumandası"],
    confidence: "high",
  },
  {
    slug: "bilgisayar-cevre",
    keywords: ["kablosuz mouse", "gaming mouse", "kablosuz klavye", "mekanik klavye",
               "webcam", "usb hub", "type-c hub", "dock istasyon", "docking station"],
    confidence: "high",
  },

  // --- Yedek parça ---
  {
    slug: "telefon-yedek-parca",
    keywords: ["batarya pil", "telefon pili", "telefon bataryası", "yedek pil",
               "lcd dokunmatik", "lcd ekran", "yedek ekran", "uyumlu pil", "uyumlu batarya",
               "pil batarya", "şarj soketi", "arka pil batarya kapağı", "batarya kapağı",
               "güçlendirilmiş batarya", "ithal pil", "lenovo pil", "kamera pili",
               "kamera bataryası", "şarj cihazı dock"],
    confidence: "high",
  },

  // --- Oyun konsol ---
  {
    slug: "oyun-konsol",
    keywords: ["nintendo switch", "playstation 5", "ps5 konsol", "xbox series",
               "switch konsol", "ps4 konsol", "ps5 dualsense", "joy-con",
               "kontrolfreek", "oyun kolu", "gamepad",
               "retro oyun konsolu", "taşınabilir oyun konsolu", "video oyun konsolu",
               "oyun konsolu", "atari ", "hdmi oyun konsolu", "emülatör destekli",
               "klasik oyunlu", "1000 oyun yüklü", "oyun yüklü"],
    confidence: "high",
  },

  // --- Bilgisayar bileşenleri (RAM/SSD/Anakart vs) ---
  {
    slug: "bilgisayar-bilesenleri",
    keywords: ["ddr4 ram", "ddr5 ram", "ddr4 bellek", "ddr5 bellek", "ecc rdimm",
               "rdimm", "udimm", "sodimm", "ssd nvme", "ssd m.2", "ssd sata",
               "tb ssd ", "gb ssd ", "pc4-2133", "pc5-", "ram bellek",
               "8gb ddr4", "16gb ddr4", "32gb ddr4", "64gb ddr4", "ddr4 2133",
               "soğutucu pad", "notebook soğutucu"],
    excludeIfPresent: ["telefon", "tablet"],
    confidence: "high",
  },

  // --- Klima ---
  {
    slug: "klima",
    keywords: ["btu klima", "duvar tipi split", "windfree", "multi inverter",
               "inverter klima", "9000 btu", "12000 btu", "18000 btu", "24000 btu",
               "duvar tipi multi"],
    confidence: "high",
  },

  // --- Mikrodalga ---
  {
    slug: "mikrodalga",
    keywords: ["mikrodalga", "ankastre mikrodalga", "dijital mikrodalga", "retro mikrodalga"],
    confidence: "high",
  },

  // --- Akıllı saat ---
  {
    slug: "akilli-saat",
    keywords: ["akıllı saat", "smart watch", "smartwatch", "fitness saat", "spor saati",
               "garmin fenix", "garmin forerunner", "garmin descent", "garmin venu",
               "apple watch series", "apple watch ultra",
               "galaxy watch ", "huawei watch gt", "xiaomi watch s", "mi band",
               "vivowatch", "asus vivowatch", "smartwatch silikon", "watch s88",
               "imıkı sf1", "linktech watch"],
    excludeIfPresent: ["kordon", "kasa koruyucu", "ekran koruyucu", "kılıf",
                        "watch gard", "watch ppma", "watch kasa", "watch kayış"],
    confidence: "high",
  },

  // --- Akıllı telefon ---
  {
    slug: "akilli-telefon",
    keywords: ["akıllı telefon", "cep telefonu", "smartphone",
               "iphone 11", "iphone 12", "iphone 13", "iphone 14", "iphone 15",
               "iphone 16", "iphone 17", "iphone air", "iphone se",
               "galaxy s23", "galaxy s24", "galaxy s25", "galaxy a", "galaxy z",
               "redmi note", "redmi 1", "xiaomi 1", "poco f", "poco x",
               "huawei pura", "huawei nova", "huawei mate",
               "honor magic", "honor 400", "honor 200",
               "oppo reno", "oppo find x", "oppo a",
               "vivo y", "vivo v", "vivo x",
               "tecno spark", "tecno camon", "tecno pop",
               "infinix hot", "infinix note",
               "realme c", "realme gt", "realme note",
               "tuşlu telefon", "tuşlu cep telefonu"],
    excludeIfPresent: ["kılıf", "kapak", "ekran koruyucu", "cam koruyucu", "kablo",
                        "şarj cihazı", "şarj aleti", "tutucu", "askı", "stylus",
                        "lcd", "batarya", "pil", "yedek"],
    confidence: "high",
  },

  // --- Tablet ---
  {
    slug: "tablet",
    keywords: ["ipad pro", "ipad air", "ipad mini", "ipad a16", "ipad 11", "ipad 10",
               "galaxy tab s", "galaxy tab a", "matepad", "xiaomi pad", "redmi pad",
               "lenovo tab", "android tablet"],
    excludeIfPresent: ["kılıf", "kapak", "ekran koruyucu", "kalem"],
    confidence: "high",
  },

  // --- Laptop ---
  {
    slug: "laptop",
    keywords: ["macbook pro", "macbook air", "thinkpad", "ideapad", "vivobook", "zenbook",
               "rog strix", "rog zephyrus", "tuf gaming", "pavilion", "elitebook", "probook",
               "zbook", "omen", "victus", "omnibook", "yoga slim", "yoga pro",
               "legion pro", "legion slim", "ideapad slim", "predator helios",
               "nitro 5", "aspire", "swift go", "nirvana", "excalibur",
               "msi stealth", "msi katana", "msi raider", "msi prestige", "msi modern"],
    excludeIfPresent: ["çantası", "standı", "soğutucu", "klavye kılıfı", "şarj cihazı"],
    confidence: "high",
  },

  // --- Beyaz eşya ---
  {
    slug: "buzdolabi",
    keywords: ["buzdolabı", "no frost", "no-frost", "kombi tipi", "ankastre buzdolabı",
               "alttan donduruculu"],
    excludeIfPresent: ["kapak", "filtre", "raf"],
    confidence: "high",
  },
  {
    slug: "camasir-makinesi",
    keywords: ["çamaşır makinesi", "camasir makinesi", "kurutmalı çamaşır", "ankastre çamaşır"],
    excludeIfPresent: ["deterjanı", "tableti", "yumuşatıcı", "filtre"],
    confidence: "high",
  },
  {
    slug: "bulasik-makinesi",
    keywords: ["bulaşık makinesi", "bulasik makinesi", "ankastre bulaşık"],
    excludeIfPresent: ["deterjanı", "tableti", "tuz", "parlatıcı"],
    confidence: "high",
  },
  {
    slug: "firin-ocak",
    keywords: ["ankastre fırın", "set üstü ocak", "ankastre ocak", "elektrikli fırın",
               "mini fırın"],
    confidence: "high",
  },

  // --- Küçük ev aletleri ---
  {
    slug: "kahve-makinesi",
    keywords: ["kahve makinesi", "espresso makinesi", "kapsül makinesi", "filtre kahve makinesi",
               "moka pot", "french press", "türk kahvesi makinesi"],
    excludeIfPresent: ["filtre kağıdı", "su filtresi", "fincan", "bardağı", "kireç sökücü"],
    confidence: "high",
  },
  {
    slug: "supurge",
    keywords: ["robot süpürge", "dik süpürge", "dikey süpürge", "şarjlı süpürge", "ev süpürgesi",
               "elektrikli süpürge", "torbasız süpürge"],
    excludeIfPresent: ["filtre", "fırça başlığı"],
    confidence: "high",
  },
  {
    slug: "blender-robot",
    keywords: ["blender", "el blender", "smoothie maker", "mutfak robotu", "rondo", "doğrayıcı"],
    confidence: "high",
  },
  {
    slug: "sac-kurutma-sekillendirici",
    keywords: ["saç kurutma", "fön makinesi", "fön cihazı", "saç düzleştirici", "saç maşası",
               "şekillendirici"],
    excludeIfPresent: ["fön başlığı", "yedek başlık"],
    confidence: "high",
  },
  {
    slug: "tost-makinesi",
    keywords: ["tost makinesi", "ızgara tost", "multi grill"],
    confidence: "high",
  },

  // --- Audio ---
  {
    slug: "kulaklik",
    keywords: ["bluetooth kulaklık", "kablosuz kulaklık", "airpods pro", "airpods 2", "airpods 3",
               "kulak içi kulaklık", "kulak üstü kulaklık", "earbuds"],
    excludeIfPresent: ["kılıf", "kasa", "stand", "tutucu"],
    confidence: "high",
  },
  {
    slug: "bluetooth-hoparlor",
    keywords: ["bluetooth hoparlör", "kablosuz hoparlör", "taşınabilir hoparlör"],
    confidence: "high",
  },

  // --- Powerbank ---
  {
    slug: "powerbank",
    keywords: ["powerbank", "taşınabilir şarj", "harici batarya", "yedek şarj cihazı"],
    confidence: "high",
  },

  // --- Drone / kamera ---
  {
    slug: "drone",
    keywords: ["drone", "dji mavic", "dji mini", "dji air", "dji avata"],
    confidence: "high",
  },
  {
    slug: "fotograf-kamera",
    keywords: ["dslr kamera", "mirrorless kamera", "kompakt kamera", "vlog kamera", "fotokapan kamera"],
    excludeIfPresent: ["aksiyon kamera", "tripod"],
    confidence: "high",
  },
  {
    slug: "aksiyon-kamera",
    keywords: ["gopro hero", "aksiyon kamera", "action camera"],
    excludeIfPresent: ["ekran koruyucu", "kılıf", "kasa"],
    confidence: "high",
  },

  // --- Kıyafet (en büyük niş) ---
  {
    slug: "erkek-ayakkabi-sneaker",
    keywords: ["erkek sneaker", "erkek spor ayakkabı", "spor ayakkabı erkek", "sneaker erkek"],
    confidence: "high",
  },
  {
    slug: "erkek-ayakkabi-bot",
    keywords: ["erkek bot", "erkek çizme", "bot erkek"],
    confidence: "high",
  },
  {
    slug: "erkek-ayakkabi-klasik",
    keywords: ["klasik erkek ayakkabı", "erkek klasik ayakkabı", "deri damatlık", "damatlık erkek ayakkabı"],
    confidence: "high",
  },
  {
    slug: "erkek-giyim-ust",
    keywords: ["erkek gömlek", "erkek tişört", "erkek sweat", "erkek hırka", "erkek kazak",
               "erkek polo", "erkek t-shirt"],
    excludeIfPresent: ["kadın"],
    confidence: "high",
  },
  {
    slug: "erkek-giyim-alt",
    keywords: ["erkek pantolon", "erkek jean", "erkek eşofman alt", "erkek şort",
               "pantolon erkek"],
    excludeIfPresent: ["kadın"],
    confidence: "high",
  },
  {
    slug: "erkek-dis-giyim",
    keywords: ["erkek mont", "erkek ceket", "erkek kaban", "erkek puffer", "erkek deri ceket"],
    excludeIfPresent: ["kadın", "çocuk"],
    confidence: "high",
  },
  {
    slug: "kadin-giyim-ust",
    keywords: ["kadın bluz", "kadın tişört", "kadın gömlek", "kadın hırka", "kadın kazak",
               "kadın tunik", "büyük beden bluz"],
    excludeIfPresent: ["erkek"],
    confidence: "high",
  },
  {
    slug: "kadin-giyim-alt",
    keywords: ["kadın etek", "kadın pantolon", "kadın elbise", "kapri", "tayt"],
    excludeIfPresent: ["erkek"],
    confidence: "high",
  },
  {
    slug: "kadin-dis-giyim",
    keywords: ["kadın mont", "kadın ceket", "kadın kaban", "kadın trençkot"],
    excludeIfPresent: ["erkek"],
    confidence: "high",
  },
  {
    slug: "esofman-spor-giyim",
    keywords: ["eşofman takım", "spor takım", "fitness tayt", "spor tayt", "fitness şort",
               "yoga taytı", "koşu taytı"],
    confidence: "high",
  },
  {
    slug: "canta-cuzdan",
    keywords: ["sırt çantası", "el çantası", "omuz çantası", "kadın çanta", "erkek çanta",
               "deri cüzdan", "kart çantası", "okul çantası", "spor çantası"],
    confidence: "high",
  },

  // --- Cilt bakım / makyaj ---
  {
    slug: "cilt-bakim",
    keywords: ["nemlendirici krem", "nemlendirici", "yüz bakım", "yüz kremi", "anti-aging",
               "vitamin c serum", "hyaluronic", "yüz serumu", "göz kremi", "leke kremi",
               "akne kremi", "güneş kremi", "spf "],
    excludeIfPresent: ["saç", "el kremi"],
    confidence: "high",
  },
  {
    slug: "makyaj",
    keywords: ["far paleti", "makyaj paleti", "fondöten", "kapatıcı", "pudra",
               "eyeliner", "maskara", "kaş kalemi", "allık", "highlighter"],
    confidence: "high",
  },
  {
    slug: "dudak-makyaji",
    keywords: ["ruj", "lip gloss", "dudak parlatıcı", "lip balm", "lip stain"],
    confidence: "high",
  },
  {
    slug: "sac-bakim",
    keywords: ["şampuan", "saç kremi", "saç maskesi", "saç bakım", "saç serumu",
               "kuru şampuan", "saç boyası"],
    excludeIfPresent: ["fön", "kurutma", "düzleştirici", "saç fırçası"],
    confidence: "high",
  },
  {
    slug: "parfum",
    keywords: ["parfüm", "edt ", "edp ", "eau de toilette", "eau de parfum", "kolonya"],
    excludeIfPresent: ["deodorant"],
    confidence: "high",
  },
  {
    slug: "deodorant",
    keywords: ["deodorant", "roll-on", "antiperspirant", "deostick"],
    confidence: "high",
  },
  {
    slug: "agiz-dis-bakim",
    keywords: ["diş macunu", "diş fırçası", "elektrikli diş fırçası", "ağız bakım",
               "diş ipi", "ağız gargarası"],
    confidence: "high",
  },

  // --- Spor / outdoor ---
  {
    slug: "kamp-outdoor",
    keywords: ["kamp çadırı", "uyku tulumu", "kamp sandalyesi", "termos", "kamp seti",
               "outdoor sırt çantası"],
    confidence: "high",
  },
  {
    slug: "fitness-kondisyon",
    keywords: ["dumbell", "dambıl", "kettlebell", "yoga matı", "yoga blok",
               "fitness band", "direnç bandı", "spor bandı"],
    confidence: "high",
  },

  // --- Ev tekstili ---
  {
    slug: "ev-tekstili",
    keywords: ["havlu", "yorgan", "çarşaf", "nevresim takımı", "yastık kılıfı", "battaniye",
               "perde", "tül perde", "halı kilim", "halı yıkama", "minder", "yatak örtüsü",
               "pike", "oda halısı", "salon halısı"],
    confidence: "high",
  },

  // --- Gıda / atıştırmalık ---
  {
    slug: "atistirmalik-cikolata",
    keywords: ["çikolata", "gofret", "bisküvi", "kraker", "cips", "atıştırmalık",
               "gummi", "şekerleme", "kuruyemiş", "fıstık", "badem", "fındık",
               "kahve çekirdek"],
    excludeIfPresent: ["kahve makinesi"],
    confidence: "high",
  },
  {
    slug: "dondurma-tatli",
    keywords: ["dondurma", "tatlı şurubu", "puding", "şerbet"],
    confidence: "high",
  },
  {
    slug: "bakliyat-makarna",
    keywords: ["makarna", "pirinç", "mercimek", "nohut", "bulgur", "fasulye",
               "kuru bakliyat"],
    confidence: "high",
  },

  // --- Kitap ---
  {
    slug: "kitap-hobi",
    keywords: ["roman kitap", "edebiyat kitap", "hikaye kitap", "şiir kitap",
               "hobi kitap", "kişisel gelişim", "biyografi", "tarih kitap"],
    confidence: "high",
  },
  {
    slug: "cocuk-kitaplari",
    keywords: ["çocuk kitap", "boyama kitap", "masal kitap", "okul öncesi kitap",
               "yaş çocuk kitap"],
    confidence: "high",
  },
  {
    slug: "kirtasiye",
    keywords: ["defter", "kalem seti", "boya kalem", "silgi", "kalemtraş",
               "yapışkan not", "post-it", "klasör", "okul seti"],
    confidence: "high",
  },

  // --- Oyuncak ---
  {
    slug: "oyuncak-lego",
    keywords: ["lego ", "lego seti", "lego classic", "lego star wars", "lego city",
               "lego technic", "lego friends", "lego ninjago"],
    confidence: "high",
  },
  {
    slug: "oyuncak-figur",
    keywords: ["aksiyon figür", "koleksiyon figür", "anime figür", "marvel figür"],
    confidence: "high",
  },
  {
    slug: "oyuncak-egitici",
    keywords: ["eğitici oyuncak", "puzzle 1000", "puzzle 500", "yapboz", "ahşap puzzle",
               "okul öncesi oyuncak", "montessori"],
    confidence: "high",
  },
  {
    slug: "oyuncak-rc",
    keywords: ["rc araba", "uzaktan kumandalı araç", "rc helikopter", "rc drone"],
    confidence: "high",
  },
  {
    slug: "oyuncak-diger",
    keywords: ["bebek arabası", "oyuncak araba", "peluş oyuncak", "oyuncak set"],
    confidence: "medium",
  },

  // --- Otomotiv ---
  {
    slug: "arac-aksesuar",
    keywords: ["araç paspas", "araç koltuk kılıfı", "direksiyon kılıfı", "araç aroma",
               "araç telefon tutucu", "araç şarj", "oto temizleme", "araç kamera"],
    excludeIfPresent: ["telefon kılıfı"],
    confidence: "high",
  },
  {
    slug: "arac-elektronigi",
    keywords: ["araç multimedia", "carbon araç teyp", "araç dvd", "geri görüş kamerası",
               "araç gps", "araç dashcam"],
    confidence: "high",
  },
  {
    slug: "oto-aku",
    keywords: ["otomotiv akü", "akü 12v", "12v 60ah akü", "12v 70ah akü", "12v 75ah akü",
               "araba aküsü"],
    confidence: "high",
  },

  // --- El aletleri ---
  {
    slug: "el-aletleri",
    keywords: ["matkap seti", "tornavida seti", "alet çantası", "el matkabı", "tornavida",
               "akülü matkap", "vidalama makinesi", "şarjlı matkap"],
    confidence: "high",
  },
  {
    slug: "elektrikli-aletler",
    keywords: ["taşlama makinesi", "şarjlı vidalama", "spiral makinesi", "kompresör",
               "darbeli matkap", "kırıcı delici", "lehim havyası"],
    confidence: "high",
  },

  // --- Aydınlatma / Ev yaşam ---
  {
    slug: "aydinlatma",
    keywords: ["led ampul", "akıllı ampul", "spot lamba", "avize", "abajur",
               "led şerit", "masa lambası", "gece lambası", "led panel"],
    confidence: "high",
  },
  {
    slug: "bahce-balkon",
    keywords: ["bahçe seti", "balkon seti", "bbq mangal", "barbekü", "şezlong",
               "bahçe sandalye", "şemsiye balkon"],
    confidence: "high",
  },

  // --- Pet ---
  {
    slug: "pet-shop",
    keywords: ["kedi maması", "köpek maması", "kuş yemi", "balık yemi", "kedi kumu",
               "köpek kumu", "kedi oyuncak", "köpek tasması"],
    confidence: "high",
  },

  // --- Networking ---
  {
    slug: "networking",
    keywords: ["wi-fi router", "wi-fi 6", "wi-fi 7", "mesh router", "access point",
               "ethernet switch", "tp-link router", "asus router", "netgear router",
               "huawei router", "5g modem", "4g modem", "modem router", "wifi tekrarlayıcı",
               "powerline adapter"],
    confidence: "high",
  },

  // --- Bilgisayar bileşenleri (genişlet) ---
  {
    slug: "bilgisayar-bilesenleri",
    keywords: ["anakart", "ekran kartı", "rtx 4060", "rtx 4070", "rtx 4080", "rtx 4090",
               "rtx 5070", "rtx 5080", "rtx 5090", "intel core i5", "intel core i7",
               "intel core i9", "ryzen 5", "ryzen 7", "ryzen 9", "ryzen ai",
               "işlemci soğutucu", "cpu fan", "cpu air cooler", "psu güç kaynağı",
               "750w psu", "850w psu", "1000w psu"],
    confidence: "high",
  },

  // --- Spor ayakkabı / fitness ---
  {
    slug: "spor-ayakkabi",
    keywords: ["koşu ayakkabısı", "running shoes", "spor ayakkabı erkek", "spor ayakkabı kadın",
               "tenis ayakkabısı", "basketbol ayakkabısı"],
    excludeIfPresent: ["bot", "klasik"],
    confidence: "high",
  },
  {
    slug: "spor-outdoor",
    keywords: ["trekking", "kamp ekipman", "termal mont", "outdoor mont", "softshell"],
    confidence: "medium",
  },

  // --- Saat & Takı ---
  {
    slug: "saat-taki",
    keywords: ["kol saati", "erkek kol saati", "kadın kol saati", "kuvars saat",
               "altın kaplama", "925 ayar gümüş", "925 ayar", "altın kolye", "altın bilezik"],
    excludeIfPresent: ["akıllı saat", "smart watch", "garmin"],
    confidence: "high",
  },

  // --- Telefon aksesuar (Gpack genişlet) ---
  {
    slug: "telefon-aksesuar",
    keywords: ["gpack ", "spigen ", "ringke ", "uyumlu kordon", "saat kayışı",
               "watch kayışı", "spor band", "fitness band"],
    excludeIfPresent: ["telefon kılıfı", "akıllı saat ana"],
    confidence: "high",
  },

  // --- Güneş koruyucu ---
  {
    slug: "gunes-koruyucu",
    keywords: ["güneş kremi", "spf 30", "spf 50", "spf 50+", "sun protection",
               "güneşten koruyucu", "güneş bakım"],
    confidence: "high",
  },

  // --- Mutfak sofra ---
  {
    slug: "mutfak-sofra",
    keywords: ["yemek takımı", "porselen yemek", "12 parça yemek", "tencere seti",
               "çatal kaşık seti", "tabak seti", "kahve fincanı seti", "demlik takımı",
               "saklama kabı seti"],
    confidence: "high",
  },

  // --- Küçük ev aletleri ---
  {
    slug: "kucuk-ev-aletleri",
    keywords: ["air fryer", "yağsız fritöz", "ekmek kızartma", "tost makinesi",
               "su ısıtıcı", "kettle", "yumurta pişirici", "yoğurt makinesi",
               "et kıyma", "narenciye sıkacak"],
    confidence: "high",
  },

  // --- Kişisel bakım ---
  {
    slug: "kisisel-hijyen",
    keywords: ["sabun", "duş jeli", "kolonya el", "antibakteriyel jel",
               "ıslak mendil", "tıraş bıçağı", "tıraş köpüğü"],
    confidence: "high",
  },
  {
    slug: "kisisel-bakim-elektrikli",
    keywords: ["sakal kesme", "tıraş makinesi", "epilasyon", "ipl", "burun kıl",
               "manikür seti", "elektrikli diş fırçası"],
    confidence: "high",
  },

  // --- Mobilya ofis ---
  {
    slug: "mobilya-ofis",
    keywords: ["ofis koltuğu", "çalışma masası", "oyuncu koltuğu", "gaming koltuk",
               "ergonomik koltuk", "çalışma sandalye", "bilgisayar masası"],
    confidence: "high",
  },

  // --- Pet aksesuar ---
  {
    slug: "pet-aksesuar",
    keywords: ["kedi tasması", "köpek tasması", "kedi yatağı", "köpek yatağı",
               "kedi mama kabı", "köpek mama kabı", "kedi tırmalama"],
    confidence: "high",
  },

  // --- Bebek ---
  {
    slug: "bebek-bezi",
    keywords: ["bebek bezi", "prima bebek bezi", "huggies"],
    confidence: "high",
  },
  {
    slug: "bebek-mama",
    keywords: ["bebek maması", "devam sütü", "biberon maması"],
    confidence: "high",
  },
  {
    slug: "biberon-emzik",
    keywords: ["biberon", "emzik", "biberon temizleyici"],
    confidence: "high",
  },

  // --- Televizyon ---
  {
    slug: "televizyon",
    keywords: ["smart tv", "led tv", "oled tv", "qled tv", "uhd tv", "4k tv", "8k tv",
               "android tv", "google tv",
               "ultra hd (4k) tv", "tv 4k", "55 inç tv", "65 inç tv", "75 inç tv",
               "lg ultra hd", "tcl 4k", "samsung qled", "beko crystal pro"],
    excludeIfPresent: ["askı", "kumanda", "duvar", "stand", "kablosu", "yedek"],
    confidence: "high",
  },

  // --- Buzdolabı/Beyaz eşya ek ---
  {
    slug: "firin-ocak",
    keywords: ["ocaklı", "ocaklı fırın", "siemens fırın", "ankastre buhar destekli"],
    confidence: "high",
  },
  {
    slug: "guvenlik-kamerasi",
    keywords: ["güvenlik kamerası", "outdoor güvenlik", "dış mekan güvenlik kamerası",
               "wi-fi 5mp outdoor", "ip kamera"],
    confidence: "high",
  },
];

function normalize(s: string): string {
  return s.toLowerCase()
    .replace(/ı/g, "i").replace(/İ/g, "i")
    .replace(/ş/g, "s").replace(/Ş/g, "s")
    .replace(/ğ/g, "g").replace(/Ğ/g, "g")
    .replace(/ü/g, "u").replace(/Ü/g, "u")
    .replace(/ö/g, "o").replace(/Ö/g, "o")
    .replace(/ç/g, "c").replace(/Ç/g, "c")
    .trim();
}

export function categorizeFromTitle(title: string): CategoryMatchResult {
  if (!title) return { slug: null, confidence: "low" };
  const norm = normalize(title);

  for (const rule of RULES) {
    let matchedKw: string | null = null;
    for (const kw of rule.keywords) {
      if (norm.includes(normalize(kw))) {
        matchedKw = kw;
        break;
      }
    }
    if (!matchedKw) continue;

    if (rule.excludeIfPresent) {
      const hasExclude = rule.excludeIfPresent.some((ex) => norm.includes(normalize(ex)));
      if (hasExclude) continue;
    }

    return {
      slug: rule.slug,
      confidence: rule.confidence ?? "high",
      matchedKeyword: matchedKw,
    };
  }

  return { slug: null, confidence: "low" };
}
