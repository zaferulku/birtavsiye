// Non-phone ürünlerin model_family'sini title'dan keyword eşleştirme ile doldur
// node --env-file=.env.local scripts/classify-product-types.mjs [limit]

import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const limit = parseInt(process.argv[2] || "5000", 10);

const CLASS = {
  _clothing: [
    { type: "Tişört",       patterns: [/\b(ti[sş][oö]rt|t[- ]?shirt|sweat[- ]?shirt|atlet)\b/i] },
    { type: "Gömlek",       patterns: [/g[oö]mlek/i] },
    { type: "Kazak",        patterns: [/\b(kazak|hırka|triko|s[uü]veter|pull[- ]?over)\b/i] },
    { type: "Ceket",        patterns: [/\b(ceket|blazer|kap[uü][sş]onl[uü])\b/i] },
    { type: "Mont & Kaban", patterns: [/\b(mont|kaban|parka|yağmurluk|anorak|puffer)\b/i] },
    { type: "Elbise",       patterns: [/elbise/i] },
    { type: "Etek",         patterns: [/\betek\b/i] },
    { type: "Şort",         patterns: [/\b([sş]ort|bermuda)\b/i] },
    { type: "Tulum",        patterns: [/tulum/i] },
    { type: "Pantolon",     patterns: [/\b(pantol?on|jean|e[sş]ofman\s*alt[ıi])\b/i] },
    { type: "Eşofman",      patterns: [/e[sş]ofman/i] },
    { type: "Ayakkabı",     patterns: [/\b(ayakkab|sneaker|spor\s*ayak|topuklu|loafer|oxford)/i] },
    { type: "Bot",          patterns: [/\bbot\b|ç?izme/i] },
    { type: "Terlik",       patterns: [/terlik/i] },
    { type: "Sandalet",     patterns: [/sandalet/i] },
    { type: "Çanta",        patterns: [/\bçanta\b|c[uü]zdan/i] },
    { type: "Şapka",        patterns: [/\b([sş]apka|bere|kasket|bucket)\b/i] },
    { type: "Kemer",        patterns: [/kemer/i] },
    { type: "Çorap",        patterns: [/[çc]orap/i] },
    { type: "İç Çamaşır",   patterns: [/(iç\s*ç?ama[sş]|sutyen|s[uü]tyen|boxer|string)/i] },
    { type: "Pijama",       patterns: [/(pijama|gecelik)/i] },
    { type: "Mayo",         patterns: [/mayo|bikini|deniz\s*[sş]ort/i] },
    { type: "Tayt",         patterns: [/\btayt\b/i] },
    { type: "Bluz",         patterns: [/\bbluz\b/i] },
  ],

  tv: [
    { type: "85 İnç+", patterns: [/\b(85|86|98|100)[\s"']?(?:i[nnç]|inch)/i] },
    { type: "75 İnç",  patterns: [/\b(75|77)[\s"']?(?:i[nnç]|inch)/i] },
    { type: "65 İnç",  patterns: [/\b(65)[\s"']?(?:i[nnç]|inch)/i] },
    { type: "58 İnç",  patterns: [/\b(58|60)[\s"']?(?:i[nnç]|inch)/i] },
    { type: "55 İnç",  patterns: [/\b(55)[\s"']?(?:i[nnç]|inch)/i] },
    { type: "50 İnç",  patterns: [/\b(50)[\s"']?(?:i[nnç]|inch)/i] },
    { type: "43 İnç",  patterns: [/\b(43)[\s"']?(?:i[nnç]|inch)/i] },
    { type: "40 İnç",  patterns: [/\b(40|42)[\s"']?(?:i[nnç]|inch)/i] },
    { type: "32 İnç",  patterns: [/\b(32)[\s"']?(?:i[nnç]|inch)/i] },
    { type: "Projeksiyon", patterns: [/projeksiyon|projector/i] },
    { type: "TV Aksesuar", patterns: [/ask[ıi]\s*aparat|mount|kumanda|uzatma|duvar\s*aparat/i] },
  ],

  "bilgisayar-laptop": [
    { type: "Gaming Laptop",  patterns: [/gaming|oyuncu\s*laptop|oyun\s*bilgisayar/i] },
    { type: "Ultrabook",      patterns: [/ultrabook|macbook\s*air|zenbook/i] },
    { type: "MacBook",        patterns: [/macbook/i] },
    { type: "Notebook",       patterns: [/notebook|laptop/i] },
    { type: "Adaptör & Kablo",patterns: [/adapt[oö]r|kablo|şarj|charger|power/i] },
    { type: "Çanta & Kılıf",  patterns: [/[çc]anta|k[ıi]l[ıi]f|sleeve|case/i] },
    { type: "Stand & Soğutucu", patterns: [/stand|so[gğ]utucu|cooling/i] },
  ],

  "beyaz-esya": [
    { type: "Çamaşır Makinesi", patterns: [/[çc]ama[sş][ıi]r\s*mak/i] },
    { type: "Kurutma Makinesi", patterns: [/kurutma\s*mak/i] },
    { type: "Bulaşık Makinesi", patterns: [/bula[sş][ıi]k\s*mak/i] },
    { type: "Buzdolabı",        patterns: [/buzdolab|no\s*frost|french\s*door/i] },
    { type: "Derin Dondurucu",  patterns: [/derin\s*dondurucu|deep\s*freeze/i] },
    { type: "Fırın",            patterns: [/\bf[ıi]r[ıi]n/i] },
    { type: "Ocak",             patterns: [/\bocak\b|ankastre\s*ocak/i] },
    { type: "Davlumbaz",        patterns: [/davlumbaz|aspirat[oö]r/i] },
    { type: "Klima",            patterns: [/\bklima\b|air\s*con/i] },
    { type: "Su Sebili",        patterns: [/su\s*sebili|water\s*dispenser/i] },
  ],

  "kucuk-ev-aletleri": [
    { type: "Süpürge",      patterns: [/s[uü]p[uü]rge|vacuum/i] },
    { type: "Ütü",          patterns: [/\b[uü]t[uü]\b|buhar\s*makinesi/i] },
    { type: "Blender & Rondo", patterns: [/blender|rondo|doğray[ıi]c/i] },
    { type: "Tost & Izgara",patterns: [/tost\s*mak|izgara|waffle/i] },
    { type: "Çay & Kahve",  patterns: [/[çc]ay\s*mak|kahve\s*mak|french\s*press|espresso|cezve/i] },
    { type: "Su Isıtıcı",   patterns: [/su\s*[ıi]s[ıi]t|kettle/i] },
    { type: "Mikser",       patterns: [/mikser|el\s*mikseri/i] },
    { type: "Fritöz",       patterns: [/frit[oö]z|air\s*fryer/i] },
  ],

  "ses-kulaklik": [
    { type: "Kulak İçi",    patterns: [/kulak\s*içi|in[- ]?ear|earbud|airpod\s*pro|true\s*wireless/i] },
    { type: "Kulak Üstü",   patterns: [/kulak\s*[uü]st[uü]|over[- ]?ear|around[- ]?ear/i] },
    { type: "Bluetooth Hoparlör", patterns: [/bluetooth\s*hopar|ta[sş][ıi]nab[ıi]l[ıi]r\s*hopar/i] },
    { type: "Soundbar",     patterns: [/soundbar|ev\s*sinema/i] },
    { type: "Mikrofon",     patterns: [/mikrofon|microphone/i] },
    { type: "Kablo & Aksesuar", patterns: [/kablo|adapt[oö]r|splitter/i] },
  ],

  makyaj: [
    { type: "Ruj",           patterns: [/\bruj\b|lipstick/i] },
    { type: "Fondöten",      patterns: [/fond[oö]ten|foundation/i] },
    { type: "Maskara",       patterns: [/maskara|mascara|rimel/i] },
    { type: "Kapatıcı",      patterns: [/kapat[ıi]c|concealer/i] },
    { type: "Göz Farı",      patterns: [/g[oö]z\s*far|eyeshadow/i] },
    { type: "Eyeliner",      patterns: [/eyeliner|dipliner/i] },
    { type: "Allık",         patterns: [/all[ıi]k|blush/i] },
    { type: "Aydınlatıcı",   patterns: [/ayd[ıi]nlat[ıi]c|highlight/i] },
    { type: "Oje",           patterns: [/\boje\b/i] },
    { type: "Makyaj Çantası",patterns: [/makyaj\s*[çc]anta/i] },
  ],

  parfum: [
    { type: "Parfüm (Kadın)", patterns: [/kad[ıi]n|woman|femme|women/i] },
    { type: "Parfüm (Erkek)", patterns: [/erkek|men|homme|man/i] },
    { type: "Kolonya",        patterns: [/kolonya/i] },
    { type: "Deodorant",      patterns: [/deodorant|antiperspirant|roll[- ]?on/i] },
    { type: "Parfüm Seti",    patterns: [/set\b|kutu\s*paket/i] },
  ],

  tablet: [
    { type: "iPad",          patterns: [/\bipad\b/i] },
    { type: "Galaxy Tab",    patterns: [/galaxy\s*tab/i] },
    { type: "Android Tablet",patterns: [/tablet|lenovo|huawei|mediapad|redmi\s*pad/i] },
    { type: "Tablet Kılıfı", patterns: [/k[ıi]l[ıi]f|case|cover/i] },
    { type: "Tablet Kalemi", patterns: [/pencil|kalem|stylus/i] },
  ],

  "akilli-saat": [
    { type: "Apple Watch",    patterns: [/apple\s*watch/i] },
    { type: "Galaxy Watch",   patterns: [/galaxy\s*watch/i] },
    { type: "Huawei Watch",   patterns: [/huawei\s*(watch|band)/i] },
    { type: "Xiaomi Watch",   patterns: [/xiaomi|mi\s*band|redmi\s*watch|amazfit/i] },
    { type: "Bileklik",       patterns: [/bileklik|fitness\s*tracker/i] },
    { type: "Kordon & Kayış", patterns: [/kordon|kay[ıi][sş]|strap|band/i] },
  ],

  "fotograf-kamera": [
    { type: "Aynasız Kamera", patterns: [/aynas[ıi]z|mirrorless/i] },
    { type: "DSLR",           patterns: [/dslr|reflex/i] },
    { type: "Aksiyon Kamera", patterns: [/gopro|aksiyon\s*kamera|action\s*cam/i] },
    { type: "Kompakt",        patterns: [/kompakt|compact/i] },
    { type: "Güvenlik Kamera",patterns: [/g[uü]venlik\s*kamera|ip\s*camera|cctv/i] },
    { type: "Lens",           patterns: [/\blens\b|objektif/i] },
    { type: "Tripod",         patterns: [/tripod/i] },
  ],

  "oyun-konsol": [
    { type: "PlayStation 5",  patterns: [/\bps5\b|playstation\s*5/i] },
    { type: "PlayStation 4",  patterns: [/\bps4\b|playstation\s*4/i] },
    { type: "Xbox Series",    patterns: [/xbox\s*series/i] },
    { type: "Nintendo Switch",patterns: [/nintendo\s*switch|switch\s*oled/i] },
    { type: "Kol & Gamepad",  patterns: [/gamepad|controller|dualshock|dualsense/i] },
    { type: "Oyun",           patterns: [/oyun|game\b/i] },
  ],

  "mobilya-dekorasyon": [
    { type: "Koltuk",         patterns: [/koltuk|berjer|sofa/i] },
    { type: "Yatak",          patterns: [/\byatak\b|karyola|ranza/i] },
    { type: "Masa",           patterns: [/\bmasa\b|yemek\s*mas|[çc]al[ıi][sş]ma\s*mas/i] },
    { type: "Sandalye",       patterns: [/sandalye|chair/i] },
    { type: "Dolap",          patterns: [/\bdolap\b|gardrop|raf|komodin/i] },
    { type: "Halı",           patterns: [/\bhal[ıi]\b/i] },
    { type: "Ayna",           patterns: [/\bayna\b/i] },
    { type: "Askı Aparatı",   patterns: [/ask[ıi]\s*aparat|mount/i] },
  ],
};

const CLOTHING_SLUGS = new Set([
  "erkek-giyim", "kadin-giyim", "cocuk-giyim", "bebek-giyim",
  "ic-giyim", "outdoor-giyim", "spor-giyim",
  "erkek-ayakkabi", "kadin-ayakkabi",
  "canta-cuzdan",
]);

function getRules(catSlug) {
  if (CLOTHING_SLUGS.has(catSlug)) return CLASS._clothing;
  return CLASS[catSlug] ?? null;
}

function classify(title, rules) {
  for (const r of rules) {
    for (const p of r.patterns) if (p.test(title)) return r.type;
  }
  return null;
}

(async () => {
  const targetSlugs = [...CLOTHING_SLUGS, ...Object.keys(CLASS).filter(k => !k.startsWith("_"))];

  const { data: cats } = await sb.from("categories").select("id, slug").in("slug", targetSlugs);
  const idToSlug = new Map(cats.map(c => [c.id, c.slug]));

  const { data: products } = await sb
    .from("products")
    .select("id, title, model_family, category_id")
    .in("category_id", [...idToSlug.keys()])
    .is("model_family", null)
    .limit(limit);

  console.log(`Classifying ${products.length} products across ${targetSlugs.length} categories...`);

  const countBySlug = {};
  const unmatchedBySlug = {};
  let totalSet = 0;

  for (const p of products) {
    const catSlug = idToSlug.get(p.category_id);
    const rules = getRules(catSlug);
    if (!rules) continue;
    const type = classify(p.title || "", rules);
    if (!type) {
      unmatchedBySlug[catSlug] = (unmatchedBySlug[catSlug] || 0) + 1;
      continue;
    }
    await sb.from("products").update({ model_family: type }).eq("id", p.id);
    countBySlug[catSlug] = (countBySlug[catSlug] || 0) + 1;
    totalSet++;
  }

  console.log("\nClassified by category:");
  for (const [s, n] of Object.entries(countBySlug).sort((a, b) => b[1] - a[1])) {
    const miss = unmatchedBySlug[s] || 0;
    console.log(`  ${s.padEnd(25)} ${String(n).padStart(5)} set, ${miss} unmatched`);
  }
  console.log(`\nTotal: ${totalSet} products classified.`);
})();
