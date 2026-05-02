import fs from "node:fs";
import path from "node:path";

export type IntentExampleTurn = {
  role: "user" | "bot";
  msg: string;
  intent_label?: string;
  expected_intent_label?: string;
  expected_state?: {
    category_slug?: string | null;
    brand_filter?: string[];
    variant_color_patterns?: string[];
    variant_storage_patterns?: string[];
    price_min?: number | null;
    price_max?: number | null;
  };
  expected_spec_filters?: Record<string, unknown>;
  expected_sort_mode?: string | null;
  expected_action?: string;
};

export type IntentExampleScenario = {
  id: number;
  scenario_key: string;
  vertical: "telefon" | "kozmetik" | "beyaz_esya" | "moda";
  test_bucket:
    | "daraltma"
    | "genisletme"
    | "reset"
    | "switch_category"
    | "sort_only"
    | "accessory_followup"
    | "comparison"
    | "clarify"
    | "bad_path_avoidance";
  category_slug: string;
  category_path: string;
  turn_count: number;
  turns: IntentExampleTurn[];
};

type Vertical = IntentExampleScenario["vertical"];
type Flow = IntentExampleScenario["test_bucket"];

const DATASET_DIR = path.join(
  process.cwd(),
  "tests",
  "chatbot",
  "fixtures",
  "generated",
  "all"
);

const VERTICAL_HINTS: Record<Vertical, RegExp> = {
  telefon:
    /\b(telefon|iphone|galaxy|samsung|xiaomi|redmi|honor|oppo|vivo|poco|realme|cep telefonu|akilli telefon)\b/i,
  kozmetik:
    /\b(parfum|parfüm|deodorant|serum|nemlendirici|sampuan|şampuan|gunes kremi|güneş kremi|ruj|cilt|makyaj)\b/i,
  beyaz_esya:
    /\b(camasir makinesi|çamaşır makinesi|buzdolabi|buzdolabı|bulasik makinesi|bulaşık makinesi|klima|kurutma makinesi|firin|fırın)\b/i,
  moda:
    /\b(sneaker|ayakkabi|ayakkabı|elbise|mont|ceket|gomlek|gömlek|tisort|tişört|pantolon|etek|moda|beden)\b/i,
};

const FLOW_HINTS: Record<Flow, RegExp[]> = {
  daraltma: [
    /\b(olsun|istiyorum|tercihim|filtrele|alti|altı|arasi|arası|bant|bandi|bandı)\b/i,
  ],
  genisletme: [
    /\b(fark etmez|farketmez|şart değil|sart degil|genel|alternatif|diger|diğer|başka seçenek|baska secenek)\b/i,
  ],
  reset: [
    /\b(bosver|boşver|gecelim|geçelim|donelim|dönelim|vazgectim|vazgeçtim|bunu birak|bunu bırak|simdi|şimdi)\b/i,
  ],
  switch_category: [
    /\b(telefon degil|telefon değil|yerine|tarafina gecelim|tarafına geçelim|kategori degistirelim|kategori değiştirelim)\b/i,
  ],
  sort_only: [
    /\b(en populer|en popüler|en ucuz|sirala|sırala|stokta olanlar|puani yuksek|puanı yüksek|öne al|öne cikar|öne çıkar)\b/i,
  ],
  accessory_followup: [
    /\b(kilif|kılıf|kapak|sarj|şarj|kulaklik|kulaklık|aksesuar|kayis|kayış|adapt[oö]r)\b/i,
  ],
  comparison: [
    /\b(karsilastir|karşılaştır|hangisi daha iyi|mi yoksa|arasinda kaldim|arasında kaldım|farki ne|farkı ne)\b/i,
  ],
  clarify: [
    /\b(bir sey oner|bir şey öner|yardim et|yardım et|karar veremedim|net degilim|net değilim)\b/i,
  ],
  bad_path_avoidance: [
    /\b(kirmizi|kırmızı|kahve|tekrar|yeniden|genel olarak|aynı kategori|ayni kategori)\b/i,
  ],
};

const TOKEN_SPLIT_RE = /[^a-zA-Z0-9ığüşöçİĞÜŞÖÇ]+/;
const STOP_WORDS = new Set([
  "ve",
  "ile",
  "icin",
  "için",
  "gibi",
  "olsun",
  "var",
  "mu",
  "mi",
  "mı",
  "bir",
  "da",
  "de",
  "bakiyorum",
  "bakıyorum",
  "ariyorum",
  "arıyorum",
  "goster",
  "göster",
]);

let cachedExamples: IntentExampleScenario[] | null = null;

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .trim();
}

function tokenize(value: string): string[] {
  return normalize(value)
    .split(TOKEN_SPLIT_RE)
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
}

function loadExamples(): IntentExampleScenario[] {
  if (cachedExamples) return cachedExamples;
  if (!fs.existsSync(DATASET_DIR)) {
    cachedExamples = [];
    return cachedExamples;
  }

  const files = fs
    .readdirSync(DATASET_DIR)
    .filter((file) => file.endsWith(".jsonl"))
    .map((file) => path.join(DATASET_DIR, file));

  const rows: IntentExampleScenario[] = [];
  for (const file of files) {
    const lines = fs
      .readFileSync(file, "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    for (const line of lines) {
      try {
        rows.push(JSON.parse(line) as IntentExampleScenario);
      } catch {
        // keep selector resilient if a generated row is malformed
      }
    }
  }

  cachedExamples = rows;
  return cachedExamples;
}

function inferVertical(
  message: string,
  conversationHistory: Array<{ role: string; content: string }>
): Vertical | null {
  const haystack = [message, ...conversationHistory.map((entry) => entry.content)].join(" ");
  for (const [vertical, pattern] of Object.entries(VERTICAL_HINTS) as Array<[Vertical, RegExp]>) {
    if (pattern.test(haystack)) return vertical;
  }
  return null;
}

function inferFlow(
  message: string,
  conversationHistory: Array<{ role: string; content: string }>
): Flow | null {
  const haystack = [message, ...conversationHistory.slice(-3).map((entry) => entry.content)].join(" ");
  for (const [flow, patterns] of Object.entries(FLOW_HINTS) as Array<[Flow, RegExp[]]>) {
    if (patterns.some((pattern) => pattern.test(haystack))) return flow;
  }
  return null;
}

function scenarioScore(
  scenario: IntentExampleScenario,
  tokens: string[],
  preferredVertical: Vertical | null,
  preferredFlow: Flow | null
): number {
  let score = 0;

  if (preferredVertical && scenario.vertical === preferredVertical) score += 30;
  if (preferredFlow && scenario.test_bucket === preferredFlow) score += 22;

  const scenarioText = scenario.turns.map((turn) => turn.msg).join(" ");
  const scenarioTokens = new Set(tokenize(scenarioText));
  for (const token of tokens) {
    if (scenarioTokens.has(token)) score += 5;
    if (scenario.category_slug.includes(token)) score += 3;
  }

  const botTurns = scenario.turns.filter((turn) => turn.role === "bot");
  const lastBot = botTurns[botTurns.length - 1];
  if (lastBot?.expected_intent_label === "reset" && preferredFlow === "reset") score += 8;
  if (lastBot?.expected_intent_label === "refine" && preferredFlow === "daraltma") score += 6;
  if (lastBot?.expected_intent_label === "broaden" && preferredFlow === "genisletme") score += 6;
  if (lastBot?.expected_intent_label === "sort_only" && preferredFlow === "sort_only") score += 6;

  return score;
}

function compactScenario(scenario: IntentExampleScenario): IntentExampleScenario {
  return {
    ...scenario,
    turns: scenario.turns.slice(0, 6),
  };
}

export function selectIntentExamples(
  message: string,
  conversationHistory: Array<{ role: string; content: string }> = [],
  limit = 3
): IntentExampleScenario[] {
  const scenarios = loadExamples();
  if (scenarios.length === 0) return [];

  const preferredVertical = inferVertical(message, conversationHistory);
  const preferredFlow = inferFlow(message, conversationHistory);
  const tokens = tokenize(
    [message, ...conversationHistory.slice(-2).map((entry) => entry.content)].join(" ")
  );

  const scored = scenarios
    .map((scenario) => ({
      scenario,
      score: scenarioScore(scenario, tokens, preferredVertical, preferredFlow),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => compactScenario(entry.scenario));

  if (scored.length > 0) return scored;

  return scenarios
    .filter((scenario) => !preferredVertical || scenario.vertical === preferredVertical)
    .slice(0, limit)
    .map(compactScenario);
}

export function formatIntentExamples(examples: IntentExampleScenario[]): string {
  if (examples.length === 0) return "(ilgili örnek konuşma bulunamadı)";

  return examples
    .map((scenario, index) => {
      const turns = scenario.turns
        .map((turn) => {
          if (turn.role === "user") {
            return `Kullanıcı: ${turn.msg}${turn.intent_label ? ` [intent=${turn.intent_label}]` : ""}`;
          }

          const parts = [
            `Bot: ${turn.msg}`,
            turn.expected_intent_label ? `intent=${turn.expected_intent_label}` : null,
            turn.expected_state?.category_slug ? `category=${turn.expected_state.category_slug}` : null,
            turn.expected_action ? `action=${turn.expected_action}` : null,
          ].filter(Boolean);
          return parts.join(" | ");
        })
        .join("\n");

      return `ÖRNEK ${index + 1} (${scenario.vertical}/${scenario.test_bucket}):\n${turns}`;
    })
    .join("\n\n");
}

export function clearIntentExampleCache(): void {
  cachedExamples = null;
}
