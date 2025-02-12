import type { Service, ServiceState, ServiceError, ServiceEvent } from './core';

// Audio service states
export enum AudioServiceState {
  UNINITIALIZED = 'UNINITIALIZED',
  INITIALIZING = 'INITIALIZING',
  READY = 'READY',
  RECORDING = 'RECORDING',
  ERROR = 'ERROR'
}

// Audio service events
export enum AudioServiceEvent {
  INITIALIZE = 'INITIALIZE',
  INITIALIZED = 'INITIALIZED',
  RECORDING_START = 'RECORDING_START',
  RECORDING_STOP = 'RECORDING_STOP',
  CLEANUP = 'CLEANUP',
  ERROR = 'ERROR',
  VAD_UPDATE = 'VAD_UPDATE'
}

// Audio service errors
export enum AudioServiceError {
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',
  TTS_INITIALIZATION_FAILED = 'TTS_INITIALIZATION_FAILED',
  RECORDING_FAILED = 'RECORDING_FAILED',
  CLEANUP_FAILED = 'CLEANUP_FAILED',
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  VAD_FAILED = 'VAD_FAILED',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  DEVICE_NOT_FOUND = 'DEVICE_NOT_FOUND',
  DEVICE_IN_USE = 'DEVICE_IN_USE',
  SYSTEM_ERROR = 'SYSTEM_ERROR'
}

// Audio error categories
export enum AudioErrorCategory {
  INITIALIZATION = 'INITIALIZATION',
  RECORDING = 'RECORDING',
  CLEANUP = 'CLEANUP',
  PROCESSING = 'PROCESSING',
  NETWORK = 'NETWORK',
  PERMISSION = 'PERMISSION',
  DEVICE = 'DEVICE',
  SYSTEM = 'SYSTEM'
}

// Configuration interfaces
export interface AudioConfig {
  sampleRate: number;
  channels: number;
  bitDepth: number;
}

export interface TTSConfig {
  voice: string;
  settings?: {
    speed: number;
    pitch: number;
    volume: number;
  };
}

export interface TTSParams {
  text: string;
  voice: string;
  settings?: {
    speed: number;
    pitch: number;
    volume: number;
  };
}

// Recording interfaces
export interface RecordingSession {
  id: string;
  startTime: number;
  duration: number;
  audioData: Float32Array;
}

export interface RecordingResult {
  id: string;
  startTime: number;
  audioData: Float32Array;
  duration: number;
  accuracy?: number;
  timing?: {
    start: number;
    end: number;
    segments: Array<{
      start: number;
      end: number;
      text: string;
    }>;
  };
  transcription?: string;
}

// Service interfaces
export interface AudioProcessor extends Service {
  processAudioChunk(chunk: Float32Array): Promise<boolean>;
  getProcessedData(): Float32Array;
  reset(): Promise<void>;
}

export interface TTSService extends Service {
  generateSpeech(params: TTSParams): Promise<Float32Array>;
  getVoices(): Promise<Array<{ id: string; name: string }>>;
}

export interface RecordingService extends Service {
  startRecording(sessionId: string): Promise<void>;
  stopRecording(sessionId: string): Promise<RecordingResult>;
  isRecording(): boolean;
}

// State interfaces
export interface AudioServiceContext {
  sampleRate: number;
  channels: number;
  isContextRunning: boolean;
  vadEnabled: boolean;
  vadThreshold: number;
  vadSampleRate: number;
  vadBufferSize: number;
  noiseThreshold: number;
  silenceThreshold: number;
}

export interface AudioErrorDetails {
  name: string;
  code: AudioServiceError;
  category: AudioErrorCategory;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

export interface AudioServiceStateData extends ServiceState<AudioServiceContext> {
  state: AudioServiceState;
  error?: AudioErrorDetails;
  context: AudioServiceContext;
  session: AudioServiceSession;
  vad?: VADState;
}

// VAD interfaces
export interface VADConfig {
  sampleRate: number;
  bufferSize: number;
  noiseThreshold: number;
  silenceThreshold: number;
}

export interface VADState {
  speaking: boolean;
  noiseLevel: number;
  lastActivity: number;
  confidence: number;
}

// Session interfaces
export interface AudioServiceSession {
  id: string | null;
  startTime: number | null;
  duration: number | null;
  chunks: number;
}

// Error recovery hints
export const ERROR_RECOVERY_HINTS: Record<AudioServiceError, string> = {
  [AudioServiceError.INITIALIZATION_FAILED]: 'Check your audio device connections and browser permissions. Try refreshing the page or using a different browser.',
  [AudioServiceError.TTS_INITIALIZATION_FAILED]: 'Verify your internet connection and API key. If the issue persists, try again in a few minutes.',
  [AudioServiceError.RECORDING_FAILED]: 'Check your microphone settings and permissions. Make sure no other application is using the microphone.',
  [AudioServiceError.PROCESSING_FAILED]: 'Try speaking more clearly and reducing background noise. If the issue persists, try lowering audio quality settings.',
  [AudioServiceError.CLEANUP_FAILED]: 'Refresh the page to reset audio resources. If issues continue, try clearing browser cache or restarting the browser.',
  [AudioServiceError.VAD_FAILED]: 'Adjust microphone sensitivity or try using a different microphone. Ensure stable audio input levels.',
  [AudioServiceError.NETWORK_TIMEOUT]: 'Check your internet connection speed and stability. Try again with a stronger connection or reduced quality settings.',
  [AudioServiceError.PERMISSION_DENIED]: 'Grant microphone access in your browser settings. You may need to refresh the page after allowing access.',
  [AudioServiceError.DEVICE_NOT_FOUND]: 'Connect a microphone or audio input device. If using an external device, try reconnecting it.',
  [AudioServiceError.DEVICE_IN_USE]: 'Close other applications that might be using your microphone. Try selecting a different audio input device.',
  [AudioServiceError.SYSTEM_ERROR]: 'A system error occurred. Try refreshing the page or restarting your browser.'
};

export type StateTransitions = {
  [K in AudioServiceState]: {
    [E in AudioServiceEvent]?: AudioServiceState;
  };
};

export type AudioServiceStateType = AudioServiceState;
export type AudioServiceEventType = AudioServiceEvent;
export type AudioServiceErrorType = AudioServiceError;
export type AudioErrorCategoryType = AudioErrorCategory;

export interface AudioService {
  initializeTTS(sessionId: string, userRole: string): Promise<void>;
  startRecording(sessionId: string): Promise<void>;
  stopRecording(sessionId: string): Promise<RecordingResult>;
  processAudioChunk(sessionId: string, chunk: Float32Array): Promise<boolean>;
  generateSpeech(params: TTSParams): Promise<Float32Array>;
}

export interface CueSignal {
  type: 'start' | 'stop';
  timestamp: number;
}

export interface CueDisplay {
  text: string;
  duration: number;
  emotion?: string;
}

export interface SceneProgression {
  currentScene: number;
  totalScenes: number;
  progress: number;
}

export interface ElevenLabsConfig {
  apiKey: string;
  voiceId: string;
  modelId: string;
}

export interface TTSSession {
  id: string;
  text: string;
  voice: string;
  settings: {
    speed: number;
    pitch: number;
    volume: number;
  };
  audioData?: Float32Array;
}
