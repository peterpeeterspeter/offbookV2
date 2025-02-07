export type Emotion = 'happy' | 'sad' | 'angry' | 'neutral' | 'excited' | 'fearful' | 'disgusted' | 'surprised';
/**
 * Current emotion type implementation uses string literals for rapid development.
 * Future improvements planned:
 * 1. Add intensity ranges for each emotion
 * 2. Add composite emotions
 * 3. Add validation rules
 * 4. Consider using an enum or const object
 */
export type { ScriptAnalysisError, ValidationError, ProcessingError, APIError } from './errors';
export type { DeepSeekR1Analysis, DeepSeekR1Response, EmotionSceneAnalysis, EmotionSceneMetrics } from './analysis';
export type { UploadProgress, AnalysisProgress, BatchProgress } from './progress';
export type { Line, Role, Scene, Script, LineHighlight, LineProgress, Note, DeepSeekAnalysis } from './script';
export type { AudioConfig, RecordingSession, RecordingTiming, AudioService } from './audio';
export type { ServiceMetrics, PracticeMetrics } from './metrics';
export type { Voice, VoiceSettings, AudioSample, TTSOptions, VoiceModifier, TTSCacheEntry } from './voice';
export type { StreamingMetrics, PipelineMetrics, PerformanceMetrics, CacheMetrics } from './streaming';
