// Decode mojibake (UTF-8 → Latin-1 → re-saved as UTF-8) back to proper UTF-8.
// Source content: chatbot_dialogs_200 fixture had Turkish chars corrupted on upload
// (kÄ±rmÄ±zÄ± → kırmızı). API returns proper UTF-8, fixture must match.
//
// Kullanim:
//   node scripts/fix-mojibake-jsonl.mjs <input> <output>
import fs from "node:fs";

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error("Usage: node scripts/fix-mojibake-jsonl.mjs <input> <output>");
  process.exit(2);
}

const text = fs.readFileSync(inPath, "utf8");
const fixed = Buffer.from(text, "latin1").toString("utf8");
fs.writeFileSync(outPath, fixed);

const lines = fixed.split("\n").filter((l) => l.trim().length > 0);
console.log(`Lines: ${lines.length}`);
const first = JSON.parse(lines[0]);
console.log(`First: ${first.id} ${first.category_slug} ${first.scenario_type} turns: ${first.turns.length}`);
