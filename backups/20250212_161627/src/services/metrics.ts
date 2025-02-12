import { ServiceMetrics } from './types';
import { SimpleCache } from './cache';

// Initialize metrics
export const metrics: ServiceMetrics = {
  pipeline: {
    totalRequests: 0,
    avgResponseTime: 0,
    averageLatency: 0,
    errorRate: 0,
    errors: 0,
    apiCalls: 0,
    throughput: 0,
    queueUtilization: 0,
    batchEfficiency: 0
  },
  cache: {
    hits: 0,
    misses: 0,
    size: 0,
    keys: []
  }
};

// Initialize response cache
export const responseCache = new SimpleCache(500, 1000 * 60 * 60); // 500 items, 1 hour TTL

// Reset metrics (for testing)
export function resetMetrics(): void {
  metrics.pipeline = {
    totalRequests: 0,
    avgResponseTime: 0,
    averageLatency: 0,
    errorRate: 0,
    errors: 0,
    apiCalls: 0,
    throughput: 0,
    queueUtilization: 0,
    batchEfficiency: 0
  };

  metrics.cache = {
    hits: 0,
    misses: 0,
    size: 0,
    keys: []
  };

  responseCache.clear();
}

// Get current metrics
export function getMetrics(): ServiceMetrics {
  return {
    pipeline: { ...metrics.pipeline },
    cache: {
      ...metrics.cache,
      size: responseCache.size,
      keys: responseCache.keys()
    }
  };
}
