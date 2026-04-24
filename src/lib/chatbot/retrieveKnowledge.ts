/**
 * Knowledge Base Retrieval
 *
 * Chatbot'un KB'den semantik olarak ilgili chunk'ları çekmesi için wrapper.
 *
 * - retrieve_knowledge RPC (semantic, embedding-based)
 * - 5 dakikalık in-memory cache (aynı sorgu tekrar gelirse Gemini çşısı yok)
 * - Hata durumunda bş liste (chatbot KB olmadan da çalışabilir, sadece daha az akıllı)
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { aiEmbed } from "../ai/aiClient";
import type { KnowledgeChunk } from "./intentParser";

// ============================================================================
// Config
// ============================================================================

const KB_CACHE_TTL_MS = 5 * 60 * 1000; // 5 dakika
const KB_CACHE_MAX = 500;
const DEFAULT_TOP_N = 5;
const DEFAULT_MIN_SIM = 0.55;

// ============================================================================
// Types
// ============================================================================

export type RetrieveOptions = {
  category?: string | null;
  topic?: string | null;
  topN?: number;
  minSim?: number;
};

// ============================================================================
// Cache (in-memory LRU)
// ============================================================================

type CacheEntry = {
  chunks: KnowledgeChunk[];
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

function cacheKey(message: string, opts: RetrieveOptions): string {
  return `${message.slice(0, 200)}::${opts.category || ""}::${opts.topic || ""}`;
}

function cacheGet(key: string): KnowledgeChunk[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  // LRU: re-insert
  cache.delete(key);
  cache.set(key, entry);
  return entry.chunks;
}

function cacheSet(key: string, chunks: KnowledgeChunk[]): void {
  if (cache.size >= KB_CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, {
    chunks,
    expiresAt: Date.now() + KB_CACHE_TTL_MS,
  });
}

// ============================================================================
// Main entry point
// ============================================================================

/**
 * Kullanıcı mesajı için en ilgili KB chunk'larını semantic olarak getir.
 *
 * @param sb Supabase client (test için inject edilebilir)
 * @param message Kullanıcı mesajı
 * @param opts Filtreleme opsiyonları
 * @returns KnowledgeChunk[] (bş olabilir, hata da bş döner)
 */
export async function retrieveKnowledge(
  sb: SupabaseClient,
  message: string,
  opts: RetrieveOptions = {}
): Promise<KnowledgeChunk[]> {
  const topN = opts.topN ?? DEFAULT_TOP_N;
  const minSim = opts.minSim ?? DEFAULT_MIN_SIM;

  // Cache check
  const key = cacheKey(message, opts);
  const cached = cacheGet(key);
  if (cached) {
    return cached;
  }

  try {
    // 1. Embed query (Gemini, taskType: RETRIEVAL_QUERY otomatik)
    const embed = await aiEmbed({ input: message });

    if (embed.dimensions !== 768) {
      console.warn(
        `[retrieveKnowledge] Embedding dim ${embed.dimensions} != 768, skipping`
      );
      return [];
    }

    // 2. RPC call
    const { data, error } = await sb.rpc("retrieve_knowledge", {
      query_embedding: embed.embedding,
      match_threshold: minSim,
      match_count: topN,
      filter_category: opts.category ?? null,
      filter_topic: opts.topic ?? null,
    });

    if (error) {
      console.warn(`[retrieveKnowledge] RPC error: ${error.message}`);
      return [];
    }

    const chunks = (data ?? []) as KnowledgeChunk[];

    // Cache (success'leri sakla)
    cacheSet(key, chunks);

    return chunks;
  } catch (err) {
    console.warn(
      `[retrieveKnowledge] Failed: ${err instanceof Error ? err.message : String(err)}`
    );
    return [];
  }
}

// ============================================================================
// Helpers
// ============================================================================

export function clearKnowledgeCache(): void {
  cache.clear();
}

export function getKnowledgeCacheSize(): number {
  return cache.size;
}
