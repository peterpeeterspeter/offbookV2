import { PerformanceMetrics } from '../types';
import { EmotionSuggestion } from './types';
export declare function resetMetrics(): void;
export declare function getPerformanceMetrics(): PerformanceMetrics;
export declare function detectEmotions(text: string): Promise<{
    suggestions: EmotionSuggestion[];
}>;
