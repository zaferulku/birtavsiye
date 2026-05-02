import { readFileSync } from 'node:fs';
const text = readFileSync('.env.local', 'utf8');
text.split(/\r?\n/).forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
});
const qpMod = await import('../src/lib/search/queryParser');
const validMod = await import('../src/lib/chatbot/categoryValidation');
const cstateMod = await import('../src/lib/chatbot/conversationState');
const intentMod = await import('../src/lib/chatbot/intentTypes');

const message = "spor çantası arıyorum";
const parsed = qpMod.parseQuery(message, []);
console.log("parsed.category_slugs:", parsed.category_slugs);
const validParsed = await validMod.validateOrFuzzyMatchSlug(parsed.category_slugs?.[0] ?? null, 1);
console.log("validParsed:", validParsed);
const heur = intentMod.heuristicClassify(message);
console.log("heuristic:", heur);

const features: string[] = [];
const msgLower = message.toLowerCase();
if (/(spor(luk|ty)?|aktivewear|active ?wear)/i.test(msgLower)) features.push("spor");
console.log("features:", features);

const rawIntent = {
  intent_type: heur ?? "product_search",
  category_slug: validParsed,
  brand_filter: parsed.brand ? [parsed.brand] : [],
  variant_color_patterns: parsed.color ? [parsed.color] : [],
  variant_storage_patterns: parsed.storage ? [parsed.storage] : [],
  price_min: parsed.price_min ?? null,
  price_max: parsed.price_max ?? null,
  features: features.length > 0 ? features : undefined,
  installment_months_min: null,
  keywords: parsed.keywords ?? [],
};
console.log("rawIntent:", JSON.stringify(rawIntent, null, 2));

const prev = cstateMod.rebuildStateFromHistory([
  { role: "user", content: "selam claude" },
  { role: "assistant", content: "Merhaba! Size nasıl yardımcı olabilirim?" },
]);
console.log("prev:", JSON.stringify(prev, null, 2));

const { next, action } = cstateMod.mergeIntent(prev, rawIntent, message, null);
console.log("merged:", JSON.stringify(next, null, 2));
console.log("action:", action);
