import type { AudioService as IAudioService, TTSConfig, RecordingResult, RecordingSession as IRecordingSession, AudioServiceStateData } from '@/types/audio';
/**
 * Implementation of the audio service handling recording, playback,
 * and text-to-speech functionality for script rehearsal
 */
declare class AudioServiceImpl implements IAudioService {
    private static instance;
    private audioContext;
    private mediaRecorder;
    private mediaStream;
    private audioChunks;
    private stateManager;
    private vadService;
    private isCleaningUp;
    private isRecording;
    private currentSession;
    private currentTTSSession;
    private constructor();
    static getInstance(): AudioServiceImpl;
    setup(): Promise<void>;
    startRecording(): Promise<void>;
    stopRecording(): Promise<RecordingResult>;
    getCurrentSession(): Promise<IRecordingSession | null>;
    initializeTTS(config: TTSConfig): Promise<void>;
    cleanup(): Promise<void>;
    getState(): AudioServiceStateData;
    private initializeVAD;
}
export declare const AudioService: AudioServiceImpl;
export {};
