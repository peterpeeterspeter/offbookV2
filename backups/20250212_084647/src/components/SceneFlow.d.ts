export interface DialogueLine {
    id: string;
    role: string;
    text: string;
    emotion?: string;
}
export interface Scene {
    id: string;
    number: number;
    title: string;
    description: string;
    dialogue: DialogueLine[];
}
export interface SceneStats {
    duration: number;
    accuracy: number;
    emotions: Record<string, number>;
    sceneProgress: Record<string, number>;
    timingScore: number;
    emotionMatchRate: number;
}
export interface SceneSettings {
    adaptivePacing: boolean;
    showEmotions: boolean;
    autoAdvance: boolean;
}
export interface SceneFlowProps {
    scriptId: string;
    userRole: string;
    initialScene?: number;
    onComplete?: (stats: SceneStats) => void;
    onError?: (error: string) => void;
}
export interface SceneFlowServiceType {
    initialize: (scriptId: string) => Promise<{
        scenes: Scene[];
        stats: SceneStats;
    }>;
    processScene: (sceneNumber: number) => Promise<{
        success: boolean;
        scene: Scene;
        stats: SceneStats;
    }>;
    cleanup: () => Promise<SceneStats>;
}
export interface AudioServiceType {
    setup: () => Promise<void>;
    startRecording: () => Promise<void>;
    stopRecording: () => Promise<{
        duration: number;
        accuracy: number;
    }>;
}
export default function SceneFlow({ scriptId, userRole, initialScene, onComplete, onError, }: SceneFlowProps): import("react").JSX.Element;
