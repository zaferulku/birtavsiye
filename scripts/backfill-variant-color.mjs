/**
 * Mevcut products tablosunda variant_color NULL olanlari title'dan parse et.
 * Idempotent: zaten dolu olanlari atla.
 *
 * Calistirma:
 *   npx tsx --env-file=.env.local scripts/backfill-variant-color.mjs
 */
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

async function main() {
  console.log('variant_color backfill basliyor...');

  const { data: products, error } = await sb
    .from('products')
    .select('id, title, variant_color')
    .is('variant_color', null)
    .eq('is_active', true);

  if (error) {
    console.error('Fetch fail:', error.message);
    return;
  }

  console.log(`${products.length} urun NULL variant_color, taraniyor...`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const colorCounts = {};

  for (const p of products) {
    const color = extractColorFromTitle(p.title);
    if (!color) {
      skipped++;
      continue;
    }

    const { error: upErr } = await sb
      .from('products')
      .update({ variant_color: color })
      .eq('id', p.id);

    if (upErr) {
      failed++;
      if (failed <= 3) console.warn('Update fail:', upErr.message);
    } else {
      updated++;
      colorCounts[color] = (colorCounts[color] || 0) + 1;
    }
  }

  console.log('\n=== SONUC ===');
  console.log(`Guncellenen: ${updated}`);
  console.log(`Atlanan (renk bulunamadi): ${skipped}`);
  console.log(`Basarisiz: ${failed}`);
  console.log('\nRenk dagilimi:');
  Object.entries(colorCounts)
    .sort(([, a], [, b]) => b - a)
    .forEach(([c, n]) => console.log(`  ${String(n).padStart(4)}x  ${c}`));
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
