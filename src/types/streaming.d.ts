export interface StreamingMetrics {
    bufferUtilization: number;
    streamLatency: number;
    dropoutCount: number;
    recoveryTime: number;
    activeStreams: number;
    processingTime: number;
    networkLatency: number;
    adaptiveBufferSize: number;
    voiceChangeLatency: number;
    reconnectionCount: number;
    partialDataSize: number;
}
export interface PipelineMetrics {
    averageLatency: number;
    throughput: number;
    errorRate: number;
    queueUtilization: number;
    batchEfficiency: number;
}
export interface PerformanceMetrics {
    pipeline: PipelineMetrics;
    cache: CacheMetrics;
}
export interface CacheMetrics {
    hitRate: number;
    totalRequests: number;
    averageLatency: number;
    frequentItemsRatio: number;
    uptime: number;
}
declare global {
    interface Navigator {
        getBattery(): Promise<{
            level: number;
            charging: boolean;
            chargingTime: number;
            dischargingTime: number;
            addEventListener: (type: string, listener: EventListener) => void;
            removeEventListener: (type: string, listener: EventListener) => void;
        }>;
    }
    interface Performance {
        memory?: {
            usedJSHeapSize: number;
            totalJSHeapSize: number;
            jsHeapSizeLimit: number;
        };
    }
    interface Window {
        gc?: () => void;
    }
}
