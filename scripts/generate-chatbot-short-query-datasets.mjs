import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const allDir = path.join(root, "tests", "chatbot", "fixtures", "generated", "all");
const styleDir = path.join(root, "tests", "chatbot", "fixtures", "generated", "style");

fs.mkdirSync(allDir, { recursive: true });
fs.mkdirSync(styleDir, { recursive: true });

const verticals = [
  {
    key: "telefon",
    category_slug: "akilli-telefon",
    category_path: "elektronik/telefon/akilli-telefon",
    open_term: "telefon",
    brands: ["Samsung", "Apple", "Xiaomi", "Honor"],
    colors: ["kirmizi", "mavi", "siyah", "beyaz"],
    accessories: ["kilif", "kapak", "kulaklik", "sarj"],
    typo_queries: ["iphnoe 15 pro", "samsng telefon", "akili telefon", "redmi not 14"],
    sort_queries: ["en populer", "en ucuz", "stokta olanlar"],
    specific_products: ["iphone 15 pro", "samsung galaxy s25", "redmi note 14", "honor 200 pro"],
  },
  {
    key: "kozmetik",
    category_slug: "parfum",
    category_path: "kozmetik-bakim/parfum",
    open_term: "parfum",
    brands: ["Bargello", "Vichy", "Bioderma", "Flormar"],
    colors: ["mavi", "pembe", "siyah", "beyaz"],
    accessories: ["deodorant", "vucut spreyi", "travel size", "tester"],
    typo_queries: ["parfumm", "deodrant", "lavanta parfumm", "vicy serum"],
    sort_queries: ["en populer", "en uygun", "yorum puani yuksek"],
    specific_products: ["lavanta parfum", "niasinamid serum", "erkek parfum", "gunes kremi"],
  },
  {
    key: "beyaz_esya",
    category_slug: "buzdolabi",
    category_path: "beyaz-esya/buzdolabi",
    open_term: "buzdolabi",
    brands: ["Samsung", "Beko", "Bosch", "Arcelik"],
    colors: ["gri", "siyah", "beyaz", "inox"],
    accessories: ["koku giderici", "raf", "filtre", "kurulum"],
    typo_queries: ["buzdolbi", "camasir makinasi", "klma", "bulasik maknesi"],
    sort_queries: ["en populer", "en dusuk fiyat", "stokta olanlar"],
    specific_products: ["camasir makinesi", "bulasik makinesi", "klima", "kurutma makinesi"],
  },
  {
    key: "moda",
    category_slug: "kadin-sneaker-spor-ayakkabi",
    category_path: "moda/kadin-sneaker-spor-ayakkabi",
    open_term: "ayakkabi",
    brands: ["Nike", "Adidas", "Mavi", "Skechers"],
    colors: ["siyah", "beyaz", "bej", "pembe"],
    accessories: ["corap", "canta", "kemer", "sapka"],
    typo_queries: ["ayakabi", "snekr", "erkek tisrt", "kadin montt"],
    sort_queries: ["en populer", "en uygun", "yuksek puan"],
    specific_products: ["erkek tisort", "kadin mont", "sneaker", "elbise"],
  },
];

let nextScenarioId = 30001;
let nextStyleId = 40001;
const scenarios = [];
const styleExamples = [];

function pushScenario(scenario) {
  scenarios.push({ ...scenario, id: nextScenarioId++ });
}

function pushStyle(example) {
  styleExamples.push({ ...example, id: nextStyleId++ });
}

for (const vertical of verticals) {
  vertical.brands.forEach((brand, index) => {
    const color = vertical.colors[index % vertical.colors.length];
    const accessory = vertical.accessories[index % vertical.accessories.length];
    const sortQuery = vertical.sort_queries[index % vertical.sort_queries.length];
    const typoQuery = vertical.typo_queries[index % vertical.typo_queries.length];
    const specific = vertical.specific_products[index % vertical.specific_products.length];

    pushScenario({
      scenario_key: `${vertical.key}-short-refine-${nextScenarioId}`,
      vertical: vertical.key,
      test_bucket: "daraltma",
      category_slug: vertical.category_slug,
      category_path: vertical.category_path,
      turn_count: 5,
      turns: [
        { role: "user", msg: vertical.open_term, intent_label: "new_search" },
        {
          role: "bot",
          msg: "Kategoriyi anladim ve genel sonuclari aciyorum.",
          expected_intent_label: "new_search",
          expected_state: {
            category_slug: vertical.category_slug,
            brand_filter: [],
            variant_color_patterns: [],
            variant_storage_patterns: [],
            price_min: null,
            price_max: null,
          },
          expected_action: "merge_with_new_dims",
        },
        { role: "user", msg: brand.toLowerCase(), intent_label: "refine" },
        {
          role: "bot",
          msg: "Ayni kategoride markayi daralttim.",
          expected_intent_label: "refine",
          expected_state: {
            category_slug: vertical.category_slug,
            brand_filter: [brand],
            variant_color_patterns: [],
            variant_storage_patterns: [],
            price_min: null,
            price_max: null,
          },
          expected_action: "merge_with_new_dims",
        },
        { role: "user", msg: color, intent_label: "refine" },
        {
          role: "bot",
          msg: "Tek kelimelik rengi mevcut kategoride yorumlayip daralttim.",
          expected_intent_label: "refine",
          expected_state: {
            category_slug: vertical.category_slug,
            brand_filter: [brand],
            variant_color_patterns: [color],
            variant_storage_patterns: [],
            price_min: null,
            price_max: null,
          },
          expected_action: "merge_with_new_dims",
        },
        { role: "user", msg: sortQuery, intent_label: "sort_only" },
        {
          role: "bot",
          msg: "Kategori ve filtreleri koruyup sadece siralamayi degistiriyorum.",
          expected_intent_label: "sort_only",
          expected_state: {
            category_slug: vertical.category_slug,
            brand_filter: [brand],
            variant_color_patterns: [color],
            variant_storage_patterns: [],
            price_min: null,
            price_max: null,
          },
          expected_sort_mode: sortQuery,
          expected_action: "best_value_sort_applied",
        },
      ],
    });

    pushScenario({
      scenario_key: `${vertical.key}-short-broaden-${nextScenarioId}`,
      vertical: vertical.key,
      test_bucket: "genisletme",
      category_slug: vertical.category_slug,
      category_path: vertical.category_path,
      turn_count: 4,
      turns: [
        { role: "user", msg: `${brand.toLowerCase()} ${vertical.open_term}`, intent_label: "new_search" },
        {
          role: "bot",
          msg: "Marka ve kategoriyi birlikte aciyorum.",
          expected_intent_label: "new_search",
          expected_state: {
            category_slug: vertical.category_slug,
            brand_filter: [brand],
            variant_color_patterns: [],
            variant_storage_patterns: [],
            price_min: null,
            price_max: null,
          },
          expected_action: "merge_with_new_dims",
        },
        { role: "user", msg: vertical.open_term, intent_label: "broaden" },
        {
          role: "bot",
          msg: "Tek kelimelik kategori mesaji geldiginde markayi birakip genel gorunume donuyorum.",
          expected_intent_label: "broaden",
          expected_state: {
            category_slug: vertical.category_slug,
            brand_filter: [],
            variant_color_patterns: [],
            variant_storage_patterns: [],
            price_min: null,
            price_max: null,
          },
          expected_action: "single_word_widen",
        },
        { role: "user", msg: sortQuery, intent_label: "sort_only" },
        {
          role: "bot",
          msg: "Genislettikten sonra ayni kategoride sadece siralamayi degistiriyorum.",
          expected_intent_label: "sort_only",
          expected_state: {
            category_slug: vertical.category_slug,
            brand_filter: [],
            variant_color_patterns: [],
            variant_storage_patterns: [],
            price_min: null,
            price_max: null,
          },
          expected_sort_mode: sortQuery,
          expected_action: "best_value_sort_applied",
        },
      ],
    });

    pushScenario({
      scenario_key: `${vertical.key}-typo-accessory-${nextScenarioId}`,
      vertical: vertical.key,
      test_bucket: "accessory_followup",
      category_slug: vertical.category_slug,
      category_path: vertical.category_path,
      turn_count: 4,
      turns: [
        { role: "user", msg: typoQuery, intent_label: "new_search" },
        {
          role: "bot",
          msg: "Yazim hatasina ragmen dogru urun niyetini anlayip sonucu aciyorum.",
          expected_intent_label: "new_search",
          expected_state: {
            category_slug: vertical.category_slug,
            brand_filter: [],
            variant_color_patterns: [],
            variant_storage_patterns: [],
            price_min: null,
            price_max: null,
          },
          expected_action: "merge_with_new_dims",
        },
        { role: "user", msg: accessory, intent_label: "accessory_followup" },
        {
          role: "bot",
          msg: "Kisa aksesuar mesajini ayni urun ailesi icinde yorumluyorum.",
          expected_intent_label: "accessory_followup",
          expected_state: {
            category_slug: vertical.category_slug,
            brand_filter: [],
            variant_color_patterns: [],
            variant_storage_patterns: [],
            price_min: null,
            price_max: null,
          },
          expected_spec_filters: { accessory },
          expected_action: "merge_with_new_dims",
        },
        { role: "user", msg: vertical.open_term, intent_label: "broaden" },
        {
          role: "bot",
          msg: "Aksesuar aramasindan tekrar ana kategoriye donuyorum.",
          expected_intent_label: "broaden",
          expected_state: {
            category_slug: vertical.category_slug,
            brand_filter: [],
            variant_color_patterns: [],
            variant_storage_patterns: [],
            price_min: null,
            price_max: null,
          },
          expected_action: "single_word_widen",
        },
      ],
    });

    pushScenario({
      scenario_key: `${vertical.key}-bad-path-short-${nextScenarioId}`,
      vertical: vertical.key,
      test_bucket: "bad_path_avoidance",
      category_slug: vertical.category_slug,
      category_path: vertical.category_path,
      turn_count: 4,
      turns: [
        { role: "user", msg: specific, intent_label: "new_search" },
        {
          role: "bot",
          msg: "Spesifik urunu aciyorum.",
          expected_intent_label: "new_search",
          expected_state: {
            category_slug: vertical.category_slug,
            brand_filter: brand === "Apple" ? ["Apple"] : [],
            variant_color_patterns: [],
            variant_storage_patterns: [],
            price_min: null,
            price_max: null,
          },
          expected_action: "merge_with_new_dims",
        },
        { role: "user", msg: color, intent_label: "refine" },
        {
          role: "bot",
          msg: "Tek kelimelik rengi ayni kategoride yorumluyorum, alakasiz kategoriye kaymiyorum.",
          expected_intent_label: "refine",
          expected_state: {
            category_slug: vertical.category_slug,
            brand_filter: brand === "Apple" ? ["Apple"] : [],
            variant_color_patterns: [color],
            variant_storage_patterns: [],
            price_min: null,
            price_max: null,
          },
          expected_action: "merge_with_new_dims",
        },
        { role: "user", msg: brand.toLowerCase(), intent_label: "refine" },
        {
          role: "bot",
          msg: "Markayi mevcut kategori baglaminda birlestiriyorum.",
          expected_intent_label: "refine",
          expected_state: {
            category_slug: vertical.category_slug,
            brand_filter: [brand],
            variant_color_patterns: [color],
            variant_storage_patterns: [],
            price_min: null,
            price_max: null,
          },
          expected_action: "merge_with_new_dims",
        },
      ],
    });
  });

  pushStyle({
    vertical: vertical.key,
    style_bucket: "clarify",
    category_slug: vertical.category_slug,
    user_message: vertical.open_term,
    response_rule:
      "Tek kelimelik kategori sorgusunda gereksiz uzun anlatma. Kullaniciyi bogmadan sonucu actigini ve isterse daraltabilecegini soyle.",
    assistant_reply: `${vertical.open_term} tarafinda uygun urunleri actim. Istersen marka, butce veya ozellik soyleyip hemen daraltabiliriz.`,
  });

  pushStyle({
    vertical: vertical.key,
    style_bucket: "product_list",
    category_slug: vertical.category_slug,
    user_message: `${vertical.brands[0].toLowerCase()} ${vertical.open_term}`,
    response_rule:
      "Iki kelimelik marka+kategori sorgusunda kisa ve net ol. Urunleri grid'e birak, metni tek cümlede tut.",
    assistant_reply: `${vertical.brands[0]} tarafindaki en uygun ${vertical.open_term} seceneklerini actim. Istersen renk, fiyat ya da performansa gore hemen daraltayim.`,
  });

  pushStyle({
    vertical: vertical.key,
    style_bucket: "accessory",
    category_slug: vertical.category_slug,
    user_message: vertical.accessories[0],
    response_rule:
      "Kisa aksesuar follow-up mesajinda onceki baglamda kaldigini hissettir. Yeni kategoriye sicrama, uyumlu urunleri gosterdigini soyle.",
    assistant_reply: `Bunu mevcut urun baglaminda aksesuar olarak yorumladim. Uyumlu ${vertical.accessories[0]} seceneklerini aciyorum.`,
  });

  pushStyle({
    vertical: vertical.key,
    style_bucket: "product_list",
    category_slug: vertical.category_slug,
    user_message: vertical.typo_queries[0],
    response_rule:
      "Yazim hatali sorguda kullaniciyi duzeltme diye azarlama. Dogru niyeti anlayip akici sekilde sonuclari actigini soyle.",
    assistant_reply: `Aradigin urunu dogru sekilde yorumladim ve uygun sonuclari actim. Istersen renk, fiyat veya marka tarafinda biraz daha netlestirebiliriz.`,
  });

  pushStyle({
    vertical: vertical.key,
    style_bucket: "broad_recommendation",
    category_slug: vertical.category_slug,
    user_message: "tavsiye ver",
    response_rule:
      "Kisa tavsiye isteginde kullaniciyi sistemde urun yok diyerek kesme. Mevcut kategoride ekonomik, dengeli veya premiuma yonlendirecek sicak bir cümle kur.",
    assistant_reply: `Bu kategoride farkli butcelere gore iyi alternatifleri aciyorum. Istersen ekonomik, dengeli ya da premium seceneklere birlikte bakalim.`,
  });

  pushStyle({
    vertical: vertical.key,
    style_bucket: "product_list",
    category_slug: vertical.category_slug,
    user_message: vertical.colors[0],
    response_rule:
      "Tek kelimelik renk mesajinda onceki baglamin korundugu hissini ver. Kullaniciya alakasiz bir alan sormadan direkt daralttigini anlat.",
    assistant_reply: `Bu rengi mevcut arama baglaminda yorumlayip sonuclari daralttim. Istersen simdi marka ya da fiyat tarafinda da biraz daha netlestirebiliriz.`,
  });
}

const intentPath = path.join(allDir, `chatbot_dialogs_intent_short_queries_${scenarios.length}.jsonl`);
const stylePath = path.join(styleDir, `chatbot_response_style_short_queries_${styleExamples.length}.jsonl`);
const manifestPath = path.join(root, "tests", "chatbot", "fixtures", "generated", "short-query-manifest.json");

fs.writeFileSync(intentPath, scenarios.map((row) => JSON.stringify(row)).join("\n") + "\n");
fs.writeFileSync(stylePath, styleExamples.map((row) => JSON.stringify(row)).join("\n") + "\n");
fs.writeFileSync(
  manifestPath,
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      intent_file: path.relative(root, intentPath),
      style_file: path.relative(root, stylePath),
      intent_count: scenarios.length,
      style_count: styleExamples.length,
    },
    null,
    2
  ) + "\n"
);

console.log(
  JSON.stringify(
    {
      intent_count: scenarios.length,
      style_count: styleExamples.length,
      intent_file: path.relative(root, intentPath),
      style_file: path.relative(root, stylePath),
    },
    null,
    2
  )
);
