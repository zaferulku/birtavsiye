#!/usr/bin/env node
/**
 * Product Embedding Backfill Script
 *
 * Mevcut products tablosundaki embedding'siz ürünler için Gemini ile
 * embedding hesaplar.
 *
 * Strateji:
 *   1. embedding IS NULL olan aktif ürünleri tara
 *   2. Her ürün için "embedding text" oluştur (title + brand + category + key specs)
 *   3. Gemini gemini-embedding-001 ile 768-dim embedding al
 *   4. products.embedding alanına yaz
 *   5. Rate limit (10 rpm) ve hata yönetimi
 *
 * İdempotent: aynı script ikinci kez çalıştırılabilir, sadece eksikleri doldurur.
 *
 * Kullanım:
 *   node --env-file=.env.local scripts/backfill-embeddings.mjs --dry-run
 *   node --env-file=.env.local scripts/backfill-embeddings.mjs
 *   node --env-file=.env.local scripts/backfill-embeddings.mjs --limit 50
 *   node --env-file=.env.local scripts/backfill-embeddings.mjs --rebuild
 */

import { createClient } from "@supabase/supabase-js";

// ============================================================================
// Config
// ============================================================================

const DRY_RUN = process.argv.includes("--dry-run");
const REBUILD = process.argv.includes("--rebuild"); // Re-embed all
const LIMIT = parseInt(getArg("--limit") || "0", 10) || null;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_EMBED_MODEL = "gemini-embedding-001";
const GEMINI_EMBED_DIM = 768;

// Rate limiting: 10 rpm conservative for free tier
const EMBED_RPM = 10;
const EMBED_DELAY_MS = Math.ceil(60_000 / EMBED_RPM);

// Batch size for DB updates
const BATCH_REPORT_EVERY = 10;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getArg(flag) {
  const idx = process.argv.indexOf(flag);
  return idx === -1 ? null : process.argv[idx + 1];
}

// ============================================================================
// Embedding text builder
// ============================================================================

/**
 * Bir ürün için embedding'e gönderilecek text'i üret.
 *
 * Strateji: en bilgi-zengin alanları öne koy. Embedding modeli ilk
 * kelimelere daha çok ağırlık verir.
 *
 * Format:
 *   {title}
 *   Marka: {brand}
 *   Kategori: {category_name}
 *   Model: {model_family} {variant_storage} {variant_color}
 *   Özellikler: {key1: val1, key2: val2, ...}
 */
function buildEmbeddingText(product) {
  const parts = [];

  // 1. Title (en önemli, ilk gelir)
  if (product.title) parts.push(product.title);

  // 2. Marka
  if (product.brand && product.brand !== "null") {
    parts.push(`Marka: ${product.brand}`);
  }

  // 3. Kategori
  if (product.categories?.name) {
    parts.push(`Kategori: ${product.categories.name}`);
  }

  // 4. Model + varyant
  const modelParts = [];
  if (product.model_family) modelParts.push(product.model_family);
  if (product.variant_storage) modelParts.push(product.variant_storage);
  if (product.variant_color) modelParts.push(product.variant_color);
  if (modelParts.length > 0) {
    parts.push(`Model: ${modelParts.join(" ")}`);
  }

  // 5. Specs (sadece anlamlı keyleri al, kirli olanları atla)
  if (product.specs && typeof product.specs === "object") {
    const meaningfulSpecs = extractMeaningfulSpecs(product.specs);
    if (meaningfulSpecs.length > 0) {
      parts.push(`Özellikler: ${meaningfulSpecs.join(", ")}`);
    }
  }

  return parts.join("\n");
}

/**
 * Specs'ten anlamlı (kirli olmayan) key-value çiftlerini çıkar.
 *
 * STRATEJİ: WHITELIST-ONLY (strict mode)
 *
 * Sadece güvenilir key'ler alınır. Sebep: scraper bazı ürünlerde
 * cross-product spec kirliliği yapıyor (örn. alfa damatlık ayakkabısında
 * "Marka Adı: New Balance" var). Whitelist-only ile bu zehirli sinyaller
 * embedding'e sızmaz.
 *
 * Whitelist'e alınan key'ler:
 *   - Renk, Hacim, Ağırlık, Boyut, Malzeme, Menşei, Garanti
 *   - Brand/Model bilinçli olarak ÇIKARILDI — gerçek brand zaten
 *     product.brand field'ından gelir, specs ikinci kez yazmaya gerek yok
 *     ve cross-product kirliliği bu key'lerden geliyor.
 */
function extractMeaningfulSpecs(specs) {
  const result = [];

  // Güvenilir key'ler (scraper kirliliğinden az etkilenenler)
  const meaningfulKeys = [
    "Renk", "Hacim", "Ağırlık", "Boyut", "Malzeme",
    "Menşei", "Garanti", "Kapasite", "İçerik",
    "renk", "hacim", "ağırlık", "boyut", "malzeme",
    "kapasite", "içerik",
  ];

  for (const [key, value] of Object.entries(specs)) {
    // Sadece whitelist'tekiler kabul edilir
    if (!meaningfulKeys.includes(key)) continue;

    // Skip internal (defensive)
    if (key.startsWith("_")) continue;
    // Skip numeric keys (integer veya decimal - "37", "37.5" gibi beden leak)
    if (/^\d+(\.\d+)?$/.test(key)) continue;
    // Skip installment
    if (/^\d+x?\s*(ay|taksit)/i.test(key)) continue;
    // Skip empty
    if (value === null || value === undefined || value === "") continue;
    if (typeof value === "string" && value.trim() === "") continue;
    // Skip very long values (probably scraped HTML)
    if (typeof value === "string" && value.length > 100) continue;
    // Skip "null" string (scraper artifact)
    if (value === "null") continue;

    result.push(`${key}: ${value}`);
  }

  return result.slice(0, 6); // Max 6 spec items (whitelist zaten kısıtlı)
}

// ============================================================================
// Gemini embedding API
// ============================================================================

async function embedText(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBED_MODEL}:embedContent?key=${GEMINI_API_KEY}`;

  const body = {
    content: { parts: [{ text }] },
    taskType: "RETRIEVAL_DOCUMENT", // Important: documents (products) use this
    outputDimensionality: GEMINI_EMBED_DIM,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const values = data?.embedding?.values;

  if (!Array.isArray(values) || values.length !== GEMINI_EMBED_DIM) {
    throw new Error(`Unexpected embedding shape: length ${values?.length}`);
  }

  return values;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log(`\n🧬 Product Embedding Backfill`);
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : REBUILD ? "REBUILD ALL" : "INCREMENTAL (NULL only)"}`);
  if (LIMIT) console.log(`Limit: ${LIMIT}`);
  console.log("");

  // 1. Fetch products needing embeddings
  let query = supabase
    .from("products")
    .select(`
      id, slug, title, brand, model_family,
      variant_storage, variant_color, specs,
      categories(name, slug)
    `)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (!REBUILD) {
    query = query.is("embedding", null);
  }

  if (LIMIT) {
    query = query.limit(LIMIT);
  }

  const { data: products, error } = await query;

  if (error) {
    console.error("❌ Fetch error:", error);
    process.exit(1);
  }

  if (!products || products.length === 0) {
    console.log("✓ No products need embedding. All up to date.");
    process.exit(0);
  }

  console.log(`📦 ${products.length} products to embed.`);
  console.log(`⏱  Estimated time: ${Math.ceil((products.length * EMBED_DELAY_MS) / 60_000)} minutes\n`);

  // 2. Process each
  let success = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const text = buildEmbeddingText(product);

    if (i === 0 && DRY_RUN) {
      console.log("Sample embedding text (first product):");
      console.log("---");
      console.log(text);
      console.log("---\n");
    }

    if (DRY_RUN) {
      console.log(`  [${i + 1}/${products.length}] ${product.slug} — text length: ${text.length}`);
      continue;
    }

    try {
      // Rate limit
      if (i > 0) await sleep(EMBED_DELAY_MS);

      const embedding = await embedText(text);

      const { error: updateError } = await supabase
        .from("products")
        .update({
          embedding,
          updated_at: new Date().toISOString(),
        })
        .eq("id", product.id);

      if (updateError) {
        console.error(`  ❌ [${i + 1}/${products.length}] ${product.slug}: update failed:`, updateError.message);
        failed++;
        errors.push({ slug: product.slug, error: updateError.message });
      } else {
        success++;
        if ((i + 1) % BATCH_REPORT_EVERY === 0 || i === products.length - 1) {
          process.stdout.write(`\r  Progress: ${i + 1}/${products.length} (${success} ok, ${failed} fail)`);
        }
      }
    } catch (err) {
      console.error(`\n  ❌ [${i + 1}/${products.length}] ${product.slug}: ${err.message}`);
      failed++;
      errors.push({ slug: product.slug, error: err.message });
    }
  }

  console.log("\n");
  console.log("━".repeat(50));
  console.log(`📊 Backfill Report`);
  console.log("━".repeat(50));
  console.log(`Total processed:  ${products.length}`);
  console.log(`Success:          ${success}`);
  console.log(`Failed:           ${failed}`);

  if (errors.length > 0 && errors.length <= 10) {
    console.log(`\nFailures:`);
    for (const e of errors) {
      console.log(`  ${e.slug}: ${e.error}`);
    }
  } else if (errors.length > 10) {
    console.log(`\nFirst 10 failures:`);
    for (const e of errors.slice(0, 10)) {
      console.log(`  ${e.slug}: ${e.error}`);
    }
    console.log(`  ... and ${errors.length - 10} more`);
  }

  console.log("");

  if (failed > 0) {
    console.log(`⚠️  ${failed} failures. Re-run script to retry (incremental mode picks up only NULL).`);
    process.exit(1);
  }

  console.log(`✅ All embeddings generated successfully.\n`);
}

main().catch((err) => {
  console.error("\n❌ Fatal:", err);
  process.exit(1);
});
