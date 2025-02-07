import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AudioProcessingService, AudioFormat, ProcessingOptions, StreamStatus, NoiseReductionOptions } from '../audio-processing';

// Mock URL for Web Worker
const mockURL = { toString: () => 'mocked-worker-url' };
vi.mock('url', () => ({
  URL: vi.fn(() => mockURL)
}));

// Mock Web Worker with event handling
class MockWorker implements Worker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  private messageHandlers: ((event: MessageEvent) => void)[] = [];

  constructor() {
    vi.spyOn(this as any, 'postMessage');
  }

  postMessage(message: any) {
    // Create a processed buffer for the response
    const processedBuffer = mockAudioContextImpl.createBuffer();

    // Simulate async processing
    setTimeout(() => {
      const response = {
        type: 'processed',
        payload: processedBuffer
      };

      // Call all registered handlers
      if (this.onmessage) {
        this.onmessage(new MessageEvent('message', { data: response }));
      }
      this.messageHandlers.forEach(handler => {
        handler(new MessageEvent('message', { data: response }));
      });
    }, 100);
  }

  addEventListener<K extends keyof WorkerEventMap>(
    type: K,
    listener: (this: Worker, ev: WorkerEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void {
    if (type === 'message') {
      const handler = (listener as (event: MessageEvent) => void);
      this.messageHandlers.push(handler);
    }
  }

  removeEventListener<K extends keyof WorkerEventMap>(
    type: K,
    listener: (this: Worker, ev: WorkerEventMap[K]) => any,
    options?: boolean | EventListenerOptions
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ): void {
    if (type === 'message') {
      const handler = (listener as (event: MessageEvent) => void);
      const index = this.messageHandlers.indexOf(handler);
      if (index > -1) {
        this.messageHandlers.splice(index, 1);
      }
    }
  }

  terminate() {
    // No-op for mock
  }

  dispatchEvent(event: Event): boolean {
    return true;
  }
}

// Create mock AudioContext
const mockAudioContextImpl = {
  createBuffer: vi.fn(),
  createGain: vi.fn(),
  createBiquadFilter: vi.fn(),
  createBufferSource: vi.fn(),
  decodeAudioData: vi.fn(),
  destination: { connect: vi.fn(), disconnect: vi.fn() }
};

// Mock Web Worker and AudioContext globally
vi.mock('happy-dom', () => ({
  default: {
    window: {
      Worker: MockWorker,
      AudioContext: vi.fn().mockImplementation(() => mockAudioContextImpl),
      ReadableStream: vi.fn().mockImplementation((source) => ({
        ...source,
        getReader: () => ({
          read: async () => ({ done: true, value: undefined })
        })
      }))
    }
  }
}));

// Define Worker globally for the test environment
global.Worker = MockWorker as unknown as typeof Worker;

// Mock AudioContext
class MockAudioContext {
  sampleRate: number;
  state: string;
  baseLatency?: number;

  constructor(options: { sampleRate?: number; latencyHint?: string } = {}) {
    this.sampleRate = options.sampleRate || 48000;
    this.state = 'running';
    if (options.latencyHint === 'interactive') {
      this.baseLatency = 0.005;
    }
  }

  createMediaStreamSource = vi.fn().mockReturnThis();
  createScriptProcessor = vi.fn().mockReturnThis();
  createGain = vi.fn().mockReturnThis();
  createBufferSource = vi.fn().mockReturnValue({
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    buffer: null
  });
  createBuffer = vi.fn().mockReturnValue({
    duration: 1,
    length: 48000,
    numberOfChannels: 1,
    sampleRate: 48000,
    getChannelData: vi.fn().mockReturnValue(new Float32Array(48000))
  });
  close = vi.fn();
}

describe('Audio Processing Service', () => {
  let service: AudioProcessingService;
  let mockWorker: MockWorker;
  let originalAudioContext: any;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockWorker = new MockWorker();

    // Spy on Worker constructor
    vi.spyOn(global, 'Worker').mockImplementation(() => mockWorker);

    originalAudioContext = global.AudioContext;
    global.AudioContext = MockAudioContext as any;

    service = new AudioProcessingService();

    // Reset mock implementations
    mockAudioContextImpl.createBuffer.mockImplementation(() => ({
      duration: 1,
      length: 48000,
      numberOfChannels: 2,
      sampleRate: 48000,
      getChannelData: vi.fn().mockReturnValue(new Float32Array(48000).fill(0.1))
    }));

    mockAudioContextImpl.createGain.mockImplementation(() => ({
      gain: { value: 1, setValueAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn()
    }));

    mockAudioContextImpl.createBiquadFilter.mockImplementation(() => ({
      type: 'lowpass',
      frequency: { value: 0, setValueAtTime: vi.fn() },
      Q: { value: 0, setValueAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn()
    }));

    mockAudioContextImpl.createBufferSource.mockImplementation(() => ({
      buffer: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn()
    }));

    mockAudioContextImpl.decodeAudioData.mockImplementation(() =>
      Promise.resolve(mockAudioContextImpl.createBuffer())
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    global.AudioContext = originalAudioContext;
    vi.clearAllMocks();
  });

  describe('Format Conversion', () => {
    it('should convert audio format', async () => {
      const audioData = new ArrayBuffer(1024);
      const result = await service.convertFormat(audioData, {
        from: AudioFormat.WAV,
        to: AudioFormat.MP3,
        options: { bitrate: 192 }
      });

      expect(result).toBeDefined();
      expect(result.format).toBe(AudioFormat.MP3);
    });

    it('should handle unsupported formats', async () => {
      const audioData = new ArrayBuffer(1024);
      await expect(service.convertFormat(audioData, {
        from: 'unsupported' as AudioFormat,
        to: AudioFormat.MP3
      })).rejects.toThrow('Unsupported format');
    });

    it('should preserve metadata during conversion', async () => {
      const audioData = new ArrayBuffer(1024);
      const metadata = { title: 'Test', artist: 'Tester' };
      const result = await service.convertFormat(audioData, {
        from: AudioFormat.WAV,
        to: AudioFormat.MP3,
        metadata
      });

      expect(result.metadata).toEqual(metadata);
    });
  });

  describe('Quality Enhancement', () => {
    it('should enhance audio quality', async () => {
      const audioBuffer = mockAudioContextImpl.createBuffer();
      const options = {
        normalize: true,
        targetPeak: -3
      };
      const enhancedData = await service.enhanceQuality(audioBuffer, options);
      expect(enhancedData).toBeDefined();
      expect(enhancedData.length).toBe(48000);
    });

    it('should apply compression', async () => {
      const audioBuffer = mockAudioContextImpl.createBuffer();
      const options = {
        compression: {
          threshold: -24,
          ratio: 4,
          attack: 0.003,
          release: 0.25
        }
      };
      const compressedData = await service.enhanceQuality(audioBuffer, options);
      expect(compressedData).toBeDefined();
      expect(compressedData.length).toBe(48000);
    });
  });

  describe('Noise Reduction', () => {
    it('should adapt noise reduction level', async () => {
      const buffer = mockAudioContextImpl.createBuffer();
      const options: NoiseReductionOptions = {
        threshold: 0.1,
        reduction: 0.5,
        adaptive: true,
        preserveSpeech: true
      };

      const resultPromise = service.reduceNoise(buffer, options);

      // Advance timers to trigger the worker response
      vi.advanceTimersByTime(100);

      const result = await resultPromise;

      expect(result).toBeDefined();
      expect(result.buffer).toBeDefined();
      expect(mockWorker.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'noiseReduction',
          payload: expect.any(ArrayBuffer),
          options
        })
      );
      expect(mockAudioContextImpl.createBiquadFilter).toHaveBeenCalled();
    });

    it('should use noise profile when provided', async () => {
      const buffer = mockAudioContextImpl.createBuffer();
      const noiseProfile = new Float32Array(1024).fill(0.1);
      const options: NoiseReductionOptions = {
        threshold: 0.1,
        reduction: 0.3,
        preserveSpeech: true,
        noiseProfile
      };

      const result = await service.reduceNoise(buffer, options);
      expect(result).toBeDefined();
      expect(result.buffer).toBeDefined();
    });

    it('should handle minimal options', async () => {
      const buffer = mockAudioContextImpl.createBuffer();
      const options: NoiseReductionOptions = {};

      const result = await service.reduceNoise(buffer, options);
      expect(result).toBeDefined();
      expect(result.buffer).toBeDefined();
    });
  });

  describe('Stream Processing', () => {
    it('should process audio stream', async () => {
      const mockStream = new ReadableStream<ArrayBuffer>({
        start(controller) {
          const chunk = new ArrayBuffer(1024);
          controller.enqueue(chunk);
          controller.close();
        }
      });

      const status = await service.processStream(mockStream, {
        chunkSize: 1024,
        overlap: 0,
        realtime: true
      });

      expect(status).toBe(StreamStatus.Completed);
    });
  });

  describe('Worker Communication', () => {
    it('should handle worker messages', async () => {
      const mockData = new ArrayBuffer(1024);
      const mockResponse = { type: 'processed', payload: mockData };

      // Get the worker instance
      const worker = vi.mocked(Worker).mock.results[0].value;

      // Simulate worker response
      setTimeout(() => {
        if (worker.onmessage) {
          worker.onmessage(new MessageEvent('message', { data: mockResponse }));
        }
      }, 0);

      const result = await service.processStream(new ReadableStream({
        start(controller) {
          controller.enqueue(mockData);
          controller.close();
        }
      }));

      expect(result).toBe(StreamStatus.Completed);
      expect(worker.postMessage).toHaveBeenCalled();
    });

    it('should handle worker errors', async () => {
      const mockData = new ArrayBuffer(1024);
      const mockError = new Error('Worker processing failed');

      // Get the worker instance
      const worker = vi.mocked(Worker).mock.results[0].value;

      // Simulate worker error
      setTimeout(() => {
        if (worker.onerror) {
          worker.onerror(new ErrorEvent('error', { error: mockError }));
        }
      }, 0);

      await expect(service.processStream(new ReadableStream({
        start(controller) {
          controller.enqueue(mockData);
          controller.close();
        }
      }))).rejects.toThrow('Worker processing failed');
    });

    it('should cleanup resources when stream is closed', async () => {
      const worker = vi.mocked(Worker).mock.results[0].value;
      const mockStream = new ReadableStream({
        start(controller) {
          controller.close();
        }
      });

      await service.processStream(mockStream);
      expect(worker.postMessage).toHaveBeenCalledWith(expect.objectContaining({
        type: 'cleanup'
      }));
    });
  });

  describe('Resource Management', () => {
    it('should cleanup resources', () => {
      service.cleanup();
      expect(MockAudioContext.prototype.close).toHaveBeenCalled();
    });
  });
});
