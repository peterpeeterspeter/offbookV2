import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PerformanceAnalyzer } from '@/services/performance-analyzer'
import type { PerformanceMetrics, StreamingMetrics } from '@/types/streaming'
import type { ServiceMetrics } from '@/types/metrics'

describe('PerformanceAnalyzer - Memory Leak Detection', () => {
  let analyzer: PerformanceAnalyzer
  let initialMemory: number

  beforeEach(() => {
    analyzer = new PerformanceAnalyzer()
    initialMemory = performance.memory?.usedJSHeapSize || 0
  })

  it('should detect memory leaks in long-running sessions', async () => {
    const largeData = new Array(1000000).fill('test data')
    const iterations = 100

    const memorySnapshots: number[] = []

    for (let i = 0; i < iterations; i++) {
      await analyzer.processData(largeData)
      memorySnapshots.push(performance.memory?.usedJSHeapSize || 0)
    }

    // Check for memory growth pattern
    const memoryGrowth = memorySnapshots.map((snapshot, i) =>
      i > 0 ? snapshot - memorySnapshots[i - 1] : 0
    )

    const hasAbnormalGrowth = memoryGrowth.slice(10).some(growth =>
      growth > memoryGrowth[0] * 2
    )

    expect(hasAbnormalGrowth).toBe(false)
  })

  it('should properly clean up resources', async () => {
    await analyzer.processLargeDataSet(new Array(1000000))
    await analyzer.cleanup()

    const finalMemory = performance.memory?.usedJSHeapSize || 0
    const memoryDiff = Math.abs(finalMemory - initialMemory)

    expect(memoryDiff).toBeLessThan(1000000) // Less than 1MB difference
  })
})

describe('PerformanceAnalyzer - Battery Impact', () => {
  let analyzer: PerformanceAnalyzer

  beforeEach(() => {
    analyzer = new PerformanceAnalyzer()
  })

  it('should monitor battery consumption', async () => {
    const batteryManager = await navigator.getBattery()
    const initialLevel = batteryManager.level

    await analyzer.runIntensiveOperation()

    const finalLevel = batteryManager.level
    const batteryImpact = initialLevel - finalLevel

    expect(batteryImpact).toBeLessThan(0.01) // Less than 1% battery drain
  })

  it('should adjust performance based on battery status', async () => {
    const batteryManager = await navigator.getBattery()
    const metrics = await analyzer.getPerformanceMetrics()

    expect(metrics.adaptiveBufferSize).toBe(
      batteryManager.level < 0.2 ? 'low' : 'normal'
    )
  })
})

describe('PerformanceAnalyzer - Real-time Monitoring', () => {
  let analyzer: PerformanceAnalyzer
  const mockMetrics: StreamingMetrics = {
    bufferUtilization: 0.75,
    streamLatency: 150,
    dropoutCount: 0,
    recoveryTime: 0,
    activeStreams: 1,
    processingTime: 50,
    networkLatency: 100,
    adaptiveBufferSize: 1024,
    voiceChangeLatency: 200,
    reconnectionCount: 0,
    partialDataSize: 512
  }

  beforeEach(() => {
    analyzer = new PerformanceAnalyzer()
  })

  it('should track real-time metrics', async () => {
    const metrics = await analyzer.trackStreamingMetrics(mockMetrics)

    expect(metrics.streamLatency).toBeLessThan(200)
    expect(metrics.processingTime).toBeLessThan(100)
    expect(metrics.bufferUtilization).toBeLessThan(0.8)
  })

  it('should detect performance degradation', async () => {
    const degradedMetrics = { ...mockMetrics, streamLatency: 500 }
    const alert = await analyzer.checkPerformanceThresholds(degradedMetrics)

    expect(alert).toEqual({
      type: 'warning',
      metric: 'streamLatency',
      value: 500,
      threshold: 200
    })
  })
})

describe('PerformanceAnalyzer - Resource Usage', () => {
  let analyzer: PerformanceAnalyzer

  beforeEach(() => {
    analyzer = new PerformanceAnalyzer()
  })

  it('should track CPU usage', async () => {
    const usage = await analyzer.trackCPUUsage()
    expect(usage.percentage).toBeLessThan(80)
  })

  it('should monitor memory allocation', async () => {
    const memoryStats = await analyzer.getMemoryStats()
    expect(memoryStats.heapUsed).toBeLessThan(memoryStats.heapTotal * 0.9)
  })

  it('should track network bandwidth', async () => {
    const networkStats = await analyzer.getNetworkStats()
    expect(networkStats.bandwidth).toBeGreaterThan(0)
    expect(networkStats.latency).toBeLessThan(200)
  })

  it('should monitor WebRTC stats', async () => {
    const rtcStats = await analyzer.getRTCStats()
    expect(rtcStats.packetsLost).toBeLessThan(rtcStats.packetsTotal * 0.01)
  })
})

describe('PerformanceAnalyzer - Integration', () => {
  let analyzer: PerformanceAnalyzer

  beforeEach(() => {
    analyzer = new PerformanceAnalyzer()
  })

  it('should provide comprehensive performance report', async () => {
    const report = await analyzer.generatePerformanceReport()

    expect(report).toMatchObject({
      memory: expect.any(Object),
      battery: expect.any(Object),
      streaming: expect.any(Object),
      resources: expect.any(Object)
    })
  })

  it('should handle concurrent monitoring requests', async () => {
    const promises = Array(10).fill(null).map(() =>
      analyzer.getPerformanceMetrics()
    )

    const results = await Promise.all(promises)
    expect(results).toHaveLength(10)
    results.forEach(metrics => {
      expect(metrics).toBeDefined()
    })
  })
})
