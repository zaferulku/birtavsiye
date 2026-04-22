// =============================================================================
// src/lib/classifier/pipeline.ts
// Ürün sınıflandırma pipeline'ı (3 aşamalı karar mekanizması)
//
// Akış:
//   Ürün girişi
//     ↓
//   1. CACHE CHECK (categorization_cache)
//      → Hash'lenmiş title'ı daha önce gördüysek direkt dön
//     ↓
//   2. GEMINI LLM (kategoriler + kurallar referans olarak)
//      → Yeni pattern → LLM'e sor
//     ↓
//   3. LOGGING (3-way)
//      - agent_decisions: raw karar
//      - categorization_cache: title hash → sonuç (bir daha gelmesin)
//      - learned_patterns: evidence counter
//
// Prensip: Bu dosya SADECE karar verir. Database yazmayı kendi tanımladığı
//          fonksiyonlara delege eder (testability + modularity).
// =============================================================================

import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { geminiChat, withRetry } from "@/lib/ai/geminiClient";
import { SchemaType } from "@google/generative-ai";

// =============================================================================
// Tip tanımları
// =============================================================================

export type ProductInput = {
  title: string;                    // "Apple iPhone 15 128GB Siyah"
  brand?: string | null;            // "Apple" (opsiyonel, Gemini daha iyi tespit edebilir)
  source?: string | null;           // "pttavm", "trendyol" vb.
  source_category?: string | null;  // Kaynak kategori (Gemini'ye hint)
};

export type ClassificationResult = {
  // Temel bilgiler
  category_slug: string;            // "akilli-telefon"
  brand: string;                    // "Apple" (normalize edilmiş)
  canonical_title: string;          // "Apple iPhone 15 128GB Siyah"

  // Varyantlar
  model_family: string | null;      // "iPhone 15"
  model_code: string | null;        // "A3089"
  variant_storage: string | null;   // "128GB"
  variant_color: string | null;     // "Siyah"

  // Meta
  confidence: number;               // 0.0-1.0
  quality_score: number;            // 0.0-1.0 (başlık kalitesi, eksik bilgi vs)
  method: "cache" | "gemini" | "manual"; // Hangi yolla karar verildi
  reject_reason?: string;           // Reddedilmişse (2.el vs) nedeni

  // Debug
  raw_llm_response?: unknown;       // Gemini'nin ham cevabı (audit için)
};

export type CategoryRef = {
  id: string;
  slug: string;
  name: string;
  keywords: string[] | null;
  exclude_keywords: string[] | null;
  related_brands: string[] | null;
};

// Agent decision log record (agent_decisions tablosu için)
type AgentDecisionLog = {
  agent_name: string;
  input_hash: string;
  input_data: Record<string, unknown>;
  output_data: Record<string, unknown>;
  confidence: number;
  method: string;
  latency_ms: number;
  tokens_used?: number;
};


// =============================================================================
// Title normalization (cache key için)
// =============================================================================

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,;:!?()'"]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .trim();
}

export function hashTitle(title: string): string {
  return createHash("sha256")
    .update(normalizeTitle(title))
    .digest("hex")
    .substring(0, 32);
}


// =============================================================================
// AŞAMA 1: Cache check
// =============================================================================

async function checkCache(
  sb: SupabaseClient,
  titleHash: string
): Promise<ClassificationResult | null> {
  const { data, error } = await sb
    .from("categorization_cache")
    .select("*")
    .eq("title_hash", titleHash)
    .maybeSingle();

  if (error || !data) return null;

  // Hit sayacını artır (fire-and-forget, async)
  sb.from("categorization_cache")
    .update({
      hit_count: (data.hit_count ?? 0) + 1,
      last_hit: new Date().toISOString(),
    })
    .eq("id", data.id)
    .then(() => {}, () => {}); // Hata olsa da ilerle

  return {
    category_slug: data.category_slug,
    brand: data.brand ?? "Unknown",
    canonical_title: data.normalized_title,
    model_family: data.model_family,
    model_code: null,
    variant_storage: data.variant_storage,
    variant_color: data.variant_color,
    confidence: data.confidence ?? 0.9,
    quality_score: 0.8,
    method: "cache",
  };
}


// =============================================================================
// AŞAMA 2: Gemini LLM classification
// =============================================================================

function buildSystemPrompt(categories: CategoryRef[]): string {
  // Kategori listesini prompt için hazırla
  const categoryList = categories
    .map(c => {
      const keywords = c.keywords?.slice(0, 5).join(", ") ?? "";
      return `- ${c.slug} (${c.name})${keywords ? " — örnek: " + keywords : ""}`;
    })
    .join("\n");

  return `Sen birtavsiye.net'in ürün sınıflandırma uzmanısın.
Türk e-ticaret ürünlerini canonical kategori listesine atar, marka/model/varyant bilgisini çıkarırsın.

KATEGORİ LİSTESİ (yalnızca bunlardan birini seçebilirsin):
${categoryList}

KURALLAR:
1. category_slug DAİMA yukarıdaki listeden olmalı. Uydurma slug asla verme.
2. brand alanı kanonik formatta olmalı: Apple (apple değil), Samsung (SAMSUNG değil).
3. model_family marka+model ailesi: "iPhone 15", "Galaxy S24", "Redmi Note 13".
4. variant_storage: "128GB", "256GB" gibi (varsa).
5. variant_color: "Siyah", "Beyaz" gibi Türkçe (varsa).
6. Başlıkta "kılıf", "şarj", "için", "uyumlu" gibi kelimeler varsa → AKSESUAR kategorisi.
7. "2. el", "outlet", "defolu", "yenilenmiş" → reject_reason doldur, kategori "none".
8. Emin değilsen confidence 0.5 altı ver.

ÇIKTI DAİMA JSON FORMATINDA VERİLECEK.`;
}

const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    category_slug: { type: SchemaType.STRING, description: "Canonical kategori slug'ı" },
    brand: { type: SchemaType.STRING, description: "Normalize edilmiş marka" },
    canonical_title: { type: SchemaType.STRING, description: "Temizlenmiş başlık" },
    model_family: { type: SchemaType.STRING, nullable: true, description: "Marka+model ailesi" },
    model_code: { type: SchemaType.STRING, nullable: true, description: "Üretici kodu" },
    variant_storage: { type: SchemaType.STRING, nullable: true, description: "128GB gibi" },
    variant_color: { type: SchemaType.STRING, nullable: true, description: "Siyah gibi" },
    confidence: { type: SchemaType.NUMBER, description: "0.0-1.0 güven skoru" },
    quality_score: { type: SchemaType.NUMBER, description: "0.0-1.0 başlık kalite skoru" },
    reject_reason: { type: SchemaType.STRING, nullable: true, description: "Reddedilme nedeni" },
  },
  required: ["category_slug", "brand", "canonical_title", "confidence", "quality_score"],
};


async function classifyWithGemini(
  input: ProductInput,
  categories: CategoryRef[]
): Promise<{ result: ClassificationResult; tokensUsed: number; latencyMs: number }> {
  const systemInstruction = buildSystemPrompt(categories);

  const userPrompt = `ÜRÜN:
title: ${input.title}
brand (scrape'lenmiş, güvenilmez): ${input.brand ?? "-"}
source: ${input.source ?? "-"}
source_category: ${input.source_category ?? "-"}

Bu ürünü sınıflandır.`;

  const result = await withRetry(
    () =>
      geminiChat<Omit<ClassificationResult, "method">>({
        systemInstruction,
        prompt: userPrompt,
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.1,
        maxOutputTokens: 512,
      }),
    { maxAttempts: 3, baseDelayMs: 2000 }
  );

  return {
    result: { ...result.content, method: "gemini" },
    tokensUsed: result.tokensUsed,
    latencyMs: result.latencyMs,
  };
}


// =============================================================================
// AŞAMA 3: Logging (3-way)
// =============================================================================

async function logDecision(
  sb: SupabaseClient,
  log: AgentDecisionLog
): Promise<void> {
  // agent_decisions tablosuna yaz
  await sb.from("agent_decisions").insert({
    agent_name: log.agent_name,
    input_hash: log.input_hash,
    input_data: log.input_data,
    output_data: log.output_data,
    confidence: log.confidence,
    method: log.method,
    latency_ms: log.latency_ms,
    tokens_used: log.tokens_used ?? null,
  });
}

async function upsertCache(
  sb: SupabaseClient,
  titleHash: string,
  normalizedTitle: string,
  result: ClassificationResult,
  method: "gemini" | "manual"
): Promise<void> {
  // categorization_cache'e yaz (varsa güncelle)
  await sb.from("categorization_cache").upsert(
    {
      title_hash: titleHash,
      normalized_title: normalizedTitle,
      brand: result.brand,
      category_slug: result.category_slug,
      model_family: result.model_family,
      variant_storage: result.variant_storage,
      variant_color: result.variant_color,
      confidence: result.confidence,
      method,
    },
    { onConflict: "title_hash" }
  );
}

async function updateLearnedPatterns(
  sb: SupabaseClient,
  result: ClassificationResult
): Promise<void> {
  // Brand + Category kombinasyonu için evidence counter
  if (result.confidence < 0.8) return; // Düşük güvenli kararlardan öğrenme

  const patternKey = `${result.brand.toLowerCase()}__${result.category_slug}`;

  // Mevcut pattern var mı?
  const { data: existing } = await sb
    .from("learned_patterns")
    .select("id, evidence_count")
    .eq("agent_name", "category-classifier")
    .eq("pattern_type", "brand_category")
    .eq("pattern_data->>key", patternKey)
    .maybeSingle();

  if (existing) {
    await sb
      .from("learned_patterns")
      .update({
        evidence_count: (existing.evidence_count ?? 0) + 1,
        last_evidence_at: new Date().toISOString(),
        last_seen: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await sb.from("learned_patterns").insert({
      agent_name: "category-classifier",
      pattern_type: "brand_category",
      pattern_data: {
        key: patternKey,
        brand: result.brand,
        category: result.category_slug,
      },
      evidence_count: 1,
      confidence: result.confidence,
      status: "pending",
    });
  }
}


// =============================================================================
// ANA PIPELINE: classifyProduct
// =============================================================================

export async function classifyProduct(
  sb: SupabaseClient,
  input: ProductInput,
  categories: CategoryRef[]
): Promise<ClassificationResult> {
  const startTime = Date.now();
  const titleHash = hashTitle(input.title);
  const normalizedTitle = normalizeTitle(input.title);

  // AŞAMA 1: Cache check
  const cached = await checkCache(sb, titleHash);
  if (cached) {
    // Log: cache hit
    await logDecision(sb, {
      agent_name: "category-classifier",
      input_hash: titleHash,
      input_data: { title: input.title, source: input.source },
      output_data: cached as unknown as Record<string, unknown>,
      confidence: cached.confidence,
      method: "cache",
      latency_ms: Date.now() - startTime,
    });
    return cached;
  }

  // AŞAMA 2: Gemini LLM
  let result: ClassificationResult;
  let tokensUsed = 0;
  try {
    const gemini = await classifyWithGemini(input, categories);
    result = gemini.result;
    tokensUsed = gemini.tokensUsed;
  } catch (e) {
    // Gemini fail → boş karar, manual review'a düşer
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`Gemini classification failed for "${input.title.substring(0, 50)}": ${msg}`);

    result = {
      category_slug: "uncategorized",
      brand: input.brand ?? "Unknown",
      canonical_title: input.title,
      model_family: null,
      model_code: null,
      variant_storage: null,
      variant_color: null,
      confidence: 0.0,
      quality_score: 0.3,
      method: "gemini",
      reject_reason: `gemini_failed: ${msg.substring(0, 100)}`,
    };
  }

  // Validate: Gemini bazen listede olmayan kategori dönebilir
  const validSlugs = new Set(categories.map(c => c.slug));
  if (!validSlugs.has(result.category_slug) && result.category_slug !== "uncategorized" && result.category_slug !== "none") {
    console.warn(`Gemini unknown category "${result.category_slug}" for "${input.title.substring(0, 50)}" → marking uncategorized`);
    result = { ...result, category_slug: "uncategorized", confidence: 0.0 };
  }

  const latencyMs = Date.now() - startTime;

  // AŞAMA 3: Logging (3-way)
  await Promise.all([
    logDecision(sb, {
      agent_name: "category-classifier",
      input_hash: titleHash,
      input_data: { title: input.title, brand: input.brand, source: input.source },
      output_data: result as unknown as Record<string, unknown>,
      confidence: result.confidence,
      method: result.method,
      latency_ms: latencyMs,
      tokens_used: tokensUsed,
    }),

    // Sadece başarılı ve güvenilir kararları cache'le
    result.confidence >= 0.7 && result.category_slug !== "uncategorized"
      ? upsertCache(sb, titleHash, normalizedTitle, result, "gemini")
      : Promise.resolve(),

    result.confidence >= 0.7 && result.category_slug !== "uncategorized"
      ? updateLearnedPatterns(sb, result)
      : Promise.resolve(),
  ]);

  return result;
}


// =============================================================================
// Yardımcı: kategorileri DB'den yükle
// =============================================================================

export async function loadCategories(sb: SupabaseClient): Promise<CategoryRef[]> {
  const { data, error } = await sb
    .from("categories")
    .select("id, slug, name, keywords, exclude_keywords, related_brands")
    .eq("is_active", true)
    .eq("is_leaf", true);

  if (error) throw new Error(`Kategori yüklenemedi: ${error.message}`);
  return (data ?? []) as CategoryRef[];
}
