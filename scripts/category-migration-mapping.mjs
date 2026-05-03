/**
 * scripts/category-migration-mapping.mjs
 *
 * Eski flat kategori slug → yeni hierarchik slug mapping
 * Migration 022 (migrate-products-to-new-categories) tarafından kullanılır.
 *
 * Kapsam: Mevcut DB'deki TÜM flat slug'lar bu mapping'de yer almalı.
 * Eksik mapping varsa script DRY-RUN raporlar ve ürün taşıma SKIP eder.
 *
 * NOT: 14 yeni root (elektronik, beyaz-esya, vb.) zaten hierarchik;
 * mapping'de YOK. Eski flat sub-kategoriler taşınır.
 *
 * SİNİFLANDİRİLMAMIŞ: tutulur (null mapping = skip).
 */

export const CATEGORY_MIGRATION_MAP = {
  // ════════════════════════════════════════════════
  // ELEKTRONİK
  // ════════════════════════════════════════════════
  "akilli-telefon": "elektronik/telefon/akilli-telefon",
  "telefon-kilifi": "elektronik/telefon/kilif",
  "ekran-koruyucu": "elektronik/telefon/ekran-koruyucu",
  "sarj-kablo": "elektronik/telefon/sarj-kablo",
  "powerbank": "elektronik/telefon/powerbank",
  "telefon-aksesuar": "elektronik/telefon/aksesuar",
  "telefon-yedek-parca": "elektronik/telefon/yedek-parca",
  "laptop": "elektronik/bilgisayar-tablet/laptop",
  "masaustu-bilgisayar": "elektronik/bilgisayar-tablet/masaustu",
  "tablet": "elektronik/bilgisayar-tablet/tablet",
  "bilgisayar-bilesenleri": "elektronik/bilgisayar-tablet/bilesenler",
  "bilgisayar-cevre": "elektronik/bilgisayar-tablet/klavye-mouse",
  "monitor": "elektronik/bilgisayar-tablet/monitor",
  "klavye-mouse-webcam": "elektronik/bilgisayar-tablet/klavye-mouse",
  "yazici-tarayici": "elektronik/bilgisayar-tablet/yazici",
  "tv": "elektronik/tv-ses-goruntu/televizyon",
  "televizyon": "elektronik/tv-ses-goruntu/televizyon",
  "tv-aksesuar": "elektronik/tv-ses-goruntu/tv-aksesuar",
  "projeksiyon": "elektronik/tv-ses-goruntu/projeksiyon",
  "kulaklik": "elektronik/tv-ses-goruntu/kulaklik",
  "ses-kulaklik": "elektronik/tv-ses-goruntu/kulaklik",
  "bluetooth-hoparlor": "elektronik/tv-ses-goruntu/bluetooth-hoparlor",
  "soundbar": "elektronik/tv-ses-goruntu/soundbar",
  "soundbar-ev-sinema": "elektronik/tv-ses-goruntu/soundbar",
  "fotograf-makinesi": "elektronik/kamera/fotograf-makinesi",
  "fotograf-kamera": "elektronik/kamera/fotograf-makinesi",
  "aksiyon-kamera": "elektronik/kamera/aksiyon-kamera",
  "drone": "elektronik/kamera/drone",
  "oyun-konsol": "elektronik/oyun/konsol",
  "akilli-saat": "elektronik/giyilebilir/akilli-saat",
  "modem-ag": "elektronik/ag-guvenlik/modem",
  "networking": "elektronik/ag-guvenlik/modem",
  "guvenlik-kamerasi": "elektronik/ag-guvenlik/guvenlik-kamera",

  // ════════════════════════════════════════════════
  // BEYAZ EŞYA
  // ════════════════════════════════════════════════
  "buzdolabi": "beyaz-esya/buzdolabi",
  "camasir-makinesi": "beyaz-esya/camasir-makinesi",
  "bulasik-makinesi": "beyaz-esya/bulasik-makinesi",
  "kurutma-makinesi": "beyaz-esya/kurutma-makinesi",
  "klima": "beyaz-esya/klima",
  "firin": "beyaz-esya/firin-ocak",
  "firin-ocak": "beyaz-esya/firin-ocak",
  "mikrodalga": "beyaz-esya/mikrodalga",
  "aspirator-davlumbaz": "beyaz-esya/aspirator-davlumbaz",
  "isitici": "beyaz-esya/isitici-soba",
  "isitici-soba": "beyaz-esya/isitici-soba",

  // ════════════════════════════════════════════════
  // KÜÇÜK EV ALETLERİ
  // ════════════════════════════════════════════════
  "blender": "kucuk-ev-aletleri/mutfak/blender",
  "blender-robot": "kucuk-ev-aletleri/mutfak/blender-mutfak-robotu",
  "mikser-cirpici": "kucuk-ev-aletleri/mutfak/mikser",
  "tost-makinesi": "kucuk-ev-aletleri/mutfak/tost-makinesi",
  "fritoz-airfryer": "kucuk-ev-aletleri/mutfak/airfryer",
  "kahve-makinesi": "kucuk-ev-aletleri/mutfak/kahve-makinesi",
  "su-isiticisi": "kucuk-ev-aletleri/mutfak/su-isiticisi",
  "su-isiticisi-cay-makinesi": "kucuk-ev-aletleri/mutfak/su-isiticisi",
  "mutfak-aleti-diger": "kucuk-ev-aletleri/mutfak/diger",
  "diger-mutfak-aletleri": "kucuk-ev-aletleri/mutfak/diger",
  "supurge": "kucuk-ev-aletleri/temizlik/supurge",
  "robot-supurge": "kucuk-ev-aletleri/temizlik/robot-supurge",
  "sac-kurutma-sekillendirici": "kucuk-ev-aletleri/kisisel-bakim/sac-kurutma",
  "kisisel-bakim-elektrikli": "kucuk-ev-aletleri/kisisel-bakim/diger",
  "kisisel-bakim-cihazlari": "kucuk-ev-aletleri/kisisel-bakim/diger",
  "utu": "kucuk-ev-aletleri/ev-cihazlari/utu",
  "tarti-terazi": "kucuk-ev-aletleri/ev-cihazlari/tarti",
  "hava-temizleyici": "kucuk-ev-aletleri/ev-cihazlari/hava-temizleyici",
  "hava-temizleyici-nemlendirici": "kucuk-ev-aletleri/ev-cihazlari/hava-temizleyici",

  // ════════════════════════════════════════════════
  // MODA
  // ════════════════════════════════════════════════
  "kadin-giyim-ust": "moda/kadin-giyim/ust",
  "kadin-ust-giyim": "moda/kadin-giyim/ust",
  "kadin-giyim-alt": "moda/kadin-giyim/alt",
  "kadin-alt-giyim": "moda/kadin-giyim/alt",
  "kadin-etek": "moda/kadin-giyim/etek",
  "kadin-elbise": "moda/kadin-giyim/elbise",
  "kadin-dis-giyim": "moda/kadin-giyim/dis-giyim",
  "ic-giyim": "moda/kadin-giyim/ic-giyim",
  "ic-giyim-pijama": "moda/kadin-giyim/ic-giyim",
  "erkek-giyim-ust": "moda/erkek-giyim/ust",
  "erkek-giyim-alt": "moda/erkek-giyim/alt",
  "erkek-dis-giyim": "moda/erkek-giyim/dis-giyim",
  "erkek-takim-elbise": "moda/erkek-giyim/takim-elbise",
  "takim-elbise-smokin": "moda/erkek-giyim/takim-elbise",
  "esofman-spor-giyim": "moda/erkek-giyim/esofman",
  "kadin-ayakkabi-sneaker": "moda/kadin-ayakkabi/sneaker",
  "kadin-ayakkabi-bot": "moda/kadin-ayakkabi/bot",
  "kadin-ayakkabi-babet": "moda/kadin-ayakkabi/babet",
  "kadin-babet": "moda/kadin-ayakkabi/babet",
  "kadin-ayakkabi-sandalet": "moda/kadin-ayakkabi/sandalet",
  "sandalet-babet-terlik": "moda/kadin-ayakkabi/sandalet",
  "kadin-ayakkabi-topuklu": "moda/kadin-ayakkabi/topuklu",
  "topuklu-ayakkabi": "moda/kadin-ayakkabi/topuklu",
  "erkek-ayakkabi-sneaker": "moda/erkek-ayakkabi/sneaker",
  "erkek-ayakkabi-bot": "moda/erkek-ayakkabi/bot",
  "erkek-ayakkabi-klasik": "moda/erkek-ayakkabi/klasik",
  "klasik-erkek-ayakkabi": "moda/erkek-ayakkabi/klasik",
  "spor-ayakkabi": "moda/erkek-ayakkabi/sneaker",
  "spor-ayakkabi-genel": "moda/erkek-ayakkabi/sneaker",
  "cocuk-giyim": "moda/cocuk-moda/giyim",
  "cocuk-ayakkabi": "moda/cocuk-moda/ayakkabi",
  "canta-cuzdan": "moda/aksesuar/canta-cuzdan",
  "saat-taki": "moda/aksesuar/saat-taki",
  "gozluk": "moda/aksesuar/gozluk",

  // ════════════════════════════════════════════════
  // KOZMETİK & KİŞİSEL BAKIM
  // ════════════════════════════════════════════════
  "cilt-bakim": "kozmetik/cilt-bakim",
  "kozmetik-bakim": "kozmetik/cilt-bakim",
  "serum-ampul": "kozmetik/cilt-bakim/serum",
  "yuz-maskesi-skincare": "kozmetik/cilt-bakim/maske",
  "yuz-maskesi": "kozmetik/cilt-bakim/maske",
  "yuz-nemlendirici": "kozmetik/cilt-bakim/nemlendirici",
  "yuz-temizleyici": "kozmetik/cilt-bakim/temizleyici",
  "gunes-koruyucu": "kozmetik/cilt-bakim/gunes-koruyucu",
  "makyaj": "kozmetik/makyaj",
  "dudak-makyaji": "kozmetik/makyaj/dudak",
  "goz-makyaji": "kozmetik/makyaj/goz",
  "yuz-makyaji": "kozmetik/makyaj/yuz",
  "makyaj-aksesuar": "kozmetik/makyaj/firca-aksesuar",
  "makyaj-firca-aksesuar": "kozmetik/makyaj/firca-aksesuar",
  "sac-bakim": "kozmetik/sac-bakim/urunler",
  "sampuan": "kozmetik/sac-bakim/sampuan",
  "sac-boyasi": "kozmetik/sac-bakim/boya",
  "sac-sekillendirme": "kozmetik/sac-bakim/sekillendirici",
  "sac-sekillendirici-urun": "kozmetik/sac-bakim/sekillendirici",
  "agiz-dis-bakim": "kozmetik/kisisel-bakim/agiz-dis",
  "agiz-dis-bakimi": "kozmetik/kisisel-bakim/agiz-dis",
  "kisisel-hijyen": "kozmetik/kisisel-bakim/hijyen",
  "deodorant": "kozmetik/kisisel-bakim/deodorant",
  "vucut-bakim": "kozmetik/kisisel-bakim/vucut",
  "vucut-bakimi": "kozmetik/kisisel-bakim/vucut",
  "erkek-bakim": "kozmetik/kisisel-bakim/erkek",
  "erkek-bakimi": "kozmetik/kisisel-bakim/erkek",
  "parfum": "kozmetik/parfum",

  // ════════════════════════════════════════════════
  // EV & YAŞAM
  // ════════════════════════════════════════════════
  "mobilya-oturma": "ev-yasam/mobilya/oturma-odasi",
  "oturma-odasi-mobilya": "ev-yasam/mobilya/oturma-odasi",
  "mobilya-yatak": "ev-yasam/mobilya/yatak-odasi",
  "yatak-odasi-mobilya": "ev-yasam/mobilya/yatak-odasi",
  "mobilya-yemek": "ev-yasam/mobilya/yemek-odasi",
  "yemek-odasi-mobilya": "ev-yasam/mobilya/yemek-odasi",
  "mobilya-ofis": "ev-yasam/mobilya/ofis",
  "ofis-mobilyasi": "ev-yasam/mobilya/ofis",
  "ev-tekstili": "ev-yasam/ev-tekstili",
  "aydinlatma": "ev-yasam/aydinlatma",
  "mutfak-sofra": "ev-yasam/mutfak-sofra",
  "banyo-tuvalet": "ev-yasam/banyo",
  "bahce-balkon": "ev-yasam/bahce-balkon",
  "temizlik-deterjan": "ev-yasam/temizlik",

  // ════════════════════════════════════════════════
  // ANNE & BEBEK
  // ════════════════════════════════════════════════
  "bebek-bezi": "anne-bebek/bebek-bakim/bebek-bezi",
  "islak-mendil": "anne-bebek/bebek-bakim/islak-mendil",
  "bebek-bakim-urunleri": "anne-bebek/bebek-bakim/bakim-urunleri",
  "bebek-guvenligi": "anne-bebek/bebek-bakim/guvenlik",
  "bebek-mama": "anne-bebek/bebek-beslenme/mama",
  "bebek-mamasi": "anne-bebek/bebek-beslenme/mama",
  "biberon-emzik": "anne-bebek/bebek-beslenme/biberon-emzik",
  "puset-araba": "anne-bebek/bebek-tasima/araba-puset",
  "bebek-arabasi-puset": "anne-bebek/bebek-tasima/araba-puset",
  "oto-koltugu": "anne-bebek/bebek-tasima/oto-koltugu",
  "besik-bebek-yatak": "anne-bebek/bebek-tasima/besik",
  "besik-bebek-yatagi": "anne-bebek/bebek-tasima/besik",
  "cocuk-odasi": "anne-bebek/cocuk-odasi",
  "oyuncak-egitici": "anne-bebek/oyuncak/egitici",
  "egitici-oyuncak": "anne-bebek/oyuncak/egitici",
  "oyuncak-lego": "anne-bebek/oyuncak/lego",
  "lego-yapi-bloklari": "anne-bebek/oyuncak/lego",
  "oyuncak-figur": "anne-bebek/oyuncak/figur",
  "figur-oyuncak-bebek": "anne-bebek/oyuncak/figur",
  "oyuncak-rc": "anne-bebek/oyuncak/rc-robot",
  "rc-robot-oyuncak": "anne-bebek/oyuncak/rc-robot",
  "oyuncak-masa": "anne-bebek/oyuncak/masa-oyunu",
  "masa-oyunu-bulmaca": "anne-bebek/oyuncak/masa-oyunu",
  "oyuncak-diger": "anne-bebek/oyuncak/diger",
  "diger-oyuncaklar": "anne-bebek/oyuncak/diger",

  // ════════════════════════════════════════════════
  // SPOR & OUTDOOR
  // ════════════════════════════════════════════════
  "fitness-kondisyon": "spor-outdoor/fitness",
  "kamp-outdoor": "spor-outdoor/kamp",
  "outdoor-kamp": "spor-outdoor/kamp",
  "bisiklet": "spor-outdoor/bisiklet",
  "scooter": "spor-outdoor/scooter",
  "spor-cantasi": "spor-outdoor/spor-cantasi",
  "yoga-pilates": "spor-outdoor/yoga-pilates",
  "su-sporlari": "spor-outdoor/su-sporlari",
  "takim-sporlari": "spor-outdoor/takim-sporlari",

  // ════════════════════════════════════════════════
  // SAĞLIK & VİTAMİN
  // ════════════════════════════════════════════════
  "spor-besin": "saglik-vitamin/spor-besin",
  "spor-besin-takviyesi": "saglik-vitamin/spor-besin",
  "vitamin-mineral": "saglik-vitamin/vitamin-mineral",
  "bitkisel": "saglik-vitamin/bitkisel",
  "bitkisel-saglik": "saglik-vitamin/bitkisel",

  // ════════════════════════════════════════════════
  // OTOMOTİV
  // ════════════════════════════════════════════════
  "arac-aksesuar": "otomotiv/arac-aksesuar",
  "arac-elektronigi": "otomotiv/arac-elektronigi",
  "lastik-jant": "otomotiv/lastik-jant",
  "oto-lastik-jant": "otomotiv/lastik-jant",
  "motor-scooter": "otomotiv/motor-scooter",
  "oto-yag-bakim": "otomotiv/motor-yagi-bakim",
  "motor-yagi-bakim": "otomotiv/motor-yagi-bakim",
  "oto-navigasyon": "otomotiv/navigasyon",
  "navigasyon-gps": "otomotiv/navigasyon",
  "oto-aku": "otomotiv/oto-aku",
  "oto-yedek-parca": "otomotiv/oto-yedek-parca",
  "oto-teyp-multimedya": "otomotiv/teyp-multimedya",
  "teyp-multimedya": "otomotiv/teyp-multimedya",

  // ════════════════════════════════════════════════
  // SÜPERMARKET
  // ════════════════════════════════════════════════
  "atistirmalik-cikolata": "supermarket/gida-icecek/atistirmalik",
  "bakliyat-makarna": "supermarket/gida-icecek/bakliyat-makarna",
  "dondurma-tatli": "supermarket/gida-icecek/dondurma-tatli",
  "icecek": "supermarket/gida-icecek/icecek",
  "kahvalti-kahve": "supermarket/gida-icecek/kahvalti-kahve",
  "kahve": "supermarket/gida-icecek/kahve",
  "konserve-sos": "supermarket/gida-icecek/konserve-sos",

  // ════════════════════════════════════════════════
  // YAPI MARKET
  // ════════════════════════════════════════════════
  "el-aletleri": "yapi-market/el-aletleri",
  "elektrikli-aletler": "yapi-market/elektrikli-aletler",
  "hirdavat": "yapi-market/hirdavat",
  "hirdavat-vida": "yapi-market/hirdavat",
  "olcum-aletleri": "yapi-market/olcum",
  "boya-malzeme": "yapi-market/boya",
  "elektrik-malzeme": "yapi-market/elektrik",
  "su-tesisat": "yapi-market/su-tesisati",
  "su-tesisati": "yapi-market/su-tesisati",

  // ════════════════════════════════════════════════
  // HOBİ & EĞLENCE
  // ════════════════════════════════════════════════
  "kitap": "hobi-eglence/kitap-kirtasiye/kitap",
  "cocuk-kitaplari": "hobi-eglence/kitap-kirtasiye/cocuk-kitap",
  "kirtasiye": "hobi-eglence/kitap-kirtasiye/kirtasiye",
  "kirtasiye-okul": "hobi-eglence/kitap-kirtasiye/kirtasiye",
  "film-dizi": "hobi-eglence/kitap-kirtasiye/film-dizi",
  "muzik-aleti": "hobi-eglence/sanat-muzik/muzik-aleti",
  "resim-cizim": "hobi-eglence/sanat-muzik/resim",
  "el-sanatlari": "hobi-eglence/sanat-muzik/el-sanatlari",
  "kitap-hobi": null,
  "koleksiyon": "hobi-eglence/koleksiyon",
  "parti-eglence": "hobi-eglence/parti",

  // ════════════════════════════════════════════════
  // PET SHOP
  // ════════════════════════════════════════════════
  "kedi-mamasi": "pet-shop/kedi/mama",
  "kedi-kumu": "pet-shop/kedi/kum",
  "kopek-mamasi": "pet-shop/kopek/mama",
  "akvaryum": "pet-shop/akvaryum",
  "akvaryum-balik": "pet-shop/akvaryum",
  "kus-urunleri": "pet-shop/kus",
  "pet-aksesuar": "pet-shop/aksesuar",
  "pet-bakim-hijyen": "pet-shop/bakim-hijyen",
  "pet-diger": "pet-shop/diger",
  "diger-evcil-hayvan": "pet-shop/diger",

  // ════════════════════════════════════════════════
  // PRESERVED (taşıma yok, null = skip)
  // ════════════════════════════════════════════════
  "siniflandirilmamis": null,
};

export const NEW_ROOTS = [
  "elektronik", "beyaz-esya", "kucuk-ev-aletleri", "moda", "kozmetik",
  "ev-yasam", "anne-bebek", "spor-outdoor", "saglik-vitamin", "otomotiv",
  "supermarket", "yapi-market", "hobi-eglence", "pet-shop",
];

export const PRESERVED_SLUGS = ["siniflandirilmamis", ...NEW_ROOTS];
