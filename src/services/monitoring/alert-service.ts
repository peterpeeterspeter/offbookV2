import { Alert, ErrorReport, ErrorSeverity, PerformanceAlert, HealthAlert, ServiceStatus } from '@/types/monitoring';
import { loggingService } from './logging-service';
import { ERROR_SEVERITY_THRESHOLDS, monitoringConfig } from '@/config/monitoring';

// Define error types as const to use as values
const ERROR_TYPES = {
  runtime: 'runtime',
  promise: 'promise',
  network: 'network',
  audio: 'audio',
  storage: 'storage'
} as const;

type ErrorType = keyof typeof ERROR_TYPES;

export class AlertService {
  private static instance: AlertService;
  private alerts: Alert[] = [];
  private errorCounts: Map<ErrorType, number> = new Map();
  private lastAlertTime: Map<string, number> = new Map();
  private readonly ALERT_COOLDOWN = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    // Initialize error counts for each type
    Object.values(ERROR_TYPES).forEach(type => {
      this.errorCounts.set(type as ErrorType, 0);
    });
  }

  public static getInstance(): AlertService {
    if (!AlertService.instance) {
      AlertService.instance = new AlertService();
    }
    return AlertService.instance;
  }

  public trackError(error: ErrorReport): void {
    // Increment error count for this type
    const currentCount = this.errorCounts.get(error.type) || 0;
    this.errorCounts.set(error.type, currentCount + 1);

    // Calculate error rate and determine severity
    const calculatedSeverity = this.calculateErrorSeverity(error.type);

    // Create alert for all errors
    this.createAlert({
      type: 'error',
      message: `Error detected for ${error.type}: ${error.message}`,
      severity: error.severity || calculatedSeverity, // Use provided severity or calculated one
      timestamp: Date.now(),
      context: {
        errorType: error.type,
        errorCount: currentCount + 1,
        errorStack: error.stack,
        ...error.context
      }
    });

    // Log the error
    loggingService.error(error.message, new Error(error.stack), {
      type: error.type,
      severity: error.severity || calculatedSeverity,
      context: error.context
    });
  }

  public trackPerformanceAlert(metric: string, value: number, threshold: number): void {
    const severity = this.calculatePerformanceSeverity(value, threshold);
    const alert: PerformanceAlert = {
      type: 'performance',
      message: `Performance alert: ${metric} exceeded threshold (${value} > ${threshold})`,
      severity,
      timestamp: Date.now(),
      metric,
      value,
      threshold
    };
    this.createAlert(alert);
  }

  public trackHealthAlert(service: string, status: ServiceStatus, previousStatus?: ServiceStatus): void {
    const alert: HealthAlert = {
      type: 'health',
      message: `Service ${service} status changed to ${status}${previousStatus ? ` from ${previousStatus}` : ''}`,
      severity: status === 'unhealthy' ? 'critical' : status === 'degraded' ? 'high' : 'low',
      timestamp: Date.now(),
      service,
      status,
      previousStatus,
      recoverySteps: this.getRecoverySteps(service, status)
    };
    this.createAlert(alert);
  }

  private calculateErrorSeverity(type: ErrorType): ErrorSeverity {
    const count = this.errorCounts.get(type) || 0;
    const thresholds = ERROR_SEVERITY_THRESHOLDS.errorRate;

    // Calculate error rate as a percentage (0-1)
    const errorRate = count / monitoringConfig.errorTracking.maxErrors;

    // Compare error rate against thresholds
    if (errorRate >= thresholds.critical) return 'critical';
    if (errorRate >= thresholds.high) return 'high';
    if (errorRate >= thresholds.medium) return 'medium';
    return 'low';
  }

  private calculatePerformanceSeverity(value: number, threshold: number): ErrorSeverity {
    // Calculate ratio of value to threshold
    const ratio = value / threshold;

    // Define severity thresholds based on ratio
    if (ratio >= 5.0) return 'critical';  // 5x threshold
    if (ratio >= 2.0) return 'high';      // 2x threshold
    if (ratio >= 1.0) return 'medium';    // At threshold
    return 'low';                         // Below threshold
  }

  private createAlert(alert: Alert): void {
    const alertKey = `${alert.type}-${alert.severity}`;
    const lastAlertTime = this.lastAlertTime.get(alertKey) || 0;
    const now = Date.now();

    // Check if we're still in cooldown period
    if (now - lastAlertTime < this.ALERT_COOLDOWN) {
      return;
    }

    this.alerts.push(alert);
    this.lastAlertTime.set(alertKey, now);

    // Trim old alerts if we have too many
    if (this.alerts.length > monitoringConfig.errorTracking.maxErrors) {
      this.alerts = this.alerts.slice(-monitoringConfig.errorTracking.maxErrors);
    }
  }

  private getRecoverySteps(service: string, status: ServiceStatus): string[] {
    if (status === 'healthy') return [];

    const commonSteps = [
      'Check service logs for errors',
      'Verify service dependencies are available',
      'Check system resources (CPU, memory, disk)'
    ];

    const serviceSpecificSteps: Record<string, string[]> = {
      api: [
        'Check API endpoint health',
        'Verify database connectivity',
        'Check authentication service'
      ],
      audio: [
        'Check audio device permissions',
        'Verify audio processing pipeline',
        'Check WebRTC connection'
      ],
      storage: [
        'Check storage quota',
        'Verify file system permissions',
        'Run storage cleanup routine'
      ]
    };

    return [...commonSteps, ...(serviceSpecificSteps[service] || [])];
  }

  public getAlerts(): Alert[] {
    return [...this.alerts];
  }

  public clearAlerts(): void {
    this.alerts = [];
    this.lastAlertTime.clear();
  }
}

// Export singleton instance
export const alertService = AlertService.getInstance();
