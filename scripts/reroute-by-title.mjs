// Mevcut ürünleri scripts/lib/category-router.mjs kullanarak doğru kategoriye taşır.
// node --env-file=.env.local scripts/reroute-by-title.mjs [--dry-run] [--category=<slug>] [--limit=N]

import { createClient } from "@supabase/supabase-js";
import { buildRouter } from "./lib/category-router.mjs";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const DRY = process.argv.includes("--dry-run");
const ONLY_CATEGORY = (process.argv.find(a => a.startsWith("--category=")) || "").split("=")[1];
const LIMIT = parseInt((process.argv.find(a => a.startsWith("--limit=")) || "").split("=")[1] || "0", 10);

(async () => {
  const router = await buildRouter(sb);

  let filterCategoryId = null;
  if (ONLY_CATEGORY) {
    const cat = router.categoryBySlug.get(ONLY_CATEGORY);
    if (!cat) { console.error(`Category not found: ${ONLY_CATEGORY}`); process.exit(1); }
    filterCategoryId = cat.id;
  }

  let off = 0;
  let moved = 0, kept = 0;
  const destCounts = {};
  const BATCH = 1000;

  while (true) {
    let q = sb.from("products").select("id, title, brand, category_id").range(off, off + BATCH - 1);
    if (filterCategoryId) q = q.eq("category_id", filterCategoryId);
    const { data } = await q;
    if (!data || data.length === 0) break;

    const updates = [];
    for (const p of data) {
      const res = router.route(p.title, p.brand, p.category_id);
      if (!res || !res.changed) { kept++; continue; }
      updates.push({ id: p.id, category_id: res.categoryId });
      moved++;
      destCounts[res.reason] = (destCounts[res.reason] || 0) + 1;
    }

    if (!DRY && updates.length > 0) {
      for (let i = 0; i < updates.length; i += 100) {
        const chunk = updates.slice(i, i + 100);
        await Promise.all(chunk.map(u =>
          sb.from("products").update({ category_id: u.category_id }).eq("id", u.id)
        ));
      }
    }

    process.stdout.write(`\r  [${off + data.length}] moved=${moved} kept=${kept}`);
    if (data.length < BATCH) break;
    if (LIMIT > 0 && off + BATCH >= LIMIT) break;
    off += BATCH;
  }

  console.log(`\n\n=== ${DRY ? "DRY RUN" : "APPLIED"} ===`);
  console.log(`Moved: ${moved}`);
  console.log(`Kept:  ${kept}`);
  console.log("\nTop destinations:");
  Object.entries(destCounts).sort((a, b) => b[1] - a[1]).forEach(([s, c]) => {
    console.log(`  ${String(c).padStart(5)}  ${s}`);
  });
})();
