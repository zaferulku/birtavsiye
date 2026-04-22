/**
 * Rate limiter - Token bucket per store.
 * In-memory per Node.js instance.
 */

type Bucket = {
  capacity: number;
  refillPerMinute: number;
  current: number;
  lastRefill: number;
};

class RateLimiter {
  private buckets: Map<string, Bucket> = new Map();

  register(source: string, rpmLimit: number): void {
    this.buckets.set(source, {
      capacity: rpmLimit,
      refillPerMinute: rpmLimit,
      current: rpmLimit,
      lastRefill: Date.now(),
    });
  }

  tryConsume(source: string): boolean {
    const bucket = this.buckets.get(source);
    if (!bucket) {
      console.warn(`[rate-limiter] Unknown source: ${source}`);
      return false;
    }
    this.refill(bucket);
    if (bucket.current < 1) return false;
    bucket.current -= 1;
    return true;
  }

  getState(source: string): { current: number; capacity: number } | null {
    const bucket = this.buckets.get(source);
    if (!bucket) return null;
    this.refill(bucket);
    return { current: Math.floor(bucket.current), capacity: bucket.capacity };
  }

  private refill(bucket: Bucket): void {
    const now = Date.now();
    const elapsedMs = now - bucket.lastRefill;
    if (elapsedMs <= 0) return;
    const tokensToAdd = (elapsedMs / 60_000) * bucket.refillPerMinute;
    bucket.current = Math.min(bucket.capacity, bucket.current + tokensToAdd);
    bucket.lastRefill = now;
  }
}

export const rateLimiter = new RateLimiter();

rateLimiter.register("pttavm", 60);
rateLimiter.register("trendyol", 30);
rateLimiter.register("hepsiburada", 20);
rateLimiter.register("mediamarkt", 15);
rateLimiter.register("n11", 15);
rateLimiter.register("amazon-tr", 60);
rateLimiter.register("vatan", 10);
