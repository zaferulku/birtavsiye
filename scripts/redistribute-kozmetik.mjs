// Kozmetik parent (makyaj, cilt-bakimi, sac-bakimi, kisisel-hijyen, parfum) altında
// toplanmış ürünleri leaf kategorilere dağıtır. Yabancı ürünleri (iş güvenlik maskesi,
// oyuncak maske, kolye, pelerin, termos vb.) kozmetik dışına taşır.
// node --env-file=.env.local scripts/redistribute-kozmetik.mjs [--dry-run]

import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = process.argv.includes("--dry-run");

function tlower(s) {
  return (s || "").replace(/İ/g, "i").replace(/I/g, "ı").replace(/Ş/g, "ş").replace(/Ç/g, "ç").replace(/Ğ/g, "ğ").replace(/Ü/g, "ü").replace(/Ö/g, "ö").toLowerCase();
}

// Her parent için leaf pattern'leri (priority sırayla)
const PARENT_LEAVES = {
  "makyaj": [
    ["dudak-makyaji", /\b(\bruj\b|lipstick|lip\s*gloss|dudak\s*kalem|lip\s*liner|dudak\s*parlatıc|lip\s*balm|lip\s*scrub|dudak\s*maskesi)\b/i],
    ["goz-makyaji", /\b(maskara|eyeliner|far\s*palet|göz\s*far|eyeshadow|kaş\s*kalem|kaş\s*jel|göz\s*kalem|kirpik\s*seri)\b/i],
    ["yuz-makyaji", /\b(fondöten|foundation|kapatıc|concealer|allık|blush|highlighter|aydınlatıc|kontür|bb\s*krem|cc\s*krem|primer|setting\s*spray|pudra|bronzer|bronzlaştırıc)\b/i],
  ],
  "cilt-bakimi": [
    ["yuz-maskesi", /\b(kil\s*maskes|sheet\s*mask|kağıt\s*mask|soyulabilir\s*mask|hidrojel\s*mask|yüz\s*maskes|led\s*mask)\b/i],
    ["gunes-koruyucu", /\b(güneş\s*kremi|spf\s*\d+|bronzlaştırıc|sunscreen|after\s*sun)\b/i],
    ["serum", /\b(vitamin\s*c\s*serum|c\s*vitamini\s*serum|niacinamide|retinol\s*serum|hyaluronik|yüz\s*serum|anti[- ]?aging\s*serum|the\s*ordinary|peptit\s*serum)\b/i],
    ["yuz-temizleme", /\b(yüz\s*köpüğ|yüz\s*jel|misel\s*su|tonik|yüz\s*temizley|yüz\s*sabun|peeling|yüz\s*fırça|temizleme\s*jel)\b/i],
    ["yuz-nemlendirici", /\b(yüz\s*kremi|nemlendirici\s*krem|moisturizer|gündüz\s*krem|gece\s*krem|yüz\s*nemlend|göz\s*kremi|göz\s*çevresi)\b/i],
  ],
  "sac-bakimi": [
    ["sac-stilizasyon", /\b(saç\s*kurutma\s*mak|saç\s*kurutucu|fön\s*mak|saç\s*düzleştir|saç\s*maşa|airwrap|dyson\s*supersonic|bigudi|saç\s*kesme\s*mak|saç\s*şekillendir|saç\s*çift\s*taraflı)\b/i],
    ["sac-boyasi", /\bsaç\s*boyas/i],
    ["sampuan", /\b(şampuan|shampoo|saç\s*kremi|saç\s*bakım\s*kremi|conditioner|kepek\s*önley|saç\s*serum|keratin\s*bakım|argan\s*yağ\s*saç)\b/i],
  ],
  "parfum": [
    ["parfum", /\b(parfüm|parfum|edp|edt|eau\s*de\s*(parfum|toilette)|fragrance|kolonya|cologne|deodorant|antiperspirant|roll[- ]?on\s*koku)\b/i],
  ],
  "kisisel-hijyen": [], // leaf yok, sadece yabancı temizleme
};

// Kozmetik dışına taşınması gereken ürünler (istenmeyen regex → target slug veya null=parent'a)
const FOREIGN = [
  [/\b(iş\s*güvenlik|ffp[23]|koruyucu\s*solunum|toz\s*maske\s*(ant|ffp|n95|nr)|cerrahi\s*mask|3m\s*(hf|vflex)|yarım\s*yüz\s*mask|9330|9152e|ventilli\s*nr)\b/i, null],
  [/\b(karton\s*mask|boyanabilir\s*mask|tiyatro\s*mask|oyuncak\s*mask|pelerin|kapüşonlu\s*pelerin)\b/i, "figur-oyuncak"],
  [/\b(gümüş\s*kolye|altın\s*kolye|14\s*ayar|kaplamalı\s*kolye|kazımalı\s*kolye)\b/i, null],
  [/\b(termos|paslanmaz\s*çelik\s*termos)\b/i, "outdoor-kamp"],
  [/\b(duvar\s*kağıd|stor\s*perde|masa\s*örtüs)\b/i, null],
  [/\b(makyaj\s*parfüm\s*nemlendir|doldurulabilir\s*losyon\s*şişes|boş\s*şişe|sprey\s*şişe)\b/i, null],
];

(async () => {
  const { data: allCats } = await sb.from("categories").select("id, slug, parent_id");
  const bySlug = new Map(allCats.map(c => [c.slug, c]));

  let totalMoved = 0, totalForeign = 0, totalKept = 0;
  const destCounts = {};

  for (const [parentSlug, leaves] of Object.entries(PARENT_LEAVES)) {
    const parent = bySlug.get(parentSlug);
    if (!parent) continue;

    let parentMoved = 0, parentKept = 0, parentForeign = 0;

    for (let page = 0; page < 20; page++) {
      const { data } = await sb.from("products")
        .select("id, title, category_id")
        .eq("category_id", parent.id)
        .range(page * 1000, page * 1000 + 999);
      if (!data || data.length === 0) break;

      for (const p of data) {
        const title = tlower(p.title);

        // 1. Yabancı ürün mü?
        let foreignTarget = null;
        let isForeign = false;
        for (const [re, targetSlug] of FOREIGN) {
          if (re.test(title)) {
            isForeign = true;
            if (targetSlug) foreignTarget = bySlug.get(targetSlug);
            break;
          }
        }
        if (isForeign) {
          const target = foreignTarget ?? (parent.parent_id ? { id: parent.parent_id, slug: "[parent-of-parent]" } : null);
          if (target && target.id !== parent.id) {
            if (!DRY) await sb.from("products").update({ category_id: target.id }).eq("id", p.id);
            parentForeign++;
            destCounts[target.slug ?? "root"] = (destCounts[target.slug ?? "root"] || 0) + 1;
          }
          continue;
        }

        // 2. Leaf'e dağıt
        let matched = null;
        for (const [leafSlug, re] of leaves) {
          if (re.test(title)) { matched = bySlug.get(leafSlug); break; }
        }
        if (matched && matched.id !== parent.id) {
          if (!DRY) await sb.from("products").update({ category_id: matched.id }).eq("id", p.id);
          parentMoved++;
          destCounts[matched.slug] = (destCounts[matched.slug] || 0) + 1;
        } else {
          parentKept++;
        }
      }
      if (data.length < 1000) break;
    }

    console.log(`${parentSlug.padEnd(16)} kept=${parentKept} → leaf=${parentMoved} foreign=${parentForeign}`);
    totalMoved += parentMoved;
    totalKept += parentKept;
    totalForeign += parentForeign;
  }

  console.log(`\n=== ${DRY ? "DRY RUN" : "APPLIED"} ===`);
  console.log(`Total kept at parent: ${totalKept}`);
  console.log(`Total moved to leaf:  ${totalMoved}`);
  console.log(`Total moved foreign:  ${totalForeign}`);

  console.log(`\nTop destinations:`);
  Object.entries(destCounts).sort((a, b) => b[1] - a[1]).forEach(([s, c]) => {
    console.log(`  ${String(c).padStart(5)}  ${s}`);
  });
})();
