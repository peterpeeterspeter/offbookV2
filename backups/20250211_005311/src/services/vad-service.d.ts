import { VADMetrics } from '../workers/vad.worker';
export interface VADConfig {
    sampleRate: number;
    bufferSize: number;
    noiseThreshold: number;
    silenceThreshold: number;
}
export interface VADState {
    speaking: boolean;
    noiseLevel: number;
    lastActivity: number;
    confidence: number;
}
export interface VADOptions {
    sampleRate: number;
    bufferSize: number;
    noiseThreshold: number;
    silenceThreshold: number;
    mobileOptimization?: {
        enabled: boolean;
        batteryAware: boolean;
        adaptiveBufferSize: boolean;
        powerSaveMode: boolean;
    };
}
export interface DeviceCapabilities {
    isMobile: boolean;
    hasBatteryAPI: boolean;
    cpuCores: number;
    hasLowLatencyAudio: boolean;
    hasWebWorker: boolean;
    hasPerformanceAPI: boolean;
}
export interface VADPerformanceMetrics extends VADMetrics {
    deviceCapabilities: DeviceCapabilities;
    batteryLevel?: number;
    isCharging?: boolean;
    audioContextLatency?: number;
}
type VADStateListener = (state: VADState) => void;
type VADErrorListener = (error: Error) => void;
type VADMetricsListener = (metrics: VADPerformanceMetrics) => void;
/**
 * Voice Activity Detection service using WebRTC
 */
export declare class VADService {
    private worker;
    private stateListeners;
    private errorListeners;
    private metricsListeners;
    private options;
    private deviceCapabilities;
    private batteryManager;
    private isLowPower;
    private audioContext;
    private metricsInterval;
    private lastMetrics;
    private scrollTimeout;
    private isProcessingPaused;
    private config;
    private mediaStream;
    private processor;
    constructor(config: VADConfig);
    private detectDeviceCapabilities;
    private initializeBatteryMonitoring;
    private handleBatteryChange;
    private getOptimalBufferSize;
    private updateWorkerConfig;
    initialize(stream: MediaStream): Promise<void>;
    private createDefaultAudioProcessor;
    private createOptimizedAudioProcessor;
    private processAudioData;
    private calculateRMS;
    private calculateConfidence;
    private handleWorkerMessage;
    private handleWorkerError;
    private handleMetricsUpdate;
    private startPerformanceMonitoring;
    addStateListener(listener: VADStateListener): () => void;
    removeStateListener(listener: VADStateListener): void;
    addErrorListener(listener: VADErrorListener): () => void;
    addMetricsListener(listener: VADMetricsListener): () => void;
    private notifyStateListeners;
    private notifyError;
    private notifyMetricsListeners;
    private initializeAudioContext;
    private getSafariOptimalBufferSize;
    private setupSafariOptimizations;
    private _eventListeners;
    private cleanup;
    dispose(): void;
    start(): Promise<void>;
    stop(): Promise<void>;
}
export {};
