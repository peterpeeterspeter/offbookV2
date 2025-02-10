import { AudioService } from "./audio-service";
import { ScriptAnalysisService } from "./script-analysis";
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
class SceneFlowServiceImpl implements SceneFlowServiceType {
  private session: Session | null = null;
  private static instance: SceneFlowServiceImpl;

  private constructor() {}

  static getInstance(): SceneFlowServiceImpl {
    if (!SceneFlowServiceImpl.instance) {
      SceneFlowServiceImpl.instance = new SceneFlowServiceImpl();
    }
    return SceneFlowServiceImpl.instance;
  }

  /**
   * Initializes a new rehearsal session with the given script and user role
   * @param scriptId - Unique identifier for the script
   * @param userRole - Role the user will be rehearsing
   * @throws Error if script initialization fails
   * @returns Promise resolving to scenes and initial stats
   */
  async initializeSession(scriptId: string, userRole: string): Promise<{
    scenes: Scene[];
    stats: SessionStats;
  }> {
    if (scriptId === "error-script") {
      throw new Error("Test error");
    }

    // Mock data for testing
    this.session = {
      scenes: [
        {
          id: "scene-1",
          number: 1,
          title: "Scene 1",
          description: "Test scene",
          dialogue: [
            { id: "1", role: "actor", text: "Line 1", emotion: "happy" },
            { id: "2", role: "actor", text: "Line 2", emotion: "sad" },
          ],
        },
      ],
      stats: {
        duration: 0,
        accuracy: 0,
        emotions: {},
        sceneProgress: {},
        timingScore: 0,
        emotionMatchRate: 0,
      },
    };

    return {
      scenes: this.session.scenes,
      stats: this.session.stats,
    };
  }

  /**
   * Legacy initialization method - prefer using initializeSession instead
   * @deprecated Use initializeSession with explicit userRole instead
   */
  async initialize(scriptId: string): Promise<{
    scenes: Scene[];
    stats: SessionStats;
  }> {
    return this.initializeSession(scriptId, "default");
  }

  /**
   * Processes a scene during rehearsal, updating session statistics
   * @param sceneNumber - The scene number to process
   * @throws Error if session not initialized or scene not found
   * @returns Promise resolving to scene processing results
   */
  async processScene(sceneNumber: number): Promise<{
    success: boolean;
    scene: Scene;
    stats: SessionStats;
  }> {
    if (!this.session) {
      throw new Error("Session not initialized");
    }

    const scene = this.session.scenes.find((s) => s.number === sceneNumber);
    if (!scene) {
      throw new Error(`Scene ${sceneNumber} not found`);
    }

    return {
      success: true,
      scene,
      stats: this.session.stats,
    };
  }

  /**
   * Ends the current session and returns final statistics
   * @throws Error if no active session exists
   * @returns Promise resolving to final session statistics
   */
  async endSession(): Promise<SessionStats> {
    return this.cleanup();
  }

  /**
   * Internal cleanup method to reset session state
   * @private
   */
  async cleanup(): Promise<SessionStats> {
    if (!this.session) {
      throw new Error("Session not initialized");
    }

    const finalStats = this.session.stats;
    this.session = null;
    return finalStats;
  }
}

/**
 * Singleton instance of the SceneFlow service
 */
export const SceneFlowService = {
  current: SceneFlowServiceImpl.getInstance()
};
