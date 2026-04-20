// Telefonlarda variant_storage alanı RAM ile karışmış (8 GB, 12 GB gibi)
// Title'daki RAM'siz storage pattern'i yeniden çıkar, düzelt.
// node --env-file=.env.local scripts/fix-phone-storage.mjs [--dry-run]

import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DRY = process.argv.includes("--dry-run");

const VALID_STORAGES = new Set(["32", "64", "128", "256", "512", "1024"]);

function extractStorage(title) {
  if (!title) return null;
  const tbMatch = title.match(/\b(1|2)\s*TB\b/i);
  if (tbMatch) return `${tbMatch[1]} TB`;

  const gbRegex = /\b(\d{2,4})\s*(?:GB|gb)\b(?!\s*RAM)/gi;
  const candidates = [];
  let m;
  while ((m = gbRegex.exec(title)) !== null) {
    const num = m[1];
    if (VALID_STORAGES.has(num)) candidates.push(num);
  }

  if (candidates.length === 0) {
    const bareRegex = /\b(128|256|512|64|32)\b(?!\s*(?:GB\s*RAM|RAM|Bit))/g;
    while ((m = bareRegex.exec(title)) !== null) {
      candidates.push(m[1]);
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => parseInt(b) - parseInt(a));
  return `${candidates[0]} GB`;
}

const PHONE_TABLET_KEYS = new Set(["iphone", "galaxy", "redmi", "xiaomi", "huawei", "honor", "oppo", "vivo", "realme", "oneplus", "reeder", "casper", "nokia", "tcl", "ipad"]);

function isPhoneOrTablet(title, brand) {
  const t = (title || "").toLowerCase();
  const b = (brand || "").toLowerCase();
  if (PHONE_TABLET_KEYS.has(b)) return true;
  for (const kw of PHONE_TABLET_KEYS) if (t.includes(kw)) return true;
  return false;
}

const RAM_LIKE = new Set(["3 GB", "3GB", "4 GB", "4GB", "6 GB", "6GB", "8 GB", "8GB", "12 GB", "12GB", "16 GB", "16GB"]);

(async () => {
  let processed = 0, fixed = 0, skipped = 0;
  const examples = [];

  for (let page = 0; page < 60; page++) {
    const { data } = await sb
      .from("products")
      .select("id, title, brand, variant_storage, specs")
      .not("variant_storage", "is", null)
      .range(page * 1000, page * 1000 + 999);
    if (!data || data.length === 0) break;

    for (const p of data) {
      processed++;
      if (!RAM_LIKE.has(p.variant_storage)) { skipped++; continue; }
      if (!isPhoneOrTablet(p.title, p.brand)) { skipped++; continue; }

      let newStorage = null;
      const bk = p.specs?.["Bellek Kapasitesi"] || p.specs?.["Depolama"];
      if (typeof bk === "string" && bk.length > 0) newStorage = bk.trim();
      if (!newStorage) newStorage = extractStorage(p.title);

      if (!newStorage || newStorage === p.variant_storage || RAM_LIKE.has(newStorage)) {
        skipped++;
        continue;
      }

      if (examples.length < 20) examples.push({ old: p.variant_storage, new: newStorage, title: p.title.slice(0, 70) });

      if (!DRY) {
        await sb.from("products").update({ variant_storage: newStorage }).eq("id", p.id);
      }
      fixed++;
    }

    if (data.length < 1000) break;
  }

  console.log(`\n=== ${DRY ? "DRY RUN" : "APPLIED"} ===`);
  console.log(`Processed: ${processed}`);
  console.log(`Fixed:     ${fixed}`);
  console.log(`Skipped:   ${skipped}`);
  console.log(`\nExamples:`);
  examples.forEach(e => console.log(`  ${e.old} → ${e.new}  |  ${e.title}`));
})();
