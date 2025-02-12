import { ServiceMetrics } from './types';
import { SimpleCache } from './cache';
export declare const metrics: ServiceMetrics;
export declare const responseCache: SimpleCache;
export declare function resetMetrics(): void;
export declare function getMetrics(): ServiceMetrics;
