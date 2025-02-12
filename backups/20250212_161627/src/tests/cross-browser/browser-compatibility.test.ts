/// <reference types="vitest" />
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { BrowserCompatibilityTester } from '@/services/mobile/browser-compatibility'
import { AudioService } from '../../services/audio-service'
import { PerformanceAnalyzer } from '@/services/performance-analyzer'
import type { BrowserFeatures, BrowserConfig, AudioSupport, MediaSupport } from '@/types/mobile'
import type { AudioServiceStateData } from '@/types/audio'

// Helper function to generate unique session IDs
const generateSessionId = () => `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Track active sessions for cleanup
const activeSessions = new Set<string>();

// Helper to cleanup sessions
const cleanupSessions = async () => {
  for (const sessionId of activeSessions) {
    try {
      await AudioService.stopRecording(sessionId);
    } catch (error) {
      console.warn(`Failed to cleanup session ${sessionId}:`, error);
    }
  }
  activeSessions.clear();
};

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
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    vendor: 'Apple Computer, Inc.',
    platform: 'MacIntel',
    hardwareConcurrency: 8
  },
  {
    name: 'Safari iOS',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    vendor: 'Apple Computer, Inc.',
    platform: 'iPhone',
    hardwareConcurrency: 6
  },
  {
    name: 'Chrome Android',
    userAgent: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    vendor: 'Google Inc.',
    platform: 'Linux armv8l',
    hardwareConcurrency: 8
  }
];

describe('Cross-Browser Compatibility Suite', () => {
  let tester: BrowserCompatibilityTester
  let audioService: typeof AudioService
  let analyzer: PerformanceAnalyzer
  const originalNavigator = global.navigator
  const baseSessionId = 'test-session-123'
  const userRole = 'test-user'

  beforeEach(async () => {
    tester = new BrowserCompatibilityTester()
    audioService = AudioService
    analyzer = new PerformanceAnalyzer()
    await audioService.setup()
    await audioService.initializeTTS(baseSessionId, userRole)
  })

  afterEach(async () => {
    await cleanupSessions()
    await audioService.cleanup()
  })

  // Helper to start recording with session tracking
  const startRecordingWithTracking = async (sessionId: string) => {
    await audioService.startRecording(sessionId)
  }

  // Helper to stop recording with session tracking
  const stopRecordingWithTracking = async (sessionId: string) => {
    return audioService.stopRecording(sessionId)
  }

  describe('Core Audio Features', () => {
    browserConfigs.forEach(browser => {
      describe(browser.name, () => {
        beforeEach(() => {
          Object.defineProperty(global, 'navigator', {
            value: {
              ...originalNavigator,
              userAgent: browser.userAgent,
              vendor: browser.vendor,
              platform: browser.platform,
              hardwareConcurrency: browser.hardwareConcurrency
            },
            configurable: true
          })
        })

        it('should support required audio APIs', async () => {
          const audioSupport = await tester.checkAudioSupport() as AudioSupport
          expect(audioSupport.webAudio).toBe(true)
          expect(audioSupport.mediaRecorder).toBe(true)
          expect(audioSupport.audioWorklet).toBe(true)
          expect(audioSupport.audioCodecs).toContain('audio/webm')
        })

        it('should handle audio context creation', async () => {
          const state = audioService.getState() as AudioServiceStateData
          expect(state.context.isContextRunning).toBe(true)
          expect(state.context.sampleRate).toBeGreaterThan(0)
        })

        it('should support required audio processing features', async () => {
          const features = await tester.detectFeatures() as BrowserFeatures
          expect(features.audio.webAudio).toBe(true)
          expect(features.audio.audioWorklet).toBe(true)
          expect(features.audio.mediaRecorder).toBe(true)
        })
      })
    })
  })

  describe('Browser-Specific Edge Cases', () => {
    browserConfigs.forEach(browser => {
      describe(browser.name, () => {
        beforeEach(() => {
          Object.defineProperty(global, 'navigator', {
            value: {
              ...originalNavigator,
              userAgent: browser.userAgent,
              vendor: browser.vendor,
              platform: browser.platform
            },
            configurable: true
          })
        })

        it('should handle audio initialization correctly', async () => {
          const state = audioService.getState() as AudioServiceStateData
          expect(state.error).toBeNull()
        })

        it('should handle audio worklet paths', async () => {
          const features = await tester.detectFeatures() as BrowserFeatures
          expect(features.audio.audioWorklet).toBe(true)
        })

        it('should handle autoplay policies', async () => {
          const state = audioService.getState() as AudioServiceStateData
          expect(state.context.isContextRunning).toBe(true)
        })

        it('should handle Safari audio session management', async () => {
          if (browser.name.includes('Safari')) {
            const webAudioSupport = await tester.checkWebAudioSupport()
            expect(webAudioSupport.audioContext).toBe(true)
            expect(webAudioSupport.audioWorklet).toBe(true)
            expect(webAudioSupport.mediaSession).toBe(true)
          }
        })

        it('should handle Firefox audio worklet registration', async () => {
          if (browser.name === 'Firefox') {
            const workletSupport = await tester.checkAudioWorkletSupport()
            expect(workletSupport.registration).toBe(true)
            expect(workletSupport.moduleLoading).toBe(true)
          }
        })

        it('should handle Chrome audio buffer processing', async () => {
          if (browser.name.includes('Chrome')) {
            const bufferSupport = await tester.checkAudioBufferSupport()
            expect(bufferSupport.processing).toBe(true)
            expect(bufferSupport.transferable).toBe(true)
          }
        })

        it('should handle mobile audio interruptions', async () => {
          if (browser.platform === 'iPhone' || browser.platform === 'Linux armv8l') {
            const interruptionHandling = await tester.checkInterruptionHandling()
            expect(interruptionHandling.resumeOnFocus).toBe(true)
            expect(interruptionHandling.handleBackgroundState).toBe(true)
          }
        })
      })
    })
  })

  describe('Performance Across Browsers', () => {
    browserConfigs.forEach(browser => {
      describe(browser.name, () => {
        beforeEach(() => {
          Object.defineProperty(global, 'navigator', {
            value: {
              ...originalNavigator,
              userAgent: browser.userAgent,
              vendor: browser.vendor,
              platform: browser.platform
            },
            configurable: true
          })
        })

        it('should maintain performance metrics within thresholds', async () => {
          const report = await analyzer.generatePerformanceReport()
          const memoryStats = await analyzer.getMemoryStats()

          expect(report.streaming.streamLatency).toBeLessThan(200)
          expect(report.streaming.processingTime).toBeLessThan(100)
          expect(memoryStats.heapUsed).toBeLessThan(512 * 1024 * 1024) // 512MB
        })

        it('should handle concurrent operations efficiently', async () => {
          const concurrentOperations = 5
          const operations = Array(concurrentOperations).fill(null).map(async (_, index) => {
            const sessionId = generateSessionId()
            await audioService.setup()
            await startRecordingWithTracking(sessionId)
            await new Promise(resolve => setTimeout(resolve, 1000))
            return stopRecordingWithTracking(sessionId)
          })

          const results = await Promise.all(operations)
          expect(results.every(r => r.duration > 0)).toBe(true)
        })

        it('should meet audio processing performance targets', async () => {
          const perfMetrics = await analyzer.measureAudioProcessing()
          expect(perfMetrics.processingTime).toBeLessThan(50) // 50ms max
          expect(perfMetrics.bufferUnderruns).toBe(0)
          expect(perfMetrics.latency).toBeLessThan(100) // 100ms max
        })

        it('should maintain stable memory usage during long sessions', async () => {
          const initialMemory = await analyzer.getMemoryStats()
          const sessionIds = Array(10).fill(null).map((_, i) => generateSessionId())

          for (let i = 0; i < 10; i++) {
            await audioService.setup()
            await startRecordingWithTracking(sessionIds[i])
            await new Promise(resolve => setTimeout(resolve, 1000))
            await stopRecordingWithTracking(sessionIds[i])
          }

          const finalMemory = await analyzer.getMemoryStats()
          const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed
          expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024) // Max 50MB growth
        })

        it('should handle network conditions gracefully', async () => {
          const networkMetrics = await analyzer.measureNetworkResilience({
            latency: 200,
            jitter: 50,
            packetLoss: 0.1
          })

          expect(networkMetrics.reconnections).toBe(0)
          expect(networkMetrics.dataLoss).toBeLessThan(0.01)
          expect(networkMetrics.adaptiveBuffering).toBe(true)
        })
      })
    })
  })

  describe('Feature Detection and Fallbacks', () => {
    browserConfigs.forEach(browser => {
      describe(browser.name, () => {
        beforeEach(() => {
          Object.defineProperty(global, 'navigator', {
            value: {
              ...originalNavigator,
              userAgent: browser.userAgent,
              vendor: browser.vendor,
              platform: browser.platform
            },
            configurable: true
          })
        })

        it('should detect WebRTC support', async () => {
          const webRTCSupport = await tester.checkWebRTCSupport()
          expect(webRTCSupport.getUserMedia).toBe(true)
          expect(webRTCSupport.peerConnection).toBe(true)
        })

        it('should verify storage APIs', async () => {
          const storageSupport = await tester.checkStorageSupport()
          expect(storageSupport.localStorage).toBe(true)
          expect(storageSupport.indexedDB).toBe(true)
        })

        it('should check media features', async () => {
          const mediaSupport = await tester.checkMediaFeatures()
          expect(mediaSupport.videoCodecs.length).toBeGreaterThan(0)
          expect(mediaSupport.imageFormats).toContain('webp')
        })

        it('should handle codec fallbacks', async () => {
          const codecSupport = await tester.checkCodecSupport()
          if (!codecSupport.webm) {
            const fallbackCodec = await tester.getFallbackCodec()
            expect(fallbackCodec).toBeDefined()
            expect(await tester.validateCodec(fallbackCodec)).toBe(true)
          }
        })

        it('should validate storage quotas', async () => {
          const quotaInfo = await tester.checkStorageQuota()
          expect(quotaInfo.available).toBeGreaterThan(0)
          if (quotaInfo.available < 50 * 1024 * 1024) { // Less than 50MB
            const fallbackStorage = await tester.getFallbackStorage()
            expect(fallbackStorage.type).toBeDefined()
            expect(fallbackStorage.available).toBeGreaterThan(0)
          }
        })
      })
    })
  })

  describe('Error Handling', () => {
    browserConfigs.forEach(browser => {
      describe(browser.name, () => {
        beforeEach(() => {
          Object.defineProperty(global, 'navigator', {
            value: {
              ...originalNavigator,
              userAgent: browser.userAgent,
              vendor: browser.vendor,
              platform: browser.platform
            },
            configurable: true
          })
        })

        it('should handle permission denials gracefully', async () => {
          const mockError = new Error('Permission denied')
          mockError.name = 'NotAllowedError'
          global.navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(mockError)

          await expect(audioService.setup()).rejects.toThrow('Permission denied')
        })

        it('should recover from audio context suspension', async () => {
          const state = audioService.getState()
          expect(state.state).toBe('READY')

          // Test recovery after cleanup
          await audioService.cleanup()
          await audioService.setup()
          await audioService.initializeTTS(baseSessionId, userRole)
          const newState = audioService.getState()
          expect(newState.state).toBe('READY')
        })

        it('should handle audio buffer errors', async () => {
          const invalidChunk = new Float32Array(0)
          await expect(
            audioService.processAudioChunk(baseSessionId, invalidChunk)
          ).rejects.toThrow()
        })

        it('should handle browser crashes gracefully', async () => {
          const crashHandler = await tester.simulateBrowserCrash()
          expect(crashHandler.stateRecovered).toBe(true)
          expect(crashHandler.dataLoss).toBe(false)
        })

        it('should handle memory pressure situations', async () => {
          const memoryHandler = await tester.simulateMemoryPressure()
          expect(memoryHandler.resourcesFreed).toBe(true)
          expect(memoryHandler.performanceMaintained).toBe(true)
        })

        it('should handle audio hardware changes', async () => {
          const hardwareHandler = await tester.simulateDeviceChange()
          expect(hardwareHandler.deviceReconnected).toBe(true)
          expect(hardwareHandler.streamsContinued).toBe(true)
        })

        it('should recover from audio session interruptions', async () => {
          const sessionId = generateSessionId()
          await startRecordingWithTracking(sessionId)

          // Simulate interruption by cleanup and setup
          await audioService.cleanup()
          await audioService.setup()
          await audioService.initializeTTS(sessionId, userRole)
          await startRecordingWithTracking(sessionId)

          const initialState = audioService.getState()
          expect(initialState.error).toBeNull()
          expect(initialState.state).toBe('READY')

          await stopRecordingWithTracking(sessionId)

          await audioService.cleanup()
          await audioService.setup()
          await audioService.initializeTTS(sessionId, userRole)

          const recoveredState = audioService.getState()
          expect(recoveredState.error).toBeNull()
          expect(recoveredState.state).toBe('READY')
        })

        it('should handle concurrent session errors', async () => {
          const sessionId = generateSessionId()
          await startRecordingWithTracking(sessionId)

          // Try to start recording with same session ID (should fail)
          await expect(startRecordingWithTracking(sessionId)).rejects.toThrow()

          // Cleanup
          await stopRecordingWithTracking(sessionId)
        })

        it('should handle invalid session IDs', async () => {
          await expect(audioService.startRecording('')).rejects.toThrow()
          await expect(audioService.stopRecording('invalid-session')).rejects.toThrow()
        })
      })
    })
  })

  describe('Mobile-Specific Test Cases', () => {
    browserConfigs.forEach(browser => {
      if (browser.platform === 'iPhone' || browser.platform === 'Linux armv8l') {
        describe(browser.name, () => {
          beforeEach(() => {
            Object.defineProperty(global, 'navigator', {
              value: {
                ...originalNavigator,
                userAgent: browser.userAgent,
                vendor: browser.vendor,
                platform: browser.platform
              },
              configurable: true
            })
          })

          it('should handle screen orientation changes', async () => {
            const features = await tester.detectFeatures()
            expect(features.media.mediaCapabilities).toBe(true)

            // Simulate orientation change
            Object.defineProperty(window, 'orientation', { value: 90 })
            window.dispatchEvent(new Event('orientationchange'))

            const report = await analyzer.generatePerformanceReport()
            expect(report.streaming.processingTime).toBeLessThan(100)
          })

          it('should optimize memory usage during long audio sessions', async () => {
            const initialMemory = await analyzer.getMemoryStats()

            // Simulate long audio session with background app switches
            for (let i = 0; i < 5; i++) {
              const testSessionId = generateSessionId()
              await audioService.startRecording(testSessionId)

              // Simulate app going to background
              document.dispatchEvent(new Event('visibilitychange'))
              await new Promise(resolve => setTimeout(resolve, 1000))

              // Simulate app coming to foreground
              document.dispatchEvent(new Event('visibilitychange'))
              await new Promise(resolve => setTimeout(resolve, 1000))

              await audioService.stopRecording(testSessionId)
            }

            const finalMemory = await analyzer.getMemoryStats()
            const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed
            expect(memoryGrowth).toBeLessThan(20 * 1024 * 1024) // Max 20MB growth
          })

          it('should handle aggressive battery optimization modes', async () => {
            // Simulate low battery state
            const batteryManager = {
              level: 0.15,
              charging: false,
              addEventListener: vi.fn()
            }
            Object.defineProperty(navigator, 'getBattery', {
              value: () => Promise.resolve(batteryManager)
            })

            await audioService.setup()
            const report = await analyzer.generatePerformanceReport()

            expect(report.battery.level).toBe(0.15)
            expect(report.streaming.adaptiveBufferSize).toBeGreaterThan(0)
            expect(report.streaming.processingTime).toBeLessThan(150)
          })

          it('should handle network transitions gracefully', async () => {
            const networkConditions = [
              { type: '4g', downlink: 10, rtt: 50 },
              { type: '3g', downlink: 2, rtt: 100 },
              { type: 'slow-2g', downlink: 0.5, rtt: 300 },
              { type: '4g', downlink: 10, rtt: 50 }
            ]

            for (const condition of networkConditions) {
              Object.defineProperty(navigator, 'connection', {
                value: condition,
                configurable: true
              })
              window.dispatchEvent(new Event('online'))

              const metrics = await analyzer.measureNetworkResilience({
                latency: condition.rtt,
                jitter: condition.rtt * 0.1,
                packetLoss: condition.type === 'slow-2g' ? 0.1 : 0.01
              })

              expect(metrics.reconnections).toBeLessThanOrEqual(1)
              expect(metrics.dataLoss).toBeLessThan(0.05)
              expect(metrics.adaptiveBuffering).toBe(true)
            }
          })

          it('should optimize performance under thermal throttling', async () => {
            const thermalStates = ['nominal', 'fair', 'serious', 'critical']

            for (const state of thermalStates) {
              // Simulate thermal state change
              Object.defineProperty(navigator, 'thermal', {
                value: { state },
                configurable: true
              })

              const perfMetrics = await analyzer.measureAudioProcessing()
              expect(perfMetrics.processingTime).toBeLessThan(200)
              expect(perfMetrics.bufferUnderruns).toBeLessThanOrEqual(2)

              if (state === 'critical') {
                expect(perfMetrics.latency).toBeLessThan(300)
              } else {
                expect(perfMetrics.latency).toBeLessThan(150)
              }
            }
          })

          it('should handle aggressive memory pressure situations', async () => {
            // Simulate memory pressure
            const pressureStates = ['nominal', 'moderate', 'critical']

            for (const state of pressureStates) {
              const event = new Event('memory-pressure')
              Object.defineProperty(event, 'pressure', { value: state })
              window.dispatchEvent(event)

              const memStats = await analyzer.getMemoryStats()
              const report = await analyzer.generatePerformanceReport()

              if (state === 'critical') {
                expect(report.streaming.adaptiveBufferSize).toBeLessThan(512)
                expect(memStats.heapUsed).toBeLessThan(50 * 1024 * 1024) // 50MB
              }

              expect(report.streaming.processingTime).toBeLessThan(150)
            }
          })

          it('should handle multiple recording sessions', async () => {
            const concurrentOperations = 5;
            const operations = Array(concurrentOperations).fill(null).map(async (_, index) => {
              const testSessionId = generateSessionId();
              await audioService.startRecording(testSessionId);
              await new Promise(resolve => setTimeout(resolve, 1000));
              return audioService.stopRecording(testSessionId);
            });

            const results = await Promise.all(operations);
            expect(results.every(r => r.duration > 0)).toBe(true);
          });
        })
      }
    })
  })

  describe('Audio Context Management', () => {
    it('should initialize audio context correctly', async () => {
      await audioService.setup();
      const state = audioService.getState();
      expect(state.context.isContextRunning).toBe(true);
      expect(state.context.sampleRate).toBeGreaterThan(0);
    });

    it('should handle concurrent audio operations', async () => {
      const concurrentOperations = 3;
      const operations = Array(concurrentOperations).fill(null).map(async (_, index) => {
        const sessionId = generateSessionId();
        await audioService.setup();
        await audioService.startRecording(sessionId);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return audioService.stopRecording(sessionId);
      });

      const results = await Promise.all(operations);
      expect(results.every(r => r?.duration > 0)).toBe(true);
    });

    it('should meet audio processing performance targets', async () => {
      const initialMemory = await analyzer.getMemoryStats();
      const sessionIds = Array(10).fill(null).map((_, i) => generateSessionId());

      for (let i = 0; i < 10; i++) {
        await audioService.setup();
        await audioService.startRecording(sessionIds[i]);
        await new Promise(resolve => setTimeout(resolve, 1000));
        await audioService.stopRecording(sessionIds[i]);
      }

      const finalMemory = await analyzer.getMemoryStats();
      expect(finalMemory.heapUsed - initialMemory.heapUsed).toBeLessThan(50 * 1024 * 1024); // 50MB limit
    });

    it('should handle audio session interruptions', async () => {
      const sessionId = generateSessionId();
      await audioService.setup();
      await audioService.startRecording(sessionId);

      const initialState = audioService.getState();
      expect(initialState.error).toBeNull();
      expect(initialState.context.isContextRunning).toBe(true);

      // Test audio chunk processing
      const chunk = new Float32Array(1024);
      const hasVoice = await audioService.processAudioChunk(sessionId, chunk);
      expect(typeof hasVoice).toBe('boolean');

      await audioService.stopRecording(sessionId);
    });
  });

  describe('Audio Recording', () => {
    it('should handle basic recording flow', async () => {
      const sessionId = generateSessionId()
      await audioService.startRecording(sessionId)
      const state = await audioService.getState()
      expect(state.state).toBe('RECORDING')
      await audioService.stopRecording(sessionId)
    })

    it('should handle multiple sequential recordings', async () => {
      const sessionId1 = generateSessionId()
      const sessionId2 = generateSessionId()

      await audioService.startRecording(sessionId1)
      await audioService.stopRecording(sessionId1)

      await audioService.startRecording(sessionId2)
      await audioService.stopRecording(sessionId2)
    })
  })
})
