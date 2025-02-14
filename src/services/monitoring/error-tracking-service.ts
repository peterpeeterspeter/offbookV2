import { ErrorReport, ErrorType, ErrorSeverity } from '@/types/monitoring';
import { alertService } from './alert-service';
import { loggingService } from './logging-service';
import { analyticsService } from './analytics-service';
import { monitoringConfig } from '@/config/monitoring';

const ERROR_TYPES: ErrorType[] = ['runtime', 'promise', 'network', 'audio', 'storage'];

export class ErrorTrackingService {
  private static instance: ErrorTrackingService;
  private errorCounts: Map<ErrorType, number> = new Map();
  private errorHistory: ErrorReport[] = [];
  private readonly MAX_HISTORY = monitoringConfig.errorTracking.maxErrors;

  private constructor() {
    // Initialize error counts
    ERROR_TYPES.forEach(type => {
      this.errorCounts.set(type, 0);
    });
  }

  public static getInstance(): ErrorTrackingService {
    if (!ErrorTrackingService.instance) {
      ErrorTrackingService.instance = new ErrorTrackingService();
    }
    return ErrorTrackingService.instance;
  }

  public trackError(error: Error, type: ErrorType, context?: Record<string, unknown>): void {
    const errorReport: ErrorReport = {
      type,
      message: error.message,
      stack: error.stack,
      timestamp: Date.now(),
      context
    };

    // Update error counts
    const currentCount = this.errorCounts.get(type) || 0;
    this.errorCounts.set(type, currentCount + 1);

    // Calculate severity based on error rate and type
    const severity = this.calculateErrorSeverity(type);
    errorReport.severity = severity;

    // Add to history
    this.errorHistory.push(errorReport);
    if (this.errorHistory.length > this.MAX_HISTORY) {
      this.errorHistory.shift();
    }

    // Forward to alert service
    alertService.trackError(errorReport);

    // Log the error
    loggingService.error(error.message, error, {
      type,
      severity,
      ...context
    });

    // Track in analytics
    analyticsService.trackError(context?.userId as string);

    // Report to external service if configured
    this.reportToExternalService(errorReport);
  }

  private calculateErrorSeverity(type: ErrorType): ErrorSeverity {
    const count = this.errorCounts.get(type) || 0;
    const rate = count / this.MAX_HISTORY;

    const thresholds = monitoringConfig.errorTracking.severityThresholds;
    if (rate >= thresholds.critical) return 'critical';
    if (rate >= thresholds.high) return 'high';
    if (rate >= thresholds.medium) return 'medium';
    return 'low';
  }

  private async reportToExternalService(errorReport: ErrorReport): Promise<void> {
    const endpoint = monitoringConfig.errorTracking.reportingEndpoint;
    if (!endpoint) return;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorReport),
      });

      if (!response.ok) {
        loggingService.warn('Failed to report error to external service', {
          status: response.status,
          error: await response.text(),
        });
      }
    } catch (error) {
      loggingService.warn('Failed to report error to external service', { error });
    }
  }

  public getErrorStats(): {
    counts: Record<ErrorType, number>;
    history: ErrorReport[];
    totalErrors: number;
  } {
    const counts: Record<ErrorType, number> = {} as Record<ErrorType, number>;
    this.errorCounts.forEach((count, type) => {
      counts[type] = count;
    });

    return {
      counts,
      history: [...this.errorHistory],
      totalErrors: this.errorHistory.length,
    };
  }

  public clearErrorHistory(): void {
    this.errorHistory = [];
    this.errorCounts.clear();
  }
}

// Export singleton instance
export const errorTrackingService = ErrorTrackingService.getInstance();
