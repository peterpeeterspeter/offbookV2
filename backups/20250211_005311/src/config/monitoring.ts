import type { MonitoringConfig } from '@/types/monitoring'

export const monitoringConfig: MonitoringConfig = {
  errorTracking: {
    enabled: true,
    maxErrors: 1000,
    ...(process.env.VITE_ERROR_REPORTING_URL && {
      reportingEndpoint: process.env.VITE_ERROR_REPORTING_URL
    }),
    ignoredErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications'
    ]
  },
  performance: {
    enabled: true,
    sampleRate: 0.1, // 10% of sessions
    metrics: [
      'FCP',
      'LCP',
      'CLS',
      'FID',
      'TTFB',
      'audioLatency',
      'memoryUsage',
      'cpuUsage',
      'batteryLevel'
    ],
    thresholds: {
      memory: 256 * 1024 * 1024, // 256MB
      cpu: 80, // 80%
      latency: 200 // 200ms
    }
  },
  health: {
    enabled: true,
    checkInterval: 60000, // 1 minute
    endpoints: [
      '/health',
      '/health/audio',
      '/health/collaboration',
      '/health/storage'
    ]
  }
}

export const ERROR_SEVERITY_THRESHOLDS = {
  memory: {
    high: 0.9, // 90% of max
    medium: 0.7, // 70% of max
    low: 0.5 // 50% of max
  },
  cpu: {
    high: 0.8, // 80% utilization
    medium: 0.6,
    low: 0.4
  },
  errorRate: {
    high: 0.05, // 5% error rate
    medium: 0.01,
    low: 0.001
  },
  latency: {
    high: 500, // 500ms
    medium: 200,
    low: 100
  }
}

export const MONITORING_ENDPOINTS = {
  errors: '/api/monitoring/errors',
  metrics: '/api/monitoring/metrics',
  health: '/api/monitoring/health',
  alerts: '/api/monitoring/alerts'
}

export const ALERT_THRESHOLDS = {
  errorSpike: 10, // 10x normal rate
  latencySpike: 5, // 5x normal latency
  memoryGrowth: 1.5, // 50% growth
  cpuSpike: 0.9 // 90% utilization
}

export const MONITORING_INTERVALS = {
  metrics: 5000, // 5 seconds
  health: 60000, // 1 minute
  cleanup: 3600000 // 1 hour
}

export const RETENTION_POLICIES = {
  errors: 7 * 24 * 60 * 60 * 1000, // 7 days
  metrics: 30 * 24 * 60 * 60 * 1000, // 30 days
  alerts: 90 * 24 * 60 * 60 * 1000 // 90 days
}

export const MONITORING_FEATURES = {
  enableRealTimeAlerts: true,
  enableHistoricalAnalysis: true,
  enableAnomalyDetection: true,
  enableAutomaticRecovery: true
}
