import type { SceneFlowServiceType } from "@/components/SceneFlow";
/**
 * Represents a single line of dialogue in a scene
 */
export interface DialogueLine {
    id: string;
    role: string;
    text: string;
    emotion?: string;
}
/**
 * Represents a scene in the script
 */
export interface Scene {
    id: string;
    number: number;
    title: string;
    description: string;
    dialogue: DialogueLine[];
}
/**
 * Statistics collected during a rehearsal session
 */
export interface SessionStats {
    duration: number;
    accuracy: number;
    emotions: Record<string, number>;
    sceneProgress: Record<string, number>;
    timingScore: number;
    emotionMatchRate: number;
}
/**
 * Represents an active rehearsal session
 */
export interface Session {
    scenes: Scene[];
    stats: SessionStats;
}
/**
 * Implementation of the SceneFlow service using the Singleton pattern.
 * Manages script rehearsal sessions including scene progression and performance tracking.
 */
declare class SceneFlowServiceImpl implements SceneFlowServiceType {
    private session;
    private static instance;
    private constructor();
    static getInstance(): SceneFlowServiceImpl;
    /**
     * Initializes a new rehearsal session with the given script and user role
     * @param scriptId - Unique identifier for the script
     * @param userRole - Role the user will be rehearsing
     * @throws Error if script initialization fails
     * @returns Promise resolving to scenes and initial stats
     */
    initializeSession(scriptId: string, userRole: string): Promise<{
        scenes: Scene[];
        stats: SessionStats;
    }>;
    /**
     * Legacy initialization method - prefer using initializeSession instead
     * @deprecated Use initializeSession with explicit userRole instead
     */
    initialize(scriptId: string): Promise<{
        scenes: Scene[];
        stats: SessionStats;
    }>;
    /**
     * Processes a scene during rehearsal, updating session statistics
     * @param sceneNumber - The scene number to process
     * @throws Error if session not initialized or scene not found
     * @returns Promise resolving to scene processing results
     */
    processScene(sceneNumber: number): Promise<{
        success: boolean;
        scene: Scene;
        stats: SessionStats;
    }>;
    /**
     * Ends the current session and returns final statistics
     * @throws Error if no active session exists
     * @returns Promise resolving to final session statistics
     */
    endSession(): Promise<SessionStats>;
    /**
     * Internal cleanup method to reset session state
     * @private
     */
    cleanup(): Promise<SessionStats>;
}
/**
 * Singleton instance of the SceneFlow service
 */
export declare const SceneFlowService: {
    current: SceneFlowServiceImpl;
};
export {};
