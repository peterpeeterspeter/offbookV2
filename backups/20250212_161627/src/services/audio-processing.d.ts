export declare enum AudioFormat {
    WAV = "wav",
    MP3 = "mp3",
    AAC = "aac",
    FLAC = "flac",
    OGG = "ogg"
}
export declare enum StreamStatus {
    Inactive = "inactive",
    Active = "active",
    Paused = "paused",
    Completed = "completed",
    Error = "error"
}
export interface ProcessingOptions {
    sampleRate?: number;
    bitDepth?: number;
    channels?: number;
    normalize?: boolean;
    targetPeak?: number;
    compression?: {
        threshold: number;
        ratio: number;
        attack: number;
        release: number;
    };
}
export interface NoiseReductionOptions {
    threshold?: number;
    reduction?: number;
    preserveSpeech?: boolean;
    adaptive?: boolean;
    noiseProfile?: Float32Array;
}
export interface StreamOptions {
    chunkSize?: number;
    overlap?: number;
    realtime?: boolean;
}
export interface ProcessingMetrics {
    totalProcessingTime: number;
    averageChunkProcessingTime: number;
    peakMemoryUsage: number;
    totalChunksProcessed: number;
}
export interface ResourceMetrics {
    memoryUsage: number;
    bufferSize: number;
    processingLoad: number;
}
export interface PerformanceDiagnostics {
    bottlenecks: string[];
    recommendations: string[];
    metrics: ProcessingMetrics;
}
export interface AudioChunk {
    data: ArrayBuffer;
    timestamp: number;
    metadata?: Record<string, unknown>;
}
export declare class AudioProcessingService {
    private context;
    private processingWorker?;
    private streamController?;
    private status;
    private metrics;
    private chunkProcessedCallbacks;
    constructor();
    private initializeWorker;
    convertFormat(audioData: ArrayBuffer, options: {
        from: AudioFormat;
        to: AudioFormat;
        options?: {
            bitrate?: number;
        };
        metadata?: Record<string, unknown>;
        targetSize?: number;
    }): Promise<{
        format: AudioFormat;
        data: ArrayBuffer;
        size: number;
        metadata?: Record<string, unknown>;
    }>;
    enhanceQuality(audioBuffer: AudioBuffer, options: ProcessingOptions): Promise<AudioBuffer>;
    reduceNoise(audioBuffer: AudioBuffer, options: NoiseReductionOptions): Promise<{
        buffer: AudioBuffer;
        noiseFloor: number;
        frequencyResponse: {
            speech?: Float32Array;
        };
        reductionProfile: Float32Array;
        noiseProfile?: Float32Array;
    }>;
    processStream(stream: ReadableStream<ArrayBuffer>, options?: StreamOptions): Promise<StreamStatus>;
    createProcessingStream(): ReadableStream<AudioChunk>;
    pauseProcessing(): Promise<void>;
    resumeProcessing(): Promise<void>;
    getStreamStatus(): StreamStatus;
    onChunkProcessed(callback: (chunk: AudioChunk) => void): void;
    getProcessingMetrics(): ProcessingMetrics;
    getResourceMetrics(): Promise<ResourceMetrics>;
    runPerformanceDiagnostics(): Promise<PerformanceDiagnostics>;
    private processChunk;
    private sendWorkerMessage;
    private handleChunkProcessed;
    private handleProcessingError;
    private updateMetrics;
    private calculatePeak;
    private processAudioGraph;
    private audioBufferToArray;
    private concatenateBuffers;
    private estimateMemoryUsage;
    private calculateBufferSize;
    private calculateProcessingLoad;
    cleanup(): void;
}
