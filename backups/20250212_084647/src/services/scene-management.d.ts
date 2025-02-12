export interface Scene {
    id: string;
    name: string;
    actors: string[];
    lines: Line[];
    transitions: {
        next: string | null;
        prev: string | null;
    };
}
export interface Line {
    id: string;
    actorId: string;
    text: string;
    timing: number;
}
export interface Actor {
    id: string;
    name: string;
    roles: string[];
}
export interface SceneProgress {
    sceneId: string;
    completedLines: string[];
    timestamp: number;
}
export interface LinePerformance {
    duration: number;
    accuracy: number;
    emotion: string;
}
export interface PerformanceMetrics {
    lines: {
        [lineId: string]: {
            duration: number;
            accuracy: number;
            emotion: string;
            attempts: number;
        };
    };
}
export declare class SceneManagementService {
    private scenes;
    private actors;
    private currentSceneIndex;
    private progress;
    private performance;
    private availableActors;
    constructor();
    loadScenes(scenes: Scene[]): Promise<void>;
    loadActors(actors: Actor[]): Promise<void>;
    getScenesCount(): number;
    getCurrentScene(): Scene | null;
    nextScene(): void;
    previousScene(): void;
    hasNextScene(): boolean;
    hasPreviousScene(): boolean;
    isActorAvailable(actorId: string): boolean;
    setActorUnavailable(actorId: string): void;
    reassignActor(fromActorId: string, toActorId: string, lineIds: string[]): void;
    updateProgress(progress: SceneProgress): void;
    getSceneProgress(sceneId: string): SceneProgress | null;
    recordLinePerformance(lineId: string, performance: LinePerformance): void;
    getPerformanceMetrics(sceneId: string): PerformanceMetrics | null;
    getScenePerformanceSummary(sceneId: string): {
        averageAccuracy: number;
    };
    getPerformanceIssues(sceneId: string): string[];
    loadProgress(): Promise<Record<string, SceneProgress>>;
    saveProgress(progress?: Record<string, SceneProgress>): Promise<void>;
    private cleanupOldProgress;
    private isValidProgressData;
    private isValidScene;
    private isValidActorList;
}
