import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BrowserCompatibilityTester } from '@/utils/browser-compatibility';
import { AudioServiceImpl } from '@/services/audio-service';
import { PerformanceAnalyzer } from '@/utils/performance';
import type { BrowserConfig } from '@/types/mobile';

declare global {
  interface Window {
    AudioContext: typeof AudioContext;
    webkitAudioContext: typeof AudioContext;
    MediaSource: typeof MediaSource;
  }
}

describe('Browser Compatibility Tests', () => {
  let tester: BrowserCompatibilityTester;
  let analyzer: PerformanceAnalyzer;
  let audioService: AudioServiceImpl;
  let mockAudioContext: AudioContext;
  let mockMediaDevices: MediaDevices;

const browserConfigs: BrowserConfig[] = [
  {
    name: 'Chrome',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    vendor: 'Google Inc.',
    platform: 'Win32',
    hardwareConcurrency: 8
  },
  {
    name: 'Firefox',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
    vendor: '',
    platform: 'Win32',
    hardwareConcurrency: 8
  },
  {
    name: 'Safari',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    vendor: 'Apple Computer, Inc.',
    platform: 'MacIntel',
    hardwareConcurrency: 8
    }
  ];

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock AudioContext
    const createScriptProcessor = vi.fn().mockReturnValue({}) as unknown as AudioContext['createScriptProcessor'];
    mockAudioContext = {
      audioWorklet: {},
      createScriptProcessor,
      sampleRate: 48000,
      prototype: {
        audioWorklet: {}
      }
    } as unknown as AudioContext;

    // Mock MediaDevices
    const getUserMedia = vi.fn().mockResolvedValue({
      getTracks: () => [{
        kind: 'audio',
        enabled: true
      }]
    }) as unknown as MediaDevices['getUserMedia'];

    mockMediaDevices = {
      getUserMedia
    } as unknown as MediaDevices;

    // Mock global browser APIs
    (window as any).AudioContext = mockAudioContext;
    (window as any).webkitAudioContext = mockAudioContext;
    Object.defineProperty(navigator, 'mediaDevices', {
      value: mockMediaDevices,
            configurable: true
    });

    // Mock MediaSource
    (window as any).MediaSource = {
      isTypeSupported: vi.fn().mockImplementation((type: string) => {
        if (type.includes('webm')) return true;
        if (type.includes('mp4')) return true;
        return false;
      })
    };

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
            value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn()
      },
      writable: true
    });

    // Create new instance for each test
    tester = new BrowserCompatibilityTester();
    analyzer = new PerformanceAnalyzer();
    audioService = AudioServiceImpl.getInstance();
  });

  afterEach(async () => {
    await audioService.cleanup();
    vi.restoreAllMocks();
  });

  describe('Feature Detection', () => {
    browserConfigs.forEach(browser => {
      describe(`${browser.name}`, () => {
        beforeEach(() => {
          Object.defineProperty(window.navigator, 'userAgent', { value: browser.userAgent, configurable: true });
          Object.defineProperty(window.navigator, 'vendor', { value: browser.vendor, configurable: true });
          Object.defineProperty(window.navigator, 'platform', { value: browser.platform, configurable: true });
        });

        it('should detect basic features', async () => {
          const features = await tester.detectFeatures();
          expect(features.webrtc.getUserMedia).toBeDefined();
          expect(features.storage.localStorage).toBeDefined();
          expect(features.media.videoCodecs).toBeDefined();
          expect(features.codec.webm).toBeDefined();
        });

        it('should detect audio capabilities', async () => {
          const features = await tester.detectFeatures();
          expect(features.audio.webAudio).toBeDefined();
          expect(features.audio.mediaRecorder).toBeDefined();
          expect(features.audio.audioWorklet).toBeDefined();
          expect(features.audio.codecSupport.webm).toBeDefined();
        });

        it('should check audio worklet support', async () => {
          const support = await tester.checkAudioWorkletSupport();
          expect(support.registration).toBeDefined();
          expect(support.moduleLoading).toBeDefined();
        });

        it('should check web audio support', async () => {
          const support = await tester.checkWebAudioSupport();
          expect(support.audioContext).toBeDefined();
          expect(support.audioWorklet).toBeDefined();
          expect(support.mediaSession).toBeDefined();
        });

        it('should check audio buffer capabilities', async () => {
          const support = await tester.checkAudioBufferSupport();
          expect(support.processing).toBeDefined();
          expect(support.transferable).toBeDefined();
        });
      });
    });

        it('should detect WebRTC support', async () => {
      const support = await tester.checkWebRTCSupport();
      expect(support).toEqual({
        getUserMedia: true,
        peerConnection: false
      });
    });

    it('should detect storage support', async () => {
      const support = await tester.checkStorageSupport();
      expect(support).toEqual({
        localStorage: true,
        indexedDB: true,
        cacheAPI: false,
        sessionStorage: true,
        quota: 0
      });
    });

    it('should detect media features', async () => {
      const support = await tester.checkMediaFeatures();
      expect(support.videoCodecs).toEqual(['vp8', 'vp9', 'avc1', 'av1']);
      expect(support.imageFormats).toContain('webp');
      expect(support.mediaCapabilities).toBeDefined();
    });

    it('should detect codec support', async () => {
      const support = await tester.checkCodecSupport();
      expect(support).toEqual({
        webm: true,
        mp4: true,
        opus: true
      });
    });
  });

  describe('Audio Support', () => {
    it('should detect Web Audio support', async () => {
      const support = await tester.checkWebAudioSupport();
      expect(support).toEqual({
        audioContext: true,
        audioWorklet: true,
        mediaSession: false
      });
    });

    it('should detect AudioWorklet support', async () => {
      const support = await tester.checkAudioWorkletSupport();
      expect(support).toEqual({
        registration: true,
        moduleLoading: false
      });
    });

    it('should detect audio buffer capabilities', async () => {
      const support = await tester.checkAudioBufferSupport();
      expect(support).toEqual({
        processing: true,
        transferable: false
      });
    });

    it('should handle missing audio features gracefully', async () => {
      // Remove AudioContext
      (window as any).AudioContext = undefined;
      (window as any).webkitAudioContext = undefined;

      const support = await tester.checkAudioSupport();
      expect(support).toEqual({
        webAudio: false,
        mediaRecorder: false,
        audioWorklet: false,
        mediaDevices: true,
        sampleRate: 48000,
        channelCount: 2,
        codecSupport: {
          opus: true,
          aac: true,
          mp3: true
        }
      });
    });
  });

  describe('Comprehensive Feature Detection', () => {
    it('should detect all browser features', async () => {
      const features = await tester.detectFeatures();
      expect(features).toMatchObject({
        webrtc: {
          getUserMedia: true,
          peerConnection: false
        },
        storage: {
          localStorage: true,
          indexedDB: true
        },
        audio: {
          webAudio: true,
          mediaRecorder: false,
          audioWorklet: true
        }
      });
    });

    it('should handle errors during feature detection', async () => {
      // Simulate API errors
      const getUserMedia = vi.fn().mockRejectedValue(new Error('Permission denied')) as unknown as MediaDevices['getUserMedia'];
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia },
        configurable: true
      });

      const features = await tester.detectFeatures();
      expect(features.webrtc.getUserMedia).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing browser APIs gracefully', async () => {
      // Remove all browser APIs
      (window as any).AudioContext = undefined;
      (window as any).webkitAudioContext = undefined;
      (window as any).MediaRecorder = undefined;
      Object.defineProperty(navigator, 'mediaDevices', {
        value: undefined,
                configurable: true
      });

      const features = await tester.detectFeatures();
      expect(features).toMatchObject({
        webrtc: {
          getUserMedia: false,
          peerConnection: false
        },
        audio: {
          webAudio: false,
          mediaRecorder: false,
          audioWorklet: false
        }
      });
    });

    it('should handle API errors during detection', async () => {
      const getUserMedia = vi.fn().mockRejectedValue(new Error('Permission denied')) as unknown as MediaDevices['getUserMedia'];
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia },
        configurable: true
      });

      const support = await tester.checkWebRTCSupport();
      expect(support.getUserMedia).toBe(true); // Still true because API exists
    });
  });

  describe('Storage Quota', () => {
    it('should handle storage quota detection', async () => {
      const quota = await tester.checkStorageQuota();
      expect(quota).toEqual({
        available: 0
      });
    });

    it('should provide fallback storage information', async () => {
      const fallback = await tester.getFallbackStorage();
      expect(fallback).toEqual({
        type: 'temporary',
        available: 52428800 // 50MB
      });
    });
  });

  describe('Performance', () => {
    it('should track memory usage', async () => {
      const initialStats = await analyzer.getMemoryStats();
      expect(initialStats.heapUsed).toBeGreaterThanOrEqual(0);
      expect(initialStats.heapTotal).toBeGreaterThanOrEqual(0);
    });

    it('should measure audio processing metrics', async () => {
      const metrics = await analyzer.measureAudioProcessing();
      expect(metrics.processingTime).toBeGreaterThanOrEqual(0);
      expect(metrics.bufferUnderruns).toBeGreaterThanOrEqual(0);
      expect(metrics.latency).toBeGreaterThanOrEqual(0);
    });
  });
});

