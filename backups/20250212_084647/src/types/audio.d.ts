export declare enum AudioServiceState {
    UNINITIALIZED = "UNINITIALIZED",
    INITIALIZING = "INITIALIZING",
    READY = "READY",
    RECORDING = "RECORDING",
    ERROR = "ERROR"
}
export declare enum AudioServiceEvent {
    INITIALIZE = "INITIALIZE",
    INITIALIZED = "INITIALIZED",
    RECORDING_START = "RECORDING_START",
    RECORDING_STOP = "RECORDING_STOP",
    VAD_UPDATE = "VAD_UPDATE",
    ERROR = "ERROR",
    CLEANUP = "CLEANUP"
}
export declare enum AudioServiceError {
    INITIALIZATION_FAILED = "INITIALIZATION_FAILED",
    TTS_INITIALIZATION_FAILED = "TTS_INITIALIZATION_FAILED",
    RECORDING_FAILED = "RECORDING_FAILED",
    CLEANUP_FAILED = "CLEANUP_FAILED",
    PROCESSING_FAILED = "PROCESSING_FAILED",
    VAD_FAILED = "VAD_FAILED",
    NETWORK_TIMEOUT = "NETWORK_TIMEOUT"
}
export interface AudioConfig {
    sampleRate: number;
    channels: number;
    bitDepth: number;
}
export interface RecordingSession {
    id: string;
    startTime: number;
    duration: number;
    audioData: Float32Array;
}
export interface TTSConfig {
    voice: string;
    speed: number;
    pitch: number;
    volume: number;
}
export interface AudioServiceStateData {
    state: AudioServiceState;
    error?: AudioServiceError;
    context?: AudioContext;
    session?: RecordingSession;
}
export interface CueSignal {
    type: 'start' | 'stop';
    timestamp: number;
}
export interface CueDisplay {
    text: string;
    duration: number;
    emotion?: string;
}
export interface SceneProgression {
    currentScene: number;
    totalScenes: number;
    progress: number;
}
export declare const ERROR_RECOVERY_HINTS: Record<AudioServiceError, string>;
export interface AudioErrorDetails {
    code: AudioServiceError;
    message: string;
    details?: Record<string, unknown>;
    recoveryHint?: string;
}
export interface AudioServiceContext {
    audioContext: AudioContext;
    mediaRecorder?: MediaRecorder;
    audioWorklet?: AudioWorkletNode;
    vadProcessor?: AudioWorkletNode;
}
export interface AudioServiceSession {
    id: string;
    startTime: number;
    duration: number;
    audioData: Float32Array;
    metadata?: Record<string, unknown>;
}
export type StateTransitions = {
    [K in AudioServiceState]: {
        [E in AudioServiceEvent]?: AudioServiceState;
    };
};
