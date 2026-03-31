import { createReadStream } from "fs";
import { createInterface } from "readline";

// Samsung supplier_id=26, Apple=710, LG=293, vb.
// Hangi catid'ler hangi ürünleri getiriyor kontrol et

const CHECK_SUPPLIERS = { "26": "Samsung", "710": "Apple", "5": "Sony", "293": "LG", "728": "Lenovo" };
const SAMPLE_SIZE = 3;

const found = {}; // "supplier-catid" → [product_ids]

const rl = createInterface({
  input: createReadStream("scripts/icecat-index.xml", { encoding: "utf8" }),
  crlfDelay: Infinity,
});

let lineCount = 0;
for await (const line of rl) {
  if (line.startsWith("<file ")) {
    const suppId = line.match(/Supplier_id="(\d+)"/)?.[1];
    const catid  = line.match(/Catid="(\d+)"/)?.[1];
    const pid    = line.match(/Product_ID="(\d+)"/)?.[1];
    const year   = line.match(/Date_Added="(\d{4})/)?.[1];

    if (suppId && catid && pid && CHECK_SUPPLIERS[suppId] && parseInt(year) >= 2022) {
      const key = `${CHECK_SUPPLIERS[suppId]}-${catid}`;
      if (!found[key]) found[key] = [];
      if (found[key].length < SAMPLE_SIZE) found[key].push(pid);
    }
  }
  lineCount++;
  if (lineCount % 2000000 === 0) process.stdout.write(`  ${lineCount/1000000}M satır...\r`);
}

console.log("\n=== Supplier × Catid kombinasyonları ===\n");
const sorted = Object.entries(found).sort((a,b) => a[0].localeCompare(b[0]));

// Icecat'ten birinin adını çek
const auth = Buffer.from("0xstraub:Zafer21+").toString("base64");
for (const [key, pids] of sorted) {
  const pid = pids[0];
  const res = await fetch(`https://live.icecat.biz/api?UserName=0xstraub&Language=EN&icecat_id=${pid}`, {
    headers: { Authorization: "Basic " + auth }
  });
  const d = await res.json();
  const name = d?.data?.GeneralInfo?.Title || d?.data?.GeneralInfo?.ProductName || "?";
  const catName = d?.data?.GeneralInfo?.Category?.Name?.Value || "?";
  const [brand, catid] = key.split("-");
  console.log(`${brand.padEnd(10)} catid=${catid.padEnd(6)} → ${catName.padEnd(25)} | örnek: ${name.slice(0,60)}`);
  await new Promise(r => setTimeout(r, 350));
}
