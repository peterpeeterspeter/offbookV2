import { PerformanceProfile } from '@/types/mobile';
export declare class PerformanceProfiler {
    private deviceDetector;
    private performanceObserver;
    private metrics;
    constructor();
    startProfiling(): Promise<void>;
    stopProfiling(): Promise<PerformanceProfile>;
    private setupPerformanceObserver;
    private startFPSMonitoring;
    private startMemoryMonitoring;
    private startNetworkMonitoring;
    private startBatteryMonitoring;
    private processResourceTiming;
    private getResourceType;
    private generateReport;
    private getResourceMetrics;
    private getPerformanceMetrics;
    private getFCP;
    private getLCP;
    private getFID;
    private getTTI;
    private getTBT;
    private calculateAverage;
}
