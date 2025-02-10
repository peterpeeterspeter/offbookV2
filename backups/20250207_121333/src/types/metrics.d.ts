export interface ServiceMetrics {
    timestamp: number;
    service: string;
    metrics: {
        latency: number;
        throughput: number;
        errorRate: number;
        resourceUsage: {
            cpu: number;
            memory: number;
            network: number;
        };
        customMetrics?: Record<string, number>;
    };
}
export interface MetricsHistory {
    serviceId: string;
    metrics: ServiceMetrics[];
    aggregates: {
        averageLatency: number;
        peakThroughput: number;
        errorRatePercentile: number;
        resourceUtilization: {
            averageCpu: number;
            averageMemory: number;
            peakNetwork: number;
        };
    };
}
export interface PerformanceAlert {
    type: 'warning' | 'error';
    service: string;
    metric: string;
    value: number;
    threshold: number;
    timestamp: number;
    context?: Record<string, unknown>;
}
export interface PracticeMetrics {
    timing: {
        averageDelay: number;
        maxDelay: number;
        minDelay: number;
        responseDelays: number[];
    };
    accuracy: {
        correctLines: number;
        totalLines: number;
        accuracy: number;
    };
    emotions: {
        matchedEmotions: number;
        totalEmotionalCues: number;
        emotionAccuracy: number;
    };
}
