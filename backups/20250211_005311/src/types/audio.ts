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
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT'
}

export enum AudioErrorCategory {
  INITIALIZATION = 'INITIALIZATION',
  RECORDING = 'RECORDING',
  PROCESSING = 'PROCESSING',
  NETWORK = 'NETWORK',
  CLEANUP = 'CLEANUP'
}

export interface AudioConfig {
  sampleRate: number;
  channels: number;
  bitDepth: number;
}

export interface RecordingSession {
  id: string;
  startTime: number;
  duration: number;
  audioData: Float32Array;
}

export interface TTSConfig {
  voice: string;
  speed: number;
  pitch: number;
  volume: number;
}

export interface AudioServiceStateData {
  state: AudioServiceState;
  error?: AudioServiceError;
  context?: AudioContext;
  session?: RecordingSession;
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

// Error recovery hints
export const ERROR_RECOVERY_HINTS: Record<AudioServiceError, string> = {
  [AudioServiceError.INITIALIZATION_FAILED]: 'Check your audio device connections and browser permissions. Try refreshing the page or using a different browser.',
  [AudioServiceError.TTS_INITIALIZATION_FAILED]: 'Verify your internet connection and API key. If the issue persists, try again in a few minutes.',
  [AudioServiceError.RECORDING_FAILED]: 'Check your microphone settings and permissions. Make sure no other application is using the microphone.',
  [AudioServiceError.PROCESSING_FAILED]: 'Try speaking more clearly and reducing background noise. If the issue persists, try lowering audio quality settings.',
  [AudioServiceError.CLEANUP_FAILED]: 'Refresh the page to reset audio resources. If issues continue, try clearing browser cache or restarting the browser.',
  [AudioServiceError.VAD_FAILED]: 'Adjust microphone sensitivity or try using a different microphone. Ensure stable audio input levels.',
  [AudioServiceError.NETWORK_TIMEOUT]: 'Check your internet connection speed and stability. Try again with a stronger connection or reduced quality settings.'
};

export interface AudioErrorDetails {
  code: AudioServiceError;
  message: string;
  details?: Record<string, unknown>;
  recoveryHint?: string;
}

export interface AudioServiceContext {
  audioContext: AudioContext;
  mediaRecorder?: MediaRecorder;
  audioWorklet?: AudioWorkletNode;
  vadProcessor?: AudioWorkletNode;
}

export interface AudioServiceSession {
  id: string;
  startTime: number;
  duration: number;
  audioData: Float32Array;
  metadata?: Record<string, unknown>;
}

export type StateTransitions = {
  [K in AudioServiceState]: {
    [E in AudioServiceEvent]?: AudioServiceState;
  };
};

export type AudioServiceStateType = keyof typeof AudioServiceState;
export type AudioServiceEventType = keyof typeof AudioServiceEvent;
export type AudioServiceErrorType = keyof typeof AudioServiceError;
export type AudioErrorCategoryType = keyof typeof AudioErrorCategory;

export interface RecordingResult {
  id: string;
  startTime: number;
  duration: number;
  audioData: Float32Array;
  accuracy?: number;
}

export interface VADConfig {
  sampleRate: number;
  bufferSize: number;
  noiseThreshold: number;
  silenceThreshold: number;
}

export interface ElevenLabsConfig {
  apiKey: string;
  voiceId: string;
  modelId: string;
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

export interface AudioService {
  initializeTTS(sessionId: string, userRole: string): Promise<void>;
  startRecording(sessionId: string): Promise<void>;
  stopRecording(sessionId: string): Promise<RecordingResult>;
  processAudioChunk(sessionId: string, chunk: Float32Array): Promise<boolean>;
  generateSpeech(params: TTSParams): Promise<Float32Array>;
}
