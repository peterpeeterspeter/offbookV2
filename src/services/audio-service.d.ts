import type { AudioServiceType } from "@/components/SceneFlow";
import type { AudioServiceStateData } from './audio-state';
import type { RecordingSession, TTSConfig } from '@/types/audio';
declare global {
    interface Window {
        webkitAudioContext: typeof AudioContext;
    }
}
/**
 * Audio configuration
 */
/**
 * Represents an active recording session
 */
/**
 * Represents an active text-to-speech session
 */
/**
 * Cue signal for scene progression
 */
/**
 * Visual cue display configuration
 */
/**
 * Scene progression tracking
 */
/**
 * Implementation of the audio service handling recording, playback,
 * and text-to-speech functionality for script rehearsal
 */
declare class AudioServiceImpl implements AudioServiceType {
    private static instance;
    private audioContext;
    private mediaRecorder;
    private mediaStream;
    private audioChunks;
    private stateManager;
    private vadService;
    private isCleaningUp;
    private currentSession;
    private constructor();
    static getInstance(): AudioServiceImpl;
    static getState(): AudioServiceStateData;
    /**
     * Initialize audio service with VAD support
     */
    setup(): Promise<void>;
    /**
     * Initialize VAD service
     */
    private initializeVAD;
    /**
     * Start recording audio
     */
    startRecording(): Promise<void>;
    /**
     * Stop recording and return the recorded audio
     */
    stopRecording(): Promise<{
        duration: number;
        accuracy: number;
    }>;
    /**
     * Clean up resources
     */
    cleanup(): Promise<void>;
    /**
     * Get current state
     */
    getState(): AudioServiceStateData;
    getCurrentSession(): Promise<RecordingSession | null>;
    initializeTTS(config: TTSConfig): Promise<void>;
    processAudioData(buffer: ArrayBuffer): Promise<void>;
}
/**
 * Singleton instance of the audio service
 */
export declare const AudioService: AudioServiceImpl;
export {};
