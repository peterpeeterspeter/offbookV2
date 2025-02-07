import { AudioServiceState, AudioServiceEvent, AudioErrorDetails, AudioServiceError, AudioServiceStateData as IAudioServiceStateData } from '@/types/audio';
/**
 * Audio service state interface
 */
export interface AudioServiceStateData {
    state: AudioServiceState;
    error: AudioErrorDetails | null;
    session: {
        id: string | null;
        startTime: number | null;
        duration: number | null;
        chunks: number;
    };
    context: {
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
    };
    vad?: {
        speaking: boolean;
        noiseLevel: number;
        lastActivity: number;
        confidence: number;
    };
}
/**
 * Error recovery hints
 */
export declare const ERROR_RECOVERY_HINTS: Partial<Record<AudioServiceError, string>>;
/**
 * State manager for audio service
 */
export declare class AudioStateManager {
    private static instance;
    private state;
    private constructor();
    static getInstance(): AudioStateManager;
    getState(): IAudioServiceStateData;
    transition(event: AudioServiceEvent, context?: Partial<IAudioServiceStateData>): void;
    createError(code: AudioServiceError, details?: Record<string, unknown>): AudioErrorDetails;
    restore(): void;
}
