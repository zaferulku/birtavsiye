// One-shot Bug E.2 — DB knowledge_chunks mojibake repair + re-embed.
// Run: npx tsx --env-file=.env.local scripts/fix-kb-mojibake-db.ts
//
// Filesystem fix: 19638ee (Bug E.1). This is the DB-side counterpart.
import { createClient } from "@supabase/supabase-js";
import { aiEmbed } from "../src/lib/ai/aiClient";

const fix = (s: string | null) =>
  (s || "")
    .replace(/Şrünleri/g, "Ürünleri")
    .replace(/Şrünler/g, "Ürünler")
    .replace(/Şrün/g, "Ürün")
    .replace(/Şrnek/g, "Örnek");

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const t0 = Date.now();
  const { data, error } = await sb
    .from("knowledge_chunks")
    .select("id, title, content")
    .or("title.ilike.%Şr%,content.ilike.%Şr%");
  console.log("SELECT", Date.now() - t0, "ms");
  if (error) {
    console.error("SELECT FAIL:", error.message);
    process.exit(1);
  }
  console.log("Bozuk satır:", data.length);

  let updated = 0;
  let embedded = 0;
  for (const row of data) {
    const newTitle = fix(row.title);
    const newContent = fix(row.content);
    if (newTitle === row.title && newContent === row.content) {
      console.log("SKIP no-change:", row.id);
      continue;
    }
    const { error: upErr } = await sb
      .from("knowledge_chunks")
      .update({ title: newTitle, content: newContent })
      .eq("id", row.id);
    if (upErr) {
      console.error("UPDATE FAIL:", row.id, upErr.message);
      continue;
    }
    updated++;
    try {
      const text = newTitle + "\n\n" + newContent;
      const { embedding } = await aiEmbed({ input: text });
      const { error: embErr } = await sb
        .from("knowledge_chunks")
        .update({ embedding })
        .eq("id", row.id);
      if (embErr) console.error("EMBED FAIL:", row.id, embErr.message);
      else embedded++;
      await new Promise((r) => setTimeout(r, 1000));
    } catch (e: any) {
      console.error("Embedding error:", row.id, e?.message ?? e);
    }
    console.log("OK", row.id, "|", newTitle.substring(0, 60));
  }
  console.log("--- OZET ---");
  console.log("Bozuk:", data.length, "| Updated:", updated, "| Re-embedded:", embedded);
}

main().catch((e) => {
  console.error("FATAL:", e?.message ?? e);
  process.exit(1);
});
