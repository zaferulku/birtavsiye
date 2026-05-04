export type ChatBudgetSignal = {
  min: number | null;
  max: number | null;
  qualitative: boolean;
};

export type ChatIntentSignals = {
  wantsRecommendation: boolean;
  wantsComparison: boolean;
  productNeed: boolean;
  budget: ChatBudgetSignal;
  usageTerms: string[];
  featureTags: string[];
};

const RECOMMENDATION_PATTERNS = [
  /\boner\b/i,
  /\boneri\b/i,
  /\bonerir misin\b/i,
  /\btavsiye\b/i,
  /\ben iyi\b/i,
  /\bhangisini almal/i,
  /\bne almal/i,
  /\bkaliteli\b/i,
  /\bfiyat performans\b/i,
];

const COMPARISON_PATTERNS = [
  /\bkarsilastir\b/i,
  /\bkarsilastirma\b/i,
  /\bvs\b/i,
  /\bmi yoksa\b/i,
  /\bhangisi daha\b/i,
  /\bile\b.+\b(karsilastir|fark|hangisi)\b/i,
];

const NEED_PATTERNS = [
  /\blazim\b/i,
  /\bihtiyac/i,
  /\bariyorum\b/i,
  /\bbakiyorum\b/i,
  /\balacagim\b/i,
  /\balmak istiyorum\b/i,
];

const QUALITATIVE_BUDGET_PATTERNS = [
  /\bcok pahali olmayan\b/i,
  /\bpahali olmayan\b/i,
  /\buygun fiyatli\b/i,
  /\buygun\b/i,
  /\bucuz\b/i,
  /\bhesapli\b/i,
  /\bfiyat performans\b/i,
  /\bbutce dostu\b/i,
];

const QUERY_FILLER_PATTERNS = [
  /\boner(ir misin|i|mek)?\b/gi,
  /\btavsiye( ver| eder misin|si)?\b/gi,
  /\ben iyi\b/gi,
  /\bhangisini almal(iyim|ıyım)?\b/gi,
  /\bne almal(iyim|ıyım)?\b/gi,
  /\bcok pahali olmayan\b/gi,
  /\bpahali olmayan\b/gi,
  /\buygun fiyatli\b/gi,
  /\bfiyat performans\b/gi,
  /\blazim\b/gi,
  /\bihtiyac(im|ım)?\b/gi,
  /\bariyorum\b/gi,
  /\bbakiyorum\b/gi,
  /\balmak istiyorum\b/gi,
  /\bkarsilastir(ma)?\b/gi,
  /\bhangisi daha iyi\b/gi,
];

const FILLER_TOKENS = new Set([
  "bana",
  "icin",
  "icin",
  "lazim",
  "lazım",
  "oner",
  "öner",
  "oneri",
  "öneri",
  "tavsiye",
  "ver",
  "goster",
  "göster",
  "almak",
  "istiyorum",
  "kaliteli",
  "uygun",
  "tl",
  "lira",
  "ye",
  "ya",
]);

const TOKEN_ALIASES: Record<string, string> = {
  telefonu: "telefon",
  telefonlar: "telefon",
  telefonlari: "telefon",
  sarz: "sarj",
  makinasi: "makinesi",
  aletti: "aleti",
};

const USAGE_SIGNALS: Array<{
  triggers: string[];
  terms: string[];
  features: string[];
}> = [
  {
    triggers: ["oyun", "gaming", "fps"],
    terms: ["oyun", "performans"],
    features: ["oyun"],
  },
  {
    triggers: ["ofis", "is icin", "is", "calisma"],
    terms: ["ofis", "gunluk kullanim"],
    features: ["ofis"],
  },
  {
    triggers: ["anne", "annem", "anneme", "baba", "babam", "hediye"],
    terms: ["pratik", "kolay kullanim", "hafif"],
    features: ["hediye", "kolay_kullanim"],
  },
  {
    triggers: ["evcil hayvan", "kedi", "kopek", "tuy"],
    terms: ["evcil hayvan", "guclu cekis"],
    features: ["evcil_hayvan"],
  },
  {
    triggers: ["sessiz", "az ses", "gece"],
    terms: ["sessiz", "dusuk ses"],
    features: ["sessiz"],
  },
  {
    triggers: ["kamera", "fotograf", "video"],
    terms: ["kamera", "fotograf", "video"],
    features: ["kamera"],
  },
  {
    triggers: ["pil", "batarya"],
    terms: ["uzun pil"],
    features: ["pil"],
  },
  {
    triggers: ["sarj", "hizli sarj"],
    terms: ["hizli sarj"],
    features: ["hizli_sarj"],
  },
];

const CATEGORY_HINTS: Array<{ slug: string; phrases: string[]; anchor: string }> = [
  {
    slug: "akilli-telefon",
    phrases: ["akilli telefon", "cep telefonu", "telefon", "iphone", "galaxy", "redmi"],
    anchor: "telefon",
  },
  {
    slug: "laptop",
    phrases: ["oyun laptop", "dizustu bilgisayar", "dizustu", "notebook", "laptop", "macbook"],
    anchor: "laptop",
  },
  {
    slug: "sarj-cihazi",
    phrases: ["sarj aleti", "sarj cihazi", "sarz aleti", "sarz aletti", "adaptör", "adaptor", "charger"],
    anchor: "sarj aleti",
  },
  {
    slug: "kucuk-ev-aletleri",
    phrases: ["kucuk ev aleti", "küçük ev aleti", "ev aleti"],
    anchor: "kucuk ev aleti",
  },
  {
    slug: "camasir-makinesi",
    phrases: ["camasir makinesi", "çamaşır makinesi"],
    anchor: "camasir makinesi",
  },
  {
    slug: "bulasik-makinesi",
    phrases: ["bulasik makinesi", "bulaşık makinesi"],
    anchor: "bulasik makinesi",
  },
  {
    slug: "buzdolabi",
    phrases: ["buzdolabi", "buzdolabı"],
    anchor: "buzdolabi",
  },
  {
    slug: "supurge",
    phrases: ["dikey supurge", "torbasiz supurge", "supurge", "süpürge"],
    anchor: "supurge",
  },
  {
    slug: "robot-supurge",
    phrases: ["robot supurge", "robot süpürge"],
    anchor: "robot supurge",
  },
  {
    slug: "kahve-makinesi",
    phrases: ["kahve makinesi", "kahve makinasi", "espresso makinesi", "filtre kahve makinesi"],
    anchor: "kahve makinesi",
  },
  {
    slug: "televizyon",
    phrases: ["televizyon", "smart tv", "tv"],
    anchor: "televizyon",
  },
  {
    slug: "monitor",
    phrases: ["monitor", "monitör"],
    anchor: "monitor",
  },
  {
    slug: "kulaklik",
    phrases: ["kulaklik", "kulaklık", "airpods"],
    anchor: "kulaklik",
  },
];

export function normalizeChatSignalText(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0131/g, "i")
    .replace(/\u0130/g, "i")
    .replace(/[^a-z0-9\s/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectChatIntentSignals(message: string): ChatIntentSignals {
  const normalized = normalizeChatSignalText(message);
  const usageTerms = new Set<string>();
  const featureTags = new Set<string>();

  for (const signal of USAGE_SIGNALS) {
    if (signal.triggers.some((trigger) => normalized.includes(normalizeChatSignalText(trigger)))) {
      signal.terms.forEach((term) => usageTerms.add(term));
      signal.features.forEach((feature) => featureTags.add(feature));
    }
  }

  const budget = extractBudgetSignal(normalized);
  return {
    wantsRecommendation: RECOMMENDATION_PATTERNS.some((pattern) => pattern.test(normalized)),
    wantsComparison: COMPARISON_PATTERNS.some((pattern) => pattern.test(normalized)),
    productNeed: NEED_PATTERNS.some((pattern) => pattern.test(normalized)),
    budget,
    usageTerms: Array.from(usageTerms),
    featureTags: Array.from(featureTags),
  };
}

export function resolveChatbotCategoryHint(message: string): string | null {
  const normalized = normalizeChatSignalText(message);
  if (!normalized) return null;

  let best: { slug: string; score: number } | null = null;
  for (const hint of CATEGORY_HINTS) {
    for (const phrase of hint.phrases) {
      const normalizedPhrase = normalizeChatSignalText(phrase);
      if (!normalizedPhrase || !normalized.includes(normalizedPhrase)) continue;
      const score = normalizedPhrase.length;
      if (!best || score > best.score) {
        best = { slug: hint.slug, score };
      }
    }
  }

  return best?.slug ?? null;
}

export function buildIntentFocusedSearchMessage(options: {
  originalMessage: string;
  searchMessage: string;
  categorySlug?: string | null;
  fallbackCategorySlug?: string | null;
  signals?: ChatIntentSignals;
}): string {
  const signals = options.signals ?? detectChatIntentSignals(options.originalMessage);
  let focused = normalizeChatSignalText(options.searchMessage || options.originalMessage);

  if (signals.budget.min != null || signals.budget.max != null) {
    focused = stripBudgetPhrases(focused);
  }
  for (const pattern of QUERY_FILLER_PATTERNS) {
    focused = focused.replace(pattern, " ");
  }

  const tokens = focused
    .split(/\s+/)
    .map((token) => token.trim())
    .map((token) => TOKEN_ALIASES[token] ?? token)
    .filter((token) => token.length > 1 && !FILLER_TOKENS.has(token));

  const parts = [tokens.join(" ")];
  const anchor = getCategoryAnchor(options.categorySlug ?? options.fallbackCategorySlug);
  if (anchor && !hasPhraseTokens(parts.join(" "), anchor)) {
    parts.push(anchor);
  }

  if (signals.budget.max != null) {
    parts.push(`${signals.budget.max} tl alti`);
  }
  if (signals.budget.min != null) {
    parts.push(`${signals.budget.min} tl ustu`);
  }
  if (signals.budget.qualitative) {
    parts.push("uygun fiyat");
  }
  parts.push(...signals.usageTerms);

  return uniqueNormalizedPhrases(parts)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractBudgetSignal(normalized: string): ChatBudgetSignal {
  let min: number | null = null;
  let max: number | null = null;

  const range = normalized.match(/(\d+(?:[.,]\d+)?)\s*(?:-|ile)\s*(\d+(?:[.,]\d+)?)\s*(bin\b|k\b)?\s*(?:tl|lira)?/i);
  if (range && /\b(tl|lira|bin|k|butce|butcem|butçe|bütçe)\b/i.test(range[0])) {
    min = parseBudgetAmount(range[1], range[3]);
    max = parseBudgetAmount(range[2], range[3]);
  }

  if (max == null) {
    const explicitMax = normalized.match(/(?:max|en fazla|butcem|butce|butçe)?\s*(\d+(?:[.,]\d+)?)\s*(bin\b|k\b)?\s*(?:tl|lira|₺)?\s*(?:ye|ya|e|a|lik|lık|kadar|alti|altinda)?\b/i);
    if (
      explicitMax &&
      /\b(tl|lira|₺|bin|k|butce|butcem|butçe|bütçe)\b/i.test(explicitMax[0])
    ) {
      max = parseBudgetAmount(explicitMax[1], explicitMax[2]);
    }
  }

  const explicitMin = normalized.match(/(\d+(?:[.,]\d+)?)\s*(bin\b|k\b)?\s*(?:tl|lira|₺)?\s*(?:ustu|uzeri|en az)\b/i);
  if (explicitMin) {
    min = parseBudgetAmount(explicitMin[1], explicitMin[2]);
  }

  return {
    min,
    max,
    qualitative: QUALITATIVE_BUDGET_PATTERNS.some((pattern) => pattern.test(normalized)),
  };
}

function parseBudgetAmount(rawAmount: string, rawScale: string | undefined): number {
  const amount = Number(rawAmount.replace(",", "."));
  if (!Number.isFinite(amount)) return 0;
  const scale = normalizeChatSignalText(rawScale);
  if (scale === "bin" || scale === "k") return Math.round(amount * 1000);
  return Math.round(amount);
}

function stripBudgetPhrases(value: string): string {
  return value
    .replace(/\d+(?:[.,]\d+)?\s*(?:-|ile)\s*\d+(?:[.,]\d+)?\s*(bin\b|k\b)\s*(tl|lira)?/gi, " ")
    .replace(/\d+(?:[.,]\d+)?\s*(bin\b|k\b|tl|lira|₺)\s*(ye|ya|e|a|lik|lık|kadar|alti|altinda|ustu|uzeri)?/gi, " ");
}

function getCategoryAnchor(slug: string | null | undefined): string | null {
  if (!slug) return null;
  const normalizedSlug = normalizeChatSignalText(slug);
  const hint = CATEGORY_HINTS.find((entry) => {
    const normalizedHintSlug = normalizeChatSignalText(entry.slug);
    return normalizedSlug === normalizedHintSlug || normalizedSlug.endsWith(`/${normalizedHintSlug}`);
  });
  if (hint) return hint.anchor;

  const leaf = normalizedSlug.split("/").filter(Boolean).pop();
  return leaf ? leaf.replace(/-/g, " ") : null;
}

function uniqueNormalizedPhrases(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = normalizeChatSignalText(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

function hasPhraseTokens(text: string, phrase: string): boolean {
  const textTokens = normalizeChatSignalText(text).split(/\s+/).filter(Boolean);
  const phraseTokens = normalizeChatSignalText(phrase).split(/\s+/).filter(Boolean);
  if (phraseTokens.length === 0) return true;
  return phraseTokens.every((token) => textTokens.includes(token));
}
