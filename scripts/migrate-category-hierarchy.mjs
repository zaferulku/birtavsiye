// Site-wide category taxonomy hierarchy migration
// node --env-file=.env.local scripts/migrate-category-hierarchy.mjs

import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ROOTS = [
  { slug: "elektronik",    name: "Elektronik",          icon: "🔌" },
  { slug: "ev-yasam",      name: "Ev & Yaşam",          icon: "🏠" },
  { slug: "moda",          name: "Moda",                icon: "👗" },
  { slug: "kozmetik",      name: "Kozmetik & Bakım",    icon: "💄" },
  { slug: "anne-bebek",    name: "Anne-Bebek & Çocuk",  icon: "🍼" },
  { slug: "spor-outdoor",  name: "Spor & Outdoor",      icon: "⚽" },
  { slug: "otomotiv",      name: "Otomotiv",            icon: "🚗" },
  { slug: "kitap-hobi",    name: "Kitap & Hobi",        icon: "📚" },
  { slug: "evcil-hayvan",  name: "Evcil Hayvan",        icon: "🐾" },
];

const MID = [
  { slug: "cep-telefonu",     name: "Cep Telefonu",        icon: "📱", parent: "elektronik" },
  { slug: "bilgisayar-tablet",name: "Bilgisayar & Tablet", icon: "💻", parent: "elektronik" },
  { slug: "tv-ses",           name: "TV & Ses",            icon: "📺", parent: "elektronik" },
  { slug: "ag-yazici",        name: "Ağ & Yazıcı",         icon: "🖨️", parent: "elektronik" },
  { slug: "kadin",            name: "Kadın",               icon: "👩", parent: "moda" },
  { slug: "erkek",            name: "Erkek",               icon: "👨", parent: "moda" },
  { slug: "cocuk",            name: "Çocuk",               icon: "🧒", parent: "moda" },
  { slug: "aksesuar",         name: "Aksesuar",            icon: "👜", parent: "moda" },
];

const LEAVES = {
  "akilli-telefon":        "cep-telefonu",
  "telefon-aksesuar":      "cep-telefonu",
  "bilgisayar-laptop":     "bilgisayar-tablet",
  "bilgisayar-bilesenleri":"bilgisayar-tablet",
  "tablet":                "bilgisayar-tablet",
  "tv":                    "tv-ses",
  "ses-kulaklik":          "tv-ses",
  "networking":            "ag-yazici",
  "yazici-tarayici":       "ag-yazici",
  "navigasyon":            "ag-yazici",
  "fotograf-kamera":       "elektronik",
  "akilli-saat":           "elektronik",
  "oyun-konsol":           "elektronik",
  "ofis-elektronigi":      "elektronik",
  "beyaz-esya":            "ev-yasam",
  "kucuk-ev-aletleri":     "ev-yasam",
  "mobilya-dekorasyon":    "ev-yasam",
  "ev-tekstili":           "ev-yasam",
  "mutfak-sofra":          "ev-yasam",
  "temizlik":              "ev-yasam",
  "ofis-mobilyasi":        "ev-yasam",
  "kadin-giyim":           "kadin",
  "kadin-ayakkabi":        "kadin",
  "erkek-giyim":           "erkek",
  "erkek-ayakkabi":        "erkek",
  "erkek-bakimi":          "erkek",
  "cocuk-giyim":           "cocuk",
  "bebek-giyim":           "cocuk",
  "canta-cuzdan":          "aksesuar",
  "gozluk":                "aksesuar",
  "saat-taki":             "aksesuar",
  "ic-giyim":              "moda",
  "outdoor-giyim":         "moda",
  "spor-giyim":            "moda",
  "makyaj":                "kozmetik",
  "parfum":                "kozmetik",
  "cilt-bakimi":           "kozmetik",
  "sac-bakimi":            "kozmetik",
  "kisisel-hijyen":        "kozmetik",
  "cocuk-odasi":           "anne-bebek",
  "cocuk-kitaplari":       "anne-bebek",
  "oyuncak":               "anne-bebek",
  "masa-oyunu":            "anne-bebek",
  "fitness":               "spor-outdoor",
  "bisiklet":              "spor-outdoor",
  "outdoor-kamp":          "spor-outdoor",
  "takim-sporlari":        "spor-outdoor",
  "su-sporlari":           "spor-outdoor",
  "yoga":                  "spor-outdoor",
  "motor-scooter":         "otomotiv",
  "lastik-jant":           "otomotiv",
  "kitap":                 "kitap-hobi",
  "film-dizi":             "kitap-hobi",
  "muzik-aleti":           "kitap-hobi",
  "koleksiyon":            "kitap-hobi",
  "hobi-sanat":            "kitap-hobi",
  "kirtasiye":             "kitap-hobi",
  "kedi":                  "evcil-hayvan",
  "kopek":                 "evcil-hayvan",
  "kus":                   "evcil-hayvan",
  "diger-evcil-hayvan":    "evcil-hayvan",
};

async function upsertCategory({ slug, name, icon, parent_id }) {
  const { data: existing } = await sb.from("categories").select("id").eq("slug", slug).maybeSingle();
  if (existing) {
    await sb.from("categories").update({ name, icon, parent_id }).eq("id", existing.id);
    return existing.id;
  }
  const { data, error } = await sb.from("categories").insert({ slug, name, icon, parent_id }).select("id").single();
  if (error) throw error;
  return data.id;
}

(async () => {
  console.log("Creating level 1 roots...");
  const rootIds = {};
  for (const r of ROOTS) {
    rootIds[r.slug] = await upsertCategory({ ...r, parent_id: null });
  }

  console.log("Creating level 2 intermediates...");
  const midIds = {};
  for (const m of MID) {
    const parentId = rootIds[m.parent];
    if (!parentId) throw new Error(`Missing root: ${m.parent}`);
    midIds[m.slug] = await upsertCategory({ slug: m.slug, name: m.name, icon: m.icon, parent_id: parentId });
  }

  console.log("Updating leaves' parent_id...");
  let updated = 0, missing = 0;
  for (const [leafSlug, parentSlug] of Object.entries(LEAVES)) {
    const parentId = rootIds[parentSlug] || midIds[parentSlug];
    if (!parentId) { console.warn("missing parent", parentSlug); missing++; continue; }
    const { data: existing } = await sb.from("categories").select("id").eq("slug", leafSlug).maybeSingle();
    if (!existing) { console.warn("missing leaf", leafSlug); missing++; continue; }
    await sb.from("categories").update({ parent_id: parentId }).eq("id", existing.id);
    updated++;
  }

  console.log(`\nDone. Roots: ${Object.keys(rootIds).length}, Mid: ${Object.keys(midIds).length}, Leaves updated: ${updated}, missing: ${missing}`);
})();
