import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VADService, VADOptions, DeviceCapabilities } from '../vad-service';

// Mock navigator APIs
const mockNavigator = {
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
  hardwareConcurrency: 4,
  getBattery: vi.fn(),
};

// Mock battery manager
const mockBatteryManager = {
  level: 1,
  charging: true,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

// Mock AudioContext
class MockAudioContext {
  latencyHint: string;
  sampleRate = 48000;
  state = 'running';

  constructor(options: { latencyHint?: string } = {}) {
    this.latencyHint = options.latencyHint || 'interactive';
  }

  createMediaStreamSource = vi.fn().mockReturnThis();
  createScriptProcessor = vi.fn().mockReturnThis();
  close = vi.fn();
}

describe('VAD Service - Mobile', () => {
  let service: VADService;
  let mockStream: MediaStream;
  let originalNavigator: any;
  let originalAudioContext: any;

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
    // Save original globals
    originalNavigator = global.navigator;
    originalAudioContext = global.AudioContext;

    // Mock globals
    global.navigator = {
      ...originalNavigator,
      ...mockNavigator
    };
    global.AudioContext = MockAudioContext as any;

    // Reset mocks
    mockBatteryManager.level = 1;
    mockBatteryManager.charging = true;
    mockNavigator.getBattery.mockResolvedValue(mockBatteryManager);

    // Create service
    service = new VADService(defaultOptions);
    mockStream = new MediaStream();
  });

  afterEach(() => {
    // Restore globals
    global.navigator = originalNavigator;
    global.AudioContext = originalAudioContext;

    vi.clearAllMocks();
  });

  describe('Device Detection', () => {
    it('should detect mobile device correctly', () => {
      const capabilities = (service as any).deviceCapabilities;
      expect(capabilities.isMobile).toBe(true);
      expect(capabilities.cpuCores).toBe(4);
      expect(capabilities.hasBatteryAPI).toBe(true);
    });

    it('should handle desktop device correctly', () => {
      global.navigator = {
        ...originalNavigator,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        hardwareConcurrency: 8,
        getBattery: vi.fn(),
      };

      service = new VADService(defaultOptions);
      const capabilities = (service as any).deviceCapabilities;
      expect(capabilities.isMobile).toBe(false);
      expect(capabilities.cpuCores).toBe(8);
    });
  });

  describe('Battery Awareness', () => {
    it('should initialize battery monitoring', async () => {
      await service.initialize(mockStream);
      expect(mockNavigator.getBattery).toHaveBeenCalled();
      expect(mockBatteryManager.addEventListener).toHaveBeenCalledWith('levelchange', expect.any(Function));
      expect(mockBatteryManager.addEventListener).toHaveBeenCalledWith('chargingchange', expect.any(Function));
    });

    it('should adjust processing for low battery', async () => {
      await service.initialize(mockStream);

      // Simulate low battery
      mockBatteryManager.level = 0.15;
      mockBatteryManager.charging = false;
      const levelChangeHandler = mockBatteryManager.addEventListener.mock.calls.find(
        call => call[0] === 'levelchange'
      )[1];
      levelChangeHandler();

      // Verify power save mode is enabled
      expect((service as any).isLowPower).toBe(true);
    });

    it('should restore normal processing when charging', async () => {
      await service.initialize(mockStream);

      // Simulate charging
      mockBatteryManager.level = 0.15;
      mockBatteryManager.charging = true;
      const chargingChangeHandler = mockBatteryManager.addEventListener.mock.calls.find(
        call => call[0] === 'chargingchange'
      )[1];
      chargingChangeHandler();

      // Verify power save mode is disabled
      expect((service as any).isLowPower).toBe(false);
    });
  });

  describe('Buffer Size Optimization', () => {
    it('should use optimal buffer size for mobile', async () => {
      await service.initialize(mockStream);
      const audioContext = new MockAudioContext();
      const bufferSize = (service as any).getOptimalBufferSize();

      expect(bufferSize).toBeLessThanOrEqual(defaultOptions.bufferSize);
      expect(Math.log2(bufferSize) % 1).toBe(0); // Should be power of 2
    });

    it('should increase buffer size in power save mode', async () => {
      await service.initialize(mockStream);
      const normalBufferSize = (service as any).getOptimalBufferSize();

      // Simulate low battery
      mockBatteryManager.level = 0.15;
      mockBatteryManager.charging = false;
      const levelChangeHandler = mockBatteryManager.addEventListener.mock.calls.find(
        call => call[0] === 'levelchange'
      )[1];
      levelChangeHandler();

      const powerSaveBufferSize = (service as any).getOptimalBufferSize();
      expect(powerSaveBufferSize).toBeGreaterThan(normalBufferSize);
    });
  });

  describe('Performance Optimization', () => {
    it('should use balanced latency hint for mobile', async () => {
      await service.initialize(mockStream);
      expect(MockAudioContext.prototype.constructor).toHaveBeenCalledWith({
        latencyHint: 'balanced'
      });
    });

    it('should skip frames in power save mode', async () => {
      await service.initialize(mockStream);

      // Simulate low battery
      mockBatteryManager.level = 0.15;
      mockBatteryManager.charging = false;
      const levelChangeHandler = mockBatteryManager.addEventListener.mock.calls.find(
        call => call[0] === 'levelchange'
      )[1];
      levelChangeHandler();

      const processor = (service as any).createOptimizedAudioProcessor();
      const processEvents: boolean[] = [];

      // Simulate audio processing events
      for (let i = 0; i < 10; i++) {
        const event = new AudioProcessingEvent('audioprocess', {
          inputBuffer: new AudioBuffer({
            length: 1024,
            numberOfChannels: 1,
            sampleRate: 48000
          }),
          outputBuffer: new AudioBuffer({
            length: 1024,
            numberOfChannels: 1,
            sampleRate: 48000
          }),
          playbackTime: 0
        });

        processor(event);
        processEvents.push(true);
      }

      // Should process fewer frames in power save mode
      expect(processEvents.length).toBeLessThan(10);
    });
  });

  describe('Cleanup', () => {
    it('should clean up battery monitoring on dispose', async () => {
      await service.initialize(mockStream);
      service.dispose();

      expect(mockBatteryManager.removeEventListener).toHaveBeenCalledWith('levelchange', expect.any(Function));
      expect(mockBatteryManager.removeEventListener).toHaveBeenCalledWith('chargingchange', expect.any(Function));
    });
  });
});
