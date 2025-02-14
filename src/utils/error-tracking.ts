import { ErrorReport, ErrorType, ErrorSeverity } from '@/types/monitoring';
import { MONITORING_ENDPOINTS } from '@/config/monitoring';

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
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    reportError(
      event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
      'promise',
      'high',
      { type: 'unhandledrejection' }
    );
  });

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    reportError(
      event.error || new Error(event.message),
      'runtime',
      'high',
      {
        type: 'uncaught',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }
    );
  });
}
