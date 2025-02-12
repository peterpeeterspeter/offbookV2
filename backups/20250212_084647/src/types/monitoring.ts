export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'
export type ErrorType = 'runtime' | 'promise' | 'network' | 'audio' | 'storage'
export type ServiceStatus = 'healthy' | 'degraded' | 'unhealthy'

export interface ErrorReport {
  type: ErrorType
  message: string
  stack?: string
  timestamp: number
  severity?: ErrorSeverity
  context?: Record<string, unknown>
}

export interface PerformanceMetrics {
  type: string
  name: string
  duration: number
  timestamp: number
  context?: {
    memory?: {
      heapUsed: number
      heapTotal: number
    }
    cpu?: {
      usage: number
      cores: number
    }
    network?: {
      downlink: number
      rtt: number
      effectiveType: string
    }
  }
}

export interface HealthStatus {
  status: ServiceStatus
  lastCheck: number
  services: Record<string, ServiceStatus>
  details?: {
    memory?: {
      used: number
      total: number
      threshold: number
    }
    audio?: {
      context: string
      sampleRate: number
      bufferSize: number
    }
    storage?: {
      used: number
      available: number
      quota: number
    }
  }
}

export interface MonitoringConfig {
  errorTracking: {
    enabled: boolean
    maxErrors: number
    reportingEndpoint?: string
    ignoredErrors?: string[]
  }
  performance: {
    enabled: boolean
    sampleRate: number
    metrics: string[]
    thresholds: {
      memory: number
      cpu: number
      latency: number
    }
  }
  health: {
    enabled: boolean
    checkInterval: number
    endpoints: string[]
  }
}

export interface Alert {
  type: string
  message: string
  severity: ErrorSeverity
  timestamp: number
  context?: Record<string, unknown>
}

export interface PerformanceAlert extends Alert {
  metric: string
  value: number
  threshold: number
  trend?: 'increasing' | 'decreasing' | 'stable'
}

export interface HealthAlert extends Alert {
  service: string
  status: ServiceStatus
  previousStatus?: ServiceStatus
  recoverySteps?: string[]
}

export interface MonitoringReport {
  timestamp: number
  errors: ErrorReport[]
  performance: PerformanceMetrics[]
  health: HealthStatus
  alerts: Alert[]
}

export interface RetentionPolicy {
  errors: number
  metrics: number
  alerts: number
}

export interface MonitoringFeatures {
  enableRealTimeAlerts: boolean
  enableHistoricalAnalysis: boolean
  enableAnomalyDetection: boolean
  enableAutomaticRecovery: boolean
}
