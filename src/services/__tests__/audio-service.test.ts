import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { AudioService } from '../audio-service';
import { AudioServiceState } from '../audio-state';
import { waitForStateUpdate, createMockAudioStream } from '../../test/setup';
import { AudioServiceError, type AudioServiceStateData } from '@/types/audio';

// Mock VADService
vi.mock('../vad-service', () => ({
  VADService: vi.fn().mockImplementation(() => {
    const stateListeners = new Set();
    return {
      initialize: vi.fn().mockResolvedValue(undefined),
      start: vi.fn(),
      stop: vi.fn(),
      cleanup: vi.fn().mockResolvedValue(undefined),
      addStateListener: vi.fn((callback) => {
        stateListeners.add(callback);
        // Simulate initial VAD state update
        callback({
          speaking: true,
          noiseLevel: 0.5,
          lastActivity: Date.now(),
          confidence: 0.8
        });
        // Return cleanup function
        return () => {
          stateListeners.delete(callback);
        };
      })
    };
  })
}));

// Extend global fetch type
declare global {
  interface Window {
    fetch: Mock<Parameters<typeof fetch>, ReturnType<typeof fetch>>;
  }
}

// Define MockMediaRecorder class type
class MockMediaRecorder implements MediaRecorder {
  static isTypeSupported(type: string): boolean {
    return type === 'audio/webm';
  }

  state: 'inactive' | 'recording' = 'inactive';
  mimeType = 'audio/webm';
  audioBitsPerSecond = 128000;
  videoBitsPerSecond = 0;
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onpause: (() => void) | null = null;
  onresume: (() => void) | null = null;
  onstart: (() => void) | null = null;
  onstop: (() => void) | null = null;
  private timeoutId: NodeJS.Timeout | null = null;
  private eventListeners: Record<string, Array<(ev: Event) => void>> = {
    dataavailable: [],
    error: [],
    pause: [],
    resume: [],
    start: [],
    stop: []
  };

  constructor(public readonly stream: MediaStream, private options?: MediaRecorderOptions) {
    if (options?.mimeType) {
      this.mimeType = options.mimeType;
    }
    if (options?.audioBitsPerSecond) {
      this.audioBitsPerSecond = options.audioBitsPerSecond;
    }
  }

  start = vi.fn((): void => {
    this.state = 'recording';
    if (this.onstart) this.onstart();
    // Simulate data available event after a short delay
    this.timeoutId = setTimeout(() => {
      if (this.ondataavailable) {
        const event = new Event('dataavailable') as BlobEvent;
        Object.defineProperty(event, 'data', { value: new Blob(['test'], { type: 'audio/webm' }) });
        this.ondataavailable(event);
      }
    }, 100);
  });

  stop = vi.fn((): void => {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.state = 'inactive';
    if (this.onstop) this.onstop();
  });

  pause = vi.fn((): void => {
    if (this.onpause) this.onpause();
  });

  resume = vi.fn((): void => {
    if (this.onresume) this.onresume();
  });

  requestData = vi.fn((): void => {
    if (this.ondataavailable) {
      const event = new Event('dataavailable') as BlobEvent;
      Object.defineProperty(event, 'data', { value: new Blob(['test'], { type: 'audio/webm' }) });
      this.ondataavailable(event);
    }
  });

  cleanup(): void {
    this.stop();
    this.ondataavailable = null;
    this.onerror = null;
    this.onpause = null;
    this.onresume = null;
    this.onstart = null;
    this.onstop = null;
  }

  addEventListener(event: string, handler: ((event: BlobEvent) => void) | (() => void) | ((event: Event) => void)): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(handler as (ev: Event) => void);

    // Also set the on* handler if it exists
    if (event === 'dataavailable') this.ondataavailable = handler as (event: BlobEvent) => void;
    if (event === 'stop') this.onstop = handler as () => void;
    if (event === 'error') this.onerror = handler as (event: Event) => void;
    if (event === 'pause') this.onpause = handler as () => void;
    if (event === 'resume') this.onresume = handler as () => void;
    if (event === 'start') this.onstart = handler as () => void;
  }

  removeEventListener(event: string, handler: ((event: BlobEvent) => void) | (() => void) | ((event: Event) => void)): void {
    if (!this.eventListeners[event]) return;
    this.eventListeners[event] = this.eventListeners[event].filter(
      listener => listener !== (handler as (ev: Event) => void)
    );

    // Also clear the on* handler if it matches
    if (event === 'dataavailable' && this.ondataavailable === handler) this.ondataavailable = null;
    if (event === 'stop' && this.onstop === handler) this.onstop = null;
    if (event === 'error' && this.onerror === handler) this.onerror = null;
    if (event === 'pause' && this.onpause === handler) this.onpause = null;
    if (event === 'resume' && this.onresume === handler) this.onresume = null;
    if (event === 'start' && this.onstart === handler) this.onstart = null;
  }

  dispatchEvent(event: Event): boolean {
    const listeners = this.eventListeners[event.type] || [];
    listeners.forEach(listener => listener(event));

    // Call the corresponding on* handler if it exists
    const handlerName = `on${event.type}` as keyof MockMediaRecorder;
    const handler = this[handlerName] as ((ev: Event) => void) | null;
    if (handler) {
      handler(event);
    }

    return true;
  }
}

// Mock media-recorder-js module
vi.mock('media-recorder-js', () => ({
  default: MockMediaRecorder
}));

// Mock MediaRecorder globally
Object.defineProperty(global, 'MediaRecorder', {
  value: MockMediaRecorder,
  writable: true,
  configurable: true
});

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn().mockResolvedValue(createMockAudioStream())
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

describe('AudioService', () => {
  let mockMediaRecorder: MockMediaRecorder | null = null;
  let mockAudioContext: MockAudioContext;

  const setupTest = async (): Promise<void> => {
    vi.clearAllMocks();

    // Mock MediaRecorder constructor
    const MediaRecorderMock = vi.fn().mockImplementation((stream: MediaStream) => {
      mockMediaRecorder = new MockMediaRecorder(stream);
      return mockMediaRecorder;
    });
    Object.defineProperty(global, 'MediaRecorder', {
      value: MediaRecorderMock,
      writable: true,
      configurable: true
    });

    mockAudioContext = new MockAudioContext();

    // Reset mocks and service
    await AudioService.cleanup();
    await waitForStateUpdate();

    // Setup service by default
    await AudioService.setup();
    await waitForStateUpdate();

    // Reset fetch mock
    (global.fetch as Mock).mockReset();
  };

  const cleanupTest = async (): Promise<void> => {
    // Cleanup mocks
    if (mockMediaRecorder) {
      mockMediaRecorder.cleanup();
    }
    mockAudioContext.cleanup();

    // Cleanup service
    await AudioService.cleanup();
    await waitForStateUpdate();
  };

  beforeEach(setupTest);
  afterEach(cleanupTest);

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
    it('should start recording successfully', async () => {
      await AudioService.startRecording('test-session');
      await waitForStateUpdate();
      const state = AudioService.getState();
      expect(state.state).toBe(AudioServiceState.RECORDING);
    });

    it('should stop recording and return result', async () => {
      await AudioService.startRecording('test-session');
      await waitForStateUpdate();
      const result = await AudioService.stopRecording('test-session');
      await waitForStateUpdate();

      expect(result).toBeDefined();
      expect(result.audioData).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);

      const state = AudioService.getState();
      expect(state.state).toBe(AudioServiceState.READY);
    });

    it('should handle recording errors', async () => {
      // Mock MediaRecorder constructor to throw an error
      const mockError = new Error('Recording failed');
      vi.spyOn(window, 'MediaRecorder').mockImplementationOnce(() => {
        throw mockError;
      });

      await expect(AudioService.startRecording('test-session')).rejects.toThrow('Recording failed');
      await waitForStateUpdate();
      expect(AudioService.getState().state).toBe(AudioServiceState.ERROR);
    });

    it('should handle multiple recording sessions', async () => {
      // First session
      await AudioService.startRecording('test-session-1');
      await waitForStateUpdate();
      await AudioService.stopRecording('test-session-1');
      await waitForStateUpdate();

      // Second session
      await AudioService.startRecording('test-session-2');
      await waitForStateUpdate();
      await AudioService.stopRecording('test-session-2');
      await waitForStateUpdate();

      expect(AudioService.getState().state).toBe(AudioServiceState.READY);
    });

    it('should handle recording state', async () => {
      await AudioService.startRecording('test-session');
      await waitForStateUpdate();
      expect(AudioService.getState().state).toBe(AudioServiceState.RECORDING);

      await AudioService.stopRecording('test-session');
      await waitForStateUpdate();
      expect(AudioService.getState().state).toBe(AudioServiceState.READY);
    });
  });

  describe('Transcription', () => {
    it('should transcribe audio successfully', async () => {
      // Mock successful transcription response
      (global.fetch as Mock).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            text: 'Mocked transcription',
            confidence: 0.95
          })
        })
      );

      const audioData = new ArrayBuffer(1024);
      const result = await AudioService.transcribe(audioData);

      expect(result).toBeDefined();
      expect(result.text).toBe('Mocked transcription');
      expect(result.confidence).toBe(0.95);
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
      // Mock successful emotion detection response
      (global.fetch as Mock).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            emotion: 'happy',
            confidence: 0.85
          })
        })
      );

      const audioData = new ArrayBuffer(1024);
      const result = await AudioService.detectEmotion(audioData);

      expect(result).toBeDefined();
      expect(result).toEqual({
        type: 'happy',
        confidence: 0.85
      });
    });

    it('should handle emotion detection failure', async () => {
      // Mock failed emotion detection response
      (global.fetch as Mock).mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        })
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
      // First setup the service
      await AudioService.setup();
      await waitForStateUpdate();

      // Start recording to enable VAD
      await AudioService.startRecording('test-session');
      await waitForStateUpdate();

      // Simulate VAD state update
      const mockVADState = {
        speaking: true,
        noiseLevel: 0.5,
        lastActivity: Date.now(),
        confidence: 0.8
      };

      // Get the VAD service instance and trigger state update
      const vadService = (AudioService as any).vadService;
      const stateCallback = vadService.addStateListener.mock.calls[0][0];
      stateCallback(mockVADState);
      await waitForStateUpdate();

      const state = AudioService.getState() as AudioServiceStateData;
      expect(state.vad).toBeDefined();
      expect(state.vad?.speaking).toBe(mockVADState.speaking);
      expect(state.vad?.noiseLevel).toBe(mockVADState.noiseLevel);
      expect(state.vad?.confidence).toBe(mockVADState.confidence);
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
