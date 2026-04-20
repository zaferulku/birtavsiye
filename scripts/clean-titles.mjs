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

function cleanTitle(title) {
  if (!title) return title;
  // Normalize Turkish caps (İ→i, I→ı) so case-insensitive regex matches
  const normalized = normalizeForMatch(title);
  let t = title;
  // Find removable spans using normalized version, cut from original
  for (const re of NOISE_PATTERNS) {
    re.lastIndex = 0;
    const spans = [];
    let m;
    while ((m = re.exec(normalized)) !== null) {
      spans.push({ start: m.index, end: m.index + m[0].length });
      if (!re.global) break;
    }
    // Apply spans in reverse order to original
    for (let i = spans.length - 1; i >= 0; i--) {
      const s = spans[i];
      t = t.slice(0, s.start) + t.slice(s.end);
    }
  }
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

(async () => {
  let processed = 0, changed = 0, skipped = 0;
  const examples = [];

  for (let page = 0; page < 60; page++) {
    if (processed >= LIMIT) break;
    const { data } = await sb
      .from("products")
      .select("id, title, specs")
      .range(page * 1000, page * 1000 + 999);

    if (!data || data.length === 0) break;

    for (const p of data) {
      if (processed >= LIMIT) break;
      processed++;
      const original = p.title || "";
      const cleaned = cleanTitle(original);

      if (cleaned === original || cleaned.length < 5) {
        skipped++;
        continue;
      }

      if (examples.length < 25) examples.push({ from: original, to: cleaned });

      if (!DRY) {
        const newSpecs = { ...(p.specs || {}) };
        if (!newSpecs.original_title) newSpecs.original_title = original;
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
