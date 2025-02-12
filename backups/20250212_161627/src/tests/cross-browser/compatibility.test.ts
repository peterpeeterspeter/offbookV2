import { describe, it, expect, beforeEach } from 'vitest'
import { BrowserCompatibilityTester } from '@/services/mobile/browser-compatibility'
import { AudioService } from '@/services/audio-service'
import { PerformanceAnalyzer } from '@/services/performance-analyzer'
import type { BrowserFeatures } from '@/types/mobile'

describe('Cross-Browser Compatibility Suite', () => {
  let tester: BrowserCompatibilityTester
  let audioService: typeof AudioService
  let analyzer: PerformanceAnalyzer

  beforeEach(() => {
    tester = new BrowserCompatibilityTester()
    audioService = AudioService
    analyzer = new PerformanceAnalyzer()
  })

  describe('Core Audio Features', () => {
    it('should support required audio APIs', async () => {
      const audioSupport = await tester.checkAudioSupport()

      expect(audioSupport.webAudio).toBe(true)
      expect(audioSupport.mediaRecorder).toBe(true)
      expect(audioSupport.audioWorklet).toBe(true)
      expect(audioSupport.audioCodecs).toContain('audio/webm')
    })

    it('should handle audio context creation across browsers', async () => {
      await audioService.setup()
      const state = audioService.getState()

      expect(state.context.isContextRunning).toBe(true)
      expect(state.context.sampleRate).toBeGreaterThan(0)
    })

    it('should support required audio processing features', async () => {
      const features = await tester.detectFeatures()

      expect(features.audio.webAudio).toBe(true)
      expect(features.audio.audioWorklet).toBe(true)
      expect(features.audio.mediaRecorder).toBe(true)
    })
  })

  describe('Browser-Specific Edge Cases', () => {
    it('should handle Safari audio initialization', async () => {
      // Mock Safari user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15',
        configurable: true
      })

      await audioService.setup()
      const state = audioService.getState()
      expect(state.error).toBeNull()
    })

    it('should handle Firefox audio worklet paths', async () => {
      // Mock Firefox user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:100.0) Gecko/20100101 Firefox/100.0',
        configurable: true
      })

      const features = await tester.detectFeatures()
      expect(features.audio.audioWorklet).toBe(true)
    })

    it('should handle Chrome audio autoplay policies', async () => {
      // Mock Chrome user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36',
        configurable: true
      })

      await audioService.setup()
      const state = audioService.getState()
      expect(state.context.isContextRunning).toBe(true)
    })
  })

  describe('Performance Across Browsers', () => {
    it('should maintain performance metrics within thresholds', async () => {
      const report = await analyzer.generatePerformanceReport()
      const memoryStats = await analyzer.getMemoryStats()

      expect(report.streaming.streamLatency).toBeLessThan(200)
      expect(report.streaming.processingTime).toBeLessThan(100)
      expect(memoryStats.heapUsed).toBeLessThan(512 * 1024 * 1024)
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
  })

  describe('Feature Detection and Fallbacks', () => {
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
  })

  describe('Error Handling Across Browsers', () => {
    it('should handle permission errors consistently', async () => {
      // Mock permission denial
      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
        value: () => Promise.reject(new Error('Permission denied')),
        configurable: true
      })

      try {
        await audioService.setup()
      } catch (error) {
        expect(error).toHaveProperty('message', 'Failed to access microphone')
      }
    })

    it('should handle browser-specific error messages', async () => {
      const report = await tester.generateCompatibilityReport()

      expect(report.issues).toBeDefined()
      expect(Array.isArray(report.recommendations)).toBe(true)
    })
  })
})
