// MediaMarkt/PttAVM'den çekilen kategori metnini model_family'e map et
// node --env-file=.env.local scripts/classify-from-source-category.mjs

import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SKIP = new Set([
  "Giyim", "Ekran", "Ev", "Test Cihazları", "Klasik",
  "Elektronik", "Ev & Yaşam", "Moda", "Kozmetik",
  "iPhone iOS Telefonlar", "Android Telefonlar",
]);

function normalize(rawInput) {
  if (!rawInput) return null;
  let s = rawInput.trim();

  if (/telefon/i.test(s) && /iOS|Android|Akıllı/i.test(s)) return null;
  if (/^(Xiaomi|Samsung|Huawei|Apple|Oppo|Vivo|Realme)\s+Telefon/i.test(s)) return null;

  const rules = [
    [/\s*Makineleri$/, " Makinesi"],
    [/\s*Bataryaları$/, " Bataryası"],
    [/\s*Adaptörleri$/, " Adaptörü"],
    [/\s*Kılıfları$/, " Kılıfı"],
    [/\s*Kumandaları$/, " Kumandası"],
    [/\s*Aparatları$/, " Aparatı"],
    [/\s*Aksesuarları$/, " Aksesuarı"],
    [/\s*Koruyucular$/, " Koruyucu"],
    [/\s*Kulaklıkları$/, " Kulaklık"],
    [/\s*Kulaklıklar$/, " Kulaklık"],
    [/\s*Televizyonlar$/, " Televizyon"],
    [/\s*Kameraları$/, " Kamera"],
    [/\s*Konsolları$/, " Konsolu"],
    [/\s*Oyunları$/, " Oyun"],
    [/\s*Tabletler$/, " Tablet"],
    [/\s*Telefonları$/, " Telefon"],
    [/\s*Telefonlar$/, " Telefon"],
    [/\s*Saatler(i)?$/, " Saat"],
    [/\s*Buzdolapları$/, " Buzdolabı"],
    [/\s*Bilgisayarlar(ı)?$/, " Bilgisayar"],
    [/\s*Modelleri$/, ""],
    [/\s*lar$/, ""],
    [/\s*ler$/, ""],
  ];
  for (const [re, rep] of rules) s = s.replace(re, rep);
  s = s.trim();

  if (SKIP.has(s)) return null;
  if (s.length < 2 || s.length > 60) return null;
  return s;
}

async function processSource(source, specKey) {
  let totalSet = 0, totalNoMatch = 0, totalProcessed = 0;
  const typeCounts = {};

  for (let offset = 0; offset < 50; offset++) {
    const { data } = await sb
      .from("products")
      .select("id, specs")
      .eq("source", source)
      .is("model_family", null)
      .not(`specs->${specKey}`, "is", null)
      .limit(1000);

    if (!data || data.length === 0) break;

    for (const p of data) {
      totalProcessed++;
      const raw = p.specs?.[specKey];
      const norm = normalize(raw);
      if (!norm) { totalNoMatch++; continue; }
      await sb.from("products").update({ model_family: norm }).eq("id", p.id);
      totalSet++;
      typeCounts[norm] = (typeCounts[norm] || 0) + 1;
    }

    if (data.length < 1000) break;
  }

  console.log(`\n${source}: ${totalSet} set, ${totalNoMatch} skip/no-match, ${totalProcessed} total`);
  const top = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 25);
  console.log("Top types:");
  top.forEach(([k, v]) => console.log(`  ${String(v).padStart(4)}  ${k}`));
}

(async () => {
  await processSource("mediamarkt", "mediamarkt_category");
  await processSource("pttavm", "pttavm_category");
})();
