import type { MonitoringConfig } from '@/types/monitoring';
export declare const monitoringConfig: MonitoringConfig;
export declare const ERROR_SEVERITY_THRESHOLDS: {
    memory: {
        high: number;
        medium: number;
        low: number;
    };
    cpu: {
        high: number;
        medium: number;
        low: number;
    };
    errorRate: {
        high: number;
        medium: number;
        low: number;
    };
    latency: {
        high: number;
        medium: number;
        low: number;
    };
};
export declare const MONITORING_ENDPOINTS: {
    errors: string;
    metrics: string;
    health: string;
    alerts: string;
};
export declare const ALERT_THRESHOLDS: {
    errorSpike: number;
    latencySpike: number;
    memoryGrowth: number;
    cpuSpike: number;
};
export declare const MONITORING_INTERVALS: {
    metrics: number;
    health: number;
    cleanup: number;
};
export declare const RETENTION_POLICIES: {
    errors: number;
    metrics: number;
    alerts: number;
};
export declare const MONITORING_FEATURES: {
    enableRealTimeAlerts: boolean;
    enableHistoricalAnalysis: boolean;
    enableAnomalyDetection: boolean;
    enableAutomaticRecovery: boolean;
};
