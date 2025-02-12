import { describe, it, expect, beforeEach } from 'vitest'
import { BrowserCompatibilityTester } from '@/services/mobile/browser-compatibility'
import { AudioService } from '@/services/audio-service'
import { PerformanceAnalyzer } from '@/services/performance-analyzer'
import type { BrowserFeatures, BrowserConfig } from '@/types/mobile'

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

  beforeEach(() => {
    tester = new BrowserCompatibilityTester()
    audioService = AudioService
    analyzer = new PerformanceAnalyzer()
  })

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
          const audioSupport = await tester.checkAudioSupport()
          expect(audioSupport.webAudio).toBe(true)
          expect(audioSupport.mediaRecorder).toBe(true)
          expect(audioSupport.audioWorklet).toBe(true)
          expect(audioSupport.audioCodecs).toContain('audio/webm')
        })

        it('should handle audio context creation', async () => {
          await audioService.setup()
          const state = audioService.getState()
          expect(state.context.state).toBe('running')
          expect(state.context.sampleRate).toBeGreaterThan(0)
        })

        it('should support required audio processing features', async () => {
          const features = await tester.detectFeatures()
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
          await audioService.setup()
          const state = audioService.getState()
          expect(state.error).toBeNull()
        })

        it('should handle audio worklet paths', async () => {
          const features = await tester.detectFeatures()
          expect(features.audio.audioWorklet).toBe(true)
        })

        it('should handle autoplay policies', async () => {
          await audioService.setup()
          const state = audioService.getState()
          expect(state.context.state).toBe('running')
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
          const operations = Array(concurrentOperations).fill(null).map(async () => {
            await audioService.setup()
            await audioService.startRecording()
            await new Promise(resolve => setTimeout(resolve, 1000))
            return audioService.stopRecording()
          })

          const results = await Promise.all(operations)
          expect(results.every(r => r.accuracy > 0.8)).toBe(true)
        })

        it('should meet audio processing performance targets', async () => {
          const perfMetrics = await analyzer.measureAudioProcessing()
          expect(perfMetrics.processingTime).toBeLessThan(50) // 50ms max
          expect(perfMetrics.bufferUnderruns).toBe(0)
          expect(perfMetrics.latency).toBeLessThan(100) // 100ms max
        })

        it('should maintain stable memory usage during long sessions', async () => {
          const initialMemory = await analyzer.getMemoryStats()

          // Simulate long session
          for (let i = 0; i < 10; i++) {
            await audioService.setup()
            await audioService.startRecording()
            await new Promise(resolve => setTimeout(resolve, 1000))
            await audioService.stopRecording()
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
          await audioService.setup()
          const state = audioService.getState()
          await state.context.suspend()
          expect(state.context.state).toBe('suspended')
          await state.context.resume()
          expect(state.context.state).toBe('running')
        })

        it('should handle audio buffer errors', async () => {
          const invalidBuffer = new ArrayBuffer(0)
          await expect(
            audioService.processAudioData(invalidBuffer)
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
              await audioService.setup()
              await audioService.startRecording()

              // Simulate app going to background
              document.dispatchEvent(new Event('visibilitychange'))
              await new Promise(resolve => setTimeout(resolve, 1000))

              // Simulate app coming to foreground
              document.dispatchEvent(new Event('visibilitychange'))
              await new Promise(resolve => setTimeout(resolve, 1000))

              await audioService.stopRecording()
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

          it('should recover from audio session interruptions', async () => {
            await audioService.setup()
            await audioService.startRecording()

            // Simulate phone call interruption
            const audioContext = audioService.getState().context
            await audioContext.suspend()

            // Simulate interruption end
            await audioContext.resume()

            const state = audioService.getState()
            expect(state.error).toBeNull()
            expect(state.context.state).toBe('running')
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
        })
      }
    })
  })
})
