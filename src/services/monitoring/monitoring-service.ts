import type { ErrorReport, HealthStatus, PerformanceMetrics } from '@/types/monitoring'
import { monitoringConfig, ERROR_SEVERITY_THRESHOLDS, MONITORING_INTERVALS } from '@/config/monitoring'
import { PerformanceAnalyzer } from '@/services/performance-analyzer'
import { AudioService } from '@/services/audio-service'

export class MonitoringService {
  private static instance: MonitoringService
  private errorReports: ErrorReport[] = []
  private performanceMetrics: PerformanceMetrics[] = []
  private healthStatus: HealthStatus = {
    status: 'healthy',
    lastCheck: Date.now(),
    services: {}
  }
  private analyzer: PerformanceAnalyzer
  private intervals: Record<string, NodeJS.Timeout> = {}

  private constructor() {
    this.analyzer = new PerformanceAnalyzer()
    this.setupErrorTracking()
    this.setupPerformanceTracking()
    this.setupHealthChecks()
  }

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService()
    }
    return MonitoringService.instance
  }

  private setupErrorTracking(): void {
    if (!monitoringConfig.errorTracking.enabled) return

    window.addEventListener('error', (event) => {
      if (monitoringConfig.errorTracking.ignoredErrors?.includes(event.message)) {
        return
      }

      this.trackError({
        type: 'runtime',
        message: event.message,
        stack: event.error?.stack,
        timestamp: Date.now(),
        severity: this.determineErrorSeverity(event)
      })
    })

    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        type: 'promise',
        message: event.reason?.message || 'Unhandled Promise Rejection',
        stack: event.reason?.stack,
        timestamp: Date.now(),
        severity: 'high'
      })
    })
  }

  private setupPerformanceTracking(): void {
    if (!monitoringConfig.performance.enabled) return

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (Math.random() < monitoringConfig.performance.sampleRate) {
          this.trackPerformanceMetric({
            type: entry.entryType,
            name: entry.name,
            duration: entry.duration,
            timestamp: entry.startTime
          })
        }
      }
    })

    observer.observe({
      entryTypes: ['resource', 'navigation', 'mark', 'measure']
    })

    this.intervals.metrics = setInterval(async () => {
      const metrics = await this.analyzer.getPerformanceMetrics()
      this.checkPerformanceThresholds(metrics)
    }, MONITORING_INTERVALS.metrics)
  }

  private setupHealthChecks(): void {
    if (!monitoringConfig.health.enabled) return

    this.intervals.health = setInterval(async () => {
      const services = {
        audio: await this.checkAudioService(),
        storage: await this.checkStorageService(),
        network: await this.checkNetworkConnectivity()
      }

      this.healthStatus = {
        status: Object.values(services).every(s => s === 'healthy') ? 'healthy' : 'degraded',
        lastCheck: Date.now(),
        services,
        details: await this.getHealthDetails()
      }

      if (this.healthStatus.status !== 'healthy') {
        this.triggerHealthAlert()
      }
    }, monitoringConfig.health.checkInterval)
  }

  private async getHealthDetails() {
    const [memory, battery] = await Promise.all([
      this.analyzer.getMemoryStats(),
      navigator.getBattery()
    ])

    return {
      memory: {
        used: memory.heapUsed,
        total: memory.heapTotal,
        threshold: monitoringConfig.performance.thresholds.memory
      },
      battery: {
        level: battery.level,
        charging: battery.charging
      }
    }
  }

  private determineErrorSeverity(error: ErrorEvent): ErrorReport['severity'] {
    if (error.error?.name === 'SecurityError' || error.message.includes('QuotaExceededError')) {
      return 'critical'
    }
    if (error.message.includes('NetworkError') || error.message.includes('timeout')) {
      return 'high'
    }
    return 'medium'
  }

  private async checkPerformanceThresholds(metrics: PerformanceMetrics): Promise<void> {
    const { memory, cpu, latency } = monitoringConfig.performance.thresholds

    if (metrics.context?.memory?.heapUsed && metrics.context.memory.heapUsed > memory) {
      this.triggerAlert('memory', metrics.context.memory.heapUsed)
    }

    if (metrics.context?.cpu?.usage && metrics.context.cpu.usage > cpu) {
      this.triggerAlert('cpu', metrics.context.cpu.usage)
    }

    if (metrics.duration > latency) {
      this.triggerAlert('latency', metrics.duration)
    }
  }

  private triggerAlert(type: string, value: number): void {
    const alert = {
      type,
      value,
      timestamp: Date.now(),
      threshold: monitoringConfig.performance.thresholds[type as keyof typeof monitoringConfig.performance.thresholds]
    }

    // Send alert to monitoring system
    console.warn('Performance alert:', alert)
  }

  private triggerHealthAlert(): void {
    const alert = {
      type: 'health',
      status: this.healthStatus.status,
      services: this.healthStatus.services,
      timestamp: Date.now()
    }

    // Send health alert to monitoring system
    console.warn('Health alert:', alert)
  }

  public trackError(error: ErrorReport): void {
    this.errorReports.push(error)

    if (this.errorReports.length > monitoringConfig.errorTracking.maxErrors) {
      this.errorReports.shift()
    }

    if (monitoringConfig.errorTracking.reportingEndpoint) {
      // Send to error tracking service
      fetch(monitoringConfig.errorTracking.reportingEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(error)
      }).catch(console.error)
    }
  }

  public trackPerformanceMetric(metric: PerformanceMetrics): void {
    this.performanceMetrics.push(metric)
    this.checkPerformanceThresholds(metric)
  }

  public async getHealthStatus(): Promise<HealthStatus> {
    return this.healthStatus
  }

  private async checkAudioService(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
    try {
      const state = AudioService.getState()
      return state.error ? 'degraded' : 'healthy'
    } catch {
      return 'unhealthy'
    }
  }

  private async checkStorageService(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
    try {
      const quota = await navigator.storage.estimate()
      const usageRatio = quota.usage! / quota.quota!

      if (usageRatio > ERROR_SEVERITY_THRESHOLDS.memory.high) {
        return 'unhealthy'
      }
      if (usageRatio > ERROR_SEVERITY_THRESHOLDS.memory.medium) {
        return 'degraded'
      }
      return 'healthy'
    } catch {
      return 'unhealthy'
    }
  }

  private async checkNetworkConnectivity(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
    try {
      const connection = (navigator as any).connection
      if (!connection) return 'healthy'

      if (connection.downlink < 1) {
        return 'degraded'
      }
      if (connection.rtt > ERROR_SEVERITY_THRESHOLDS.latency.high) {
        return 'unhealthy'
      }
      return 'healthy'
    } catch {
      return 'unhealthy'
    }
  }

  public async generateReport(): Promise<{
    errors: ErrorReport[];
    performance: PerformanceMetrics[];
    health: HealthStatus;
  }> {
    const currentMetrics = await this.analyzer.generatePerformanceReport()

    return {
      errors: this.errorReports.slice(-100), // Last 100 errors
      performance: [...this.performanceMetrics.slice(-100), currentMetrics],
      health: this.healthStatus
    }
  }

  public cleanup(): void {
    Object.values(this.intervals).forEach(clearInterval)
    this.intervals = {}
    this.errorReports = []
    this.performanceMetrics = []
  }
}

// Export singleton instance
export const monitoringService = MonitoringService.getInstance()
