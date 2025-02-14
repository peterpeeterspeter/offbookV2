import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AlertService } from '@/services/monitoring/alert-service'
import { AnalyticsService } from '@/services/monitoring/analytics-service'
import { LoggingService } from '@/services/monitoring/logging-service'
import { monitoringConfig, ERROR_SEVERITY_THRESHOLDS } from '@/config/monitoring'
import { ErrorReport, ErrorType } from '@/types/monitoring'

describe('Monitoring System Integration Tests', () => {
  let alertService: AlertService
  let analyticsService: AnalyticsService
  let loggingService: LoggingService
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    alertService = AlertService.getInstance()
    analyticsService = AnalyticsService.getInstance()
    loggingService = LoggingService.getInstance()
    mockFetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
    )
    global.fetch = mockFetch as unknown as typeof fetch
  })

  afterEach(() => {
    vi.clearAllMocks()
    alertService.clearAlerts()
  })

  describe('Alert Service', () => {
    it('should track errors and generate alerts based on severity', () => {
      // First, generate enough errors to trigger a high severity alert
      for (let i = 0; i < 50; i++) {
        const errorReport: ErrorReport = {
          type: 'runtime' as ErrorType,
          message: 'Test error',
          stack: 'Error: Test error\n    at test',
          timestamp: Date.now(),
          severity: 'high'
        };
        alertService.trackError(errorReport);
      }

      const alerts = alertService.getAlerts();
      const highSeverityAlerts = alerts.filter(alert => alert.severity === 'high');

      expect(highSeverityAlerts.length).toBeGreaterThan(0);
      expect(highSeverityAlerts[0]).toMatchObject({
        type: 'error',
        severity: 'high',
        message: expect.stringContaining('Test error')
      });
    })

    it('should handle performance alerts with thresholds', () => {
      alertService.trackPerformanceAlert('latency', 1000, 200)
      const alerts = alertService.getAlerts()

      expect(alerts).toHaveLength(1)
      expect(alerts[0]).toMatchObject({
        type: 'performance',
        severity: expect.stringMatching(/high|critical/),
        message: expect.stringContaining('latency')
      })
    })

    it('should track service health status changes', () => {
      alertService.trackHealthAlert('api', 'degraded', 'healthy')
      const alerts = alertService.getAlerts()

      expect(alerts).toHaveLength(1)
      expect(alerts[0]).toMatchObject({
        type: 'health',
        service: 'api',
        status: 'degraded',
        previousStatus: 'healthy'
      })
    })
  })

  describe('Analytics Service', () => {
    it('should track user sessions and metrics', () => {
      const userId = 'test-user'
      analyticsService.startSession(userId)
      analyticsService.trackFeatureUsage(userId, 'test-feature')
      analyticsService.trackPerformance(userId, 100, true)
      analyticsService.endSession(userId)

      const metrics = analyticsService.getMetrics()
      expect(metrics.totalSessions).toBeGreaterThan(0)
      expect(metrics.featureUsage['test-feature']).toBe(1)
      expect(metrics.performanceMetrics.successRate).toBe(1)
    })

    it('should calculate accurate performance metrics', () => {
      const userId = 'test-user'
      analyticsService.startSession(userId)

      // Simulate some performance data
      analyticsService.trackPerformance(userId, 100, true)
      analyticsService.trackPerformance(userId, 200, true)
      analyticsService.trackPerformance(userId, 300, false)

      const metrics = analyticsService.getMetrics()
      expect(metrics.performanceMetrics.averageLatency).toBe(200)
      expect(metrics.performanceMetrics.successRate).toBe(2/3)
    })

    it('should handle time range queries', () => {
      const timeRange = {
        start: Date.now() - 3600000, // 1 hour ago
        end: Date.now()
      }

      const metrics = analyticsService.getMetrics(timeRange)
      expect(metrics.timestamp).toBeGreaterThanOrEqual(timeRange.start)
      expect(metrics.timestamp).toBeLessThanOrEqual(timeRange.end)
    })
  })

  describe('Logging Service', () => {
    it('should log messages with appropriate levels', () => {
      const logSpy = vi.spyOn(loggingService['logger'], 'log');

      loggingService.info('Test info message');
      loggingService.error('Test error message', new Error('Test error'));
      loggingService.warn('Test warning message');

      expect(logSpy).toHaveBeenCalledTimes(3);
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'info',
          message: 'Test info message'
        })
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'error',
          message: 'Test error message'
        })
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'warn',
          message: 'Test warning message'
        })
      );

      logSpy.mockRestore();
    });

    it('should handle structured logging with context', () => {
      const context = { userId: 'test-user', action: 'test' };
      const logSpy = vi.spyOn(loggingService['logger'], 'log');

      loggingService.info('Test message with context', context);

      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'info',
          message: 'Test message with context',
          metadata: expect.objectContaining({
            context: expect.objectContaining(context)
          })
        })
      );

      logSpy.mockRestore();
    });
  })

  describe('API Integration', () => {
    it('should handle analytics API requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })

      const response = await fetch('/api/monitoring/analytics')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
    })

    it('should handle alert API requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })

      const response = await fetch('/api/monitoring/alerts')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
    })
  })

  describe('Performance Thresholds', () => {
    it('should correctly apply severity thresholds', () => {
      const { memory, cpu, latency } = ERROR_SEVERITY_THRESHOLDS

      // Test memory thresholds
      expect(memory.critical).toBeGreaterThan(memory.high)
      expect(memory.high).toBeGreaterThan(memory.medium)
      expect(memory.medium).toBeGreaterThan(memory.low)

      // Test CPU thresholds
      expect(cpu.critical).toBeGreaterThan(cpu.high)
      expect(cpu.high).toBeGreaterThan(cpu.medium)
      expect(cpu.medium).toBeGreaterThan(cpu.low)

      // Test latency thresholds
      expect(latency.critical).toBeGreaterThan(latency.high)
      expect(latency.high).toBeGreaterThan(latency.medium)
      expect(latency.medium).toBeGreaterThan(latency.low)
    })

    it('should have valid monitoring configuration', () => {
      expect(monitoringConfig.performance.enabled).toBe(true)
      expect(monitoringConfig.errorTracking.enabled).toBe(true)
      expect(monitoringConfig.logging.enabled).toBe(true)
      expect(monitoringConfig.health.enabled).toBe(true)

      expect(monitoringConfig.performance.thresholds.memory).toBe(256 * 1024 * 1024)
      expect(monitoringConfig.performance.thresholds.cpu).toBe(80)
      expect(monitoringConfig.performance.thresholds.latency).toBe(150)
    })
  })
})
