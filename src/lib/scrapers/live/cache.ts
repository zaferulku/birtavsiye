/**
 * Cache layer - Two tiers
 * 1. In-flight dedupe: concurrent fetches for same key share one promise
 * 2. Short-term LRU: 5-min TTL cache of successful fetches
 */

import type { StoreLiveData } from "./types";

// In-flight deduplication
const inflight = new Map<string, Promise<StoreLiveData>>();

export async function fetchWithDedupe<T extends StoreLiveData>(
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = fn().finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, promise);
  return promise;
}

export function inflightCount(): number {
  return inflight.size;
}

// LRU cache
type CacheEntry = {
  data: StoreLiveData;
  expiresAt: number;
};

const CACHE_MAX = 5000;
const CACHE_TTL_MS = 5 * 60 * 1000;

const cache = new Map<string, CacheEntry>();

export function cacheGet(key: string): StoreLiveData | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }

  cache.delete(key);
  cache.set(key, entry);
  return entry.data;
}

export function cacheSet(
  key: string,
  data: StoreLiveData,
  ttlMs: number = CACHE_TTL_MS
): void {
  if (cache.size >= CACHE_MAX) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function cacheInvalidate(key: string): void {
  cache.delete(key);
}

export function cacheSize(): number {
  return cache.size;
}

export function cacheKey(source: string, sourceProductId: string): string {
  return `${source}:${sourceProductId}`;
}
