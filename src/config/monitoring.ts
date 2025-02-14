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
    ],
    severityThresholds: {
      critical: 0.1, // 10% error rate
      high: 0.05,    // 5% error rate
      medium: 0.01,  // 1% error rate
      low: 0.001     // 0.1% error rate
    }
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
      memory: 256 * 1024 * 1024, // 256MB as per deployment checklist
      cpu: 80, // 80% threshold
      latency: 150, // 150ms target from deployment checklist
      fcp: 1000, // 1s First Contentful Paint
      lcp: 1800, // 1.8s Largest Contentful Paint from checklist
      cls: 0.1, // Cumulative Layout Shift
      fid: 100, // First Input Delay
      ttfb: 200, // Time to First Byte
      audioLatency: 100, // Audio processing latency
      batteryDrain: 8 // 8% per hour as per checklist
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
  },
  logging: {
    enabled: true,
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: 'json',
    retention: 90, // 90 days
    remoteEndpoint: process.env.LOG_REMOTE_ENDPOINT,
    batchSize: 100,
    batchInterval: 5000 // 5 seconds
  }
}

export const ERROR_SEVERITY_THRESHOLDS = {
  memory: {
    critical: 0.95, // 95% of max
    high: 0.85, // 85% of max
    medium: 0.75, // 75% of max
    low: 0.6 // 60% of max
  },
  cpu: {
    critical: 0.9, // 90% utilization
    high: 0.8, // 80% utilization
    medium: 0.7, // 70% utilization
    low: 0.5 // 50% utilization
  },
  errorRate: {
    critical: 0.05, // 5% error rate
    high: 0.03, // 3% error rate
    medium: 0.01, // 1% error rate
    low: 0.005 // 0.5% error rate
  },
  latency: {
    critical: 1000, // 1s
    high: 500, // 500ms
    medium: 200, // 200ms
    low: 100 // 100ms
  },
  batteryDrain: {
    critical: 15, // 15% per hour
    high: 12, // 12% per hour
    medium: 10, // 10% per hour
    low: 8 // 8% per hour (target)
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
