// Error recovery hints
export const ERROR_RECOVERY_HINTS: Record<AudioServiceErrorType, string> = {
  INITIALIZATION_FAILED: 'Check your audio device connections and browser permissions. Try refreshing the page or using a different browser.',
  TTS_INITIALIZATION_FAILED: 'Verify your internet connection and API key. If the issue persists, try again in a few minutes.',
  RECORDING_FAILED: 'Check your microphone settings and permissions. Make sure no other application is using the microphone.',
  PROCESSING_FAILED: 'Try speaking more clearly and reducing background noise. If the issue persists, try lowering audio quality settings.',
  CLEANUP_FAILED: 'Refresh the page to reset audio resources. If issues continue, try clearing browser cache or restarting the browser.',
  VAD_FAILED: 'Adjust microphone sensitivity or try using a different microphone. Ensure stable audio input levels.',
  NETWORK_TIMEOUT: 'Check your internet connection speed and stability. Try again with a stronger connection or reduced quality settings.'
};

export enum AudioServiceErrorType {
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',
  RECORDING_FAILED = 'RECORDING_FAILED',
  PLAYBACK_FAILED = 'PLAYBACK_FAILED',
  INVALID_STATE = 'INVALID_STATE',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  DEVICE_NOT_FOUND = 'DEVICE_NOT_FOUND',
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  TTS_INITIALIZATION_FAILED = 'TTS_INITIALIZATION_FAILED',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT'
}

export const ERROR_MESSAGES: Record<AudioServiceErrorType, string> = {
  [AudioServiceErrorType.INITIALIZATION_FAILED]: 'Failed to initialize audio service. Please check your audio settings and try again.',
  [AudioServiceErrorType.RECORDING_FAILED]: 'Failed to start recording. Please check your microphone permissions and try again.',
  [AudioServiceErrorType.PLAYBACK_FAILED]: 'Failed to play audio. Please check your audio output settings.',
  [AudioServiceErrorType.INVALID_STATE]: 'Invalid operation for current state. Please try again.',
  [AudioServiceErrorType.PERMISSION_DENIED]: 'Microphone access denied. Please grant microphone permissions to use this feature.',
  [AudioServiceErrorType.DEVICE_NOT_FOUND]: 'No audio input device found. Please connect a microphone and try again.',
  [AudioServiceErrorType.NETWORK_ERROR]: 'Network error occurred. Please check your internet connection.',
  [AudioServiceErrorType.API_ERROR]: 'API error occurred. Please try again later.',
  [AudioServiceErrorType.TTS_INITIALIZATION_FAILED]: 'Failed to initialize text-to-speech service. Please check your API key and try again.',
  [AudioServiceErrorType.NETWORK_TIMEOUT]: 'Network timeout. Please check your internet connection speed and stability.'
};

export interface RecordingResult {
  duration: number;
  accuracy: number;
  timing: {
    start: number;
    end: number;
    segments: Array<{
      start: number;
      end: number;
      text: string;
    }>;
  };
  transcription: string;
}

export interface AudioServiceState {
  isInitialized: boolean;
  isRecording: boolean;
  error: Error | null;
  context: AudioContext;
}

export interface AudioServiceEvent {
  type: 'start' | 'stop' | 'error' | 'data';
  data?: any;
  error?: Error;
}

export interface AudioServiceError extends Error {
  code: string;
  details?: Record<string, unknown>;
}

export interface VADConfig {
  threshold: number;
  windowSize: number;
  sampleRate: number;
}

export interface ElevenLabsConfig {
  apiKey: string;
  voiceId: string;
  modelId: string;
}

export interface TTSParams {
  text: string;
  voiceId: string;
  settings?: {
    stability: number;
    similarity_boost: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
}

export interface TTSSession {
  id: string;
  voiceId: string;
  text: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  audioUrl?: string;
  error?: Error;
}

// ... existing code ...
