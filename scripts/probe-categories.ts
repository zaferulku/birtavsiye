// Diagnostic probe: taxonomy + Migration 007 deploy + embedding NULL.
// Run: npx tsx --env-file=.env.local scripts/probe-categories.ts
import { createClient } from "@supabase/supabase-js";

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // 1) Taxonomy probe (kahve / spor / canta / bebek family)
  console.log("=== Taxonomy ===");
  const { data: cats, error: catErr } = await sb
    .from("categories")
    .select("slug,name")
    .or("slug.like.%kahve%,slug.like.%spor%,slug.like.%canta%,slug.like.%bebek%");
  if (catErr) {
    console.error("ERR:", catErr.message);
  } else {
    console.log("matches:", cats!.length);
    for (const r of cats!.sort((a, b) => a.slug.localeCompare(b.slug))) {
      console.log(" ", r.slug, "|", r.name);
    }
  }

  // 2) Migration 007 deploy check (products.is_accessory)
  console.log("\n=== Migration 007 (products.is_accessory) ===");
  const m7 = await sb
    .from("products")
    .select("id, is_accessory, accessory_reason, accessory_detected_at")
    .limit(2);
  if (m7.error) {
    console.error("Migration 007 NOT deployed:", m7.error.message);
  } else {
    console.log("Migration 007 deployed. Sample:");
    for (const r of m7.data!) console.log(" ", JSON.stringify(r));
    const { count: total } = await sb.from("products").select("*", { count: "exact", head: true });
    const { count: flagged } = await sb
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("is_accessory", true);
    console.log("Total products:", total, "| flagged is_accessory=true:", flagged);
  }

  // 3) Embedding NULL check (Faz 1 ürünleri için)
  console.log("\n=== Embedding NULL coverage ===");
  const { count: totalCount } = await sb
    .from("products")
    .select("*", { count: "exact", head: true });
  const { count: nullCount } = await sb
    .from("products")
    .select("*", { count: "exact", head: true })
    .is("embedding", null);
  if (totalCount !== null && nullCount !== null) {
    const pct = ((nullCount / totalCount) * 100).toFixed(1);
    console.log("Total:", totalCount, "| embedding NULL:", nullCount, `(${pct}%)`);
  }

  // 4) brand: "null" string (eski technical debt)
  console.log("\n=== brand=\"null\" string (legacy debt) ===");
  const { count: brandNullCount } = await sb
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("brand", "null");
  console.log('Products with brand="null" string:', brandNullCount);

  // 5) Categories tree (Header debt — 83 keşfedilmemiş)
  console.log("\n=== Categories tree depth ===");
  const { data: allCats } = await sb
    .from("categories")
    .select("id, slug, parent_id");
  if (allCats) {
    const roots = allCats.filter((c) => !c.parent_id);
    const children = allCats.filter((c) => c.parent_id);
    console.log("Total categories:", allCats.length);
    console.log("Root categories:", roots.length);
    console.log("Child (sub) categories:", children.length);
  }
}

main().catch((e) => {
  console.error("FATAL:", e?.message ?? e);
  process.exit(1);
});
