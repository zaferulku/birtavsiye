#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = "C:\\projeler\\birtavsiye";
const OUT_DIR = path.join(ROOT, "tests", "chatbot", "fixtures", "generated");
const VERTICAL_DIR = path.join(OUT_DIR, "verticals");
const FLOW_DIR = path.join(OUT_DIR, "flows");
const ALL_DIR = path.join(OUT_DIR, "all");

const flowLabels = {
  daraltma: "Daraltma",
  genisletme: "Genişletme",
  reset: "Reset",
};

const priceRanges = {
  telefon: [
    { text: "15 bin altı olsun", min: null, max: 15000 },
    { text: "20-30 bin aralığında olsun", min: 20000, max: 30000 },
    { text: "30-45 bin bandına inelim", min: 30000, max: 45000 },
    { text: "50 bin üstüne çıkmasın", min: null, max: 50000 },
    { text: "bütçem 25-40 bin arası", min: 25000, max: 40000 },
  ],
  kozmetik: [
    { text: "300-600 TL bandında olsun", min: 300, max: 600 },
    { text: "500 TL altına inelim", min: null, max: 500 },
    { text: "700-1200 TL aralığında olabilir", min: 700, max: 1200 },
    { text: "çok pahalı olmasın, 900 TL üstü istemiyorum", min: null, max: 900 },
    { text: "1.000-1.500 TL civarı da olur", min: 1000, max: 1500 },
  ],
  beyaz_esya: [
    { text: "20-30 bin aralığında olsun", min: 20000, max: 30000 },
    { text: "35 bin üstüne çıkmayalım", min: null, max: 35000 },
    { text: "25-45 bin bandında bakıyorum", min: 25000, max: 45000 },
    { text: "50 bin altı olsun", min: null, max: 50000 },
    { text: "uygun olsun, 18-28 bin arası bakıyorum", min: 18000, max: 28000 },
  ],
  moda: [
    { text: "1.500 TL altına inelim", min: null, max: 1500 },
    { text: "2-4 bin bandında olsun", min: 2000, max: 4000 },
    { text: "5 bin üstü olmasın", min: null, max: 5000 },
    { text: "800-2.000 TL arası göster", min: 800, max: 2000 },
    { text: "3-6 bin arasında bakıyorum", min: 3000, max: 6000 },
  ],
};

const phoneConfig = {
  vertical: "telefon",
  dominantSlug: "akilli-telefon",
  categoryPath: "elektronik/telefon/akilli-telefon",
  broadOpeners: [
    "telefon bakıyorum",
    "akıllı telefon arıyorum",
    "telefon öner",
    "telefon göster",
    "telefonlara bakalım",
  ],
  brands: ["Apple", "Samsung", "Xiaomi", "vivo", "OPPO", "Honor", "POCO", "Realme"],
  colors: ["siyah", "mavi", "kırmızı", "beyaz", "pembe", "yeşil"],
  storages: ["128 GB", "256 GB", "512 GB", "1 TB"],
  focuses: [
    { text: "kamera iyi olsun", key: "kamera", value: "iyi" },
    { text: "oyun için güçlü olsun", key: "kullanim", value: "oyun" },
    { text: "şarjı uzun gitsin", key: "pil", value: "uzun" },
    { text: "küçük ekranlı olsun", key: "boyut", value: "kompakt" },
    { text: "fotoğraf için daha iyi olanları ayır", key: "kamera", value: "fotoğraf" },
    { text: "iş için stabil bir şey olsun", key: "kullanim", value: "is" },
  ],
  specificModels: [
    { title: "iPhone 16 Pro", brand: "Apple", family: "iPhone 16 Pro" },
    { title: "iPhone 15 Pro Max", brand: "Apple", family: "iPhone 15 Pro Max" },
    { title: "Samsung Galaxy S25", brand: "Samsung", family: "Galaxy S25" },
    { title: "Samsung Galaxy A56", brand: "Samsung", family: "Galaxy A56" },
    { title: "Xiaomi 14T Pro", brand: "Xiaomi", family: "Xiaomi 14T Pro" },
    { title: "vivo V50", brand: "vivo", family: "vivo V50" },
    { title: "OPPO Reno 13", brand: "OPPO", family: "Reno 13" },
    { title: "Honor 200 Pro", brand: "Honor", family: "Honor 200 Pro" },
  ],
  sortPhrases: [
    { text: "en popülerleri göster", mode: "popular" },
    { text: "en ucuzları öne al", mode: "price_asc" },
    { text: "stokta olanları göster", mode: "in_stock" },
    { text: "mağaza sayısı çok olanları öne çıkar", mode: "store_count" },
    { text: "en yeni modelleri öne al", mode: "fresh" },
  ],
};

const cosmeticsConfig = {
  vertical: "kozmetik",
  dominantSlug: "parfum",
  categoryPath: "kozmetik",
  productFamilies: [
    {
      slug: "parfum",
      rootQuery: "parfüm bakıyorum",
      itemLabel: "parfüm",
      brands: ["Yves Saint Laurent", "Versace", "Bargello", "Zara", "Mad", "Avon"],
      colors: ["şeffaf", "pembe", "mor", "gold", "beyaz"],
      specifics: [
        { text: "lavanta notalı olsun", key: "nota", value: "lavanta" },
        { text: "temiz kokulu olsun", key: "koku_ailesi", value: "fresh" },
        { text: "kalıcılığı iyi olsun", key: "performans", value: "kalici" },
        { text: "unisex de olabilir", key: "cinsiyet", value: "unisex" },
      ],
      resetTargets: [
        { slug: "deodorant", query: "deodorant bakayım", itemLabel: "deodorant" },
        { slug: "serum-ampul", query: "serum bakayım", itemLabel: "serum" },
      ],
    },
    {
      slug: "serum-ampul",
      rootQuery: "serum arıyorum",
      itemLabel: "serum",
      brands: ["The Purest Solutions", "The Ordinary", "Celenes", "La Roche-Posay", "Vichy"],
      colors: ["amber", "şeffaf", "beyaz", "nude"],
      specifics: [
        { text: "niasinamid olsun", key: "icerik", value: "niasinamid" },
        { text: "hyaluronik asit de olabilir", key: "icerik", value: "hyaluronik asit" },
        { text: "yağlı cilt için olsun", key: "cilt_tipi", value: "yagli" },
        { text: "hassas cilde uygun olsun", key: "cilt_tipi", value: "hassas" },
      ],
      resetTargets: [
        { slug: "yuz-nemlendirici", query: "nemlendirici bakayım", itemLabel: "nemlendirici" },
        { slug: "gunes-koruyucu", query: "güneş kremi bakayım", itemLabel: "güneş kremi" },
      ],
    },
    {
      slug: "yuz-nemlendirici",
      rootQuery: "nemlendirici arıyorum",
      itemLabel: "nemlendirici",
      brands: ["CeraVe", "Neutrogena", "Bioderma", "Avene", "La Roche-Posay"],
      colors: ["beyaz", "mavi", "yeşil", "şeffaf"],
      specifics: [
        { text: "kuru cilt için olsun", key: "cilt_tipi", value: "kuru" },
        { text: "yağlı his bırakmasın", key: "doku", value: "hafif" },
        { text: "parfümsüz olsun", key: "icerik", value: "parfumsuz" },
        { text: "bariyer onarıcı olsun", key: "fonksiyon", value: "bariyer" },
      ],
      resetTargets: [
        { slug: "yuz-temizleyici", query: "temizleyici bakayım", itemLabel: "temizleyici" },
        { slug: "serum-ampul", query: "serum bakayım", itemLabel: "serum" },
      ],
    },
    {
      slug: "deodorant",
      rootQuery: "deodorant bakıyorum",
      itemLabel: "deodorant",
      brands: ["Nivea", "Rexona", "Garnier", "Bioderma", "Sebamed"],
      colors: ["beyaz", "siyah", "mavi", "yeşil"],
      specifics: [
        { text: "lavantalı olsun", key: "nota", value: "lavanta" },
        { text: "leke bırakmasın", key: "fonksiyon", value: "iz_yok" },
        { text: "alkolsüz olsun", key: "icerik", value: "alkolsuz" },
        { text: "hassas cilt için olsun", key: "cilt_tipi", value: "hassas" },
      ],
      resetTargets: [
        { slug: "parfum", query: "parfüm bakayım", itemLabel: "parfüm" },
        { slug: "erkek-bakim", query: "erkek bakım ürünlerine bakayım", itemLabel: "erkek bakım" },
      ],
    },
    {
      slug: "sampuan",
      rootQuery: "şampuan bakıyorum",
      itemLabel: "şampuan",
      brands: ["Kerastase", "Elseve", "Bioxcin", "Sebamed", "Davines"],
      colors: ["beyaz", "altın", "mor", "şeffaf"],
      specifics: [
        { text: "kepeğe karşı olsun", key: "problem", value: "kepek" },
        { text: "boya koruyucu olsun", key: "fonksiyon", value: "renk_koruma" },
        { text: "ince telli saç için olsun", key: "sac_tipi", value: "ince_telli" },
        { text: "saçı ağırlaştırmasın", key: "doku", value: "hafif" },
      ],
      resetTargets: [
        { slug: "serum-ampul", query: "saç serumu bakayım", itemLabel: "saç serumu" },
        { slug: "erkek-bakim", query: "erkek bakım tarafına geçelim", itemLabel: "erkek bakım" },
      ],
    },
  ],
  sortPhrases: [
    { text: "en çok yorum alanları öne çıkar", mode: "rating" },
    { text: "en uygun fiyatlıları göster", mode: "price_asc" },
    { text: "en popülerleri aç", mode: "popular" },
    { text: "indirime girenleri öne al", mode: "discount" },
    { text: "stokta olanları göster", mode: "in_stock" },
  ],
};

const whiteGoodsConfig = {
  vertical: "beyaz_esya",
  dominantSlug: "camasir-makinesi",
  categoryPath: "beyaz-esya",
  productFamilies: [
    {
      slug: "camasir-makinesi",
      rootQuery: "çamaşır makinesi bakıyorum",
      itemLabel: "çamaşır makinesi",
      brands: ["Bosch", "Samsung", "LG", "Beko", "Siemens", "Profilo"],
      colors: ["beyaz", "gri", "siyah"],
      specifics: [
        { text: "9 kg olsun", key: "kapasite", value: "9 kg" },
        { text: "sessiz çalışan olsun", key: "ses", value: "sessiz" },
        { text: "kurutmalı olsun", key: "tip", value: "kurutmali" },
        { text: "enerji tüketimi düşük olsun", key: "enerji", value: "tasarruf" },
      ],
      resetTargets: [
        { slug: "bulasik-makinesi", query: "bulaşık makinesi bakayım", itemLabel: "bulaşık makinesi" },
        { slug: "kurutma-makinesi", query: "kurutma makinesi bakayım", itemLabel: "kurutma makinesi" },
      ],
    },
    {
      slug: "buzdolabi",
      rootQuery: "buzdolabı arıyorum",
      itemLabel: "buzdolabı",
      brands: ["Bosch", "Samsung", "Arçelik", "Beko", "Siemens", "Vestel"],
      colors: ["beyaz", "gri", "inox", "siyah"],
      specifics: [
        { text: "no frost olsun", key: "sogutma", value: "no_frost" },
        { text: "geniş hacimli olsun", key: "hacim", value: "buyuk" },
        { text: "derin dondurucu altta olsun", key: "tip", value: "alt_dondurucu" },
        { text: "sessiz olsun", key: "ses", value: "sessiz" },
      ],
      resetTargets: [
        { slug: "derin-dondurucu", query: "derin dondurucu bakayım", itemLabel: "derin dondurucu" },
        { slug: "klima", query: "klima tarafına geçelim", itemLabel: "klima" },
      ],
    },
    {
      slug: "bulasik-makinesi",
      rootQuery: "bulaşık makinesi bakıyorum",
      itemLabel: "bulaşık makinesi",
      brands: ["Bosch", "Beko", "Arçelik", "Siemens", "Profilo"],
      colors: ["beyaz", "gri", "inox"],
      specifics: [
        { text: "3 program üstü olsun", key: "program", value: "3_plus" },
        { text: "sessiz çalışsın", key: "ses", value: "sessiz" },
        { text: "ankastre olmasın", key: "tip", value: "solo" },
        { text: "enerji verimli olsun", key: "enerji", value: "tasarruf" },
      ],
      resetTargets: [
        { slug: "camasir-makinesi", query: "çamaşır makinesi bakayım", itemLabel: "çamaşır makinesi" },
        { slug: "firin", query: "fırın bakayım", itemLabel: "fırın" },
      ],
    },
    {
      slug: "klima",
      rootQuery: "klima arıyorum",
      itemLabel: "klima",
      brands: ["Arçelik", "Mitsubishi", "Samsung", "LG", "Beko"],
      colors: ["beyaz", "gri"],
      specifics: [
        { text: "12000 BTU olsun", key: "btu", value: "12000" },
        { text: "ısıtma da güçlü olsun", key: "kullanim", value: "sicak_soguk" },
        { text: "wifi kontrollü olsun", key: "baglanti", value: "wifi" },
        { text: "sessiz iç ünite olsun", key: "ses", value: "sessiz" },
      ],
      resetTargets: [
        { slug: "buzdolabi", query: "buzdolabı bakayım", itemLabel: "buzdolabı" },
        { slug: "hava-temizleyici", query: "hava temizleyici bakayım", itemLabel: "hava temizleyici" },
      ],
    },
  ],
  sortPhrases: [
    { text: "en düşük fiyatlıları göster", mode: "price_asc" },
    { text: "en çok yorum alanları öne çıkar", mode: "rating" },
    { text: "kurulum puanı iyi olanları getir", mode: "service" },
    { text: "stokta olanları göster", mode: "in_stock" },
    { text: "çok mağazalı olanları öne al", mode: "store_count" },
  ],
};

const fashionConfig = {
  vertical: "moda",
  dominantSlug: "erkek-giyim-ust",
  categoryPath: "moda",
  productFamilies: [
    {
      slug: "erkek-giyim-ust",
      rootQuery: "erkek üst giyim bakıyorum",
      itemLabel: "erkek üst giyim",
      brands: ["Nike", "Adidas", "Mavi", "Koton", "Defacto", "LC Waikiki"],
      colors: ["siyah", "beyaz", "lacivert", "gri", "yeşil"],
      specifics: [
        { text: "m beden olsun", key: "beden", value: "M" },
        { text: "pamuklu olsun", key: "kumas", value: "pamuk" },
        { text: "oversize olabilir", key: "kalip", value: "oversize" },
        { text: "günlük kullanım için olsun", key: "kullanim", value: "gunluk" },
      ],
      resetTargets: [
        { slug: "erkek-dis-giyim", query: "erkek mont bakayım", itemLabel: "erkek mont" },
        { slug: "erkek-ayakkabi-sneaker", query: "erkek sneaker bakayım", itemLabel: "erkek sneaker" },
      ],
    },
    {
      slug: "kadin-giyim-ust",
      rootQuery: "kadın üst giyim bakıyorum",
      itemLabel: "kadın üst giyim",
      brands: ["Zara", "Mango", "Koton", "Stradivarius", "H&M"],
      colors: ["siyah", "beyaz", "ekru", "pembe", "mavi"],
      specifics: [
        { text: "s beden olsun", key: "beden", value: "S" },
        { text: "ofis için şık dursun", key: "kullanim", value: "ofis" },
        { text: "ince kumaşlı olsun", key: "kumas", value: "ince" },
        { text: "desensiz olsun", key: "desen", value: "duz" },
      ],
      resetTargets: [
        { slug: "kadin-elbise", query: "elbise bakayım", itemLabel: "elbise" },
        { slug: "kadin-ayakkabi-topuklu", query: "topuklu ayakkabı bakayım", itemLabel: "topuklu ayakkabı" },
      ],
    },
    {
      slug: "erkek-ayakkabi-sneaker",
      rootQuery: "erkek sneaker bakıyorum",
      itemLabel: "erkek sneaker",
      brands: ["Nike", "Adidas", "Puma", "New Balance", "Skechers"],
      colors: ["siyah", "beyaz", "gri", "lacivert", "bej"],
      specifics: [
        { text: "42 numara olsun", key: "numara", value: "42" },
        { text: "günlük kullanım için rahat olsun", key: "kullanim", value: "gunluk" },
        { text: "deri olmasın", key: "malzeme", value: "tekstil" },
        { text: "yürüyüş için uygun olsun", key: "kullanim", value: "yuruyus" },
      ],
      resetTargets: [
        { slug: "erkek-giyim-ust", query: "erkek tişört bakayım", itemLabel: "erkek tişört" },
        { slug: "erkek-ayakkabi-klasik", query: "erkek klasik ayakkabı bakayım", itemLabel: "erkek klasik ayakkabı" },
      ],
    },
    {
      slug: "kadin-ayakkabi-topuklu",
      rootQuery: "topuklu ayakkabı bakıyorum",
      itemLabel: "topuklu ayakkabı",
      brands: ["Nine West", "Aldo", "Derimod", "Zara", "Bambi"],
      colors: ["siyah", "nude", "kırmızı", "gümüş", "bej"],
      specifics: [
        { text: "37 numara olsun", key: "numara", value: "37" },
        { text: "düğün için uygun olsun", key: "kullanim", value: "dugun" },
        { text: "kalın topuk tercih ederim", key: "topuk", value: "kalin" },
        { text: "uzun süre ayakta kalacağım için rahat olsun", key: "konfor", value: "rahat" },
      ],
      resetTargets: [
        { slug: "kadin-ayakkabi-sneaker", query: "kadın sneaker bakayım", itemLabel: "kadın sneaker" },
        { slug: "kadin-elbise", query: "elbiselere geçelim", itemLabel: "elbise" },
      ],
    },
  ],
  sortPhrases: [
    { text: "en popülerleri göster", mode: "popular" },
    { text: "indirimde olanları öne çıkar", mode: "discount" },
    { text: "en çok yorum alanları getir", mode: "rating" },
    { text: "uygun fiyatlıları öne al", mode: "price_asc" },
    { text: "stokta olanları filtrele", mode: "in_stock" },
  ],
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function pick(arr, index, offset = 0) {
  return arr[(index + offset) % arr.length];
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function coreState(categorySlug) {
  return {
    category_slug: categorySlug,
    brand_filter: [],
    variant_color_patterns: [],
    variant_storage_patterns: [],
    price_min: null,
    price_max: null,
  };
}

function userTurn(msg, intentLabel) {
  return {
    role: "user",
    msg,
    intent_label: intentLabel,
  };
}

function actionForIntent(intentLabel) {
  switch (intentLabel) {
    case "new_search":
    case "refine":
      return "merge_with_new_dims";
    case "broaden":
      return "user_requested_removal";
    case "reset":
      return "user_requested_reset";
    case "sort_only":
      return "sort_only";
    case "switch_category":
      return "switch_category";
    case "accessory_followup":
      return "switch_category";
    default:
      return "merge_with_new_dims";
  }
}

function botTurn(msg, intentLabel, state, options = {}) {
  return {
    role: "bot",
    msg,
    loading_placeholder: true,
    expected_intent_label: intentLabel,
    expected_state: {
      category_slug: state.category_slug ?? null,
      brand_filter: state.brand_filter ?? [],
      variant_color_patterns: state.variant_color_patterns ?? [],
      variant_storage_patterns: state.variant_storage_patterns ?? [],
      price_min: state.price_min ?? null,
      price_max: state.price_max ?? null,
    },
    expected_spec_filters: options.specFilters ?? {},
    expected_sort_mode: options.sortMode ?? null,
    expected_action: options.action ?? actionForIntent(intentLabel),
    expected_product_count_min: options.min ?? 0,
    expected_product_count_max: options.max ?? 30,
  };
}

function phoneNarrowScenario(index) {
  const brand = pick(phoneConfig.brands, index);
  const color = pick(phoneConfig.colors, index);
  const storage = pick(phoneConfig.storages, index);
  const focus = pick(phoneConfig.focuses, index);
  const budget = pick(priceRanges.telefon, index);
  const sort = pick(phoneConfig.sortPhrases, index);
  const opener = pick(phoneConfig.broadOpeners, index);
  const state = coreState(phoneConfig.dominantSlug);
  const turns = [];

  turns.push(userTurn(opener, "new_search"));
  turns.push(botTurn("Telefon kategorisinde uygun seçenekleri getiriyorum.", "new_search", state, { min: 6, max: 40 }));

  state.brand_filter = [brand];
  turns.push(userTurn(`${brand} olsun`, "refine"));
  turns.push(botTurn(`${brand} telefonları daraltıp gösteriyorum.`, "refine", state, { min: 2, max: 28 }));

  state.variant_color_patterns = [color];
  state.variant_storage_patterns = [storage];
  turns.push(userTurn(`${color} olsun, ${storage} tercihim var ve ${focus.text}`, "refine"));
  turns.push(botTurn(`Renk, hafıza ve kullanım önceliğine göre listeyi daraltıyorum.`, "refine", state, {
    specFilters: { [focus.key]: focus.value },
    min: 1,
    max: 18,
  }));

  state.price_min = budget.min;
  state.price_max = budget.max;
  turns.push(userTurn(budget.text, "refine"));
  turns.push(botTurn(`Bütçe aralığını uyguladım.`, "refine", state, {
    specFilters: { [focus.key]: focus.value },
    min: 0,
    max: 12,
  }));

  turns.push(userTurn(sort.text, sort.mode === "in_stock" ? "refine" : "sort_only"));
  turns.push(botTurn(`Aynı filtreleri koruyup listeyi istediğin şekilde düzenliyorum.`, sort.mode === "in_stock" ? "refine" : "sort_only", state, {
    specFilters: {
      [focus.key]: focus.value,
      ...(sort.mode === "in_stock" ? { stock_status: "in_stock" } : {}),
    },
    sortMode: sort.mode,
    min: 0,
    max: 12,
  }));

  return turns;
}

function phoneBroadenScenario(index) {
  const model = pick(phoneConfig.specificModels, index);
  const color = pick(phoneConfig.colors, index);
  const storage = pick(phoneConfig.storages, index);
  const altBrand = pick(phoneConfig.brands.filter((b) => b !== model.brand), index);
  const sort = pick(phoneConfig.sortPhrases, index + 2);
  const state = coreState(phoneConfig.dominantSlug);
  const turns = [];

  state.brand_filter = [model.brand];
  state.variant_color_patterns = [color];
  state.variant_storage_patterns = [storage];
  turns.push(userTurn(`${model.title} ${color} ${storage} bakıyorum`, "new_search"));
  turns.push(botTurn(`${model.title} için çok spesifik sonuçları açıyorum.`, "new_search", state, {
    specFilters: { family: model.family },
    min: 1,
    max: 10,
  }));

  state.variant_color_patterns = [];
  turns.push(userTurn("renk fark etmez", "broaden"));
  turns.push(botTurn(`Renk kısıtını kaldırıp aynı model ailesinde genişletiyorum.`, "broaden", state, {
    specFilters: { family: model.family },
    min: 1,
    max: 14,
  }));

  state.variant_storage_patterns = [];
  turns.push(userTurn("hafıza da sabit kalmasın, diğer seçenekleri de aç", "broaden"));
  turns.push(botTurn(`Hafıza filtresini gevşettim, aynı modelin diğer varyantlarını da açıyorum.`, "broaden", state, {
    specFilters: { family: model.family },
    min: 1,
    max: 18,
  }));

  state.brand_filter = [];
  turns.push(userTurn(`${model.brand} şart değil, ${altBrand} veya benzerleri de olabilir`, "broaden"));
  turns.push(botTurn(`Marka filtresini kaldırıp yakın alternatifleri de dahil ediyorum.`, "broaden", state, {
    specFilters: { family_focus: model.family, alternative_brand: altBrand },
    min: 3,
    max: 24,
  }));

  turns.push(userTurn(`genel fiyat performans telefonlara dönelim, ${sort.text}`, "sort_only"));
  turns.push(botTurn(`Daha geniş sonuç kümesinde sıralamayı istediğin moda göre güncelliyorum.`, "sort_only", state, {
    specFilters: { intent: "fiyat_performans" },
    sortMode: sort.mode,
    min: 6,
    max: 30,
  }));

  return turns;
}

function phoneResetScenario(index) {
  const first = pick(phoneConfig.specificModels, index);
  const second = pick(phoneConfig.specificModels.filter((m) => m.brand !== first.brand), index + 1);
  const firstColor = pick(phoneConfig.colors, index + 1);
  const firstStorage = pick(phoneConfig.storages, index + 2);
  const secondColor = pick(phoneConfig.colors, index + 3);
  const sort = pick(phoneConfig.sortPhrases, index + 1);
  const state = coreState(phoneConfig.dominantSlug);
  const turns = [];

  state.brand_filter = [first.brand];
  turns.push(userTurn(`${first.title} bakıyorum`, "new_search"));
  turns.push(botTurn(`${first.title} için uygun teklifleri açıyorum.`, "new_search", state, {
    specFilters: { family: first.family },
    min: 1,
    max: 12,
  }));

  state.variant_color_patterns = [firstColor];
  state.variant_storage_patterns = [firstStorage];
  turns.push(userTurn(`${firstColor} ve ${firstStorage} olsun`, "refine"));
  turns.push(botTurn(`İlk ürün için renk ve hafıza filtrelerini ekledim.`, "refine", state, {
    specFilters: { family: first.family },
    min: 1,
    max: 8,
  }));

  state.brand_filter = [second.brand];
  state.variant_color_patterns = [];
  state.variant_storage_patterns = [];
  state.price_min = null;
  state.price_max = null;
  turns.push(userTurn(`boşver bunu, ${second.title} tarafına geçelim`, "reset"));
  turns.push(botTurn(`Önceki bağlamı bırakıp yeni ürün ailesine geçiyorum.`, "reset", state, {
    specFilters: { family: second.family },
    min: 1,
    max: 14,
  }));

  state.variant_color_patterns = [secondColor];
  turns.push(userTurn(`${secondColor} varsa onları göster`, "refine"));
  turns.push(botTurn(`Yeni ürün bağlamında renk filtresini uyguluyorum.`, "refine", state, {
    specFilters: { family: second.family },
    min: 1,
    max: 10,
  }));

  turns.push(userTurn(sort.text, sort.mode === "in_stock" ? "refine" : "sort_only"));
  turns.push(botTurn(`Yeni bağlamı koruyup sonuçları tekrar düzenliyorum.`, sort.mode === "in_stock" ? "refine" : "sort_only", state, {
    specFilters: {
      family: second.family,
      ...(sort.mode === "in_stock" ? { stock_status: "in_stock" } : {}),
    },
    sortMode: sort.mode,
    min: 1,
    max: 10,
  }));

  return turns;
}

function familyForIndex(config, index) {
  return pick(config.productFamilies, index);
}

function narrowScenarioForFamily(config, index) {
  const family = familyForIndex(config, index);
  const brand = pick(family.brands, index);
  const color = pick(family.colors, index);
  const specA = pick(family.specifics, index);
  const specB = pick(family.specifics, index + 2);
  const budget = pick(priceRanges[config.vertical], index);
  const sort = pick(config.sortPhrases, index);
  const state = coreState(family.slug);
  const turns = [];

  turns.push(userTurn(family.rootQuery, "new_search"));
  turns.push(botTurn(`${family.itemLabel} kategorisinde uygun sonuçları getiriyorum.`, "new_search", state, { min: 6, max: 40 }));

  state.brand_filter = [brand];
  turns.push(userTurn(`${brand} olsun`, "refine"));
  turns.push(botTurn(`${brand} markasına göre daraltıyorum.`, "refine", state, { min: 2, max: 24 }));

  state.variant_color_patterns = [color];
  turns.push(userTurn(`${color} tonları olsun ve ${specA.text} ayrıca ${specB.text}`, "refine"));
  turns.push(botTurn(`Renk ve ürün özelliklerine göre listeyi daraltıyorum.`, "refine", state, {
    specFilters: { [specA.key]: specA.value, [specB.key]: specB.value },
    min: 1,
    max: 16,
  }));

  state.price_min = budget.min;
  state.price_max = budget.max;
  turns.push(userTurn(budget.text, "refine"));
  turns.push(botTurn(`Bütçe filtresini uyguladım.`, "refine", state, {
    specFilters: { [specA.key]: specA.value, [specB.key]: specB.value },
    min: 0,
    max: 12,
  }));

  turns.push(userTurn(sort.text, sort.mode === "in_stock" ? "refine" : "sort_only"));
  turns.push(botTurn(`Aynı filtreleri koruyarak sıralamayı güncelliyorum.`, sort.mode === "in_stock" ? "refine" : "sort_only", state, {
    specFilters: {
      [specA.key]: specA.value,
      [specB.key]: specB.value,
      ...(sort.mode === "in_stock" ? { stock_status: "in_stock" } : {}),
    },
    sortMode: sort.mode,
    min: 0,
    max: 12,
  }));

  return { turns, categorySlug: family.slug };
}

function broadenScenarioForFamily(config, index) {
  const family = familyForIndex(config, index);
  const brand = pick(family.brands, index);
  const color = pick(family.colors, index);
  const spec = pick(family.specifics, index);
  const resetTarget = pick(family.resetTargets, index);
  const sort = pick(config.sortPhrases, index + 1);
  const state = coreState(family.slug);
  const turns = [];

  state.brand_filter = [brand];
  state.variant_color_patterns = [color];
  turns.push(userTurn(`${brand} ${family.itemLabel} bakıyorum, ${color} olsun ve ${spec.text}`, "new_search"));
  turns.push(botTurn(`Daha spesifik bir sonuç kümesi açıyorum.`, "new_search", state, {
    specFilters: { [spec.key]: spec.value },
    min: 1,
    max: 12,
  }));

  state.variant_color_patterns = [];
  turns.push(userTurn("renk fark etmez", "broaden"));
  turns.push(botTurn(`Renk filtresini kaldırdım, aynı üründe diğer tonları da açıyorum.`, "broaden", state, {
    specFilters: { [spec.key]: spec.value },
    min: 1,
    max: 16,
  }));

  turns.push(userTurn(`${spec.text} şart değil, daha genel bakabilirim`, "broaden"));
  turns.push(botTurn(`Ürün özelliğini gevşetip daha geniş bir küme açıyorum.`, "broaden", state, {
    specFilters: {},
    min: 2,
    max: 20,
  }));

  state.brand_filter = [];
  turns.push(userTurn(`${brand} şart değil, ${resetTarget.itemLabel} tarafını da açabiliriz`, "broaden"));
  turns.push(botTurn(`Marka filtresini kaldırıp daha geniş alternatifleri açıyorum.`, "broaden", state, {
    specFilters: { alternative_path: resetTarget.slug },
    min: 4,
    max: 24,
  }));

  turns.push(userTurn(`genel olarak bu tarafta kalalım, ${sort.text}`, "sort_only"));
  turns.push(botTurn(`Genişletilmiş sonuçlarda sıralamayı tekrar düzenliyorum.`, "sort_only", state, {
    sortMode: sort.mode,
    specFilters: {},
    min: 4,
    max: 24,
  }));

  return { turns, categorySlug: family.slug };
}

function resetScenarioForFamily(config, index) {
  const family = familyForIndex(config, index);
  const brand = pick(family.brands, index);
  const color = pick(family.colors, index);
  const spec = pick(family.specifics, index + 1);
  const target = pick(family.resetTargets, index);
  const targetBrand = pick(family.brands, index + 2);
  const sort = pick(config.sortPhrases, index + 2);
  const state = coreState(family.slug);
  const turns = [];

  state.brand_filter = [brand];
  turns.push(userTurn(`${brand} ${family.itemLabel} bakıyorum`, "new_search"));
  turns.push(botTurn(`${family.itemLabel} tarafında ${brand} sonuçlarını açıyorum.`, "new_search", state, {
    min: 1,
    max: 18,
  }));

  state.variant_color_patterns = [color];
  turns.push(userTurn(`${color} olsun ve ${spec.text}`, "refine"));
  turns.push(botTurn(`İlk bağlamda renk ve özellik daraltmasını uyguluyorum.`, "refine", state, {
    specFilters: { [spec.key]: spec.value },
    min: 1,
    max: 10,
  }));

  state.category_slug = target.slug;
  state.brand_filter = [];
  state.variant_color_patterns = [];
  state.variant_storage_patterns = [];
  state.price_min = null;
  state.price_max = null;
  turns.push(userTurn(`fikrim değişti, ${target.query}`, "reset"));
  turns.push(botTurn(`Önceki bağlamı kapatıp yeni kategoriye geçiyorum.`, "reset", state, {
    specFilters: { reset_from: family.slug },
    min: 2,
    max: 20,
  }));

  state.brand_filter = [targetBrand];
  turns.push(userTurn(`${targetBrand} olursa daha iyi`, "refine"));
  turns.push(botTurn(`Yeni bağlamda markaya göre daraltıyorum.`, "refine", state, {
    specFilters: {},
    min: 1,
    max: 14,
  }));

  turns.push(userTurn(sort.text, sort.mode === "in_stock" ? "refine" : "sort_only"));
  turns.push(botTurn(`Yeni kategori içinde sonuçları tekrar düzenliyorum.`, sort.mode === "in_stock" ? "refine" : "sort_only", state, {
    specFilters: sort.mode === "in_stock" ? { stock_status: "in_stock" } : {},
    sortMode: sort.mode,
    min: 1,
    max: 14,
  }));

  return { turns, categorySlug: family.slug };
}

function buildScenario(id, vertical, flow, categorySlug, categoryPath, turns) {
  return {
    id,
    scenario_key: `${vertical}-${flow}-${String(id).padStart(4, "0")}`,
    vertical,
    test_bucket: flow,
    category_slug: categorySlug,
    category_path: categoryPath,
    turn_count: turns.filter((turn) => turn.role === "user").length,
    turns,
  };
}

function writeJsonl(filePath, rows) {
  const content = rows.map((row) => JSON.stringify(row)).join("\n") + "\n";
  fs.writeFileSync(filePath, content, "utf8");
}

function writeReadme(manifest) {
  const lines = [
    "# Chatbot Intent Dataset",
    "",
    "Bu klasor, chatbot konusma akisini test etmek icin uretilmis intent etiketli fixture setlerini icerir.",
    "",
    "## Paketler",
    "",
    `- Toplam senaryo: ${manifest.total_scenarios}`,
    `- Her senaryo: 5 kullanici sorgusu + 5 bot cevabi`,
    `- Dikeyler: ${manifest.verticals.join(", ")}`,
    `- Akis paketleri: ${manifest.flows.join(", ")}`,
    "",
    "## Dosyalar",
    "",
    `- Tum dataset: \`tests/chatbot/fixtures/generated/all/${path.basename(manifest.files.all)}\``,
    `- Dikey bazli dosyalar: \`tests/chatbot/fixtures/generated/verticals/\``,
    `- Akis bazli dosyalar: \`tests/chatbot/fixtures/generated/flows/\``,
    "",
    "## Alanlar",
    "",
    "- `intent_label`: kullanici niyeti (`new_search`, `refine`, `broaden`, `reset`, `sort_only`)",
    "- `expected_state`: temel kategori/marka/renk/fiyat durumu",
    "- `expected_spec_filters`: kategoriye ozgu filtreler",
    "- `expected_sort_mode`: siralama veya stok modu",
    "",
    "## Uretim",
    "",
    "```bash",
    "node scripts/generate-chatbot-intent-datasets.mjs",
    "```",
    "",
  ];
  fs.writeFileSync(path.join(OUT_DIR, "README.md"), lines.join("\n"), "utf8");
}

function main() {
  ensureDir(OUT_DIR);
  ensureDir(VERTICAL_DIR);
  ensureDir(FLOW_DIR);
  ensureDir(ALL_DIR);

  const byVertical = {
    telefon: [],
    kozmetik: [],
    beyaz_esya: [],
    moda: [],
  };
  const byFlow = {
    daraltma: [],
    genisletme: [],
    reset: [],
  };
  const all = [];
  let id = 1;

  for (let i = 0; i < 100; i++) {
    const scenario = buildScenario(
      id++,
      "telefon",
      "daraltma",
      phoneConfig.dominantSlug,
      phoneConfig.categoryPath,
      phoneNarrowScenario(i),
    );
    byVertical.telefon.push(scenario);
    byFlow.daraltma.push(scenario);
    all.push(scenario);
  }
  for (let i = 0; i < 100; i++) {
    const scenario = buildScenario(
      id++,
      "telefon",
      "genisletme",
      phoneConfig.dominantSlug,
      phoneConfig.categoryPath,
      phoneBroadenScenario(i),
    );
    byVertical.telefon.push(scenario);
    byFlow.genisletme.push(scenario);
    all.push(scenario);
  }
  for (let i = 0; i < 100; i++) {
    const scenario = buildScenario(
      id++,
      "telefon",
      "reset",
      phoneConfig.dominantSlug,
      phoneConfig.categoryPath,
      phoneResetScenario(i),
    );
    byVertical.telefon.push(scenario);
    byFlow.reset.push(scenario);
    all.push(scenario);
  }

  for (const flow of ["daraltma", "genisletme", "reset"]) {
    for (let i = 0; i < 100; i++) {
      const built =
        flow === "daraltma"
          ? narrowScenarioForFamily(cosmeticsConfig, i)
          : flow === "genisletme"
            ? broadenScenarioForFamily(cosmeticsConfig, i)
            : resetScenarioForFamily(cosmeticsConfig, i);
      const scenario = buildScenario(
        id++,
        "kozmetik",
        flow,
        built.categorySlug,
        cosmeticsConfig.categoryPath,
        built.turns,
      );
      byVertical.kozmetik.push(scenario);
      byFlow[flow].push(scenario);
      all.push(scenario);
    }
  }

  for (const flow of ["daraltma", "genisletme", "reset"]) {
    for (let i = 0; i < 100; i++) {
      const built =
        flow === "daraltma"
          ? narrowScenarioForFamily(whiteGoodsConfig, i)
          : flow === "genisletme"
            ? broadenScenarioForFamily(whiteGoodsConfig, i)
            : resetScenarioForFamily(whiteGoodsConfig, i);
      const scenario = buildScenario(
        id++,
        "beyaz_esya",
        flow,
        built.categorySlug,
        whiteGoodsConfig.categoryPath,
        built.turns,
      );
      byVertical.beyaz_esya.push(scenario);
      byFlow[flow].push(scenario);
      all.push(scenario);
    }
  }

  for (const flow of ["daraltma", "genisletme", "reset"]) {
    for (let i = 0; i < 100; i++) {
      const built =
        flow === "daraltma"
          ? narrowScenarioForFamily(fashionConfig, i)
          : flow === "genisletme"
            ? broadenScenarioForFamily(fashionConfig, i)
            : resetScenarioForFamily(fashionConfig, i);
      const scenario = buildScenario(
        id++,
        "moda",
        flow,
        built.categorySlug,
        fashionConfig.categoryPath,
        built.turns,
      );
      byVertical.moda.push(scenario);
      byFlow[flow].push(scenario);
      all.push(scenario);
    }
  }

  const files = {
    all: path.join(ALL_DIR, "chatbot_dialogs_intent_all_1200.jsonl"),
    verticals: {
      telefon: path.join(VERTICAL_DIR, "chatbot_dialogs_telefon_300.jsonl"),
      kozmetik: path.join(VERTICAL_DIR, "chatbot_dialogs_kozmetik_300.jsonl"),
      beyaz_esya: path.join(VERTICAL_DIR, "chatbot_dialogs_beyaz_esya_300.jsonl"),
      moda: path.join(VERTICAL_DIR, "chatbot_dialogs_moda_300.jsonl"),
    },
    flows: {
      daraltma: path.join(FLOW_DIR, "chatbot_dialogs_daraltma_400.jsonl"),
      genisletme: path.join(FLOW_DIR, "chatbot_dialogs_genisletme_400.jsonl"),
      reset: path.join(FLOW_DIR, "chatbot_dialogs_reset_400.jsonl"),
    },
  };

  writeJsonl(files.all, all);
  for (const [vertical, rows] of Object.entries(byVertical)) {
    writeJsonl(files.verticals[vertical], rows);
  }
  for (const [flow, rows] of Object.entries(byFlow)) {
    writeJsonl(files.flows[flow], rows);
  }

  const manifest = {
    generated_at: new Date().toISOString(),
    total_scenarios: all.length,
    total_user_queries: all.length * 5,
    verticals: Object.keys(byVertical),
    flows: Object.keys(byFlow),
    counts: {
      by_vertical: Object.fromEntries(Object.entries(byVertical).map(([key, value]) => [key, value.length])),
      by_flow: Object.fromEntries(Object.entries(byFlow).map(([key, value]) => [key, value.length])),
    },
    files,
  };

  fs.writeFileSync(path.join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  writeReadme(manifest);

  console.log(`Generated ${all.length} scenarios into ${OUT_DIR}`);
  console.log(JSON.stringify(manifest.counts, null, 2));
}

main();
