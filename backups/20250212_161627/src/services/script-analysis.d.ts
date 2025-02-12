import type { AudioService, RecordingSession, TTSConfig } from '@/types/audio';
import type { DeepSeekR1Response, EmotionSceneAnalysis } from '@/types/analysis';
import type { UploadProgress } from '@/types/progress';
import type { Role, Scene, Script } from '@/types/script';
import type { PracticeMetrics } from '@/types/metrics';
export interface ScriptMetadata {
    title: string;
    description?: string;
    roles: Role[];
    scenes: Scene[];
    cues: Array<{
        type: 'dialogue' | 'emotion' | 'direction';
        text: string;
        lineNumber: number;
        role?: string;
    }>;
}
export interface PracticeSession {
    id: string;
    scriptId: string;
    mode: 'cue' | 'scene-flow' | 'line-by-line';
    startTime: Date;
    endTime?: Date;
    metrics: PracticeMetrics;
}
export declare class ScriptAnalysisService {
    private readonly audioService;
    private readonly onProgress?;
    private readonly ALLOWED_FILE_TYPES;
    private readonly MAX_FILE_SIZE;
    private readonly lineHighlights;
    private readonly lineProgress;
    private readonly cache;
    private currentSession;
    private isRecording;
    private batchProcessor;
    private readonly retryConfig;
    private readonly cacheConfig;
    constructor(audioService: AudioService, onProgress?: ((progress: UploadProgress) => void) | undefined);
    private updateProgress;
    initializeTTS(config: TTSConfig): Promise<void>;
    private initializeLineByLine;
    private initializeAudioService;
    private analyzeEmotions;
    analyzeEmotion(text: string): Promise<EmotionSceneAnalysis>;
    private convertToAnalysis;
    protected parseEmotionAnalysis(response: DeepSeekR1Response): EmotionSceneAnalysis;
    private calculateSceneMetrics;
    private readFile;
    private readPDF;
    private readDOCX;
    private cleanScriptText;
    private readTextFile;
    private extractRolesAndScenes;
    private extractCues;
    uploadScript(file: File, metadata: {
        title: string;
        description?: string;
    }): Promise<ScriptMetadata>;
    private getCacheKey;
    private hashText;
    private withRetry;
    private withCache;
    private updateMetrics;
    uploadAndAnalyze(file: File, metadata: ScriptMetadata, userId: string): Promise<Script>;
    getScriptDetails(scriptId: string): Promise<Script>;
    getAnalysisStatus(scriptId: string): Promise<{
        status: 'pending' | 'processing' | 'completed' | 'failed';
        progress: number;
    }>;
    updateRole(scriptId: string, roleId: string, updates: Partial<Role>): Promise<Role>;
    addNote(scriptId: string, note: {
        lineNumber: number;
        text: string;
        type: 'cue' | 'emotion' | 'direction';
    }): Promise<void>;
    assignVoice(scriptId: string, roleId: string, voiceId: string, voiceSettings?: TTSConfig['settings']): Promise<void>;
    startCuePractice(scriptId: string): Promise<PracticeSession>;
    startSceneFlow(scriptId: string, sceneId: string, userRole: string): Promise<PracticeSession>;
    startLineByLine(scriptId: string, lineIds: string[]): Promise<PracticeSession>;
    private initializeRecording;
    private getLineDetails;
    cleanup(): Promise<void>;
    private processOperation;
    stopRecording(): Promise<RecordingSession>;
    private getHighlights;
    static analyzeScript(text: string): Promise<EmotionSceneAnalysis>;
}
