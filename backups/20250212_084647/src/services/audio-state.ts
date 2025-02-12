import {
  AudioServiceState,
  AudioServiceEvent,
  AudioServiceError,
  AudioErrorCategory,
  AudioServiceStateType,
  AudioServiceEventType,
  AudioServiceErrorType,
  AudioErrorCategoryType,
  AudioServiceContext,
  AudioServiceSession,
  AudioServiceStateData,
  AudioErrorDetails,
  StateTransitions
} from '@/types/audio';

// Export enums as values
export {
  AudioServiceState,
  AudioServiceEvent,
  AudioServiceError,
  AudioErrorCategory
};

// Export types
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
    [AudioServiceEvent.CLEANUP]: AudioServiceState.UNINITIALIZED,
    [AudioServiceEvent.ERROR]: AudioServiceState.ERROR
  },
  [AudioServiceState.INITIALIZING]: {
    [AudioServiceEvent.INITIALIZED]: AudioServiceState.READY,
    [AudioServiceEvent.ERROR]: AudioServiceState.ERROR,
    [AudioServiceEvent.CLEANUP]: AudioServiceState.UNINITIALIZED
  },
  [AudioServiceState.READY]: {
    [AudioServiceEvent.RECORDING_START]: AudioServiceState.RECORDING,
    [AudioServiceEvent.ERROR]: AudioServiceState.ERROR,
    [AudioServiceEvent.CLEANUP]: AudioServiceState.UNINITIALIZED,
    [AudioServiceEvent.INITIALIZE]: AudioServiceState.INITIALIZING
  },
  [AudioServiceState.RECORDING]: {
    [AudioServiceEvent.RECORDING_STOP]: AudioServiceState.READY,
    [AudioServiceEvent.ERROR]: AudioServiceState.ERROR,
    [AudioServiceEvent.CLEANUP]: AudioServiceState.UNINITIALIZED,
    [AudioServiceEvent.VAD_UPDATE]: AudioServiceState.RECORDING
  },
  [AudioServiceState.ERROR]: {
    [AudioServiceEvent.INITIALIZE]: AudioServiceState.INITIALIZING,
    [AudioServiceEvent.CLEANUP]: AudioServiceState.UNINITIALIZED,
    [AudioServiceEvent.ERROR]: AudioServiceState.ERROR
  }
};

const errorMessageMap: Record<keyof typeof AudioServiceError, string> = {
  [AudioServiceError.INITIALIZATION_FAILED]: 'Failed to initialize audio service',
  [AudioServiceError.TTS_INITIALIZATION_FAILED]: 'Failed to initialize text-to-speech',
  [AudioServiceError.RECORDING_FAILED]: 'Recording failed',
  [AudioServiceError.CLEANUP_FAILED]: 'Failed to cleanup audio service',
  [AudioServiceError.PROCESSING_FAILED]: 'Audio processing failed',
  [AudioServiceError.VAD_FAILED]: 'Voice activity detection failed',
  [AudioServiceError.NETWORK_TIMEOUT]: 'Network request timed out',
  [AudioServiceError.PERMISSION_DENIED]: 'Microphone permission denied',
  [AudioServiceError.DEVICE_NOT_FOUND]: 'Audio device not found',
  [AudioServiceError.DEVICE_IN_USE]: 'Audio device is in use',
  [AudioServiceError.SYSTEM_ERROR]: 'System error occurred'
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
      status: 'uninitialized',
      timestamp: Date.now(),
      error: undefined,
      context: {
        sampleRate: 44100,
        channels: 1,
        isContextRunning: false,
        vadEnabled: false,
        vadThreshold: 0.5,
        vadSampleRate: 16000,
        vadBufferSize: 480,
        noiseThreshold: 0.1,
        silenceThreshold: 0.2
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
    const transitions = stateTransitions[currentState];
    const nextState = transitions?.[event];

    if (!nextState) {
      console.warn(`Invalid transition: ${currentState} -> ${event}`);
      return;
    }

    this.state = {
      ...this.state,
      ...context,
      state: nextState,
      status: nextState === AudioServiceState.ERROR ? 'error' :
             nextState === AudioServiceState.UNINITIALIZED ? 'uninitialized' :
             nextState === AudioServiceState.INITIALIZING ? 'initializing' : 'ready',
      timestamp: Date.now(),
      // Clear error when transitioning out of ERROR state
      error: nextState === AudioServiceState.ERROR ? this.state.error : undefined
    };

    this.notifySubscribers();
  }

  createError(code: AudioServiceError, details?: { originalError?: Error }): AudioErrorDetails {
    const category = this.getErrorCategory(code);
    const message = this.getErrorMessage(code);
    const retryable = this.isErrorRetryable(code);

    return {
      name: `AudioError_${code}`,
      code,
      category,
      message,
      retryable,
      details: details || {}
    };
  }

  private getErrorCategory(code: AudioServiceError): AudioErrorCategory {
    const categoryMap: Record<AudioServiceError, AudioErrorCategory> = {
      [AudioServiceError.INITIALIZATION_FAILED]: AudioErrorCategory.INITIALIZATION,
      [AudioServiceError.TTS_INITIALIZATION_FAILED]: AudioErrorCategory.INITIALIZATION,
      [AudioServiceError.RECORDING_FAILED]: AudioErrorCategory.RECORDING,
      [AudioServiceError.CLEANUP_FAILED]: AudioErrorCategory.CLEANUP,
      [AudioServiceError.PROCESSING_FAILED]: AudioErrorCategory.PROCESSING,
      [AudioServiceError.VAD_FAILED]: AudioErrorCategory.PROCESSING,
      [AudioServiceError.NETWORK_TIMEOUT]: AudioErrorCategory.NETWORK,
      [AudioServiceError.PERMISSION_DENIED]: AudioErrorCategory.PERMISSION,
      [AudioServiceError.DEVICE_NOT_FOUND]: AudioErrorCategory.DEVICE,
      [AudioServiceError.DEVICE_IN_USE]: AudioErrorCategory.DEVICE,
      [AudioServiceError.SYSTEM_ERROR]: AudioErrorCategory.SYSTEM
    };
    return categoryMap[code];
  }

  private getErrorMessage(code: AudioServiceError): string {
    return errorMessageMap[code] ?? 'An unknown error occurred';
  }

  private isErrorRetryable(code: AudioServiceError): boolean {
    const nonRetryableErrors: Set<AudioServiceError> = new Set([
      AudioServiceError.INITIALIZATION_FAILED,
      AudioServiceError.TTS_INITIALIZATION_FAILED
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
      status: 'uninitialized',
      timestamp: Date.now(),
      error: undefined,
      context: {
        sampleRate: 44100,
        channels: 1,
        isContextRunning: false,
        vadEnabled: false,
        vadThreshold: 0.5,
        vadSampleRate: 16000,
        vadBufferSize: 480,
        noiseThreshold: 0.1,
        silenceThreshold: 0.2
      },
      session: {
        id: null,
        startTime: null,
        duration: null,
        chunks: 0
      }
    };
    this.notifySubscribers();
  }
}
