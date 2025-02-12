import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VADService } from '../vad-service';
import type { VADConfig } from '@/types/audio';

// Mock Performance API
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 0,
    totalJSHeapSize: 100000000,
    jsHeapSizeLimit: 200000000,
  },
};

// Mock Web Worker with event handling
const mockWorker = {
  postMessage: vi.fn(),
  terminate: vi.fn(),
  addEventListener: vi.fn((type, callback) => {
    if (type === 'message') {
      // Store callback to simulate messages later
      mockWorker._messageCallback = callback;
    }
    if (type === 'error') {
      mockWorker._errorCallback = callback;
    }
  }),
  removeEventListener: vi.fn(),
  // Helper methods for tests
  _messageCallback: null as ((event: MessageEvent) => void) | null,
  _errorCallback: null as ((event: ErrorEvent) => void) | null,
  simulateMessage(data: any) {
    if (this._messageCallback) {
      this._messageCallback(new MessageEvent('message', { data }));
    }
  },
  simulateError(error: Error) {
    if (this._errorCallback) {
      this._errorCallback(new ErrorEvent('error', { error }));
    }
  }
};

// Mock MediaStream
const mockMediaStream = {
  getTracks: () => [{
    stop: vi.fn(),
    enabled: true,
    kind: 'audio'
  }],
  getAudioTracks: () => [{
    stop: vi.fn(),
    enabled: true,
    kind: 'audio'
  }]
};

// Mock AudioContext
const mockAudioContext = {
  createScriptProcessor: vi.fn().mockReturnValue({
    connect: vi.fn(),
    disconnect: vi.fn()
  }),
  createMediaStreamSource: vi.fn().mockReturnValue({
    connect: vi.fn(),
    disconnect: vi.fn()
  }),
  close: vi.fn()
};

vi.mock('../../workers/vad.worker', () => ({
  default: vi.fn().mockImplementation(() => mockWorker)
}));

describe('VAD Service', () => {
  let service: VADService;
  let vadConfig: VADConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'performance', { value: mockPerformance });
    Object.defineProperty(window, 'AudioContext', { value: mockAudioContext });

    vadConfig = {
      sampleRate: 16000,
      bufferSize: 2048,
      noiseThreshold: 0.2,
      silenceThreshold: 0.1
    };

    service = new VADService(vadConfig);
  });

  afterEach(async () => {
    if (service) {
      await service.stop();
    }
  });

  it('should initialize correctly', () => {
    expect(service).toBeDefined();
  });

  it('should start voice detection', async () => {
    await service.initialize(mockMediaStream as unknown as MediaStream);
    await service.start();
    expect(mockWorker.postMessage).toHaveBeenCalled();
  });

  it('should stop voice detection', async () => {
    await service.initialize(mockMediaStream as unknown as MediaStream);
    await service.start();
    await service.stop();
    expect(mockWorker.terminate).toHaveBeenCalled();
  });

  it('should handle voice detection events', async () => {
    const onVoiceDetected = vi.fn();
    service.addStateListener(onVoiceDetected);

    await service.initialize(mockMediaStream as unknown as MediaStream);
    await service.start();

    mockWorker.simulateMessage({
      type: 'vadStateUpdate',
      data: {
        speaking: true,
        noiseLevel: 0.5,
        lastActivity: Date.now(),
        confidence: 0.8
      }
    });

    expect(onVoiceDetected).toHaveBeenCalledWith(expect.objectContaining({
      speaking: true,
      noiseLevel: 0.5,
      confidence: 0.8
    }));
  });

  it('should handle errors', async () => {
    const onError = vi.fn();
    service.addErrorListener(onError);

    await service.initialize(mockMediaStream as unknown as MediaStream);
    await service.start();

    mockWorker.simulateError(new Error('Test error'));
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });
});
