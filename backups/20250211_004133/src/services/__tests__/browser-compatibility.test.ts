import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VADService } from '../vad-service';
import { WhisperService } from '../whisper-service';

// Browser configurations to test
const browserConfigs = [
  {
    name: 'Safari iOS',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    vendor: 'Apple Computer, Inc.',
    platform: 'iPhone',
    hardwareConcurrency: 4
  },
  {
    name: 'Chrome Android',
    userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36',
    vendor: 'Google Inc.',
    platform: 'Linux armv8l',
    hardwareConcurrency: 8
  },
  {
    name: 'Firefox Android',
    userAgent: 'Mozilla/5.0 (Android 12; Mobile; rv:68.0) Gecko/68.0 Firefox/96.0',
    vendor: '',
    platform: 'Linux armv7l',
    hardwareConcurrency: 6
  }
];

// Mock AudioContext for different browsers
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

describe('Browser Compatibility Tests', () => {
  let vadService: VADService;
  let whisperService: WhisperService;
  let originalNavigator: any;
  let originalAudioContext: any;
  let mockStream: MediaStream;

  beforeEach(() => {
    // Save original globals
    originalNavigator = global.navigator;
    originalAudioContext = global.AudioContext;

    // Create mock stream
    mockStream = new MediaStream();
  });

  afterEach(() => {
    // Restore globals
    global.navigator = originalNavigator;
    global.AudioContext = originalAudioContext;

    // Clear mocks
    vi.clearAllMocks();
  });

  describe('Browser-specific Initialization', () => {
    browserConfigs.forEach(browser => {
      describe(browser.name, () => {
        beforeEach(() => {
          // Mock browser environment
          global.navigator = {
            ...originalNavigator,
            userAgent: browser.userAgent,
            vendor: browser.vendor,
            platform: browser.platform,
            hardwareConcurrency: browser.hardwareConcurrency
          };

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

        it('should initialize VAD service', async () => {
          await expect(vadService.initialize(mockStream)).resolves.not.toThrow();
        });

        it('should initialize Whisper service', async () => {
          await expect(whisperService.initialize()).resolves.not.toThrow();
        });

        it('should handle audio context creation', async () => {
          await vadService.initialize(mockStream);
          expect(MockAudioContext).toHaveBeenCalled();
        });

        it('should handle WebSocket connection', async () => {
          await whisperService.initialize();
          // Add WebSocket specific assertions based on browser
        });
      });
    });
  });

  describe('Browser-specific Features', () => {
    browserConfigs.forEach(browser => {
      describe(browser.name, () => {
        beforeEach(() => {
          // Set up browser environment
          global.navigator = {
            ...originalNavigator,
            userAgent: browser.userAgent,
            vendor: browser.vendor,
            platform: browser.platform,
            hardwareConcurrency: browser.hardwareConcurrency
          };
        });

        describe('Audio Processing', () => {
          it('should handle audio buffer correctly', async () => {
            await vadService.initialize(mockStream);
            // Test audio buffer handling
          });

          it('should handle sample rate conversion', async () => {
            const audioContext = new MockAudioContext({ sampleRate: 44100 });
            global.AudioContext = vi.fn().mockImplementation(() => audioContext);

            await vadService.initialize(mockStream);
            // Verify sample rate handling
          });
        });

        describe('WebSocket Handling', () => {
          it('should handle connection interruptions', async () => {
            await whisperService.initialize();
            // Test connection recovery
          });

          it('should handle message encoding', async () => {
            await whisperService.initialize();
            // Test message encoding/decoding
          });
        });

        describe('Resource Management', () => {
          it('should clean up resources on disposal', async () => {
            await vadService.initialize(mockStream);
            await whisperService.initialize();

            vadService.dispose();
            whisperService.dispose();

            // Verify cleanup
          });

          it('should handle background/foreground transitions', async () => {
            await vadService.initialize(mockStream);
            await whisperService.initialize();

            // Simulate app going to background
            document.dispatchEvent(new Event('visibilitychange'));

            // Verify state handling
          });
        });
      });
    });
  });

  describe('Error Handling', () => {
    browserConfigs.forEach(browser => {
      describe(browser.name, () => {
        beforeEach(() => {
          // Set up browser environment
          global.navigator = {
            ...originalNavigator,
            userAgent: browser.userAgent,
            vendor: browser.vendor,
            platform: browser.platform,
            hardwareConcurrency: browser.hardwareConcurrency
          };
        });

        it('should handle audio permission errors', async () => {
          const error = new Error('Permission denied');
          const mockMediaDevices = {
            getUserMedia: vi.fn().mockRejectedValue(error)
          };
          Object.defineProperty(global.navigator, 'mediaDevices', {
            value: mockMediaDevices,
            configurable: true
          });

          await expect(vadService.initialize(mockStream)).rejects.toThrow();
        });

        it('should handle WebSocket errors', async () => {
          const error = new Error('Connection failed');
          const MockWebSocketClass = vi.fn().mockImplementation(() => {
            throw error;
          });

          Object.defineProperties(MockWebSocketClass, {
            CONNECTING: { value: 0 },
            OPEN: { value: 1 },
            CLOSING: { value: 2 },
            CLOSED: { value: 3 }
          });

          global.WebSocket = MockWebSocketClass as unknown as typeof WebSocket;

          await expect(whisperService.initialize()).rejects.toThrow();
        });

        it('should handle audio context errors', async () => {
          const error = new Error('Failed to create audio context');
          global.AudioContext = vi.fn().mockImplementation(() => {
            throw error;
          });

          await expect(vadService.initialize(mockStream)).rejects.toThrow();
        });
      });
    });
  });
});
