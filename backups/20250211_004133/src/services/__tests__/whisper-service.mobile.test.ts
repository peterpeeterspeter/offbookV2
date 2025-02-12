import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WhisperService, WhisperOptions } from '../whisper-service';

// Mock navigator APIs
const mockNavigator = {
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
  hardwareConcurrency: 4,
  getBattery: vi.fn(),
  connection: {
    type: '4g',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }
};

// Mock battery manager
const mockBatteryManager = {
  level: 1,
  charging: true,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

// Mock WebSocket
class MockWebSocket {
  url: string;
  onmessage: ((event: any) => void) | null = null;
  onclose: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  readyState: number = WebSocket.CONNECTING;

  constructor(url: string) {
    this.url = url;
  }

  send = vi.fn();
  close = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
}

describe('Whisper Service - Mobile', () => {
  let service: WhisperService;
  let mockSocket: MockWebSocket;
  let originalNavigator: any;
  let originalWebSocket: any;

  const defaultOptions: WhisperOptions = {
    websocketUrl: 'wss://test.com',
    mobileOptimization: {
      enabled: true,
      batteryAware: true,
      adaptiveQuality: true,
      networkAware: true
    }
  };

  beforeEach(() => {
    // Save original globals
    originalNavigator = global.navigator;
    originalWebSocket = global.WebSocket;

    // Mock globals
    global.navigator = {
      ...originalNavigator,
      ...mockNavigator
    };
    global.WebSocket = MockWebSocket as any;

    // Reset mocks
    mockBatteryManager.level = 1;
    mockBatteryManager.charging = true;
    mockNavigator.getBattery.mockResolvedValue(mockBatteryManager);
    mockNavigator.connection.type = '4g';

    // Create service
    service = new WhisperService(defaultOptions);
    mockSocket = new MockWebSocket(defaultOptions.websocketUrl);
  });

  afterEach(() => {
    // Restore globals
    global.navigator = originalNavigator;
    global.WebSocket = originalWebSocket;

    // Clear mocks
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

      service = new WhisperService(defaultOptions);
      const capabilities = (service as any).deviceCapabilities;
      expect(capabilities.isMobile).toBe(false);
      expect(capabilities.cpuCores).toBe(8);
    });
  });

  describe('Battery Awareness', () => {
    it('should initialize battery monitoring', async () => {
      await service.initialize();
      expect(mockNavigator.getBattery).toHaveBeenCalled();
      expect(mockBatteryManager.addEventListener).toHaveBeenCalledWith('levelchange', expect.any(Function));
      expect(mockBatteryManager.addEventListener).toHaveBeenCalledWith('chargingchange', expect.any(Function));
    });

    it('should adjust quality for low battery', async () => {
      await service.initialize();

      // Simulate low battery
      mockBatteryManager.level = 0.15;
      mockBatteryManager.charging = false;
      const levelChangeHandler = mockBatteryManager.addEventListener.mock.calls.find(
        call => call[0] === 'levelchange'
      )[1];
      levelChangeHandler();

      // Verify power save mode
      expect((service as any).isLowPower).toBe(true);
      expect((service as any).currentQualityLevel).toBe('low');
    });

    it('should restore quality when charging', async () => {
      await service.initialize();

      // Simulate charging
      mockBatteryManager.level = 0.15;
      mockBatteryManager.charging = true;
      const chargingChangeHandler = mockBatteryManager.addEventListener.mock.calls.find(
        call => call[0] === 'chargingchange'
      )[1];
      chargingChangeHandler();

      // Verify normal quality
      expect((service as any).isLowPower).toBe(false);
      expect((service as any).currentQualityLevel).toBe('high');
    });
  });

  describe('Network Awareness', () => {
    it('should monitor network conditions', async () => {
      await service.initialize();
      expect(mockNavigator.connection.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should adjust quality based on network type', async () => {
      await service.initialize();

      // Simulate network change
      mockNavigator.connection.type = '3g';
      const networkHandler = mockNavigator.connection.addEventListener.mock.calls.find(
        call => call[0] === 'change'
      )[1];
      networkHandler();

      expect((service as any).currentQualityLevel).toBe('medium');
    });

    it('should handle offline mode', async () => {
      await service.initialize();

      // Simulate offline
      mockNavigator.connection.type = 'none';
      const networkHandler = mockNavigator.connection.addEventListener.mock.calls.find(
        call => call[0] === 'change'
      )[1];
      networkHandler();

      expect((service as any).isOffline).toBe(true);
    });
  });

  describe('Performance Optimization', () => {
    it('should use optimal chunk size for mobile', async () => {
      await service.initialize();
      const chunkSize = (service as any).getOptimalChunkSize();

      expect(chunkSize).toBeLessThanOrEqual(4096); // Default max chunk size
      expect(chunkSize % 1024).toBe(0); // Should be multiple of 1024
    });

    it('should adjust chunk size in power save mode', async () => {
      await service.initialize();
      const normalChunkSize = (service as any).getOptimalChunkSize();

      // Simulate low battery
      mockBatteryManager.level = 0.15;
      mockBatteryManager.charging = false;
      const levelChangeHandler = mockBatteryManager.addEventListener.mock.calls.find(
        call => call[0] === 'levelchange'
      )[1];
      levelChangeHandler();

      const powerSaveChunkSize = (service as any).getOptimalChunkSize();
      expect(powerSaveChunkSize).toBeGreaterThan(normalChunkSize);
    });

    it('should implement adaptive quality control', async () => {
      await service.initialize();

      // Track quality changes
      const qualityLevels: string[] = [];
      (service as any).onQualityChange = (level: string) => {
        qualityLevels.push(level);
      };

      // Simulate various conditions
      // 1. Normal state
      expect((service as any).currentQualityLevel).toBe('high');

      // 2. Low battery
      mockBatteryManager.level = 0.15;
      mockBatteryManager.charging = false;
      const batteryHandler = mockBatteryManager.addEventListener.mock.calls.find(
        call => call[0] === 'levelchange'
      )[1];
      batteryHandler();

      // 3. Poor network
      mockNavigator.connection.type = '3g';
      const networkHandler = mockNavigator.connection.addEventListener.mock.calls.find(
        call => call[0] === 'change'
      )[1];
      networkHandler();

      expect(qualityLevels).toEqual(['high', 'low', 'medium']);
    });
  });

  describe('Resource Management', () => {
    it('should cleanup resources on dispose', async () => {
      await service.initialize();
      service.dispose();

      expect(mockBatteryManager.removeEventListener).toHaveBeenCalledWith('levelchange', expect.any(Function));
      expect(mockBatteryManager.removeEventListener).toHaveBeenCalledWith('chargingchange', expect.any(Function));
      expect(mockNavigator.connection.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should handle memory pressure warnings', async () => {
      await service.initialize();

      // Simulate memory pressure
      window.dispatchEvent(new Event('memorywarning'));

      // Should trigger cleanup
      expect((service as any).transcriptionCache.clear).toHaveBeenCalled();
    });
  });

  describe('Safari Specific Behavior', () => {
    beforeEach(() => {
      global.navigator = {
        ...originalNavigator,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
      };
      service = new WhisperService(defaultOptions);
    });

    it('should handle audio session interruptions', async () => {
      await service.initialize();
      const errorHandler = vi.fn();
      service.onError = errorHandler;

      // Simulate audio session interruption
      window.dispatchEvent(new Event('audiointerruption'));

      expect(errorHandler).toHaveBeenCalledWith(expect.any(Error));
      expect((service as any).currentQualityLevel).toBe('low');
    });

    it('should adapt to Safari memory warnings', async () => {
      await service.initialize();

      // Simulate memory warning
      window.dispatchEvent(new Event('memorywarning'));

      expect((service as any).transcriptionCache.size).toBe(0);
      expect((service as any).currentQualityLevel).toBe('low');
    });
  });

  describe('Background/Foreground Transitions', () => {
    it('should handle background transitions', async () => {
      await service.initialize();
      const qualityHandler = vi.fn();
      service.onQualityChange = qualityHandler;

      // Simulate app going to background
      document.dispatchEvent(new Event('visibilitychange'));
      Object.defineProperty(document, 'visibilityState', { value: 'hidden' });

      expect(qualityHandler).toHaveBeenCalledWith('low');
      expect((service as any).isBackgrounded).toBe(true);
    });

    it('should resume normal operation on foreground', async () => {
      await service.initialize();

      // Set to background first
      document.dispatchEvent(new Event('visibilitychange'));
      Object.defineProperty(document, 'visibilityState', { value: 'hidden' });

      // Then bring to foreground
      Object.defineProperty(document, 'visibilityState', { value: 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));

      expect((service as any).isBackgrounded).toBe(false);
      expect((service as any).currentQualityLevel).toBe('high');
    });

    it('should pause processing in background', async () => {
      await service.initialize();
      const processHandler = vi.fn();
      (service as any).processAudio = processHandler;

      // Go to background
      Object.defineProperty(document, 'visibilityState', { value: 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));

      // Attempt to process
      await service.transcribeAudio(new Blob());

      expect(processHandler).not.toHaveBeenCalled();
    });
  });

  describe('Memory Management', () => {
    it('should limit cache size based on device memory', async () => {
      // Mock device memory API
      Object.defineProperty(navigator, 'deviceMemory', { value: 4 });
      await service.initialize();

      // Add items to cache
      for (let i = 0; i < 100; i++) {
        (service as any).transcriptionCache.set(`key${i}`, 'value');
      }

      expect((service as any).transcriptionCache.size).toBeLessThanOrEqual(50);
    });

    it('should cleanup old cache entries', async () => {
      await service.initialize();

      // Add old entries
      const oldDate = Date.now() - 3600000; // 1 hour ago
      (service as any).transcriptionCache.set('old1', { timestamp: oldDate, data: 'old' });
      (service as any).transcriptionCache.set('old2', { timestamp: oldDate, data: 'old' });

      // Trigger cleanup
      (service as any).cleanupCache();

      expect((service as any).transcriptionCache.size).toBe(0);
    });
  });

  describe('Error Recovery', () => {
    it('should handle WebSocket reconnection', async () => {
      await service.initialize();
      const socket = (service as any).socket;

      // Simulate connection error
      socket.onerror(new Event('error'));
      socket.onclose(new Event('close'));

      // Should attempt to reconnect
      expect(WebSocket).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple reconnection attempts', async () => {
      await service.initialize();
      const socket = (service as any).socket;

      // Simulate multiple failures
      for (let i = 0; i < 3; i++) {
        socket.onerror(new Event('error'));
        socket.onclose(new Event('close'));
      }

      expect((service as any).reconnectAttempts).toBe(3);
      expect((service as any).currentQualityLevel).toBe('low');
    });

    it('should recover from network errors', async () => {
      await service.initialize();

      // Simulate offline
      mockNavigator.connection.type = 'none';
      const networkHandler = mockNavigator.connection.addEventListener.mock.calls.find(
        call => call[0] === 'change'
      )[1];
      networkHandler();

      // Simulate coming back online
      mockNavigator.connection.type = '4g';
      networkHandler();

      expect((service as any).isOffline).toBe(false);
      expect((service as any).currentQualityLevel).toBe('high');
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple simultaneous transcriptions', async () => {
      await service.initialize();
      const processHandler = vi.fn();
      (service as any).processAudio = processHandler;

      // Start multiple transcriptions
      const promises = Array(5).fill(0).map(() => service.transcribeAudio(new Blob()));
      await Promise.all(promises);

      expect(processHandler).toHaveBeenCalledTimes(5);
    });

    it('should throttle requests when device is busy', async () => {
      await service.initialize();

      // Simulate device under load
      Object.defineProperty(navigator, 'deviceMemory', { value: 2 });
      window.dispatchEvent(new Event('memorywarning'));

      const startTime = Date.now();
      const promises = Array(3).fill(0).map(() => service.transcribeAudio(new Blob()));
      await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(duration).toBeGreaterThan(100); // Should have throttled
    });
  });

  describe('Quality Transitions', () => {
    it('should handle rapid quality changes smoothly', async () => {
      await service.initialize();
      const qualityLevels: string[] = [];
      service.onQualityChange = (level) => qualityLevels.push(level);

      // Simulate rapid condition changes
      mockBatteryManager.level = 0.15; // Low battery
      mockBatteryManager.charging = false;
      const batteryHandler = mockBatteryManager.addEventListener.mock.calls.find(
        call => call[0] === 'levelchange'
      )[1];
      batteryHandler();

      mockNavigator.connection.type = '3g'; // Poor network
      const networkHandler = mockNavigator.connection.addEventListener.mock.calls.find(
        call => call[0] === 'change'
      )[1];
      networkHandler();

      mockBatteryManager.charging = true; // Start charging
      const chargingHandler = mockBatteryManager.addEventListener.mock.calls.find(
        call => call[0] === 'chargingchange'
      )[1];
      chargingHandler();

      expect(qualityLevels).toEqual(['high', 'low', 'medium', 'high']);
    });

    it('should debounce quality changes', async () => {
      await service.initialize();
      const qualityHandler = vi.fn();
      service.onQualityChange = qualityHandler;

      // Trigger multiple rapid changes
      for (let i = 0; i < 10; i++) {
        mockNavigator.connection.type = i % 2 ? '4g' : '3g';
        const networkHandler = mockNavigator.connection.addEventListener.mock.calls.find(
          call => call[0] === 'change'
        )[1];
        networkHandler();
      }

      expect(qualityHandler).toHaveBeenCalledTimes(1);
    });
  });
});
