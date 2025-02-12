import { ServiceError } from '../service-integration';
import {
  ExternalService,
  ExternalServiceConfig,
  ExternalServiceMetrics,
  AnalyticsEvent
} from './types';

export class AnalyticsService implements ExternalService {
  [key: string]: unknown;

  private connected = false;
  private metrics: ExternalServiceMetrics = {
    requestCount: 0,
    errorCount: 0,
    latency: 0,
    lastRequest: new Date()
  };
  private config: ExternalServiceConfig;
  private eventQueue: AnalyticsEvent[] = [];
  private flushInterval?: NodeJS.Timeout;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds
  private readonly MAX_QUEUE_SIZE = 100;

  constructor(config: ExternalServiceConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    await this.connect();
    this.startEventFlushing();
  }

  async connect(): Promise<void> {
    if (!this.config.apiKey) {
      throw new ServiceError('CONFIG_ERROR', 'Analytics service requires an API key');
    }
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.flushEvents(); // Flush remaining events before disconnecting
  }

  isConnected(): boolean {
    return this.connected;
  }

  getMetrics(): ExternalServiceMetrics {
    return { ...this.metrics };
  }

  async trackEvent(event: AnalyticsEvent): Promise<void> {
    if (!this.connected) {
      throw new ServiceError('CONNECTION_ERROR', 'Analytics service is not connected');
    }

    const startTime = Date.now();
    try {
      this.metrics.requestCount++;
      this.metrics.lastRequest = new Date();

      this.eventQueue.push({
        ...event,
        timestamp: event.timestamp || new Date()
      });

      if (this.eventQueue.length >= this.MAX_QUEUE_SIZE) {
        await this.flushEvents();
      }

      this.metrics.latency = Date.now() - startTime;
    } catch (error) {
      this.metrics.errorCount++;
      throw new ServiceError(
        'ANALYTICS_ERROR',
        error instanceof Error ? error.message : 'Failed to track event'
      );
    }
  }

  private startEventFlushing(): void {
    this.flushInterval = setInterval(async () => {
      if (this.eventQueue.length > 0) {
        await this.flushEvents();
      }
    }, this.FLUSH_INTERVAL);
  }

  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Here we would make the actual API call to the analytics provider
      // For now, we'll simulate sending the events
      console.log(`Flushing ${events.length} analytics events`);

      // Group events by type for better analysis
      const groupedEvents = events.reduce((acc, event) => {
        const { name } = event;
        if (!acc[name]) {
          acc[name] = [];
        }
        acc[name].push(event);
        return acc;
      }, {} as Record<string, AnalyticsEvent[]>);

      // Process each group
      for (const [eventName, eventGroup] of Object.entries(groupedEvents)) {
        console.log(`Processing ${eventGroup.length} ${eventName} events`);
        // Here we would batch process events by type
      }

    } catch (error) {
      // On error, add events back to the queue
      this.eventQueue.unshift(...events);
      this.metrics.errorCount++;
      throw new ServiceError(
        'ANALYTICS_ERROR',
        error instanceof Error ? error.message : 'Failed to flush events'
      );
    }
  }

  async dispose(): Promise<void> {
    await this.disconnect();
  }
}
