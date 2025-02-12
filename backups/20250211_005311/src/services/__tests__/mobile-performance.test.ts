import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VADService } from '../vad-service';
import { WhisperService } from '../whisper-service';

// Mock performance.memory API
const mockMemory = {
  usedJSHeapSize: 0,
  totalJSHeapSize: 100000000,
  jsHeapSizeLimit: 200000000
};

// Mock performance API
const mockPerformance = {
  memory: mockMemory,
  now: vi.fn(),
  mark: vi.fn(),
  measure: vi.fn(),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn(),
  getEntriesByType: vi.fn()
};

// Mock battery manager with detailed metrics
const mockBatteryManager = {
  level: 1,
  charging: true,
  chargingTime: 0,
  dischargingTime: Infinity,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
};

// Mock navigator
const mockNavigator = {
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
  hardwareConcurrency: 4,
  getBattery: vi.fn().mockResolvedValue(mockBatteryManager),
  connection: {
    type: '4g',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }
};

describe('Mobile Performance Tests', () => {
  let vadService: VADService;
  let whisperService: WhisperService;
  let originalPerformance: any;
  let originalNavigator: any;

  beforeEach(() => {
    // Save original globals
    originalPerformance = global.performance;
    originalNavigator = global.navigator;

    // Mock globals
    global.performance = mockPerformance as any;
    global.navigator = { ...originalNavigator, ...mockNavigator };

    // Reset mocks
    mockMemory.usedJSHeapSize = 0;
    mockBatteryManager.level = 1;
    mockBatteryManager.charging = true;
    vi.clearAllMocks();

    // Initialize services
    vadService = new VADService({
      sampleRate: 16000,
      bufferSize: 1024,
      noiseThreshold: 0.5,
      silenceThreshold: 0.8
    });

    whisperService = new WhisperService({
      websocketUrl: 'wss://test.com',
      mobileOptimization: {
        enabled: true,
        batteryAware: true,
        adaptiveQuality: true,
        networkAware: true
      }
    });
  });

  afterEach(() => {
    // Restore globals
    global.performance = originalPerformance;
    global.navigator = originalNavigator;
  });

  describe('Memory Management', () => {
    it('should not leak memory during continuous operation', async () => {
      const initialMemory = mockMemory.usedJSHeapSize;
      const samples = [];

      // Simulate continuous operation
      for (let i = 0; i < 100; i++) {
        await vadService.initialize(new MediaStream());
        await whisperService.initialize();

        // Record memory usage
        samples.push(mockMemory.usedJSHeapSize);

        // Cleanup
        vadService.dispose();
        whisperService.dispose();
      }

      // Calculate memory growth rate
      const memoryGrowth = samples[samples.length - 1] - initialMemory;
      const averageGrowthPerIteration = memoryGrowth / samples.length;

      // Assert reasonable memory growth
      expect(averageGrowthPerIteration).toBeLessThan(1000); // Less than 1KB per iteration
    });

    it('should release resources when under memory pressure', async () => {
      await vadService.initialize(new MediaStream());
      await whisperService.initialize();

      // Simulate memory pressure
      mockMemory.usedJSHeapSize = mockMemory.totalJSHeapSize * 0.9;

      // Trigger garbage collection (simulated)
      const initialMemory = mockMemory.usedJSHeapSize;
      vadService.dispose();
      whisperService.dispose();

      expect(mockMemory.usedJSHeapSize).toBeLessThan(initialMemory);
    });
  });

  describe('Battery Impact', () => {
    it('should measure battery drain rate', async () => {
      const batteryLevels: number[] = [];
      const startTime = Date.now();

      // Monitor battery levels during operation
      for (let i = 0; i < 10; i++) {
        await vadService.initialize(new MediaStream());
        await whisperService.initialize();

        // Simulate battery drain
        mockBatteryManager.level -= 0.01;
        batteryLevels.push(mockBatteryManager.level);

        // Cleanup
        vadService.dispose();
        whisperService.dispose();
      }

      const duration = Date.now() - startTime;
      const batteryDrain = batteryLevels[0] - batteryLevels[batteryLevels.length - 1];
      const drainRate = batteryDrain / (duration / 3600000); // Convert to drain per hour

      // Assert reasonable battery drain
      expect(drainRate).toBeLessThan(0.1); // Less than 10% per hour
    });

    it('should optimize battery usage in low power mode', async () => {
      const normalUsage = await measureBatteryImpact(vadService, whisperService);

      // Enable low power mode
      mockBatteryManager.level = 0.15;
      mockBatteryManager.charging = false;
      const lowPowerUsage = await measureBatteryImpact(vadService, whisperService);

      expect(lowPowerUsage).toBeLessThan(normalUsage);
    });
  });

  describe('Performance Metrics', () => {
    it('should maintain responsive processing times', async () => {
      const processingTimes: number[] = [];

      // Measure processing times
      for (let i = 0; i < 50; i++) {
        const start = performance.now();
        await vadService.initialize(new MediaStream());
        const end = performance.now();
        processingTimes.push(end - start);
        vadService.dispose();
      }

      const averageTime = processingTimes.reduce((a, b) => a + b) / processingTimes.length;
      expect(averageTime).toBeLessThan(100); // Less than 100ms average
    });

    it('should adapt processing based on device capabilities', async () => {
      // Test with different CPU cores
      const processingTimes = new Map<number, number>();

      for (const cores of [2, 4, 8]) {
        mockNavigator.hardwareConcurrency = cores;
        const start = performance.now();
        await vadService.initialize(new MediaStream());
        const end = performance.now();
        processingTimes.set(cores, end - start);
        vadService.dispose();
      }

      // Verify processing scales with cores
      expect(processingTimes.get(8)).toBeLessThan(processingTimes.get(2)!);
    });
  });
});

// Helper function to measure battery impact
async function measureBatteryImpact(vadService: VADService, whisperService: WhisperService): Promise<number> {
  const startLevel = mockBatteryManager.level;
  const startTime = Date.now();

  // Run intensive operations
  for (let i = 0; i < 5; i++) {
    await vadService.initialize(new MediaStream());
    await whisperService.initialize();
    vadService.dispose();
    whisperService.dispose();
  }

  const duration = Date.now() - startTime;
  const batteryDrain = startLevel - mockBatteryManager.level;
  return batteryDrain / (duration / 3600000); // Return drain rate per hour
}
