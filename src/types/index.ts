// Base types
export type {
  EmotionIntensity,
  EmotionTransition,
  EmotionMetrics
} from './emotions';
export { EmotionValues } from './emotions';

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
  AudioService,
  VADConfig,
  ElevenLabsConfig,
  TTSParams,
  TTSSession,
  AudioServiceContext,
  AudioServiceSession,
  AudioServiceStateData,
  CueSignal,
  CueDisplay,
  SceneProgression,
  StateTransitions,
  AudioErrorDetails,
  RecordingResult,
  TTSRequest,
  TTSMetrics,
  VoiceModifier,
  Voice,
  TTSOptions,
  TTSCacheEntry
} from './audio';

export {
  AudioServiceState,
  AudioServiceEvent,
  AudioServiceError,
  AudioErrorCategory,
  ERROR_RECOVERY_HINTS
} from './audio';

// Export metrics types
export type {
  ServiceMetrics,
  MetricsHistory,
  PerformanceAlert,
  PracticeMetrics,
  PerformanceMetrics,
  PipelineMetrics,
  CacheMetrics,
  StreamingMetrics
} from './metrics';

// Export emotion types
export type {
  Emotion,
  EmotionStyle
} from './emotions';

// Core types
export type { Service } from './core';

// Re-export remaining types
export * from './audio';
export * from './practice';
export * from './streaming';
export * from './analysis';
export * from './core';
export * from './script';
export * from './progress';
export * from './voice';
export * from './mobile';
export * from './collaboration';
export * from './errors';
export * from './common';
export * from './components';
export * from './monitoring';
export * from './actions';
