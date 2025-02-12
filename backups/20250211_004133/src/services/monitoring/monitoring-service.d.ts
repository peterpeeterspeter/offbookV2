import type { ErrorReport, HealthStatus, PerformanceMetrics } from '@/types/monitoring';
export declare class MonitoringService {
    private static instance;
    private errorReports;
    private performanceMetrics;
    private healthStatus;
    private analyzer;
    private intervals;
    private constructor();
    static getInstance(): MonitoringService;
    private setupErrorTracking;
    private setupPerformanceTracking;
    private setupHealthChecks;
    private getHealthDetails;
    private determineErrorSeverity;
    private checkPerformanceThresholds;
    private triggerAlert;
    private triggerHealthAlert;
    trackError(error: ErrorReport): void;
    trackPerformanceMetric(metric: PerformanceMetrics): void;
    getHealthStatus(): Promise<HealthStatus>;
    private checkAudioService;
    private checkStorageService;
    private checkNetworkConnectivity;
    generateReport(): Promise<{
        errors: ErrorReport[];
        performance: PerformanceMetrics[];
        health: HealthStatus;
    }>;
    cleanup(): void;
}
export declare const monitoringService: MonitoringService;
