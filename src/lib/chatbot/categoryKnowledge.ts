export type UsageProfile = {
  id: string;
  triggers: string[];
  retrievalTerms: string[];
  tip: string;
  rankingSignals?: string[];
};

type CategoryKnowledgeEntry = {
  keys: string[];
  baseTip: string;
  profiles: UsageProfile[];
};

export type CategoryRankingContext = {
  categorySlug: string | null;
  usageProfileId: string | null;
  signalTerms: string[];
};

const CATEGORY_KNOWLEDGE: CategoryKnowledgeEntry[] = [
  {
    keys: ["telefon", "akilli-telefon"],
    baseTip: "Telefonda performans, kamera, pil omru ve depolama dengesi onemlidir.",
    profiles: [
      {
        id: "oyun",
        triggers: ["oyun", "gaming", "fps"],
        retrievalTerms: ["oyun telefonu", "guclu islemci", "yuksek yenileme"],
        tip: "Oyun telefonlarinda guclu islemci, sogutma ve yuksek yenileme hizi one cikar.",
        rankingSignals: [
          "snapdragon 8",
          "dimensity 9",
          "a17",
          "a18",
          "120 hz",
          "144 hz",
          "oyuncu telefonu",
        ],
      },
      {
        id: "kamera",
        triggers: ["kamera", "fotograf", "video", "cekim"],
        retrievalTerms: ["kamera telefonu", "gece cekimi", "optik sabitleme"],
        tip: "Kamera odakli telefonlarda gece cekimi, sabitleme ve sensor kalitesi daha onemlidir.",
        rankingSignals: [
          "kamera",
          "50 mp",
          "108 mp",
          "200 mp",
          "ois",
          "optik sabitleme",
          "4k",
        ],
      },
      {
        id: "pil",
        triggers: ["pil", "sarj", "batarya"],
        retrievalTerms: ["uzun pil omru", "hizli sarj", "buyuk batarya"],
        tip: "Pil odakli telefonlarda batarya kapasitesi ve hizli sarj destegi kritik olur.",
        rankingSignals: [
          "5000 mah",
          "6000 mah",
          "67 w",
          "80 w",
          "100 w",
          "hizli sarj",
        ],
      },
    ],
  },
  {
    keys: ["laptop", "notebook"],
    baseTip: "Laptop secerken kullanim amaci, tasinabilirlik, ekran ve performans dengesi onemlidir.",
    profiles: [
      {
        id: "oyun",
        triggers: ["oyun", "gaming", "fps"],
        retrievalTerms: ["oyun laptopu", "ekran karti", "yuksek hz"],
        tip: "Oyun laptoplarinda ekran karti, sogutma ve yuksek yenileme hizi daha belirleyicidir.",
        rankingSignals: [
          "rtx",
          "gtx",
          "geforce",
          "radeon",
          "ekran karti",
          "144 hz",
          "165 hz",
          "240 hz",
        ],
      },
      {
        id: "ofis",
        triggers: ["ofis", "is", "is icin", "gunluk"],
        retrievalTerms: ["hafif laptop", "uzun pil", "sessiz"],
        tip: "Ofis laptoplarinda hafiflik, pil omru ve sessiz calisma daha on plandadir.",
        rankingSignals: ["hafif", "uzun pil", "sessiz", "ince", "tasinabilir"],
      },
      {
        id: "tasarim",
        triggers: ["tasarim", "render", "mimarlik", "video edit", "kurgu"],
        retrievalTerms: ["renk dogrulugu", "guclu ram", "yaratici laptop"],
        tip: "Tasarim laptoplarinda ekran dogrulugu, ram ve islemci gucu daha onemlidir.",
        rankingSignals: [
          "oled",
          "ips",
          "100 srgb",
          "32 gb",
          "yaratici",
          "render",
        ],
      },
    ],
  },
  {
    keys: ["tablet", "ipad"],
    baseTip: "Tablette ekran boyutu, kalem destegi, tasinabilirlik ve pil omru dengesi onemlidir.",
    profiles: [
      {
        id: "not-alma",
        triggers: ["not alma", "ders", "okul", "universite"],
        retrievalTerms: ["kalem destekli tablet", "hafif tablet", "uzun pil"],
        tip: "Not alma icin hafif, kalem destekli ve pili uzun giden tabletler daha uygundur.",
      },
      {
        id: "cizim",
        triggers: ["cizim", "tasarim", "illustrasyon"],
        retrievalTerms: ["cizim tableti", "kalem hassasiyeti", "buyuk ekran"],
        tip: "Cizim odakli tabletlerde kalem hassasiyeti ve ekran kalitesi daha on plandadir.",
      },
      {
        id: "oyun",
        triggers: ["oyun", "gaming"],
        retrievalTerms: ["oyun tableti", "guclu cip", "120 hz"],
        tip: "Oyun tabletlerinde guclu cip ve yuksek yenileme hizi daha belirleyicidir.",
        rankingSignals: ["120 hz", "144 hz", "m2", "m4", "snapdragon 8"],
      },
    ],
  },
  {
    keys: ["akilli-saat", "saat", "watch"],
    baseTip: "Akilli saatte pil, saglik ozellikleri, spor takibi ve telefon uyumu onemlidir.",
    profiles: [
      {
        id: "spor",
        triggers: ["spor", "kosu", "fitness", "antrenman"],
        retrievalTerms: ["spor saati", "gps", "nabiz takibi"],
        tip: "Spor odakli saatlerde gps, nabiz takibi ve pil suresi daha onemlidir.",
      },
      {
        id: "gunluk",
        triggers: ["gunluk", "is", "bildirim"],
        retrievalTerms: ["gunluk akilli saat", "bildirim", "telefon uyumu"],
        tip: "Gunluk kullanimda bildirimler, rahatlik ve telefon uyumu daha one cikar.",
      },
    ],
  },
  {
    keys: ["kulaklik"],
    baseTip: "Kulaklikta kullanim tipi, konfor, ses karakteri ve baglanti sekli daha onemlidir.",
    profiles: [
      {
        id: "oyun",
        triggers: ["oyun", "gaming", "mikrofon"],
        retrievalTerms: ["oyuncu kulakligi", "dusuk gecikme", "mikrofon"],
        tip: "Oyuncu kulakliklarinda dusuk gecikme ve mikrofon kalitesi daha belirleyicidir.",
        rankingSignals: ["dusuk gecikme", "mikrofon", "kablosuz", "oyuncu"],
      },
      {
        id: "spor",
        triggers: ["spor", "kosu", "antrenman"],
        retrievalTerms: ["spor kulakligi", "ter dayanikli", "kulak ici"],
        tip: "Spor kulakliklarinda hafiflik ve ter dayanikliligi daha on plandadir.",
      },
      {
        id: "muzik",
        triggers: ["muzik", "anc", "gurutu", "ses"],
        retrievalTerms: ["muzik kulakligi", "anc", "ses kalitesi"],
        tip: "Muzik odakli kulakliklarda anc ve ses karakteri daha kritik olur.",
      },
    ],
  },
  {
    keys: ["televizyon", "tv"],
    baseTip: "Televizyonda ekran boyutu, panel tipi ve kullanim amaci secimi ciddi etkiler.",
    profiles: [
      {
        id: "oyun",
        triggers: ["oyun", "ps5", "xbox"],
        retrievalTerms: ["120 hz tv", "hdmi 2.1", "dusuk gecikme"],
        tip: "Oyun icin televizyonlarda 120 Hz, HDMI 2.1 ve dusuk gecikme daha onemlidir.",
        rankingSignals: ["120 hz", "144 hz", "hdmi 2.1", "vrr", "dusuk gecikme"],
      },
      {
        id: "film",
        triggers: ["film", "dizi", "siyahlar", "sinematik"],
        retrievalTerms: ["oled tv", "iyi kontrast", "film tv"],
        tip: "Film odakli televizyonlarda kontrast ve panel kalitesi daha belirleyici olur.",
      },
      {
        id: "spor",
        triggers: ["spor", "mac", "futbol"],
        retrievalTerms: ["akici tv", "yüksek hz", "spor yayini"],
        tip: "Spor yayinlarinda akis ve hareket netligi daha onemli hale gelir.",
      },
    ],
  },
  {
    keys: ["monitor"],
    baseTip: "Monitorde kullanim amaci boyut, panel ve yenileme hizi secimini degistirir.",
    profiles: [
      {
        id: "oyun",
        triggers: ["oyun", "gaming", "fps"],
        retrievalTerms: ["oyuncu monitoru", "144 hz", "1 ms"],
        tip: "Oyuncu monitorlerinde yenileme hizi ve gecikme suresi daha onemlidir.",
        rankingSignals: ["144 hz", "165 hz", "240 hz", "1 ms", "adaptive sync"],
      },
      {
        id: "ofis",
        triggers: ["ofis", "calisma", "excel"],
        retrievalTerms: ["ofis monitoru", "ergonomi", "goz konforu"],
        tip: "Ofis monitorlerinde ergonomi ve goz konforu daha one cikar.",
      },
      {
        id: "tasarim",
        triggers: ["tasarim", "renk", "photoshop", "video edit"],
        retrievalTerms: ["renk dogru monitor", "ips panel", "yaratici monitor"],
        tip: "Tasarim monitorlerinde renk dogrulugu ve panel kalitesi daha onemlidir.",
      },
    ],
  },
  {
    keys: ["kahve-makinesi", "kahve-cay-makinesi"],
    baseTip: "Kahve makinesinde icim turu ve kullanim kolayligi secimi belirler.",
    profiles: [
      {
        id: "espresso",
        triggers: ["espresso"],
        retrievalTerms: ["espresso makinesi", "basinc", "sut kopurtme"],
        tip: "Espresso makinelerinde basinc ve sut kopurtme kabiliyeti daha on plandadir.",
        rankingSignals: ["15 bar", "19 bar", "sut kopurtme", "steam wand"],
      },
      {
        id: "filtre",
        triggers: ["filtre"],
        retrievalTerms: ["filtre kahve makinesi", "demleme", "hazne"],
        tip: "Filtre kahve makinelerinde hazne boyutu ve demleme kolayligi daha onemlidir.",
      },
      {
        id: "kapsul",
        triggers: ["kapsul", "kapsullu"],
        retrievalTerms: ["kapsullu kahve makinesi", "uyumluluk", "pratik"],
        tip: "Kapsullu modellerde kapsul uyumlulugu ve hiz daha on plandadir.",
      },
    ],
  },
  {
    keys: ["robot-supurge"],
    baseTip: "Robot supurgede haritalama, paspas ve ev yapisi secimi sonucu cok etkiler.",
    profiles: [
      {
        id: "evcil-hayvan",
        triggers: ["evcil hayvan", "kedi", "kopek", "tuylu"],
        retrievalTerms: ["evcil hayvan robot supurge", "guclu cekis", "firca"],
        tip: "Evcil hayvan icin robot supurgelerde cekis ve firca tasarimi daha onemlidir.",
        rankingSignals: ["evcil hayvan", "kedi", "kopek", "guclu cekis", "firca"],
      },
      {
        id: "paspas",
        triggers: ["paspas", "silme"],
        retrievalTerms: ["paspasli robot supurge", "su haznesi", "haritalama"],
        tip: "Paspas isteyenlerde su haznesi ve rota yonetimi daha belirleyici olur.",
        rankingSignals: ["paspas", "mop", "su haznesi", "haritalama", "lidar"],
      },
    ],
  },
  {
    keys: ["supurge"],
    baseTip: "Supurgede tip secimi, cekis gucu ve ev yapisi daha onemlidir.",
    profiles: [
      {
        id: "dikey",
        triggers: ["dikey"],
        retrievalTerms: ["dikey supurge", "hafif", "kablosuz"],
        tip: "Dikey modellerde hafiflik ve kablosuz kullanim kolayligi daha one cikar.",
      },
      {
        id: "torbasiz",
        triggers: ["torbasiz"],
        retrievalTerms: ["torbasiz supurge", "hazne", "pratik bosaltma"],
        tip: "Torbasiz modellerde hazne ve filtre bakimi daha onemlidir.",
      },
    ],
  },
  {
    keys: ["buzdolabi"],
    baseTip: "Buzdolabinda hacim, no-frost yapisi ve mutfak alani secimi belirler.",
    profiles: [
      {
        id: "genis-aile",
        triggers: ["genis", "kalabalik aile", "buyuk aile"],
        retrievalTerms: ["genis hacim buzdolabi", "cok kapili", "no frost"],
        tip: "Genis aile kullanimi icin hacim ve raf duzeni daha onemlidir.",
      },
      {
        id: "kucuk-alan",
        triggers: ["kucuk mutfak", "dar alan", "mini"],
        retrievalTerms: ["mini buzdolabi", "dar derinlik", "kompakt"],
        tip: "Kucuk alanlarda kompakt olcu ve kapak acilim rahatligi daha onemlidir.",
      },
    ],
  },
  {
    keys: ["camasir-makinesi", "bulasik-makinesi", "kurutma-makinesi"],
    baseTip: "Beyaz esyada kapasite, enerji verimi ve kullanim sikligi secimi belirler.",
    profiles: [
      {
        id: "kalabalik-aile",
        triggers: ["kalabalik aile", "buyuk aile", "cok yikama"],
        retrievalTerms: ["buyuk kapasiteli", "enerji verimli", "dayanikli"],
        tip: "Kalabalik aile kullaniminda kapasite ve program cesidi daha onemlidir.",
      },
      {
        id: "sessiz",
        triggers: ["sessiz", "gece", "az ses"],
        retrievalTerms: ["sessiz beyaz esya", "dusuk desibel"],
        tip: "Sessiz kullanim istendiginde motor ve desibel seviyesi daha kritik hale gelir.",
      },
    ],
  },
  {
    keys: ["klima"],
    baseTip: "Klimada BTU secimi, alan buyuklugu ve isitma-sogutma dengesi belirleyicidir.",
    profiles: [
      {
        id: "isitma",
        triggers: ["isitma", "kis"],
        retrievalTerms: ["isitma performansi", "inverter klima", "enerji verimi"],
        tip: "Kis kullanimi icin isitma performansi ve inverter verimi daha onemlidir.",
      },
      {
        id: "sogutma",
        triggers: ["sogutma", "yaz", "serin"],
        retrievalTerms: ["hizli sogutma", "uygun btu", "sessiz klima"],
        tip: "Yaz kullaniminda BTU ve sessiz sogutma performansi daha belirleyicidir.",
      },
    ],
  },
  {
    keys: ["parfum", "deodorant"],
    baseTip: "Koku urunlerinde notalar ve kullanim zamani secimi deneyimi degistirir.",
    profiles: [
      {
        id: "fresh",
        triggers: ["fresh", "temiz", "ferah"],
        retrievalTerms: ["fresh parfum", "narenciye", "temiz koku"],
        tip: "Fresh kokularda narenciye ve temiz notalar daha baskin olur.",
      },
      {
        id: "odunsu",
        triggers: ["odunsu", "agir", "gece"],
        retrievalTerms: ["odunsu parfum", "gece parfumu", "amber"],
        tip: "Odunsu kokular genelde gece ve daha belirgin karakter isteyenlere uygundur.",
      },
      {
        id: "ciceksi",
        triggers: ["ciceksi", "lavanta", "meyveli"],
        retrievalTerms: ["ciceksi parfum", "lavanta notasi", "meyveli koku"],
        tip: "Ciceksi ve meyveli kokular daha yumusak ve gunluk kullanima uygun olabilir.",
      },
    ],
  },
  {
    keys: ["serum-ampul", "yuz-nemlendirici", "yuz-temizleyici"],
    baseTip: "Cilt bakiminda cilt tipi ve hedef sorun secimi her seyden daha belirleyicidir.",
    profiles: [
      {
        id: "yagli-cilt",
        triggers: ["yagli cilt", "parlama", "akne"],
        retrievalTerms: ["yagli cilt serum", "hafif doku", "niasinamid"],
        tip: "Yagli ciltte hafif doku ve dengeleyici icerikler daha one cikar.",
      },
      {
        id: "kuru-cilt",
        triggers: ["kuru cilt", "nem", "kuruluk"],
        retrievalTerms: ["kuru cilt serum", "hyaluronik asit", "nemlendirici"],
        tip: "Kuru ciltte nem veren icerikler ve daha yogun destek onemlidir.",
      },
      {
        id: "hassas-cilt",
        triggers: ["hassas", "kizariklik"],
        retrievalTerms: ["hassas cilt bakimi", "parfumsuz", "yatistirici"],
        tip: "Hassas ciltte parfumsuz ve yatistirici icerikler daha guvenli olabilir.",
      },
    ],
  },
  {
    keys: ["elbise", "erkek-giyim", "kadin-giyim", "ayakkabi", "sneaker", "canta"],
    baseTip: "Modada kullanim ortami, beden ve renk secimi sonucu dogrudan etkiler.",
    profiles: [
      {
        id: "gunluk",
        triggers: ["gunluk", "rahat", "casual"],
        retrievalTerms: ["gunluk giyim", "rahat kesim", "temel renk"],
        tip: "Gunluk kullanimda rahatlik ve kolay kombinlenebilir parcalar daha on plandadir.",
      },
      {
        id: "ofis",
        triggers: ["ofis", "is", "resmi"],
        retrievalTerms: ["ofis giyim", "smart casual", "duz renk"],
        tip: "Ofis kullaniminda kesim, sade renkler ve duzgun gorunum daha belirleyici olur.",
      },
      {
        id: "ozel-gun",
        triggers: ["dugun", "davet", "ozel gun", "abiye"],
        retrievalTerms: ["ozel gun elbisesi", "abiye", "topuklu"],
        tip: "Ozel gunlerde tarz kadar rahatlik ve beden uyumu da onemlidir.",
      },
    ],
  },
  {
    keys: ["bebek", "oto-koltugu", "bebek-arabasi"],
    baseTip: "Anne bebek urunlerinde guvenlik, yas araligi ve kullanim kolayligi on plandadir.",
    profiles: [
      {
        id: "yenidogan",
        triggers: ["yenidogan", "0-6 ay"],
        retrievalTerms: ["yenidogan uyumlu", "guvenli", "hafif"],
        tip: "Yenidoğan doneminde guvenlik ve uygun yas araligi en kritik basliktir.",
      },
      {
        id: "seyahat",
        triggers: ["seyahat", "travel", "kabin"],
        retrievalTerms: ["travel sistem", "kabin tipi", "hafif"],
        tip: "Seyahat odakli urunlerde hafiflik ve hizli kapanma daha onemlidir.",
      },
    ],
  },
  {
    keys: ["mama", "kum"],
    baseTip: "Pet urunlerinde yas, ihtiyac ve icerik tercihi secimi belirler.",
    profiles: [
      {
        id: "yavru",
        triggers: ["yavru"],
        retrievalTerms: ["yavru mama", "kolay sindirim", "gelisim destegi"],
        tip: "Yavru urunlerinde gelisim ve sindirim destegi daha onemlidir.",
      },
      {
        id: "tahilsiz",
        triggers: ["tahilsiz"],
        retrievalTerms: ["tahilsiz mama", "protein agirlikli"],
        tip: "Tahilsiz seceneklerde icerik yapisi ve protein dengesi daha dikkatli degerlendirilir.",
      },
      {
        id: "tozsuz",
        triggers: ["tozsuz", "topaklanan", "silika"],
        retrievalTerms: ["tozsuz kedi kumu", "topaklanan kum"],
        tip: "Kum seciminde topaklanma ve toz seviyesi gunluk kullanimda fark yaratir.",
      },
    ],
  },
  {
    keys: ["kahve", "icecek", "atistirmalik", "bakliyat"],
    baseTip: "Supermarket urunlerinde icerik ve kullanim tercihi secimi onemlidir.",
    profiles: [
      {
        id: "sekersiz",
        triggers: ["sekersiz", "diyet"],
        retrievalTerms: ["sekersiz", "diyet", "hafif"],
        tip: "Sekersiz urunlerde icerik ve tat profili birlikte degerlendirilmelidir.",
      },
      {
        id: "protein",
        triggers: ["protein", "spor"],
        retrievalTerms: ["proteinli", "spor icin", "atistirmalik"],
        tip: "Protein odakli urunlerde icerik yogunlugu ve porsiyon daha belirleyici olur.",
      },
    ],
  },
  {
    keys: ["bisiklet", "scooter", "kamp", "outdoor", "yoga", "pilates"],
    baseTip: "Spor outdoor urunlerinde kullanim yeri ve tasinabilirlik secimi etkiler.",
    profiles: [
      {
        id: "sehir-ici",
        triggers: ["sehir ici", "gunluk"],
        retrievalTerms: ["sehir ici", "hafif", "pratik"],
        tip: "Sehir ici kullanimda pratiklik ve rahatlik daha on plandadir.",
      },
      {
        id: "performans",
        triggers: ["performans", "dag", "trekking"],
        retrievalTerms: ["performans", "dayanikli", "outdoor"],
        tip: "Performans odakli kullanimda dayaniklilik ve teknik ozellikler daha onemlidir.",
      },
    ],
  },
  {
    keys: ["kitap", "kirtasiye", "muzik", "koleksiyon", "el-sanatlari"],
    baseTip: "Kitap ve hobi urunlerinde tur ve kullanim seviyesi secimi belirleyicidir.",
    profiles: [
      {
        id: "baslangic",
        triggers: ["baslangic", "yeni baslayan"],
        retrievalTerms: ["baslangic seviyesi", "kolay kullanim"],
        tip: "Baslangic seviyesinde daha kolay ve ulasilabilir secenekler one cikar.",
      },
      {
        id: "cocuk",
        triggers: ["cocuk", "6 yas", "8 yas", "10 yas"],
        retrievalTerms: ["cocuk icin", "yas uygun", "egitici"],
        tip: "Cocuk odakli secimlerde yas uygunlugu daha belirleyicidir.",
      },
    ],
  },
  {
    keys: ["aydinlatma", "ev-tekstili", "mutfak", "mobilya", "ofis"],
    baseTip: "Ev yasam urunlerinde kullanilacak alan ve olcu secimi sonuca en cok etki eder.",
    profiles: [
      {
        id: "kucuk-alan",
        triggers: ["kucuk alan", "dar alan", "kompakt"],
        retrievalTerms: ["kompakt", "dar alan", "pratik"],
        tip: "Kucuk alanlarda olcu ve yerlesim kolayligi daha belirleyici olur.",
      },
      {
        id: "dekoratif",
        triggers: ["dekoratif", "sik", "tasarim"],
        retrievalTerms: ["dekoratif", "tasarim", "gorsel"],
        tip: "Dekoratif kullanimda stil ve renk uyumu daha on plandadir.",
      },
    ],
  },
  {
    keys: ["lastik", "arac-elektronigi", "multimedya", "motor-yagi", "otomotiv"],
    baseTip: "Otomotiv urunlerinde uyumluluk ve kullanim senaryosu secimi belirler.",
    profiles: [
      {
        id: "bakim",
        triggers: ["bakim", "servis"],
        retrievalTerms: ["bakim", "uyumluluk", "dayanikli"],
        tip: "Bakim urunlerinde arac uyumlulugu ve kalite daha onemlidir.",
      },
      {
        id: "aksesuar",
        triggers: ["aksesuar", "tutucu", "kamera"],
        retrievalTerms: ["arac aksesuari", "pratik kullanim"],
        tip: "Aksesuar seciminde montaj kolayligi ve arac uyumu daha belirleyicidir.",
      },
    ],
  },
];

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[-_/]+/g, " ")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueTerms(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => normalize(value)).filter((value) => value.length >= 2))
  );
}

function getCategoryTokens(categorySlug: string | null | undefined): string[] {
  if (!categorySlug) return [];
  const normalized = normalize(categorySlug);
  const parts = normalized.split("/").filter(Boolean);
  const leaf = parts[parts.length - 1] ?? normalized;
  return Array.from(new Set([normalized, leaf]));
}

function resolveKnowledgeEntry(
  categorySlug: string | null | undefined
): CategoryKnowledgeEntry | null {
  const tokens = getCategoryTokens(categorySlug);
  if (tokens.length === 0) return null;

  return (
    CATEGORY_KNOWLEDGE.find((entry) =>
      entry.keys.some((key) => tokens.some((token) => token.includes(normalize(key))))
    ) ?? null
  );
}

function inferKnowledgeEntryFromMessage(message: string): CategoryKnowledgeEntry | null {
  const normalizedMessage = normalize(message);
  if (!normalizedMessage) return null;

  return (
    CATEGORY_KNOWLEDGE.find((entry) =>
      entry.keys.some((key) => normalizedMessage.includes(normalize(key)))
    ) ?? null
  );
}

export function findUsageProfile(
  categorySlug: string | null | undefined,
  message: string
): UsageProfile | null {
  const entry = resolveKnowledgeEntry(categorySlug);
  if (!entry) return null;

  const normalizedMessage = normalize(message);
  return (
    entry.profiles.find((profile) =>
      profile.triggers.some((trigger) => normalizedMessage.includes(normalize(trigger)))
    ) ?? null
  );
}

export function enhanceCategorySearchMessage(options: {
  categorySlug: string | null | undefined;
  searchMessage: string;
  originalMessage: string;
}): string {
  const { categorySlug, searchMessage, originalMessage } = options;
  const entry = resolveKnowledgeEntry(categorySlug);
  if (!entry) return searchMessage;

  const profile = findUsageProfile(categorySlug, originalMessage);
  if (!profile) return searchMessage;

  const normalizedSearch = normalize(searchMessage);
  const extraTerms = profile.retrievalTerms.filter(
    (term) => !normalizedSearch.includes(normalize(term))
  );

  if (extraTerms.length === 0) return searchMessage;
  return `${searchMessage} ${extraTerms.slice(0, 2).join(" ")}`.trim();
}

export function buildCategoryKnowledgeSnippet(options: {
  categorySlug: string | null | undefined;
  userMessage: string;
}): string | null {
  const entry = resolveKnowledgeEntry(options.categorySlug);
  if (!entry) return null;

  const profile = findUsageProfile(options.categorySlug, options.userMessage);
  if (profile) {
    return `${entry.baseTip} ${profile.tip}`;
  }

  return entry.baseTip;
}

export function buildCategoryRankingContext(options: {
  categorySlug: string | null | undefined;
  userMessage: string;
}): CategoryRankingContext | null {
  const entry =
    resolveKnowledgeEntry(options.categorySlug) ??
    inferKnowledgeEntryFromMessage(options.userMessage);
  if (!entry) return null;

  const resolvedCategorySlug = options.categorySlug ?? entry.keys[0] ?? null;
  const profile = findUsageProfile(resolvedCategorySlug, options.userMessage);

  return {
    categorySlug: entry.keys[0] ?? resolvedCategorySlug,
    usageProfileId: profile?.id ?? null,
    signalTerms: profile
      ? uniqueTerms([
          ...profile.triggers,
          ...profile.retrievalTerms,
          ...(profile.rankingSignals ?? []),
        ])
      : [],
  };
}
