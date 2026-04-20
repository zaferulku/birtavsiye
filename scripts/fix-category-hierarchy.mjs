// Yanlış yerde kalmış root kategorileri doğru parent'a bağla.
// node --env-file=.env.local scripts/fix-category-hierarchy.mjs

import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// child_slug → new_parent_slug
const FIXES = {
  // Otomotiv dalı
  "arac-aksesuar":    "otomotiv",
  "arac-elektronigi": "otomotiv",
  "navigasyon":       "arac-elektronigi",

  // Anne-Bebek dalı
  "bebek-arabasi":    "anne-bebek",
  "bebek-bakim":      "anne-bebek",

  // Kozmetik dalı
  "agiz-dis":         "kozmetik",

  // Ev & Yaşam dalı
  "aydinlatma":       "ev-yasam",
  "bahce-balkon":     "ev-yasam",
  "banyo":            "ev-yasam",

  // Evcil Hayvan dalı
  "balik-akvaryum":   "evcil-hayvan",
};

(async () => {
  const { data: cats } = await sb.from("categories").select("id, slug, parent_id");
  const bySlug = new Map(cats.map(c => [c.slug, c]));

  let fixed = 0, skipped = 0, missing = 0;

  for (const [child, parent] of Object.entries(FIXES)) {
    const childCat = bySlug.get(child);
    const parentCat = bySlug.get(parent);
    if (!childCat) { console.warn("missing child:", child); missing++; continue; }
    if (!parentCat) { console.warn("missing parent:", parent); missing++; continue; }

    if (childCat.parent_id === parentCat.id) {
      console.log("✓", child, "→", parent, "(already)");
      skipped++;
      continue;
    }

    await sb.from("categories").update({ parent_id: parentCat.id }).eq("id", childCat.id);
    console.log("+", child, "→", parent);
    fixed++;
  }

  console.log(`\n=== DONE ===`);
  console.log(`Fixed:   ${fixed}`);
  console.log(`Already: ${skipped}`);
  console.log(`Missing: ${missing}`);
})();
