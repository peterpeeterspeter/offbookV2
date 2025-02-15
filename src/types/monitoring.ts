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
  audio: {
    latency: number;
    sampleRate: number;
    bufferSize: number;
    underruns: number;
    overruns: number;
  };
  network: {
    wsLatency: number;
    bandwidth: number;
    packetLoss: number;
    reconnects: number;
  };
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    gcCount: number;
  };
  timing: {
    ttfb: number;
    processingTime: number;
    renderTime: number;
  };
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
    ignoredErrors: string[]
    severityThresholds: {
      critical: number
      high: number
      medium: number
      low: number
    }
  }
  performance: {
    enabled: boolean
    sampleRate: number
    metrics: string[]
    thresholds: {
      memory: number
      cpu: number
      latency: number
      fcp: number
      lcp: number
      cls: number
      fid: number
      ttfb: number
      audioLatency: number
      batteryDrain: number
      successRate: number
    }
  }
  health: {
    enabled: boolean
    checkInterval: number
    endpoints: string[]
  }
  logging: {
    enabled: boolean
    level: 'debug' | 'info' | 'warn' | 'error'
    format: 'json' | 'text'
    retention: number
    remoteEndpoint?: string
    batchSize: number
    batchInterval: number
  }
}

export interface ErrorSeverityThresholds {
  memory: SeverityLevels
  cpu: SeverityLevels
  errorRate: SeverityLevels
  latency: SeverityLevels
  batteryDrain: SeverityLevels
}

interface SeverityLevels {
  critical: number
  high: number
  medium: number
  low: number
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

export interface ResourceUsage {
  memoryPercent: number;
  connections: number;
  queueSize: number;
  activeWorkers: number;
  cpuUsage: number;
}

export interface PerformanceEvent {
  timestamp: number;
  type: 'audio' | 'network' | 'memory' | 'error';
  metrics: Partial<PerformanceMetrics>;
  resources?: ResourceUsage;
  error?: {
    message: string;
    code: string;
    stack?: string;
  };
}

export type ThermalState = 'nominal' | 'fair' | 'serious' | 'critical';

export interface DeviceMetrics {
  battery: {
    level: number;
    charging: boolean;
    chargingTime: number;
    dischargingTime: number;
  };
  thermal: {
    state: ThermalState;
  };
  memory: {
    deviceMemory?: number;
    jsHeapSizeLimit?: number;
  };
  hardware: {
    concurrency: number;
    platform: string;
    mobile: boolean;
  };
}
