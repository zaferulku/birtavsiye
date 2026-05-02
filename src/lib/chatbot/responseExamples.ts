import fs from "node:fs";
import path from "node:path";
import type { StructuredIntent } from "./intentParser";

export type ResponseStyleExample = {
  id: number;
  vertical: "telefon" | "kozmetik" | "beyaz_esya" | "moda";
  style_bucket:
    | "product_list"
    | "comparison"
    | "clarify"
    | "no_results"
    | "accessory"
    | "broad_recommendation";
  category_slug: string;
  user_message: string;
  response_rule: string;
  assistant_reply: string;
};

type StyleBucket = ResponseStyleExample["style_bucket"];

const STYLE_DATASET_DIR = path.join(
  process.cwd(),
  "tests",
  "chatbot",
  "fixtures",
  "generated",
  "style"
);

let cachedExamples: ResponseStyleExample[] | null = null;

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
    .split(/[^a-z0-9ığüşöç]+/i)
    .filter((token) => token.length >= 2);
}

function loadExamples(): ResponseStyleExample[] {
  if (cachedExamples) return cachedExamples;
  if (!fs.existsSync(STYLE_DATASET_DIR)) {
    cachedExamples = [];
    return cachedExamples;
  }

  const files = fs
    .readdirSync(STYLE_DATASET_DIR)
    .filter((file) => file.endsWith(".jsonl"))
    .map((file) => path.join(STYLE_DATASET_DIR, file));

  cachedExamples = files.flatMap((file) =>
    fs
      .readFileSync(file, "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .flatMap((line) => {
        try {
          return [JSON.parse(line) as ResponseStyleExample];
        } catch {
          return [];
        }
      })
  );

  return cachedExamples;
}

function detectBucket(
  userMessage: string,
  intent: StructuredIntent | null,
  hasProducts: boolean
): StyleBucket {
  const normalized = normalize(userMessage);

  if (!hasProducts) {
    if (intent?.is_too_vague) return "clarify";
    return "no_results";
  }
  if (/\b(karsilastir|karşılaştır|hangisi daha iyi|mi yoksa|farki ne|farkı ne)\b/i.test(normalized)) {
    return "comparison";
  }
  if (/\b(kilif|kılıf|kapak|sarj|şarj|kulaklik|kulaklık|aksesuar|kayis|kayış|adapt[oö]r)\b/i.test(normalized)) {
    return "accessory";
  }
  if (/\b(tavsiye ver|oner|öner|segment|ekonomik|premium|denge)\b/i.test(normalized)) {
    return "broad_recommendation";
  }
  return "product_list";
}

function scoreExample(
  example: ResponseStyleExample,
  bucket: StyleBucket,
  categorySlug: string | null,
  tokens: string[]
): number {
  let score = 0;
  if (example.style_bucket === bucket) score += 25;
  if (categorySlug && example.category_slug === categorySlug) score += 20;

  const exampleTokens = new Set(tokenize(`${example.user_message} ${example.assistant_reply}`));
  for (const token of tokens) {
    if (exampleTokens.has(token)) score += 4;
  }
  return score;
}

export function selectResponseStyleExamples(
  userMessage: string,
  intent: StructuredIntent | null,
  hasProducts: boolean,
  limit = 2
): ResponseStyleExample[] {
  const examples = loadExamples();
  if (examples.length === 0) return [];

  const bucket = detectBucket(userMessage, intent, hasProducts);
  const categorySlug = intent?.category_slug ?? null;
  const tokens = tokenize(userMessage);

  const scored = examples
    .map((example) => ({
      example,
      score: scoreExample(example, bucket, categorySlug, tokens),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.example);

  if (scored.length > 0) return scored;
  return examples.filter((example) => example.style_bucket === bucket).slice(0, limit);
}

export function formatResponseStyleExamples(examples: ResponseStyleExample[]): string {
  if (examples.length === 0) return "(ilgili cevap stili örneği bulunamadı)";

  return examples
    .map(
      (example, index) =>
        `STIL ORNEGI ${index + 1} (${example.vertical}/${example.style_bucket})\n` +
        `Kullanici: ${example.user_message}\n` +
        `Kural: ${example.response_rule}\n` +
        `Bot: ${example.assistant_reply}`
    )
    .join("\n\n");
}

export function clearResponseStyleExampleCache(): void {
  cachedExamples = null;
}
