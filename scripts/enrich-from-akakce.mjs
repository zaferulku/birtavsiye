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
const CATEGORY = (process.argv.find(a => a.startsWith("--category=")) || "").split("=")[1];
const SKIP_ENRICHED = process.argv.includes("--skip-enriched");
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

      // 1) Multi-section spec extraction
      const specs = {};
      document.querySelectorAll("table tr").forEach(tr => {
        const cells = tr.querySelectorAll("td, th");
        if (cells.length < 2) return;
        const key = cells[0].textContent?.replace(/:/g, "").trim();
        const val = cells[1].textContent?.replace(/^:\s*/, "").trim();
        if (key && val && key.length < 60 && val.length < 300) specs[key] = val;
      });
      document.querySelectorAll("dl").forEach(dl => {
        const dts = dl.querySelectorAll("dt");
        const dds = dl.querySelectorAll("dd");
        for (let i = 0; i < Math.min(dts.length, dds.length); i++) {
          const k = dts[i].textContent?.trim();
          const v = dds[i].textContent?.trim();
          if (k && v && k.length < 60 && v.length < 300 && !specs[k]) specs[k] = v;
        }
      });
      document.querySelectorAll("ul li, .spec_list li, [class*=tech] li").forEach(li => {
        const txt = li.textContent?.trim() || "";
        const m = txt.match(/^([^:]{2,50}):\s*(.{1,300})$/);
        if (m && !specs[m[1].trim()]) specs[m[1].trim()] = m[2].trim();
      });

      // 2) JSON-LD ProductGroup/Product
      let jsonLd = null;
      document.querySelectorAll("script[type='application/ld+json']").forEach(s => {
        try {
          const obj = JSON.parse(s.textContent);
          if (obj["@type"] === "ProductGroup" || obj["@type"] === "Product") jsonLd = obj;
        } catch {}
      });

      // 3) Offers (tüm satıcılar)
      const offers = [];
      if (jsonLd?.offers?.offers) {
        for (const o of jsonLd.offers.offers) {
          offers.push({
            seller: o.seller?.name || null,
            price: o.price ? parseFloat(o.price) : null,
            currency: o.priceCurrency || "TRY",
            url: o.url || null,
            availability: (o.availability || "").replace("https://schema.org/", ""),
          });
        }
      }

      const jsonCategory = jsonLd?.category || null;
      const brandLogo = jsonLd?.brand?.logo || null;
      const description = jsonLd?.description || document.querySelector("meta[name='description']")?.getAttribute("content") || null;

      // 4) Görseller — JSON-LD + DOM birleşimi
      const imgSet = new Set();
      if (jsonLd?.image) {
        const imgs = Array.isArray(jsonLd.image) ? jsonLd.image : [jsonLd.image];
        for (const i of imgs) {
          const url = typeof i === "string" ? i : (i.contentUrl || i.url);
          if (url) imgSet.add(url);
        }
      }
      document.querySelectorAll("img").forEach(img => {
        let src = img.getAttribute("src") || img.getAttribute("data-src") || "";
        if (!src) return;
        src = src.replace(/_[sh]\.(jpg|jpeg|png|webp)/i, "_l.$1");
        if (/akakce\.akamaized\.net|akakce\.com\/.*\.(jpg|jpeg|png|webp)/i.test(src) || /cdn\.akakce\.com/i.test(src)) {
          const abs = src.startsWith("http") ? src : new URL(src, location.href).href;
          imgSet.add(abs);
        }
      });
      const images = [...imgSet].slice(0, 15);

      const price = jsonLd?.offers?.lowPrice || document.querySelector(".pb_v8, .pt_v8")?.textContent?.trim() || null;

      return {
        akakceTitle: title,
        akakceUrl: location.href,
        akakcePrice: price,
        specs,
        images,
        offers,
        category: jsonCategory,
        brandLogo,
        description,
        offerCount: jsonLd?.offers?.offerCount ? parseInt(jsonLd.offers.offerCount, 10) : offers.length,
      };
    });

    return data;
  } catch (e) {
    return { error: e.message };
  }
}

(async () => {
  let query = sb.from("products").select("id, title, brand, model_family, specs, image_url, images");
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
    if (CATEGORY) {
      const { data: cat } = await sb.from("categories").select("id").eq("slug", CATEGORY).maybeSingle();
      if (!cat) { console.error(`Category not found: ${CATEGORY}`); process.exit(1); }
      // Hem direkt kategori hem de descendant kategorilerdeki ürünleri al
      const { data: allCats } = await sb.from("categories").select("id, parent_id");
      const childMap = new Map();
      for (const c of allCats) {
        const arr = childMap.get(c.parent_id) ?? [];
        arr.push(c.id);
        childMap.set(c.parent_id, arr);
      }
      const descendantIds = [cat.id];
      const stack = [cat.id];
      while (stack.length) {
        const id = stack.pop();
        for (const c of childMap.get(id) ?? []) { descendantIds.push(c); stack.push(c); }
      }
      query = query.in("category_id", descendantIds);
    }
    query = query.limit(LIMIT);
  }
  // SKIP_ENRICHED: specs._akakce zaten varsa atla (re-run'da duplicate iş olmasın)
  const { data: productsRaw, error } = await query;
  if (error) { console.error(error); process.exit(1); }
  const products = SKIP_ENRICHED
    ? (productsRaw ?? []).filter(p => !(p.specs && typeof p.specs === "object" && p.specs._akakce))
    : (productsRaw ?? []);
  if (products.length === 0) { console.log("No products to process."); return; }
  console.log(`Processing ${products.length} products${SKIP_ENRICHED ? " (skipping already enriched)" : ""}...`);

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
    const merged = {
      ...existing,
      ...result.specs,
      _akakce: {
        url: result.akakceUrl,
        title: result.akakceTitle,
        price: result.akakcePrice,
        at: new Date().toISOString(),
        category: result.category,
        brandLogo: result.brandLogo,
        description: result.description,
        offerCount: result.offerCount,
      },
      _akakce_offers: result.offers || [],
    };
    const imgCount = (result.images || []).length;
    const offerCount = (result.offers || []).length;

    if (!DRY) {
      const updatePayload = { specs: merged };
      if (imgCount > 0) {
        updatePayload.images = result.images;
        if (!p.image_url) updatePayload.image_url = result.images[0];
      }
      const { error: upErr } = await sb.from("products").update(updatePayload).eq("id", p.id);
      if (upErr) { console.log(`UPDATE FAIL: ${upErr.message}`); fail++; continue; }
    }
    console.log(`+${specCount} specs +${imgCount} img +${offerCount} offers ${DRY ? "(dry)" : "saved"}`);
    ok++;
    await page.waitForTimeout(DELAY_MS);
  }

  await browser.close();
  console.log(`\n=== ${DRY ? "DRY RUN" : "APPLIED"} ===`);
  console.log(`OK: ${ok} | FAIL: ${fail} | SKIPPED: ${skipped}`);
})();
