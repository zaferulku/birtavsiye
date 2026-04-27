/**
 * Aktif products'ı title -> categorizeFromTitle ile re-evaluate et,
 * mismatch'leri (yanlış category_id) düzelt.
 *
 * Pattern miss / low-confidence olanlar için Gemini agent (classifyProduct).
 *
 * Örnek hata: bisiklet ürünü erkek-giyim-alt altında.
 *
 * Çalıştırma:
 *   DRY_RUN=1 npx tsx --env-file=.env.local scripts/fix-product-categories.mjs
 *   LIMIT=500 DRY_RUN=1 npx tsx --env-file=.env.local scripts/fix-product-categories.mjs
 *   USE_AGENT=1 LIMIT_AGENT=100 DRY_RUN=1 npx tsx --env-file=.env.local scripts/fix-product-categories.mjs
 *   npx tsx --env-file=.env.local scripts/fix-product-categories.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";
import { categorizeFromTitle } from "../src/lib/categorizeFromTitle.mts";

// Gemini KAPALI — agent'lar Claude ile koordineli (LLM API çağrısı yok).
// Pattern-fail olan ürünler EXPORT_PENDING=1 ile JSON'a dump edilir,
// Claude bunları okuyup kategorize edip apply-classified-categories.mjs ile yazar.

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const dryRun = process.env.DRY_RUN === "1";
const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : Infinity;
const BATCH = 100;
const EXPORT_PENDING = process.env.EXPORT_PENDING === "1";
const PENDING_LIMIT = process.env.PENDING_LIMIT ? Number(process.env.PENDING_LIMIT) : 200;
const PENDING_FILE = process.env.PENDING_FILE || "output/pending-classification.json";
const SAFE_ONLY = process.env.SAFE_ONLY === "1";

// Net güvenli transition whitelist (oldSlug -> newSlug). False-positive riski yok.
const SAFE_TRANSITIONS = new Set([
  "telefon-aksesuar -> powerbank",          // MagSafe / taşınabilir şarj
  "telefon-aksesuar -> oyun-konsol",        // PlayStation/Xbox/Nintendo aksesuarları
  "telefon-aksesuar -> aksiyon-kamera",     // GoPro vb.
  "bilgisayar-bilesenleri -> laptop",       // TUF/IdeaPad/VivoBook/ROG/ThinkPad/Excalibur
  "bilgisayar-cevre -> bilgisayar-bilesenleri", // notebook soğutucu
  "erkek-giyim-ust -> bisiklet",            // kullanıcının verdiği örnek
  "fitness-kondisyon -> bisiklet",
  "esofman-spor-giyim -> erkek-giyim-alt",  // eşofman alt
  "sarj-kablo -> supurge",                  // robot süpürge
  "ekran-koruyucu -> telefon-aksesuar",     // kamera lens koruyucu
  "telefon-yedek-parca -> tablet",          // iPad
  "arac-aksesuar -> telefon-aksesuar",      // araç tutucu
  "yoga-pilates -> fitness-kondisyon",
  "sac-bakim -> sampuan",                   // şampuan specific
  "sac-bakim -> sac-boyasi",                // saç boyası specific
  "sac-bakim -> serum-ampul",               // saç serumu specific
  "sarj-kablo -> powerbank",                // powerbank specific
  "firin-ocak -> mikrodalga",               // mikrodalga specific
  "bilgisayar-cevre -> oyun-konsol",
  "laptop -> tost-makinesi",                // yanlış category_id düzeltme
  "laptop -> supurge",                      // robot süpürge laptop'ta
  "laptop -> drone",                        // drone laptop'ta
  "kisisel-bakim-elektrikli -> serum-ampul", // retinol serum
]);

console.log(`Fix product categories${dryRun ? " (DRY-RUN)" : ""}${EXPORT_PENDING ? " +EXPORT-PENDING" : ""}`);
console.log(`LIMIT: ${LIMIT === Infinity ? "ALL" : LIMIT}${EXPORT_PENDING ? ` | PENDING_LIMIT: ${PENDING_LIMIT}` : ""}`);

// 1) Kategori slug -> id ve id -> slug mapping
const slugToId = new Map();
const idToSlug = new Map();
{
  const { data, error } = await sb.from("categories").select("id, slug");
  if (error) { console.error(error.message); process.exit(1); }
  data?.forEach((c) => {
    slugToId.set(c.slug, c.id);
    idToSlug.set(c.id, c.slug);
  });
}
console.log(`Aktif categories: ${slugToId.size}`);

// 2) Tüm aktif products'ı çek
const products = [];
let from = 0;
while (products.length < LIMIT) {
  const { data, error } = await sb
    .from("products")
    .select("id, title, category_id")
    .eq("is_active", true)
    .range(from, from + 999);
  if (error) { console.error(error.message); break; }
  if (!data || data.length === 0) break;
  for (const p of data) {
    products.push(p);
    if (products.length >= LIMIT) break;
  }
  if (data.length < 1000) break;
  from += 1000;
}
console.log(`Aktif products: ${products.length}`);

// 3) Mismatch tespit
const mismatches = [];
const transitions = {}; // "oldSlug -> newSlug" : count
const pendingCandidates = []; // Pattern fail — Claude tarafından kategorize edilecek
let noMatch = 0;
let lowConfidence = 0;
let alreadyCorrect = 0;

for (const p of products) {
  const r = categorizeFromTitle(p.title || "");
  if (!r.slug) {
    noMatch++;
    if (EXPORT_PENDING) pendingCandidates.push({ id: p.id, title: p.title, oldSlug: idToSlug.get(p.category_id) || "(orphan)" });
    continue;
  }
  if (r.confidence !== "high") {
    lowConfidence++;
    if (EXPORT_PENDING) pendingCandidates.push({ id: p.id, title: p.title, oldSlug: idToSlug.get(p.category_id) || "(orphan)", patternHint: r.slug });
    continue;
  }
  const inferredId = slugToId.get(r.slug);
  if (!inferredId) { noMatch++; continue; }
  if (p.category_id === inferredId) { alreadyCorrect++; continue; }
  const oldSlug = idToSlug.get(p.category_id) || "(orphan)";
  const key = `${oldSlug} -> ${r.slug}`;
  transitions[key] = (transitions[key] || 0) + 1;
  // matchedKeyword bazlı dağılım (false-positive teşhisi)
  const kwKey = `${oldSlug} -> ${r.slug} | kw="${r.matchedKeyword}"`;
  transitions[kwKey] = (transitions[kwKey] || 0) + 1;
  mismatches.push({
    id: p.id,
    title: p.title,
    oldId: p.category_id,
    oldSlug,
    newId: inferredId,
    newSlug: r.slug,
    matchedKeyword: r.matchedKeyword,
  });
}

console.log(`\n=== PATTERN TESPIT ===`);
console.log(`Already correct: ${alreadyCorrect}`);
console.log(`No match (pattern yok): ${noMatch}`);
console.log(`Low confidence: ${lowConfidence}`);
console.log(`Mismatch (DUZELT): ${mismatches.length}`);

// 3.5) Pattern-fail olanları JSON dosyasına dump et — Claude kategorize edecek
if (EXPORT_PENDING && pendingCandidates.length > 0) {
  console.log(`\n=== EXPORT PENDING ===`);
  const dump = pendingCandidates.slice(0, PENDING_LIMIT);
  // Aktif leaf kategori listesi de dosyaya gitsin (Claude için referans)
  const { data: leafCats } = await sb.from("categories").select("slug,name").eq("is_active", true).eq("is_leaf", true).order("slug");
  const payload = {
    generated_at: new Date().toISOString(),
    leaf_categories: (leafCats || []).map(c => ({ slug: c.slug, name: c.name })),
    products: dump,
    instruction: "Her ürün için 'newSlug' alanını ekle (leaf_categories.slug listesinden). Eşleşme yoksa 'newSlug' = null bırak. Sonucu apply-classified-categories.mjs ile uygula.",
  };
  writeFileSync(PENDING_FILE, JSON.stringify(payload, null, 2));
  console.log(`Yazıldı: ${PENDING_FILE} (${dump.length} ürün, ${(leafCats || []).length} kategori)`);
}

console.log(`\nTop 30 transition (slug-only):`);
Object.entries(transitions)
  .filter(([k]) => !k.includes("| kw="))
  .sort((a, b) => b[1] - a[1])
  .slice(0, 30)
  .forEach(([k, v]) => console.log(`  ${v.toString().padStart(5)}x ${k}`));

console.log(`\nTop 50 transition (matchedKeyword detay):`);
Object.entries(transitions)
  .filter(([k]) => k.includes("| kw="))
  .sort((a, b) => b[1] - a[1])
  .slice(0, 50)
  .forEach(([k, v]) => console.log(`  ${v.toString().padStart(5)}x ${k}`));

// SAFE_ONLY ile güvenli whitelist'e filtrele
let toApply = mismatches;
if (SAFE_ONLY) {
  const before = mismatches.length;
  toApply = mismatches.filter(m => SAFE_TRANSITIONS.has(`${m.oldSlug} -> ${m.newSlug}`));
  console.log(`\nSAFE_ONLY filtre: ${before} -> ${toApply.length} (whitelist'te olanlar)`);
  // SAFE filter sonrası transition breakdown
  const safeAgg = {};
  for (const m of toApply) {
    const k = `${m.oldSlug} -> ${m.newSlug}`;
    safeAgg[k] = (safeAgg[k] || 0) + 1;
  }
  console.log("Safe transition dağılım:");
  Object.entries(safeAgg).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) => console.log(`  ${v.toString().padStart(4)}x ${k}`));
}

if (dryRun) {
  console.log(`\nDRY-RUN: 10 örnek (toApply'dan):`);
  toApply.slice(0, 10).forEach((m) =>
    console.log(`  [${m.oldSlug} -> ${m.newSlug}] kw="${m.matchedKeyword}" :: ${(m.title || "").slice(0, 70)}`),
  );
  process.exit(0);
}

if (toApply.length === 0) {
  console.log("Uygulanacak ürün yok.");
  process.exit(0);
}

// 4) UPDATE batch=100 paralel
let updated = 0, failed = 0;
const failReasons = {};
const startTime = Date.now();

for (let i = 0; i < toApply.length; i += BATCH) {
  const batch = toApply.slice(i, i + BATCH);
  await Promise.all(batch.map(async (m) => {
    const { error } = await sb
      .from("products")
      .update({ category_id: m.newId })
      .eq("id", m.id);
    if (error) {
      failed++;
      const k = error.message.slice(0, 60);
      failReasons[k] = (failReasons[k] || 0) + 1;
    } else {
      updated++;
    }
  }));
  if (i % 500 === 0) {
    process.stdout.write(`\r  ${i + batch.length}/${toApply.length} | upd=${updated} fail=${failed}`);
  }
}

const elapsed = Math.round((Date.now() - startTime) / 1000);
console.log(`\n\n=== SONUC (${elapsed}s) ===`);
console.log(`Updated: ${updated}`);
console.log(`Failed: ${failed}`);
if (Object.keys(failReasons).length > 0) {
  console.log("Fail sebepleri:");
  Object.entries(failReasons).sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([k, v]) =>
    console.log(`  ${v}x ${k}`),
  );
}
