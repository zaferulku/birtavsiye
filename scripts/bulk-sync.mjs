// Tüm kategoriler için bulk sync
// node scripts/bulk-sync.mjs

const SECRET = "JtLDp2X7yemVzBQk/DZdHxUyElFqb8JJqA8r7VtpxfI=";
const BASE   = "http://localhost:3000";

const CATEGORIES = [
  { id: "9f8b9ba9-ec64-4254-9e2c-b7d795d31ab7", name: "Akıllı Telefon",         query: "smartphone" },
  { id: "1a988f7b-0510-4fee-bb03-a7cfa5e5c1dc", name: "Bilgisayar & Laptop",    query: "laptop" },
  { id: "0f421871-f3db-438d-ab3f-2104daf88b2a", name: "Tablet",                 query: "tablet" },
  { id: "2044ca2d-8b30-40e3-89bb-545018c35fa3", name: "TV & Projeksiyon",       query: "televizyon" },
  { id: "32faf798-439a-4fcc-a63f-134ad11161a0", name: "Ses & Kulaklık",         query: "kulaklık" },
  { id: "f373d503-4637-425f-a9b8-3ecbe9637065", name: "Akıllı Saat",            query: "smartwatch" },
  { id: "778d77ff-006f-428e-82be-c584adfa6c60", name: "Oyun & Konsol",          query: "playstation" },
  { id: "5bb18bbb-8fe8-4ecf-9aab-655d5637206f", name: "Fotoğraf & Kamera",     query: "kamera" },
  { id: "c3916c1c-fb35-4577-9e29-fae43a9cf923", name: "Beyaz Eşya",             query: "buzdolabı" },
  { id: "dd29689b-191e-4863-ae7c-38ed0ea59431", name: "Küçük Ev Aletleri",     query: "süpürge" },
  { id: "f7465a62-ac44-4614-a65b-36b51c87fc85", name: "Bilgisayar Bileşenleri", query: "ekran kartı" },
  { id: "9def2d42-3d49-4bcd-a398-7c80d9cae043", name: "Networking & Modem",    query: "router" },
  { id: "97af4bfd-ed08-44b6-8f28-09131ae7920f", name: "Telefon Aksesuar",      query: "powerbank" },
  { id: "54d7fe6e-3be9-4a61-a46d-6e87c9a344e2", name: "Makyaj",                query: "makyaj" },
  { id: "43791592-affa-479f-b5a2-d6310a08cf53", name: "Cilt Bakımı",            query: "cilt bakım" },
  { id: "dc4dd384-c710-4a85-84d6-5c1679b7043a", name: "Saç Bakımı",             query: "saç kurutma" },
  { id: "265b4d29-52bb-4b1d-b64d-eecf9cea9d82", name: "Fitness",               query: "spor aleti" },
  { id: "86dbdcb7-6d56-43ed-a152-710088e6d271", name: "Outdoor & Kamp",        query: "kamp" },
  { id: "f032ca3f-0679-4d1d-9b59-a2285745ee31", name: "Erkek Giyim",           query: "erkek giyim" },
  { id: "3ad0b1db-0340-4760-9e85-18a699abc69b", name: "Kadın Giyim",           query: "kadın giyim" },
];

const SOURCES = ["mediamarkt"];

async function syncOne(source, query, categoryId, categoryName) {
  try {
    const res = await fetch(`${BASE}/api/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": SECRET,
      },
      body: JSON.stringify({ source, query, category_id: categoryId }),
    });
    const data = await res.json();
    console.log(`[${source}] ${categoryName}: fetched=${data.fetched} inserted=${data.inserted} errors=${data.errors}`);
  } catch (e) {
    console.error(`[${source}] ${categoryName}: HATA - ${e.message}`);
  }
}

async function main() {
  let total = 0;
  for (const cat of CATEGORIES) {
    for (const source of SOURCES) {
      await syncOne(source, cat.query, cat.id, cat.name);
      total++;
      await new Promise(r => setTimeout(r, 1500));
    }
  }
  console.log(`\nTamamlandı. Toplam ${total} sync çalıştırıldı.`);
}

main();
