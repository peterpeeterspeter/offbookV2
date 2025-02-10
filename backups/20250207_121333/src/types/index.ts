// Base types
export type Emotion =
  | 'happy'
  | 'sad'
  | 'angry'
  | 'neutral'
  | 'excited'
  | 'fearful'
  | 'disgusted'
  | 'surprised';

/**
 * Current emotion type implementation uses string literals for rapid development.
 * Future improvements planned:
 * 1. Add intensity ranges for each emotion
 * 2. Add composite emotions
 * 3. Add validation rules
 * 4. Consider using an enum or const object
 */

// Error types
export type {
  ScriptAnalysisError,
  ValidationError,
  ProcessingError,
  APIError
} from './errors';

// Analysis types
export type {
  DeepSeekR1Analysis,
  DeepSeekR1Response,
  EmotionSceneAnalysis,
  EmotionSceneMetrics
} from './analysis';

// Progress types
export type {
  UploadProgress,
  AnalysisProgress,
  BatchProgress
} from './progress';

// Script types
export type {
  Line,
  Role,
  Scene,
  Script,
  LineHighlight,
  LineProgress,
  Note,
  DeepSeekAnalysis
} from './script';

// Audio types
export type {
  AudioConfig,
  RecordingSession,
  RecordingTiming,
  AudioService
} from './audio';

// Metrics types
export type {
  ServiceMetrics,
  PracticeMetrics
} from './metrics';

// Voice types
export type {
  Voice,
  VoiceSettings,
  AudioSample,
  TTSOptions,
  VoiceModifier,
  TTSCacheEntry
} from './voice';

// Streaming types
export type {
  StreamingMetrics,
  PipelineMetrics,
  PerformanceMetrics,
  CacheMetrics
} from './streaming';
