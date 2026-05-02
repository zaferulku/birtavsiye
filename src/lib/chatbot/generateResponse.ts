import { aiChat, type ChatMessage } from "../ai/aiClient";
import {
  getNextCategoryFlowStep,
  resolveCategoryLabel,
  type FlowStepDefinition,
} from "./categoryFlow";
import type { KnowledgeChunk, StructuredIntent } from "./intentParser";
import {
  formatResponseStyleExamples,
  selectResponseStyleExamples,
} from "./responseExamples";

export type ResponseInput = {
  userMessage: string;
  styleMessage?: string | null;
  intent: StructuredIntent | null;
  knowledgeChunks: KnowledgeChunk[];
  products: ProductForResponse[];
  searchMethod: "vector" | "keyword" | "hybrid" | "specs" | "failed";
  conversationHistory?: Array<{ role: string; content: string }>;
};

export type ProductForResponse = {
  title: string;
  slug: string;
  brand: string | null;
  min_price: number | null;
  listing_count: number;
};

const SYSTEM_PROMPT = `Sen birtavsiye.net'in urun danismanisin.

KURALLAR:
- Turkce yaz
- Kisa yaz
- Maksimum 2 cumle kullan
- Sonuc varsa once kac urun listelendigini soyle
- Gerekirse sadece tek bir takip sorusu sor
- Uzun aciklama yapma
- Magazaya yonlendirme yapma`;

export async function generateResponse(input: ResponseInput): Promise<string> {
  if (input.intent?.is_off_topic) {
    return "Ben alisveris asistaniyim. Sana hangi urunu bulayim?";
  }

  if (input.intent?.is_too_vague && input.products.length === 0) {
    return buildVagueResponse(input);
  }

  if (input.products.length === 0) {
    return buildNoResultsResponse(input);
  }

  const guidedResponse = buildGuidedProductResponse(input);
  if (guidedResponse) {
    return guidedResponse;
  }

  const messages = buildPromptMessages(input);

  try {
    const response = await aiChat({
      messages,
      maxTokens: 180,
      temperature: 0.35,
    });

    const content = response.content?.trim();
    if (!content || content.length < 6) {
      return buildFallbackProductResponse(input);
    }

    return content;
  } catch (error) {
    console.warn(
      `[generateResponse] LLM failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return buildFallbackProductResponse(input);
  }
}

function buildPromptMessages(input: ResponseInput): ChatMessage[] {
  const parts: string[] = [];
  const styleExamples = selectResponseStyleExamples(
    input.styleMessage ?? input.userMessage,
    input.intent,
    input.products.length > 0
  );

  if (input.conversationHistory && input.conversationHistory.length > 0) {
    const historyText = input.conversationHistory
      .map((entry) => `${entry.role === "user" ? "Kullanici" : "Bot"}: ${entry.content}`)
      .join("\n");
    parts.push(`ONCEKI KONUŞMA:\n${historyText}`);
  }

  parts.push(`YENI MESAJ: "${input.userMessage}"`);
  parts.push(
    `BENZER KISA CEVAP ORNEKLERI:\n${formatResponseStyleExamples(styleExamples)}`
  );

  if (input.intent && input.intent.confidence > 0.4) {
    parts.push(formatIntentContext(input.intent));
  }

  if (input.knowledgeChunks.length > 0) {
    parts.push(formatKnowledgeContext(input.knowledgeChunks));
  }

  parts.push(formatProducts(input.products));
  parts.push(
    "Kisa cevap ver. Ilk cumlede sonuc sayisini soyle. Gerekirse ikinci cumlede sadece tek bir takip sorusu sor."
  );

  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: parts.join("\n\n") },
  ];
}

function formatIntentContext(intent: StructuredIntent): string {
  const lines: string[] = ["NIYET:"];

  if (intent.category_slug) lines.push(`- kategori: ${intent.category_slug}`);
  if (intent.semantic_keywords.length > 0) {
    lines.push(`- anahtar: ${intent.semantic_keywords.join(", ")}`);
  }
  if (intent.brand_filter.length > 0) {
    lines.push(`- marka: ${intent.brand_filter.join(", ")}`);
  }
  if (intent.price_range.min != null || intent.price_range.max != null) {
    lines.push(
      `- fiyat: min=${intent.price_range.min ?? "null"} max=${intent.price_range.max ?? "null"}`
    );
  }

  return lines.join("\n");
}

function formatKnowledgeContext(chunks: KnowledgeChunk[]): string {
  const top = chunks.slice(0, 2);
  if (top.length === 0) return "(bilgi yok)";

  return [
    "ILGILI KISA BILGI:",
    ...top.map((chunk) => {
      const title = chunk.title || chunk.topic || "Bilgi";
      const snippet =
        chunk.content.length > 200
          ? `${chunk.content.slice(0, 197)}...`
          : chunk.content;
      return `[${title}] ${snippet}`;
    }),
  ].join("\n");
}

function formatProducts(products: ProductForResponse[]): string {
  if (products.length === 0) {
    return "URUNLER: yok";
  }

  return [
    "URUNLER:",
    ...products.slice(0, 5).map((product, index) => {
      const brand =
        product.brand && product.brand !== "null" ? `${product.brand} ` : "";
      const price =
        product.min_price != null
          ? `${product.min_price.toLocaleString("tr-TR")} TL`
          : "fiyat yok";
      return `${index + 1}. ${brand}${product.title} - ${price}`;
    }),
  ].join("\n");
}

function buildGuidedProductResponse(input: ResponseInput): string {
  const categoryLabel = resolveCategoryLabel(
    input.intent?.category_slug,
    input.styleMessage ?? input.userMessage
  );
  const countLine = buildCountLine(input.products.length, categoryLabel);
  const nextStep = getNextCategoryFlowStep({
    categorySlug: input.intent?.category_slug,
    userMessage: input.styleMessage ?? input.userMessage,
    hasBrand: (input.intent?.brand_filter?.length ?? 0) > 0,
    hasPricePreference:
      input.intent?.price_range.min != null || input.intent?.price_range.max != null,
  });

  if (!nextStep) return countLine;
  return `${countLine} ${buildFollowUpQuestion(nextStep, categoryLabel)}`;
}

function buildVagueResponse(input: ResponseInput): string {
  const categoryLabel = resolveCategoryLabel(
    input.intent?.category_slug,
    input.styleMessage ?? input.userMessage
  );
  const nextStep = getNextCategoryFlowStep({
    categorySlug: input.intent?.category_slug,
    userMessage: input.styleMessage ?? input.userMessage,
    hasBrand: (input.intent?.brand_filter?.length ?? 0) > 0,
    hasPricePreference:
      input.intent?.price_range.min != null || input.intent?.price_range.max != null,
  });

  if (nextStep) {
    return buildFollowUpQuestion(nextStep, categoryLabel);
  }

  if (categoryLabel !== "urun") {
    return `${categoryLabel} icin biraz daha detay verir misin?`;
  }

  return "Bir kategori ya da marka soylersen daha net gosterebilirim.";
}

function buildNoResultsResponse(input: ResponseInput): string {
  const categoryLabel = resolveCategoryLabel(
    input.intent?.category_slug,
    input.styleMessage ?? input.userMessage
  );
  const nextStep = getNextCategoryFlowStep({
    categorySlug: input.intent?.category_slug,
    userMessage: input.styleMessage ?? input.userMessage,
    hasBrand: (input.intent?.brand_filter?.length ?? 0) > 0,
    hasPricePreference:
      input.intent?.price_range.min != null || input.intent?.price_range.max != null,
  });

  if (nextStep) {
    return `Bu aramada uygun ${categoryLabel} bulamadim. ${buildFollowUpQuestion(
      nextStep,
      categoryLabel
    )}`;
  }

  return `"${input.userMessage}" icin uygun urun bulamadim. Markayi ya da ozelligi biraz degistirelim mi?`;
}

function buildFallbackProductResponse(input: ResponseInput): string {
  const categoryLabel = resolveCategoryLabel(
    input.intent?.category_slug,
    input.styleMessage ?? input.userMessage
  );
  return buildCountLine(input.products.length, categoryLabel);
}

function buildCountLine(count: number, categoryLabel: string): string {
  return `Aramana uygun ${count} ${categoryLabel} listelendi.`;
}

function buildFollowUpQuestion(
  step: FlowStepDefinition,
  categoryLabel: string
): string {
  if (step.key === "brand") {
    if (categoryLabel !== "urun") {
      return `Hangi marka ${categoryLabel} olsun?`;
    }
    return "Hangi marka olsun?";
  }

  if (step.key === "budget") {
    if (categoryLabel !== "urun") {
      return `${categoryLabel} icin butce araligin ne olsun?`;
    }
    return "Butce araligin ne olsun?";
  }

  if (step.key === "storage" && categoryLabel === "laptop") {
    return "Depolama kac GB olsun?";
  }

  if (step.key === "storage") {
    return "Hafiza kac GB olsun?";
  }

  return step.question;
}
