// Tüm kategoriler için bulk sync
// node scripts/bulk-sync.mjs

const SECRET = "JtLDp2X7yemVzBQk/DZdHxUyElFqb8JJqA8r7VtpxfI=";
const BASE   = "http://localhost:3000";

// Her kategori birden fazla sorgu + sayfa destekler
const CATEGORIES = [
  { id: "9f8b9ba9-ec64-4254-9e2c-b7d795d31ab7", name: "Akıllı Telefon",
    queries: ["samsung", "apple", "xiaomi", "huawei"] },
  { id: "1a988f7b-0510-4fee-bb03-a7cfa5e5c1dc", name: "Bilgisayar & Laptop",
    queries: ["laptop", "notebook"] },
  { id: "0f421871-f3db-438d-ab3f-2104daf88b2a", name: "Tablet",
    queries: ["samsung tablet", "lenovo tab"] },
  { id: "2044ca2d-8b30-40e3-89bb-545018c35fa3", name: "TV & Projeksiyon",
    queries: ["televizyon", "samsung tv", "lg tv", "philips tv"] },
  { id: "32faf798-439a-4fcc-a63f-134ad11161a0", name: "Ses & Kulaklık",
    queries: ["kulaklık", "headset", "sony headphones", "jbl"] },
  { id: "f373d503-4637-425f-a9b8-3ecbe9637065", name: "Akıllı Saat",
    queries: ["smartwatch", "samsung watch", "garmin"] },
  { id: "778d77ff-006f-428e-82be-c584adfa6c60", name: "Oyun & Konsol",
    queries: ["playstation", "xbox", "nintendo"] },
  { id: "5bb18bbb-8fe8-4ecf-9aab-655d5637206f", name: "Fotoğraf & Kamera",
    queries: ["kamera", "canon", "sony camera", "nikon"] },
  { id: "c3916c1c-fb35-4577-9e29-fae43a9cf923", name: "Beyaz Eşya",
    queries: ["buzdolabı", "çamaşır makinesi", "bulaşık makinesi"] },
  { id: "dd29689b-191e-4863-ae7c-38ed0ea59431", name: "Küçük Ev Aletleri",
    queries: ["süpürge", "blender", "kahve makinesi"] },
  { id: "f7465a62-ac44-4614-a65b-36b51c87fc85", name: "Bilgisayar Bileşenleri",
    queries: ["ekran kartı", "ram", "işlemci", "ssd"] },
  { id: "9def2d42-3d49-4bcd-a398-7c80d9cae043", name: "Networking & Modem",
    queries: ["router", "modem", "wifi"] },
  { id: "97af4bfd-ed08-44b6-8f28-09131ae7920f", name: "Telefon Aksesuar",
    queries: ["powerbank", "şarj cihazı", "telefon kılıf"] },
  { id: "54d7fe6e-3be9-4a61-a46d-6e87c9a344e2", name: "Makyaj",
    queries: ["makyaj", "ruj", "maskara"] },
  { id: "43791592-affa-479f-b5a2-d6310a08cf53", name: "Cilt Bakımı",
    queries: ["cilt bakım", "nemlendirici"] },
  { id: "dc4dd384-c710-4a85-84d6-5c1679b7043a", name: "Saç Bakımı",
    queries: ["saç kurutma", "saç düzleştirici"] },
  { id: "265b4d29-52bb-4b1d-b64d-eecf9cea9d82", name: "Fitness",
    queries: ["spor aleti", "dambıl"] },
  { id: "86dbdcb7-6d56-43ed-a152-710088e6d271", name: "Outdoor & Kamp",
    queries: ["kamp", "outdoor"] },
  { id: "f032ca3f-0679-4d1d-9b59-a2285745ee31", name: "Erkek Giyim",
    queries: ["erkek giyim"] },
  { id: "3ad0b1db-0340-4760-9e85-18a699abc69b", name: "Kadın Giyim",
    queries: ["kadın giyim"] },
];

const PAGES = [1, 2, 3];

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
    const tag = `[${categoryName}] q="${query}" p${page}`;
    console.log(`${tag}: fetched=${data.fetched ?? 0} inserted=${data.inserted ?? 0} errors=${data.errors ?? 0}`);
    return data.fetched ?? 0;
  } catch (e) {
    console.error(`[${categoryName}] q="${query}" p${page}: HATA - ${e.message}`);
    return 0;
  }
}

async function main() {
  let totalFetched = 0;
  let totalInserted = 0;

  for (const cat of CATEGORIES) {
    for (const query of cat.queries) {
      for (const page of PAGES) {
        const fetched = await syncOne("mediamarkt", query, page, cat.id, cat.name);
        // 0 gelirse sonraki sayfalara gitme
        if (fetched === 0) break;
        totalFetched += fetched;
        await new Promise(r => setTimeout(r, 2000));
      }
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log(`\nTamamlandı. Toplam çekilen: ${totalFetched}`);
}

main();
