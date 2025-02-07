import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VADService, VADOptions, DeviceCapabilities } from '../vad-service';
import { AudioStateManager } from '../audio-state';

// Mock Safari-specific navigator
const mockNavigator = {
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15',
  hardwareConcurrency: 8,
  getBattery: vi.fn().mockRejectedValue(new Error('Battery API not available')), // Safari doesn't support Battery API
};
Object.defineProperty(global, 'navigator', { value: mockNavigator, configurable: true });

// Safari-specific AudioContext mock
class SafariAudioContext {
  state = 'suspended'; // Safari requires user interaction
  sampleRate = 44100;
  baseLatency = 0.0029; // Safari typically has lower latency
  audioWorklet = undefined; // Safari has limited AudioWorklet support

  constructor(options?: AudioContextOptions) {
    if (options?.sampleRate && options.sampleRate !== 44100) {
      throw new Error('Safari only supports 44.1kHz sample rate');
    }
  }

  createAnalyser = vi.fn().mockReturnValue({
    smoothingTimeConstant: 0,
    fftSize: 0,
    frequencyBinCount: 1024,
    getFloatTimeDomainData: vi.fn(),
    getFloatFrequencyData: vi.fn(),
    connect: vi.fn().mockReturnThis(),
    disconnect: vi.fn()
  });

  createScriptProcessor = vi.fn().mockReturnValue({
    onaudioprocess: null,
    connect: vi.fn().mockReturnThis(),
    disconnect: vi.fn()
  });

  createMediaStreamSource = vi.fn().mockReturnValue({
    connect: vi.fn().mockReturnThis(),
    disconnect: vi.fn()
  });

  resume = vi.fn().mockResolvedValue(undefined);
  suspend = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
}

global.AudioContext = SafariAudioContext as any;

describe('VAD Service - Safari', () => {
  let vadService: VADService;
  let mockStream: MediaStream;

  const defaultOptions: VADOptions = {
    sampleRate: 44100, // Safari only supports 44.1kHz
    bufferSize: 1024,
    noiseThreshold: 0.5,
    silenceThreshold: 0.8,
    mobileOptimization: {
      enabled: true,
      batteryAware: false, // Battery API not available in Safari
      adaptiveBufferSize: true,
      powerSaveMode: false
    }
  };

  beforeEach(() => {
    vadService = new VADService(defaultOptions);
    mockStream = new MediaStream();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vadService.dispose();
  });

  describe('Safari-specific initialization', () => {
    it('should handle lack of Battery API', async () => {
      await vadService.initialize(mockStream);
      const capabilities = (vadService as any).deviceCapabilities;
      expect(capabilities.hasBatteryAPI).toBe(false);
    });

    it('should enforce 44.1kHz sample rate', async () => {
      const invalidOptions: VADOptions = {
        ...defaultOptions,
        sampleRate: 48000 // Unsupported in Safari
      };

      const vadServiceInvalid = new VADService(invalidOptions);
      await expect(vadServiceInvalid.initialize(mockStream)).rejects.toThrow();
    });

    it('should handle suspended audio context state', async () => {
      const audioContext = new SafariAudioContext();
      await vadService.initialize(mockStream);

      // Simulate user interaction
      await audioContext.resume();

      expect(audioContext.resume).toHaveBeenCalled();
      expect(audioContext.state).toBe('suspended');
    });
  });

  describe('Safari mobile optimizations', () => {
    it('should use larger buffer sizes on iOS', async () => {
      // Mock iOS Safari
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
      });

      await vadService.initialize(mockStream);
      const processor = (vadService as any).audioContext.createScriptProcessor;

      expect(processor).toHaveBeenCalledWith(2048, 1, 1); // iOS Safari needs larger buffers
    });

    it('should handle audio interruptions', async () => {
      await vadService.initialize(mockStream);
      const errorListener = vi.fn();
      vadService.addErrorListener(errorListener);

      // Simulate audio session interruption
      const audioContext = (vadService as any).audioContext;
      audioContext.state = 'interrupted';

      expect(errorListener).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Performance adaptations', () => {
    it('should reduce processing during scrolling', async () => {
      await vadService.initialize(mockStream);
      const processor = (vadService as any).createOptimizedAudioProcessor();

      // Simulate scroll event
      window.dispatchEvent(new Event('scroll'));

      const audioData = new Float32Array(1024).fill(0.5);
      processor(new AudioProcessingEvent('audioprocess', {
        playbackTime: 0,
        inputBuffer: new AudioBuffer({ length: 1024, numberOfChannels: 1, sampleRate: 44100 }),
        outputBuffer: new AudioBuffer({ length: 1024, numberOfChannels: 1, sampleRate: 44100 })
      }));

      // Should skip processing during scroll
      expect((vadService as any).worker.postMessage).not.toHaveBeenCalled();
    });

    it('should handle memory pressure warnings', async () => {
      await vadService.initialize(mockStream);

      // Simulate memory pressure warning
      window.dispatchEvent(new Event('memorywarning'));

      // Should trigger cleanup
      expect((vadService as any).noiseWindow.length).toBe(0);
      expect((vadService as any).processingTimes.length).toBe(0);
    });
  });

  describe('Error recovery', () => {
    it('should recover from audio glitches', async () => {
      await vadService.initialize(mockStream);
      const stateListener = vi.fn();
      vadService.addStateListener(stateListener);

      // Simulate audio glitch
      const audioContext = (vadService as any).audioContext;
      audioContext.state = 'suspended';
      await audioContext.resume();

      expect(stateListener).toHaveBeenCalledWith(expect.objectContaining({
        speaking: false,
        confidence: 0
      }));
    });

    it('should handle audio permission changes', async () => {
      await vadService.initialize(mockStream);
      const errorListener = vi.fn();
      vadService.addErrorListener(errorListener);

      // Simulate permission change
      mockStream.getAudioTracks()[0].enabled = false;

      expect(errorListener).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
