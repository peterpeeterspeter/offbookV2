import type { Service, ServiceState, ServiceError, ServiceEvent } from './core';
import type { AudioServiceContext, RecordingResult } from './audio';

// Script Analysis States
export enum ScriptAnalysisState {
  UNINITIALIZED = 'UNINITIALIZED',
  INITIALIZING = 'INITIALIZING',
  READY = 'READY',
  ANALYZING = 'ANALYZING',
  ERROR = 'ERROR'
}

// Script Analysis Events
export enum ScriptAnalysisEvent {
  INITIALIZE = 'INITIALIZE',
  INITIALIZED = 'INITIALIZED',
  ANALYSIS_START = 'ANALYSIS_START',
  ANALYSIS_PROGRESS = 'ANALYSIS_PROGRESS',
  ANALYSIS_COMPLETE = 'ANALYSIS_COMPLETE',
  ERROR = 'ERROR'
}

// Script Analysis Errors
export enum ScriptAnalysisErrorCategory {
  INITIALIZATION = 'INITIALIZATION',
  ANALYSIS = 'ANALYSIS',
  MODEL = 'MODEL',
  VALIDATION = 'VALIDATION',
  SYSTEM = 'SYSTEM'
}

// Configuration interfaces
export interface ScriptAnalysisConfig {
  modelId: string;
  batchSize: number;
  maxRetries: number;
  retryDelay: number;
  slowThreshold: number;
  slowOperations: string[];
}

export interface AnalysisParams {
  text: string;
  audioData: Float32Array;
  settings?: {
    emotionThreshold: number;
    intensityThreshold: number;
    timingThreshold: number;
  };
}

// Analysis Result interfaces
export interface EmotionSceneAnalysis {
  emotion: string;
  intensity: number;
  confidence: number;
  start: number;
  end: number;
  text: string;
}

export interface TimingAnalysis {
  expectedDuration: number;
  actualDuration: number;
  accuracy: number;
  segments: Array<{
    start: number;
    end: number;
    text: string;
    expectedDuration: number;
    actualDuration: number;
    accuracy: number;
  }>;
}

export interface AnalysisResult {
  id: string;
  text: string;
  recording: RecordingResult;
  emotions: EmotionSceneAnalysis[];
  timing: TimingAnalysis;
  accuracy: {
    emotion: number;
    intensity: number;
    timing: number;
    overall: number;
  };
}

// Service interfaces
export interface ScriptAnalyzer extends Service {
  analyzeEmotion(text: string): Promise<EmotionSceneAnalysis[]>;
  analyzeTiming(recording: RecordingResult): Promise<TimingAnalysis>;
  calculateAccuracy(emotions: EmotionSceneAnalysis[], timing: TimingAnalysis): Promise<AnalysisResult['accuracy']>;
}

export interface ValidationService extends Service {
  validateText(text: string): Promise<boolean>;
  validateAudio(audioData: Float32Array): Promise<boolean>;
  validateResult(result: AnalysisResult): Promise<boolean>;
}

// State interfaces
export interface ScriptAnalysisContext {
  modelId: string;
  batchSize: number;
  maxRetries: number;
  retryDelay: number;
  slowThreshold: number;
  slowOperations: string[];
  audioContext: AudioServiceContext;
}

export interface ScriptAnalysisStateData extends ServiceState<ScriptAnalysisContext> {
  state: ScriptAnalysisState;
  error?: ScriptAnalysisErrorDetails;
  context: ScriptAnalysisContext;
  currentAnalysis?: {
    id: string;
    progress: number;
    startTime: number;
  };
}

export interface ScriptAnalysisErrorDetails extends ServiceError {
  code: ScriptAnalysisEvent;
  category: ScriptAnalysisErrorCategory;
  context?: ScriptAnalysisContext;
}

// Progress interfaces
export interface AnalysisProgress {
  id: string;
  stage: 'emotion' | 'timing' | 'accuracy';
  progress: number;
  startTime: number;
  estimatedCompletion: number;
}

// Batch Processing interfaces
export interface AnalysisBatch {
  id: string;
  items: Array<{
    id: string;
    params: AnalysisParams;
  }>;
  priority: number;
  createdAt: number;
}

export interface BatchResult {
  batchId: string;
  results: Array<{
    id: string;
    result: AnalysisResult | ScriptAnalysisErrorDetails;
  }>;
  completedAt: number;
  duration: number;
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
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      content: DeepSeekR1Analysis;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface EmotionSceneMetrics {
  totalScenes: number;
  averageIntensity: number;
  dominantEmotions: string[];
  confidenceStats: {
    min: number;
    max: number;
    average: number;
  };
  pacing: {
    averageLineLength: number;
    dialogueCount: number;
    actionCount: number;
    emotionalShifts: number;
  };
}
