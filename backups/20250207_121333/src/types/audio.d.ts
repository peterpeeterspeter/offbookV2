/**
 * Core audio service types and interfaces
 */
export declare enum AudioServiceState {
    UNINITIALIZED = "UNINITIALIZED",
    INITIALIZING = "INITIALIZING",
    READY = "READY",
    RECORDING = "RECORDING",
    PROCESSING = "PROCESSING",
    ERROR = "ERROR",
    VAD_INITIALIZING = "VAD_INITIALIZING",
    VAD_READY = "VAD_READY",
    VAD_PROCESSING = "VAD_PROCESSING"
}
export declare enum AudioServiceEvent {
    INITIALIZE = "INITIALIZE",
    INITIALIZED = "INITIALIZED",
    TTS_INITIALIZED = "TTS_INITIALIZED",
    RECORDING_START = "RECORDING_START",
    RECORDING_STOP = "RECORDING_STOP",
    PROCESSING_START = "PROCESSING_START",
    PROCESSING_COMPLETE = "PROCESSING_COMPLETE",
    VAD_UPDATE = "VAD_UPDATE",
    ERROR = "ERROR",
    CLEANUP = "CLEANUP"
}
export declare enum AudioServiceError {
    INITIALIZATION_FAILED = "INITIALIZATION_FAILED",
    TTS_INITIALIZATION_FAILED = "TTS_INITIALIZATION_FAILED",
    RECORDING_FAILED = "RECORDING_FAILED",
    PROCESSING_FAILED = "PROCESSING_FAILED",
    CLEANUP_FAILED = "CLEANUP_FAILED",
    VAD_FAILED = "VAD_FAILED"
}
export declare enum AudioErrorCategory {
    DEVICE = "DEVICE",
    PERMISSION = "PERMISSION",
    BROWSER = "BROWSER",
    NETWORK = "NETWORK",
    RESOURCE = "RESOURCE",
    SYSTEM = "SYSTEM"
}
export interface AudioErrorDetails {
    category: AudioErrorCategory;
    code: AudioServiceError;
    message: string;
    timestamp: number;
    retryable: boolean;
    context?: Record<string, unknown>;
}
export interface AudioServiceContext {
    sampleRate: number;
    channels: number;
    isContextRunning: boolean;
    networkTimeout?: number;
    bitsPerSample?: number;
    bufferSize?: number;
    compressionFormat?: string;
    vadEnabled: boolean;
    vadThreshold: number;
    vadSampleRate: number;
    vadBufferSize: number;
    noiseThreshold: number;
    silenceThreshold: number;
}
export interface AudioServiceSession {
    id: string | null;
    startTime: number | null;
    duration: number | null;
    chunks: number;
}
export interface AudioServiceStateData {
    state: AudioServiceState;
    error: AudioErrorDetails | null;
    context: AudioServiceContext;
    session: AudioServiceSession;
    vad?: {
        speaking: boolean;
        noiseLevel: number;
        lastActivity: number;
        confidence: number;
    };
}
export interface TTSSession {
    id: string;
    voiceId: string;
    settings: TTSConfig['settings'];
    cache: Map<string, ArrayBuffer>;
}
export interface AudioConfig {
    sampleRate: number;
    channels: number;
    encoding: 'LINEAR16' | 'FLAC' | 'MULAW';
}
export interface RecordingTiming {
    start: number;
    end?: number;
    segments: Array<{
        start: number;
        end: number;
        text: string;
    }>;
}
export interface RecordingResult {
    duration: number;
    accuracy: number;
    timing: RecordingTiming;
    transcription: string;
}
export interface RecordingSession {
    id: string;
    startTime: Date;
    duration: number;
    audioUrl: string;
    accuracy: number;
    timing: RecordingTiming;
    transcription: string;
    isActive: boolean;
}
export interface TTSConfig {
    voiceId: string;
    settings: {
        stability: number;
        similarity_boost: number;
        style: number;
        use_speaker_boost: boolean;
    };
}
export interface AudioService {
    setup(): Promise<void>;
    startRecording(): Promise<void>;
    stopRecording(): Promise<RecordingResult>;
    getCurrentSession(): Promise<RecordingSession | null>;
    initializeTTS(config: TTSConfig): Promise<void>;
    cleanup(): Promise<void>;
    getState(): AudioServiceStateData;
}
export type StateTransitions = {
    [S in AudioServiceState]: {
        [E in AudioServiceEvent]?: AudioServiceState;
    };
};
export declare const ERROR_MESSAGES: Record<AudioServiceError, string>;
export declare const ERROR_RECOVERY_HINTS: Record<AudioServiceError, string>;
