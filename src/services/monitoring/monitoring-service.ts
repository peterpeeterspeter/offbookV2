import type { ErrorReport, HealthStatus } from '@/types/monitoring'
import type { PerformanceMetrics, PipelineMetrics, CacheMetrics, StreamingMetrics } from '@/types/metrics'
import { ERROR_SEVERITY_THRESHOLDS, MONITORING_INTERVALS } from '@/config/monitoring'
import { PerformanceAnalyzer } from '@/services/performance-analyzer'

export type MonitoringServiceStatus = 'healthy' | 'degraded' | 'critical'

export class MonitoringService {
  private static instance: MonitoringService
  private healthStatus: MonitoringServiceStatus = 'healthy'
  private errorReports: ErrorReport[] = []
  private performanceMetrics: PerformanceMetrics[] = []
  private performanceAnalyzer: PerformanceAnalyzer = new PerformanceAnalyzer()
  private intervals: Record<string, NodeJS.Timeout> = {}

  private constructor() {
    this.setupErrorTracking()
    this.setupPerformanceTracking()
    this.performanceMetrics = []
  }

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService()
    }
    return MonitoringService.instance
  }

  private setupErrorTracking() {
    window.onerror = (message, source, lineno, colno, error) => {
      this.trackError({
        type: 'runtime',
        message: message.toString(),
        stack: error?.stack,
        timestamp: Date.now()
      })
    }

    window.onunhandledrejection = (event) => {
      this.trackError({
        type: 'promise',
        message: event.reason?.message || 'Unhandled Promise Rejection',
        stack: event.reason?.stack,
        timestamp: Date.now()
      })
    }
  }

  private setupPerformanceTracking() {
    this.intervals.metrics = setInterval(async () => {
      const metrics = await this.performanceAnalyzer.getPerformanceMetrics()
      this.checkPerformanceThresholds(metrics)
    }, MONITORING_INTERVALS.metrics)
  }

  private async checkPerformanceThresholds(metrics: PerformanceMetrics) {
    if (metrics.context?.memory) {
      const { heapUsed, heapTotal } = metrics.context.memory
      const memoryUsage = (heapUsed / heapTotal) * 100
      if (memoryUsage > ERROR_SEVERITY_THRESHOLDS.memory.high) {
        this.healthStatus = 'critical'
      } else if (memoryUsage > ERROR_SEVERITY_THRESHOLDS.memory.medium) {
        this.healthStatus = 'degraded'
      }
    }

    if (metrics.context?.cpu) {
      const { usage } = metrics.context.cpu
      if (usage > ERROR_SEVERITY_THRESHOLDS.memory.high) {
        this.healthStatus = 'critical'
      } else if (usage > ERROR_SEVERITY_THRESHOLDS.memory.medium) {
        this.healthStatus = 'degraded'
      }
    }

    if (metrics.streaming) {
      const { streamLatency } = metrics.streaming
      if (streamLatency > ERROR_SEVERITY_THRESHOLDS.memory.high) {
        this.healthStatus = 'critical'
      } else if (streamLatency > ERROR_SEVERITY_THRESHOLDS.memory.medium) {
        this.healthStatus = 'degraded'
      }
    }
  }

  private async getHealthDetails() {
    const [memoryStats, battery] = await Promise.all([
      this.performanceAnalyzer.getMemoryStats(),
      navigator.getBattery()
    ])

    return {
      memory: {
        used: memoryStats.heapUsed,
        total: memoryStats.heapTotal,
        threshold: ERROR_SEVERITY_THRESHOLDS.memory.high
      },
      audio: {
        context: 'default',
        sampleRate: 44100,
        bufferSize: 4096
      },
      storage: {
        used: 0,
        available: 0,
        quota: 0
      }
    }
  }

  private async updateMetrics(metrics: PerformanceMetrics) {
    if (metrics.context?.memory) {
      const memoryMetrics = await this.getMemoryMetrics()
      metrics.context.memory = memoryMetrics
    }

    if (metrics.context) {
      const resourceMetrics = await this.getResourceMetrics()
      metrics.context.cpu = resourceMetrics.cpu
      metrics.context.battery = resourceMetrics.battery
    }
  }

  private async collectMetrics(): Promise<PerformanceMetrics> {
    const currentMetrics: PerformanceMetrics = {
      type: 'system',
      name: 'system-metrics',
      duration: 0,
      timestamp: Date.now(),
      pipeline: {
        totalRequests: 0,
        errors: 0,
        errorRate: 0,
        averageLatency: 0,
        throughput: 0,
        queueUtilization: 0,
        batchEfficiency: 0,
        slowThreshold: 100,
        slowOperations: 0
      },
      cache: {
        hits: 0,
        misses: 0,
        ratio: 0,
        totalRequests: 0,
        averageLatency: 0,
        frequentItemsRatio: 0,
        uptime: 0
      },
      streaming: {
        bitrate: 0,
        packetLoss: 0,
        jitter: 0,
        roundTripTime: 0,
        bufferUtilization: 0,
        streamLatency: 0,
        dropoutCount: 0,
        recoveryTime: 0,
        activeStreams: 0,
        processingTime: 0,
        networkLatency: 0,
        adaptiveBufferSize: 0,
        voiceChangeLatency: 0,
        reconnectionCount: 0,
        partialDataSize: 0
      },
      context: {
        memory: {
          heapUsed: 0,
          heapTotal: 0,
          heapLimit: 0
        },
        cpu: {
          usage: 0,
          cores: navigator.hardwareConcurrency || 1
        },
        battery: {
          level: 1,
          charging: true
        }
      }
    }

    await this.updateMetrics(currentMetrics)
    return currentMetrics
  }

  private async getMemoryMetrics(): Promise<{ heapUsed: number; heapTotal: number; heapLimit: number }> {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return {
        heapUsed: memory.usedJSHeapSize,
        heapTotal: memory.totalJSHeapSize,
        heapLimit: memory.jsHeapSizeLimit
      }
    }
    return {
      heapUsed: 0,
      heapTotal: 0,
      heapLimit: 0
    }
  }

  private async getResourceMetrics(): Promise<{ cpu: { usage: number; cores: number }; battery: { level: number; charging: boolean } }> {
    const cpuUsage = await this.performanceAnalyzer.trackCPUUsage()
    return {
      cpu: {
        usage: cpuUsage.percentage,
        cores: navigator.hardwareConcurrency || 1
      },
      battery: {
        level: 1,
        charging: true
      }
    }
  }

  trackError(error: ErrorReport) {
    this.errorReports.push(error)
    if (error.severity === 'critical') {
      this.healthStatus = 'critical'
    } else if (error.severity === 'high' && this.healthStatus !== 'critical') {
      this.healthStatus = 'degraded'
    }
  }

  getStatus(): MonitoringServiceStatus {
    return this.healthStatus
  }

  getErrors(): ErrorReport[] {
    return this.errorReports
  }

  clearErrors() {
    this.errorReports = []
    this.healthStatus = 'healthy'
  }

  destroy() {
    Object.values(this.intervals).forEach(clearInterval)
  }
}

// Export singleton instance
export const monitoringService = MonitoringService.getInstance()
