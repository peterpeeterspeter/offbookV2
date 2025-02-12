export interface WhisperOptions {
    websocketUrl: string;
    mobileOptimization?: {
        enabled: boolean;
        batteryAware: boolean;
        adaptiveQuality: boolean;
        networkAware: boolean;
    };
}
type QualityLevel = 'low' | 'medium' | 'high';
export declare class WhisperService {
    private options;
    private deviceCapabilities;
    private batteryManager;
    private isLowPower;
    private isOffline;
    private isBackgrounded;
    private currentQualityLevel;
    private socket;
    private transcriptionCache;
    private reconnectAttempts;
    private readonly MAX_RECONNECT_ATTEMPTS;
    private readonly CACHE_TTL;
    private readonly QUALITY_CHANGE_DEBOUNCE;
    private qualityChangeTimeout;
    constructor(options: WhisperOptions);
    private initializeVisibilityTracking;
    private handleVisibilityChange;
    private handleMemoryWarning;
    private handleAudioInterruption;
    private cleanupCache;
    private detectDeviceCapabilities;
    initialize(): Promise<void>;
    private initializeMobileOptimizations;
    private initializeBatteryMonitoring;
    private handleBatteryChange;
    private initializeNetworkMonitoring;
    private handleNetworkChange;
    private updateQualityLevel;
    private getOptimalChunkSize;
    private initializeWebSocket;
    private handleWebSocketError;
    private handleWebSocketClose;
    dispose(): void;
    onQualityChange?: (level: QualityLevel) => void;
    onError?: (error: Error) => void;
    transcribeAudio(blob: Blob): Promise<string>;
    private processAudio;
}
export {};
