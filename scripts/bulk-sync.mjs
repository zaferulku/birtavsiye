// Tüm kategoriler için bulk sync — MediaMarkt + PttAVM + Trendyol + Hepsiburada
// node scripts/bulk-sync.mjs                          (hepsi)
// node scripts/bulk-sync.mjs mediamarkt               (sadece mediamarkt)
// node scripts/bulk-sync.mjs pttavm                   (sadece pttavm)
// node scripts/bulk-sync.mjs pttavm elektronik        (pttavm, sadece elektronik kategoriler)
// node scripts/bulk-sync.mjs mediamarkt elektronik    (mediamarkt, sadece elektronik)
// node scripts/bulk-sync.mjs "" elektronik            (tüm source'lar, sadece elektronik)

const SECRET = "JtLDp2X7yemVzBQk/DZdHxUyElFqb8JJqA8r7VtpxfI=";
const BASE   = "http://localhost:3000";
const PAGES  = [1, 2, 3, 4, 5, 6, 7, 8];

const ELEKTRONIK_KATEGORILER = [
  "Akıllı Telefon", "Bilgisayar & Laptop", "Tablet", "TV & Projeksiyon",
  "Ses & Kulaklık", "Akıllı Saat", "Oyun & Konsol", "Fotoğraf & Kamera",
  "Beyaz Eşya", "Küçük Ev Aletleri", "Bilgisayar Bileşenleri",
  "Networking & Modem", "Telefon Aksesuar", "Saç Bakımı",
];

// Kategori bazlı başlık filtresi — en az bir keyword eşleşmeli
// yoksa ürün o kategoriye eklenmez
const CATEGORY_TITLE_FILTERS = {
  "Akıllı Telefon": [
    "iphone", "samsung galaxy", "xiaomi", "huawei", "redmi", "realme",
    "oppo", "nokia", "motorola", "poco", "oneplus", "google pixel",
    "akıllı telefon", "smartphone", "telefon", "honor",
  ],
  "Bilgisayar & Laptop": [
    "laptop", "notebook", "macbook", "dizüstü", "gaming pc", "bilgisayar",
    "asus", "lenovo", "hp ", "dell ", "msi ", "casper", "monster",
  ],
  "Tablet": [
    "ipad", "tablet", "galaxy tab", "lenovo tab", "xiaomi pad",
    "huawei matepad", "redmi pad",
  ],
  "TV & Projeksiyon": [
    "tv", "televizyon", "oled", "qled", "4k", "smart tv", "projeksiyon",
  ],
  "Beyaz Eşya": [
    "buzdolabı", "çamaşır makinesi", "bulaşık makinesi", "fırın",
    "klima", "donduruculu", "no frost", "inverter",
  ],
  "Küçük Ev Aletleri": [
    "süpürge", "kahve", "blender", "tost", "air fryer", "fritöz",
    "elektrikli", "ütü", "mikser", "robot süpürge",
  ],
  "Bilgisayar Bileşenleri": [
    "ekran kartı", "ram", "ssd", "nvme", "işlemci", "anakart",
    "rtx", "rx ", "ddr", "m.2", "pcie",
  ],
  "Ses & Kulaklık": [
    "kulaklık", "airpods", "earbuds", "tws", "hoparlör", "soundbar",
    "headset", "headphone", "galaxy buds",
  ],
  "Akıllı Saat": [
    "watch", "saat", "garmin", "smartwatch", "band ", "mi band",
    "fitness tracker",
  ],
};

function titleMatchesCategory(title, categoryName) {
  const keywords = CATEGORY_TITLE_FILTERS[categoryName];
  if (!keywords) return true; // filtre tanımlı değilse geçir
  const t = title.toLowerCase();
  return keywords.some(kw => t.includes(kw.toLowerCase()));
}

const CATEGORIES = [
  {
    id: "9f8b9ba9-ec64-4254-9e2c-b7d795d31ab7", name: "Akıllı Telefon",
    sources: [
      { source: "mediamarkt", queries: ["samsung", "huawei", "xiaomi", "apple iphone"] },
      { source: "pttavm",     queries: ["iphone 15", "iphone 16", "samsung galaxy s24", "samsung galaxy a55", "xiaomi 14", "huawei pura"] },
      { source: "trendyol",   queries: ["iphone 15", "samsung galaxy s24", "xiaomi redmi note 13"] },
      { source: "vatan",      queries: ["iphone", "samsung galaxy", "xiaomi redmi"] },
    ],
  },
  {
    id: "1a988f7b-0510-4fee-bb03-a7cfa5e5c1dc", name: "Bilgisayar & Laptop",
    sources: [
      { source: "mediamarkt", queries: ["laptop", "notebook"] },
      { source: "pttavm",     queries: ["laptop", "notebook", "gaming laptop", "asus laptop", "lenovo laptop", "hp laptop", "dell laptop"] },
      { source: "trendyol",   queries: ["macbook", "asus vivobook", "lenovo thinkpad"] },
      { source: "vatan",      queries: ["laptop", "macbook", "asus", "lenovo", "gaming laptop"] },
    ],
  },
  {
    id: "0f421871-f3db-438d-ab3f-2104daf88b2a", name: "Tablet",
    sources: [
      { source: "mediamarkt", queries: ["samsung tablet", "lenovo tab"] },
      { source: "pttavm",     queries: ["ipad", "samsung tablet", "lenovo tablet", "xiaomi tablet"] },
      { source: "trendyol",   queries: ["ipad", "samsung galaxy tab"] },
    ],
  },
  {
    id: "2044ca2d-8b30-40e3-89bb-545018c35fa3", name: "TV & Projeksiyon",
    sources: [
      { source: "mediamarkt", queries: ["televizyon", "samsung tv", "lg tv"] },
      { source: "pttavm",     queries: ["televizyon", "smart tv", "samsung tv", "lg tv", "4k tv"] },
      { source: "trendyol",   queries: ["samsung 55 tv", "lg oled tv"] },
      { source: "vatan",      queries: ["televizyon", "samsung tv", "lg tv", "smart tv"] },
    ],
  },
  {
    id: "32faf798-439a-4fcc-a63f-134ad11161a0", name: "Ses & Kulaklık",
    sources: [
      { source: "mediamarkt", queries: ["headset", "kulaklık"] },
      { source: "pttavm",     queries: ["bluetooth kulaklık", "tws kulaklık", "jbl", "sony kulaklık", "airpods"] },
      { source: "trendyol",   queries: ["airpods", "jbl kulaklık", "samsung galaxy buds"] },
    ],
  },
  {
    id: "f373d503-4637-425f-a9b8-3ecbe9637065", name: "Akıllı Saat",
    sources: [
      { source: "mediamarkt", queries: ["smartwatch", "garmin"] },
      { source: "pttavm",     queries: ["akıllı saat", "apple watch", "samsung watch", "xiaomi band", "garmin"] },
      { source: "trendyol",   queries: ["apple watch", "samsung galaxy watch"] },
    ],
  },
  {
    id: "778d77ff-006f-428e-82be-c584adfa6c60", name: "Oyun & Konsol",
    sources: [
      { source: "mediamarkt", queries: ["playstation", "xbox"] },
      { source: "pttavm",     queries: ["ps5", "xbox series", "nintendo switch", "oyun konsol"] },
      { source: "trendyol",   queries: ["ps5", "xbox series x", "nintendo switch oled"] },
    ],
  },
  {
    id: "5bb18bbb-8fe8-4ecf-9aab-655d5637206f", name: "Fotoğraf & Kamera",
    sources: [
      { source: "mediamarkt", queries: ["kamera", "canon", "sony camera"] },
      { source: "pttavm",     queries: ["fotoğraf makinesi", "canon kamera", "sony kamera", "nikon", "gopro"] },
      { source: "trendyol",   queries: ["canon eos", "sony alpha", "gopro"] },
    ],
  },
  {
    id: "c3916c1c-fb35-4577-9e29-fae43a9cf923", name: "Beyaz Eşya",
    sources: [
      { source: "mediamarkt", queries: ["buzdolabı", "çamaşır makinesi"] },
      { source: "pttavm",     queries: ["buzdolabı", "çamaşır makinesi", "bulaşık makinesi", "fırın", "klima"] },
      { source: "trendyol",   queries: ["arçelik buzdolabı", "beko çamaşır makinesi"] },
    ],
  },
  {
    id: "dd29689b-191e-4863-ae7c-38ed0ea59431", name: "Küçük Ev Aletleri",
    sources: [
      { source: "mediamarkt", queries: ["süpürge", "kahve makinesi"] },
      { source: "pttavm",     queries: ["robot süpürge", "kahve makinesi", "blender", "tost makinesi", "hava fryer"] },
      { source: "trendyol",   queries: ["dyson v15", "nespresso", "tefal"] },
    ],
  },
  {
    id: "f7465a62-ac44-4614-a65b-36b51c87fc85", name: "Bilgisayar Bileşenleri",
    sources: [
      { source: "mediamarkt", queries: ["ekran kartı", "ram", "ssd"] },
      { source: "pttavm",     queries: ["ekran kartı", "ram bellek", "ssd", "işlemci", "anakart", "rtx", "ddr5"] },
      { source: "trendyol",   queries: ["rtx 4070", "ddr5 ram", "nvme ssd"] },
      { source: "vatan",      queries: ["ekran kartı", "işlemci", "ssd", "ram", "anakart"] },
    ],
  },
  {
    id: "9def2d42-3d49-4bcd-a398-7c80d9cae043", name: "Networking & Modem",
    sources: [
      { source: "mediamarkt", queries: ["router", "wifi"] },
      { source: "pttavm",     queries: ["wifi router", "modem router", "access point", "mesh wifi", "tp-link"] },
      { source: "trendyol",   queries: ["tp-link router", "asus router"] },
    ],
  },
  {
    id: "97af4bfd-ed08-44b6-8f28-09131ae7920f", name: "Telefon Aksesuar",
    sources: [
      { source: "mediamarkt", queries: ["powerbank", "şarj cihazı"] },
      { source: "pttavm",     queries: ["powerbank", "telefon kılıf", "şarj cihazı", "ekran koruyucu", "kablosuz şarj"] },
      { source: "trendyol",   queries: ["magsafe powerbank", "anker powerbank"] },
    ],
  },
  {
    id: "54d7fe6e-3be9-4a61-a46d-6e87c9a344e2", name: "Makyaj",
    sources: [
      { source: "pttavm",   queries: ["ruj", "maskara", "fondöten", "göz farı", "allık", "eyeliner", "dudak kalemi", "bronzer", "highlighter", "setting spray"] },
      { source: "trendyol", queries: ["mac ruj", "nars fondöten", "maybelline maskara"] },
    ],
  },
  {
    id: "43791592-affa-479f-b5a2-d6310a08cf53", name: "Cilt Bakımı",
    sources: [
      { source: "pttavm",   queries: ["yüz kremi", "nemlendirici", "güneş kremi", "serum", "tonik", "göz kremi", "temizleyici jel", "maske", "retinol", "vitamin c serum"] },
      { source: "trendyol", queries: ["cerave nemlendirici", "the ordinary serum", "neutrogena"] },
    ],
  },
  {
    id: "dc4dd384-c710-4a85-84d6-5c1679b7043a", name: "Saç Bakımı",
    sources: [
      { source: "mediamarkt", queries: ["saç kurutma", "saç düzleştirici"] },
      { source: "pttavm",     queries: ["saç kurutma makinesi", "saç düzleştirici", "saç maşası", "philips saç", "saç boyası", "şampuan", "saç maskesi", "saç serumu"] },
      { source: "trendyol",   queries: ["dyson airwrap", "ghd saç", "babyliss"] },
    ],
  },
  {
    id: "265b4d29-52bb-4b1d-b64d-eecf9cea9d82", name: "Fitness",
    sources: [
      { source: "pttavm",   queries: ["dambıl", "koşu bandı", "spor aleti", "yoga matı", "bisiklet", "halter", "protein tozu", "spor çantası", "fitness eldiveni", "kettlebell"] },
      { source: "trendyol", queries: ["garmin forerunner", "xiaomi treadmill", "dambıl seti"] },
    ],
  },
  {
    id: "86dbdcb7-6d56-43ed-a152-710088e6d271", name: "Outdoor & Kamp",
    sources: [
      { source: "pttavm",   queries: ["kamp çadırı", "uyku tulumu", "kamp malzemesi", "outdoor", "termos", "trekking ayakkabı", "kamp lambası", "hiking"] },
      { source: "trendyol", queries: ["kamp çadırı", "termos stanley", "north face"] },
    ],
  },
  // Giyim: şimdilik durduruldu, markalar netleşince açılacak
  // { id: "f032ca3f-0679-4d1d-9b59-a2285745ee31", name: "Erkek Giyim", sources: [
  //   { source: "pttavm",   queries: ["erkek mont","erkek ayakkabı","erkek tişört","erkek pantolon","erkek spor","erkek gömlek","erkek ceket","erkek sweatshirt","erkek bot","erkek eşofman"] },
  //   { source: "trendyol", queries: ["nike erkek","adidas erkek","erkek mont"] },
  // ]},
  // { id: "3ad0b1db-0340-4760-9e85-18a699abc69b", name: "Kadın Giyim", sources: [
  //   { source: "pttavm",   queries: ["kadın mont","kadın elbise","kadın ayakkabı","kadın çanta","kadın spor","kadın bluz","kadın pantolon","kadın ceket","kadın bot","kadın etek"] },
  //   { source: "trendyol", queries: ["nike kadın","adidas kadın","kadın mont"] },
  // ]},
];

async function syncOne(source, query, page, categoryId, categoryName) {
  try {
    const titleFilter = CATEGORY_TITLE_FILTERS[categoryName] ?? null;
    const res = await fetch(`${BASE}/api/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": SECRET,
      },
      body: JSON.stringify({
        source, query, page, category_id: categoryId,
        ...(titleFilter ? { title_filter: titleFilter } : {}),
      }),
    });
    const data = await res.json();
    const tag = `[${categoryName}][${source}] q="${query}" p${page}`;
    console.log(`${tag}: fetched=${data.fetched ?? 0} inserted=${data.inserted ?? 0} errors=${data.errors ?? 0}`);
    return { fetched: data.fetched ?? 0, inserted: data.inserted ?? 0 };
  } catch (e) {
    console.error(`[${categoryName}][${source}] q="${query}" p${page}: HATA - ${e.message}`);
    return { fetched: 0, inserted: 0 };
  }
}

// MediaMarkt IP hız limiti var — ayrı ayar
const SOURCE_CONFIG = {
  mediamarkt: { concurrency: 1, pageDelay: 1500, queryDelay: 2000 },
  pttavm:     { concurrency: 3, pageDelay: 300,  queryDelay: 0 },
  trendyol:   { concurrency: 1, pageDelay: 3000, queryDelay: 3000 }, // anti-bot agresif
  hepsiburada:{ concurrency: 3, pageDelay: 300,  queryDelay: 0 },
  vatan:      { concurrency: 2, pageDelay: 800,  queryDelay: 500 },
};
const DEFAULT_CONFIG = { concurrency: 2, pageDelay: 500, queryDelay: 0 };

async function runPool(tasks, concurrency) {
  let i = 0;
  let totalFetched = 0;
  let totalInserted = 0;

  async function worker() {
    while (i < tasks.length) {
      const task = tasks[i++];
      const r = await task();
      totalFetched  += r.fetched;
      totalInserted += r.inserted;
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  return { totalFetched, totalInserted };
}

async function syncSource(source, queries, catId, catName) {
  const cfg = SOURCE_CONFIG[source] ?? DEFAULT_CONFIG;
  let fetched = 0, inserted = 0;

  const tasks = queries.map(query => async () => {
    let qFetched = 0, qInserted = 0;
    for (const page of PAGES) {
      const r = await syncOne(source, query, page, catId, catName);
      if (r.fetched === 0) break;
      qFetched  += r.fetched;
      qInserted += r.inserted;
      if (cfg.pageDelay > 0) await new Promise(res => setTimeout(res, cfg.pageDelay));
    }
    if (cfg.queryDelay > 0) await new Promise(res => setTimeout(res, cfg.queryDelay));
    return { fetched: qFetched, inserted: qInserted };
  });

  const result = await runPool(tasks, cfg.concurrency);
  fetched  += result.totalFetched;
  inserted += result.totalInserted;
  return { fetched, inserted };
}

async function main() {
  const filterSource   = process.argv[2] || "";
  const filterCategory = process.argv[3] || "";
  let totalFetched = 0, totalInserted = 0;

  for (const cat of CATEGORIES) {
    if (filterCategory === "elektronik" && !ELEKTRONIK_KATEGORILER.includes(cat.name)) continue;

    for (const { source, queries } of cat.sources) {
      if (filterSource && source !== filterSource) continue;

      const cfg = SOURCE_CONFIG[source] ?? DEFAULT_CONFIG;
      console.log(`\n[${cat.name}][${source}] — concurrency=${cfg.concurrency}, pageDelay=${cfg.pageDelay}ms`);
      const r = await syncSource(source, queries, cat.id, cat.name);
      totalFetched  += r.fetched;
      totalInserted += r.inserted;
    }
  }

  console.log(`\nTamamlandı. Toplam çekilen: ${totalFetched} | Toplam eklenen/güncellenen: ${totalInserted}`);
}

main();
