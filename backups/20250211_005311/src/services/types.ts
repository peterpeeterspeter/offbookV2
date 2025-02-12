export interface EmotionSuggestion {
  emotion: string;
  confidence: number;
  intensity: number;
  text?: string;
}

export interface DeepSeekResponse {
  suggestions: EmotionSuggestion[];
  error?: string;
}

export interface PipelineMetrics {
  totalRequests: number;
  avgResponseTime: number;
  averageLatency: number;
  errorRate: number;
  errors: number;
  apiCalls: number;
  throughput: number;
  queueUtilization: number;
  batchEfficiency: number;
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

export interface Scene {
  id: string;
  title: string;
  description: string;
  startLine: number;
  endLine: number;
  characters: string[];
}

export interface EmotionSceneAnalysis {
  emotions: DeepSeekR1Analysis;
  metrics: EmotionSceneMetrics;
  description: string;
}

export interface EmotionSceneMetrics {
  emotionalShifts: number;
  averageLineLength: number;
  dialogueCount: number;
  actionCount: number;
  emotionalIntensity: number;
  paceScore: number;
}

export interface CharacterAnalysis {
  name: string;
  arc: {
    type: 'flat' | 'positive' | 'negative' | 'transformation';
    stages: Array<{
      scene: number;
      development: string;
      emotionalState: string;
    }>;
  };
  personality: {
    traits: string[];
    dominantTraits: string[];
    conflictStyle: string;
    motivations: string[];
  };
  relationships: Array<{
    character: string;
    dynamic: string;
    evolution: Array<{
      scene: number;
      status: string;
      tension: number;
    }>;
  }>;
  speakingStyle: {
    vocabulary: string;
    tone: string;
    patterns: string[];
    uniquePhrases: string[];
  };
  performanceMetrics: {
    lineCount: number;
    averageLineLength: number;
    emotionalRange: number;
    scenePresence: number[];
  };
}

export interface CharacterDevelopmentMetrics {
  arcProgression: number;
  relationshipComplexity: number;
  emotionalDepth: number;
  consistencyScore: number;
}

export interface PipelineContext {
  startTime: number;
  batchSize: number;
  processingTime: number[];
  queueSize: number;
  lastProcessedTimestamp: number;
  rateLimitDelay: number;
}

export interface CacheConfig {
  maxEntries: number;
  ttl: number;
}

export interface DeepSeekR1Analysis {
  primary_emotion: string;
  intensity: number;
  confidence: number;
  secondary_emotions: Array<{
    emotion: string;
    intensity: number;
  }>;
  explanation: string;
}

export interface DeepSeekR1Response {
  choices: Array<{
    message: {
      role: string;
      content: DeepSeekR1Analysis;
    };
  }>;
}

export class DeepSeekError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public data?: unknown,
    public code: string = 'UNKNOWN_ERROR'
  ) {
    super(message)
    this.name = 'DeepSeekError'
  }
}
