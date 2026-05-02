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
import { MEDIAMARKT_CATEGORY_MAP } from '../src/lib/scrapers/mediamarkt-category-map.mts';
import { scrapePdpDetailed, MM_STORE_UUID, isRefurbished } from '../src/lib/scrapers/mediamarkt.mjs';
// tsx ESM .mjs ↔ .ts named export interop sorunu — dynamic import ile çöz
const accessoryMod = await import('../src/lib/accessoryDetector.ts');
const checkAccessory = accessoryMod.checkAccessory ?? accessoryMod.default?.checkAccessory;
if (typeof checkAccessory !== 'function') {
  throw new Error('checkAccessory accessoryDetector modülünden import edilemedi');
}
import { extractModelFamily } from '../src/lib/extractModelFamily.mjs';
import { fetchAllProductsFromCategory } from '../src/lib/scrapers/mediamarkt-categories.mjs';

// Rate limit: MM_DELAY_MS env ile gevşetilebilir (Supabase yükü için).
// Default 350ms; DB tıkalıysa MM_DELAY_MS=2000 önerilir.
const DELAY_MS = process.env.MM_DELAY_MS ? Number(process.env.MM_DELAY_MS) : 350;
const STATE_FILE = './scripts/scraper-state.json';
const ONLY_DB_SLUG = process.env.ONLY_DB_SLUG || null;
const SKIP_24H_FRESH = process.env.SKIP_24H !== '0';  // default true; SKIP_24H=0 ile bypass
// P6.22-D1: kategori bazli "tamamlandi" sonsuza kadar SKIP edilirdi -> mevcut DB
// donmusu olusuyordu. Artik comboKey 7 gunden eski ise re-scrape edilir.
// FORCE_RESCRAPE=1 ile tum kategoriler zorla yeniden taranir.
const RESCRAPE_AFTER_DAYS = process.env.RESCRAPE_AFTER_DAYS
  ? Number(process.env.RESCRAPE_AFTER_DAYS)
  : 7;
const FORCE_RESCRAPE = process.env.FORCE_RESCRAPE === '1';

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
  const defaults = {
    startedAt: null,
    completedCategories: [],
    // P6.22-D1: comboKey -> ISO timestamp. completedCategories array'i geriye
    // uyumluluk icin korunur; SKIP karari artik bu map + RESCRAPE_AFTER_DAYS'e
    // gore verilir. State migrate yapilmaz; eksik comboKey "never scraped"
    // sayilir ve re-scrape edilir.
    categoryLastScraped: {},
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
  if (!existsSync(STATE_FILE)) return defaults;
  const persisted = JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
  return {
    ...defaults,
    ...persisted,
    stats: { ...defaults.stats, ...(persisted.stats ?? {}) },
    categoryLastScraped: { ...(persisted.categoryLastScraped ?? {}) },
  };
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

  // P6.22-D Asama 1: In-source listing GTIN match (Migration 038).
  // Ayni kaynaktan ayni GTIN -> kesin ayni urun. Brand verify gereksiz cunku
  // "MM kendi DB'sinde ayni barkod ayni urun" varsayimi guvenli (canonical
  // false-positive cross-platform durumu degil).
  if (scraped.gtin13) {
    const { data: lsHit } = await sb
      .from('listings')
      .select('product_id')
      .eq('source', 'mediamarkt')
      .eq('gtin', scraped.gtin13)
      .limit(1)
      .maybeSingle();
    if (lsHit?.product_id) {
      productId = lsHit.product_id;
    }
  }

  // P6.22-D Asama 2: products.gtin match (brand-verified, P6.22-A).
  // Asama 1 in-source bulamadi -> baska bir kaynaktan zaten ayni canonical
  // product gelmis olabilir (brand-verified guvenli).
  if (!productId && scraped.gtin13) {
    // Önce yeni canonical gtin kolonu üzerinden ara, sonra legacy specs->>gtin13
    let { data: p } = await sb
      .from('products')
      .select('id, brand, specs, description, image_url, images, gtin')
      .eq('gtin', scraped.gtin13)
      .limit(1)
      .maybeSingle();
    if (!p) {
      const fallback = await sb
        .from('products')
        .select('id, brand, specs, description, image_url, images, gtin')
        .eq('specs->>gtin13', scraped.gtin13)
        .limit(1)
        .maybeSingle();
      p = fallback.data;
    }

    if (p) {
      // BRAND VERIFY: GTIN ayni brand farkli = false positive (parallel import,
      // barkod re-use). Match REDDEDILIR -> fallback (slug match -> yeni product).
      const dbBrand = (p.brand ?? '').trim().toLowerCase();
      const incomingBrand = (scraped.brand ?? '').trim().toLowerCase();
      const brandMatches = !incomingBrand || !dbBrand || dbBrand === incomingBrand;
      if (brandMatches) {
        productId = p.id;
        const updates = {};
        // GTIN backfill — Migration 020 sonrası canonical kolon
        if (!p.gtin) updates.gtin = scraped.gtin13;
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
      // brandMatches=false ise productId null kalir, asagidaki !productId blogu
      // slug match veya yeni product yoluna gider.
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

      // Canonical model_family + model_code title'dan extract et.
      // Pattern match yoksa fallback olarak SKU'ya dus (constraint icin benzersiz).
      const extracted = extractModelFamily(scraped.name || '', scraped.brand);
      const familyToUse = extracted.family || scraped.source_product_id;
      const codeToUse = extracted.code;

      const inferredColor = extractColorFromTitle(scraped.name);
      // Title'dan variant_storage extract (dedup constraint için benzersiz tuple)
      const storageMatch = (scraped.name || '').match(/\b(\d+)\s*(GB|TB|ml|L)\b/i);
      const inferredStorage = storageMatch ? `${storageMatch[1]} ${storageMatch[2].toUpperCase()}` : null;
      const { data: newP, error: newErr } = await sb.from('products').insert({
        slug: baseSlug,
        title: scraped.name,
        brand: scraped.brand,
        model_family: familyToUse,
        model_code: codeToUse,
        category_id: categoryId,
        description: scraped.raw_description,
        image_url: scraped.raw_images[0] ?? null,
        images: scraped.raw_images,
        specs: productSpecs,
        gtin: scraped.gtin13 ?? null,
        variant_color: inferredColor,
        variant_storage: inferredStorage,
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
    // P6.22-C: per-source GTIN (Migration 038). Match akisi: in-source listing
    // GTIN match -> resolveExistingProduct (brand-verified) -> yeni canonical.
    gtin: scraped.gtin13 ?? null,
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
    // price_history Migration 025b log_price_change trigger ile yazılır
    return { ok: true, action: 'updated' };
  } else {
    const { error } = await sb.from('listings').insert({
      ...listingPayload,
      first_seen: new Date().toISOString(),
    });

    if (error) return { ok: false, reason: 'listing_insert_fail: ' + error.message };
    // price_history Migration 025b log_price_change trigger ile yazılır
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
  console.log(`Tamamlanan (legacy list): ${state.completedCategories.length}`);
  console.log(`RESCRAPE_AFTER_DAYS=${RESCRAPE_AFTER_DAYS}${FORCE_RESCRAPE ? ' [FORCE]' : ''}\n`);

  const rescrapeThresholdMs = RESCRAPE_AFTER_DAYS * 24 * 3600 * 1000;

  for (const target of targets) {
    for (const mmName of target.mmBreadcrumbNames) {
      const comboKey = `${target.dbSlug}::${mmName}`;

      // P6.22-D1: SKIP karari artik tarih bazli.
      // FORCE_RESCRAPE=1 -> hicbir SKIP yok.
      // Aksi takdirde categoryLastScraped[comboKey] var ve threshold'dan
      // taze ise SKIP. Map'te yoksa ve completedCategories'de varsa "yasi
      // bilinmeyen" eski tamamlanma -> re-scrape (bir kere taze stamp atilir).
      if (!FORCE_RESCRAPE) {
        const lastScrapedIso = state.categoryLastScraped[comboKey];
        if (lastScrapedIso) {
          const ageMs = Date.now() - new Date(lastScrapedIso).getTime();
          if (ageMs < rescrapeThresholdMs) {
            const ageDays = (ageMs / (24 * 3600 * 1000)).toFixed(1);
            console.log(`[SKIP] ${comboKey} (${ageDays}g once)`);
            continue;
          }
          const ageDays = (ageMs / (24 * 3600 * 1000)).toFixed(1);
          console.log(`[RE-SCRAPE] ${comboKey} (${ageDays}g once)`);
        } else if (state.completedCategories.includes(comboKey)) {
          console.log(`[RE-SCRAPE] ${comboKey} (legacy: tarih yok)`);
        }
      }

      const mmSlugs = findMmSlugByName(mmName);
      if (mmSlugs.length === 0) {
        console.warn(`[WARN] ${mmName} -> MM slug yok, atlaniyor`);
        if (!state.completedCategories.includes(comboKey)) {
          state.completedCategories.push(comboKey);
        }
        state.categoryLastScraped[comboKey] = new Date().toISOString();
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

            if (SKIP_24H_FRESH && existing?.last_seen) {
              const ageMs = Date.now() - new Date(existing.last_seen).getTime();
              if (ageMs < 24 * 3600 * 1000) {
                state.stats.skipped++;
                recordFailReason('skip_24h_fresh');
                continue;
              }
            }

            // BLACKLIST pre-filter — refurbished URL'leri scrape etme
            if (isRefurbished({ url })) {
              state.stats.skipped++;
              recordFailReason('refurbished_blacklist');
              await sleep(DELAY_MS);
              continue;
            }

            const detailed = await scrapePdpDetailed(url);
            if (!detailed.ok) {
              state.stats.skipped++;
              recordFailReason('skip_' + detailed.reason);
              await sleep(DELAY_MS);
              continue;
            }
            const scraped = detailed.scraped;

            // PAKET 2: aksesuar guard — high-confidence aksesuarlar DB'ye yazilmaz.
            // price 0 ise (stoksuz urun) priceTRY=undefined geciyoruz ki price_too_low yanlis tetiklenmesin.
            const accCheck = checkAccessory(
              scraped.source_title || '',
              scraped.dbSlug,
              scraped.price > 0 ? scraped.price : undefined,
            );
            if (accCheck.isAccessory && accCheck.confidence === 'high') {
              state.stats.skipped++;
              recordFailReason('skip_accessory_' + (accCheck.matchedKeyword || 'unknown').slice(0, 30));
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
