import type { PerformanceMetrics, StreamingMetrics } from '@/types/streaming';
export declare class PerformanceAnalyzer {
    private memorySnapshots;
    private metricsHistory;
    private readonly MAX_HISTORY_LENGTH;
    private readonly MEMORY_THRESHOLD;
    private readonly CPU_THRESHOLD;
    private readonly LATENCY_THRESHOLD;
    private metrics;
    processData(data: unknown[]): Promise<void>;
    processLargeDataSet(data: unknown[]): Promise<void>;
    cleanup(): Promise<void>;
    runIntensiveOperation(): Promise<void>;
    getPerformanceMetrics(): Promise<PerformanceMetrics>;
    trackStreamingMetrics(metrics: StreamingMetrics): Promise<StreamingMetrics>;
    checkPerformanceThresholds(metrics: StreamingMetrics): Promise<{
        type: 'warning' | 'error';
        metric: string;
        value: number;
        threshold: number;
    } | null>;
    trackCPUUsage(): Promise<{
        percentage: number;
    }>;
    getMemoryStats(): Promise<{
        heapUsed: number;
        heapTotal: number;
        heapLimit: number;
    }>;
    getNetworkStats(): Promise<{
        bandwidth: number;
        latency: number;
    }>;
    getRTCStats(): Promise<{
        packetsLost: number;
        packetsTotal: number;
        bytesReceived: number;
        bytesSent: number;
    }>;
    generatePerformanceReport(): Promise<{
        memory: ReturnType<PerformanceAnalyzer['getMemoryStats']>;
        battery: {
            level: number;
            charging: boolean;
        };
        streaming: StreamingMetrics;
        resources: {
            cpu: ReturnType<PerformanceAnalyzer['trackCPUUsage']>;
            network: ReturnType<PerformanceAnalyzer['getNetworkStats']>;
        };
    }>;
    measureAudioProcessing(): Promise<{
        processingTime: number;
        bufferUnderruns: number;
        latency: number;
    }>;
    measureNetworkResilience(conditions: {
        latency: number;
        jitter: number;
        packetLoss: number;
    }): Promise<{
        reconnections: number;
        dataLoss: number;
        adaptiveBuffering: boolean;
    }>;
    private trackPerformance;
    private measureStreamLatency;
    private measureProcessingTime;
    private countBufferUnderruns;
    private countReconnections;
    private measureDataLoss;
    private checkAdaptiveBuffering;
}
