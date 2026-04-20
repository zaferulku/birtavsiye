// Aynı (brand, model_family) içindeki ürünlerde manufacturer-level specs'i kaynaklar arası kopyala
// MediaMarkt genelde zengin specs içerir; PttAVM satıcıları aynı modeli minimal bilgiyle listeliyor.
// node --env-file=.env.local scripts/cross-fill-specs.mjs [brand-filter]

import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MANUFACTURER_KEYS = [
  "İşlemci",
  "Ekran Boyutu (inç)",
  "Ekran boyutu cm / inç",
  "RAM Kapasitesi",
  "Ağırlık",
  "İşletim Sistemi",
  "Çift SİM",
  "WİFİ",
  "SIM-kart boyutu",
  "Ön Kamera",
  "Arka Kamera",
  "Pil Kapasitesi",
  "Mobil Telefon Standardı",
  "Çıkış Tarihi",
  "Ürün Tipi",
  "Renk (Üreticiye Göre)",
];

const VARIANT_STORAGE_KEYS = ["Bellek Kapasitesi", "Depolama"];

const brandFilter = process.argv[2] || null;

function countManufacturerKeys(specs) {
  if (!specs) return 0;
  return MANUFACTURER_KEYS.filter(k => specs[k] !== undefined && specs[k] !== null && specs[k] !== "").length;
}

(async () => {
  console.log(`Cross-filling specs${brandFilter ? ` for brand=${brandFilter}` : " for all brands"}...`);

  const byGroup = new Map();
  for (let page = 0; page < 60; page++) {
    let q = sb.from("products").select("id, brand, model_family, specs, source, variant_storage").not("brand", "is", null).not("model_family", "is", null);
    if (brandFilter) q = q.ilike("brand", brandFilter);
    const { data } = await q.range(page * 1000, page * 1000 + 999);
    if (!data || data.length === 0) break;
    for (const p of data) {
      const key = `${p.brand}|${p.model_family}`;
      if (!byGroup.has(key)) byGroup.set(key, []);
      byGroup.get(key).push(p);
    }
    if (data.length < 1000) break;
  }

  console.log(`Groups (brand|model_family): ${byGroup.size}`);

  let groupsFilled = 0, productsFilled = 0, keysFilled = 0;

  for (const products of byGroup.values()) {
    if (products.length < 2) continue;

    const sources = products.slice().sort((a, b) => countManufacturerKeys(b.specs) - countManufacturerKeys(a.specs));
    const best = sources[0];
    if (countManufacturerKeys(best.specs) === 0) continue;

    const template = {};
    for (const k of MANUFACTURER_KEYS) {
      if (best.specs?.[k]) template[k] = best.specs[k];
    }

    const storageTemplates = new Map();
    for (const p of products) {
      if (!p.variant_storage) continue;
      if (storageTemplates.has(p.variant_storage)) continue;
      const t = {};
      for (const k of VARIANT_STORAGE_KEYS) if (p.specs?.[k]) t[k] = p.specs[k];
      if (Object.keys(t).length > 0) storageTemplates.set(p.variant_storage, t);
    }

    let groupTouched = false;

    for (const p of products) {
      const newSpecs = { ...(p.specs || {}) };
      let changed = false;

      for (const [k, v] of Object.entries(template)) {
        if (!newSpecs[k]) { newSpecs[k] = v; changed = true; keysFilled++; }
      }

      if (p.variant_storage && storageTemplates.has(p.variant_storage)) {
        for (const [k, v] of Object.entries(storageTemplates.get(p.variant_storage))) {
          if (!newSpecs[k]) { newSpecs[k] = v; changed = true; keysFilled++; }
        }
      }

      if (changed) {
        await sb.from("products").update({ specs: newSpecs }).eq("id", p.id);
        productsFilled++;
        groupTouched = true;
      }
    }

    if (groupTouched) groupsFilled++;
  }

  console.log(`\nGroups filled: ${groupsFilled}/${byGroup.size}`);
  console.log(`Products updated: ${productsFilled}`);
  console.log(`Total keys filled: ${keysFilled}`);
})();
