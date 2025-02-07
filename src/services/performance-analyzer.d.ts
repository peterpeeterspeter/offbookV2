import type { PerformanceMetrics, StreamingMetrics } from '@/types/streaming';
export declare class PerformanceAnalyzer {
    private memorySnapshots;
    private metricsHistory;
    private readonly MAX_HISTORY_LENGTH;
    private readonly MEMORY_THRESHOLD;
    private readonly CPU_THRESHOLD;
    private readonly LATENCY_THRESHOLD;
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
        external: number;
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
    private trackPerformance;
}
