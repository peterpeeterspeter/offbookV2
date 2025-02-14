import { PerformanceMetrics, ResourceUsage } from '@/types/monitoring'

export const PERFORMANCE_CONFIG = {
  metrics: {
    audio: {
      processingLatency: 100, // ms
      maxBufferSize: 4096,
      minSampleRate: 22050,
      maxMemoryUsage: 100 * 1024 * 1024, // 100MB
      gcThreshold: 80 * 1024 * 1024 // 80MB
    },
    network: {
      maxWebSocketLatency: 200, // ms
      reconnectTimeout: 5000, // ms
      maxRetries: 3,
      minBandwidth: 128 // kbps
    },
    mobile: {
      batteryThreshold: 0.2, // 20%
      thermalThreshold: 'critical',
      backgroundProcessingTimeout: 30000 // 30s
    }
  },
  monitoring: {
    sampleRate: 0.1, // 10% of requests
    errorThreshold: 0.05, // 5% error rate
    alertThreshold: 0.1, // 10% error rate
    metricEndpoint: '/api/metrics',
    errorEndpoint: '/api/errors'
  },
  resourceLimits: {
    maxConcurrentConnections: 100,
    maxQueueSize: 1000,
    maxProcessingTime: 30000, // 30s
    maxMemoryUsagePercent: 90
  }
}

export function checkPerformanceMetrics(metrics: PerformanceMetrics): boolean {
  const { audio, network, memory } = metrics
  return (
    audio.latency <= PERFORMANCE_CONFIG.metrics.audio.processingLatency &&
    network.wsLatency <= PERFORMANCE_CONFIG.metrics.network.maxWebSocketLatency &&
    memory.heapUsed <= PERFORMANCE_CONFIG.metrics.audio.maxMemoryUsage
  )
}

export function checkResourceUsage(usage: ResourceUsage): boolean {
  return (
    usage.memoryPercent <= PERFORMANCE_CONFIG.resourceLimits.maxMemoryUsagePercent &&
    usage.connections <= PERFORMANCE_CONFIG.resourceLimits.maxConcurrentConnections
  )
}

export function shouldOptimizeForMobile(batteryLevel: number, thermalState: string): boolean {
  return (
    batteryLevel <= PERFORMANCE_CONFIG.metrics.mobile.batteryThreshold ||
    thermalState === PERFORMANCE_CONFIG.metrics.mobile.thermalThreshold
  )
}
