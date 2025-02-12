import { LRUCache } from 'lru-cache';
import type { EmotionSceneAnalysis } from '@/types/analysis';

export const CACHE_CONFIG = {
  analysisCache: new LRUCache<string, EmotionSceneAnalysis>({
    max: 500, // Maximum number of items
    ttl: 1000 * 60 * 60, // 1 hour TTL
    updateAgeOnGet: true, // Reset TTL on access
    allowStale: true, // Allow returning stale items before deletion
  }),
  batchSize: 10,
  retryAttempts: 3,
  retryDelay: 1000, // Base delay in milliseconds
} as const;

// Type for cache configuration to ensure type safety
export type CacheConfig = typeof CACHE_CONFIG;

// Helper function to generate cache keys
export function generateCacheKey(prefix: string, identifier: string): string {
  return `${prefix}_${identifier}`;
}
