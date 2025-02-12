import { LRUCache } from 'lru-cache';
import type { EmotionSceneAnalysis } from '@/types/analysis';
export declare const CACHE_CONFIG: {
    readonly analysisCache: LRUCache<string, EmotionSceneAnalysis, unknown>;
    readonly batchSize: 10;
    readonly retryAttempts: 3;
    readonly retryDelay: 1000;
};
export type CacheConfig = typeof CACHE_CONFIG;
export declare function generateCacheKey(prefix: string, identifier: string): string;
