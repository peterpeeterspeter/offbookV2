import { DeepSeekResponse, Scene, CharacterDevelopmentMetrics, ServiceMetrics } from './types';
interface ISceneAnalysis extends Scene {
    mood: string;
    atmosphere: string;
    complexity: number;
    pacing: {
        speed: 'slow' | 'moderate' | 'fast';
        suggestions: string[];
    };
    transitions: {
        entry: string;
        exit: string;
    };
    relationships: Array<{
        characters: [string, string];
        dynamic: string;
        intensity: number;
    }>;
}
interface ISceneMetrics {
    complexity: {
        dialogueCount: number;
        characterCount: number;
        emotionalShifts: number;
        subplotLayers: number;
    };
    pacing: {
        averageLineLength: number;
        dialogueFrequency: number;
        actionDensity: number;
    };
    intensity: {
        emotional: number;
        dramatic: number;
        physical: number;
    };
}
export declare function getPerformanceMetrics(): ServiceMetrics;
export declare function resetMetrics(): void;
export declare function detectEmotions(text: string): Promise<DeepSeekResponse>;
export declare class DeepSeekService {
    private readonly API_URL;
    private readonly API_KEY;
    constructor();
    private executeRequest;
    private fetchWithTimeout;
    analyzeSceneDetails(scene: Scene): Promise<ISceneAnalysis>;
    calculateSceneMetrics(scene: Scene): Promise<ISceneMetrics>;
    analyzeCharacterDevelopment(text: string): Promise<CharacterDevelopmentMetrics>;
    calculateCharacterMetrics(scriptId: string, characterName: string): Promise<CharacterDevelopmentMetrics>;
}
export {};
