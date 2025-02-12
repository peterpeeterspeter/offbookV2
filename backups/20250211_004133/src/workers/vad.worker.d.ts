import { VADState } from '../services/vad-service';
declare global {
    interface Performance {
        memory?: {
            usedJSHeapSize: number;
            jsHeapSizeLimit: number;
            totalJSHeapSize: number;
        };
    }
}
export interface VADWorkerMessage {
    type: 'processAudio' | 'configure' | 'terminate' | 'getMetrics';
    data: Float32Array | VADWorkerConfig;
}
export interface VADWorkerConfig {
    sampleRate: number;
    bufferSize: number;
    noiseThreshold: number;
    silenceThreshold: number;
    powerSaveMode?: boolean;
    mobileOptimization?: {
        enabled: boolean;
        batteryAware: boolean;
        adaptiveBufferSize: boolean;
        powerSaveMode: boolean;
    };
}
export interface VADWorkerResponse {
    type: 'state' | 'error' | 'metrics';
    data: VADState | Error | VADMetrics;
}
export interface VADMetrics {
    averageProcessingTime: number;
    peakMemoryUsage: number;
    totalSamplesProcessed: number;
    stateTransitions: number;
    errorCount: number;
}
