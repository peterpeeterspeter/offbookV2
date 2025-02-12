import { NextResponse } from 'next/server';
export declare function GET(): Promise<NextResponse<{
    timestamp: number;
    performance: {
        memory: import("../../../types").PipelineMetrics;
        cache: {
            hits: number;
            misses: number;
            ratio: number;
            totalRequests: number;
            averageLatency: number;
            frequentItemsRatio: number;
            uptime: number;
        };
        streaming: import("../../../types").StreamingMetrics | undefined;
    };
    errors: {
        total: number;
        byType: Record<string, number>;
    };
    health: import("../../../types/monitoring").HealthStatus;
    usage: {
        activeUsers: number;
        totalRequests: number;
        errorRate: number;
        cacheHitRate: number;
    };
}> | NextResponse<{
    status: string;
    timestamp: number;
    error: string;
}>>;
