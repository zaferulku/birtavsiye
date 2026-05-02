/**
 * P6.1 ADIM 4 — Eval fixture migrate (Phase 5 hierarchik path).
 *
 * Bug A: chatbot_dialogs_*.jsonl category_slug field'ları leaf-only format
 * (Phase 5 öncesi). Phase 5 sonrası DB slug'lar full hierarchik path.
 * Eval comparator format mismatch ile FAIL veriyor.
 *
 * Bu script: her dialog'taki category_slug değerini DB'de leaf-suffix match
 * ile full path'e çevirir. Backup .v1-backup uzantısıyla saklanır.
 *
 * Run: npx tsx scripts/migrate-eval-fixtures.mts
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const env = readFileSync(".env.local", "utf8");
env.split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
});

const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const { data: catRows, error } = await sb.from("categories").select("slug");
if (error) {
  console.error("DB fetch fail:", error.message);
  process.exit(1);
}
const taxonomy = new Set(catRows.map((c) => c.slug));

// Manuel mapping fallback (Phase 5D-3.3 + Migration 029 ile uyumlu)
const MANUAL_MAPPINGS: Record<string, string> = {
  "telefon-kilifi": "elektronik/telefon/kilif",
  "telefon-yedek-parca": "elektronik/telefon/yedek-parca",
  "telefon-aksesuar": "elektronik/telefon/aksesuar",
  "fotograf-kamera": "elektronik/kamera/fotograf-makinesi",
  "guvenlik-kamerasi": "elektronik/ag-guvenlik/guvenlik-kamera",
  "bilgisayar-bilesenleri": "elektronik/bilgisayar-tablet/bilesenler",
  tv: "elektronik/tv-ses-goruntu/televizyon",
  firin: "beyaz-esya/firin-ocak",
  "kedi-mamasi": "pet-shop/kedi/mama",
  "kopek-mamasi": "pet-shop/kopek/mama",
  "kedi-kumu": "pet-shop/kedi/kum",
  "erkek-giyim-ust": "moda/erkek-giyim/ust",
  "erkek-giyim-alt": "moda/erkek-giyim/alt",
  "kadin-giyim-ust": "moda/kadin-giyim/ust",
  "kadin-giyim-alt": "moda/kadin-giyim/alt",
  "kadin-elbise": "moda/kadin-giyim/elbise",
};

function resolveSlug(leafOrPath: string): string | null {
  if (taxonomy.has(leafOrPath)) return leafOrPath;
  const mapped = MANUAL_MAPPINGS[leafOrPath];
  if (mapped && taxonomy.has(mapped)) return mapped;
  const matches: string[] = [];
  for (const t of taxonomy) {
    if (t === leafOrPath || t.endsWith("/" + leafOrPath)) matches.push(t);
  }
  if (matches.length === 1) return matches[0];
  return null;
}

function migrateObject(
  obj: unknown,
  stats: { resolved: number; unchanged: number; unmatched: string[] },
): unknown {
  if (Array.isArray(obj)) return obj.map((item) => migrateObject(item, stats));
  if (obj && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (key === "category_slug" && typeof value === "string" && value) {
        if (taxonomy.has(value)) {
          result[key] = value;
          stats.unchanged++;
        } else {
          const resolved = resolveSlug(value);
          if (resolved) {
            result[key] = resolved;
            stats.resolved++;
          } else {
            result[key] = value;
            if (!stats.unmatched.includes(value)) stats.unmatched.push(value);
          }
        }
      } else {
        result[key] = migrateObject(value, stats);
      }
    }
    return result;
  }
  return obj;
}

const FIXTURE_PATHS = [
  "tests/chatbot/fixtures/chatbot_dialogs_200.jsonl",
  "tests/chatbot/fixtures/chatbot_dialogs_eval2_200.jsonl",
];

for (const fpath of FIXTURE_PATHS) {
  if (!existsSync(fpath)) {
    console.warn(`SKIP: ${fpath} not found`);
    continue;
  }
  const backupPath = fpath + ".v1-backup";
  if (!existsSync(backupPath)) {
    copyFileSync(fpath, backupPath);
    console.log(`Backup: ${backupPath}`);
  } else {
    console.log(`Backup exists: ${backupPath} (skipping copy)`);
  }

  const raw = readFileSync(fpath, "utf8");
  const lines = raw.split("\n");
  const stats = { resolved: 0, unchanged: 0, unmatched: [] as string[] };
  const newLines: string[] = [];
  let dialogsProcessed = 0;

  for (const line of lines) {
    if (line.trim().length === 0) {
      newLines.push(line);
      continue;
    }
    try {
      const obj = JSON.parse(line);
      const migrated = migrateObject(obj, stats);
      newLines.push(JSON.stringify(migrated));
      dialogsProcessed++;
    } catch (_e) {
      console.warn(`Parse fail: ${line.slice(0, 80)}...`);
      newLines.push(line);
    }
  }

  writeFileSync(fpath, newLines.join("\n"), "utf8");
  console.log(
    `${fpath}: ${dialogsProcessed} dialog | resolved=${stats.resolved}, unchanged=${stats.unchanged}, unmatched=${stats.unmatched.length}`,
  );
  if (stats.unmatched.length > 0) {
    console.log(`  Unmatched slug'lar:`, stats.unmatched.slice(0, 10).join(", "));
  }
}

console.log("\nDone.");
