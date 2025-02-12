import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { AudioService } from '../audio-service';
import { AudioServiceState, AudioServiceStateData } from '../audio-state';
import type { AudioServiceType } from '@/components/SceneFlow';
import { waitForStateUpdate } from '../../test/setup';
import { AudioServiceError } from '@/types/audio';

// Mock VADService
vi.mock('../vad-service', () => ({
  VADService: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    start: vi.fn(),
    stop: vi.fn(),
    cleanup: vi.fn().mockResolvedValue(undefined)
  }))
}));

// Extend global fetch type
declare global {
  var fetch: Mock<Parameters<typeof fetch>, ReturnType<typeof fetch>>;
}

// Mock MediaRecorder with proper cleanup
class MockMediaRecorder {
  state: 'inactive' | 'recording' = 'inactive';
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  private timeoutId: NodeJS.Timeout | null = null;

  start = (): void => {
    this.state = 'recording';
    // Simulate data available event after a short delay
    this.timeoutId = setTimeout(() => {
      if (this.ondataavailable) {
        const event = new Event('dataavailable') as BlobEvent;
        Object.defineProperty(event, 'data', { value: new Blob(['test'], { type: 'audio/webm' }) });
        this.ondataavailable(event);
      }
    }, 100);
  };

  stop = (): void => {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.state = 'inactive';
    if (this.onstop) this.onstop();
  };

  cleanup = (): void => {
    this.stop();
    this.ondataavailable = null;
    this.onstop = null;
    this.onerror = null;
  };
}

// Mock navigator.mediaDevices
const mockTracks = [{
  stop: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
}];

Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => mockTracks,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    })
  }
});

// Mock AudioContext with proper cleanup
class MockAudioContext {
  state = 'running';
  sampleRate = 44100;
  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);

  private source: { connect: Mock; disconnect: Mock } | null = null;
  private analyser: {
    getFloatTimeDomainData: (array: Float32Array) => void;
    fftSize: number;
    frequencyBinCount: number;
    disconnect: Mock;
  } | null = null;

  createMediaStreamSource = (): { connect: Mock; disconnect: Mock } => {
    this.source = {
      connect: vi.fn(),
      disconnect: vi.fn()
    };
    return this.source;
  };

  createAnalyser = () => {
    this.analyser = {
      getFloatTimeDomainData: (array: Float32Array): void => {
        array.fill(0);
      },
      fftSize: 2048,
      frequencyBinCount: 1024,
      disconnect: vi.fn()
    };
    return this.analyser;
  };

  cleanup = (): void => {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
  };
}

global.AudioContext = MockAudioContext as any;
global.MediaRecorder = MockMediaRecorder as any;

describe('AudioService', () => {
  let mockMediaRecorder: MockMediaRecorder;
  let mockAudioContext: MockAudioContext;

  const setupTest = async (): Promise<void> => {
    vi.clearAllMocks();
    mockMediaRecorder = new MockMediaRecorder();
    mockAudioContext = new MockAudioContext();

    // Reset mocks and service
    await AudioService.cleanup();
    await waitForStateUpdate();
  };

  const cleanupTest = async (): Promise<void> => {
    // Cleanup mocks
    mockMediaRecorder.cleanup();
    mockAudioContext.cleanup();
    mockTracks[0]?.stop.mockClear();

    // Cleanup service
    await AudioService.cleanup();
    await waitForStateUpdate();
  };

  beforeEach(setupTest);
  afterEach(cleanupTest);

  beforeEach(() => {
    // Reset fetch mock
    (global.fetch as Mock).mockClear();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await AudioService.setup();
      const state = AudioService.getState();
      expect(state.state).toBe(AudioServiceState.READY);
      expect(state.error).toBeUndefined();
    });

    it('should handle initialization failure', async () => {
      // Mock getUserMedia to fail
      (navigator.mediaDevices.getUserMedia as Mock).mockImplementationOnce(() =>
        Promise.reject(new Error('Permission denied'))
      );

      await expect(AudioService.setup()).rejects.toThrow();
      const state = AudioService.getState();
      expect(state.state).toBe(AudioServiceState.ERROR);
      expect(state.error).toBeDefined();
      expect(state.error?.code).toBe(AudioServiceError.INITIALIZATION_FAILED);
    });
  });

  describe('Recording', () => {
    beforeEach(async () => {
      await AudioService.setup();
    });

    it('should start recording successfully', async () => {
      await AudioService.startRecording('test-session');
      const state = AudioService.getState();
      expect(state.state).toBe(AudioServiceState.RECORDING);
    });

    it('should stop recording and return result', async () => {
      await AudioService.startRecording('test-session');
      const result = await AudioService.stopRecording('test-session');

      expect(result).toBeDefined();
      expect(result.audioData).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);

      const state = AudioService.getState();
      expect(state.state).toBe(AudioServiceState.READY);
    });

    it('should handle recording errors', async () => {
      const sessionId = 'test-session-2';
      await expect(AudioService.startRecording(sessionId)).rejects.toThrow('Recording failed');
    });

    it('should handle multiple recording sessions', async () => {
      const sessionId = 'test-session-3';
      await AudioService.startRecording(sessionId);
      await AudioService.stopRecording(sessionId);
    });

    beforeEach(async () => {
      const sessionId = 'test-session';
      await AudioService.startRecording(sessionId);
    });

    afterEach(async () => {
      const sessionId = 'test-session';
      await AudioService.stopRecording(sessionId);
    });

    it('should handle recording state', async () => {
      const sessionId = 'test-session';
      await AudioService.startRecording(sessionId);
      expect(AudioService.getState().state).toBe(AudioServiceState.RECORDING);
      await AudioService.stopRecording(sessionId);
    });

    it('should handle recording errors', async () => {
      const sessionId = 'test-session';
      await expect(AudioService.startRecording(sessionId)).rejects.toThrow('Recording failed');
    });
  });

  describe('Transcription', () => {
    it('should transcribe audio successfully', async () => {
      const audioData = new ArrayBuffer(1024);
      const result = await AudioService.transcribe(audioData);

      expect(result).toBeDefined();
      expect(result.text).toBe('Mocked transcription');
      expect(result.confidence).toBe(0.95);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('whisper'),
        expect.objectContaining({
          method: 'POST',
          body: audioData
        })
      );
    });

    it('should handle transcription failure', async () => {
      (global.fetch as Mock).mockImplementationOnce(() =>
        Promise.resolve({ ok: false, status: 500 })
      );

      const audioData = new ArrayBuffer(1024);
      await expect(AudioService.transcribe(audioData)).rejects.toThrow();
    });
  });

  describe('Emotion Detection', () => {
    it('should detect emotion successfully', async () => {
      const audioData = new ArrayBuffer(1024);
      const result = await AudioService.detectEmotion(audioData);

      expect(result).toBeDefined();
      expect(result?.type).toBe('happy');
      expect(result?.confidence).toBe(0.85);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('emotion'),
        expect.objectContaining({
          method: 'POST',
          body: audioData
        })
      );
    });

    it('should handle emotion detection failure', async () => {
      (global.fetch as Mock).mockImplementationOnce(() =>
        Promise.resolve({ ok: false, status: 500 })
      );

      const audioData = new ArrayBuffer(1024);
      await expect(AudioService.detectEmotion(audioData)).rejects.toThrow();
    });
  });

  describe('Resource Management', () => {
    it('should clean up resources on stop', async () => {
      await AudioService.setup();
      await waitForStateUpdate();

      await AudioService.cleanup();
      await waitForStateUpdate();

      expect(AudioService.getState().state).toBe(AudioServiceState.UNINITIALIZED);
    });

    it('should handle cleanup errors gracefully', async () => {
      const mockAudioContext = new window.AudioContext();
      vi.spyOn(mockAudioContext, 'close').mockRejectedValueOnce(new Error('Cleanup failed'));

      await AudioService.setup();
      await waitForStateUpdate();

      await AudioService.cleanup();
      await waitForStateUpdate();

      expect(AudioService.getState().state).toBe(AudioServiceState.UNINITIALIZED);
    });

    it('should handle cleanup during recording', async () => {
      await AudioService.startRecording('test-session');
      await AudioService.cleanup();
      const state = AudioService.getState();
      expect(state.state).toBe(AudioServiceState.UNINITIALIZED);
    });
  });

  describe('State Management', () => {
    it('should update VAD state correctly', async () => {
      await AudioService.setup();
      await waitForStateUpdate();

      const mockAnalyser = new window.AudioContext().createAnalyser();
      const mockData = new Float32Array(1024);
      mockData[0] = 0.5; // Simulate voice activity

      vi.spyOn(mockAnalyser, 'getFloatTimeDomainData').mockImplementation((array) => {
        array.set(mockData);
      });

      await AudioService.startRecording('test-session');
      await waitForStateUpdate();

      const state = AudioService.getState() as AudioServiceStateData;
      expect(state.vad?.speaking).toBe(true);
    });

    it('should handle state transitions correctly', async () => {
      await AudioService.setup();
      await waitForStateUpdate();
      expect(AudioService.getState().state).toBe(AudioServiceState.READY);

      await AudioService.startRecording('test-session');
      await waitForStateUpdate();
      expect(AudioService.getState().state).toBe(AudioServiceState.RECORDING);

      await AudioService.stopRecording('test-session');
      await waitForStateUpdate();
      expect(AudioService.getState().state).toBe(AudioServiceState.READY);

      await AudioService.cleanup();
      await waitForStateUpdate();
      expect(AudioService.getState().state).toBe(AudioServiceState.UNINITIALIZED);
    });
  });
});
