// Çok-sinyalli kategori sınıflandırıcı — brand/title-context/source-cat/specs birleştirir
// Usage:
//   node --env-file=.env.local scripts/classify-products-smart.mjs --dry-run
//   node --env-file=.env.local scripts/classify-products-smart.mjs --apply
//   node --env-file=.env.local scripts/classify-products-smart.mjs --apply --category=cilt-bakimi

import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DRY_RUN = process.argv.includes("--dry-run") || !process.argv.includes("--apply");
const ONLY_CAT = (process.argv.find(a => a.startsWith("--category=")) || "").split("=")[1] || null;
const APPLY_THRESHOLD = 70;
const REVIEW_THRESHOLD = 50;

// 1) BRAND → CATEGORY (exclusive brands)
const BRAND_EXCLUSIVE = [
  { pattern: /^(Cressi|Mares|Scubapro|Aqua\s*Lung|Apeks|Salvimar|Beuchat|Apnea|Busso|Bestway|Dunny|Intex|Sea\s*Doo|Subea|Tusa|Speedo)$/i, cats: ["su-sporlari"], score: 100 },
  { pattern: /^(Bianchi|Trek|Giant|Cube|Specialized|Merida|Kron|Salcano|Bisan)$/i, cats: ["bisiklet"], score: 100 },
  { pattern: /^(Apple|iPhone)$/i, cats: ["akilli-telefon", "bilgisayar-laptop", "tablet", "akilli-saat", "ses-kulaklik", "telefon-aksesuar"], score: 60 },
  { pattern: /^(Samsung|Xiaomi|Huawei|Honor|Oppo|Vivo|Realme|OnePlus|Reeder|Casper|General\s*Mobile|Infinix|Tecno|Nokia|TCL)$/i, cats: ["akilli-telefon", "tablet", "telefon-aksesuar", "akilli-saat"], score: 70 },
  { pattern: /^(Dijitsu|Profilo|Altus|Vestel|Arçelik|Beko|Axen|Sunny|Awox|Finlux|Grundig|Regal|Telefunken)$/i, cats: ["tv", "beyaz-esya", "kucuk-ev-aletleri"], score: 70 },
  { pattern: /^(Bosch|Siemens|Miele|Electrolux|Whirlpool|Candy|Hotpoint|Ariston|Hoover|Indesit)$/i, cats: ["beyaz-esya", "kucuk-ev-aletleri"], score: 80 },
  { pattern: /^(Tefal|Arzum|Fakir|Karaca|Braun|Moulinex|Kenwood|Delonghi|Rowenta|Korkmaz|Sinbo|Russell\s*Hobbs)$/i, cats: ["kucuk-ev-aletleri"], score: 90 },
  { pattern: /^(MacBook|HP|Dell|Lenovo|Acer|MSI|Monster|Razer|Gigabyte|Fujitsu)$/i, cats: ["bilgisayar-laptop", "bilgisayar-bilesenleri"], score: 80 },
  { pattern: /^ASUS$/i, cats: ["bilgisayar-laptop", "bilgisayar-bilesenleri", "tv"], score: 60 },
  { pattern: /^(CeraVe|La\s*Roche[- ]?Posay|Vichy|Bioderma|Eucerin|Cetaphil|Neutrogena|Olay|Nivea|Avene|Garnier)$/i, cats: ["cilt-bakimi"], score: 95 },
  { pattern: /^(Maybelline|L'Oreal|Loreal|NYX|MAC|Nars|Urban\s*Decay|Revlon|Essence|Catrice|Flormar|Gabrini|Golden\s*Rose|Avon|Farmasi|Oriflame)$/i, cats: ["makyaj", "cilt-bakimi"], score: 80 },
  { pattern: /^(Schwarzkopf|Wella|Pantene|Head\s*&\s*Shoulders|Elseve|Elvive|TRESemmé|Palmolive)$/i, cats: ["sac-bakimi"], score: 95 },
  { pattern: /^(JBL|Bose|Beats|Sennheiser|AKG|Marshall|Harman\s*Kardon|Boltune|Edifier|Soundcore|Anker|Creative|Yamaha|Nothing|HyperX|SteelSeries)$/i, cats: ["ses-kulaklik"], score: 90 },
  { pattern: /^(Nike|Adidas|Puma|Reebok|Asics|New\s*Balance|Converse|Vans|Skechers|Timberland|Under\s*Armour|Fila|Kappa|Superga|Geox)$/i, cats: ["erkek-ayakkabi", "kadin-ayakkabi", "spor-giyim", "erkek-giyim", "kadin-giyim"], score: 50 },
  { pattern: /^(Sony|Microsoft|Nintendo)$/i, cats: ["oyun-konsol", "tv", "ses-kulaklik", "fotograf-kamera"], score: 40 },
  { pattern: /^(Canon|Nikon|Fujifilm|Olympus|GoPro|DJI|Insta360|Leica)$/i, cats: ["fotograf-kamera"], score: 95 },
];

// 2) TITLE + CONTEXT RULES (multi-word)
const TITLE_RULES = [
  { cat: "su-sporlari", score: 95, pattern: /\bmaske\b.*\b(şnorkel|dal[ıi][sş]|palet|y[uü]zme|sualt[ıi])\b/i },
  { cat: "su-sporlari", score: 95, pattern: /\b(şnorkel|dal[ıi][sş]|palet|sualt[ıi])\b.*\bmaske\b/i },
  { cat: "cilt-bakimi", score: 90, pattern: /\b(y[uü]z|cilt|kil|sheet|kağı[dt]|hidrojel)\s*maskesi\b/i },
  { cat: "sac-bakimi", score: 95, pattern: /\bsa[çc]\s*maskesi\b/i },
  { cat: "kisisel-hijyen", score: 85, pattern: /\b(cerrahi|tıbbi|medikal|FFP2|FFP3|N95|KN95|meltblown|3\s*kat|nebülizat|nebulizat)\s*(maske)?/i },
  // Industrial masks (welding, respirator, half/full face)
  { cat: "yapi-market", score: 90, pattern: /\b(kaynak\s*maske|welding\s*mask|kömürlü\s*maske|filtreli\s*maske|yar[ıi]m\s*y[uü]z\s*maske|tam\s*y[uü]z\s*maske|anti[- ]?gaz|X[- ]?plore|gaz\s*maskes)/i },
  // Costume/party masks
  { cat: "oyuncak", score: 90, pattern: /\b(spiderman|batman|zorro|venom|hulk|thor|iron\s*man|superhero|s[uü]per\s*kahraman|cosplay|maskeli\s*balo|halloween|cad[ıi]lar|harley\s*quinn|scream|ghost\s*face|ninja|anonim|vendetta|animasyon|[cç]izgi\s*film|elektronik\s*maske|elektronic\s*mask|kost[uü]m)\b/i },
  // Hair care disguised as skincare (Loreal Pro hair, Olaplex, Garnier hair)
  { cat: "sac-bakimi", score: 95, pattern: /\b(Olaplex|Kerastase|Loreal\s*Professionnel|Serie\s*Expert|Vitamino|Metal\s*Detox|Wella\s*Professional|Schwarzkopf\s*Pro|Nem\s*Bombas[ıi]\s*Canland[ıi]r[ıi]c[ıi]\s*Ka[gğ][ıi]t|Hair\s*Resfyer|keratin\s*maske|sa[çc]\s*onarıc|sa[çc]\s*g[uü][çc]lendir|sa[çc]\s*nem)\b/i },
  // Foreo & light therapy cosmetic devices stay in cilt-bakimi
  { cat: "cilt-bakimi", score: 80, pattern: /\b(Foreo|UFO\s*Power\s*Maske|[ıi][sş][ıi]k\s*terapi|cilt\s*cihaz[ıi]|LED\s*maske)\b/i },
  { cat: "fotograf-kamera", score: 85, pattern: /\b(aynas[ıi]z|mirrorless|dslr|reflex|aksiyon\s*kamera|action\s*cam|gopro|full\s*frame)\b/i },
  { cat: "fotograf-kamera", score: 80, pattern: /\b(objektif|\blens\b|tripod|gimbal)\b/i },
  { cat: "networking", score: 80, pattern: /\b(g[uü]venlik\s*kamera|ip\s*camera|cctv|nvr|dvr)\b/i },
  { cat: "tv", score: 90, pattern: /\b(\d{2})\s*(inç|inch|ekran)\s*(smart\s*)?(tv|televizyon|oled|qled|lcd|led)\b/i },
  { cat: "mobilya-dekorasyon", score: 70, pattern: /\b(ask[ıi]\s*aparat|duvar\s*ask[ıi]|tav[aı]n\s*ask[ıi]|mount)\b/i },
  { cat: "akilli-telefon", score: 95, pattern: /\b(iphone|galaxy|redmi|xiaomi)\s+\d+\s*(pro|plus|ultra|max|mini|fe|lite|se)?\s*\d+\s*(gb|tb)\b/i },
  { cat: "telefon-aksesuar", score: 85, pattern: /\b(telefon\s*k[ıi]l[ıi]f|iphone\s*k[ıi]l[ıi]f|samsung\s*k[ıi]l[ıi]f|case|cover|ekran\s*koruyucu|cam\s*koruyucu)\b/i },
  { cat: "bilgisayar-laptop", score: 90, pattern: /\b(macbook|laptop|notebook|diz[uü]st[uü]\s*bilgisayar)\s+(pro|air|gaming|\d+|i\d|ryzen)/i },
  { cat: "bilgisayar-bilesenleri", score: 80, pattern: /\b(anakart|ekran\s*kart[ıi]|ram\s*bellek|\bssd\b|\bhdd\b|i[sş]lemci|\bcpu\b|\bgpu\b|soket)\b/i },
  { cat: "beyaz-esya", score: 90, pattern: /\b([çc]ama[sş][ıi]r|bula[sş][ıi]k)\s*(makinesi|kurutucusu)\b|\b[çc]ama[sş][ıi]r\s*kurutma\s*mak|\bbuzdolab\b|\bderin\s*dondurucu\b|\bankastre\s*(f[ıi]r[ıi]n|ocak|bula[sş][ıi]k)\b/i },
  // Hair care — explicit override so "saç kurutma makinesi" stays in sac-bakimi
  { cat: "sac-bakimi", score: 95, pattern: /\b(sa[çc]\s*kurutma\s*mak|sa[çc]\s*kurutucu|sa[çc]\s*d[uü]zle[sş]tirici|sa[çc]\s*ma[sş]a|sa[çc]\s*kesme\s*mak|[sş]ampuan|sa[çc]\s*kremi|sa[çc]\s*serum|sa[çc]\s*boyas[ıi]|sa[çc]\s*bak[ıi]m)\b/i },
  { cat: "kucuk-ev-aletleri", score: 85, pattern: /\b(s[uü]p[uü]rge|elektrik\s*s[uü]p|blender|rondo|air\s*fryer|frit[oö]z|tost\s*mak|kahve\s*mak|espresso|kettle|su\s*[ıi]s[ıi]t|[uü]t[uü]\s*mak)\b/i },
  { cat: "su-sporlari", score: 85, pattern: /\b(dal[ıi][sş]\s*ekipman|sualt[ıi]|y[uü]zme\s*g[oö]zl[uü][gğ][uü]|palet|[sş]nor|neopren|wetsuit)\b/i },
  { cat: "fitness", score: 80, pattern: /\b(yoga\s*mat|dambıl|kettlebell|k[oö]t[uü]ren|pilates|direnç\s*band|kondisyon)\b/i },
  { cat: "outdoor-kamp", score: 85, pattern: /\b([çc]ad[ıi]r|uyku\s*tulum|kamp\s*mutfa|kamp\s*masa|termos|kamp\s*sandalyesi)\b/i },
  { cat: "makyaj", score: 90, pattern: /\b(ruj|lipstick|fond[oö]ten|foundation|maskara|eyeliner|kapat[ıi]c|concealer|all[ıi]k|blush|g[oö]z\s*far|eyeshadow|oje\b|aydınlatıcı|highlighter)\b/i },
  { cat: "parfum", score: 90, pattern: /\b(parf[uü]m|\bedp\b|\bedt\b|eau\s*de|kolonya|cologne|deodorant|antiperspirant)\b/i },
  { cat: "cilt-bakimi", score: 85, pattern: /\b(nemlendirici|retinol|vitamin\s*c\s*serum|g[uü]ne[sş]\s*kremi|spf\s*\d+|ceramide|hyaluronic|peeling|tonik|temizleme\s*jel|y[uü]z\s*kremi)\b/i },
  { cat: "sac-bakimi", score: 90, pattern: /\b(şampuan|saç\s*kremi|saç\s*serumu|saç\s*boyası|saç\s*kurutma|sa[çc]\s*d[uü]zle[sş]tirici|sa[çc]\s*ma[sş]a)\b/i },
  { cat: "telefon-aksesuar", score: 80, pattern: /\b(powerbank|power\s*bank|ta[sş][ıi]nab[ıi]l[ıi]r\s*[sş]arj|h[ıi]zl[ıi]\s*[sş]arj)\b/i },
  { cat: "akilli-saat", score: 90, pattern: /\b(apple\s*watch|galaxy\s*watch|mi\s*band|amazfit|huawei\s*watch|akıllı\s*saat|smart\s*watch|fitness\s*tracker)\b/i },
  { cat: "oyun-konsol", score: 90, pattern: /\b(playstation|ps[45]|xbox\s*series|nintendo\s*switch|dualsense|dualshock|gamepad|oyun\s*kol)\b/i },
  { cat: "tablet", score: 90, pattern: /\b(ipad\s*(pro|air|mini)?|galaxy\s*tab|huawei\s*matepad|android\s*tablet|tablet\s*bilgisayar)\b/i },
  { cat: "kitap", score: 85, pattern: /\b(roman|kitap|edebiyat|ciltli\s*(kitap|baskı)|yay[ıi]nlar[ıi])\b/i },
  { cat: "oyuncak", score: 85, pattern: /\b(oyuncak|lego|puzzle\s*oyun|bebek\s*oyuncak|maket)\b/i },
];

// 3) SOURCE CATEGORY → OUR CATEGORY
const SOURCE_CAT_MAP = {
  "Maske ve Şnorkeller": "su-sporlari",
  "Maskeler": "su-sporlari",
  "Outdoor Ayakkabı": "outdoor-kamp",
  "Çadır": "outdoor-kamp",
  "Uyku Tulumu": "outdoor-kamp",
  "Günlük Etek": "kadin-giyim",
  "Günlük Pantolon": "erkek-giyim",
  "Eşofman Altı": "spor-giyim",
  "iPhone iOS Telefonlar": "akilli-telefon",
  "Android Telefonlar": "akilli-telefon",
  "Notebook Bataryaları": "bilgisayar-laptop",
  "Notebook Adaptörleri": "bilgisayar-laptop",
  "Tabletler": "tablet",
  "Dizüstü Bilgisayarlar": "bilgisayar-laptop",
  "Askı Aparatları": "mobilya-dekorasyon",
  "Ekran Koruyucular": "telefon-aksesuar",
  "Kamera Aksesuarları": "fotograf-kamera",
  "Çamaşır Makineleri": "beyaz-esya",
  "Buzdolapları": "beyaz-esya",
  "Bluetooth Kulaklıklar": "ses-kulaklik",
  "Televizyon": "tv", "QLED TV": "tv", "OLED TV": "tv",
  "Ekran Kartı": "bilgisayar-bilesenleri",
  "Ram": "bilgisayar-bilesenleri",
  "Solid State Disk Drive (SSD)": "bilgisayar-bilesenleri",
  "Oyun Konsolları": "oyun-konsol",
  "Aynasız Fotoğraf Makineleri": "fotograf-kamera",
  "Şipşak Fotoğraf Makineleri": "fotograf-kamera",
  "Aksiyon Kamerası": "fotograf-kamera",
  "Güvenlik Kamerası": "networking",
  "Router": "networking", "Wi-Fi Mesh Sistemi": "networking", "Access Point": "networking",
  "Yazıcı & Tarayıcı": "yazici-tarayici",
  "Menzil Genişletici": "networking",
  "Taşınabilir Şarj Cihazları": "telefon-aksesuar",
  "Samsung Tablet": "tablet", "Android Tabletler": "tablet",
  "Apple Watch Series 11": "akilli-saat", "Akıllı Saatler": "akilli-saat", "Huawei Akıllı Saatler": "akilli-saat",
  "Tablet Kılıfları": "telefon-aksesuar",
  "Kulak İçi Kulaklıklar": "ses-kulaklik",
  "Oyuncu Kulaklıkları": "ses-kulaklik",
  "Asus Laptop": "bilgisayar-laptop", "Lenovo Laptop Modelleri": "bilgisayar-laptop", "Laptop": "bilgisayar-laptop",
};

// 4) SPECS.Ürün Tipi → OUR CATEGORY (MediaMarkt)
const SPEC_URUN_TIPI_MAP = {
  "Akıllı Telefon": "akilli-telefon",
  "Tablet": "tablet",
  "Dizüstü Bilgisayar": "bilgisayar-laptop",
  "Laptop": "bilgisayar-laptop",
  "Akıllı Saat": "akilli-saat",
  "Kulaklık": "ses-kulaklik",
  "Kamera": "fotograf-kamera",
  "Televizyon": "tv",
};

function classify(product) {
  const title = product.title || "";
  const brand = (product.brand || "").trim();
  const specs = product.specs || {};
  const scores = {};

  function add(cat, score) {
    if (!cat) return;
    scores[cat] = (scores[cat] || 0) + score;
  }

  for (const rule of BRAND_EXCLUSIVE) {
    if (rule.pattern.test(brand)) {
      for (const c of rule.cats) add(c, rule.score / rule.cats.length);
    }
  }

  for (const rule of TITLE_RULES) {
    if (rule.pattern.test(title)) add(rule.cat, rule.score);
  }

  const srcCat = specs.pttavm_category || specs.mediamarkt_category;
  if (srcCat) {
    const direct = SOURCE_CAT_MAP[srcCat];
    if (direct) add(direct, 95);
    else {
      for (const [key, cat] of Object.entries(SOURCE_CAT_MAP)) {
        if (srcCat.includes(key)) { add(cat, 60); break; }
      }
    }
  }

  const urunTipi = specs["Ürün Tipi"];
  if (urunTipi && SPEC_URUN_TIPI_MAP[urunTipi]) {
    add(SPEC_URUN_TIPI_MAP[urunTipi], 95);
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return { category: null, score: 0 };
  return { category: sorted[0][0], score: sorted[0][1] };
}

(async () => {
  const { data: cats } = await sb.from("categories").select("id, slug");
  const slugToId = new Map(cats.map(c => [c.slug, c.id]));
  const idToSlug = new Map(cats.map(c => [c.id, c.slug]));

  let baseQuery = sb.from("products").select("id, title, brand, category_id, specs, source");
  if (ONLY_CAT) {
    const catId = slugToId.get(ONLY_CAT);
    if (!catId) { console.error("Unknown category:", ONLY_CAT); process.exit(1); }
    baseQuery = baseQuery.eq("category_id", catId);
  }

  let applied = 0, wouldApply = 0, review = 0, skipped = 0, kept = 0;
  const changes = {};

  for (let page = 0; page < 60; page++) {
    const { data } = await baseQuery.range(page * 1000, page * 1000 + 999);
    if (!data || data.length === 0) break;

    for (const p of data) {
      const result = classify(p);
      const currentSlug = idToSlug.get(p.category_id) || "(null)";
      if (!result.category) { skipped++; continue; }
      if (result.category === currentSlug) { kept++; continue; }

      if (result.score >= APPLY_THRESHOLD) {
        const key = `${currentSlug} → ${result.category}`;
        changes[key] = (changes[key] || 0) + 1;

        if (DRY_RUN) {
          wouldApply++;
        } else {
          const newCatId = slugToId.get(result.category);
          if (newCatId) {
            await sb.from("products").update({ category_id: newCatId }).eq("id", p.id);
            applied++;
          }
        }
      } else if (result.score >= REVIEW_THRESHOLD) {
        review++;
      } else {
        skipped++;
      }
    }

    if (data.length < 1000) break;
    if ((page + 1) % 5 === 0) {
      process.stdout.write(`\r  page ${page + 1}: kept=${kept} ${DRY_RUN ? `would-apply=${wouldApply}` : `applied=${applied}`} review=${review} skipped=${skipped}`);
    }
  }

  console.log(`\n\n=== Summary ${DRY_RUN ? "[DRY RUN]" : "[APPLIED]"} ===`);
  console.log(`Kept (already correct):   ${kept}`);
  console.log(`${DRY_RUN ? "Would apply" : "Applied"}:              ${DRY_RUN ? wouldApply : applied}`);
  console.log(`Review (score 50-70):     ${review}`);
  console.log(`Skipped (no signal):      ${skipped}`);

  console.log(`\nTop category changes:`);
  Object.entries(changes).sort((a, b) => b[1] - a[1]).slice(0, 30).forEach(([k, v]) => {
    console.log(`  ${String(v).padStart(5)}  ${k}`);
  });

  if (DRY_RUN) {
    console.log(`\n[DRY RUN] — ${wouldApply} değişiklik uygulanmadı. Onaylamak için --apply ile çalıştır.`);
  }
})();
