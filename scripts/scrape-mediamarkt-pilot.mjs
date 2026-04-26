/**
 * MediaMarkt pilot scrape
 *
 * Kullanim:
 *   DRY-RUN: DRY_RUN=1 npx tsx scripts/scrape-mediamarkt-pilot.mjs
 *   GERCEK:  npx tsx scripts/scrape-mediamarkt-pilot.mjs
 */

import { createClient } from '@supabase/supabase-js';
import {
  fetchProductDetailShards,
  fetchProductUrlsFromShard,
  scrapePdp,
  MM_STORE_UUID,
} from '../src/lib/scrapers/mediamarkt.mjs';

const TARGET_PRODUCT_COUNT = process.env.DRY_RUN ? 9999 : 1000;
const DELAY_MS = 1000;
const MAX_TOTAL_FETCHES = process.env.DRY_RUN ? 200 : 8000;
const DRY_RUN = !!process.env.DRY_RUN;

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const dbCategoryCache = new Map();
async function getCategoryId(slug) {
  if (dbCategoryCache.has(slug)) return dbCategoryCache.get(slug);
  const { data } = await sb.from('categories').select('id').eq('slug', slug).maybeSingle();
  const id = data?.id ?? null;
  dbCategoryCache.set(slug, id);
  return id;
}

// -----------------------------------------------------
// Listing UPSERT
// -----------------------------------------------------

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
        if (scraped.raw_specs) {
          updates.specs = { ...scraped.raw_specs, gtin13: scraped.gtin13 };
        }
      }
      if (!p.description && scraped.raw_description) {
        updates.description = scraped.raw_description;
      }
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
      return { ok: false, reason: `category_not_found: ${scraped.dbSlug}` };
    }

    const baseSlug = `${(scraped.brand || 'mm').toLowerCase()}-${scraped.source_product_id}`
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const finalSlug = baseSlug;
    const { data: slugConflict } = await sb
      .from('products')
      .select('id')
      .eq('slug', finalSlug)
      .maybeSingle();

    if (slugConflict) {
      productId = slugConflict.id;
    } else {
      const productSpecs = scraped.raw_specs
        ? { ...scraped.raw_specs, ...(scraped.gtin13 ? { gtin13: scraped.gtin13 } : {}) }
        : (scraped.gtin13 ? { gtin13: scraped.gtin13 } : null);

      const { data: newP, error: newErr } = await sb
        .from('products')
        .insert({
          slug: finalSlug,
          title: scraped.name,
          brand: scraped.brand,
          category_id: categoryId,
          description: scraped.raw_description,
          image_url: scraped.raw_images[0] ?? null,
          images: scraped.raw_images,
          specs: productSpecs,
          is_active: true,
          is_verified: false,
          classified_by: 'mediamarkt-scraper',
          classified_at: new Date().toISOString(),
          quality_score: scraped.raw_specs ? 0.85 : 0.7,
        })
        .select('id')
        .single();

      if (newErr) {
        return { ok: false, reason: 'product_insert_fail: ' + newErr.message };
      }
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
    .from('listings')
    .select('id, price')
    .eq('source', 'mediamarkt')
    .eq('source_product_id', scraped.source_product_id)
    .maybeSingle();

  if (existing) {
    const priceChanged = Number(existing.price) !== scraped.price;
    const updatePayload = { ...listingPayload };
    if (priceChanged) updatePayload.last_price_change = new Date().toISOString();
    await sb.from('listings').update(updatePayload).eq('id', existing.id);
    return { ok: true, action: 'updated', priceChanged };
  } else {
    const { error } = await sb.from('listings').insert({
      ...listingPayload,
      first_seen: new Date().toISOString(),
    });
    if (error) return { ok: false, reason: 'listing_insert_fail: ' + error.message };
    return { ok: true, action: 'inserted' };
  }
}

// -----------------------------------------------------
// Main
// -----------------------------------------------------

async function main() {
  console.log('MediaMarkt pilot ' + (DRY_RUN ? '(DRY-RUN)' : '(GERCEK)'));
  console.log(`Hedef: ${TARGET_PRODUCT_COUNT} urun, max ${MAX_TOTAL_FETCHES} fetch`);

  console.log('\n[1/3] Shard listesi...');
  const shards = await fetchProductDetailShards();
  console.log(`  ${shards.length} shard`);

  console.log('\n[2/3] URL toplama...');
  let allUrls = [];
  for (const shard of shards) {
    try {
      const urls = await fetchProductUrlsFromShard(shard);
      allUrls.push(...urls);
      console.log(`  ${shard.split('/').pop()}: ${urls.length}`);
      await sleep(500);
    } catch (e) {
      console.warn(`  Shard fail: ${e.message}`);
    }
  }
  console.log(`  Toplam URL: ${allUrls.length}`);

  allUrls = shuffle(allUrls);

  console.log('\n[3/3] PDP scrape basladi...');
  const stats = {
    totalFetches: 0,
    parseSuccess: 0,
    targetMatch: 0,
    inserted: 0,
    updated: 0,
    fails: 0,
    specsExtracted: 0,
    gtin13Present: 0,
    byCategory: {},
  };
  const startTs = Date.now();

  for (const url of allUrls) {
    if (stats.targetMatch >= TARGET_PRODUCT_COUNT) break;
    if (stats.totalFetches >= MAX_TOTAL_FETCHES) break;

    stats.totalFetches++;

    try {
      const scraped = await scrapePdp(url);
      if (!scraped) {
        await sleep(DELAY_MS);
        continue;
      }

      stats.parseSuccess++;
      stats.targetMatch++;
      stats.byCategory[scraped.dbSlug] = (stats.byCategory[scraped.dbSlug] || 0) + 1;
      if (scraped.raw_specs && Object.keys(scraped.raw_specs).length > 0) {
        stats.specsExtracted++;
      }
      if (scraped.gtin13) stats.gtin13Present++;

      if (DRY_RUN) {
        if (stats.targetMatch <= 5) {
          console.log(`\n--- ORNEK ${stats.targetMatch} ---`);
          console.log('URL:', url.slice(-80));
          console.log('SKU:', scraped.source_product_id);
          console.log('GTIN13:', scraped.gtin13);
          console.log('Brand:', scraped.brand);
          console.log('Title:', scraped.source_title.slice(0, 80));
          console.log('Price:', scraped.price, scraped.currency);
          console.log('DB Slug:', scraped.dbSlug);
          console.log('Source Cat:', scraped.source_category);
          console.log('Breadcrumb:', scraped.breadcrumb.map(b => b.name).join(' > '));
          console.log('Specs:', scraped.raw_specs ? Object.keys(scraped.raw_specs).length + ' alan' : 'YOK');
        }
        await sleep(DELAY_MS);
        continue;
      }

      const result = await upsertListing(scraped);
      if (result.ok) {
        if (result.action === 'inserted') stats.inserted++;
        else stats.updated++;
      } else {
        stats.fails++;
        if (stats.fails <= 5) console.warn(`  Fail: ${result.reason?.slice(0, 120)}`);
      }

      if (stats.targetMatch % 50 === 0) {
        const elapsed = ((Date.now() - startTs) / 1000 / 60).toFixed(1);
        console.log(`  [${stats.targetMatch}/${TARGET_PRODUCT_COUNT}] fetch=${stats.totalFetches} ins=${stats.inserted} upd=${stats.updated} specs=${stats.specsExtracted} gtin=${stats.gtin13Present} fail=${stats.fails} ${elapsed}dk`);
      }

    } catch (e) {
      stats.fails++;
      if (stats.fails <= 5) console.warn(`  PDP fail ${url.slice(-50)}: ${e.message}`);
    }

    await sleep(DELAY_MS);
  }

  const elapsed = ((Date.now() - startTs) / 1000 / 60).toFixed(1);
  console.log('\n=== SONUC ===');
  console.log(`Sure: ${elapsed} dk`);
  console.log(`Toplam fetch: ${stats.totalFetches}`);
  console.log(`Hedef match: ${stats.targetMatch} (rate: ${(stats.targetMatch / Math.max(1, stats.totalFetches) * 100).toFixed(1)}%)`);
  console.log(`Specs cikarildi: ${stats.specsExtracted} (${(stats.specsExtracted / Math.max(1, stats.targetMatch) * 100).toFixed(0)}%)`);
  console.log(`GTIN13 present: ${stats.gtin13Present} (${(stats.gtin13Present / Math.max(1, stats.targetMatch) * 100).toFixed(0)}%)`);
  if (!DRY_RUN) {
    console.log(`Insert: ${stats.inserted}`);
    console.log(`Update: ${stats.updated}`);
    console.log(`Fail: ${stats.fails}`);
  }
  console.log('\nKategori dagilimi:');
  Object.entries(stats.byCategory)
    .sort(([, a], [, b]) => b - a)
    .forEach(([slug, count]) => console.log(`  ${slug.padEnd(25)} ${count}`));
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
