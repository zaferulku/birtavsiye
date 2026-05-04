import assert from "node:assert/strict";
import { mergeIntent, emptyState, type ConversationState, type RawIntent } from "../../src/lib/chatbot/conversationState";
import {
  buildEcommerceSearchAudit,
  resolveContextualEcommerceIntent,
  type EcommerceSearchAuditState,
} from "../../src/lib/chatbot/ecommerceIntentRules";
import { parseQuery, type CategoryRef } from "../../src/lib/search/queryParser";
import {
  createEcommerceIntentScenarios,
  type EcommerceIntentScenario,
  type ExpectedAudit,
} from "./ecommerceIntentScenarioFactory";

const categories: CategoryRef[] = [
  cat("akilli-telefon", "Akilli Telefon", ["akilli telefon", "cep telefonu", "telefon", "iphone", "galaxy"]),
  cat("elektronik/telefon/kilif", "Telefon Kilifi", ["telefon kilifi", "iphone kilifi", "kilif"]),
  cat("elektronik/telefon/sarj-kablo", "Sarj Cihazi & Kablo", ["sarj aleti", "sarj cihazi", "adaptör"]),
  cat("laptop", "Laptop", ["laptop", "notebook", "macbook"]),
  cat("elektronik/bilgisayar-tablet/laptop", "Laptop", ["oyuncu laptopu", "gaming laptop"]),
  cat("elektronik/telefon/aksesuar/laptop-cantasi", "Laptop Cantasi", ["laptop cantasi"]),
  cat("elektronik/bilgisayar-tablet/bilesenler/cevre-birim/mouse", "Mouse", ["mouse", "fare", "oyuncu mouse"]),
  cat("elektronik/telefon/aksesuar/mouse-pad", "Mouse Pad", ["mouse pad", "mousepad"]),
  cat("kucuk-ev-aletleri/mutfak/kahve-makinesi", "Kahve Makinesi", ["kahve makinesi", "filtre kahve makinesi"]),
  cat("supermarket/kahve/filtre-kahve", "Filtre Kahve", ["filtre kahve"]),
  cat("supermarket/gida-icecek/kahve", "Kahve", ["kahve", "cekirdek kahve"]),
  cat("spor-outdoor/fitness/yoga-pilates", "Yoga & Pilates", ["yoga mati", "mat"]),
  cat("ev-yasam/temizlik/cop-torbasi-temizlik-araclari/paspas", "Paspas", ["kapi mati", "paspas"]),
  cat("kucuk-ev-aletleri/mutfak/airfryer", "Airfryer", ["airfryer", "hava fritozu"]),
  cat("supermarket/konserve-sos/zeytinyagi", "Zeytinyagi", ["fritoz yagi", "kizartma yagi"]),
  cat("elektronik/oyun/konsol/oyuncu-koltuk", "Oyuncu Koltuk", ["oyuncu koltugu", "gaming koltuk"]),
  cat("parfum", "Parfum", ["parfum"]),
  cat("moda/erkek-ayakkabi/sneaker", "Ayakkabi", ["ayakkabi", "sneaker"]),
  cat("kozmetik/makyaj/ruj", "Ruj", ["ruj", "mat ruj"]),
];

function cat(slug: string, name: string, keywords: string[]): CategoryRef {
  return {
    id: slug,
    slug,
    name,
    keywords,
    exclude_keywords: null,
    related_brands: null,
  };
}

function rawIntentFrom(message: string, previousState: ConversationState): {
  rawIntent: RawIntent;
  contextualIntent: ReturnType<typeof resolveContextualEcommerceIntent>;
} {
  const contextualIntent = resolveContextualEcommerceIntent({ message, previousState });
  const parsed = parseQuery(contextualIntent.searchQuery || message, categories);

  const rawIntent: RawIntent = {
    intent_type: "product_search",
    category_slug: contextualIntent.categorySlug ?? parsed.category_slugs?.[0] ?? null,
    brand_filter: contextualIntent.brand
      ? [contextualIntent.brand]
      : parsed.brand
        ? [parsed.brand]
        : [],
    variant_color_patterns: contextualIntent.color
      ? [contextualIntent.color]
      : parsed.color
        ? [parsed.color]
        : [],
    variant_storage_patterns: contextualIntent.storage
      ? [contextualIntent.storage]
      : parsed.storage
        ? [parsed.storage]
        : [],
    price_min: contextualIntent.priceRange.min ?? parsed.price_min,
    price_max: contextualIntent.priceRange.max ?? parsed.price_max,
    features: contextualIntent.features.length > 0 ? contextualIntent.features : undefined,
    sort_by: contextualIntent.sortBy,
    raw_query: contextualIntent.searchQuery,
    keywords: parsed.keywords,
    clear_brand_filter: contextualIntent.rawIntentPatch.clear_brand_filter,
    clear_color_filter: contextualIntent.rawIntentPatch.clear_color_filter,
    clear_storage_filter: contextualIntent.rawIntentPatch.clear_storage_filter,
    clear_price_range: contextualIntent.rawIntentPatch.clear_price_range,
  };

  return { rawIntent, contextualIntent };
}

function runScenario(scenario: EcommerceIntentScenario): void {
  let state = emptyState();

  scenario.messages.forEach((message, index) => {
    const previousState = state;
    const { rawIntent, contextualIntent } = rawIntentFrom(message, previousState);
    const { next, action } = mergeIntent(previousState, rawIntent, message, null);
    const audit = buildEcommerceSearchAudit({
      message,
      previousState,
      nextState: next,
      mergeAction: action,
      contextualIntent,
    });

    assertExpectedAudit({
      scenario,
      turnIndex: index,
      message,
      audit,
      action,
      expected: scenario.expectedAudit[index] ?? {},
    });
    state = next;
  });
}

function assertExpectedAudit(options: {
  scenario: EcommerceIntentScenario;
  turnIndex: number;
  message: string;
  audit: EcommerceSearchAuditState;
  action: string;
  expected: ExpectedAudit;
}): void {
  const prefix = `[${options.scenario.name} / turn ${options.turnIndex + 1} "${options.message}"]`;
  const expected = options.expected;

  if (expected.activeIntent !== undefined) assert.equal(options.audit.activeIntent, expected.activeIntent, `${prefix} activeIntent`);
  if (expected.category !== undefined) assert.equal(options.audit.category, expected.category, `${prefix} category`);
  if (expected.productType !== undefined) assert.equal(options.audit.productType, expected.productType, `${prefix} productType`);
  if (expected.brand !== undefined) assert.equal(options.audit.brand, expected.brand, `${prefix} brand`);
  if (expected.color !== undefined) assert.equal(options.audit.color, expected.color, `${prefix} color`);
  if (expected.storage !== undefined) assert.equal(options.audit.filters.storage, expected.storage, `${prefix} storage`);
  if (expected.sort !== undefined) assert.equal(options.audit.sort, expected.sort, `${prefix} sort`);
  if (expected.searchQuery !== undefined) assert.equal(options.audit.searchQuery, expected.searchQuery, `${prefix} searchQuery`);
  if (expected.searchActionHref !== undefined) assert.equal(options.audit.searchAction.href, expected.searchActionHref, `${prefix} searchAction.href`);
  if (expected.shouldResetContext !== undefined) assert.equal(options.audit.shouldResetContext, expected.shouldResetContext, `${prefix} shouldResetContext`);
  if (expected.shouldKeepContext !== undefined) assert.equal(options.audit.shouldKeepContext, expected.shouldKeepContext, `${prefix} shouldKeepContext`);
  if (expected.exactProduct !== undefined) assert.equal(options.audit.filters.exactProduct, expected.exactProduct, `${prefix} exactProduct`);
  if (expected.model !== undefined) assert.equal(options.audit.filters.model, expected.model, `${prefix} model`);
  if (expected.action !== undefined) assert.equal(options.action, expected.action, `${prefix} merge action`);
  if (expected.priceRange !== undefined) {
    assert.deepEqual(options.audit.priceRange, expected.priceRange, `${prefix} priceRange`);
  }
}

const scenarios = createEcommerceIntentScenarios();
let passed = 0;
const buckets = new Map<string, number>();

for (const scenario of scenarios) {
  runScenario(scenario);
  passed += 1;
  buckets.set(scenario.bucket, (buckets.get(scenario.bucket) ?? 0) + 1);
}

assert.ok(scenarios.length >= 40, `scenario coverage too small: ${scenarios.length}`);
assert.ok(
  scenarios.some((scenario) => scenario.bucket === "product_disambiguation"),
  "missing product disambiguation bucket",
);
assert.ok(
  scenarios.some((scenario) => scenario.bucket === "exact_product_search"),
  "missing exact product search bucket",
);

console.log(`Ecommerce intent scenarios passed: ${passed}`);
for (const [bucket, count] of [...buckets.entries()].sort()) {
  console.log(`  ${bucket}: ${count}`);
}
