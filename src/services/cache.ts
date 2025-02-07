export class SimpleCache {
  private cache: Map<string, { value: any; timestamp: number }>;
  private maxSize: number;
  private ttl: number;
  private _hits: number = 0;
  private _misses: number = 0;
  private _processedKeys: Set<string> = new Set();

  constructor(maxSize: number, ttlMs: number) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttlMs;
  }

  set(key: string, value: any) {
    if (this.cache.size >= this.maxSize) {
      const oldestKey = Array.from(this.cache.keys())[0];
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  get(key: string) {
    const entry = this.cache.get(key);
    if (!entry) {
      if (!this._processedKeys.has(key)) {
        this._misses++;
        this._processedKeys.add(key);
      }
      return undefined;
    }

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      if (!this._processedKeys.has(key)) {
        this._misses++;
        this._processedKeys.add(key);
      }
      return undefined;
    }

    this._hits++;
    return entry.value;
  }

  clear() {
    this.cache.clear();
  }

  get size() {
    return this.cache.size;
  }

  get hits() {
    return this._hits;
  }

  get misses() {
    return this._misses;
  }

  keys() {
    return Array.from(this.cache.keys());
  }

  reset() {
    this._hits = 0;
    this._misses = 0;
    this._processedKeys.clear();
    this.clear();
  }
}

// Create singleton instance with 1000 items max and 1 hour TTL
export const cache = new SimpleCache(1000, 60 * 60 * 1000);
