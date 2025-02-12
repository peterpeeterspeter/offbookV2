import { ExternalService, ExternalServiceConfig, ExternalServiceMetrics, AnalyticsEvent } from './types';
export declare class AnalyticsService implements ExternalService {
    [key: string]: unknown;
    private connected;
    private metrics;
    private config;
    private eventQueue;
    private flushInterval?;
    private readonly FLUSH_INTERVAL;
    private readonly MAX_QUEUE_SIZE;
    constructor(config: ExternalServiceConfig);
    initialize(): Promise<void>;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    getMetrics(): ExternalServiceMetrics;
    trackEvent(event: AnalyticsEvent): Promise<void>;
    private startEventFlushing;
    private flushEvents;
    dispose(): Promise<void>;
}
