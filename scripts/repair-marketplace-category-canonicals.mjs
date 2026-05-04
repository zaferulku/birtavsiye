#!/usr/bin/env node
/**
 * Repair marketplace products that landed in legacy/duplicate category branches.
 *
 * Dry-run:
 *   node --env-file=.env.local scripts/repair-marketplace-category-canonicals.mjs
 *
 * Apply:
 *   APPLY=1 node --env-file=.env.local scripts/repair-marketplace-category-canonicals.mjs
 */
import { createClient } from "@supabase/supabase-js";

const apply = process.env.APPLY === "1";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const sb = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const FOOD_GROUP_SLUG = "supermarket/gida-icecek";

const CATEGORY_DEFINITIONS = {
  [FOOD_GROUP_SLUG]: {
    name: "Gıda & İçecek",
    parentSlug: "supermarket",
    isLeaf: false,
  },
  [`${FOOD_GROUP_SLUG}/kahve`]: {
    name: "Kahve",
    parentSlug: FOOD_GROUP_SLUG,
    isLeaf: false,
  },
  [`${FOOD_GROUP_SLUG}/kahve/cekirdek-kahve`]: {
    name: "Çekirdek Kahve",
    parentSlug: `${FOOD_GROUP_SLUG}/kahve`,
  },
  [`${FOOD_GROUP_SLUG}/kahve/espresso-cappucino-kahve`]: {
    name: "Espresso, Cappucino Kahve",
    parentSlug: `${FOOD_GROUP_SLUG}/kahve`,
  },
  [`${FOOD_GROUP_SLUG}/kahve/filtre-cekirdek-kahveler`]: {
    name: "Filtre & Çekirdek Kahveler",
    parentSlug: `${FOOD_GROUP_SLUG}/kahve`,
  },
  [`${FOOD_GROUP_SLUG}/kahve/hazir-kahve`]: {
    name: "Hazır Kahve",
    parentSlug: `${FOOD_GROUP_SLUG}/kahve`,
  },
  [`${FOOD_GROUP_SLUG}/kahve/kahve-aksesuarlari`]: {
    name: "Kahve Aksesuarları",
    parentSlug: `${FOOD_GROUP_SLUG}/kahve`,
  },
  [`${FOOD_GROUP_SLUG}/kahve/kahve-kapsulleri`]: {
    name: "Kahve Kapsülleri",
    parentSlug: `${FOOD_GROUP_SLUG}/kahve`,
  },
  [`${FOOD_GROUP_SLUG}/kahve/turk-kahvesi`]: {
    name: "Türk Kahvesi",
    parentSlug: `${FOOD_GROUP_SLUG}/kahve`,
  },
  "spor-outdoor/fitness/yoga-pilates": {
    name: "Yoga & Pilates",
    parentSlug: "spor-outdoor/fitness",
    isLeaf: false,
  },
  "spor-outdoor/fitness/yoga-pilates/foam-roller": {
    name: "Foam Roller",
    parentSlug: "spor-outdoor/fitness/yoga-pilates",
  },
  "spor-outdoor/fitness/yoga-pilates/pilates-mati": {
    name: "Pilates Matı",
    parentSlug: "spor-outdoor/fitness/yoga-pilates",
  },
  "spor-outdoor/fitness/yoga-pilates/pilates-topu": {
    name: "Pilates Topu",
    parentSlug: "spor-outdoor/fitness/yoga-pilates",
  },
  "spor-outdoor/fitness/yoga-pilates/yoga-bloku": {
    name: "Yoga Bloku",
    parentSlug: "spor-outdoor/fitness/yoga-pilates",
  },
  "spor-outdoor/fitness/yoga-pilates/yoga-mati": {
    name: "Yoga Matı",
    parentSlug: "spor-outdoor/fitness/yoga-pilates",
  },
};

const FOOD_BRANCH_MOVES = [
  ["supermarket/gida", FOOD_GROUP_SLUG, "supermarket"],
  ["supermarket/atistirmalik", `${FOOD_GROUP_SLUG}/atistirmalik`, FOOD_GROUP_SLUG],
  ["supermarket/bakliyat-makarna", `${FOOD_GROUP_SLUG}/bakliyat-makarna`, FOOD_GROUP_SLUG],
  ["supermarket/dondurma-tatli", `${FOOD_GROUP_SLUG}/dondurma-tatli`, FOOD_GROUP_SLUG],
  ["supermarket/icecek", `${FOOD_GROUP_SLUG}/icecek`, FOOD_GROUP_SLUG],
  ["supermarket/kahvalti-kahve", `${FOOD_GROUP_SLUG}/kahvalti-kahve`, FOOD_GROUP_SLUG],
  ["supermarket/konserve-sos", `${FOOD_GROUP_SLUG}/konserve-sos`, FOOD_GROUP_SLUG],
  [`${FOOD_GROUP_SLUG}/icecek/kahve`, `${FOOD_GROUP_SLUG}/kahve`, FOOD_GROUP_SLUG],
];

const CATEGORY_BRANCH_MOVES = [
  ["spor-outdoor/yoga-pilates", "spor-outdoor/fitness/yoga-pilates", "spor-outdoor/fitness"],
];

const LEGACY_CATEGORY_TARGETS = {
  "supermarket/atistirmalik": `${FOOD_GROUP_SLUG}/atistirmalik`,
  "supermarket/bakliyat-makarna": `${FOOD_GROUP_SLUG}/bakliyat-makarna`,
  "supermarket/dondurma-tatli": `${FOOD_GROUP_SLUG}/dondurma-tatli`,
  "supermarket/icecek": `${FOOD_GROUP_SLUG}/icecek`,
  "supermarket/icecek/kahve": `${FOOD_GROUP_SLUG}/kahve`,
  "supermarket/icecek/kahve/cekirdek-kahve": `${FOOD_GROUP_SLUG}/kahve/cekirdek-kahve`,
  "supermarket/icecek/kahve/espresso-cappucino-kahve": `${FOOD_GROUP_SLUG}/kahve/espresso-cappucino-kahve`,
  "supermarket/icecek/kahve/filtre-cekirdek-kahveler": `${FOOD_GROUP_SLUG}/kahve/filtre-cekirdek-kahveler`,
  "supermarket/icecek/kahve/hazir-kahve": `${FOOD_GROUP_SLUG}/kahve/hazir-kahve`,
  "supermarket/icecek/kahve/kahve-aksesuarlari": `${FOOD_GROUP_SLUG}/kahve/kahve-aksesuarlari`,
  "supermarket/icecek/kahve/kahve-kapsulleri": `${FOOD_GROUP_SLUG}/kahve/kahve-kapsulleri`,
  "supermarket/icecek/kahve/turk-kahvesi": `${FOOD_GROUP_SLUG}/kahve/turk-kahvesi`,
  "supermarket/kahvalti-kahve": `${FOOD_GROUP_SLUG}/kahvalti-kahve`,
  "supermarket/kahve": `${FOOD_GROUP_SLUG}/kahve`,
  "supermarket/kahve/espresso": `${FOOD_GROUP_SLUG}/kahve/espresso-cappucino-kahve`,
  "supermarket/kahve/filtre-kahve": `${FOOD_GROUP_SLUG}/kahve/filtre-cekirdek-kahveler`,
  "supermarket/kahve/nespresso-kapsul": `${FOOD_GROUP_SLUG}/kahve/kahve-kapsulleri`,
  "supermarket/kahve/turk-kahvesi": `${FOOD_GROUP_SLUG}/kahve/turk-kahvesi`,
  "supermarket/konserve-sos": `${FOOD_GROUP_SLUG}/konserve-sos`,
  "spor-outdoor/spor-fitness/fitness-kondisyon/pilates/pilates-mati":
    "spor-outdoor/fitness/yoga-pilates/pilates-mati",
};

const PRODUCT_CATEGORY_TARGET_RULES = [
  [/^elektronik\/telefonlar-aksesuarlari\/cep-telefonlari\//, "elektronik/telefon/akilli-telefon"],
  [/^elektronik\/telefonlar-aksesuarlari\/cep-telefonlari$/, "elektronik/telefon/akilli-telefon"],
  [/^elektronik\/telefonlar-aksesuarlari\/cep-telefonu-aksesuarlari\/kiliflar/, "elektronik/telefon/kilif"],
  [/^elektronik\/telefonlar-aksesuarlari\/cep-telefonu-aksesuarlari\/ekran-koruyucular/, "elektronik/telefon/ekran-koruyucu"],
  [/^elektronik\/telefonlar-aksesuarlari\/cep-telefonu-aksesuarlari\/kulakliklar/, "elektronik/tv-ses-goruntu/kulaklik"],
  [/^elektronik\/telefonlar-aksesuarlari\/cep-telefonu-aksesuarlari/, "elektronik/telefon/aksesuar"],
  [/^elektronik\/telefonlar-aksesuarlari\/cep-telefonu-yedek-parcalari/, "elektronik/telefon/yedek-parca"],
  [/^elektronik\/telefonlar-aksesuarlari\/giyilebilir-teknoloji-urunleri/, "elektronik/giyilebilir/akilli-saat"],
  [/^elektronik\/telefonlar-aksesuarlari$/, "elektronik/telefon/aksesuar"],

  [/^elektronik\/televizyon-ses-sistemleri\/televizyonlar/, "elektronik/tv-ses-goruntu/televizyon"],
  [/^elektronik\/televizyon-ses-sistemleri\/televizyon-aksesuarlari/, "elektronik/tv-ses-goruntu/tv-aksesuar"],
  [/^elektronik\/televizyon-ses-sistemleri\/bluetooth-hoparlorler/, "elektronik/tv-ses-goruntu/bluetooth-hoparlor"],
  [/^elektronik\/televizyon-ses-sistemleri\/oyun-konsollari-aksesuarlar/, "elektronik/oyun/konsol"],
  [/^elektronik\/televizyon-ses-sistemleri/, "elektronik/tv-ses-goruntu"],

  [/^elektronik\/elektrikli-ev-mutfak-aletleri\/elektrikli-mutfak-aletleri\/tost-makineleri/, "kucuk-ev-aletleri/mutfak/tost-makinesi"],
  [/^elektronik\/elektrikli-ev-mutfak-aletleri\/elektrikli-mutfak-aletleri\/kahve-makineleri/, "kucuk-ev-aletleri/mutfak/kahve-makinesi"],
  [/^elektronik\/elektrikli-ev-mutfak-aletleri\/elektrikli-mutfak-aletleri\/su-isiticilar-kettle/, "kucuk-ev-aletleri/mutfak/su-isiticisi"],
  [/^elektronik\/elektrikli-ev-mutfak-aletleri\/elektrikli-mutfak-aletleri\/blender-mikser-ve-mutfak-robotlari\/mikserler/, "kucuk-ev-aletleri/mutfak/mikser"],
  [/^elektronik\/elektrikli-ev-mutfak-aletleri\/elektrikli-mutfak-aletleri\/blender-mikser-ve-mutfak-robotlari/, "kucuk-ev-aletleri/mutfak/blender"],
  [/^elektronik\/elektrikli-ev-mutfak-aletleri\/elektrikli-mutfak-aletleri\/endustriyel-mutfak-aletleri/, "kucuk-ev-aletleri/mutfak"],
  [/^elektronik\/elektrikli-ev-mutfak-aletleri\/elektrikli-supurgeler\/robot-supurgeler/, "kucuk-ev-aletleri/temizlik/robot-supurge"],
  [/^elektronik\/elektrikli-ev-mutfak-aletleri\/elektrikli-supurgeler/, "kucuk-ev-aletleri/temizlik/supurge"],
  [/^elektronik\/elektrikli-ev-mutfak-aletleri\/elektrikli-mutfak-aletleri$/, "kucuk-ev-aletleri/mutfak"],
  [/^elektronik\/elektrikli-ev-mutfak-aletleri$/, "kucuk-ev-aletleri"],

  [/^elektronik\/beyaz-esya\/buzdolaplari/, "beyaz-esya/buzdolabi"],
  [/^elektronik\/beyaz-esya\/camasir-makineleri/, "beyaz-esya/camasir-makinesi"],
  [/^elektronik\/beyaz-esya\/bulasik-makineleri/, "beyaz-esya/bulasik-makinesi"],
  [/^elektronik\/beyaz-esya\/kurutma-makineleri/, "beyaz-esya/kurutma-makinesi"],
  [/^elektronik\/beyaz-esya/, "beyaz-esya"],

  [/^elektronik\/bilgisayar-tablet\/bilgisayar-bilesenleri\/bellek-ram/, "elektronik/bilgisayar-tablet/bilesenler/parca"],
  [/^elektronik\/bilgisayar-tablet\/bilgisayar-bilesenleri\/ekran-kartlari-gpu/, "elektronik/bilgisayar-tablet/bilesenler/parca"],
  [/^elektronik\/bilgisayar-tablet\/bilgisayar-bilesenleri\/sogutucu-ve-fan/, "elektronik/bilgisayar-tablet/bilesenler/parca"],
  [/^elektronik\/bilgisayar-tablet\/bilgisayar-bilesenleri/, "elektronik/bilgisayar-tablet/bilesenler/parca"],
  [/^elektronik\/bilgisayar-tablet\/bilgisayar-aksesuarlari\/tablet-aksesuarlari/, "elektronik/bilgisayar-tablet/tablet"],
  [/^elektronik\/bilgisayar-tablet\/bilgisayar-aksesuarlari\/dizustu-bilgisayar-aksesuarlari/, "elektronik/bilgisayar-tablet/bilgisayar-aksesuarlari"],
  [/^elektronik\/bilgisayar-tablet\/bilgisayar-aksesuarlari/, "elektronik/bilgisayar-tablet/bilgisayar-aksesuarlari"],
  [/^elektronik\/bilgisayar-tablet\/cevre-birimleri\/mouse/, "elektronik/bilgisayar-tablet/klavye-mouse"],
  [/^elektronik\/bilgisayar-tablet\/cevre-birimleri\/klavye/, "elektronik/bilgisayar-tablet/klavye-mouse"],
  [/^elektronik\/bilgisayar-tablet\/cevre-birimleri\/webcam/, "elektronik/bilgisayar-tablet/bilesenler/cevre-birim/webcam"],
  [/^elektronik\/bilgisayar-tablet\/cevre-birimleri/, "elektronik/bilgisayar-tablet/bilesenler/cevre-birim"],
  [/^elektronik\/bilgisayar-tablet\/dizustu-bilgisayarlar/, "elektronik/bilgisayar-tablet/laptop"],
  [/^elektronik\/bilgisayar-tablet\/tabletler/, "elektronik/bilgisayar-tablet/tablet"],
  [/^elektronik\/bilgisayar-tablet\/monitorler/, "elektronik/bilgisayar-tablet/monitor"],
  [/^elektronik\/bilgisayar-tablet\/masaustu-bilgisayarlar/, "elektronik/bilgisayar-tablet/masaustu"],
  [/^elektronik\/bilgisayar-tablet\/veri-depolama/, "elektronik/bilgisayar-tablet/bilesenler/veri-depolama"],

  [/^fotograf-kamera\/fotograf-makineleri/, "elektronik/kamera/fotograf-makinesi"],
  [/^fotograf-kamera\/fotograf-kamera-aksesuarlari/, "elektronik/kamera/kamera-aksesuar"],
  [/^fotograf-kamera\/video-kameralar\/web-kameralari/, "elektronik/bilgisayar-tablet/bilesenler/cevre-birim/webcam"],
  [/^fotograf-kamera\/video-kameralar/, "elektronik/kamera/aksiyon-kamera"],
  [/^fotograf-kamera$/, "elektronik/kamera"],

  [/^spor-outdoor\/outdoor\/kamp-kampcilik-malzemeleri/, "spor-outdoor/kamp/kamp-ekipmanlari"],
  [/^spor-outdoor\/outdoor\/tekne-tekne-malzemeleri\/su-sporu/, "spor-outdoor/su-sporlari"],
  [/^spor-outdoor\/outdoor\/kara-balik-av-malzemeleri\/balik-av-malzemeleri/, "spor-outdoor/kamp/av-balikcilik"],
  [/^spor-outdoor\/outdoor\/outdoor-giyim-ayakkabi\/outdoor-ayakkabi/, "spor-outdoor/kosu-ayakkabisi"],
  [/^spor-outdoor\/outdoor\/outdoor-giyim-ayakkabi/, "spor-outdoor"],
  [/^spor-outdoor\/outdoor$/, "spor-outdoor/kamp/kamp-ekipmanlari"],
  [/^spor-outdoor\/spor-fitness\/fitness-kondisyon\/pilates/, "spor-outdoor/fitness/yoga-pilates"],
  [/^spor-outdoor\/spor-fitness\/fitness-kondisyon/, "spor-outdoor/fitness/kondisyon-aleti"],
  [/^spor-outdoor\/spor-fitness\/vucut-gelistirme-aletleri\/dambillar-ve-agirlik-plakalari/, "spor-outdoor/fitness/agirlik-guc"],
  [/^spor-outdoor\/spor-fitness\/vucut-gelistirme-aletleri/, "spor-outdoor/fitness/agirlik-guc"],
  [/^spor-outdoor\/spor-fitness\/spor-giyim-aksesuar\/ayakkabi/, "spor-outdoor/kosu-ayakkabisi"],
  [/^spor-outdoor\/spor-fitness\/spor-giyim-aksesuar\/giyim/, "spor-outdoor"],
  [/^spor-outdoor\/spor-fitness\/spor-giyim-aksesuar/, "spor-outdoor"],
  [/^spor-outdoor\/spor-fitness\/bisiklet/, "spor-outdoor/bisiklet/bisiklet-aksesuar"],
  [/^spor-outdoor\/spor-fitness\/spor-branslari\/boks/, "spor-outdoor/takim-sporlari/boks-dovus"],
  [/^spor-outdoor\/spor-fitness\/spor-branslari/, "spor-outdoor/takim-sporlari"],

  [/^giyim-aksesuar\/kadin\/kadin-ayakkabi\/spor-ayakkabi/, "moda/kadin-ayakkabi/sneaker"],
  [/^giyim-aksesuar\/kadin\/kadin-ayakkabi/, "moda/kadin-ayakkabi"],
  [/^giyim-aksesuar\/erkek\/erkek-ayakkabi\/spor-ayakkabi/, "moda/erkek-ayakkabi/sneaker"],
  [/^giyim-aksesuar\/erkek\/erkek-ayakkabi/, "moda/erkek-ayakkabi"],
  [/^giyim-aksesuar\/erkek\/giyim\/esofman/, "moda/erkek-giyim/esofman"],
  [/^giyim-aksesuar\/erkek\/giyim/, "moda/erkek-giyim"],
  [/^giyim-aksesuar\/erkek\/ic-giyim\/corap/, "moda/erkek-giyim"],
  [/^giyim-aksesuar\/kadin\/giyim/, "moda/kadin-giyim"],
  [/^giyim-aksesuar\/kadin\/kadin-canta/, "moda/aksesuar/canta-cuzdan/kadin-canta"],
  [/^giyim-aksesuar\/erkek\/erkek-canta-cuzdan/, "moda/aksesuar/canta-cuzdan/erkek-canta"],
  [/^giyim-aksesuar\/erkek\/erkek-aksesuar/, "moda/aksesuar/saat-taki/kemer-aksesuar"],
  [/^giyim-aksesuar\/bavul-valiz/, "moda/aksesuar/canta-cuzdan/valiz-bavul"],
  [/^giyim-aksesuar$/, "moda"],

  [/^taki-gozluk-saat\/gozluk/, "moda/aksesuar/gozluk"],
  [/^taki-gozluk-saat\/saat\/kadin/, "moda/aksesuar/saat-taki/kadin-saati"],
  [/^taki-gozluk-saat\/saat\/erkek/, "moda/aksesuar/saat-taki/erkek-saati"],
  [/^taki-gozluk-saat\/saat/, "moda/aksesuar/saat-taki"],
  [/^taki-gozluk-saat\/taki/, "moda/aksesuar/saat-taki/taki"],
  [/^taki-gozluk-saat\/gumus/, "moda/aksesuar/saat-taki/taki"],
  [/^taki-gozluk-saat\/mucevher-ve-degerli-tas/, "moda/aksesuar/saat-taki/taki"],

  [/^kozmetik\/makyaj-urunleri\/dudaklar/, "kozmetik/makyaj/dudak"],
  [/^kozmetik\/makyaj-urunleri\/yuz/, "kozmetik/makyaj/yuz"],
  [/^kozmetik\/makyaj-urunleri/, "kozmetik/makyaj"],
  [/^kozmetik\/cilt-bakimi\/yuz-bakimi\/nemlendiriciler/, "kozmetik/cilt-bakim/nemlendirici"],
  [/^kozmetik\/cilt-bakimi\/yuz-bakimi\/anti-aging\/kirisiklik-karsiti\/serumlar/, "kozmetik/cilt-bakim/serum"],
  [/^kozmetik\/cilt-bakimi\/yuz-bakimi\/anti-aging/, "kozmetik/cilt-bakim/serum"],
  [/^kozmetik\/cilt-bakimi\/yuz-bakimi\/maskeler/, "kozmetik/cilt-bakim/maske"],
  [/^kozmetik\/cilt-bakimi\/vucut-bakimi/, "kozmetik/cilt-bakim/vucut-bakimi"],
  [/^kozmetik\/cilt-bakimi\/goz-bakimi/, "kozmetik/cilt-bakim"],
  [/^kozmetik\/cilt-bakimi/, "kozmetik/cilt-bakim"],
  [/^kozmetik\/gunes-krem-ve-losyonlari/, "kozmetik/cilt-bakim/gunes-koruyucu"],
  [/^kozmetik\/kisisel-bakim\/hijyen\/sac-bakim-urunleri\/sac-kurutma-makineleri/, "kucuk-ev-aletleri/kisisel-bakim/sac-kurutma"],
  [/^kozmetik\/kisisel-bakim\/hijyen\/sac-bakim-urunleri\/sac-sekillendirme-cihazlari/, "kucuk-ev-aletleri/kisisel-bakim/sac-kurutma"],
  [/^kozmetik\/kisisel-bakim\/hijyen\/dus-banyo/, "kozmetik/kisisel-bakim/hijyen/dus-banyo"],
  [/^kozmetik\/kisisel-bakim\/hijyen\/epilasyon-agda/, "kozmetik/kisisel-bakim/hijyen/kil-giderme-epilasyon"],
  [/^kozmetik\/parfum\/erkek-parfum/, "kozmetik/parfum/erkek"],
  [/^kozmetik\/parfum\/kadin-parfum/, "kozmetik/parfum/kadin"],

  [/^ev-dekorasyon\/aydinlatma/, "ev-yasam/aydinlatma"],
  [/^ev-dekorasyon\/mobilya/, "ev-yasam/mobilya"],
  [/^yapi-market-bahce\/aydinlatma\/ampuller/, "ev-yasam/aydinlatma"],
  [/^yapi-market-bahce\/aydinlatma/, "ev-yasam/aydinlatma"],
  [/^yapi-market-bahce\/havuz-urunleri\/havuz-aydinlatma/, "ev-yasam/aydinlatma"],
  [/^yapi-market-bahce\/elektrik-ve-tesisat-malzemeleri/, "yapi-market/elektrik"],
  [/^yapi-market-bahce\/banyo-ve-mutfak-vitrifiye/, "yapi-market"],
  [/^yapi-market-bahce\/elektrikli-el-aletleri/, "yapi-market/elektrikli-aletler"],
  [/^yapi-market-bahce\/boya-ve-boya-malzemeleri/, "yapi-market/boya"],
  [/^yapi-market-bahce\/guvenlik-urunleri/, "yapi-market"],
  [/^otomobil-motosiklet\/oto-aksesuar\/oto-aydinlatma-urunleri/, "otomotiv/arac-aksesuar/dis-aksesuar"],
  [/^otomobil-motosiklet\/oto-aksesuar\/oto-dis-aksesuar\/cam-aksesuarlari/, "otomotiv/arac-aksesuar/dis-aksesuar"],
  [/^otomobil-motosiklet\/oto-aksesuar\/oto-ic-aksesuar\/telefon-ve-tablet-aksesuarlari/, "elektronik/telefon/aksesuar"],
  [/^otomobil-motosiklet\/yedek-parcalar/, "otomotiv/oto-yedek-parca"],
  [/^otomobil-motosiklet\/oto-ses-ve-goruntu-sistemleri/, "otomotiv/arac-elektronigi"],

  [/^supermarket\/deterjan-temizlik-urunleri\/bulasik-deterjanlari/, "ev-yasam/temizlik/bulasik"],
  [/^supermarket\/deterjan-temizlik-urunleri/, "ev-yasam/temizlik"],
  [/^kitap\//, "hobi-eglence/kitap-kirtasiye/kitap"],
  [/^ofis-kirtasiye\//, "hobi-eglence/kitap-kirtasiye/kirtasiye"],
  [/^hobi-oyuncak$/, "hobi-eglence"],
  [/^pet-shop\/kedi\/kedi-oyuncaklari/, "pet-shop/aksesuar"],
  [/^pet-shop\/kopek\/kopek-oyuncaklari/, "pet-shop/aksesuar"],
  [/^anne-bebek\/oto-koltugu-ana-kucagi/, "anne-bebek/bebek-tasima/oto-koltugu"],
  [/^anne-bebek\/bebek-giyim/, "moda/cocuk-moda/giyim/bebek-giyim"],
];

const TITLE_TARGETS = [
  {
    targetSlug: "elektronik/giyilebilir/akilli-saat",
    test: (text) => /\bakilli saat\b|\bsmart watch\b|\bsmartwatch\b/.test(text),
  },
  {
    targetSlug: "elektronik/telefon/ekran-koruyucu",
    test: isPhoneScreenProtectorText,
  },
  {
    targetSlug: "elektronik/telefon/kilif",
    test: isPhoneCaseText,
  },
  {
    targetSlug: "kucuk-ev-aletleri/mutfak/su-isiticisi",
    test: (text) => /\bkettle\b|\bsu isitici\b|\bsu isiticisi\b/.test(text),
  },
  {
    targetSlug: "spor-outdoor/fitness/yoga-pilates/yoga-mati",
    test: (text) => /\byoga mati\b|\byoga mat\b/.test(text),
  },
  {
    targetSlug: "spor-outdoor/fitness/yoga-pilates/pilates-mati",
    test: (text) => /\bpilates mati\b|\bpilates mat\b/.test(text),
  },
  {
    targetSlug: "spor-outdoor/fitness/yoga-pilates/pilates-topu",
    test: (text) => /\bpilates topu\b/.test(text),
  },
];

let categories = await fetchAllCategories();
let bySlug = new Map(categories.map((category) => [category.slug, category]));
let byId = new Map(categories.map((category) => [category.id, category]));

console.log(`Marketplace category canonical repair | mode=${apply ? "APPLY" : "DRY_RUN"}`);

await repairFoodHierarchy();

for (const [fromSlug, toSlug, parentSlug] of CATEGORY_BRANCH_MOVES) {
  await moveCategoryPrefix(fromSlug, toSlug, parentSlug);
}

for (const [slug, definition] of Object.entries(CATEGORY_DEFINITIONS)) {
  await ensureCategory(slug, definition.name, definition.parentSlug, definition.isLeaf ?? true);
}

await refreshCategoryMaps();

const products = await fetchAllProducts();
const plannedMoves = [];

for (const product of products) {
  const current = product.category_id ? byId.get(product.category_id) : null;
  const targetSlug = resolveTargetSlug(product, current);
  if (!targetSlug || current?.slug === targetSlug) continue;

  const target = bySlug.get(targetSlug);
  if (!target) {
    console.warn(`missing target category ${targetSlug} for ${product.slug}`);
    continue;
  }

  plannedMoves.push({
    id: product.id,
    title: product.title,
    slug: product.slug,
    from: current?.slug ?? "(none)",
    to: target.slug,
    targetId: target.id,
  });
}

const grouped = new Map();
for (const move of plannedMoves) {
  const key = `${move.from} -> ${move.to}`;
  grouped.set(key, (grouped.get(key) ?? 0) + 1);
}

console.log("\n=== Planned moves ===");
console.log(`Total planned product moves: ${plannedMoves.length}`);
for (const [transition, count] of [...grouped.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`${String(count).padStart(4)}  ${transition}`);
}

console.log("\n=== Samples ===");
for (const move of plannedMoves.slice(0, 30)) {
  console.log(`${move.title} | ${move.from} -> ${move.to}`);
}

if (apply) {
  let moved = 0;
  for (const chunk of chunkArray(plannedMoves, 100)) {
    const movesByTarget = new Map();
    for (const move of chunk) {
      const ids = movesByTarget.get(move.targetId) ?? [];
      ids.push(move.id);
      movesByTarget.set(move.targetId, ids);
    }

    for (const [targetId, ids] of movesByTarget) {
      const { error } = await sb
        .from("products")
        .update({ category_id: targetId })
        .in("id", ids);
      if (error) {
        console.warn(`product move failed target=${targetId}: ${error.message}`);
        continue;
      }
      moved += ids.length;
    }
  }

  await repairLeafFlags();
  console.log(`\nMoved products: ${moved}`);
} else {
  console.log("\nDry-run only. Add APPLY=1 to update products/categories.");
}

function resolveTargetSlug(product, currentCategory) {
  const titleText = normalize(product.title);
  const sourceText = normalize(
    [
      product.specs?.pttavm_category,
      product.specs?.pttavm_path,
      product.title,
    ]
      .filter(Boolean)
      .join(" "),
  );

  for (const rule of TITLE_TARGETS) {
    if (rule.test(titleText)) return rule.targetSlug;
  }

  if (currentCategory?.slug === "elektronik/telefon/akilli-telefon" && isPhoneCameraAccessoryText(titleText)) {
    return "elektronik/telefon/aksesuar";
  }

  if (/\bpilates mati\b|\bpilates mat\b/.test(sourceText)) {
    return "spor-outdoor/fitness/yoga-pilates/pilates-mati";
  }

  if (!currentCategory) return null;
  const exactTarget = LEGACY_CATEGORY_TARGETS[currentCategory.slug];
  if (exactTarget) return exactTarget;

  for (const [pattern, targetSlug] of PRODUCT_CATEGORY_TARGET_RULES) {
    if (pattern.test(currentCategory.slug)) return targetSlug;
  }

  return null;
}

async function refreshCategoryMaps() {
  if (!apply) {
    bySlug = new Map(categories.map((category) => [category.slug, category]));
    byId = new Map(categories.map((category) => [category.id, category]));
    return;
  }
  categories = await fetchAllCategories();
  bySlug = new Map(categories.map((category) => [category.slug, category]));
  byId = new Map(categories.map((category) => [category.id, category]));
}

async function repairFoodHierarchy() {
  const [foodSeedMove, ...branchMoves] = FOOD_BRANCH_MOVES;
  if (foodSeedMove) {
    await moveCategoryPrefix(foodSeedMove[0], foodSeedMove[1], foodSeedMove[2]);
  }

  await ensureCategory(FOOD_GROUP_SLUG, "Gıda & İçecek", "supermarket", false);
  await refreshCategoryMaps();

  for (const [fromSlug, toSlug, parentSlug] of branchMoves) {
    await moveCategoryPrefix(fromSlug, toSlug, parentSlug);
  }
}

async function moveCategoryPrefix(fromSlug, toSlug, newParentSlug) {
  if (fromSlug === toSlug) return;
  const matches = categories
    .filter((category) => category.slug === fromSlug || category.slug.startsWith(`${fromSlug}/`))
    .sort((left, right) => left.slug.length - right.slug.length);

  if (matches.length === 0) return;

  const root = matches.find((category) => category.slug === fromSlug);
  const parent = newParentSlug ? bySlug.get(newParentSlug) : null;
  if (newParentSlug && !parent) {
    console.warn(`cannot move ${fromSlug}: parent not found ${newParentSlug}`);
    return;
  }

  console.log(`move category branch: ${fromSlug} -> ${toSlug} (${matches.length} rows)`);

  for (const category of matches) {
    const nextSlug = `${toSlug}${category.slug.slice(fromSlug.length)}`;
    if (nextSlug === category.slug) continue;

    const collision = bySlug.get(nextSlug);
    if (collision && collision.id !== category.id) {
      console.warn(`slug collision, skip ${category.slug} -> ${nextSlug}`);
      continue;
    }

    const patch = {
      slug: nextSlug,
      ...(root?.id === category.id && parent ? { parent_id: parent.id } : {}),
      ...(root?.id === category.id && nextSlug === FOOD_GROUP_SLUG
        ? { name: "Gıda & İçecek", is_leaf: false, is_active: true }
        : {}),
    };

    if (apply) {
      const { error } = await sb.from("categories").update(patch).eq("id", category.id);
      if (error) {
        console.warn(`category move failed ${category.slug} -> ${nextSlug}: ${error.message}`);
        continue;
      }
    }

    bySlug.delete(category.slug);
    Object.assign(category, patch);
    bySlug.set(category.slug, category);
    byId.set(category.id, category);
  }

  await refreshCategoryMaps();
}

async function ensureCategory(slug, name, parentSlug, isLeaf = true) {
  const parent = bySlug.get(parentSlug);
  if (!parent) throw new Error(`parent category not found: ${parentSlug}`);

  const existing = bySlug.get(slug);
  if (existing) {
    if (
      existing.parent_id === parent.id &&
      existing.is_leaf === isLeaf &&
      existing.name === name &&
      existing.is_active === true
    ) {
      return existing;
    }

    console.log(`repair category shape: ${slug}`);
    const patch = { parent_id: parent.id, name, is_leaf: isLeaf, is_active: true };
    if (apply) {
      const { error } = await sb
        .from("categories")
        .update(patch)
        .eq("id", existing.id);
      if (error) throw new Error(`category repair failed ${slug}: ${error.message}`);
    }
    Object.assign(existing, patch);
    bySlug.set(existing.slug, existing);
    byId.set(existing.id, existing);
    return existing;
  }

  console.log(`create category: ${slug}`);
  if (!apply) {
    const synthetic = {
      id: `dry-run:${slug}`,
      slug,
      name,
      parent_id: parent.id,
      is_leaf: isLeaf,
      is_active: true,
    };
    categories.push(synthetic);
    bySlug.set(slug, synthetic);
    byId.set(synthetic.id, synthetic);
    return synthetic;
  }

  await sb.from("categories").update({ is_leaf: false }).eq("id", parent.id);
  const { data, error } = await sb
    .from("categories")
    .insert({
      slug,
      name,
      parent_id: parent.id,
      is_leaf: isLeaf,
      is_active: true,
    })
        .select("id, slug, name, parent_id, is_leaf, is_active")
    .single();

  if (error || !data) throw new Error(`category create failed ${slug}: ${error?.message}`);
  bySlug.set(data.slug, data);
  byId.set(data.id, data);
  return data;
}

async function repairLeafFlags() {
  const fresh = await fetchAllCategories();
  const childCounts = new Map();
  for (const category of fresh) {
    if (!category.parent_id) continue;
    childCounts.set(category.parent_id, (childCounts.get(category.parent_id) ?? 0) + 1);
  }

  for (const category of fresh) {
    const isLeaf = !childCounts.has(category.id);
    if (category.is_leaf === isLeaf) continue;
    const { error } = await sb
      .from("categories")
      .update({ is_leaf: isLeaf })
      .eq("id", category.id);
    if (error) console.warn(`leaf flag repair failed ${category.slug}: ${error.message}`);
  }
}

async function fetchAllCategories() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from("categories")
      .select("id, slug, name, parent_id, is_leaf, is_active")
      .order("id", { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(`category fetch failed: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

async function fetchAllProducts() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from("products")
      .select("id, slug, title, category_id, specs, is_active")
      .eq("is_active", true)
      .order("id", { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(`product fetch failed: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\u0131/g, "i")
    .replace(/[^a-z0-9\s/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasPhoneTarget(text) {
  return /\biphone\b|\bgalaxy\b|\bsamsung\b|\bxiaomi\b|\bredmi\b|\bpoco\b|\bhuawei\b|\bhonor\b|\boppo\b|\brealme\b|\boneplus\b|\bvivo\b|\btecno\b|\binfinix\b|\bnokia\b|\bomix\b|\breeder\b|\btcl\b|\btelefon\b/.test(
    text,
  );
}

function hasNonPhoneTarget(text) {
  return /\bipad\b|\btablet\b|\btab\b|\bwatch\b|\btv\b|\btelevizyon\b|\bkamera\b|\bcanon\b|\bnikon\b|\bsony\b|\bgopro\b|\bairpods\b/.test(
    text,
  );
}

function hasNonPhoneAccessoryTarget(text) {
  return /\bipad\b|\btablet\b|\btab\b|\bwatch\b|\btv\b|\btelevizyon\b|\bcanon\b|\bnikon\b|\bsony\b|\bgopro\b|\bairpods\b/.test(
    text,
  );
}

function isPhoneScreenProtectorText(text) {
  const hasScreenProtector =
    /\bekran koruyucu\b|\bkirilmaz cam\b|\bhayalet ekran\b|\btemperli cam\b|\bnano glass\b|\bantistatik cam\b|\bseramik nano\b/.test(
      text,
    );
  if (!hasScreenProtector) return false;
  if (hasNonPhoneTarget(text)) return false;

  return hasPhoneTarget(text);
}

function isPhoneCaseText(text) {
  if (!hasPhoneTarget(text) || hasNonPhoneTarget(text)) return false;
  return /\bkilif\b|\bkapak\b|\bairbag\b|\bcuzdanli\b|\bderi kilif\b/.test(text);
}

function isPhoneCameraAccessoryText(text) {
  if (!hasPhoneTarget(text) || hasNonPhoneAccessoryTarget(text)) return false;
  return /\bkamera lens\b|\bkamera lensi\b|\blens koruyucu\b|\blens koruma\b|\blensli\b|\blens yuzuklu\b|\bkamera koruma\b|\bkamera koruyucu\b|\bkamera cam\b|\bkamera standli\b|\bmagsafe\b.*\bstand\b|\bstand\b.*\bmagsafe\b/.test(
    text,
  );
}

function chunkArray(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}
