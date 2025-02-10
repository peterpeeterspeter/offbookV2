export interface EmotionSuggestion {
    emotion: string;
    confidence: number;
    intensity: number;
}
export interface DeepSeekResponse {
    suggestions: EmotionSuggestion[];
}
export interface PipelineMetrics {
    totalRequests: number;
    avgResponseTime: number;
    errors: number;
    apiCalls: number;
}
export interface CacheMetrics {
    hits: number;
    misses: number;
    size: number;
    keys: string[];
}
export interface ServiceMetrics {
    pipeline: PipelineMetrics;
    cache: CacheMetrics;
}
