import { describe, it, expect, beforeEach, vi } from 'vitest';
import { errorTrackingService } from '@/services/monitoring/error-tracking-service';
import { alertService } from '@/services/monitoring/alert-service';
import { loggingService } from '@/services/monitoring/logging-service';
import { analyticsService } from '@/services/monitoring/analytics-service';
import { monitoringConfig } from '@/config/monitoring';

describe('ErrorTrackingService', () => {
  beforeEach(() => {
    errorTrackingService.clearErrorHistory();
    vi.spyOn(alertService, 'trackError');
    vi.spyOn(loggingService, 'error');
    vi.spyOn(analyticsService, 'trackError');
    vi.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve(''),
      } as Response)
    );
  });

  it('should track errors with correct severity levels', () => {
    const error = new Error('Test error');
    errorTrackingService.trackError(error, 'runtime', { userId: 'test-user' });

    const stats = errorTrackingService.getErrorStats();
    expect(stats.counts.runtime).toBe(1);
    expect(stats.history).toHaveLength(1);
    expect(stats.history[0]).toMatchObject({
      type: 'runtime',
      message: 'Test error',
      severity: 'low', // First error should be low severity
    });
  });

  it('should escalate severity based on error rate', () => {
    const error = new Error('Test error');
    const errorCount = Math.ceil((monitoringConfig.errorTracking.maxErrors || 1000) * 0.15); // 15% error rate

    // Generate enough errors to trigger critical severity
    for (let i = 0; i < errorCount; i++) {
      errorTrackingService.trackError(error, 'runtime');
    }

    const stats = errorTrackingService.getErrorStats();
    const lastError = stats.history[stats.history.length - 1];
    expect(lastError?.severity).toBe('critical');
  });

  it('should forward errors to alert service', () => {
    const error = new Error('Test error');
    errorTrackingService.trackError(error, 'network');

    expect(alertService.trackError).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'network',
        message: 'Test error',
      })
    );
  });

  it('should log errors with context', () => {
    const error = new Error('Test error');
    const context = { userId: 'test-user', action: 'test' };
    errorTrackingService.trackError(error, 'audio', context);

    expect(loggingService.error).toHaveBeenCalledWith(
      'Test error',
      error,
      expect.objectContaining({
        type: 'audio',
        ...context,
      })
    );
  });

  it('should track errors in analytics', () => {
    const error = new Error('Test error');
    const context = { userId: 'test-user' };
    errorTrackingService.trackError(error, 'storage', context);

    expect(analyticsService.trackError).toHaveBeenCalledWith('test-user');
  });

  it('should report errors to external service when configured', async () => {
    const error = new Error('Test error');
    const mockFetch = vi.spyOn(global, 'fetch');

    errorTrackingService.trackError(error, 'runtime');

    if (monitoringConfig.errorTracking.reportingEndpoint) {
      expect(mockFetch).toHaveBeenCalledWith(
        monitoringConfig.errorTracking.reportingEndpoint,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    }
  });

  it('should maintain error history within size limit', () => {
    const error = new Error('Test error');
    const maxErrors = monitoringConfig.errorTracking.maxErrors || 1000;

    // Generate more errors than the limit
    for (let i = 0; i < maxErrors + 10; i++) {
      errorTrackingService.trackError(error, 'runtime');
    }

    const stats = errorTrackingService.getErrorStats();
    expect(stats.history).toHaveLength(maxErrors);
    expect(stats.totalErrors).toBe(maxErrors);
  });
});
