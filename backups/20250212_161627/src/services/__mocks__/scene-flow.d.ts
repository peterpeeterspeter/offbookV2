interface SceneFlowInstance {
    audioService: any;
    scriptAnalysisService: any;
    initializeSession: (scriptId: string, userRole: string) => Promise<{
        scenes: Array<{
            id: string;
            number: number;
            title: string;
            description: string;
            dialogue: Array<{
                id: string;
                role: string;
                text: string;
                emotion: string;
            }>;
        }>;
        stats: {
            duration: number;
            accuracy: number;
            emotions: Record<string, number>;
            sceneProgress: Record<string, number>;
            timingScore: number;
            emotionMatchRate: number;
        };
    }>;
    endSession: () => Promise<{
        duration: number;
        accuracy: number;
        emotions: Record<string, number>;
        sceneProgress: Record<string, number>;
        timingScore: number;
        emotionMatchRate: number;
    }>;
    getCurrentScene: () => {
        id: string;
        number: number;
        title: string;
        description: string;
        dialogue: Array<{
            id: string;
            role: string;
            text: string;
            emotion: string;
        }>;
    };
    getStats: () => {
        duration: number;
        accuracy: number;
        emotions: Record<string, number>;
        sceneProgress: Record<string, number>;
        timingScore: number;
        emotionMatchRate: number;
    };
}
export declare const SceneFlowService: {
    current: SceneFlowInstance | null;
    initialize: (audioService: any, scriptAnalysisService: any) => Promise<{
        audioService: any;
        scriptAnalysisService: any;
        initializeSession: (scriptId: string, userRole: string) => Promise<{
            scenes: {
                id: string;
                number: number;
                title: string;
                description: string;
                dialogue: {
                    id: string;
                    role: string;
                    text: string;
                    emotion: string;
                }[];
            }[];
            stats: {
                duration: number;
                accuracy: number;
                emotions: {
                    happy: number;
                    neutral: number;
                };
                sceneProgress: {
                    scene1: number;
                    scene2: number;
                };
                timingScore: number;
                emotionMatchRate: number;
            };
        }>;
        endSession: () => Promise<{
            duration: number;
            accuracy: number;
            emotions: {
                happy: number;
                neutral: number;
            };
            sceneProgress: {
                scene1: number;
                scene2: number;
            };
            timingScore: number;
            emotionMatchRate: number;
        }>;
        getCurrentScene: () => {
            id: string;
            number: number;
            title: string;
            description: string;
            dialogue: {
                id: string;
                role: string;
                text: string;
                emotion: string;
            }[];
        };
        getStats: () => {
            duration: number;
            accuracy: number;
            emotions: {
                happy: number;
                neutral: number;
            };
            sceneProgress: {
                scene1: number;
                scene2: number;
            };
            timingScore: number;
            emotionMatchRate: number;
        };
    }>;
};
export {};
