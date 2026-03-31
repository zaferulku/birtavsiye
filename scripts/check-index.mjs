import { createReadStream } from "fs";
import { createInterface } from "readline";

const INDEX_FILE = "scripts/icecat-index.xml";

const rl = createInterface({
  input: createReadStream(INDEX_FILE, { encoding: "utf8" }),
  crlfDelay: Infinity,
});

// Samsung (26), Sony (5), LG (293) için 2020+ Catid'leri topla
const catids = { "26": {}, "5": {}, "293": {}, "25": {}, "728": {}, "1": {} };

let count = 0;
for await (const line of rl) {
  if (line.startsWith("<file ")) {
    const supplierMatch = line.match(/Supplier_id="(\d+)"/);
    const dateMatch = line.match(/Date_Added="(\d{4})/);
    const catidMatch = line.match(/Catid="(\d+)"/);

    if (supplierMatch && dateMatch && catidMatch) {
      const sid = supplierMatch[1];
      const year = parseInt(dateMatch[1]);
      const cat = catidMatch[1];

      if (catids[sid] && year >= 2022) {
        catids[sid][cat] = (catids[sid][cat] || 0) + 1;
      }
    }
  }
  if (++count % 2000000 === 0) process.stdout.write(`${count/1000000}M satır...\r`);
}

console.log("\n📊 Supplier başına en çok kullanılan Catid'ler (2022+):");
const names = { "26": "Samsung", "5": "Sony", "293": "LG", "25": "Philips", "728": "Lenovo", "1": "HP" };
for (const [sid, cats] of Object.entries(catids)) {
  const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.log(`\n${names[sid]} (${sid}):`);
  for (const [cat, count] of sorted) {
    console.log(`  Catid ${cat}: ${count} ürün`);
  }
}