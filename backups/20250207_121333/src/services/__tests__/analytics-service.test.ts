import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AnalyticsService } from '../external/analytics-service';
import { ServiceError } from '../service-integration';
import { ExternalServiceConfig, AnalyticsEvent } from '../external/types';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let config: ExternalServiceConfig;

  beforeEach(() => {
    config = {
      apiKey: 'test-api-key',
      endpoint: 'https://analytics.api.test'
    };
    service = new AnalyticsService(config);
    // Spy on console.log to prevent test output noise
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    await service.dispose();
    vi.clearAllMocks();
  });

  describe('Lifecycle', () => {
    it('should initialize successfully with valid config', async () => {
      await expect(service.initialize()).resolves.not.toThrow();
      expect(service.isConnected()).toBe(true);
    });

    it('should throw error when initializing without API key', async () => {
      service = new AnalyticsService({});
      await expect(service.initialize()).rejects.toThrow(ServiceError);
      expect(service.isConnected()).toBe(false);
    });

    it('should disconnect and flush events', async () => {
      await service.initialize();
      await service.trackEvent({
        name: 'test_event',
        timestamp: new Date(),
        properties: {}
      });

      await service.disconnect();
      expect(service.isConnected()).toBe(false);
    });
  });

  describe('Event Tracking', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should track single event', async () => {
      const event: AnalyticsEvent = {
        name: 'button_click',
        timestamp: new Date(),
        properties: {
          buttonId: 'submit',
          page: 'home'
        }
      };

      await service.trackEvent(event);
      const metrics = service.getMetrics();
      expect(metrics.requestCount).toBe(1);
      expect(metrics.errorCount).toBe(0);
    });

    it('should handle events with user and session IDs', async () => {
      const event: AnalyticsEvent = {
        name: 'user_action',
        timestamp: new Date(),
        properties: { action: 'login' },
        userId: 'user123',
        sessionId: 'session456'
      };

      await service.trackEvent(event);
      const metrics = service.getMetrics();
      expect(metrics.requestCount).toBe(1);
    });

    it('should auto-assign timestamp if not provided', async () => {
      const event = {
        name: 'test_event',
        timestamp: new Date(),
        properties: {}
      } satisfies AnalyticsEvent;

      await service.trackEvent(event);
      const metrics = service.getMetrics();
      expect(metrics.lastRequest).toBeInstanceOf(Date);
    });
  });

  describe('Event Batching', () => {
    beforeEach(async () => {
      await service.initialize();
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should batch events and flush on interval', async () => {
      // Track multiple events
      for (let i = 0; i < 5; i++) {
        await service.trackEvent({
          name: 'batch_test',
          timestamp: new Date(),
          properties: { index: i }
        });
      }

      // Fast-forward past the flush interval
      vi.advanceTimersByTime(5000);

      // Need to wait for any promises to resolve
      await vi.runAllTimersAsync();

      const metrics = service.getMetrics();
      expect(metrics.requestCount).toBe(5);
    });

    it('should flush when queue reaches max size', async () => {
      const promises = [];
      // Track more events than MAX_QUEUE_SIZE
      for (let i = 0; i < 101; i++) {
        promises.push(service.trackEvent({
          name: 'queue_test',
          timestamp: new Date(),
          properties: { index: i }
        }));
      }

      await Promise.all(promises);
      const metrics = service.getMetrics();
      expect(metrics.requestCount).toBe(101);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should handle network errors', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

      const event: AnalyticsEvent = {
        name: 'error_test',
        timestamp: new Date(),
        properties: {}
      };

      await expect(service.trackEvent(event)).rejects.toThrow(ServiceError);
      const metrics = service.getMetrics();
      expect(metrics.errorCount).toBe(1);
    });

    it('should handle invalid events', async () => {
      const invalidEvent = {
        name: '',
        properties: null
      } as unknown as AnalyticsEvent;

      await expect(service.trackEvent(invalidEvent)).rejects.toThrow(ServiceError);
    });

    it('should retry failed flushes', async () => {
      const event: AnalyticsEvent = {
        name: 'retry_test',
        timestamp: new Date(),
        properties: {}
      };

      // Mock first attempt to fail, second to succeed
      const fetchSpy = vi.spyOn(global, 'fetch')
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce({ ok: true } as Response);

      await service.trackEvent(event);

      // Fast-forward past the flush interval
      vi.advanceTimersByTime(5000);
      await vi.runAllTimersAsync();

      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Metrics', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should track event processing time', async () => {
      const startMetrics = service.getMetrics();

      await service.trackEvent({
        name: 'timing_test',
        timestamp: new Date(),
        properties: {}
      });

      const endMetrics = service.getMetrics();
      expect(endMetrics.latency).toBeGreaterThan(startMetrics.latency);
    });

    it('should maintain accurate request counts', async () => {
      const events = Array.from({ length: 5 }, (_, i) => ({
        name: 'count_test',
        timestamp: new Date(),
        properties: { index: i }
      }));

      await Promise.all(events.map(event => service.trackEvent(event)));

      const metrics = service.getMetrics();
      expect(metrics.requestCount).toBe(5);
    });
  });
});
