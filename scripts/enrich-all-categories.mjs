// Tüm üst kategorileri sırayla enrich eder. Her biri için enrich-from-akakce.mjs spawn eder.
// --skip-enriched zaten var olanları atlar, re-run güvenli.
// node --env-file=.env.local scripts/enrich-all-categories.mjs

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Hacme göre sırala (büyük havuz önce)
const CATEGORIES = [
  { slug: "kozmetik",     limit: 500 },
  { slug: "moda",         limit: 500 },
  { slug: "spor-outdoor", limit: 500 },
  { slug: "ev-yasam",     limit: 400 },
  { slug: "anne-bebek",   limit: 200 },
  { slug: "otomotiv",     limit: 130 },
  { slug: "yapi-market",  limit: 160 },
  { slug: "supermarket",  limit: 60 },
  { slug: "pet-shop",     limit: 22 },
  { slug: "kitap-hobi",   limit: 21 },
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
