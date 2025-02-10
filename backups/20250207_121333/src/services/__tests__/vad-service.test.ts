import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VADService, VADOptions, DeviceCapabilities, VADPerformanceMetrics } from '../vad-service';
import { AudioStateManager, AudioServiceEvent, AudioServiceError } from '../audio-state';

// Mock Performance API
const mockPerformance = {
  now: vi.fn(),
  memory: {
    usedJSHeapSize: 0,
    jsHeapSizeLimit: 1000000,
    totalJSHeapSize: 500000
  }
};
global.performance = mockPerformance as any;

// Mock Battery API
const mockBatteryManager = {
  level: 1,
  charging: true,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
};

// Mock navigator
const mockNavigator = {
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
  hardwareConcurrency: 4,
  getBattery: vi.fn().mockResolvedValue(mockBatteryManager)
};
Object.defineProperty(global, 'navigator', { value: mockNavigator, configurable: true });

// Mock AudioBuffer
class MockAudioBuffer implements AudioBuffer {
  length = 1024;
  duration = 1024 / 44100;
  sampleRate = 44100;
  numberOfChannels = 1;
  private data: Float32Array;

  constructor(data: Float32Array) {
    this.data = data;
  }

  getChannelData(channel: number): Float32Array {
    return this.data;
  }

  copyFromChannel(destination: Float32Array, channelNumber: number, startInChannel?: number): void {}
  copyToChannel(source: Float32Array, channelNumber: number, startInChannel?: number): void {}
}

// Mock AudioProcessingEvent
class MockAudioProcessingEvent extends Event implements AudioProcessingEvent {
  inputBuffer: AudioBuffer;
  outputBuffer: AudioBuffer;
  playbackTime: number;

  constructor(data: Float32Array) {
    super('audioprocess');
    this.inputBuffer = new MockAudioBuffer(data);
    this.outputBuffer = new MockAudioBuffer(new Float32Array(1024));
    this.playbackTime = 0;
  }
}

// Mock AudioContext and related classes
class MockAnalyserNode {
  smoothingTimeConstant = 0;
  fftSize = 0;
  frequencyBinCount = 1024;
  getFloatTimeDomainData = vi.fn();
  getFloatFrequencyData = vi.fn();
  connect = vi.fn().mockReturnThis();
  disconnect = vi.fn();
}

class MockScriptProcessorNode {
  onaudioprocess: ((event: AudioProcessingEvent) => void) | null = null;
  connect = vi.fn().mockReturnThis();
  disconnect = vi.fn();
}

class MockMediaStreamAudioSourceNode {
  connect = vi.fn().mockReturnThis();
  disconnect = vi.fn();
}

class MockAudioContext {
  state = 'running';
  sampleRate = 44100;
  baseLatency = 0.005;
  createAnalyser = vi.fn().mockReturnValue(new MockAnalyserNode());
  createScriptProcessor = vi.fn().mockReturnValue(new MockScriptProcessorNode());
  createMediaStreamSource = vi.fn().mockReturnValue(new MockMediaStreamAudioSourceNode());
  destination = {};
  close = vi.fn();
}

global.AudioContext = MockAudioContext as any;

// Mock Worker
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
}

global.Worker = MockWorker as any;

describe('VAD Service', () => {
  let vadService: VADService;
  let mockStream: MediaStream;
  let mockWorker: MockWorker;

  const defaultOptions: VADOptions = {
    sampleRate: 16000,
    bufferSize: 1024,
    noiseThreshold: 0.5,
    silenceThreshold: 0.8,
    mobileOptimization: {
      enabled: true,
      batteryAware: true,
      adaptiveBufferSize: true,
      powerSaveMode: false
    }
  };

  beforeEach(() => {
    vadService = new VADService(defaultOptions);
    mockStream = new MediaStream();
    mockWorker = new MockWorker();
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should detect device capabilities correctly', () => {
      const capabilities = (vadService as any).deviceCapabilities;
      expect(capabilities.isMobile).toBe(true);
      expect(capabilities.hasBatteryAPI).toBe(true);
      expect(capabilities.cpuCores).toBe(4);
      expect(capabilities.hasWebWorker).toBe(true);
      expect(capabilities.hasPerformanceAPI).toBe(true);
    });

    it('should initialize battery monitoring for mobile devices', async () => {
      await vadService.initialize(mockStream);
      expect(mockNavigator.getBattery).toHaveBeenCalled();
      expect(mockBatteryManager.addEventListener).toHaveBeenCalledWith('levelchange', expect.any(Function));
      expect(mockBatteryManager.addEventListener).toHaveBeenCalledWith('chargingchange', expect.any(Function));
    });

    it('should initialize with WebWorker when available', async () => {
      await vadService.initialize(mockStream);
      expect(MockWorker).toHaveBeenCalled();
    });

    it('should fall back to main thread processing when WebWorker is unavailable', async () => {
      // Temporarily remove WebWorker support
      const originalWorker = global.Worker;
      (global as any).Worker = undefined;

      vadService = new VADService(defaultOptions);
      await vadService.initialize(mockStream);

      // Process some audio
      const audioData = new Float32Array(1024).fill(0.8);
      const processor = new MockScriptProcessorNode();
      processor.onaudioprocess!(new MockAudioProcessingEvent(audioData));

      // Verify main thread processing
      expect(vadService['worker']).toBeNull();

      // Restore WebWorker
      global.Worker = originalWorker;
    });
  });

  describe('Mobile Optimization', () => {
    it('should adjust buffer size based on battery state', async () => {
      await vadService.initialize(mockStream);

      // Normal state
      let bufferSize = (vadService as any).getOptimalBufferSize();
      expect(bufferSize).toBe(1024);

      // Simulate low battery
      mockBatteryManager.level = 0.15;
      mockBatteryManager.charging = false;
      const batteryHandler = mockBatteryManager.addEventListener.mock.calls.find(
        call => call[0] === 'levelchange'
      )[1];
      batteryHandler();

      // Check increased buffer size
      bufferSize = (vadService as any).getOptimalBufferSize();
      expect(bufferSize).toBe(2048);
    });

    it('should implement frame skipping in power save mode', async () => {
      await vadService.initialize(mockStream);

      // Simulate low battery
      mockBatteryManager.level = 0.15;
      mockBatteryManager.charging = false;
      const batteryHandler = mockBatteryManager.addEventListener.mock.calls.find(
        call => call[0] === 'levelchange'
      )[1];
      batteryHandler();

      const processor = (vadService as any).createOptimizedAudioProcessor();
      const processEvents: boolean[] = [];

      // Process multiple frames
      for (let i = 0; i < 10; i++) {
        processor(new MockAudioProcessingEvent(new Float32Array(1024).fill(0.5)));
        processEvents.push(true);
      }

      // Verify frame skipping
      expect(processEvents.length).toBe(10);
      expect(mockWorker.postMessage).toHaveBeenCalledTimes(4); // Should skip every 2 frames
    });
  });

  describe('Performance Monitoring', () => {
    it('should track and report performance metrics', async () => {
      const metricsListener = vi.fn();
      vadService.addMetricsListener(metricsListener);
      await vadService.initialize(mockStream);

      // Simulate worker metrics message
      const workerMetrics = {
        averageProcessingTime: 2.5,
        peakMemoryUsage: 50000,
        totalSamplesProcessed: 1024,
        stateTransitions: 1,
        errorCount: 0
      };

      mockWorker.onmessage!({
        data: { type: 'metrics', data: workerMetrics }
      } as MessageEvent);

      expect(metricsListener).toHaveBeenCalledWith(expect.objectContaining({
        ...workerMetrics,
        deviceCapabilities: expect.any(Object),
        batteryLevel: expect.any(Number),
        isCharging: expect.any(Boolean),
        audioContextLatency: expect.any(Number)
      }));
    });

    it('should start performance monitoring interval', async () => {
      const spy = vi.spyOn(window, 'setInterval');
      await vadService.initialize(mockStream);

      expect(spy).toHaveBeenCalledWith(expect.any(Function), 1000);
      expect((vadService as any).metricsInterval).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle worker errors', async () => {
      const errorListener = vi.fn();
      vadService.addErrorListener(errorListener);
      await vadService.initialize(mockStream);

      // Simulate worker error
      mockWorker.onerror!({ error: new Error('Worker error') } as ErrorEvent);

      expect(errorListener).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle initialization errors', async () => {
      const errorListener = vi.fn();
      vadService.addErrorListener(errorListener);

      // Force initialization error
      mockNavigator.getBattery.mockRejectedValueOnce(new Error('Battery API error'));
      await vadService.initialize(mockStream);

      expect(errorListener).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Cleanup', () => {
    it('should cleanup all resources on dispose', async () => {
      await vadService.initialize(mockStream);
      vadService.dispose();

      expect(mockBatteryManager.removeEventListener).toHaveBeenCalledWith('levelchange', expect.any(Function));
      expect(mockBatteryManager.removeEventListener).toHaveBeenCalledWith('chargingchange', expect.any(Function));
      expect(mockWorker.postMessage).toHaveBeenCalledWith({ type: 'terminate' });
      expect((vadService as any).audioContext.close).toHaveBeenCalled();
      expect((vadService as any).metricsInterval).toBeNull();
    });
  });
});
