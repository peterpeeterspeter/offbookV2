// Service types
export interface ServiceError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ServiceState<T> {
  state: string;
  error?: ServiceError;
  context: T;
}

export interface BaseService<T> {
  getState(): ServiceState<T>;
  addStateListener(listener: (state: ServiceState<T>) => void): () => void;
  removeStateListener(listener: (state: ServiceState<T>) => void): void;
}

// Audio types
export enum AudioServiceState {
  UNINITIALIZED = 'UNINITIALIZED',
  INITIALIZING = 'INITIALIZING',
  READY = 'READY',
  RECORDING = 'RECORDING',
  ERROR = 'ERROR'
}

export enum AudioServiceEvent {
  INITIALIZE = 'INITIALIZE',
  INITIALIZED = 'INITIALIZED',
  RECORDING_START = 'RECORDING_START',
  RECORDING_STOP = 'RECORDING_STOP',
  VAD_UPDATE = 'VAD_UPDATE',
  ERROR = 'ERROR',
  CLEANUP = 'CLEANUP'
}

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
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  BROWSER_UNSUPPORTED = 'BROWSER_UNSUPPORTED',
  MEMORY_EXCEEDED = 'MEMORY_EXCEEDED'
}

export enum AudioErrorCategory {
  INITIALIZATION = 'INITIALIZATION',
  RECORDING = 'RECORDING',
  PROCESSING = 'PROCESSING',
  NETWORK = 'NETWORK',
  PERMISSION = 'PERMISSION',
  DEVICE = 'DEVICE',
  SYSTEM = 'SYSTEM',
  BROWSER = 'BROWSER',
  RESOURCE = 'RESOURCE'
}

export interface AudioConfig {
  sampleRate: number;
  channelCount: number;
  latencyHint?: 'interactive' | 'playback' | 'balanced';
}

export interface VADConfig {
  sampleRate: number;
  bufferSize: number;
  noiseThreshold: number;
  silenceThreshold: number;
}

export interface ElevenLabsConfig {
  apiKey: string;
  modelId: string;
}

export interface TTSConfig {
  provider: 'elevenlabs';
  config: ElevenLabsConfig;
}

export interface RecordingSession {
  id: string;
  startTime: number;
  duration: number;
  audioData: Float32Array;
}

export interface TTSSession {
  id: string;
  voice: string;
  text: string;
}

export interface CueSignal {
  type: 'start' | 'stop';
  timestamp: number;
}

export interface CueDisplay {
  visible: boolean;
  text?: string;
  duration?: number;
}

export interface SceneProgression {
  currentScene: number;
  totalScenes: number;
  completed: boolean;
}

export interface AudioService extends BaseService<AudioServiceContext> {
  setup(): Promise<void>;
  cleanup(): Promise<void>;
  initializeTTS(sessionId: string, userRole: string): Promise<void>;
  startRecording(sessionId: string): Promise<void>;
  stopRecording(sessionId: string): Promise<RecordingResult>;
  processAudioChunk(sessionId: string, chunk: Float32Array): Promise<boolean>;
  generateSpeech(params: TTSParams): Promise<Float32Array>;
  transcribe(audioData: ArrayBuffer): Promise<{ text: string; confidence: number }>;
  detectEmotion(audioData: ArrayBuffer): Promise<{ type: string; confidence: number } | null>;
}

export interface AudioServiceContext {
  vadBufferSize: number;
  noiseThreshold: number;
  silenceThreshold: number;
  audioContext?: AudioContext;
  sampleRate: number;
  channelCount: number;
  latencyHint?: 'interactive' | 'playback' | 'balanced';
  vadEnabled?: boolean;
  vadThreshold?: number;
  vadSampleRate?: number;
  isContextRunning?: boolean;
}

export interface AudioServiceStateData extends ServiceState<AudioServiceContext> {
  state: AudioServiceState;
  error?: ServiceError;
  context: AudioServiceContext;
  isContextRunning: boolean;
  sampleRate: number;
  batteryLevel?: number;
  networkQuality?: number;
  vad?: VADState;
}

export interface AudioErrorDetails extends ServiceError {
  code: AudioServiceError;
  category: AudioErrorCategory;
  details?: Record<string, unknown>;
  name?: string;
  retryable?: boolean;
}

export interface RecordingResult {
  audioData: Float32Array;
  duration: number;
  hasVoice: boolean;
  metrics?: {
    averageAmplitude: number;
    peakAmplitude: number;
    silenceRatio: number;
    processingTime: number;
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

export interface VADState {
  enabled: boolean;
  threshold: number;
  sampleRate: number;
  bufferSize: number;
  active: boolean;
  speaking?: boolean;
  noiseLevel?: number;
  lastActivity?: number;
  confidence?: number;
  lastVoiceDetectedAt?: number;
}

export const ERROR_RECOVERY_HINTS = {
  [AudioServiceError.INITIALIZATION_FAILED]: 'Check your audio device connections and browser permissions. Try refreshing the page or using a different browser.',
  [AudioServiceError.TTS_INITIALIZATION_FAILED]: 'Verify your internet connection and API key. If the issue persists, try again in a few minutes.',
  [AudioServiceError.RECORDING_FAILED]: 'Check your microphone settings and permissions. Make sure no other application is using the microphone.',
  [AudioServiceError.CLEANUP_FAILED]: 'Try refreshing the page to reset the audio system.',
  [AudioServiceError.PROCESSING_FAILED]: 'The audio processing failed. Try again with a shorter recording.',
  [AudioServiceError.VAD_FAILED]: 'Voice activity detection failed. Check your microphone settings.',
  [AudioServiceError.NETWORK_TIMEOUT]: 'Check your internet connection and try again.',
  [AudioServiceError.PERMISSION_DENIED]: 'Please grant microphone permissions to use this feature.',
  [AudioServiceError.DEVICE_NOT_FOUND]: 'Connect a microphone or audio input device. If using an external device, try reconnecting it.',
  [AudioServiceError.DEVICE_IN_USE]: 'Close other applications that might be using your microphone. Try selecting a different audio input device.',
  [AudioServiceError.SYSTEM_ERROR]: 'A system error occurred. Try refreshing the page or restarting your browser.',
  [AudioServiceError.BROWSER_UNSUPPORTED]: 'Your browser does not support required audio features. Try using a modern browser.',
  [AudioServiceError.MEMORY_EXCEEDED]: 'Memory limit exceeded. Try closing other tabs or applications.'
} as const;
