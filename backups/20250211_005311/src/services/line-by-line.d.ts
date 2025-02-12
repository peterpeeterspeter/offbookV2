import { ScriptAnalysisService } from './script-analysis';
export interface TeleprompterLine {
    id: string;
    text: string;
    role: string;
    emotion?: string;
    isUserLine: boolean;
    status: 'previous' | 'current' | 'next' | 'hidden';
    timing?: {
        start: number;
        duration: number;
        delay: number;
    };
    style?: LineStyle;
    scrollOffset?: number;
}
export interface TeleprompterState {
    currentLineIndex: number;
    visibleLines: TeleprompterLine[];
    contextWindow: {
        previous: number;
        next: number;
    };
    autoScroll: boolean;
    scrollSpeed: number;
}
export interface LineByLineControls {
    isPaused: boolean;
    repeatMode: boolean;
    autoAdvance: boolean;
    showEmotions: boolean;
    contextSize: number;
}
export interface PracticeStats {
    totalLines: number;
    completedLines: number;
    repeatedLines: Array<{
        lineId: string;
        repeatCount: number;
        averageDelay: number;
    }>;
    timing: {
        startTime: number;
        totalPauseDuration: number;
        averageLineDelay: number;
    };
}
export interface SpeechAnalysis {
    text: string;
    confidence: number;
    timing: {
        start: number;
        end: number;
        duration: number;
    };
    emotion?: {
        type: string;
        intensity: number;
    };
    pronunciation: {
        score: number;
        feedback: string[];
        phonemes: Array<{
            expected: string;
            actual: string;
            score: number;
        }>;
    };
    performance: {
        pace: number;
        fluency: number;
        expressiveness: number;
        matchesEmotion: boolean;
    };
}
export interface LineStyle {
    fontSize: string;
    opacity: number;
    highlight: boolean;
    transition: string;
}
export interface UIConfig {
    currentLine: LineStyle;
    previousLine: LineStyle;
    nextLine: LineStyle;
    hiddenLine: LineStyle;
    scrollBehavior: {
        duration: number;
        easing: string;
    };
}
export interface WhisperTranscription {
    text: string;
    confidence: number;
    emotion?: string;
}
export interface RecordingSession {
    audioData: ArrayBuffer;
    transcription: WhisperTranscription;
    timing: {
        start: number;
        end?: number;
    };
}
export interface DetailedStats extends PracticeStats {
    pronunciationScores: number[];
    emotionMatches: number;
    totalAttempts: number;
}
export interface AudioService {
    transcribe(audioData: ArrayBuffer): Promise<WhisperTranscription>;
    comparePhonemes(actual: string, expected: string): Promise<Array<{
        expected: string;
        actual: string;
        score: number;
    }>>;
    detectEmotion(audioData: ArrayBuffer): Promise<{
        type: string;
        intensity: number;
    }>;
}
export declare class LineByLineService {
    private teleprompterStates;
    private controls;
    private stats;
    private audioService;
    private scriptService;
    private cachedAudio;
    private speechAnalyses;
    private uiConfig;
    private detailedStats;
    constructor(audioService: AudioService, scriptService: ScriptAnalysisService);
    initializeSession(sessionId: string, scriptId: string, userRole: string, initialControls?: Partial<LineByLineControls>, uiConfig?: Partial<UIConfig>): Promise<void>;
    private parseScriptLines;
    private estimateLineDuration;
    private precacheOpponentLines;
    private formatLineWithEmotion;
    advanceToNextLine(sessionId: string): Promise<void>;
    playCurrentLine(sessionId: string): Promise<void>;
    togglePause(sessionId: string): Promise<boolean>;
    toggleRepeatMode(sessionId: string): Promise<boolean>;
    updateControls(sessionId: string, updates: Partial<LineByLineControls>): Promise<LineByLineControls>;
    getState(sessionId: string): {
        teleprompter: TeleprompterState;
        controls: LineByLineControls;
        stats: PracticeStats;
    } | undefined;
    private getAllLines;
    processUserSpeech(sessionId: string, audioChunk: Float32Array): Promise<void>;
    private analyzeSpeech;
    private updateDetailedStats;
    private generatePronunciationFeedback;
    private provideFeedback;
    private getCurrentLine;
    private updateLineStyles;
    private calculateScrollOffset;
    updateUIConfig(sessionId: string, updates: Partial<UIConfig>): Promise<UIConfig>;
    getUIConfig(sessionId: string): UIConfig | undefined;
    private calculatePerformance;
    private calculateFluencyScore;
    private calculateExpressivenessScore;
    private doesEmotionMatch;
}
