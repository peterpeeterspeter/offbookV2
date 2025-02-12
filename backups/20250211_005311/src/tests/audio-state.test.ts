import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AudioStateManager, AudioServiceState, AudioServiceEvent, AudioServiceError } from '../services/audio-state';

describe('AudioStateManager', () => {
  let stateManager: AudioStateManager;

  beforeEach(() => {
    // Reset singleton instance
    vi.spyOn(AudioStateManager as any, 'instance', 'get').mockReturnValue(undefined);
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
      expect(stateManager.transition(AudioServiceEvent.INITIALIZE)).toBe(true);
      expect(stateManager.getState().state).toBe(AudioServiceState.INITIALIZING);

      expect(stateManager.transition(AudioServiceEvent.INITIALIZED)).toBe(true);
      expect(stateManager.getState().state).toBe(AudioServiceState.READY);
    });

    it('should reject invalid transitions', () => {
      expect(stateManager.transition(AudioServiceEvent.STOP_RECORDING)).toBe(false);
      expect(stateManager.getState().state).toBe(AudioServiceState.UNINITIALIZED);
    });

    it('should handle error transitions from any state', () => {
      // From UNINITIALIZED
      stateManager.transition(AudioServiceEvent.ERROR, {
        error: AudioServiceError.INITIALIZATION_FAILED
      });
      expect(stateManager.getState().state).toBe(AudioServiceState.ERROR);
      expect(stateManager.getState().error).toBe(AudioServiceError.INITIALIZATION_FAILED);

      // Reset and try from READY
      stateManager.reset();
      stateManager.transition(AudioServiceEvent.INITIALIZE);
      stateManager.transition(AudioServiceEvent.INITIALIZED);
      stateManager.transition(AudioServiceEvent.ERROR, {
        error: AudioServiceError.RECORDING_FAILED
      });
      expect(stateManager.getState().state).toBe(AudioServiceState.ERROR);
      expect(stateManager.getState().error).toBe(AudioServiceError.RECORDING_FAILED);
    });
  });

  describe('state persistence', () => {
    beforeEach(() => {
      // Mock localStorage
      const store: Record<string, string> = {};
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
        store[key] = String(value);
      });
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => store[key]);
    });

    it('should persist state changes', () => {
      stateManager.transition(AudioServiceEvent.INITIALIZE);
      expect(localStorage.setItem).toHaveBeenCalled();

      const savedState = JSON.parse(localStorage.getItem('audioServiceState') || '{}');
      expect(savedState.state).toBe(AudioServiceState.INITIALIZING);
    });

    it('should restore persisted state', () => {
      // Setup initial state
      stateManager.transition(AudioServiceEvent.INITIALIZE);
      stateManager.transition(AudioServiceEvent.INITIALIZED);

      // Create new instance
      vi.spyOn(AudioStateManager as any, 'instance', 'get').mockReturnValue(undefined);
      const newManager = AudioStateManager.getInstance();
      newManager.restore();

      expect(newManager.getState().state).toBe(AudioServiceState.READY);
    });
  });

  describe('listeners', () => {
    it('should notify listeners of state changes', () => {
      const listener = vi.fn();
      stateManager.addListener(listener);

      stateManager.transition(AudioServiceEvent.INITIALIZE);
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        state: AudioServiceState.INITIALIZING
      }));
    });

    it('should allow removing listeners', () => {
      const listener = vi.fn();
      const removeListener = stateManager.addListener(listener);

      removeListener();
      stateManager.transition(AudioServiceEvent.INITIALIZE);
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      // Setup some state
      stateManager.transition(AudioServiceEvent.INITIALIZE);
      stateManager.transition(AudioServiceEvent.INITIALIZED);

      // Reset
      stateManager.reset();

      const state = stateManager.getState();
      expect(state).toEqual({
        state: AudioServiceState.UNINITIALIZED,
        error: null,
        session: {
          id: null,
          startTime: null,
          duration: null,
          chunks: 0
        },
        context: {
          sampleRate: 44100,
          channels: 1,
          isContextRunning: false
        }
      });
    });
  });
});
