import { Alert, ErrorReport, ErrorSeverity, PerformanceAlert, HealthAlert, ServiceStatus } from '@/types/monitoring';
import { loggingService } from './logging-service';
import { ERROR_SEVERITY_THRESHOLDS } from '@/config/monitoring';

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
    const severity = this.calculateErrorSeverity(error.type);

    // Create alert if severity is high enough
    if (severity === 'high' || severity === 'critical') {
      this.createAlert({
        type: 'error',
        message: `High error rate detected for ${error.type}: ${error.message}`,
        severity,
        timestamp: Date.now(),
        context: {
          errorType: error.type,
          errorCount: currentCount + 1,
          errorStack: error.stack,
          ...error.context
        }
      });
    }

    // Log the error
    loggingService.error(error.message, new Error(error.stack), {
      type: error.type,
      severity,
      context: error.context
    });
  }

  public trackPerformanceAlert(metric: string, value: number, threshold: number): void {
    const severity = this.calculatePerformanceSeverity(metric, value, threshold);

    if (severity === 'high' || severity === 'critical') {
      const alert: PerformanceAlert = {
        type: 'performance',
        message: `Performance threshold exceeded for ${metric}`,
        severity,
        timestamp: Date.now(),
        metric,
        value,
        threshold,
        trend: this.calculateTrend(metric, value)
      };

      this.createAlert(alert);
    }
  }

  public trackHealthAlert(service: string, status: ServiceStatus, previousStatus?: ServiceStatus): void {
    if (status === 'degraded' || status === 'unhealthy') {
      const alert: HealthAlert = {
        type: 'health',
        message: `Service ${service} is ${status}`,
        severity: status === 'unhealthy' ? 'critical' : 'high',
        timestamp: Date.now(),
        service,
        status,
        previousStatus,
        recoverySteps: this.getRecoverySteps(service, status)
      };

      this.createAlert(alert);
    }
  }

  private createAlert(alert: Alert): void {
    // Check alert cooldown
    const lastAlert = this.lastAlertTime.get(alert.type);
    if (lastAlert && Date.now() - lastAlert < this.ALERT_COOLDOWN) {
      return;
    }

    // Add alert to the list
    this.alerts.push(alert);
    this.lastAlertTime.set(alert.type, Date.now());

    // Log alert
    loggingService.warn(`Alert triggered: ${alert.message}`, {
      alertType: alert.type,
      severity: alert.severity,
      context: alert.context
    });

    // Send notifications if needed
    this.notifyAlert(alert);
  }

  private calculateErrorSeverity(type: ErrorType): ErrorSeverity {
    const count = this.errorCounts.get(type) || 0;
    const rate = count / this.getTimeWindow();

    if (rate >= ERROR_SEVERITY_THRESHOLDS.errorRate.high) {
      return 'critical';
    } else if (rate >= ERROR_SEVERITY_THRESHOLDS.errorRate.medium) {
      return 'high';
    } else if (rate >= ERROR_SEVERITY_THRESHOLDS.errorRate.low) {
      return 'medium';
    }
    return 'low';
  }

  private calculatePerformanceSeverity(metric: string, value: number, threshold: number): ErrorSeverity {
    const ratio = value / threshold;

    if (ratio >= ERROR_SEVERITY_THRESHOLDS.memory.high) {
      return 'critical';
    } else if (ratio >= ERROR_SEVERITY_THRESHOLDS.memory.medium) {
      return 'high';
    } else if (ratio >= ERROR_SEVERITY_THRESHOLDS.memory.low) {
      return 'medium';
    }
    return 'low';
  }

  private calculateTrend(_metric: string, _value: number): 'increasing' | 'decreasing' | 'stable' {
    // Implementation for trend calculation
    // This would compare with historical values
    return 'stable';
  }

  private getTimeWindow(): number {
    return 60 * 60 * 1000; // 1 hour in milliseconds
  }

  private getRecoverySteps(service: string, _status: ServiceStatus): string[] {
    // Implementation for getting recovery steps based on service and status
    return [
      `Check ${service} logs for errors`,
      'Verify service dependencies are available',
      'Check system resources',
      'Restart service if necessary'
    ];
  }

  private async notifyAlert(alert: Alert): Promise<void> {
    // Implementation for sending notifications (email, Slack, etc.)
    // This would be implemented based on your notification preferences
    console.log('Alert notification:', alert);
  }

  public getAlerts(severity?: ErrorSeverity): Alert[] {
    if (severity) {
      return this.alerts.filter(alert => alert.severity === severity);
    }
    return this.alerts;
  }

  public clearAlerts(): void {
    this.alerts = [];
    this.lastAlertTime.clear();
  }
}

// Export singleton instance
export const alertService = AlertService.getInstance();
