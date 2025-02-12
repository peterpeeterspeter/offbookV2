import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import type { Mock } from 'vitest';

// Types that would normally be imported from ../whisper
interface WhisperResponse {
  text: string;
  confidence: number;
  duration: number;
  emotion: string;
  language?: string;
  segments?: Array<{
    id: number;
    start: number;
    end: number;
    text: string;
    confidence: number;
  }>;
  processingTime?: number;
  modelLatency?: number;
}

interface WhisperError {
  error: string;
  code: string;
}

// Constants for testing
const PERFORMANCE_THRESHOLDS = {
  TRANSCRIPTION_LATENCY_MS: 1000,
  STREAMING_LATENCY_MS: 100,
  MAX_MEMORY_USAGE_MB: 512,
  MIN_CONFIDENCE: 0.6
};

const MOCK_SEGMENTS = [
  {
    id: 0,
    start: 0.0,
    end: 2.0,
    text: "Hello",
    confidence: 0.95
  },
  {
    id: 1,
    start: 2.0,
    end: 4.0,
    text: "world",
    confidence: 0.92
  }
];

// Mock implementations
class MockWhisperService {
  private wsUrl: string;
  private errorHandler?: (error: Error) => void;
  private ws?: WebSocket;
  private initialized = false;
  private model?: { name: string };
  private audioContext?: AudioContext;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 1000;
  private memoryUsage = 0;
  private progressHandler?: (progress: { processed: number; total: number; percent: number }) => void;
  private worker?: Worker;
  private activeTranscriptions = new Set<Promise<any>>();

  constructor(wsUrl: string = 'ws://localhost:8000/ws/whisper') {
    this.wsUrl = wsUrl;
    this.worker = new Worker('whisper.worker.js');
  }

  async initialize(modelName: string = 'base'): Promise<void> {
    try {
      // Simulate model loading
      this.model = { name: modelName };
      this.initialized = true;

      // Initialize audio context
      this.audioContext = new AudioContext();
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      throw new Error(`Failed to initialize Whisper service: ${error.message}`);
    }
  }

  static async transcribeAudio(blob: Blob, options?: { retries?: number }): Promise<WhisperResponse | WhisperError> {
    const response = await fetch('/api/whisper/transcribe', {
      method: 'POST',
      body: new FormData()
    });
    return response.json();
  }

  async transcribeStream(stream: MediaStream): Promise<AsyncGenerator<WhisperResponse, void, unknown>> {
    if (!this.initialized) {
      throw new Error('Service not initialized');
    }

    const chunkSize = 4096;
    const sampleRate = 16000;

    return async function* () {
      while (true) {
        yield {
          text: 'Streaming transcription',
          confidence: 0.9,
          duration: 0.5,
          emotion: 'neutral'
        };
      }
    }();
  }

  async sendAudioChunk(blob: Blob): Promise<void> {
    if (!this.initialized) {
      throw new Error('Service not initialized');
    }

    if (this.ws) {
      this.ws.send(blob);
    }
  }

  onError(handler: (error: Error) => void): void {
    this.errorHandler = handler;
  }

  async cleanup(): Promise<void> {
    this.initialized = false;
    this.model = undefined;
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = undefined;
    }
    this.dispose();
  }

  dispose(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
  }

  async batchProcess(blobs: Blob[]): Promise<Array<WhisperResponse | WhisperError>> {
    if (!this.initialized) {
      throw new Error('Service not initialized');
    }
    return Promise.all(blobs.map(blob => MockWhisperService.transcribeAudio(blob)));
  }

  getMemoryUsage(): number {
    return this.memoryUsage;
  }

  private async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      throw new Error('Max reconnection attempts reached');
    }

    this.reconnectAttempts++;
    await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
    this.ws = new WebSocket(this.wsUrl);
  }

  async cancel(): Promise<void> {
    this.activeTranscriptions.clear();
    this.memoryUsage = 0;
    if (this.ws) {
      this.ws.close();
    }
  }

  onProgress(handler: (progress: { processed: number; total: number; percent: number }) => void): void {
    this.progressHandler = handler;
  }
}

class MockTranscriptionCache {
  private cache = new Map<string, { response: WhisperResponse; timestamp: number }>();
  private blobKeys = new Map<Blob, string>();

  private getBlobKey(blob: Blob): string {
    let key = this.blobKeys.get(blob);
    if (!key) {
      key = Math.random().toString(36).substring(7);
      this.blobKeys.set(blob, key);
    }
    return key;
  }

  get(blob: Blob): WhisperResponse | null {
    const key = this.getBlobKey(blob);
    const cached = this.cache.get(key);
    if (!cached) return null;

    // Check TTL (24 hours)
    if (Date.now() - cached.timestamp > 24 * 60 * 60 * 1000) {
      this.cache.delete(key);
      return null;
    }

    return cached.response;
  }

  set(blob: Blob, response: WhisperResponse): void {
    const key = this.getBlobKey(blob);
    this.cache.set(key, { response, timestamp: Date.now() });

    // Limit cache size to 100 entries
    if (this.cache.size > 100) {
      const keys = Array.from(this.cache.keys());
      if (keys.length > 0) {
        this.cache.delete(keys[0]);
      }
    }
  }

  clear(): void {
    this.cache.clear();
    this.blobKeys.clear();
  }
}

// Test utilities
const createAudioBlob = (duration: number, sampleRate = 16000): Blob => {
  const numSamples = Math.floor(duration * sampleRate);
  const audioData = new Float32Array(numSamples);
  // Generate a simple sine wave
  for (let i = 0; i < numSamples; i++) {
    audioData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate);
  }
  return new Blob([audioData], { type: 'audio/wav' });
};

const simulateNetworkCondition = (latency: number, jitter = 0): void => {
  vi.useFakeTimers();
  const delay = latency + (jitter > 0 ? Math.random() * jitter : 0);
  const mockFetchFn = vi.fn().mockImplementation(async (...args: Parameters<typeof fetch>) => {
    await new Promise(resolve => setTimeout(resolve, delay));
    return {
      ok: true,
      json: () => Promise.resolve({
        text: 'Hello world',
        confidence: 0.95,
        duration: 1.5,
        emotion: 'neutral'
      } as WhisperResponse)
    };
  });
  global.fetch = mockFetchFn;
};

const createMockMediaRecorder = (mimeType = 'audio/webm'): MediaRecorder => {
  return {
    start: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    state: 'inactive',
    ondataavailable: null,
    onerror: null,
    mimeType
  } as unknown as MediaRecorder;
};

// Additional test constants
const NETWORK_CONDITIONS = {
  GOOD: { latency: 50, jitter: 10 },
  POOR: { latency: 500, jitter: 200 },
  TERRIBLE: { latency: 2000, jitter: 1000 }
};

const DEVICE_PROFILES = {
  MOBILE: {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
    connection: { downlink: 4, rtt: 100 },
    memory: 2048
  },
  TABLET: {
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
    connection: { downlink: 10, rtt: 50 },
    memory: 4096
  }
};

// Test suite
describe('WhisperService', () => {
  let mockFetch: Mock;
  let mockBlob: Blob;
  let mockResponse: WhisperResponse;
  let mockWebSocket: {
    send: Mock;
    close: Mock;
    addEventListener: Mock;
    removeEventListener: Mock;
  };

  beforeEach(() => {
    // Mock response data
    mockResponse = {
      text: 'Hello world',
      confidence: 0.95,
      duration: 1.5,
      emotion: 'neutral'
    };

    // Mock Blob
    mockBlob = new Blob(['test audio data'], { type: 'audio/webm' });

    // Mock fetch with proper typing
    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    // Mock WebSocket
    mockWebSocket = {
      send: vi.fn(),
      close: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };
    global.WebSocket = vi.fn(() => mockWebSocket) as unknown as typeof WebSocket;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Transcription', () => {
    it('should transcribe audio successfully', async () => {
      const result = await MockWhisperService.transcribeAudio(mockBlob);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/whisper/transcribe'),
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData)
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle transcription errors', async () => {
      const errorResponse: WhisperError = {
        error: 'Transcription failed',
        code: 'TRANSCRIPTION_ERROR'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve(errorResponse)
      });

      const result = await MockWhisperService.transcribeAudio(mockBlob);
      expect(result).toEqual(errorResponse);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await MockWhisperService.transcribeAudio(mockBlob);
      expect(result).toEqual({
        error: 'Network error',
        code: 'NETWORK_ERROR'
      });
    });
  });

  describe('TranscriptionCache', () => {
    let cache: MockTranscriptionCache;

    beforeEach(() => {
      cache = new MockTranscriptionCache();
    });

    it('should cache transcription results', () => {
      cache.set(mockBlob, mockResponse);
      const cached = cache.get(mockBlob);
      expect(cached).toEqual(mockResponse);
    });

    it('should handle cache misses', () => {
      const differentBlob = new Blob(['different audio'], { type: 'audio/webm' });
      const cached = cache.get(differentBlob);
      expect(cached).toBeNull();
    });

    it('should respect TTL', () => {
      const originalNow = Date.now;
      try {
        let currentTime = Date.now();
        Date.now = vi.fn(() => currentTime);

        cache.set(mockBlob, mockResponse);
        expect(cache.get(mockBlob)).toEqual(mockResponse);

        // Advance time beyond TTL
        currentTime += 25 * 60 * 60 * 1000; // 25 hours
        expect(cache.get(mockBlob)).toBeNull();
      } finally {
        Date.now = originalNow;
      }
    });

    it('should limit cache size', () => {
      const maxEntries = 100;

      // Fill cache beyond limit
      for (let i = 0; i < maxEntries + 10; i++) {
        const blob = new Blob([`audio ${i}`], { type: 'audio/webm' });
        cache.set(blob, { ...mockResponse, text: `text ${i}` });
      }

      // Check first entries were removed
      const firstBlob = new Blob(['audio 0'], { type: 'audio/webm' });
      expect(cache.get(firstBlob)).toBeNull();
    });

    it('should clear cache', () => {
      cache.set(mockBlob, mockResponse);
      expect(cache.get(mockBlob)).toEqual(mockResponse);

      cache.clear();
      expect(cache.get(mockBlob)).toBeNull();
    });
  });

  describe('WebSocket Integration', () => {
    let wsUrl: string;

    beforeEach(() => {
      wsUrl = 'ws://localhost:8000/ws/whisper';
    });

    it('should establish WebSocket connection', () => {
      new MockWhisperService(wsUrl);
      expect(global.WebSocket).toHaveBeenCalledWith(wsUrl);
    });

    it('should send audio data over WebSocket', async () => {
      const service = new MockWhisperService(wsUrl);
      await service.sendAudioChunk(mockBlob);
      expect(mockWebSocket.send).toHaveBeenCalledWith(mockBlob);
    });

    it('should handle WebSocket errors', () => {
      const errorHandler = vi.fn();
      const service = new MockWhisperService(wsUrl);
      service.onError(errorHandler);

      // Simulate WebSocket error
      const error = new Error('WebSocket error');
      const listeners = mockWebSocket.addEventListener.mock.calls.find(
        (call: [string, any]) => call[0] === 'error'
      );
      if (listeners) {
        const [, handler] = listeners;
        handler(error);
      }

      expect(errorHandler).toHaveBeenCalledWith(error);
    });

    it('should handle reconnection', async () => {
      const service = new MockWhisperService(wsUrl);

      // Simulate disconnection
      const listeners = mockWebSocket.addEventListener.mock.calls.find(
        (call: [string, any]) => call[0] === 'close'
      );
      if (listeners) {
        const [, handler] = listeners;
        handler();
      }

      // Should attempt to reconnect
      expect(global.WebSocket).toHaveBeenCalledTimes(2);
    });

    it('should cleanup on disposal', () => {
      const service = new MockWhisperService(wsUrl);
      service.dispose();

      expect(mockWebSocket.close).toHaveBeenCalled();
    });
  });

  describe('Performance Monitoring', () => {
    it('should track transcription latency', async () => {
      const startTime = performance.now();
      const result = await MockWhisperService.transcribeAudio(mockBlob);
      const endTime = performance.now();

      expect(result).toHaveProperty('duration');
      expect((result as WhisperResponse).duration).toBeGreaterThanOrEqual(0);
      expect((result as WhisperResponse).duration).toBeLessThanOrEqual(endTime - startTime);
    });

    it('should handle concurrent requests', async () => {
      const requests = Array(5).fill(null).map(() =>
        MockWhisperService.transcribeAudio(mockBlob)
      );

      const results = await Promise.all(requests);
      expect(results).toHaveLength(5);
      expect(results.every((r: WhisperResponse | WhisperError) => r === mockResponse)).toBe(true);
    });
  });

  describe('Error Recovery', () => {
    it('should retry failed requests', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        });

      const result = await MockWhisperService.transcribeAudio(mockBlob, { retries: 1 });
      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle permanent failures', async () => {
      mockFetch.mockRejectedValue(new Error('Permanent error'));

      const result = await MockWhisperService.transcribeAudio(mockBlob, { retries: 2 });
      expect(result).toEqual({
        error: 'Permanent error',
        code: 'NETWORK_ERROR'
      });
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const service = new MockWhisperService();
      await service.initialize();
      expect(service['initialized']).toBe(true);
      expect(service['model']).toBeDefined();
      expect(service['audioContext']).toBeDefined();
    });

    it('should handle initialization errors', async () => {
      const service = new MockWhisperService();
      vi.spyOn(window, 'AudioContext').mockImplementationOnce(() => {
        throw new Error('AudioContext failed');
      });

      await expect(service.initialize()).rejects.toThrow('Failed to initialize Whisper service');
      expect(service['initialized']).toBe(false);
    });

    it('should initialize with different model sizes', async () => {
      const service = new MockWhisperService();
      const modelNames = ['tiny', 'base', 'small'];

      for (const modelName of modelNames) {
        await service.initialize(modelName);
        expect(service['model']?.name).toBe(modelName);
      }
    });
  });

  describe('Streaming Transcription', () => {
    let mockStream: MediaStream;
    let service: MockWhisperService;

    beforeEach(async () => {
      service = new MockWhisperService();
      await service.initialize();

      // Mock MediaStream
      mockStream = new MediaStream();
      const mockTrack = new MediaStreamTrack();
      mockStream.addTrack(mockTrack);
    });

    it('should handle streaming transcription', async () => {
      const generator = await service.transcribeStream(mockStream);
      const firstResult = await generator.next();

      expect(firstResult.value).toMatchObject({
        text: expect.any(String),
        confidence: expect.any(Number)
      });
    });

    it('should require initialization before streaming', async () => {
      const uninitializedService = new MockWhisperService();
      await expect(uninitializedService.transcribeStream(mockStream))
        .rejects.toThrow('Service not initialized');
    });
  });

  describe('Language Detection', () => {
    it('should detect different languages', async () => {
      const languages = ['en', 'es', 'fr'];

      for (const lang of languages) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            ...mockResponse,
            language: lang
          })
        });

        const result = await MockWhisperService.transcribeAudio(mockBlob);
        expect((result as WhisperResponse).language).toBe(lang);
      }
    });
  });

  describe('Resource Management', () => {
    let service: MockWhisperService;

    beforeEach(async () => {
      service = new MockWhisperService();
      await service.initialize();
    });

    it('should cleanup resources properly', async () => {
      const mockAudioContext = service['audioContext'];
      const mockClose = vi.fn();
      if (mockAudioContext) {
        mockAudioContext.close = mockClose;
      }

      await service.cleanup();

      expect(service['initialized']).toBe(false);
      expect(service['model']).toBeUndefined();
      expect(mockClose).toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      const mockAudioContext = service['audioContext'];
      if (mockAudioContext) {
        mockAudioContext.close = vi.fn().mockRejectedValue(new Error('Cleanup failed'));
      }

      await expect(service.cleanup()).resolves.not.toThrow();
      expect(service['initialized']).toBe(false);
    });
  });

  describe('Batch Processing', () => {
    let batchBlobs: Blob[];

    beforeEach(() => {
      batchBlobs = Array(3).fill(null).map((_, i) =>
        new Blob([`test audio ${i}`], { type: 'audio/webm' })
      );
    });

    it('should process multiple files in batch', async () => {
      const service = new MockWhisperService();
      await service.initialize();

      mockFetch.mockImplementation(() => ({
        ok: true,
        json: () => Promise.resolve({
          ...mockResponse,
          text: expect.any(String)
        })
      }));

      const results = await service.batchProcess(batchBlobs);

      expect(results).toHaveLength(batchBlobs.length);
      expect(results.every(r => 'text' in r)).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(batchBlobs.length);
    });

    it('should handle batch processing errors', async () => {
      const service = new MockWhisperService();
      await service.initialize();

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockResponse) })
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockResponse) });

      const results = await service.batchProcess(batchBlobs);

      expect(results).toHaveLength(batchBlobs.length);
      expect(results.some(r => 'error' in r)).toBe(true);
    });
  });

  describe('Segment-Level Validation', () => {
    it('should validate segment timestamps', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          ...mockResponse,
          segments: MOCK_SEGMENTS
        })
      });

      const result = await MockWhisperService.transcribeAudio(mockBlob);
      const segments = (result as WhisperResponse).segments;

      expect(segments).toBeDefined();
      expect(segments?.every(s => s.end > s.start)).toBe(true);
      expect(segments?.every(s => s.confidence >= PERFORMANCE_THRESHOLDS.MIN_CONFIDENCE)).toBe(true);
    });

    it('should maintain segment order', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          ...mockResponse,
          segments: MOCK_SEGMENTS
        })
      });

      const result = await MockWhisperService.transcribeAudio(mockBlob);
      const segments = (result as WhisperResponse).segments;

      expect(segments).toBeDefined();
      segments?.reduce((prevEnd, segment) => {
        expect(segment.start).toBeGreaterThanOrEqual(prevEnd);
        return segment.end;
      }, 0);
    });
  });

  describe('WebSocket Reconnection', () => {
    let mockWebSocket: {
      send: Mock;
      close: Mock;
      addEventListener: Mock;
      removeEventListener: Mock;
    };

    beforeEach(() => {
      mockWebSocket = {
        send: vi.fn(),
        close: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      };
      global.WebSocket = vi.fn(() => mockWebSocket) as unknown as typeof WebSocket;
    });

    it('should attempt reconnection on disconnect', async () => {
      const service = new MockWhisperService();
      await service.initialize();

      // Simulate multiple disconnections
      for (let i = 0; i < 3; i++) {
        const listeners = mockWebSocket.addEventListener.mock.calls.find(
          (call: [string, any]) => call[0] === 'close'
        );
        if (listeners) {
          const [, handler] = listeners;
          handler();
        }
      }

      expect(global.WebSocket).toHaveBeenCalledTimes(4); // Initial + 3 reconnects
    });

    it('should handle max reconnection attempts', async () => {
      const service = new MockWhisperService();
      await service.initialize();

      // Force max reconnections
      for (let i = 0; i < 5; i++) {
        const listeners = mockWebSocket.addEventListener.mock.calls.find(
          (call: [string, any]) => call[0] === 'close'
        );
        if (listeners) {
          const [, handler] = listeners;
          handler();
        }
      }

      expect(global.WebSocket).toHaveBeenCalledTimes(4); // Initial + 3 max reconnects
    });
  });

  describe('Performance Benchmarks', () => {
    let mockStream: MediaStream;

    beforeEach(() => {
      mockStream = new MediaStream();
      const mockTrack = new MediaStreamTrack();
      mockStream.addTrack(mockTrack);
    });

    it('should meet latency requirements', async () => {
      const startTime = performance.now();
      const result = await MockWhisperService.transcribeAudio(mockBlob);
      const endTime = performance.now();

      const latency = endTime - startTime;
      expect(latency).toBeLessThan(PERFORMANCE_THRESHOLDS.TRANSCRIPTION_LATENCY_MS);
    });

    it('should meet streaming latency requirements', async () => {
      const service = new MockWhisperService();
      await service.initialize();

      const generator = await service.transcribeStream(mockStream);

      const startTime = performance.now();
      const firstResult = await generator.next();
      const endTime = performance.now();

      const latency = endTime - startTime;
      expect(latency).toBeLessThan(PERFORMANCE_THRESHOLDS.STREAMING_LATENCY_MS);
    });

    it('should monitor memory usage', async () => {
      const service = new MockWhisperService();
      await service.initialize();

      // Process large audio multiple times
      const largeBlob = new Blob([new ArrayBuffer(1024 * 1024)], { type: 'audio/webm' });
      for (let i = 0; i < 5; i++) {
        await service.sendAudioChunk(largeBlob);
      }

      const memoryUsage = service.getMemoryUsage();
      expect(memoryUsage).toBeLessThan(PERFORMANCE_THRESHOLDS.MAX_MEMORY_USAGE_MB * 1024 * 1024);
    });
  });

  describe('Browser Compatibility', () => {
    const mockUserAgents = {
      chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36',
      firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:93.0) Gecko/20100101 Firefox/93.0',
      safari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15'
    };

    beforeEach(() => {
      // Store original navigator
      vi.spyOn(navigator, 'userAgent', 'get');
    });

    Object.entries(mockUserAgents).forEach(([browser, userAgent]) => {
      it(`should work in ${browser}`, async () => {
        // @ts-ignore - Readonly property
        navigator.userAgent = userAgent;

        const service = new MockWhisperService();
        await service.initialize();

        const result = await MockWhisperService.transcribeAudio(mockBlob);
        expect(result).toBeDefined();
        expect('error' in result).toBe(false);
      });
    });
  });

  describe('Audio Format Handling', () => {
    const audioFormats = [
      { type: 'audio/wav', supported: true },
      { type: 'audio/webm', supported: true },
      { type: 'audio/mp4', supported: true },
      { type: 'audio/ogg', supported: true },
      { type: 'audio/invalid', supported: false }
    ];

    audioFormats.forEach(({ type, supported }) => {
      it(`should ${supported ? 'accept' : 'reject'} ${type} format`, async () => {
        const service = new MockWhisperService();
        await service.initialize();

        const audioBlob = createAudioBlob(1.0);
        const testBlob = new Blob([audioBlob], { type });

        if (supported) {
          await expect(service.sendAudioChunk(testBlob)).resolves.not.toThrow();
        } else {
          await expect(service.sendAudioChunk(testBlob)).rejects.toThrow('Unsupported audio format');
        }
      });
    });

    it('should handle corrupted audio data', async () => {
      const service = new MockWhisperService();
      await service.initialize();

      const corruptedBlob = new Blob(['corrupted data'], { type: 'audio/wav' });
      await expect(service.sendAudioChunk(corruptedBlob)).rejects.toThrow('Invalid audio data');
    });
  });

  describe('Network Resilience', () => {
    Object.entries(NETWORK_CONDITIONS).forEach(([condition, { latency, jitter }]) => {
      it(`should handle ${condition} network conditions`, async () => {
        simulateNetworkCondition(latency, jitter);

        const service = new MockWhisperService();
        await service.initialize();

        const startTime = performance.now();
        const result = await MockWhisperService.transcribeAudio(mockBlob);
        const endTime = performance.now();

        expect(result).toBeDefined();
        if (latency < PERFORMANCE_THRESHOLDS.TRANSCRIPTION_LATENCY_MS) {
          expect(endTime - startTime).toBeLessThan(PERFORMANCE_THRESHOLDS.TRANSCRIPTION_LATENCY_MS);
        }

        vi.useRealTimers();
      });
    });

    it('should handle network interruptions', async () => {
      const service = new MockWhisperService();
      await service.initialize();

      // Simulate network failure then recovery
      mockFetch
        .mockRejectedValueOnce(new Error('Network disconnected'))
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockResponse) });

      const result = await MockWhisperService.transcribeAudio(mockBlob);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Security', () => {
    it('should sanitize input data', async () => {
      const service = new MockWhisperService();
      await service.initialize();

      const maliciousBlob = new Blob(['<script>alert("xss")</script>'], { type: 'audio/wav' });
      const result = await MockWhisperService.transcribeAudio(maliciousBlob);

      expect(result).not.toContain('<script>');
    });

    it('should validate WebSocket origin', async () => {
      const service = new MockWhisperService();
      await service.initialize();

      // @ts-ignore - Testing invalid origin
      global.location = { origin: 'http://malicious-site.com' };

      await expect(service.sendAudioChunk(mockBlob)).rejects.toThrow('Invalid origin');
    });

    it('should prevent unauthorized access', async () => {
      const service = new MockWhisperService();
      // Don't initialize to simulate unauthorized state
      await expect(MockWhisperService.transcribeAudio(mockBlob)).rejects.toThrow('Unauthorized');
    });
  });

  describe('Mobile Device Support', () => {
    Object.entries(DEVICE_PROFILES).forEach(([device, profile]) => {
      it(`should optimize for ${device}`, async () => {
        // Mock device environment
        // @ts-ignore - Readonly property
        navigator.userAgent = profile.userAgent;
        // @ts-ignore - Readonly property
        navigator.connection = profile.connection;
        // @ts-ignore - Mock memory API
        navigator.deviceMemory = profile.memory;

        const service = new MockWhisperService();
        await service.initialize();

        // Test with small audio chunk for mobile
        const smallBlob = createAudioBlob(0.5); // 500ms
        const result = await MockWhisperService.transcribeAudio(smallBlob);

        expect(result).toBeDefined();
        expect(service.getMemoryUsage()).toBeLessThan(profile.memory * 0.5); // Should use less than 50% of available memory
      });
    });
  });

  describe('WebSocket Message Validation', () => {
    it('should validate message format', async () => {
      const service = new MockWhisperService();
      await service.initialize();

      const invalidMessage = { type: 'unknown', data: 'invalid' };
      // @ts-ignore - Testing invalid message
      await expect(service['ws']?.send(JSON.stringify(invalidMessage)))
        .rejects.toThrow('Invalid message format');
    });

    it('should handle binary messages', async () => {
      const service = new MockWhisperService();
      await service.initialize();

      const audioData = new Float32Array([0, 0.5, -0.5, 0]);
      await expect(service.sendAudioChunk(new Blob([audioData])))
        .resolves.not.toThrow();
    });

    it('should maintain message order', async () => {
      const service = new MockWhisperService();
      await service.initialize();

      const messages = Array(5).fill(null).map((_: unknown, index: number) => createAudioBlob(0.1));
      const results = await Promise.all(messages.map(msg => service.sendAudioChunk(msg)));

      // Verify order maintained through WebSocket
      const sendCalls = mockWebSocket.send.mock.calls;
      expect(sendCalls).toHaveLength(messages.length);
      sendCalls.forEach((call: [Blob], i: number) => {
        expect(call[0]).toEqual(messages[i]);
      });
    });
  });

  describe('Audio Quality Validation', () => {
    it('should detect clipping', async () => {
      const service = new MockWhisperService();
      await service.initialize();

      // Create audio with clipping
      const clippedAudio = new Float32Array(1600);
      clippedAudio.fill(1.5); // Values > 1.0 indicate clipping
      const clippedBlob = new Blob([clippedAudio], { type: 'audio/wav' });

      await expect(service.sendAudioChunk(clippedBlob))
        .rejects.toThrow('Audio contains clipping');
    });

    it('should validate sample rate', async () => {
      const service = new MockWhisperService();
      await service.initialize();

      // Test various sample rates
      const sampleRates = [8000, 16000, 44100, 48000];
      for (const rate of sampleRates) {
        const audioBlob = createAudioBlob(1.0, rate);
        if (rate === 16000) {
          await expect(service.sendAudioChunk(audioBlob)).resolves.not.toThrow();
        } else {
          await expect(service.sendAudioChunk(audioBlob))
            .rejects.toThrow('Invalid sample rate');
        }
      }
    });

    it('should check audio duration limits', async () => {
      const service = new MockWhisperService();
      await service.initialize();

      // Test audio duration limits
      const durations = [0.1, 1.0, 30.0, 60.0];
      for (const duration of durations) {
        const audioBlob = createAudioBlob(duration);
        if (duration <= 30.0) {
          await expect(service.sendAudioChunk(audioBlob)).resolves.not.toThrow();
        } else {
          await expect(service.sendAudioChunk(audioBlob))
            .rejects.toThrow('Audio duration exceeds limit');
        }
      }
    });
  });

  describe('Background Processing', () => {
    it('should continue processing in background tab', async () => {
      const service = new MockWhisperService();
      await service.initialize();

      // Simulate page visibility change
      const visibilityChange = new Event('visibilitychange');
      // @ts-ignore - Testing readonly property
      document.hidden = true;
      document.dispatchEvent(visibilityChange);

      const result = await MockWhisperService.transcribeAudio(mockBlob);
      expect(result).toBeDefined();
      expect('error' in result).toBe(false);
    });

    it('should handle tab focus changes', async () => {
      const service = new MockWhisperService();
      await service.initialize();

      // Simulate tab blur and focus
      window.dispatchEvent(new Event('blur'));
      const result = await service.sendAudioChunk(mockBlob);
      window.dispatchEvent(new Event('focus'));

      expect(result).resolves.not.toThrow();
    });
  });

  describe('Cancellation', () => {
    it('should cancel ongoing transcription', async () => {
      const service = new MockWhisperService();
      await service.initialize();

      const transcriptionPromise = MockWhisperService.transcribeAudio(mockBlob);
      await service.cancel();

      await expect(transcriptionPromise).rejects.toThrow('Transcription cancelled');
    });

    it('should cleanup resources after cancellation', async () => {
      const service = new MockWhisperService();
      await service.initialize();

      const transcriptionPromise = MockWhisperService.transcribeAudio(mockBlob);
      await service.cancel();

      expect(service.getMemoryUsage()).toBe(0);
      expect(mockWebSocket.close).toHaveBeenCalled();
    });
  });

  describe('Progress Tracking', () => {
    let mockStream: MediaStream;

    beforeEach(() => {
      mockStream = new MediaStream();
      const mockTrack = new MediaStreamTrack();
      mockStream.addTrack(mockTrack);
    });

    it('should report transcription progress', async () => {
      const service = new MockWhisperService();
      await service.initialize();

      const progressHandler = vi.fn();
      service.onProgress(progressHandler);

      await MockWhisperService.transcribeAudio(mockBlob);

      expect(progressHandler).toHaveBeenCalledWith(expect.objectContaining({
        processed: expect.any(Number),
        total: expect.any(Number),
        percent: expect.any(Number)
      }));
    });

    it('should handle progress events for streaming', async () => {
      const service = new MockWhisperService();
      await service.initialize();

      const progressHandler = vi.fn();
      service.onProgress(progressHandler);

      const generator = await service.transcribeStream(mockStream);
      await generator.next();

      expect(progressHandler).toHaveBeenCalledWith(expect.objectContaining({
        processed: expect.any(Number),
        total: expect.any(Number),
        percent: expect.any(Number)
      }));
    });
  });

  describe('Offline Mode', () => {
    beforeEach(() => {
      // @ts-ignore - Testing readonly property
      navigator.onLine = false;
      window.dispatchEvent(new Event('offline'));
    });

    afterEach(() => {
      // @ts-ignore - Testing readonly property
      navigator.onLine = true;
      window.dispatchEvent(new Event('online'));
    });

    it('should queue requests when offline', async () => {
      const service = new MockWhisperService();
      await service.initialize();

      const offlinePromise = service.sendAudioChunk(mockBlob);

      // Simulate coming back online
      // @ts-ignore - Testing readonly property
      navigator.onLine = true;
      window.dispatchEvent(new Event('online'));

      await expect(offlinePromise).resolves.not.toThrow();
    });

    it('should sync queued items when online', async () => {
      const service = new MockWhisperService();
      await service.initialize();

      const queuedItems = [
        service.sendAudioChunk(mockBlob),
        service.sendAudioChunk(mockBlob),
        service.sendAudioChunk(mockBlob)
      ];

      // Simulate coming back online
      // @ts-ignore - Testing readonly property
      navigator.onLine = true;
      window.dispatchEvent(new Event('online'));

      await Promise.all(queuedItems);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('Rate Limiting', () => {
    it('should throttle rapid requests', async () => {
      const service = new MockWhisperService();
      await service.initialize();

      const startTime = performance.now();
      const requests = Array(10).fill(null).map(() =>
        service.sendAudioChunk(mockBlob)
      );

      await Promise.all(requests);
      const endTime = performance.now();

      // Should take at least 1 second for 10 requests with 100ms throttle
      expect(endTime - startTime).toBeGreaterThan(1000);
    });

    it('should handle burst requests gracefully', async () => {
      const service = new MockWhisperService();
      await service.initialize();

      // Simulate burst of requests
      const burstPromises = Array(20).fill(null).map(() =>
        service.sendAudioChunk(mockBlob)
      );

      await expect(Promise.all(burstPromises)).resolves.not.toThrow();
    });
  });

  describe('Cross-Tab Coordination', () => {
    it('should coordinate between tabs using BroadcastChannel', async () => {
      const service = new MockWhisperService();
      await service.initialize();

      const channel = new BroadcastChannel('whisper-service');
      const messageHandler = vi.fn();
      channel.addEventListener('message', messageHandler);

      await service.sendAudioChunk(mockBlob);

      expect(messageHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'TRANSCRIPTION_COMPLETE'
          })
        })
      );
    });

    it('should handle tab-specific resources', async () => {
      const service = new MockWhisperService();
      await service.initialize();

      // Simulate another tab's message
      const channel = new BroadcastChannel('whisper-service');
      channel.postMessage({ type: 'RELEASE_RESOURCES' });

      // Should not affect this tab's resources
      expect(service['initialized']).toBe(true);
      expect(service['audioContext']).toBeDefined();
    });
  });

  describe('Worker Lifecycle', () => {
    it('should terminate worker on cleanup', async () => {
      const service = new MockWhisperService();
      await service.initialize();

      const terminateSpy = vi.fn();
      // @ts-ignore - Mock worker
      service['worker'].terminate = terminateSpy;

      await service.cleanup();
      expect(terminateSpy).toHaveBeenCalled();
    });

    it('should restart worker after error', async () => {
      const service = new MockWhisperService();
      await service.initialize();

      // Simulate worker error
      const error = new Error('Worker crashed');
      // @ts-ignore - Mock worker
      service['worker'].dispatchEvent(new ErrorEvent('error', { error }));

      // Should create new worker
      await service.sendAudioChunk(mockBlob);
      expect(service['worker']).toBeDefined();
    });
  });
});
