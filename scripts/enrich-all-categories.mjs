// Tüm üst kategorileri sırayla enrich eder. Her biri için enrich-from-akakce.mjs spawn eder.
// --skip-enriched zaten var olanları atlar, re-run güvenli.
// node --env-file=.env.local scripts/enrich-all-categories.mjs

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Round 2: büyük havuzlarda limit yükseltildi (skip-enriched zaten işlenenleri
// atlar, sadece yeni ürünler taranır)
const CATEGORIES = [
  { slug: "kozmetik",     limit: 3000 },
  { slug: "moda",         limit: 3000 },
  { slug: "spor-outdoor", limit: 2500 },
  { slug: "ev-yasam",     limit: 2000 },
  { slug: "elektronik",   limit: 3000 },
  { slug: "anne-bebek",   limit: 500 },
  { slug: "otomotiv",     limit: 500 },
  { slug: "yapi-market",  limit: 500 },
  { slug: "supermarket",  limit: 300 },
  { slug: "pet-shop",     limit: 100 },
  { slug: "kitap-hobi",   limit: 100 },
];

function runOne(slug, limit) {
  return new Promise((resolve) => {
    console.log(`\n========== ${slug} (limit=${limit}) ==========`);
    const child = spawn(
      "node",
      ["--env-file=.env.local", path.join(__dirname, "enrich-from-akakce.mjs"),
        `--category=${slug}`, `--limit=${limit}`, "--headless=true", "--skip-enriched"],
      { stdio: "inherit", cwd: path.dirname(__dirname) }
    );
    child.on("exit", (code) => {
      console.log(`${slug} done (exit ${code})`);
      resolve(code);
    });
  });
}

(async () => {
  for (const c of CATEGORIES) {
    await runOne(c.slug, c.limit);
  }
  console.log("\n=== ALL CATEGORIES DONE ===");
})();
