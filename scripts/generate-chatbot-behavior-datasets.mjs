#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = "C:\\projeler\\birtavsiye";
const OUT_DIR = path.join(ROOT, "tests", "chatbot", "fixtures", "generated");
const ALL_DIR = path.join(OUT_DIR, "all");
const BEHAVIOR_DIR = path.join(OUT_DIR, "behaviors");
const STYLE_DIR = path.join(OUT_DIR, "style");

const verticals = [
  {
    key: "telefon",
    categoryPath: "elektronik/telefon/akilli-telefon",
    families: [
      {
        slug: "akilli-telefon",
        root: "telefon bakiyorum",
        brands: ["Apple", "Samsung", "Xiaomi", "Honor", "vivo"],
        families: ["iPhone 16 Pro", "Galaxy S25", "Xiaomi 14T", "Honor 200 Pro", "vivo V50"],
        accessories: ["kilif", "kapak", "sarj aleti", "kulaklik", "ekran koruyucu"],
        compareTargets: ["kamera", "pil", "oyun performansi", "fiyat performans", "ekran kalitesi"],
        sortModes: ["en populer", "en ucuz", "stokta olanlar", "magaza sayisi fazla olanlar", "en yeni modeller"],
      },
    ],
  },
  {
    key: "kozmetik",
    categoryPath: "kozmetik",
    families: [
      {
        slug: "parfum",
        root: "parfum bakiyorum",
        brands: ["Bargello", "Versace", "Yves Saint Laurent", "Zara", "Mad"],
        families: ["lavanta parfum", "temiz kokulu parfum", "erkek parfum", "unisex parfum", "yaz parfumu"],
        accessories: ["deodorant", "vucut spreyi", "travel boy sise", "hediye seti", "roll-on"],
        compareTargets: ["kalicilik", "yayinim", "tatli koku", "ferah koku", "gunluk kullanim"],
        sortModes: ["en populer", "en uygun fiyatli", "en cok yorum alan", "indirimde olanlar", "stokta olanlar"],
      },
      {
        slug: "serum-ampul",
        root: "serum ariyorum",
        brands: ["The Ordinary", "The Purest Solutions", "La Roche-Posay", "Vichy", "Celenes"],
        families: ["niasinamid serum", "hyaluronik serum", "cilt serumu", "lekeli cilt serumu", "hassas cilt serumu"],
        accessories: ["nemlendirici", "temizleyici", "gunes kremi", "goz serumu", "tonik"],
        compareTargets: ["yagli cilt", "hassas cilt", "bariyer onarim", "gozenek gorunumu", "leke bakimi"],
        sortModes: ["en populer", "fiyat performans", "en cok yorum alan", "stokta olanlar", "indirime girenler"],
      },
    ],
  },
  {
    key: "beyaz_esya",
    categoryPath: "beyaz-esya",
    families: [
      {
        slug: "camasir-makinesi",
        root: "camasir makinesi bakiyorum",
        brands: ["Bosch", "Samsung", "LG", "Beko", "Siemens"],
        families: ["9 kg camasir makinesi", "kurutmali camasir makinesi", "sessiz camasir makinesi", "ince derinlikli camasir makinesi", "enerji tasarruflu camasir makinesi"],
        accessories: ["deterjan", "kurutma topu", "makine altligi", "kirec onleyici", "camasir filesi"],
        compareTargets: ["sessizlik", "enerji tuketimi", "kapasite", "program sayisi", "servis kalitesi"],
        sortModes: ["en dusuk fiyat", "en cok yorum alan", "kurulum puani iyi olanlar", "stokta olanlar", "cok magazali olanlar"],
      },
      {
        slug: "buzdolabi",
        root: "buzdolabi ariyorum",
        brands: ["Bosch", "Samsung", "Arcelik", "Beko", "Vestel"],
        families: ["no frost buzdolabi", "genis hacimli buzdolabi", "mini buzdolabi", "alt donduruculu buzdolabi", "gardrop tipi buzdolabi"],
        accessories: ["raf duzenleyici", "koku giderici", "su filtresi", "yumurtalik", "sebzelik duzenleyici"],
        compareTargets: ["hacim", "ses", "enerji", "ic duzen", "sogutma performansi"],
        sortModes: ["en dusuk fiyat", "fiyat performans", "en cok yorum alan", "stokta olanlar", "magaza sayisi fazla olanlar"],
      },
    ],
  },
  {
    key: "moda",
    categoryPath: "moda",
    families: [
      {
        slug: "erkek-giyim-ust",
        root: "erkek tisort bakiyorum",
        brands: ["Nike", "Adidas", "Mavi", "Koton", "Defacto"],
        families: ["erkek tisort", "erkek gomlek", "erkek sweatshirt", "erkek polo", "erkek basic tisort"],
        accessories: ["sneaker", "kemer", "sapka", "ceket", "corap"],
        compareTargets: ["kumas kalitesi", "kalip", "gunluk kullanim", "ofis uyumu", "renk secenekleri"],
        sortModes: ["en populer", "indirimde olanlar", "uygun fiyatlilar", "stokta olanlar", "en cok yorum alanlar"],
      },
      {
        slug: "kadin-ayakkabi-topuklu",
        root: "topuklu ayakkabi bakiyorum",
        brands: ["Nine West", "Aldo", "Derimod", "Bambi", "Zara"],
        families: ["dugun ayakkabisi", "kalin topuklu", "nude topuklu", "siyah topuklu", "rahat topuklu"],
        accessories: ["clutch canta", "taban pedi", "elbise", "takı", "bakim spreyi"],
        compareTargets: ["konfor", "topuk boyu", "gunluk kullanilabilirlik", "ozel gun uyumu", "malzeme kalitesi"],
        sortModes: ["en populer", "uygun fiyatli", "indirimde olanlar", "stokta olanlar", "en cok yorum alanlar"],
      },
    ],
  },
];

const behaviorBuckets = [
  "switch_category",
  "sort_only",
  "accessory_followup",
  "comparison",
  "clarify",
  "bad_path_avoidance",
];

const styleBuckets = [
  "product_list",
  "comparison",
  "clarify",
  "no_results",
  "accessory",
  "broad_recommendation",
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function pick(arr, index, offset = 0) {
  return arr[(index + offset) % arr.length];
}

function state(slug) {
  return {
    category_slug: slug,
    brand_filter: [],
    variant_color_patterns: [],
    variant_storage_patterns: [],
    price_min: null,
    price_max: null,
  };
}

function userTurn(msg, intent) {
  return { role: "user", msg, intent_label: intent };
}

function botTurn(msg, intent, expectedState, options = {}) {
  return {
    role: "bot",
    msg,
    loading_placeholder: true,
    expected_intent_label: intent,
    expected_state: expectedState,
    expected_spec_filters: options.specFilters ?? {},
    expected_sort_mode: options.sortMode ?? null,
    expected_action: options.action ?? defaultAction(intent),
    expected_product_count_min: options.min ?? 0,
    expected_product_count_max: options.max ?? 24,
  };
}

function defaultAction(intent) {
  switch (intent) {
    case "sort_only":
      return "sort_only";
    case "reset":
      return "user_requested_reset";
    case "switch_category":
      return "switch_category";
    case "clarify":
      return "no_new_dims_keep";
    default:
      return "merge_with_new_dims";
  }
}

function buildBehaviorScenario(id, verticalKey, categoryPath, bucket, family, index) {
  const s = state(family.slug);
  const brandA = pick(family.brands, index);
  const brandB = pick(family.brands.filter((brand) => brand !== brandA), index + 1);
  const itemA = pick(family.families, index);
  const itemB = pick(family.families, index + 2);
  const accessory = pick(family.accessories, index);
  const compareTarget = pick(family.compareTargets, index);
  const sortMode = pick(family.sortModes, index);
  const altVertical = pick(verticals.filter((entry) => entry.key !== verticalKey), index);
  const altFamily = pick(altVertical.families, index);

  const turns = [];

  if (bucket === "switch_category") {
    s.brand_filter = [brandA];
    turns.push(userTurn(`${brandA} ${itemA} bakiyorum`, "new_search"));
    turns.push(botTurn(`${brandA} tarafinda uygun urunleri aciyorum.`, "new_search", { ...s }, { min: 2, max: 18 }));

    turns.push(userTurn(`tamam ama sonra ${compareTarget} da iyi olsun`, "refine"));
    turns.push(botTurn(`Ayni kategoride bunu dikkate alarak daraltiyorum.`, "refine", { ...s }, {
      specFilters: { focus: compareTarget },
      min: 1,
      max: 12,
    }));

    const nextState = state(altFamily.slug);
    turns.push(userTurn(`fikrim degisti, ${altFamily.root} tarafina gecelim`, "switch_category"));
    turns.push(botTurn(`Eski baglami birakip yeni kategoriye geciyorum.`, "switch_category", { ...nextState }, {
      action: "switch_category",
      min: 2,
      max: 20,
    }));

    nextState.brand_filter = [pick(altFamily.brands, index)];
    turns.push(userTurn(`${nextState.brand_filter[0]} olsun`, "refine"));
    turns.push(botTurn(`Yeni kategoride markaya gore daralttim.`, "refine", { ...nextState }, { min: 1, max: 14 }));

    turns.push(userTurn(`simdi ${pick(altFamily.accessories, index)} da var mi`, "accessory_followup"));
    turns.push(botTurn(`Yeni baglamdaki ilgili tamamlayici urunleri de aciyorum.`, "accessory_followup", { ...nextState }, {
      specFilters: { accessory: pick(altFamily.accessories, index) },
      min: 1,
      max: 12,
    }));
  } else if (bucket === "sort_only") {
    s.brand_filter = [brandA];
    turns.push(userTurn(`${brandA} ${itemA} bakiyorum`, "new_search"));
    turns.push(botTurn(`Kategori ve marka baglamini aciyorum.`, "new_search", { ...s }, { min: 2, max: 18 }));

    turns.push(userTurn(`biraz daha uygunlari gormek istiyorum`, "broaden"));
    turns.push(botTurn(`Ayni kategoride daha genis secenekleri aciyorum.`, "broaden", { ...s }, { min: 3, max: 20 }));

    turns.push(userTurn(sortMode, "sort_only"));
    turns.push(botTurn(`Filtreleri koruyup sadece siralamayi degistiriyorum.`, "sort_only", { ...s }, {
      sortMode,
      min: 3,
      max: 20,
    }));

    turns.push(userTurn(`tamam bunu bozma sadece bir de ${compareTarget} iyi olanlari one al`, "sort_only"));
    turns.push(botTurn(`Ayni baglamda farkli bir siralama sinyali uyguluyorum.`, "sort_only", { ...s }, {
      sortMode: `sort:${compareTarget}`,
      min: 3,
      max: 20,
    }));

    turns.push(userTurn(`yine kategori degismeden devam et`, "sort_only"));
    turns.push(botTurn(`Baglami sabit tutup sonucu koruyorum.`, "sort_only", { ...s }, {
      sortMode: `keep_context:${compareTarget}`,
      min: 3,
      max: 20,
    }));
  } else if (bucket === "accessory_followup") {
    s.brand_filter = [brandA];
    turns.push(userTurn(`${brandA} ${itemA} istiyorum`, "new_search"));
    turns.push(botTurn(`Ana urunu aciyorum.`, "new_search", { ...s }, { min: 1, max: 14 }));

    turns.push(userTurn(`renk fark etmez`, "broaden"));
    turns.push(botTurn(`Ana urunde renk kisitini kaldiriyorum.`, "broaden", { ...s }, { min: 1, max: 18 }));

    turns.push(userTurn(`${accessory} var mi`, "accessory_followup"));
    turns.push(botTurn(`Ayni urunle uyumlu tamamlayici urunleri aciyorum.`, "accessory_followup", { ...s }, {
      specFilters: { accessory },
      min: 1,
      max: 16,
    }));

    turns.push(userTurn(`marka sabit kalsin ama baska aksesuar da olabilir`, "broaden"));
    turns.push(botTurn(`Uyumlu diger tamamlayici urunleri de dahil ediyorum.`, "broaden", { ...s }, {
      specFilters: { accessory_family: true },
      min: 2,
      max: 18,
    }));

    turns.push(userTurn(`en uygun fiyatli aksesuarlari one al`, "sort_only"));
    turns.push(botTurn(`Aksesuar baglaminda siralamayi fiyat odakli yapiyorum.`, "sort_only", { ...s }, {
      specFilters: { accessory_family: true },
      sortMode: "price_asc",
      min: 2,
      max: 18,
    }));
  } else if (bucket === "comparison") {
    turns.push(userTurn(`${brandA} ${itemA} ile ${brandB} ${itemB} arasinda kaldim`, "new_search"));
    turns.push(botTurn(`Iki urunu ayni kategoride karsilastirmaya hazirlaniyorum.`, "new_search", { ...s }, {
      specFilters: { compare: [brandA, brandB] },
      min: 2,
      max: 18,
    }));

    turns.push(userTurn(`${compareTarget} tarafinda hangisi daha iyi`, "comparison"));
    turns.push(botTurn(`Karsilastirmayi bu odaga gore yorumluyorum.`, "comparison", { ...s }, {
      specFilters: { compare_focus: compareTarget },
      min: 2,
      max: 18,
    }));

    turns.push(userTurn(`daha uygun fiyatli olan da onemli`, "comparison"));
    turns.push(botTurn(`Karsilastirmaya fiyat boyutunu da ekliyorum.`, "comparison", { ...s }, {
      specFilters: { compare_focus: compareTarget, include_price: true },
      min: 2,
      max: 18,
    }));

    turns.push(userTurn(`tamam bir de alternatif ucuncu secenek varsa goster`, "broaden"));
    turns.push(botTurn(`Iki urune yakin alternatifleri de aciyorum.`, "broaden", { ...s }, {
      specFilters: { compare_focus: compareTarget, alternatives: true },
      min: 3,
      max: 20,
    }));

    turns.push(userTurn(`en dengeli secenegi one al`, "sort_only"));
    turns.push(botTurn(`Karsilastirma sonucunda dengeli secenekleri ustte tutuyorum.`, "sort_only", { ...s }, {
      sortMode: "balanced_best",
      min: 3,
      max: 20,
    }));
  } else if (bucket === "clarify") {
    turns.push(userTurn(`bana bir sey oner`, "clarify"));
    turns.push(botTurn(`Kategori net degil; seni hizli yonlendirmek icin konu netlestiriyorum.`, "clarify", { ...state(null) }, {
      min: 0,
      max: 0,
    }));

    turns.push(userTurn(`${family.root}`, "new_search"));
    turns.push(botTurn(`Kategoriyi anladim ve genel sonuclari aciyorum.`, "new_search", { ...s }, {
      min: 6,
      max: 24,
    }));

    s.brand_filter = [brandA];
    turns.push(userTurn(`${brandA} olabilir`, "refine"));
    turns.push(botTurn(`Marka filtresi ekliyorum.`, "refine", { ...s }, {
      min: 2,
      max: 18,
    }));

    turns.push(userTurn(`ama tam karar veremedim, daha genel de bakabiliriz`, "broaden"));
    turns.push(botTurn(`Marka kisitini gevsetip daha genis alternatiflere donuyorum.`, "broaden", { ...state(family.slug) }, {
      min: 4,
      max: 24,
    }));

    turns.push(userTurn(`${sortMode}`, "sort_only"));
    turns.push(botTurn(`Genel sonuclari istedigin siraya gore duzenliyorum.`, "sort_only", { ...state(family.slug) }, {
      sortMode,
      min: 4,
      max: 24,
    }));
  } else {
    turns.push(userTurn(`${family.root}`, "new_search"));
    turns.push(botTurn(`Ana kategoriyi aciyorum.`, "new_search", { ...s }, {
      min: 6,
      max: 24,
    }));

    turns.push(userTurn(`kirmizi`, "refine"));
    turns.push(botTurn(`Renk talebini ayni kategoride yorumluyorum.`, "refine", { ...s }, {
      specFilters: { color_hint: "kirmizi" },
      min: 1,
      max: 14,
    }));

    turns.push(userTurn(`${brandA}`, "refine"));
    turns.push(botTurn(`Markayi kategori baglaminda birlestiriyorum; alakasiz alana kaymiyorum.`, "refine", {
      ...s,
      brand_filter: [brandA],
    }, {
      specFilters: { color_hint: "kirmizi" },
      min: 1,
      max: 12,
    }));

    turns.push(userTurn(`sonra tekrar ${family.root}`, "broaden"));
    turns.push(botTurn(`Ayni kategoride genel gorunume donuyorum; onceki renk kisiti zorla tasinmiyor.`, "broaden", { ...state(family.slug) }, {
      min: 4,
      max: 24,
    }));

    turns.push(userTurn(`simdi ${sortMode}`, "sort_only"));
    turns.push(botTurn(`Genel baglam korunup sadece siralama degisiyor.`, "sort_only", { ...state(family.slug) }, {
      sortMode,
      min: 4,
      max: 24,
    }));
  }

  return {
    id,
    scenario_key: `${verticalKey}-${bucket}-${String(id).padStart(4, "0")}`,
    vertical: verticalKey,
    test_bucket: bucket,
    category_slug: family.slug,
    category_path: categoryPath,
    turn_count: 5,
    turns,
  };
}

function buildStyleExample(id, verticalKey, family, bucket, index) {
  const brandA = pick(family.brands, index);
  const brandB = pick(family.brands.filter((brand) => brand !== brandA), index + 1);
  const itemA = pick(family.families, index);
  const accessory = pick(family.accessories, index);
  const compareTarget = pick(family.compareTargets, index);
  const sortMode = pick(family.sortModes, index);

  let user_message = "";
  let assistant_reply = "";
  let rule = "";

  if (bucket === "product_list") {
    user_message = `${brandA} ${itemA} bakiyorum, ${sortMode} da gorebilir miyim`;
    assistant_reply = `${brandA} tarafinda uygun secenekleri ayiriyorum. Ozellikle ${itemA} icinde one cikanlari ve ${sortMode} sinyaline uyanlari gosterecegim; istersen bir sonraki adimda fiyat veya ozellikten de daraltabiliriz.`;
    rule = "Kisa, net, akici listeye hazirlayan cevap";
  } else if (bucket === "comparison") {
    user_message = `${brandA} ile ${brandB} arasinda kaldim, ${compareTarget} hangisinde daha iyi`;
    assistant_reply = `Iki secenegi ayni baglamda karsilastiriyorum. Once ${compareTarget} tarafinda net farki gostereyim, sonra istersen fiyat ve gunluk kullanim dengesine gore de hangisinin daha mantikli oldugunu ayirabilirim.`;
    rule = "Karsilastirma cevabi, net ve yol gosterici";
  } else if (bucket === "clarify") {
    user_message = `bana bir sey oner`;
    assistant_reply = `Hemen yardimci olayim. Once kategoriyi netlestirelim: ${itemA} mi bakiyorsun, yoksa benzer ama daha uygun alternatiflere de acik misin?`;
    rule = "Belirsiz sorguda tek cümlede netlestirme";
  } else if (bucket === "no_results") {
    user_message = `${brandA} ${itemA} ama cok dar bir filtreyle`;
    assistant_reply = `Su an tam bu filtreye birebir uyan urun goremedim. Istersen ayni ihtiyaci koruyup filtreyi biraz genisleteyim ya da sana en yakin 2-3 alternatifi one cikarayim.`;
    rule = "Bos donmeden alternatif oner";
  } else if (bucket === "accessory") {
    user_message = `${itemA} icin ${accessory} var mi`;
    assistant_reply = `Bunu ilgili tamamlayici urun niyeti olarak okuyorum. Ana urune uyumlu ${accessory} seceneklerini ayirip gosteriyorum; istersen orijinal ve fiyat performans alternatiflerini de ayri tutabilirim.`;
    rule = "Aksesuar takip sorusunda kategori kaymasi yapma";
  } else {
    user_message = `${itemA} tavsiye ver`;
    assistant_reply = `Kisa yoldan gidelim: once ekonomik, dengeli ve premium diye uc segmente ayirayim. Sonra senin onceligine gore kamera, konfor, performans ya da fiyat tarafinda en mantikli secenegi birlikte daraltiriz.`;
    rule = "Tavsiye ver sorgusunda segmentli cevap";
  }

  return {
    id,
    vertical: verticalKey,
    style_bucket: bucket,
    category_slug: family.slug,
    user_message,
    response_rule: rule,
    assistant_reply,
  };
}

function writeJsonl(filePath, rows) {
  fs.writeFileSync(filePath, rows.map((row) => JSON.stringify(row)).join("\n") + "\n", "utf8");
}

function main() {
  ensureDir(OUT_DIR);
  ensureDir(ALL_DIR);
  ensureDir(BEHAVIOR_DIR);
  ensureDir(STYLE_DIR);

  const behaviorRows = [];
  const styleRows = [];
  let behaviorId = 20001;
  let styleId = 50001;

  for (const vertical of verticals) {
    for (const bucket of behaviorBuckets) {
      for (let i = 0; i < 20; i++) {
        const family = pick(vertical.families, i);
        behaviorRows.push(buildBehaviorScenario(behaviorId++, vertical.key, vertical.categoryPath, bucket, family, i));
      }
    }
  }

  for (const vertical of verticals) {
    for (const bucket of styleBuckets) {
      for (let i = 0; i < 20; i++) {
        const family = pick(vertical.families, i);
        styleRows.push(buildStyleExample(styleId++, vertical.key, family, bucket, i));
      }
    }
  }

  writeJsonl(path.join(ALL_DIR, "chatbot_dialogs_intent_behaviors_480.jsonl"), behaviorRows);
  writeJsonl(path.join(BEHAVIOR_DIR, "chatbot_dialogs_intent_behaviors_480.jsonl"), behaviorRows);
  writeJsonl(path.join(STYLE_DIR, "chatbot_response_style_examples_480.jsonl"), styleRows);

  const manifest = {
    generated_at: new Date().toISOString(),
    behavior_scenarios: behaviorRows.length,
    style_examples: styleRows.length,
    behavior_buckets: behaviorBuckets,
    style_buckets: styleBuckets,
    files: {
      behavior_all: path.join(ALL_DIR, "chatbot_dialogs_intent_behaviors_480.jsonl"),
      behavior_split: path.join(BEHAVIOR_DIR, "chatbot_dialogs_intent_behaviors_480.jsonl"),
      response_style: path.join(STYLE_DIR, "chatbot_response_style_examples_480.jsonl"),
    },
  };

  fs.writeFileSync(path.join(OUT_DIR, "behavior-style-manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

  console.log(`Generated ${behaviorRows.length} behavior scenarios and ${styleRows.length} response style examples`);
}

main();
