import {
  AudioServiceState,
  AudioServiceEvent,
  AudioServiceError,
  AudioErrorCategory,
  type AudioServiceStateType,
  type AudioServiceEventType,
  type AudioServiceErrorType,
  type AudioErrorCategoryType,
  type AudioServiceContext,
  type AudioServiceSession,
  type AudioServiceStateData,
  type AudioErrorDetails,
  type StateTransitions
} from '@/types/audio';

// Re-export types
export type { AudioServiceState, AudioServiceEvent, AudioServiceError, AudioErrorCategory };

// Re-export types for convenience
export type {
  AudioServiceStateType,
  AudioServiceEventType,
  AudioServiceErrorType,
  AudioErrorCategoryType,
  AudioServiceContext,
  AudioServiceSession,
  AudioServiceStateData,
  AudioErrorDetails
};

type StateTransitionMap = {
  [K in AudioServiceStateType]?: {
    [E in AudioServiceEventType]?: AudioServiceStateType;
  };
};

const stateTransitions: StateTransitionMap = {
  [AudioServiceState.UNINITIALIZED]: {
    [AudioServiceEvent.INITIALIZE]: AudioServiceState.INITIALIZING,
    [AudioServiceEvent.CLEANUP]: AudioServiceState.UNINITIALIZED
  },
  [AudioServiceState.INITIALIZING]: {
    [AudioServiceEvent.INITIALIZED]: AudioServiceState.READY,
    [AudioServiceEvent.ERROR]: AudioServiceState.ERROR,
    [AudioServiceEvent.CLEANUP]: AudioServiceState.UNINITIALIZED
  },
  [AudioServiceState.READY]: {
    [AudioServiceEvent.RECORDING_START]: AudioServiceState.RECORDING,
    [AudioServiceEvent.ERROR]: AudioServiceState.ERROR,
    [AudioServiceEvent.CLEANUP]: AudioServiceState.UNINITIALIZED
  },
  [AudioServiceState.RECORDING]: {
    [AudioServiceEvent.RECORDING_STOP]: AudioServiceState.READY,
    [AudioServiceEvent.ERROR]: AudioServiceState.ERROR,
    [AudioServiceEvent.CLEANUP]: AudioServiceState.UNINITIALIZED
  },
  [AudioServiceState.ERROR]: {
    [AudioServiceEvent.INITIALIZE]: AudioServiceState.INITIALIZING,
    [AudioServiceEvent.CLEANUP]: AudioServiceState.UNINITIALIZED
  }
};

const errorMessageMap: Record<keyof typeof AudioServiceError, string> = {
  [AudioServiceError.INITIALIZATION_FAILED]: 'Failed to initialize audio service',
  [AudioServiceError.TTS_INITIALIZATION_FAILED]: 'Failed to initialize text-to-speech',
  [AudioServiceError.RECORDING_FAILED]: 'Recording failed',
  [AudioServiceError.CLEANUP_FAILED]: 'Failed to cleanup audio service',
  [AudioServiceError.PROCESSING_FAILED]: 'Processing failed',
  [AudioServiceError.VAD_FAILED]: 'Voice activity detection failed',
  [AudioServiceError.NETWORK_TIMEOUT]: 'Network timeout occurred'
};

export { errorMessageMap as ERROR_MESSAGES };

/**
 * Error recovery hints
 */
export const ERROR_RECOVERY_HINTS: Partial<Record<keyof typeof AudioServiceError, string>> = {
  INITIALIZATION_FAILED: 'Try again later or check your internet connection.',
  TTS_INITIALIZATION_FAILED: 'Try again later or check your internet connection.',
  RECORDING_FAILED: 'Try again later or check your audio settings.',
  PROCESSING_FAILED: 'Try reducing background noise or speaking more clearly.',
  CLEANUP_FAILED: 'Try again later or check your audio settings.',
  VAD_FAILED: 'Try again later or check your audio settings.'
};

/**
 * State manager for audio service
 */
export class AudioStateManager {
  private static instance: AudioStateManager;
  private state: AudioServiceStateData;
  private subscribers: Array<(state: AudioServiceStateData) => void> = [];

  private constructor() {
    this.state = {
      state: AudioServiceState.UNINITIALIZED,
      error: null,
      context: {
        sampleRate: 44100,
        channels: 1,
        isContextRunning: false,
        vadEnabled: false,
        vadThreshold: 0.5,
        vadSampleRate: 16000,
        vadBufferSize: 480,
        noiseThreshold: 0.2,
        silenceThreshold: 0.1
      },
      session: {
        id: null,
        startTime: null,
        duration: null,
        chunks: 0
      }
    };
  }

  static getInstance(): AudioStateManager {
    if (!AudioStateManager.instance) {
      AudioStateManager.instance = new AudioStateManager();
    }
    return AudioStateManager.instance;
  }

  getState(): AudioServiceStateData {
    return { ...this.state };
  }

  subscribe(callback: (state: AudioServiceStateData) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  transition(event: AudioServiceEventType, context?: Partial<AudioServiceStateData>): void {
    const currentState = this.state.state;
    const nextState = stateTransitions[currentState]?.[event];

    if (!nextState) {
      console.warn(`Invalid state transition: ${currentState} -> ${event}`);
      return;
    }

    this.state = {
      ...this.state,
      ...context,
      state: nextState
    };

    this.notifySubscribers();
  }

  createError(code: AudioServiceErrorType, details?: { originalError?: Error | undefined }): AudioErrorDetails {
    const category = this.getErrorCategory(code);
    const message = this.getErrorMessage(code);
    const retryable = this.isErrorRetryable(code);

    return {
      code,
      category,
      message,
      ...(details?.originalError && { originalError: details.originalError }),
      retryable
    };
  }

  private getErrorCategory(code: keyof typeof AudioServiceError): keyof typeof AudioErrorCategory {
    const categoryMap: Record<keyof typeof AudioServiceError, keyof typeof AudioErrorCategory> = {
      INITIALIZATION_FAILED: 'SYSTEM',
      TTS_INITIALIZATION_FAILED: 'SYSTEM',
      RECORDING_FAILED: 'DEVICE',
      PROCESSING_FAILED: 'SYSTEM',
      CLEANUP_FAILED: 'SYSTEM',
      VAD_FAILED: 'DEVICE',
      NETWORK_TIMEOUT: 'NETWORK'
    };

    return categoryMap[code];
  }

  private getErrorMessage(code: keyof typeof AudioServiceError): string {
    return errorMessageMap[code] ?? 'An unknown error occurred';
  }

  private isErrorRetryable(code: keyof typeof AudioServiceError): boolean {
    const nonRetryableErrors: Set<keyof typeof AudioServiceError> = new Set([
      'INITIALIZATION_FAILED',
      'TTS_INITIALIZATION_FAILED'
    ]);

    return !nonRetryableErrors.has(code);
  }

  private notifySubscribers(): void {
    const stateSnapshot = this.getState();
    this.subscribers.forEach(callback => callback(stateSnapshot));
  }

  restore(): void {
    this.state = {
      state: AudioServiceState.UNINITIALIZED,
      error: null,
      context: {
        sampleRate: 44100,
        channels: 1,
        isContextRunning: false,
        vadEnabled: false,
        vadThreshold: 0.5,
        vadSampleRate: 16000,
        vadBufferSize: 480,
        noiseThreshold: 0.2,
        silenceThreshold: 0.1
      },
      session: {
        id: null,
        startTime: null,
        duration: null,
        chunks: 0
      }
    };
  }
}
