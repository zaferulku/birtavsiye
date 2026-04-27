/**
 * MediaMarkt kategori-bazli scrape (resume + checkpoint)
 *
 * Strateji:
 *  1. 21 hedef DB kategorisi -> MM kategorileri (multi-source)
 *  2. Her MM kategori sayfasini gez, urun URL'leri topla
 *  3. URL'leri DB'de kontrol et, listings UPSERT
 *  4. State.json ile resume support
 *  5. 1.5 sn delay
 *
 * Calistirma:
 *   npx tsx scripts/scrape-mediamarkt-by-category.mjs
 *   ONLY_DB_SLUG=drone npx tsx scripts/scrape-mediamarkt-by-category.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { MEDIAMARKT_CATEGORY_MAP } from '../src/lib/scrapers/mediamarkt-category-map.mjs';
import { scrapePdp, MM_STORE_UUID } from '../src/lib/scrapers/mediamarkt.mjs';
import { fetchAllProductsFromCategory } from '../src/lib/scrapers/mediamarkt-categories.mjs';

const DELAY_MS = 1500;
const STATE_FILE = './scripts/scraper-state.json';
const ONLY_DB_SLUG = process.env.ONLY_DB_SLUG || null;

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Title'dan renk cikar (variant_color NULL ise doldurmak icin)
function extractColorFromTitle(title) {
  if (!title) return null;
  const colors = {
    siyah: /\b(siyah|space gray|space grey|jet siyah|gece siyahı)\b/i,
    beyaz: /\b(beyaz|starlight|inci beyazı)\b/i,
    "kırmızı": /\b(kırmızı|kirmizi|red|kızıl|product red)\b/i,
    mavi: /\b(mavi|navy|kobalt|teal|gece mavisi|deniz mavisi)\b/i,
    "yeşil": /\b(yeşil|yesil|alpine green|mint|orman yeşili)\b/i,
    "sarı": /\b(sarı|sari|gold|altın|altin|yellow)\b/i,
    pembe: /\b(pembe|pink|rose|toz pembe)\b/i,
    mor: /\b(mor|purple|violet|lavanta|deep purple)\b/i,
    turuncu: /\b(turuncu|orange)\b/i,
    gri: /\b(gri|gray|grey|titan|titanyum|graphite)\b/i,
    kahverengi: /\b(kahverengi|brown|taba|bej|krem)\b/i,
    turkuaz: /\b(turkuaz|cyan)\b/i,
  };
  for (const [c, re] of Object.entries(colors)) {
    if (re.test(title)) return c;
  }
  return null;
}

function loadState() {
  if (!existsSync(STATE_FILE)) {
    return {
      startedAt: null,
      completedCategories: [],
      lastCategory: null,
      lastPage: 0,
      stats: {
        totalUrlsCollected: 0,
        totalScraped: 0,
        inserted: 0,
        updated: 0,
        skipped: 0,
        fails: 0,
      },
    };
  }
  return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
}

function saveState(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// Top-level state — process handlers icin erisilebilir
let state = loadState();

function recordFailReason(reason) {
  if (!state.stats.failsByReason) state.stats.failsByReason = {};
  const key = String(reason || 'unknown').slice(0, 80);
  state.stats.failsByReason[key] = (state.stats.failsByReason[key] || 0) + 1;
}

// Process kill diagnostic — silent crash'i log'la, state'i koru
process.on('uncaughtException', (err) => {
  console.error('\n[FATAL] UNCAUGHT EXCEPTION:', err.message);
  console.error(err.stack);
  try { saveState(state); } catch {}
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('\n[FATAL] UNHANDLED REJECTION:', reason);
  try { saveState(state); } catch {}
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.warn('\n[SIGNAL] SIGTERM, state kaydediliyor...');
  try { saveState(state); } catch {}
  process.exit(0);
});

process.on('SIGINT', () => {
  console.warn('\n[SIGNAL] SIGINT, state kaydediliyor...');
  try { saveState(state); } catch {}
  process.exit(0);
});

let mmTreeCache = null;
function loadMmTree() {
  if (mmTreeCache) return mmTreeCache;
  if (!existsSync('./mm-category-tree.json')) {
    throw new Error('mm-category-tree.json bulunamadi.');
  }
  mmTreeCache = JSON.parse(readFileSync('./mm-category-tree.json', 'utf-8'));
  return mmTreeCache;
}

function findMmSlugByName(name) {
  const tree = loadMmTree();
  const matches = tree.filter(t => {
    const lastSeg = t.breadcrumb[t.breadcrumb.length - 1]?.name;
    return lastSeg && lastSeg.localeCompare(name, 'tr', { sensitivity: 'base' }) === 0;
  });
  return matches.map(m => m.slug);
}

const dbCategoryCache = new Map();
async function getCategoryId(slug) {
  if (dbCategoryCache.has(slug)) return dbCategoryCache.get(slug);
  const { data } = await sb.from('categories').select('id').eq('slug', slug).maybeSingle();
  const id = data?.id ?? null;
  dbCategoryCache.set(slug, id);
  return id;
}

async function upsertListing(scraped) {
  let productId = null;

  if (scraped.gtin13) {
    const { data: p } = await sb
      .from('products')
      .select('id, specs, description, image_url, images')
      .eq('specs->>gtin13', scraped.gtin13)
      .limit(1)
      .maybeSingle();

    if (p) {
      productId = p.id;
      const updates = {};
      if (!p.specs || Object.keys(p.specs).length <= 1) {
        if (scraped.raw_specs) updates.specs = { ...scraped.raw_specs, gtin13: scraped.gtin13 };
      }
      if (!p.description && scraped.raw_description) updates.description = scraped.raw_description;
      if ((!p.images || p.images.length === 0) && scraped.raw_images.length > 0) {
        updates.images = scraped.raw_images;
        if (!p.image_url) updates.image_url = scraped.raw_images[0];
      }
      if (Object.keys(updates).length > 0) {
        await sb.from('products').update(updates).eq('id', productId);
      }
    }
  }

  if (!productId) {
    const categoryId = await getCategoryId(scraped.dbSlug);
    if (!categoryId) {
      // Debug: ilk 3 kez tum cache durumunu goster
      if (!globalThis.__catNotFoundDebugged) globalThis.__catNotFoundDebugged = 0;
      if (globalThis.__catNotFoundDebugged < 3) {
        globalThis.__catNotFoundDebugged++;
        const cacheSnap = Array.from(dbCategoryCache.entries()).slice(0, 5);
        console.warn(`  [DEBUG] category_not_found: dbSlug="${scraped.dbSlug}" cache_first5=${JSON.stringify(cacheSnap)}`);
      }
      return { ok: false, reason: `category_not_found: ${scraped.dbSlug}` };
    }

    const baseSlug = `${(scraped.brand || 'mm').toLowerCase()}-${scraped.source_product_id}`
      .replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

    const { data: slugConflict } = await sb
      .from('products').select('id').eq('slug', baseSlug).maybeSingle();

    if (slugConflict) {
      productId = slugConflict.id;
    } else {
      const productSpecs = scraped.raw_specs
        ? { ...scraped.raw_specs, ...(scraped.gtin13 ? { gtin13: scraped.gtin13 } : {}) }
        : (scraped.gtin13 ? { gtin13: scraped.gtin13 } : null);

      // SKU'yu model_family'e koy (uq_products_dedup constraint icin gecici).
      // Faz1 classifier sonra dogru model_family'e normalize eder.
      const inferredColor = extractColorFromTitle(scraped.name);
      const { data: newP, error: newErr } = await sb.from('products').insert({
        slug: baseSlug,
        title: scraped.name,
        brand: scraped.brand,
        model_family: scraped.source_product_id,
        category_id: categoryId,
        description: scraped.raw_description,
        image_url: scraped.raw_images[0] ?? null,
        images: scraped.raw_images,
        specs: productSpecs,
        variant_color: inferredColor,
        is_active: true,
        is_verified: false,
        classified_by: 'mediamarkt-scraper',
        classified_at: new Date().toISOString(),
        quality_score: scraped.raw_specs ? 0.85 : 0.7,
      }).select('id').single();

      if (newErr) return { ok: false, reason: 'product_insert_fail: ' + newErr.message };
      productId = newP.id;
    }
  }

  const listingPayload = {
    product_id: productId,
    store_id: MM_STORE_UUID,
    source: 'mediamarkt',
    source_product_id: scraped.source_product_id,
    source_url: scraped.source_url,
    source_title: scraped.source_title,
    source_category: scraped.source_category,
    affiliate_url: scraped.affiliate_url,
    price: scraped.price,
    currency: 'TRY',
    free_shipping: scraped.free_shipping,
    in_stock: scraped.in_stock,
    is_active: true,
    raw_images: scraped.raw_images,
    raw_description: scraped.raw_description,
    raw_specs: scraped.raw_specs,
    last_seen: new Date().toISOString(),
  };

  const { data: existing } = await sb
    .from('listings').select('id, price')
    .eq('source', 'mediamarkt').eq('source_product_id', scraped.source_product_id)
    .maybeSingle();

  if (existing) {
    const priceChanged = Number(existing.price) !== scraped.price;
    const updatePayload = { ...listingPayload };
    if (priceChanged) updatePayload.last_price_change = new Date().toISOString();
    await sb.from('listings').update(updatePayload).eq('id', existing.id);
    return { ok: true, action: 'updated' };
  } else {
    const { error } = await sb.from('listings').insert({
      ...listingPayload,
      first_seen: new Date().toISOString(),
    });
    if (error) return { ok: false, reason: 'listing_insert_fail: ' + error.message };
    return { ok: true, action: 'inserted' };
  }
}

async function main() {
  console.log('MediaMarkt kategori-bazli scrape');

  // state top-level'da yuklendi
  if (!state.startedAt) state.startedAt = new Date().toISOString();

  const targets = ONLY_DB_SLUG
    ? MEDIAMARKT_CATEGORY_MAP.filter(t => t.dbSlug === ONLY_DB_SLUG)
    : MEDIAMARKT_CATEGORY_MAP;

  if (targets.length === 0) {
    console.error('Hedef kategori bulunamadi:', ONLY_DB_SLUG);
    process.exit(1);
  }

  console.log(`Hedef DB kategorisi: ${targets.length}`);
  console.log(`Tamamlanan: ${state.completedCategories.length}\n`);

  for (const target of targets) {
    for (const mmName of target.mmBreadcrumbNames) {
      const comboKey = `${target.dbSlug}::${mmName}`;

      if (state.completedCategories.includes(comboKey)) {
        console.log(`[SKIP] ${comboKey}`);
        continue;
      }

      const mmSlugs = findMmSlugByName(mmName);
      if (mmSlugs.length === 0) {
        console.warn(`[WARN] ${mmName} -> MM slug yok, atlaniyor`);
        state.completedCategories.push(comboKey);
        saveState(state);
        continue;
      }

      console.log(`\n=== ${target.dbSlug} <- ${mmName} (${mmSlugs.length} MM slug) ===`);

      for (const mmSlug of mmSlugs) {
        console.log(`  Kategori: ${mmSlug}`);

        let allUrls;
        try {
          allUrls = await fetchAllProductsFromCategory(mmSlug, {
            delayMs: DELAY_MS,
            maxPages: 100,
            onPageDone: async (page, count) => {
              process.stdout.write(`    p${page}: +${count} | `);
            },
          });
          console.log(`\n    Toplam: ${allUrls.length} urun URL`);
          state.stats.totalUrlsCollected += allUrls.length;
        } catch (e) {
          console.warn(`    Kategori URL fail: ${e.message}`);
          continue;
        }

        for (const url of allUrls) {
          try {
            const { data: existing } = await sb
              .from('listings').select('last_seen')
              .eq('source', 'mediamarkt').eq('source_url', url)
              .maybeSingle();

            if (existing?.last_seen) {
              const ageMs = Date.now() - new Date(existing.last_seen).getTime();
              if (ageMs < 24 * 3600 * 1000) {
                state.stats.skipped++;
                continue;
              }
            }

            const scraped = await scrapePdp(url);
            if (!scraped) {
              state.stats.skipped++;
              await sleep(DELAY_MS);
              continue;
            }

            state.stats.totalScraped++;
            const result = await upsertListing(scraped);
            if (result.ok) {
              if (result.action === 'inserted') state.stats.inserted++;
              else state.stats.updated++;
            } else {
              state.stats.fails++;
              recordFailReason(result.reason);
              if (state.stats.fails <= 5) console.warn(`    Insert fail: ${result.reason?.slice(0, 100)}`);
            }

            if ((state.stats.totalScraped) % 25 === 0) {
              saveState(state);
              const elapsed = ((Date.now() - new Date(state.startedAt).getTime()) / 1000 / 60).toFixed(1);
              console.log(`    [${state.stats.totalScraped} scraped | ins=${state.stats.inserted} upd=${state.stats.updated} skip=${state.stats.skipped} fail=${state.stats.fails}] ${elapsed}dk`);
            }
          } catch (e) {
            state.stats.fails++;
            recordFailReason(e.message);
            if (state.stats.fails <= 10) console.warn(`    PDP fail: ${e.message}`);
          }

          await sleep(DELAY_MS);
        }
      }

      state.completedCategories.push(comboKey);
      saveState(state);
      console.log(`OK ${comboKey} tamamlandi`);
    }
  }

  const elapsed = ((Date.now() - new Date(state.startedAt).getTime()) / 1000 / 60).toFixed(1);
  console.log('\n=== SONUC ===');
  console.log(`Sure: ${elapsed} dk`);
  console.log(`Toplam URL: ${state.stats.totalUrlsCollected}`);
  console.log(`Scrape: ${state.stats.totalScraped}`);
  console.log(`Insert: ${state.stats.inserted}`);
  console.log(`Update: ${state.stats.updated}`);
  console.log(`Skip: ${state.stats.skipped}`);
  console.log(`Fail: ${state.stats.fails}`);

  if (state.stats.failsByReason && Object.keys(state.stats.failsByReason).length > 0) {
    console.log('\n=== Fail sebep dagilimi (top 10) ===');
    const sortedFails = Object.entries(state.stats.failsByReason)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
    sortedFails.forEach(([reason, count]) => {
      console.log(`  ${String(count).padStart(4)}x  ${reason}`);
    });
  }
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
