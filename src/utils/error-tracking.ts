import { ErrorReport, ErrorType, ErrorSeverity } from '@/types/monitoring';
import { MONITORING_ENDPOINTS } from '@/config/monitoring';
import { logger } from '@/lib/logger';

export async function reportError(
  error: Error,
  type: ErrorType,
  severity: ErrorSeverity = 'medium',
  context?: Record<string, unknown>
): Promise<void> {
  const errorReport: ErrorReport = {
    type,
    message: error.message,
    stack: error.stack,
    timestamp: Date.now(),
    severity,
    context
  };

  try {
    const response = await fetch(MONITORING_ENDPOINTS.errors, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(errorReport),
    });

    if (!response.ok) {
      console.error('Failed to report error:', await response.text());
    }
  } catch (e) {
    // Fallback to console if reporting fails
    console.error('Error reporting failed:', e);
    console.error('Original error:', error);
  }
}

export function wrapWithErrorTracking<T extends (...args: any[]) => any>(
  fn: T,
  type: ErrorType,
  context?: Record<string, unknown>
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await fn(...args);
    } catch (error) {
      await reportError(error as Error, type, 'high', {
        functionName: fn.name,
        arguments: args,
        ...context
      });
      throw error;
    }
  };
}

export function setupGlobalErrorTracking(): void {
  if (typeof window === 'undefined') {
    return; // Skip setup on server-side
  }

  window.onerror = (message, source, lineno, colno, error) => {
    logger.error({
      message: 'Global error caught',
      error: error instanceof Error ? error.message : String(error),
      source,
      lineno,
      colno,
    });
  };

  window.onunhandledrejection = (event) => {
    logger.error({
      message: 'Unhandled promise rejection',
      error: event.reason instanceof Error ? event.reason.message : String(event.reason),
    });
  };
}

export function trackError(error: unknown, context?: Record<string, unknown>): void {
  logger.error({
    message: 'Error tracked',
    error: error instanceof Error ? error.message : String(error),
    context,
  });
}

export function trackMetric(name: string, value: number, tags?: Record<string, string>): void {
  if (typeof window === 'undefined') {
    return; // Skip metrics on server-side
  }

  const metric = {
    name,
    value,
    tags,
    timestamp: Date.now(),
  };

  // Send metric to backend
  fetch('/api/metrics', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metric),
  }).catch((error) => {
    logger.error({
      message: 'Failed to send metric',
      error: error instanceof Error ? error.message : String(error),
      metric,
    });
  });
}
