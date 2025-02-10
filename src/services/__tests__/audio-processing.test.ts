import { describe, it, expect, beforeEach, vi, afterEach, Mock } from 'vitest';
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
  postMessage: Mock;

  constructor() {
    this.postMessage = vi.fn().mockImplementation((message) => {
      // Simulate async processing
      setTimeout(() => {
        if (message.type === 'cleanup') {
          this.handleMessage({ type: 'cleaned', data: { success: true }, id: message.id });
        } else {
          this.handleMessage(message);
        }
      }, 10);
    });
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

  terminate = (): void => {
    // No-op for mock
  };

  dispatchEvent = (event: Event): boolean => {
    if (event instanceof ErrorEvent && this.onerror) {
      this.onerror(event);
    }
    return true;
  };

  private handleMessage(message: any): void {
    const { type, data, id } = message;
    let response: any;

    switch (type) {
      case 'process_chunk':
        response = {
          type: 'chunk_processed',
          data: new ArrayBuffer(1024),
          id
        };
        break;
      case 'reduce_noise':
        response = {
          type: 'noise_reduced',
          data: {
            audio: new ArrayBuffer(1024),
            noiseFloor: -60,
            frequencyResponse: { speech: new Float32Array(100) },
            reductionProfile: new Float32Array(100)
          },
          id
        };
        break;
      case 'convert_format':
        response = {
          type: 'format_converted',
          data: {
            format: 'wav',
            data: new ArrayBuffer(1024),
            size: 1024
          },
          id
        };
        break;
      case 'cleanup':
        response = {
          type: 'cleaned',
          data: { success: true },
          id
        };
        break;
      default:
        this.onerror?.(new ErrorEvent('error', {
          error: new Error('Worker error'),
          message: 'Worker error'
        }));
        return;
    }

    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: response }));
    }
    this.messageHandlers.forEach((handler) => {
      handler(new MessageEvent('message', { data: response }));
    });
  }
}

// Create mock AudioContext
const mockAudioContextImpl = {
  createBuffer: vi.fn(),
  createGain: vi.fn(),
  createBiquadFilter: vi.fn(),
  createBufferSource: vi.fn(),
  decodeAudioData: vi.fn(),
  destination: { connect: vi.fn(), disconnect: vi.fn() },
  createDynamicsCompressor: vi.fn().mockReturnValue({
    threshold: { value: -50, setValueAtTime: vi.fn() },
    knee: { value: 40, setValueAtTime: vi.fn() },
    ratio: { value: 12, setValueAtTime: vi.fn() },
    reduction: -20,
    attack: { value: 0.003, setValueAtTime: vi.fn() },
    release: { value: 0.25, setValueAtTime: vi.fn() },
    connect: vi.fn().mockReturnThis(),
    disconnect: vi.fn().mockReturnThis(),
    context: this,
    channelCount: 2,
    channelCountMode: 'explicit' as ChannelCountMode,
    channelInterpretation: 'speakers' as ChannelInterpretation,
    numberOfInputs: 1,
    numberOfOutputs: 1
  })
};

// Mock Web Worker and AudioContext globally
vi.mock('happy-dom', () => ({
  default: {
    window: {
      Worker: MockWorker,
      AudioContext: vi.fn().mockImplementation(() => mockAudioContextImpl),
      OfflineAudioContext: vi.fn().mockImplementation((channels, length, sampleRate) => ({
        destination: {
          connect: vi.fn(),
          disconnect: vi.fn()
        },
        startRendering: vi.fn().mockResolvedValue({
          duration: length / sampleRate,
          length: length,
          numberOfChannels: channels,
          sampleRate: sampleRate,
          getChannelData: vi.fn().mockReturnValue(new Float32Array(length).fill(0.1))
        })
      })),
      ReadableStream: vi.fn().mockImplementation((source) => ({
        ...source,
        getReader: () => ({
          read: async () => ({ done: true, value: undefined })
        })
      }))
    }
  }
}));

// Define Worker and OfflineAudioContext globally for the test environment
global.Worker = MockWorker as unknown as typeof Worker;
global.OfflineAudioContext = vi.fn().mockImplementation((channels, length, sampleRate) => ({
  destination: {
    connect: vi.fn(),
    disconnect: vi.fn()
  },
  startRendering: vi.fn().mockResolvedValue({
    duration: length / sampleRate,
    length: length,
    numberOfChannels: channels,
    sampleRate: sampleRate,
    getChannelData: vi.fn().mockReturnValue(new Float32Array(length).fill(0.1))
  })
}));

// Mock AudioContext
class MockAudioContext {
  sampleRate: number;
  state: string;
  baseLatency?: number;
  close: Mock;
  decodeAudioData: Mock;

  constructor(options: { sampleRate?: number; latencyHint?: string } = {}) {
    this.sampleRate = options.sampleRate || 48000;
    this.state = 'running';
    if (options.latencyHint === 'interactive') {
      this.baseLatency = 0.005;
    }
    this.close = vi.fn();
    this.decodeAudioData = vi.fn().mockImplementation((audioData) => {
      return Promise.resolve(new MockAudioBuffer({
        length: 1024,
        numberOfChannels: 2,
        sampleRate: this.sampleRate
      }));
    });
  }

  createMediaStreamSource = vi.fn().mockReturnThis();
  createScriptProcessor = vi.fn().mockReturnThis();
  createGain = vi.fn().mockReturnValue({
    gain: {
      value: 1,
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn()
    },
    connect: vi.fn().mockReturnThis(),
    disconnect: vi.fn().mockReturnThis(),
    context: this,
    channelCount: 2,
    channelCountMode: 'explicit' as ChannelCountMode,
    channelInterpretation: 'speakers' as ChannelInterpretation
  });
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

  createDynamicsCompressor = vi.fn().mockReturnValue({
    threshold: {
      value: -50,
      setValueAtTime: vi.fn().mockReturnThis(),
      linearRampToValueAtTime: vi.fn().mockReturnThis(),
      exponentialRampToValueAtTime: vi.fn().mockReturnThis()
    },
    knee: {
      value: 40,
      setValueAtTime: vi.fn().mockReturnThis(),
      linearRampToValueAtTime: vi.fn().mockReturnThis(),
      exponentialRampToValueAtTime: vi.fn().mockReturnThis()
    },
    ratio: {
      value: 12,
      setValueAtTime: vi.fn().mockReturnThis(),
      linearRampToValueAtTime: vi.fn().mockReturnThis(),
      exponentialRampToValueAtTime: vi.fn().mockReturnThis()
    },
    reduction: -20,
    attack: {
      value: 0.003,
      setValueAtTime: vi.fn().mockReturnThis(),
      linearRampToValueAtTime: vi.fn().mockReturnThis(),
      exponentialRampToValueAtTime: vi.fn().mockReturnThis()
    },
    release: {
      value: 0.25,
      setValueAtTime: vi.fn().mockReturnThis(),
      linearRampToValueAtTime: vi.fn().mockReturnThis(),
      exponentialRampToValueAtTime: vi.fn().mockReturnThis()
    },
    connect: vi.fn().mockReturnThis(),
    disconnect: vi.fn().mockReturnThis(),
    context: this,
    channelCount: 2,
    channelCountMode: 'explicit' as ChannelCountMode,
    channelInterpretation: 'speakers' as ChannelInterpretation,
    numberOfInputs: 1,
    numberOfOutputs: 1
  });
}

// Add AudioBuffer mock before the describe block
class MockAudioBuffer implements AudioBuffer {
  length: number;
  numberOfChannels: number;
  sampleRate: number;
  duration: number;

  constructor(options: AudioBufferOptions) {
    this.length = options.length || 0;
    this.numberOfChannels = options.numberOfChannels || 1;
    this.sampleRate = options.sampleRate || 44100;
    this.duration = this.length / this.sampleRate;
  }

  getChannelData(channel: number): Float32Array {
    return new Float32Array(this.length).fill(0.1);
  }

  copyFromChannel(destination: Float32Array, channelNumber: number, bufferOffset: number = 0): void {
    const data = this.getChannelData(channelNumber);
    destination.set(data.slice(bufferOffset));
  }

  copyToChannel(source: Float32Array, channelNumber: number, bufferOffset: number = 0): void {
    // No-op for mock
  }
}

// Replace global AudioBuffer
(global as any).AudioBuffer = MockAudioBuffer;

describe('Audio Processing Service', () => {
  let service: AudioProcessingService;
  let mockWorker: MockWorker;

  beforeEach(() => {
    mockWorker = new MockWorker();
    service = new AudioProcessingService();

    // Initialize service with mock worker and context
    (service as any).worker = mockWorker;
    (service as any).context = new MockAudioContext();

    // Setup default mock implementations
    mockWorker.postMessage.mockImplementation((message) => {
      setTimeout(() => {
        switch (message.type) {
          case 'process_chunk':
            mockWorker.onmessage?.(new MessageEvent('message', {
              data: {
                type: 'chunk_processed',
                data: new ArrayBuffer(1024),
                id: message.id
              }
            }));
            break;
          case 'cleanup':
            mockWorker.onmessage?.(new MessageEvent('message', {
              data: {
                type: 'cleaned',
                success: true,
                id: message.id
              }
            }));
            break;
        }
      }, 10);
    });

    vi.useFakeTimers();
  });

  afterEach(() => {
    service.cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
    mockWorker.postMessage.mockClear();
  });

  it('should convert audio format', async () => {
    const audioData = new ArrayBuffer(1024);
    const options = {
      from: 'wav' as AudioFormat,
      to: 'mp3' as AudioFormat,
      options: { bitrate: 128 }
    };

    const promise = service.convertFormat(audioData, options);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.format).toBe('wav');
    expect(result.data).toBeInstanceOf(ArrayBuffer);
    expect(result.size).toBe(1024);
  });

  it('should reduce noise', async () => {
    const audioBuffer = new AudioBuffer({
      length: 1024,
      numberOfChannels: 2,
      sampleRate: 44100
    });
    const options: NoiseReductionOptions = {
      threshold: -50,
      reduction: 0.5
    };

    const promise = service.reduceNoise(audioBuffer, options);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.noiseFloor).toBe(-60);
    expect(result.frequencyResponse.speech).toBeInstanceOf(Float32Array);
    expect(result.reductionProfile).toBeInstanceOf(Float32Array);
  });

  it('should handle worker messages', async () => {
    const audioData = new ArrayBuffer(1024);
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(audioData);
        controller.close();
      }
    });

    const promise = service.processStream(stream);
    await vi.runAllTimersAsync();

    expect(mockWorker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'process_chunk',
        data: expect.any(ArrayBuffer)
      })
    );

    const result = await promise;
    expect(result).toBe(StreamStatus.Completed);
  });

  it('should handle worker errors', async () => {
    const audioData = new ArrayBuffer(1024);
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(audioData);
        controller.close();
      }
    });

    // Override default mock implementation for this test
    mockWorker.postMessage.mockImplementationOnce(() => {
      setTimeout(() => {
        mockWorker.onerror?.(new ErrorEvent('error', {
          error: new Error('Worker error'),
          message: 'Worker error'
        }));
      }, 10);
    });

    const errorPromise = service.processStream(stream);
    await vi.runAllTimersAsync();
    await expect(errorPromise).rejects.toThrow('Worker error');
  });

  it('should cleanup resources', async () => {
    service.cleanup();
    await vi.runAllTimersAsync();

    expect(mockWorker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'cleanup'
      })
    );
  });
});
