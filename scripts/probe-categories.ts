// One-shot taxonomy probe for TUR 2 fixture refresh decision.
// Run: npx tsx --env-file=.env.local scripts/probe-categories.ts
import { createClient } from "@supabase/supabase-js";

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data, error } = await sb
    .from("categories")
    .select("slug,name")
    .or("slug.like.%kahve%,slug.like.%spor%,slug.like.%canta%,slug.like.%bebek%");
  if (error) {
    console.error("ERR:", error.message);
    process.exit(1);
  }
  console.log("matches:", data.length);
  for (const r of data.sort((a, b) => a.slug.localeCompare(b.slug))) {
    console.log(" ", r.slug, "|", r.name);
  }
}

main().catch((e) => {
  console.error("FATAL:", e?.message ?? e);
  process.exit(1);
});
