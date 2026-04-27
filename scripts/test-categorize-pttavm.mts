import { createClient } from "@supabase/supabase-js";
import { categorizeFromTitle } from "../src/lib/categorizeFromTitle.mts";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const { data: listings } = await sb.from("listings")
  .select("id, source_title")
  .eq("source", "pttavm");

let matched = 0, unmatched = 0;
const slugCounts: Record<string, number> = {};
const matchedSamples: Array<{ t: string; slug: string; kw: string }> = [];
const unmatchedSamples: string[] = [];

for (const l of listings ?? []) {
  const r = categorizeFromTitle(l.source_title || "");
  if (r.slug) {
    matched++;
    slugCounts[r.slug] = (slugCounts[r.slug] || 0) + 1;
    if (matchedSamples.length < 5) {
      matchedSamples.push({
        t: (l.source_title || "").slice(0, 55),
        slug: r.slug,
        kw: r.matchedKeyword || "",
      });
    }
  } else {
    unmatched++;
    if (unmatchedSamples.length < 12) {
      unmatchedSamples.push((l.source_title || "").slice(0, 75));
    }
  }
}

const total = listings?.length ?? 0;
process.stdout.write(`Total: ${total} | Matched: ${matched} (${((matched / total) * 100).toFixed(1)}%) | Unmatched: ${unmatched}\n`);
process.stdout.write("--- Slug dagilimi ---\n");
Object.entries(slugCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([k, v]) => process.stdout.write(`  ${k.padEnd(28)} ${v}\n`));
process.stdout.write("--- Matched ornek ---\n");
matchedSamples.forEach((s) =>
  process.stdout.write(`  ${s.slug.padEnd(20)} | ${s.kw.padEnd(20)} | ${s.t}\n`),
);
process.stdout.write("--- Unmatched ornek (Gemini gerekli) ---\n");
unmatchedSamples.forEach((s) => process.stdout.write(`  ${s}\n`));
