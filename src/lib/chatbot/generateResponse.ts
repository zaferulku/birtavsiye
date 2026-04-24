/**
 * Response Generation
 *
 * Chatbot'un kullanÄ±cÄ±ya dÃ¶necek doÄal dildeki yanÄ±tÄ±nÄ± Ã¼retir.
 *
 * Input: kullanÄ±cÄ± mesajÄ± + bulunan Ã¼rÃ¼nler + KB context + structured intent
 * Output: TÃ¼rkÃ§e samimi/profesyonel yanÄ±t (3-4 cÃ¼mle)
 *
 * Strateji:
 *   - Mevcut aiChat() fonksiyonunu kullanÄ±r (NVIDIA Llama 3.3 70B primary)
 *   - System prompt: rol + ton + kurallar
 *   - User prompt: dinamik (intent + KB + Ã¼rÃ¼nler + special cases)
 *   - "Bilmiyorum" davranÄ±ÅÄ±: 3 durum (vague, no_results, off_topic)
 */

import { aiChat, type ChatMessage } from "../ai/aiClient";
import type { KnowledgeChunk, StructuredIntent } from "./intentParser";

// ============================================================================
// Types
// ============================================================================

export type ResponseInput = {
  userMessage: string;
  intent: StructuredIntent | null;          // null = fast path (intent parser atlandÄ±)
  knowledgeChunks: KnowledgeChunk[];         // boÅ olabilir
  products: ProductForResponse[];            // boÅ olabilir
  searchMethod: "vector" | "keyword" | "hybrid" | "specs" | "failed";
  conversationHistory?: Array<{ role: string; content: string }>;  // proaktif sohbet
};

export type ProductForResponse = {
  title: string;
  slug: string;
  brand: string | null;
  min_price: number | null;
  listing_count: number;
};

// ============================================================================
// System prompt
// ============================================================================

const SYSTEM_PROMPT = `Sen birtavsiye.net'in ürün danışmanısın. Türkçe konuşuyorsun, samimi ve profesyonel bir tonun var.

GÖREV:
- Kullanıcının ürün arama mesajına yardımcı yanıt ver
- Bulunan ürünleri kısaca tanıt (max 3 ürün)
- Konunun bağlamını açıkla (örnek: "lavanta çiçeksi koku ailesinde")

ÜSLUP KURALLARI:
- Kısa yanıt (3-4 cümle)
- Samimi ama profesyonel ("siz" değil "sen" hitabı)
- Emoji minimum (en fazla 1 tane, yer varsa)
- "Şurada satılıyor", "şu mağaza", "buradan al" gibi yönlendirme yapma
- Fiyat söylerken format: "X TL'den başlıyor"
- Marka ismini belirt
- Liste oluştururken numara kullan

YASAK:
- Ezberden ders verme (KB bilgisini ürün önerisi için kullan, anlatma)
- Bulamadığın bir özelliği uydurma
- Çok uzun açıklama yapma

ÖZEL DURUMLAR:
- Ürün bulunamadıysa: "Şu an sistemde uyan ürün yok" de, alternatif öner
- Sorgu çok genelse: Kategori veya detay sor
- Alakasız sorgu: Kibarca alışverişe yönlendir`;

// ============================================================================
// Main entry point
// ============================================================================

/**
 * KullanÄ±cÄ±ya dÃ¶nÃ¼lecek yanÄ±tÄ± Ã¼retir.
 *
 * @param input TÃ¼m baÄlam (kullanÄ±cÄ±, intent, KB, Ã¼rÃ¼nler)
 * @returns TÃ¼rkÃ§e yanÄ±t metni
 */
export async function generateResponse(input: ResponseInput): Promise<string> {
  // Special case 1: off-topic (intent parser tespit etti)
  if (input.intent?.is_off_topic) {
    return "Ben birtavsiye.net'in ürün danışmanıyım, alışveriş konularında yardımcı oluyorum. Sana ne bulayım? 🛒";
  }

  // Special case 2: too vague (intent parser tespit etti)
  if (input.intent?.is_too_vague && input.products.length === 0) {
    return buildVagueResponse(input);
  }

  // Special case 3: Ã¼rÃ¼n bulunamadÄ±
  if (input.products.length === 0) {
    return buildNoResultsResponse(input);
  }

  // Normal akÄ±Å: Ã¼rÃ¼nler var, LLM ile zenginleÅtirilmiÅ yanÄ±t Ã¼ret
  const messages = buildPromptMessages(input);

  try {
    const response = await aiChat({
      messages,
      maxTokens: 300,
      temperature: 0.7,
    });

    const content = response.content?.trim();

    if (!content || content.length < 10) {
      // LLM Ã§Ã¶p dÃ¶ndÃ¼rdÃ¼ â fallback
      return buildFallbackProductResponse(input);
    }

    return content;
  } catch (err) {
    console.warn(
      `[generateResponse] LLM failed: ${err instanceof Error ? err.message : err}`
    );
    return buildFallbackProductResponse(input);
  }
}

// ============================================================================
// Prompt builder (normal case)
// ============================================================================

function buildPromptMessages(input: ResponseInput): ChatMessage[] {
  const userPromptParts: string[] = [];

  // Önceki konuşma context'i (proaktif sohbet için)
  if (input.conversationHistory && input.conversationHistory.length > 0) {
    const historyText = input.conversationHistory
      .map(m => `${m.role === 'user' ? 'Kullanıcı' : 'Sen'}: ${m.content}`)
      .join('\n');
    userPromptParts.push(`ÖNCEKİ KONUŞMA:\n${historyText}`);
  }

  userPromptParts.push(`YENİ KULLANICI MESAJI: "${input.userMessage}"`);

  // Intent context (sadece slow path varsa)
  if (input.intent && input.intent.confidence > 0.4) {
    userPromptParts.push(formatIntentContext(input.intent));
  }

  // KB context (varsa)
  if (input.knowledgeChunks.length > 0) {
    userPromptParts.push(formatKnowledgeContext(input.knowledgeChunks));
  }

  // ÃrÃ¼nler
  userPromptParts.push(formatProducts(input.products));

  userPromptParts.push(
    `\nKurallarına uygun, kısa ve yardımcı bir yanıt ver. Maksimum 3 ürün öner.`
  );

  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPromptParts.join("\n\n") },
  ];
}

function formatIntentContext(intent: StructuredIntent): string {
  const parts: string[] = ["KULLANICININ ARAMA NİYETİ:"];

  if (intent.category_slug) {
    parts.push(`- Kategori: ${intent.category_slug}`);
  }
  if (intent.semantic_keywords.length > 0) {
    parts.push(`- Aradığı kavramlar: ${intent.semantic_keywords.join(", ")}`);
  }
  if (Object.keys(intent.must_have_specs).length > 0) {
    const specs = Object.entries(intent.must_have_specs)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(" veya ") : v}`)
      .join("; ");
    parts.push(`- Şart olanlar: ${specs}`);
  }
  if (intent.brand_filter.length > 0) {
    parts.push(`- Marka tercihi: ${intent.brand_filter.join(", ")}`);
  }
  if (intent.price_range.max) {
    parts.push(`- Maksimum fiyat: ${intent.price_range.max} TL`);
  }

  return parts.join("\n");
}

function formatKnowledgeContext(chunks: KnowledgeChunk[]): string {
  // Ä°lk 3 chunk'Ä± al (LLM'i bunaltma)
  const top = chunks.slice(0, 3);
  const lines = ["KONU İLE İLGİLİ BİLGİ (sözlükten):"];

  for (const c of top) {
    const title = c.title || c.topic || "Bilgi";
    // Ä°Ã§eriÄi 250 karakterle sÄ±nÄ±rla
    const snippet = c.content.length > 250
      ? c.content.slice(0, 247) + "..."
      : c.content;
    lines.push(`[${title}]\n${snippet}`);
  }

  return lines.join("\n\n");
}

function formatProducts(products: ProductForResponse[]): string {
  if (products.length === 0) {
    return "BULUNAN ÜRÜNLER: (hiç ürün bulunamadı)";
  }

  // İlk 5 ürünü prompt'a ver, LLM en uygun 3'ünü seçer
  const top = products.slice(0, 5);
  const lines = ["BULUNAN ÜRÜNLER:"];

  for (let i = 0; i < top.length; i++) {
    const p = top[i];
    const brand = p.brand && p.brand !== "null" ? `[${p.brand}] ` : "";
    const price = p.min_price
      ? `${p.min_price.toLocaleString("tr-TR")} TL'den başlıyor`
      : "fiyat bilgisi yok";
    const listings = p.listing_count > 1
      ? ` (${p.listing_count} mağazada)`
      : "";
    lines.push(`${i + 1}. ${brand}${p.title} — ${price}${listings}`);
  }

  return lines.join("\n");
}

// ============================================================================
// Fallback responses (LLM kullanmaz)
// ============================================================================

/**
 * Ãok genel sorgu â netleÅtirici sor.
 */
function buildVagueResponse(input: ResponseInput): string {
  // KB'den bağlam varsa kullan (proaktif)
  const kbHint = input.knowledgeChunks[0]?.title || input.knowledgeChunks[0]?.topic || "";

  if (kbHint) {
    return `${kbHint} ile ilgili mi arıyorsun? Biraz daha detay verirsen daha iyi öneri yapabilirim. Örneğin marka, bütçe veya özellik söyleyebilirsin.`;
  }

  return `Sana yardım etmek isterim. Biraz daha detay verirsen daha iyi öneri yapabilirim — örneğin marka, bütçe veya bir özellik söyleyebilirsin. Ya da doğrudan ürün adı yaz (örn: "iPhone 15", "lavanta deodorant").`;
}

/**
 * ÃrÃ¼n bulunamadÄ± â dÃ¼rÃ¼st ol, alternatif Ã¶ner.
 */
function buildNoResultsResponse(input: ResponseInput): string {
  const intent = input.intent;

  // EÄer intent var ve KB'de bilgi varsa, KB Ã¼zerinden alternatif Ã¶ner
  if (intent && input.knowledgeChunks.length > 0) {
    const kbHint = input.knowledgeChunks[0]?.title || input.knowledgeChunks[0]?.topic || "";
    return `"${input.userMessage}" için tam uyan ürün bulamadım şu an sistemde. Ama ${kbHint} kategorisinde başka seçeneklerimiz olabilir. Daha geniş bir arama yapmak ister misin? Örneğin marka veya kategori belirterek?`;
  }

  // KB de boÅ â generic mesaj
  return `"${input.userMessage}" için sistemde ürün bulamadım. Aramanı biraz farklı yapmak ister misin? Marka adı, kategori veya özellik ekleyebilirsin.`;
}

/**
 * LLM fail oldu, ama Ã¼rÃ¼n var â hardcoded format.
 */
function buildFallbackProductResponse(input: ResponseInput): string {
  const top = input.products.slice(0, 3);
  const lines = [`İşte "${input.userMessage}" için bulduklarım:\n`];

  for (let i = 0; i < top.length; i++) {
    const p = top[i];
    const brand = p.brand && p.brand !== "null" ? `${p.brand} ` : "";
    const price = p.min_price
      ? `${p.min_price.toLocaleString("tr-TR")} TL'den başlıyor`
      : "fiyat bilgisi yok";
    lines.push(`${i + 1}. ${brand}${p.title} — ${price}`);
  }

  return lines.join("\n");
}
