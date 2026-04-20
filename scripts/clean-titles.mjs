// Ürün başlıklarından garanti/faturalı/outlet gibi satıcı-özgü gürültüyü temizle
// Orijinal başlık specs.original_title'a yedeklenir (geri alınabilir).
// node --env-file=.env.local scripts/clean-titles.mjs [--dry-run] [--limit=N]

import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DRY = process.argv.includes("--dry-run");
const limitArg = process.argv.find(a => a.startsWith("--limit="));
const LIMIT = limitArg ? parseInt(limitArg.split("=")[1], 10) : Infinity;

// Pre-normalize Turkish uppercase to lowercase equivalents before regex
// (JavaScript'in default case-folding'i Türkçe İ/I'yi doğru eşlemiyor)
function normalizeForMatch(s) {
  return s.replace(/İ/g, "i").replace(/I/g, "ı");
}

// NOISE patterns — run against lowercased version, then map back
const NOISE_PATTERNS = [
  /\s*\(\s*(?:ithalat[çc][ıi]|distrib[uü]t[oö]r|apple\s*t[uü]rkiye|t[uü]rkiye|resmi|yeni|\d+\s*y[ıi]l)\s*(?:t[uü]rkiye)?\s*garantil?i?\s*(?:fatural[ıi])?\s*\)/gi,
  /\s*\(\s*(?:\d+\s*y[ıi]l)?\s*garantil?i?\s*\)/gi,
  /\s*\(\s*fatural[ıi]\s*\)/gi,
  /\s*\(\s*te[sş]hir\s*(?:[uü]r[uü]n)?\s*\)/gi,
  /\s*\(\s*outlet\s*(?:[uü]r[uü]n)?\s*\)/gi,
  /\s*\(\s*(?:a|b|c)\s*grade\s*\)/gi,
  /\s*\(\s*s[ıi]f[ıi]r\s*(?:[uü]r[uü]n)?\s*\)/gi,
  /\s*\(\s*kutulu\s*\)/gi,
  /\s*\(\s*orijinal\s*\)/gi,
  /\s*\(\s*hatas[ıi]z\s*\)/gi,
  /\s*\(\s*ad[ıi]n[ıi]za\s*fatural[ıi]\s*\)/gi,
  /\s*\[\s*[^\]]{0,50}\]\s*/g,
  /\s*-\s*(?:resmi|t[uü]rkiye|\d+\s*y[ıi]l)\s*garantil?i?\s*(?:fatural[ıi])?$/gi,
  /\s*-\s*fatural[ıi]\s*$/gi,
  /\s*-\s*te[sş]hir\s*(?:[uü]r[uü]n)?\s*$/gi,
  /\s*(?:ithalat[çc][ıi]|distrib[uü]t[oö]r|apple\s*t[uü]rkiye|t[uü]rkiye|resmi)\s*garantili?\s*(?:fatural[ıi])?\s*$/gi,
  /\s*-?\s*\(?\d+\s*y[ıi]l\s*garantil?i?\)?\s*$/gi,
];

// Kategori sonek keyword'leri — "Akıllı Telefon", "Televizyon" vs. son eklere atılır
const CATEGORY_SUFFIXES = /\s+(Akıllı\s*Telefon|Televizyon|Dizüstü\s*Bilgisayar|Laptop|Notebook|Tablet|Akıllı\s*Saat|Kulaklık|Çamaşır\s*Makinesi|Bulaşık\s*Makinesi|Buzdolabı|Klima|Fırın|Ocak|Saç\s*Kurutma\s*Makinesi|Blender|Fritöz)\b/gi;

// MPN/SKU pattern — 2-6 büyük harf + rakamlar + opsiyonel /harf
const MPN_PATTERN = /\b[A-Z]{2,8}\d+[A-Z0-9]{0,8}(?:\/[A-Z]{1,4})?\b/g;

// İngilizce renk/materyal → Türkçe
const EN_TR_MAP = [
  [/\bTitanium\b/gi, "Titanyum"],
  [/\bBlack\s+Titanium\b/gi, "Siyah Titanyum"],
  [/\bWhite\s+Titanium\b/gi, "Beyaz Titanyum"],
  [/\bNatural\s+Titanium\b/gi, "Naturel Titanyum"],
  [/\bDesert\s+Titanium\b/gi, "Çöl Titanyum"],
  [/\bBlue\s+Titanium\b/gi, "Mavi Titanyum"],
  [/\bMidnight\b/gi, "Gece Yarısı"],
  [/\bStarlight\b/gi, "Yıldız Işığı"],
  [/\bSpace\s+Gray\b/gi, "Uzay Grisi"],
  [/\bRose\s+Gold\b/gi, "Gül Altını"],
];

function applyRegexClean(title) {
  if (!title) return title;
  const normalized = normalizeForMatch(title);
  let t = title;

  for (const re of NOISE_PATTERNS) {
    re.lastIndex = 0;
    const spans = [];
    let m;
    while ((m = re.exec(normalized)) !== null) {
      spans.push({ start: m.index, end: m.index + m[0].length });
      if (!re.global) break;
    }
    for (let i = spans.length - 1; i >= 0; i--) {
      t = t.slice(0, spans[i].start) + t.slice(spans[i].end);
    }
  }

  t = t.replace(MPN_PATTERN, "");
  t = t.replace(CATEGORY_SUFFIXES, "");
  for (const [re, rep] of EN_TR_MAP) t = t.replace(re, rep);

  // Trailing/leading garbage cleanup
  t = t.replace(/\s*[-,]\s*$/g, ""); // sondaki - veya ,
  t = t.replace(/^\s*[-,]\s*/g, ""); // baştaki - veya ,
  t = t.replace(/,\s*,/g, ","); // duplicate comma
  t = t.replace(/\s+,/g, ","); // space before comma
  t = t.replace(/\(\s*\)/g, ""); // empty parens
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

function composeStructured(p) {
  const parts = [];
  if (p.brand) parts.push(p.brand);
  if (p.model_family) parts.push(p.model_family);
  if (p.variant_storage) parts.push(p.variant_storage);
  if (p.variant_color) parts.push(p.variant_color);
  return parts.join(" ").trim();
}

function cleanTitle(p) {
  const original = p.title || "";
  if (!original) return original;

  // Yapısal alanların hepsi varsa → onları kullan
  if (p.brand && p.model_family && p.variant_storage && p.variant_color) {
    return composeStructured(p);
  }

  // Yoksa regex cleanup + brand prefix strip
  let t = applyRegexClean(original);
  if (p.brand) {
    // Brand baştaysa ve tekrar ediyorsa (Apple xxx Apple) → tek bırak
    const brandPrefixRe = new RegExp(`^\\s*${p.brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+`, "i");
    const brandCount = (t.match(new RegExp(p.brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")) || []).length;
    if (brandCount > 1) t = t.replace(brandPrefixRe, "");
  }
  return t.replace(/\s+/g, " ").trim();
}

(async () => {
  let processed = 0, changed = 0, skipped = 0;
  const examples = [];

  for (let page = 0; page < 60; page++) {
    if (processed >= LIMIT) break;
    const { data } = await sb
      .from("products")
      .select("id, title, brand, model_family, variant_storage, variant_color, specs")
      .range(page * 1000, page * 1000 + 999);

    if (!data || data.length === 0) break;

    for (const p of data) {
      if (processed >= LIMIT) break;
      processed++;
      // Önce orijinali bul — önceki run'dan backup varsa onu kaynak al
      const currentTitle = p.title || "";
      const backupTitle = (p.specs && typeof p.specs === "object" && typeof p.specs.original_title === "string") ? p.specs.original_title : null;
      const sourceTitle = backupTitle ?? currentTitle;
      const cleaned = cleanTitle({ ...p, title: sourceTitle });

      if (cleaned === currentTitle || cleaned.length < 5) {
        skipped++;
        continue;
      }

      if (examples.length < 25) examples.push({ from: currentTitle, to: cleaned });

      if (!DRY) {
        const newSpecs = { ...(p.specs || {}) };
        if (!newSpecs.original_title) newSpecs.original_title = currentTitle;
        await sb.from("products").update({ title: cleaned, specs: newSpecs }).eq("id", p.id);
      }
      changed++;
    }

    if (data.length < 1000) break;
    if ((page + 1) % 5 === 0) process.stdout.write(`\r  page ${page + 1}: processed=${processed} changed=${changed}`);
  }

  console.log(`\n\n=== ${DRY ? "DRY RUN" : "APPLIED"} ===`);
  console.log(`Processed: ${processed}`);
  console.log(`Changed:   ${changed}`);
  console.log(`Skipped:   ${skipped}`);

  console.log(`\nExamples (first 25):`);
  for (const ex of examples) {
    console.log(`  FROM: ${ex.from.slice(0, 90)}`);
    console.log(`  TO:   ${ex.to.slice(0, 90)}`);
    console.log();
  }

  if (DRY) console.log("\n[DRY RUN] — Uygulamak için --dry-run'ı kaldır.");
})();
