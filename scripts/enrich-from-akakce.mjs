// Akakce'den ürün teknik özelliklerini (specs) çeker ve products.specs'e merge eder.
// Cloudflare challenge'ı navigator.webdriver spoof + --disable-blink-features bayrağı ile geçilir.
//
// Kullanım:
//   node --env-file=.env.local scripts/enrich-from-akakce.mjs --limit=10
//   node --env-file=.env.local scripts/enrich-from-akakce.mjs --id=<uuid>
//   node --env-file=.env.local scripts/enrich-from-akakce.mjs --brand=apple --limit=50
//
// Flags:
//   --dry-run     specs çek ama DB'ye yazma
//   --headless    true|false (default: false — challenge için görünür gerekebilir)

import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const DRY = process.argv.includes("--dry-run");
const HEADLESS = (process.argv.find(a => a.startsWith("--headless=")) || "").split("=")[1] === "true";
const ONLY_ID = (process.argv.find(a => a.startsWith("--id=")) || "").split("=")[1];
const BRAND = (process.argv.find(a => a.startsWith("--brand=")) || "").split("=")[1];
const LIMIT = parseInt((process.argv.find(a => a.startsWith("--limit=")) || "").split("=")[1] || "10", 10);
const DELAY_MS = 3000;

function buildQuery(p) {
  const parts = [p.brand, p.model_family].filter(Boolean).join(" ");
  return parts.trim() || p.title.slice(0, 60);
}

async function enrichOne(page, product) {
  const q = buildQuery(product);
  if (!q) return null;

  const searchUrl = `https://www.akakce.com/arama/?q=${encodeURIComponent(q)}`;
  try {
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(7000);

    const first = await page.evaluate(() => {
      const a = document.querySelector('a.pw_v8, .pr_list a[href*="fiyati"], h3 a[href*="fiyati"]');
      return a ? a.href : null;
    });
    if (!first) return { error: "no search result" };

    await page.goto(first, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(6000);

    const data = await page.evaluate(() => {
      const title = document.querySelector("h1")?.textContent?.trim() || null;
      const specs = {};
      document.querySelectorAll("table tr").forEach(tr => {
        const cells = tr.querySelectorAll("td, th");
        if (cells.length < 2) return;
        const key = cells[0].textContent?.replace(/:/g, "").trim();
        const val = cells[1].textContent?.replace(/^:\s*/, "").trim();
        if (key && val && key.length < 60 && val.length < 200) specs[key] = val;
      });
      const price = document.querySelector(".pb_v8, .pt_v8")?.textContent?.trim() || null;
      return { akakceTitle: title, akakceUrl: location.href, akakcePrice: price, specs };
    });

    return data;
  } catch (e) {
    return { error: e.message };
  }
}

(async () => {
  let query = sb.from("products").select("id, title, brand, model_family, specs");
  if (ONLY_ID) query = query.eq("id", ONLY_ID);
  else {
    // Aksesuar (kılıf, batarya, kablo vs.) enrich etme — specs iPhone'a ait olur
    query = query.not("model_family", "is", null)
      .not("title", "ilike", "%kılıf%")
      .not("title", "ilike", "%batarya%")
      .not("title", "ilike", "%kablo%")
      .not("title", "ilike", "%ekran koruyucu%")
      .not("title", "ilike", "%uyumlu%");
    if (BRAND) query = query.ilike("brand", BRAND);
    query = query.limit(LIMIT);
  }
  const { data: products, error } = await query;
  if (error) { console.error(error); process.exit(1); }
  if (!products || products.length === 0) { console.log("No products found."); return; }
  console.log(`Processing ${products.length} products...`);

  const browser = await chromium.launch({
    headless: HEADLESS,
    args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"],
  });
  const ctx = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    locale: "tr-TR",
    viewport: { width: 1366, height: 768 },
  });
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    Object.defineProperty(navigator, "languages", { get: () => ["tr-TR", "tr", "en-US"] });
  });
  const page = await ctx.newPage();

  let ok = 0, fail = 0, skipped = 0;
  for (const p of products) {
    process.stdout.write(`  [${p.id.slice(0, 8)}] ${(p.title || "").slice(0, 60)} … `);
    const result = await enrichOne(page, p);
    if (!result || result.error) {
      console.log(`FAIL: ${result?.error ?? "unknown"}`);
      fail++;
      await page.waitForTimeout(DELAY_MS);
      continue;
    }
    const specCount = Object.keys(result.specs || {}).length;
    if (specCount === 0) {
      console.log("skipped (no specs)");
      skipped++;
      await page.waitForTimeout(DELAY_MS);
      continue;
    }

    const existing = (p.specs && typeof p.specs === "object") ? p.specs : {};
    const merged = { ...existing, ...result.specs, _akakce: { url: result.akakceUrl, title: result.akakceTitle, price: result.akakcePrice, at: new Date().toISOString() } };

    if (!DRY) {
      const { error: upErr } = await sb.from("products").update({ specs: merged }).eq("id", p.id);
      if (upErr) { console.log(`UPDATE FAIL: ${upErr.message}`); fail++; continue; }
    }
    console.log(`+${specCount} specs ${DRY ? "(dry)" : "saved"}`);
    ok++;
    await page.waitForTimeout(DELAY_MS);
  }

  await browser.close();
  console.log(`\n=== ${DRY ? "DRY RUN" : "APPLIED"} ===`);
  console.log(`OK: ${ok} | FAIL: ${fail} | SKIPPED: ${skipped}`);
})();
