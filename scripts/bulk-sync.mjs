// Tüm kategoriler için bulk sync — MediaMarkt + PttAVM + Trendyol + Hepsiburada
// node scripts/bulk-sync.mjs               (hepsi)
// node scripts/bulk-sync.mjs mediamarkt    (sadece mediamarkt)
// node scripts/bulk-sync.mjs pttavm        (sadece pttavm)
// node scripts/bulk-sync.mjs trendyol      (sadece trendyol)

const SECRET = "JtLDp2X7yemVzBQk/DZdHxUyElFqb8JJqA8r7VtpxfI=";
const BASE   = "http://localhost:3000";
const PAGES  = [1, 2, 3, 4, 5];

const CATEGORIES = [
  {
    id: "9f8b9ba9-ec64-4254-9e2c-b7d795d31ab7", name: "Akıllı Telefon",
    sources: [
      { source: "mediamarkt", queries: ["samsung", "huawei", "xiaomi", "apple iphone"] },
      { source: "pttavm",     queries: ["iphone", "samsung galaxy", "xiaomi telefon", "huawei telefon", "akıllı telefon"] },
      { source: "trendyol",   queries: ["iphone 15", "samsung galaxy s24", "xiaomi redmi note 13"] },
    ],
  },
  {
    id: "1a988f7b-0510-4fee-bb03-a7cfa5e5c1dc", name: "Bilgisayar & Laptop",
    sources: [
      { source: "mediamarkt", queries: ["laptop", "notebook"] },
      { source: "pttavm",     queries: ["laptop", "notebook", "gaming laptop", "asus laptop", "lenovo laptop", "hp laptop", "dell laptop"] },
      { source: "trendyol",   queries: ["macbook", "asus vivobook", "lenovo thinkpad"] },
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
      { source: "pttavm",   queries: ["ruj", "maskara", "fondöten", "göz farı", "allık"] },
      { source: "trendyol", queries: ["mac ruj", "nars fondöten", "maybelline maskara"] },
    ],
  },
  {
    id: "43791592-affa-479f-b5a2-d6310a08cf53", name: "Cilt Bakımı",
    sources: [
      { source: "pttavm",   queries: ["yüz kremi", "nemlendirici", "güneş kremi", "serum", "tonik"] },
      { source: "trendyol", queries: ["cerave nemlendirici", "the ordinary serum", "neutrogena"] },
    ],
  },
  {
    id: "dc4dd384-c710-4a85-84d6-5c1679b7043a", name: "Saç Bakımı",
    sources: [
      { source: "mediamarkt", queries: ["saç kurutma", "saç düzleştirici"] },
      { source: "pttavm",     queries: ["saç kurutma makinesi", "saç düzleştirici", "saç maşası", "philips saç"] },
      { source: "trendyol",   queries: ["dyson airwrap", "ghd saç", "babyliss"] },
    ],
  },
  {
    id: "265b4d29-52bb-4b1d-b64d-eecf9cea9d82", name: "Fitness",
    sources: [
      { source: "pttavm",   queries: ["dambıl", "koşu bandı", "spor aleti", "yoga matı", "bisiklet"] },
      { source: "trendyol", queries: ["garmin forerunner", "xiaomi treadmill", "dambıl seti"] },
    ],
  },
  {
    id: "86dbdcb7-6d56-43ed-a152-710088e6d271", name: "Outdoor & Kamp",
    sources: [
      { source: "pttavm",   queries: ["kamp çadırı", "uyku tulumu", "kamp malzemesi", "outdoor"] },
      { source: "trendyol", queries: ["kamp çadırı", "termos stanley", "north face"] },
    ],
  },
  {
    id: "f032ca3f-0679-4d1d-9b59-a2285745ee31", name: "Erkek Giyim",
    sources: [
      { source: "pttavm",   queries: ["erkek mont", "erkek ayakkabı", "erkek tişört", "erkek pantolon", "erkek spor"] },
      { source: "trendyol", queries: ["nike erkek", "adidas erkek", "erkek mont"] },
    ],
  },
  {
    id: "3ad0b1db-0340-4760-9e85-18a699abc69b", name: "Kadın Giyim",
    sources: [
      { source: "pttavm",   queries: ["kadın mont", "kadın elbise", "kadın ayakkabı", "kadın çanta", "kadın spor"] },
      { source: "trendyol", queries: ["nike kadın", "adidas kadın", "kadın mont"] },
    ],
  },
];

async function syncOne(source, query, page, categoryId, categoryName) {
  try {
    const res = await fetch(`${BASE}/api/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": SECRET,
      },
      body: JSON.stringify({ source, query, page, category_id: categoryId }),
    });
    const data = await res.json();
    const tag = `[${categoryName}][${source}] q="${query}" p${page}`;
    console.log(`${tag}: fetched=${data.fetched ?? 0} inserted=${data.inserted ?? 0} errors=${data.errors ?? 0}`);
    return data.fetched ?? 0;
  } catch (e) {
    console.error(`[${categoryName}][${source}] q="${query}" p${page}: HATA - ${e.message}`);
    return 0;
  }
}

async function main() {
  const filterSource = process.argv[2];
  let totalFetched = 0;
  let totalInserted = 0;

  for (const cat of CATEGORIES) {
    for (const { source, queries } of cat.sources) {
      if (filterSource && source !== filterSource) continue;

      for (const query of queries) {
        for (const page of PAGES) {
          const fetched = await syncOne(source, query, page, cat.id, cat.name);
          if (fetched === 0) break;
          totalFetched += fetched;
          await new Promise(r => setTimeout(r, 1500));
        }
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }

  console.log(`\nTamamlandı. Toplam çekilen: ${totalFetched}`);
}

main();
