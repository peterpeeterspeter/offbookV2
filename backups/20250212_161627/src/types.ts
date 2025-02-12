export interface EmotionSuggestion {
  text: string;
  emotion: string;
  confidence: number;
  intensity: number;
}

export interface PerformanceMetrics {
  pipeline: {
    averageLatency: number;
    totalRequests: number;
    errors: number;
    batchSize: number;
  };
  cache: {
    hits: number;
    misses: number;
    size: number;
  };
}

export interface Voice {
  id: string;
  name: string;
  accent: string;
  gender: string;
  age: number;
}

export interface TTSOptions {
  voice: Voice;
  emotion: string;
  speed: number;
  pitch: number;
}

export interface TTSCacheEntry {
  audio: ArrayBuffer;
  timestamp: number;
}

export interface VoiceModifier {
  type: string;
  value: number;
}

export interface StreamingMetrics {
  activeStreams: number;
  totalStreams: number;
  errors: number;
  dropoutCount: number;
  avgLatency: number;
  recoveryTime: number;
} 