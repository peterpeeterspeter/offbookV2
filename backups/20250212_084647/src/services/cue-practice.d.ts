import { ScriptAnalysisService } from './script-analysis';
export interface Cue {
    id: string;
    type: 'line' | 'direction' | 'emotion';
    text: string;
    emotion?: string;
    timing?: {
        expectedDelay: number;
        actualDelay?: number;
    };
    associatedLineId: string;
}
export interface CueSession {
    id: string;
    scriptId: string;
    userRole: string;
    cues: Cue[];
    currentCueIndex: number;
    settings: CueSettings;
    stats: CueStats;
}
export interface CueSettings {
    useAudioSignal: boolean;
    showEmotionIndicators: boolean;
    autoAdvance: boolean;
    minDelay: number;
    maxDelay: number;
}
export interface CueStats {
    totalCues: number;
    completedCues: number;
    timingScores: number[];
    emotionMatches: number;
    averageDelay: number;
}
export interface CueResponse {
    cueId: string;
    timing: {
        cueStart: number;
        responseStart: number;
        responseEnd: number;
    };
    transcription: string;
    emotion?: string;
    confidence: number;
}
export declare class CuePracticeService {
    private sessions;
    private responses;
    private audioService;
    private scriptService;
    private audioContext;
    private cueSignal?;
    constructor(audioService: AudioService, scriptService: ScriptAnalysisService);
    private loadCueSignal;
    initializeSession(sessionId: string, scriptId: string, userRole: string, settings?: Partial<CueSettings>): Promise<CueSession>;
    private extractCues;
    private calculateExpectedDelay;
    triggerNextCue(sessionId: string): Promise<Cue | undefined>;
    processCueResponse(sessionId: string, cueId: string, audioData: ArrayBuffer): Promise<CueResponse>;
    private updateStats;
    getSessionStats(sessionId: string): CueStats | undefined;
    endSession(sessionId: string): Promise<CueStats | undefined>;
}
