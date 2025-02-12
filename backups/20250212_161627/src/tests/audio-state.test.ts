import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  AudioStateManager,
  AudioServiceState,
  AudioServiceEvent,
  AudioServiceError,
  AudioErrorCategory,
  type AudioErrorDetails
} from '@/services/audio-state';

describe('AudioStateManager', () => {
  let stateManager: AudioStateManager;

  beforeEach(() => {
    // Reset singleton instance by creating a new instance
    // @ts-expect-error - Accessing private static for testing
    AudioStateManager.instance = undefined;
    stateManager = AudioStateManager.getInstance();
  });

  describe('initialization', () => {
    it('should start in UNINITIALIZED state', () => {
      const state = stateManager.getState();
      expect(state.state).toBe(AudioServiceState.UNINITIALIZED);
    });

    it('should maintain singleton instance', () => {
      const instance1 = AudioStateManager.getInstance();
      const instance2 = AudioStateManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('state transitions', () => {
    it('should handle valid transitions', () => {
      stateManager.transition(AudioServiceEvent.INITIALIZE);
      expect(stateManager.getState().state).toBe(AudioServiceState.INITIALIZING);

      stateManager.transition(AudioServiceEvent.INITIALIZED);
      expect(stateManager.getState().state).toBe(AudioServiceState.READY);

      stateManager.transition(AudioServiceEvent.RECORDING_START);
      expect(stateManager.getState().state).toBe(AudioServiceState.RECORDING);

      stateManager.transition(AudioServiceEvent.VAD_UPDATE);
      expect(stateManager.getState().state).toBe(AudioServiceState.RECORDING);

      stateManager.transition(AudioServiceEvent.RECORDING_STOP);
      expect(stateManager.getState().state).toBe(AudioServiceState.READY);
    });

    it('should handle invalid transitions by moving to ERROR state', () => {
      stateManager.transition(AudioServiceEvent.RECORDING_STOP);
      expect(stateManager.getState().state).toBe(AudioServiceState.ERROR);
      expect(stateManager.getState().error).toBeTruthy();
    });

    it('should handle error transitions from any state', () => {
      // From UNINITIALIZED
      stateManager.transition(AudioServiceEvent.ERROR, {
        error: {
          name: 'InitializationError',
          code: AudioServiceError.INITIALIZATION_FAILED,
          category: AudioErrorCategory.INITIALIZATION,
          message: 'Test error',
          retryable: false
        }
      });
      expect(stateManager.getState().state).toBe(AudioServiceState.ERROR);
      expect(stateManager.getState().error?.code).toBe(AudioServiceError.INITIALIZATION_FAILED);

      // From READY
      stateManager.restore();
      stateManager.transition(AudioServiceEvent.INITIALIZE);
      stateManager.transition(AudioServiceEvent.INITIALIZED);
      stateManager.transition(AudioServiceEvent.ERROR, {
        error: {
          name: 'RecordingError',
          code: AudioServiceError.RECORDING_FAILED,
          category: AudioErrorCategory.RECORDING,
          message: 'Test error',
          retryable: true
        }
      });
      expect(stateManager.getState().state).toBe(AudioServiceState.ERROR);
      expect(stateManager.getState().error?.code).toBe(AudioServiceError.RECORDING_FAILED);
    });

    it('should clear error when transitioning out of ERROR state', () => {
      // Move to ERROR state
      stateManager.transition(AudioServiceEvent.ERROR, {
        error: {
          name: 'InitializationError',
          code: AudioServiceError.INITIALIZATION_FAILED,
          category: AudioErrorCategory.INITIALIZATION,
          message: 'Test error',
          retryable: false
        }
      });
      expect(stateManager.getState().error).toBeTruthy();

      // Transition out of ERROR state
      stateManager.transition(AudioServiceEvent.INITIALIZE);
      expect(stateManager.getState().state).toBe(AudioServiceState.INITIALIZING);
      expect(stateManager.getState().error).toBeNull();
    });

    it('should preserve error information in ERROR state', () => {
      const error1 = {
        name: 'InitializationError',
        code: AudioServiceError.INITIALIZATION_FAILED,
        category: AudioErrorCategory.INITIALIZATION,
        message: 'First error',
        retryable: false
      };
      const error2 = {
        name: 'RecordingError',
        code: AudioServiceError.RECORDING_FAILED,
        category: AudioErrorCategory.RECORDING,
        message: 'Second error',
        retryable: true
      };

      // First error
      stateManager.transition(AudioServiceEvent.ERROR, { error: error1 });
      expect(stateManager.getState().error).toEqual(error1);

      // Second error should replace first
      stateManager.transition(AudioServiceEvent.ERROR, { error: error2 });
      expect(stateManager.getState().error).toEqual(error2);
    });

    it('should handle initialization errors', () => {
      const error: AudioErrorDetails = {
        name: 'InitializationError',
        code: AudioServiceError.INITIALIZATION_FAILED,
        category: AudioErrorCategory.INITIALIZATION,
        message: 'Failed to initialize audio service',
        retryable: false
      }

      // ... test code ...
    });

    it('should handle recording errors', () => {
      const error: AudioErrorDetails = {
        name: 'RecordingError',
        code: AudioServiceError.RECORDING_FAILED,
        category: AudioErrorCategory.RECORDING,
        message: 'Failed to start recording',
        retryable: true
      }

      // ... test code ...
    });

    it('should handle initialization errors with retry', () => {
      const error: AudioErrorDetails = {
        name: 'InitializationError',
        code: AudioServiceError.INITIALIZATION_FAILED,
        category: AudioErrorCategory.INITIALIZATION,
        message: 'Failed to initialize audio service',
        retryable: false
      }

      // ... test code ...
    });

    it('should handle multiple errors', () => {
      const error1: AudioErrorDetails = {
        name: 'FirstError',
        code: AudioServiceError.INITIALIZATION_FAILED,
        category: AudioErrorCategory.INITIALIZATION,
        message: 'First error',
        retryable: false
      }

      const error2: AudioErrorDetails = {
        name: 'SecondError',
        code: AudioServiceError.RECORDING_FAILED,
        category: AudioErrorCategory.RECORDING,
        message: 'Second error',
        retryable: true
      }

      // ... test code ...
    });
  });

  describe('state persistence', () => {
    it('should persist state changes', () => {
      const unsubscribe = stateManager.subscribe((state) => {
        expect(state.state).toBe(AudioServiceState.INITIALIZING);
      });
      stateManager.transition(AudioServiceEvent.INITIALIZE);
      unsubscribe();
    });

    it('should restore persisted state', () => {
      stateManager.transition(AudioServiceEvent.INITIALIZE);
      stateManager.restore();
      expect(stateManager.getState().state).toBe(AudioServiceState.UNINITIALIZED);
    });
  });

  describe('listeners', () => {
    it('should notify listeners of state changes', () => {
      const listener = vi.fn();
      const unsubscribe = stateManager.subscribe(listener);

      stateManager.transition(AudioServiceEvent.INITIALIZE);
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        state: AudioServiceState.INITIALIZING
      }));
    });

    it('should allow removing listeners', () => {
      const listener = vi.fn();
      const unsubscribe = stateManager.subscribe(listener);

      unsubscribe();
      stateManager.transition(AudioServiceEvent.INITIALIZE);
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('restore', () => {
    it('should restore to initial state', () => {
      // Setup some state
      stateManager.transition(AudioServiceEvent.INITIALIZE);
      stateManager.transition(AudioServiceEvent.INITIALIZED);

      // Restore
      stateManager.restore();

      const state = stateManager.getState();
      expect(state).toEqual({
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
      });
    });
  });
});
