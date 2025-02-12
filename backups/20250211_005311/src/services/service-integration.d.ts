export declare enum ServiceEvent {
    ProcessAudio = "process_audio",
    AudioProcessed = "audio_processed",
    AudioError = "audio_error",
    UpdateScene = "update_scene",
    SceneUpdated = "scene_updated",
    SceneError = "scene_error",
    ResourceAllocated = "resource_allocated",
    ResourceReleased = "resource_released",
    ResourceError = "resource_error",
    HealthCheck = "health_check",
    HealthStatus = "health_status",
    ServiceDegraded = "service_degraded",
    ConfigUpdate = "config_update",
    ConfigChanged = "config_changed",
    ConfigError = "config_error",
    ServiceDiscovered = "service_discovered",
    ServiceLost = "service_lost",
    ServiceChanged = "service_changed"
}
export declare class ServiceError extends Error {
    code: string;
    constructor(code: string, message: string);
}
export interface ServiceState {
    [key: string]: unknown;
}
export interface ServiceMetrics {
    resourceEfficiency: number;
    processingTime: number;
    memoryUsage: number;
}
export interface ServiceHealth {
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastCheck: number;
    metrics: {
        responseTime: number;
        errorRate: number;
        uptime: number;
    };
    issues?: string[];
}
export interface ServiceVersion {
    major: number;
    minor: number;
    patch: number;
    features: string[];
    compatibleWith: string[];
}
export interface ServiceConfig {
    settings: Record<string, unknown>;
    defaults: Record<string, unknown>;
    overrides: Record<string, unknown>;
    schema?: Record<string, unknown>;
}
export interface ServiceDiscoveryInfo {
    id: string;
    name: string;
    version: ServiceVersion;
    capabilities: string[];
    endpoints?: string[];
}
export interface Service {
    initialize?: (dependencies: Record<string, Service>) => Promise<void>;
    dispose?: () => Promise<void>;
    dependencies?: string[];
    version?: ServiceVersion;
    health?: () => Promise<ServiceHealth>;
    configure?: (config: ServiceConfig) => Promise<void>;
    discover?: () => Promise<ServiceDiscoveryInfo>;
    [key: string]: unknown;
}
type EventCallback = (data: unknown, cancel?: () => void) => void | Promise<void>;
type ErrorHandler = (error: ServiceError) => Promise<{
    retry: boolean;
}>;
export declare class ServiceIntegration {
    private services;
    private eventHandlers;
    private errorHandlers;
    private resources;
    private state;
    private stateHistory;
    private metrics;
    private listeners;
    private healthChecks;
    private configurations;
    private discoveryCache;
    private versionRegistry;
    private healthCheckInterval?;
    constructor(options?: {
        healthCheckInterval?: number;
        enableDiscovery?: boolean;
        autoConfig?: boolean;
    });
    private startHealthMonitoring;
    registerService(name: string, service: Service, version?: ServiceVersion): Promise<void>;
    removeService(name: string): Promise<void>;
    on(event: ServiceEvent, callback: EventCallback): void;
    onError(callback: (error: {
        service: string;
        error: Error;
    }) => void): void;
    onRecovery(callback: (details: {
        service: string;
        error: ServiceError;
    }) => void): void;
    onStateConflict(callback: (details: {
        services: string[];
        states: ServiceState[];
    }) => void): void;
    onResourceContention(callback: (details: {
        resource: string;
        requesters: string[];
    }) => void): void;
    setErrorHandler(service: string, handler: ErrorHandler): void;
    dispatch(event: ServiceEvent, data: unknown): Promise<ServiceMetrics>;
    getServiceState(service: string): ServiceState;
    getStateHistory(): Array<Record<string, ServiceState>>;
    registerSharedResource(type: string, data: SharedArrayBuffer): string;
    releaseResource(id: string): Promise<void>;
    getResourceUsage(type: string): number;
    private handleError;
    private findAffectedService;
    private updateResourceMetrics;
    getServiceHealth(name: string): Promise<ServiceHealth>;
    configureService(name: string, config: Partial<ServiceConfig>): Promise<void>;
    discoverServices(capability?: string): Promise<ServiceDiscoveryInfo[]>;
    private isCompatible;
    private emit;
    dispose(): void;
}
export {};
